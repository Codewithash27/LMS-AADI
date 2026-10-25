import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import CourseEditor from "@/components/courses/course-editor";
import { PageHeader } from "@/components/courses/library/page-header";
import { FilterPills, type LibraryFilter } from "@/components/courses/library/filter-pills";
import { CourseCard } from "@/components/courses/library/course-card";
import { AssignStudentsDialog } from "@/components/courses/assign-students-dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

const COURSES_PAGE_SIZE = 6;

const pagerButton =
  "grid h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-extrabold text-[#A3A1B8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] disabled:opacity-40";

export default function AdminCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [initialEnrolledIds, setInitialEnrolledIds] = useState<number[]>([]);
  const [batchLockedUserIds, setBatchLockedUserIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const assignSelectionReady = useRef(false);
  const { toast } = useToast();

  const { data: courses = [] as any[], isLoading: isLoadingCourses, isError: coursesError, refetch: refetchCourses } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const students = allUsers.filter((u) => u.role === "student");

  const courseIdsKey = courses.map((c) => c.id).join(",");

  type CourseRoster = {
    count: number;
    averageProgress: number | null;
    userIds: number[];
  };

  const { data: courseRosters = {} } = useQuery<Record<number, CourseRoster>>({
    queryKey: ["/api/enrollments/counts", courseIdsKey],
    enabled: courses.length > 0,
    queryFn: async () => {
      const pairs = await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await apiRequest("GET", `/api/enrollments/course/${course.id}`);
            const list = await res.json();
            if (!Array.isArray(list) || list.length === 0) {
              return [course.id, { count: 0, averageProgress: null, userIds: [] }] as const;
            }
            const progresses = list
              .map((row: { progress?: number }) => Number(row.progress))
              .filter((value: number) => Number.isFinite(value));
            const averageProgress = progresses.length
              ? Math.round(progresses.reduce((sum: number, value: number) => sum + value, 0) / progresses.length)
              : null;
            const userIds = list
              .map((row: { userId?: number }) => Number(row.userId))
              .filter((id: number) => Number.isFinite(id))
              .slice(0, 3);
            return [course.id, { count: list.length, averageProgress, userIds }] as const;
          } catch {
            return [course.id, { count: 0, averageProgress: null, userIds: [] }] as const;
          }
        })
      );
      return Object.fromEntries(pairs);
    },
  });

  const { data: courseEnrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/course", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const res = await apiRequest("GET", `/api/enrollments/course/${selectedCourse.id}`);
      return res.json();
    },
    enabled: isAssignDialogOpen && !!selectedCourse?.id,
  });

  const { data: batchLockedUsersData, isLoading: isLoadingBatchLocks } = useQuery<{
    userIds: number[];
  }>({
    queryKey: [
      "/api/enrollments/course",
      selectedCourse?.id,
      "batch-locked-users",
    ],
    queryFn: async () => {
      if (!selectedCourse?.id) return { userIds: [] };
      const res = await apiRequest(
        "GET",
        `/api/enrollments/course/${selectedCourse.id}/batch-locked-users`
      );
      return res.json();
    },
    enabled: isAssignDialogOpen && !!selectedCourse?.id,
  });

  useEffect(() => {
    setBatchLockedUserIds(
      (batchLockedUsersData?.userIds || []).map((id) => Number(id))
    );
  }, [batchLockedUsersData]);

  const deleteMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course deleted",
        description: `${selectedCourse?.title} has been deleted`,
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete course",
        description: error.message || "There was an error deleting the course",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      courseId,
      toAdd,
      toRemove,
    }: {
      courseId: number;
      toAdd: number[];
      toRemove: number[];
    }) => {
      for (const userId of toAdd) {
        await apiRequest("POST", "/api/enrollments/assign", { userId, courseId });
      }
      for (const userId of toRemove) {
        await apiRequest("DELETE", "/api/enrollments/assign", { userId, courseId });
      }
    },
    onSuccess: (_data, vars) => {
      toast({
        title: "Enrollments updated",
        description: `${selectedCourse?.title}: ${vars.toAdd.length} added, ${vars.toRemove.length} removed`,
      });
      setIsAssignDialogOpen(false);
      setSelectedStudentIds([]);
      setInitialEnrolledIds([]);
      assignSelectionReady.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/course"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/counts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update enrollments",
        description: error.message || "There was an error updating enrollments",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAssignDialogOpen) {
      assignSelectionReady.current = false;
      return;
    }
    if (isLoadingEnrollments || isLoadingBatchLocks || assignSelectionReady.current)
      return;
    const enrolledIds = courseEnrollments.map((e: any) => Number(e.userId));
    const locked = (batchLockedUsersData?.userIds || []).map((id) => Number(id));
    const merged = Array.from(new Set([...enrolledIds, ...locked]));
    setInitialEnrolledIds(merged);
    setSelectedStudentIds(merged);
    assignSelectionReady.current = true;
  }, [
    isAssignDialogOpen,
    isLoadingEnrollments,
    isLoadingBatchLocks,
    courseEnrollments,
    batchLockedUsersData,
  ]);

  const handleCreateCourse = () => {
    setSelectedCourse(null);
    setIsEditorOpen(true);
  };

  const handleEditCourse = async (course: any) => {
    if (!course?.id) {
      toast({
        title: "Error",
        description: "Invalid course data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("GET", `/api/courses/${course.id}`);
      const fullCourseData = await response.json();
      setSelectedCourse(fullCourseData);
      setIsEditorOpen(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch course details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCourse = (course: any) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const openAssignDialog = (course: any) => {
    setSelectedCourse(course);
    setSelectedStudentIds([]);
    setInitialEnrolledIds([]);
    setBatchLockedUserIds([]);
    assignSelectionReady.current = false;
    setIsAssignDialogOpen(true);
  };

  const handleAssignStudent = () => {
    if (!selectedCourse?.id) return;
    const selected = selectedStudentIds.map(Number);
    const initial = initialEnrolledIds.map(Number);
    const locked = new Set(batchLockedUserIds.map(Number));
    const toAdd = selected.filter((id) => !initial.includes(id));
    const toRemove = initial.filter(
      (id) => !selected.includes(id) && !locked.has(id)
    );
    if (toAdd.length === 0 && toRemove.length === 0) {
      toast({
        title: "No changes",
        description: "Enrollment selection is unchanged.",
      });
      return;
    }
    assignMutation.mutate({
      courseId: selectedCourse.id,
      toAdd,
      toRemove,
    });
  };

  const getEnrollmentCount = (course: any) =>
    courseRosters[course.id]?.count ??
    course.enrollmentCount ??
    course.enrollments?.length ??
    0;

  const confirmDeleteCourse = () => {
    if (selectedCourse?.id) {
      deleteMutation.mutate(selectedCourse.id);
    }
  };

  const filteredCourses = useMemo(
    () =>
      courses.filter((course: any) => {
        const matchesSearch =
          (course.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (course.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || course.status === statusFilter;
        const matchesLevel = levelFilter === "all" || course.difficulty === levelFilter;
        return matchesSearch && matchesStatus && matchesLevel;
      }),
    [courses, searchTerm, statusFilter, levelFilter]
  );

  const { page, pageCount, pageItems, setPage } = useClientPagination(
    filteredCourses,
    COURSES_PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, levelFilter, setPage]);

  const libraryFilter: LibraryFilter =
    statusFilter === "active" && levelFilter === "all"
      ? "active"
      : levelFilter === "beginner" && statusFilter === "all"
        ? "beginner"
        : levelFilter === "intermediate" && statusFilter === "all"
          ? "intermediate"
          : "all";

  const setLibraryFilter = (next: LibraryFilter) => {
    if (next === "active") {
      setStatusFilter("active");
      setLevelFilter("all");
      return;
    }
    if (next === "beginner" || next === "intermediate") {
      setStatusFilter("all");
      setLevelFilter(next);
      return;
    }
    setStatusFilter("all");
    setLevelFilter("all");
  };

  const courseMeta = (course: any) => {
    const parts: string[] = [];
    if (course.category) parts.push(String(course.category));
    if (course.duration != null && course.duration !== "") {
      parts.push(`${course.duration} weeks`);
    }
    return parts.length ? parts.join(" · ") : null;
  };

  const peopleFor = (courseId: number) => {
    const ids = courseRosters[courseId]?.userIds ?? [];
    return ids.flatMap((id) => {
      const person = allUsers.find((user) => Number(user.id) === id);
      if (!person) return [];
      const initials =
        `${person.firstName?.charAt(0) || ""}${person.lastName?.charAt(0) || ""}`.toUpperCase();
      return [{
        id,
        initials: initials || person.username?.slice(0, 2).toUpperCase() || "",
        photo: getProfilePhotoSrc(person.profilePhoto),
      }];
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        search={searchTerm}
        onSearch={setSearchTerm}
        onCreate={handleCreateCourse}
      />
      <FilterPills value={libraryFilter} total={courses.length} onChange={setLibraryFilter} />

      {isLoadingCourses ? (
        <div className="course-grid" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="course-skeleton" />
          ))}
        </div>
      ) : coursesError ? (
        <div className="lib-state">
          <h2>Couldn&apos;t load courses</h2>
          <button type="button" className="lib-new" onClick={() => refetchCourses()}>
            Try again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="lib-state">
          <h2>No courses yet</h2>
          <button type="button" className="lib-new" onClick={handleCreateCourse}>
            <Plus strokeWidth={2.4} aria-hidden />
            New course
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="lib-state">
          <h2>No courses match</h2>
        </div>
      ) : (
        <>
          <div className="course-grid">
            {pageItems.map((course: any) => {
              const tone = Math.max(0, courses.findIndex((item) => item.id === course.id));
              const roster = courseRosters[course.id];
              return (
                <CourseCard
                  key={course.id}
                  href={`/admin/courses/${course.id}/progress`}
                  title={course.title}
                  tone={tone}
                  thumbnail={getCourseThumbnailSrc(course.thumbnail)}
                  level={course.difficulty ? String(course.difficulty).toUpperCase() : null}
                  meta={courseMeta(course)}
                  people={peopleFor(course.id)}
                  enrolled={getEnrollmentCount(course)}
                  progress={roster && roster.count > 0 ? roster.averageProgress : null}
                  onEdit={() => handleEditCourse(course)}
                  onAssign={() => openAssignDialog(course)}
                  onView={() => {
                    window.location.href = `/admin/courses/${course.id}/progress`;
                  }}
                  onDelete={() => handleDeleteCourse(course)}
                />
              );
            })}
          </div>
          {pageCount > 1 ? (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Course pages">
              <ActionTooltip label="Previous page" side="top" className="course-tip">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className={pagerButton}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </ActionTooltip>
              {pageWindow(page, pageCount).map((number) => (
                <ActionTooltip key={number} label={`Page ${number}`} side="top" className="course-tip">
                  <button
                    type="button"
                    aria-label={`Page ${number}`}
                    aria-current={number === page ? "page" : undefined}
                    onClick={() => setPage(number)}
                    className={
                      number === page
                        ? "grid h-10 w-10 place-items-center rounded-full bg-[#D4FF3F] text-sm font-extrabold text-[#0A0A0F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
                        : pagerButton
                    }
                  >
                    {number}
                  </button>
                </ActionTooltip>
              ))}
              <ActionTooltip label="Next page" side="top" className="course-tip">
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pageCount}
                  className={pagerButton}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </ActionTooltip>
            </nav>
          ) : null}
        </>
      )}

      <CourseEditor
        key={selectedCourse?.id || "new-course"}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        course={selectedCourse}
      />

      <AssignStudentsDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        courseTitle={selectedCourse?.title || ""}
        students={students}
        selectedIds={selectedStudentIds}
        initialIds={initialEnrolledIds}
        lockedIds={batchLockedUserIds}
        isLoading={isLoadingEnrollments || isLoadingBatchLocks}
        isSaving={assignMutation.isPending}
        onChange={setSelectedStudentIds}
        onSave={handleAssignStudent}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg">Delete Course</DialogTitle>
            <DialogDescription className="text-center text-[15px]">
              {selectedCourse &&
                `Are you sure you want to delete "${selectedCourse.title}"? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Course content, enrollments, and progress data will be removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCourse}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
