import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DashboardLayout from "@/components/layout/dashboard-layout";
import CourseEditor from "@/components/courses/course-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  BookOpen,
  Users,
  Eye,
  LayoutGrid,
  List,
  Clock,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  CreateFormDialog,
  CreateFormFooter,
} from "@/components/ui/create-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { TableCell, TableRow } from "@/components/ui/table";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";

export default function AdminCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
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

  const { data: courses = [] as any[], isLoading: isLoadingCourses } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const students = allUsers.filter((u) => u.role === "student");

  const courseIdsKey = courses.map((c) => c.id).join(",");

  const { data: enrollmentCounts = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/enrollments/counts", courseIdsKey],
    enabled: courses.length > 0,
    queryFn: async () => {
      const pairs = await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await apiRequest("GET", `/api/enrollments/course/${course.id}`);
            const list = await res.json();
            return [course.id, Array.isArray(list) ? list.length : 0] as const;
          } catch {
            return [course.id, 0] as const;
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

  const toggleStudent = (studentId: number, checked: boolean) => {
    if (!checked && batchLockedUserIds.includes(studentId)) {
      toast({
        title: "Student locked by batch",
        description:
          "This student gets the course from a batch. Remove them from that batch first.",
        variant: "destructive",
      });
      return;
    }
    setSelectedStudentIds((prev) =>
      checked ? [...prev, studentId] : prev.filter((id) => id !== studentId)
    );
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
    enrollmentCounts[course.id] ??
    course.enrollmentCount ??
    course.enrollments?.length ??
    0;

  const confirmDeleteCourse = () => {
    if (selectedCourse?.id) {
      deleteMutation.mutate(selectedCourse.id);
    }
  };

  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch =
      (course.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (course.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    const matchesLevel = levelFilter === "all" || course.difficulty === levelFilter;
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const {
    page,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize,
  } = useClientPagination(filteredCourses, 10);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "advanced":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "expert":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const thumbSrc = (course: any) => getCourseThumbnailSrc(course.thumbnail);

  const CourseActionsMenu = ({ course }: { course: any }) => (
    <ActionTooltip label="More actions">
      <span className="inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem className="gap-2" onClick={() => handleEditCourse(course)}>
              <Edit className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => openAssignDialog(course)}>
              <UserPlus className="h-4 w-4" /> Assign to Student
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => {
                window.location.href = `/admin/courses/${course.id}/progress`;
              }}
            >
              <Eye className="h-4 w-4" /> Student Progress
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => handleDeleteCourse(course)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </ActionTooltip>
  );

  return (
    <DashboardLayout>
      <Header
        title="Courses"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search courses..."
            filters={
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-[130px] rounded-xl border-border bg-white shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="h-10 w-[130px] rounded-xl border-border bg-white shadow-sm">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            extras={
              <div className="inline-flex rounded-xl border border-border bg-white p-0.5 shadow-sm">
                <ActionTooltip label="Grid view">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-9 w-9 rounded-lg p-0",
                      view === "grid" && "bg-brand-turquoise/15 text-brand-turquoise"
                    )}
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </ActionTooltip>
                <ActionTooltip label="List view">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-9 w-9 rounded-lg p-0",
                      view === "list" && "bg-brand-turquoise/15 text-brand-turquoise"
                    )}
                    onClick={() => setView("list")}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </ActionTooltip>
              </div>
            }
            action={
              <ActionTooltip label="Create course">
                <Button
                  type="button"
                  onClick={handleCreateCourse}
                  className="h-11 w-11 shrink-0 rounded-xl p-0"
                  aria-label="Create course"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </ActionTooltip>
            }
          />
        }
      />

      {/* Content */}
      {isLoadingCourses ? (
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse rounded-card bg-muted",
                view === "grid" ? "h-64" : "h-20"
              )}
            />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-14 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-semibold text-foreground">No courses found</h3>
            <p className="mb-4 text-[15px] text-muted-foreground">
              {searchTerm
                ? "No courses match your search."
                : "Get started by creating your first course."}
            </p>
            <Button onClick={handleCreateCourse} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course: any) => {
            const src = thumbSrc(course);
            const enrollmentCount = getEnrollmentCount(course);
            return (
              <Card
                key={course.id}
                className="flex flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
              >
                <div className="relative h-36 bg-gradient-to-br from-brand-turquoise/15 to-brand-blue/10">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-10 w-10 text-brand-turquoise/70" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <Badge
                      className={cn(
                        "border px-2 py-0.5 text-xs font-medium",
                        getDifficultyColor(course.difficulty)
                      )}
                    >
                      {course.difficulty || "All Levels"}
                    </Badge>
                  </div>
                  <div className="absolute right-2 top-2">
                    <div className="rounded-lg bg-white/90 shadow-sm">
                      <CourseActionsMenu course={course} />
                    </div>
                  </div>
                </div>

                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-foreground">
                      {course.title}
                    </h3>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {course.status === "active" || !course.status ? "Active" : course.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-[15px] text-muted-foreground">
                    {course.description || "No description"}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {enrollmentCount} enrolled
                    </span>
                    {course.category ? <span>{course.category}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration || "8"} weeks
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="gap-2 border-t border-border p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => handleEditCourse(course)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => openAssignDialog(course)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      window.location.href = `/admin/courses/${course.id}/progress`;
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Progress
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <DataTable
          title="Course Directory"
          columns={[
            { key: "course", label: "Course" },
            { key: "level", label: "Level" },
            { key: "category", label: "Category" },
            { key: "duration", label: "Duration" },
            { key: "enrolled", label: "Enrolled" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", align: "right" },
          ]}
          isEmpty={filteredCourses.length === 0}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          {pageItems.map((course: any) => {
            const src = thumbSrc(course);
            const enrollmentCount = getEnrollmentCount(course);
            return (
              <TableRow key={course.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                        {course.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {course.description || "No description"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      getDifficultyColor(course.difficulty)
                    )}
                  >
                    {course.difficulty || "All Levels"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {course.category || "General"}
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {course.duration || "8"} weeks
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {enrollmentCount}
                </TableCell>
                <TableCell>
                  <Badge className="rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-800">
                    {course.status === "active" || !course.status ? "Active" : course.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ActionTooltip label="Edit course">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Edit course"
                        onClick={() => handleEditCourse(course)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Assign to student">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Assign to student"
                        onClick={() => openAssignDialog(course)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="View progress">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary/80 hover:bg-primary/10"
                        aria-label="View progress"
                        onClick={() => {
                          window.location.href = `/admin/courses/${course.id}/progress`;
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete course">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-[#d32f2f] hover:bg-[#d32f2f]/10"
                        aria-label="Delete course"
                        onClick={() => handleDeleteCourse(course)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      )}

      <CourseEditor
        key={selectedCourse?.id || "new-course"}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        course={selectedCourse}
      />

      <CreateFormDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        title="Assign to Student"
        description={
          selectedCourse
            ? `Select students for "${selectedCourse.title}". Batch members stay locked.`
            : "Select students to enroll"
        }
        icon={<UserPlus className="h-7 w-7 text-white" />}
        maxWidth="max-w-lg"
        footer={
          <CreateFormFooter
            onCancel={() => setIsAssignDialogOpen(false)}
            submitLabel="Save Enrollments"
            pendingLabel="Saving..."
            isPending={assignMutation.isPending}
            submitDisabled={isLoadingEnrollments || isLoadingBatchLocks}
            submitType="button"
            onSubmit={handleAssignStudent}
          />
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {selectedStudentIds.length} of {students.length} selected
            </span>
            <span>
              {batchLockedUserIds.length} via batch
            </span>
          </div>

          <div className="max-h-[min(320px,40vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-white">
            {isLoadingEnrollments || isLoadingBatchLocks ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : students.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No students available
              </p>
            ) : (
              <ul className="divide-y divide-border/80">
                {students.map((student) => {
                  const checked = selectedStudentIds.includes(student.id);
                  const wasEnrolled = initialEnrolledIds.includes(student.id);
                  const lockedByBatch = batchLockedUserIds.includes(student.id);
                  return (
                    <li key={student.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/70",
                          checked && "bg-primary/5",
                          lockedByBatch && "cursor-not-allowed bg-muted/40"
                        )}
                      >
                        <Checkbox
                          checked={checked || lockedByBatch}
                          disabled={lockedByBatch}
                          onCheckedChange={(value) =>
                            toggleStudent(student.id, value === true)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-[#2D3748]">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {student.username}
                            {student.email ? ` · ${student.email}` : ""}
                          </p>
                        </div>
                        {lockedByBatch ? (
                          <Badge className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            Via batch
                          </Badge>
                        ) : wasEnrolled ? (
                          <Badge className="shrink-0 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                            Enrolled
                          </Badge>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </CreateFormDialog>

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
