import { useState, useEffect, useRef, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AssignCoursesDialog } from "@/components/students/assign-courses-dialog";
import { StudentCard, StudentCardSkeleton } from "@/components/students/student-card";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CreateFormDialog,
  CreateFormFooter,
  FormSection,
  createFormControlClass,
  createFormLabelClass,
} from "@/components/ui/create-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  createStudentSchema,
  type CreateStudentFormValues,
} from "@/lib/form-schemas";
import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/ui/action-tooltip";

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

const STUDENTS_PAGE_SIZE = 8;

const pagerButton =
  "grid h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-extrabold text-[#A3A1B8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] disabled:opacity-40";

const studentFormDefaults: CreateStudentFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  mobileNumber: "",
  gender: "",
  dateOfBirth: "",
  educationLevel: "",
  schoolCollege: "",
  yearOfStudy: "",
  username: "",
  password: "",
};

export default function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [initialEnrolledIds, setInitialEnrolledIds] = useState<number[]>([]);
  const [batchLockedCourseIds, setBatchLockedCourseIds] = useState<number[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const assignSelectionReady = useRef(false);
  const { toast } = useToast();

  const studentForm = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: studentFormDefaults,
  });
  
  // Fetch students (users with role "student")
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Fetch courses for assign checkbox list
  const { data: courses = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const courseIdsKey = courses.map((c) => c.id).join(",");

  const { data: enrollmentStatsByUser = {}, isSuccess: enrollmentStatsReady } = useQuery<
    Record<number, { courseCount: number; avgProgress: number }>
  >({
    queryKey: ["/api/enrollments/student-stats", courseIdsKey],
    enabled: courses.length > 0,
    queryFn: async () => {
      const acc: Record<number, { count: number; progresses: number[] }> = {};
      await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await apiRequest("GET", `/api/enrollments/course/${course.id}`);
            const list = await res.json();
            if (!Array.isArray(list)) return;
            for (const row of list) {
              const userId = Number(row.userId);
              if (!Number.isFinite(userId)) continue;
              if (!acc[userId]) acc[userId] = { count: 0, progresses: [] };
              acc[userId].count += 1;
              const p = Number(row.progress);
              if (Number.isFinite(p)) acc[userId].progresses.push(p);
            }
          } catch {
            /* ignore per-course */
          }
        })
      );
      return Object.fromEntries(
        Object.entries(acc).map(([id, v]) => [
          Number(id),
          {
            courseCount: v.count,
            avgProgress: v.progresses.length
              ? Math.round(v.progresses.reduce((s, n) => s + n, 0) / v.progresses.length)
              : 0,
          },
        ])
      );
    },
  });

  const { data: studentEnrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/user", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      const res = await apiRequest("GET", `/api/enrollments/user/${selectedStudentId}`);
      return res.json();
    },
    enabled: !!selectedStudentId && isAssignDialogOpen,
  });

  const { data: batchLockedData, isLoading: isLoadingBatchLocks } = useQuery<{
    courseIds: number[];
  }>({
    queryKey: ["/api/enrollments/user", selectedStudentId, "batch-locked-courses"],
    queryFn: async () => {
      if (!selectedStudentId) return { courseIds: [] };
      const res = await apiRequest(
        "GET",
        `/api/enrollments/user/${selectedStudentId}/batch-locked-courses`
      );
      return res.json();
    },
    enabled: !!selectedStudentId && isAssignDialogOpen,
  });

  useEffect(() => {
    setBatchLockedCourseIds(
      (batchLockedData?.courseIds || []).map((id) => Number(id))
    );
  }, [batchLockedData]);

  const createStudentMutation = useMutation({
    mutationFn: async (payload: CreateStudentFormValues) => {
      const res = await apiRequest("POST", "/api/users", {
        ...payload,
        gender: payload.gender || undefined,
      });
      return res.json();
    },
    onSuccess: (user: any) => {
      toast({
        title: "Student added",
        description: `${user.firstName} ${user.lastName} has been created`,
      });
      setIsAddDialogOpen(false);
      studentForm.reset(studentFormDefaults);
      setShowPassword(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add student",
        description: error.message || "There was an error creating the student",
        variant: "destructive",
      });
    },
  });
  
  // Course assignment mutation (add + remove)
  const assignCourseMutation = useMutation({
    mutationFn: async ({
      userId,
      toAdd,
      toRemove,
    }: {
      userId: number;
      toAdd: number[];
      toRemove: number[];
    }) => {
      for (const courseId of toAdd) {
        await apiRequest("POST", "/api/enrollments/assign", { userId, courseId });
      }
      for (const courseId of toRemove) {
        await apiRequest("DELETE", "/api/enrollments/assign", { userId, courseId });
      }
    },
    onSuccess: (_data, vars) => {
      toast({
        title: "Enrollments updated",
        description: `${selectedStudent?.firstName} ${selectedStudent?.lastName}: ${vars.toAdd.length} added, ${vars.toRemove.length} removed`,
      });
      setIsAssignDialogOpen(false);
      setSelectedCourseIds([]);
      setInitialEnrolledIds([]);
      assignSelectionReady.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/student-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update enrollments",
        description: error.message || "There was an error updating enrollments",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (!isAssignDialogOpen) {
      assignSelectionReady.current = false;
      return;
    }
    if (isLoadingEnrollments || assignSelectionReady.current) return;
    const enrolledIds = studentEnrollments.map((e: any) => Number(e.courseId));
    const locked = (batchLockedData?.courseIds || []).map((id) => Number(id));
    const merged = Array.from(new Set([...enrolledIds, ...locked]));
    setInitialEnrolledIds(merged);
    setSelectedCourseIds(merged);
    assignSelectionReady.current = true;
  }, [
    isAssignDialogOpen,
    isLoadingEnrollments,
    isLoadingBatchLocks,
    studentEnrollments,
    batchLockedData,
  ]);

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Student deleted",
        description: `${selectedStudent?.firstName} ${selectedStudent?.lastName} has been deleted successfully`,
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete student",
        description: error.message || "There was an error deleting the student",
        variant: "destructive",
      });
    }
  });
  
  const toggleCourse = (courseId: number, checked: boolean) => {
    if (!checked && batchLockedCourseIds.includes(courseId)) {
      toast({
        title: "Course locked by batch",
        description:
          "This course comes from a batch. Remove the student from that batch first.",
        variant: "destructive",
      });
      return;
    }
    setSelectedCourseIds((prev) =>
      checked ? [...prev, courseId] : prev.filter((id) => id !== courseId)
    );
  };

  // Handle assigning courses to student
  const handleAssignCourse = () => {
    if (!selectedStudentId) return;
    const selected = selectedCourseIds.map(Number);
    const initial = initialEnrolledIds.map(Number);
    const locked = new Set(batchLockedCourseIds.map(Number));
    const toAdd = selected.filter((id) => !initial.includes(id));
    // Never attempt to remove batch-locked courses
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
    assignCourseMutation.mutate({
      userId: selectedStudentId,
      toAdd,
      toRemove,
    });
  };

  const handleDeleteStudent = () => {
    if (!selectedStudentId) return;
    deleteStudentMutation.mutate(selectedStudentId);
  };
  
  // Open assign course dialog
  const openAssignDialog = (student: { id: number }) => {
    setSelectedStudentId(student.id);
    setSelectedCourseIds([]);
    setInitialEnrolledIds([]);
    setBatchLockedCourseIds([]);
    assignSelectionReady.current = false;
    setIsAssignDialogOpen(true);
  };

  const openAddDialog = () => {
    studentForm.reset(studentFormDefaults);
    setShowPassword(false);
    setIsAddDialogOpen(true);
  };

  const handleCreateStudent = (values: CreateStudentFormValues) => {
    createStudentMutation.mutate(values);
  };

  const openDeleteDialog = (student: { id: number }) => {
    setSelectedStudentId(student.id);
    setIsDeleteDialogOpen(true);
  };
  
  // Filter only students — newest enrolled first (higher id = more recent)
  const students = (allUsers as any[])
    .filter((user) => user.role === "student")
    .sort((a, b) => b.id - a.id);
  
  const filteredStudents = students.filter((student: any) => {
    const q = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(q) ||
      student.lastName.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q)
    );
  });

  const selectedStudent = useMemo(
    () => students.find((s: any) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const {
    page,
    total,
    pageCount,
    pageItems,
    setPage,
  } = useClientPagination(filteredStudents, STUDENTS_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, setPage]);

  const studentLabel = selectedStudent
    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
    : "this student";

  return (
    <DashboardLayout>
      <div className="min-w-0 bg-[#07070C] font-[Manrope,system-ui,sans-serif] text-[#F3F2FA]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">
              People / Students
            </p>
            <h1 className="font-[Fraunces,Georgia,serif] text-[72px] font-medium leading-none tracking-[-0.03em] text-[#F3F2FA] max-[980px]:text-[48px]">
              Meet your <i className="italic text-[#D4FF3F]">students</i>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-12 min-h-[44px] items-center gap-2 rounded-full border border-white/[0.09] bg-transparent px-5 text-sm font-extrabold text-[#A3A1B8] opacity-60"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Bulk import
            </button>
            <button
              type="button"
              onClick={openAddDialog}
              className="inline-flex h-12 min-h-[44px] items-center gap-2 rounded-full bg-[#D4FF3F] px-5 text-sm font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              Add student
            </button>
          </div>
        </header>

        <div className="mb-6 flex min-w-0 flex-wrap items-center gap-2.5">
          <label className="flex h-12 min-h-[44px] min-w-[200px] flex-1 items-center gap-2 rounded-full border border-white/[0.06] bg-[#0F0F18] px-4 focus-within:border-[#D4FF3F]/40">
            <Search className="h-4 w-4 shrink-0 text-[#8E8CA6]" aria-hidden />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, username, email…"
              aria-label="Search students"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#F3F2FA] outline-none placeholder:text-[#8E8CA6]"
            />
          </label>

          <span className="inline-flex h-12 min-h-[44px] shrink-0 items-center rounded-full bg-[#0B0B12] px-4 text-xs font-extrabold text-[#B4B2C8]">
            {students.length} student{students.length === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            disabled
            aria-disabled
            className="inline-flex h-12 min-h-[44px] items-center rounded-full border border-white/[0.09] bg-[#0F0F18] px-4 text-sm font-extrabold text-[#B4B2C8] opacity-80"
          >
            Newest first
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-[18px] min-[980px]:grid-cols-3 min-[1280px]:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <StudentCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-[26px] border border-white/[0.07] bg-[#0F0F18] px-6 py-16 text-center">
            <p className="font-[Fraunces,Georgia,serif] text-3xl text-[#F3F2FA]">No students found</p>
            <p className="mt-2 text-sm font-semibold text-[#A3A1B8]">
              Try another search or filter, or add a new student.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-[18px] min-[980px]:grid-cols-3 min-[1280px]:grid-cols-4">
              {pageItems.map((student: any, index: number) => {
                const stats = enrollmentStatsByUser[student.id];
                return (
                  <StudentCard
                    key={student.id}
                    student={student}
                    cardIndex={index}
                    selected={selectedStudentId === student.id}
                    onSelect={() => setSelectedStudentId(student.id)}
                    onAssign={() => openAssignDialog(student)}
                    onDelete={() => openDeleteDialog(student)}
                    profileHref={`/admin/students/${student.id}`}
                    courseCount={stats?.courseCount ?? 0}
                    avgProgress={stats?.avgProgress ?? 0}
                    showEnrollmentFooter={enrollmentStatsReady && courses.length > 0}
                  />
                );
              })}
            </div>

            {pageCount > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Student pages">
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

        {/* TODO: <StudentProfileDrawer open={!!selectedStudentId} student={selectedStudent} /> */}
      </div>

      {/* Add Student Dialog */}
      <CreateFormDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            studentForm.reset(studentFormDefaults);
            setShowPassword(false);
          }
        }}
        title="Add Student"
        description="Create a new student account for your organization."
        icon={<UserPlus className="h-7 w-7 text-white" />}
        maxWidth="max-w-2xl"
        footer={
          <CreateFormFooter
            formId="add-student-form"
            onCancel={() => setIsAddDialogOpen(false)}
            submitLabel="Create Student"
            pendingLabel="Creating..."
            isPending={createStudentMutation.isPending}
          />
        }
      >
        <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
          <input type="text" name="username" tabIndex={-1} autoComplete="username" />
          <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
        </div>

        <Form {...studentForm}>
          <form
            id="add-student-form"
            onSubmit={studentForm.handleSubmit(handleCreateStudent)}
            className="space-y-4"
          >
            <FormSection
              title="Personal details"
              description="Basic identity and contact information"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={studentForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>First Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter first name"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter last name"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={createFormLabelClass}>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="student@example.com"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Mobile *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10+ digit number"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Gender</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className={createFormControlClass}>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={createFormLabelClass}>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input type="date" className={createFormControlClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              title="Academic details"
              description="School and current study information"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={studentForm.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Education Level *</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className={createFormControlClass}>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high_school">High School</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                          <SelectItem value="undergraduate">Undergraduate</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                          <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="yearOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Year of Study *</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className={createFormControlClass}>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Year 1</SelectItem>
                          <SelectItem value="2">Year 2</SelectItem>
                          <SelectItem value="3">Year 3</SelectItem>
                          <SelectItem value="4">Year 4</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="schoolCollege"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={createFormLabelClass}>School / College *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter school or college name"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              title="Login credentials"
              description="Account access for the student portal"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={studentForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Username *</FormLabel>
                      <FormControl>
                        <Input
                          name="student_username_new"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="Choose a username"
                          className={createFormControlClass}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            name="student_password_new"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Strong password required"
                            className={cn(createFormControlClass, "pr-10")}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#2D3748]"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
          </form>
        </Form>
      </CreateFormDialog>

      <AssignCoursesDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        studentLabel={studentLabel}
        courses={courses}
        selectedIds={selectedCourseIds}
        initialIds={initialEnrolledIds}
        lockedIds={batchLockedCourseIds}
        isLoading={isLoadingEnrollments || isLoadingBatchLocks}
        isSaving={assignCourseMutation.isPending}
        onToggle={toggleCourse}
        onSave={handleAssignCourse}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0C0C14] p-0 font-[Manrope,system-ui,sans-serif] text-[#F3F2FA] shadow-[0_28px_80px_rgba(0,0,0,0.55)] [&>button.absolute]:hidden">
          <div className="px-6 pb-2 pt-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF8FA6]/15 text-[#FF8FA6]">
              <Trash2 className="h-6 w-6" aria-hidden />
            </div>
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="font-[Fraunces,Georgia,serif] text-[28px] font-medium tracking-[-0.03em]">
                Delete <i className="text-[#D4FF3F] not-italic">student</i>
              </DialogTitle>
              <DialogDescription className="text-sm text-[#A3A1B8]">
                {selectedStudent
                  ? `Remove ${selectedStudent.firstName} ${selectedStudent.lastName}? This cannot be undone.`
                  : "Remove this student? This cannot be undone."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="mx-6 mb-4 rounded-[20px] border border-[#F7C766]/25 bg-[#F7C766]/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F7C766]" aria-hidden />
              <ul className="list-inside list-disc space-y-1 text-sm font-semibold text-[#F7C766]">
                <li>Student profile and data</li>
                <li>All course enrollments</li>
                <li>Progress and exam results</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2 border-t border-white/[0.09] bg-[#0A0A11] px-6 py-4">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteStudentMutation.isPending}
              className="min-h-[44px] flex-1 rounded-full border border-white/[0.09] bg-[#0F0F18] text-sm font-extrabold text-[#F3F2FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteStudent}
              disabled={deleteStudentMutation.isPending}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FF8FA6] text-sm font-extrabold text-[#0A0A0F] hover:bg-[#ff9fb3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F] disabled:opacity-50"
            >
              {deleteStudentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              {deleteStudentMutation.isPending ? "Deleting…" : "Delete student"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
