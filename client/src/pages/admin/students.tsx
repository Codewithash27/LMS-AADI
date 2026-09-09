import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [initialEnrolledIds, setInitialEnrolledIds] = useState<number[]>([]);
  const [batchLockedCourseIds, setBatchLockedCourseIds] = useState<number[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const { data: studentEnrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/user", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return [];
      const res = await apiRequest("GET", `/api/enrollments/user/${selectedStudent.id}`);
      return res.json();
    },
    enabled: isAssignDialogOpen && !!selectedStudent?.id,
  });

  const { data: batchLockedData, isLoading: isLoadingBatchLocks } = useQuery<{
    courseIds: number[];
  }>({
    queryKey: ["/api/enrollments/user", selectedStudent?.id, "batch-locked-courses"],
    queryFn: async () => {
      if (!selectedStudent?.id) return { courseIds: [] };
      const res = await apiRequest(
        "GET",
        `/api/enrollments/user/${selectedStudent.id}/batch-locked-courses`
      );
      return res.json();
    },
    enabled: isAssignDialogOpen && !!selectedStudent?.id,
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
      setSelectedStudent(null);
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
    if (!selectedStudent?.id) return;
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
      userId: selectedStudent.id,
      toAdd,
      toRemove,
    });
  };

  // Handle deleting student
  const handleDeleteStudent = () => {
    if (!selectedStudent) return;
    
    deleteStudentMutation.mutate(selectedStudent.id);
  };
  
  // Open assign course dialog
  const openAssignDialog = (student: any) => {
    setSelectedStudent(student);
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

  // Open delete confirmation dialog
  const openDeleteDialog = (student: any) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };
  
  // Filter only students — newest enrolled first (higher id = more recent)
  const students = (allUsers as any[])
    .filter((user) => user.role === "student")
    .sort((a, b) => b.id - a.id);
  
  // Filter students based on search term and status
  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const {
    page,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize,
  } = useClientPagination(filteredStudents, 10);

  // Helper function to get initials from name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  return (
    <DashboardLayout>
      <Header
        title="Students"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search students..."
            filters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-border bg-white shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            }
            action={
              <ActionTooltip label="Add student">
                <span className="inline-flex">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="h-11 w-11 shrink-0 rounded-xl p-0"
                        aria-label="Add student"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem className="gap-2" onClick={openAddDialog}>
                        <UserPlus className="h-4 w-4" />
                        Add Single Student
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" disabled>
                        <Upload className="h-4 w-4" />
                        Bulk Import
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" disabled>
                        <Download className="h-4 w-4" />
                        Export Template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </ActionTooltip>
            }
          />
        }
      />

      {/* Students Directory — Campus Axis list style */}
      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable
          title="Student Directory"
          columns={[
            { key: "student", label: "Student" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", align: "right" },
          ]}
          isEmpty={filteredStudents.length === 0}
          empty={
            <div className="text-center">
              <GraduationCap className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-1 text-lg font-semibold">No students found</h3>
              <p className="text-[15px] text-muted-foreground">
                {searchTerm
                  ? "No students match your search."
                  : "Add your first student to get started."}
              </p>
            </div>
          }
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          {pageItems.map((student: any) => {
            const isActive = student.status === "active" || !student.status;
            return (
              <TableRow key={student.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      {student.profilePhoto ? (
                        <AvatarImage
                          src={getProfilePhotoSrc(student.profilePhoto) || undefined}
                          alt={`${student.firstName} ${student.lastName}`}
                        />
                      ) : null}
                      <AvatarFallback className="bg-accent-brand text-sm font-bold text-white">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {student.username}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-[15px] text-[#2D3748]/90">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#A0AEC0]" />
                    <span className="truncate">{student.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      isActive
                        ? "border-green-200 bg-green-100 text-green-800"
                        : student.status === "inactive"
                          ? "border-red-200 bg-red-100 text-red-800"
                          : "border-amber-200 bg-amber-100 text-amber-800"
                    )}
                  >
                    {isActive ? "Active" : student.status === "inactive" ? "Inactive" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/students/${student.id}`}>
                      <ActionTooltip label="View details">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                          aria-label="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </ActionTooltip>
                    </Link>
                    <ActionTooltip label="Assign course">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Assign course"
                        onClick={() => openAssignDialog(student)}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete student">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-[#d32f2f] hover:bg-[#d32f2f]/10"
                        aria-label="Delete student"
                        onClick={() => openDeleteDialog(student)}
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

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-brand">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Assign Course
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedStudent
                ? `Select courses for ${selectedStudent.firstName} ${selectedStudent.lastName}. Batch courses stay locked.`
                : "Select courses to enroll"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selectedCourseIds.length} of {courses.length} selected
              </span>
              <span>
                {batchLockedCourseIds.length} from batch
                {batchLockedCourseIds.length === 1 ? "" : "es"}
              </span>
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border bg-white">
              {isLoadingEnrollments || isLoadingBatchLocks ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : courses.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No courses available
                </p>
              ) : (
                <ul className="divide-y divide-border/80">
                  {courses.map((course) => {
                    const checked = selectedCourseIds.includes(course.id);
                    const wasEnrolled = initialEnrolledIds.includes(course.id);
                    const lockedByBatch = batchLockedCourseIds.includes(course.id);
                    return (
                      <li key={course.id}>
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
                              toggleCourse(course.id, value === true)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-[#2D3748]">
                              {course.title}
                            </p>
                            {course.level ? (
                              <p className="truncate text-xs text-muted-foreground capitalize">
                                {course.level}
                              </p>
                            ) : null}
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

          <DialogFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={assignCourseMutation.isPending}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCourse}
              disabled={assignCourseMutation.isPending || isLoadingEnrollments}
              className="flex-1 gap-2 rounded-xl"
            >
              {assignCourseMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Enrollments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="backdrop-blur-sm bg-white/95 border border-white/20 shadow-2xl rounded-3xl max-w-md">
          <DialogHeader>
            <div className="p-3 bg-red-100 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              Delete Student
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              {selectedStudent && 
                `Are you sure you want to delete ${selectedStudent.firstName} ${selectedStudent.lastName}? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Warning: This will permanently delete:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Student profile and data</li>
                  <li>All course enrollments</li>
                  <li>Progress and exam results</li>
                </ul>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteStudentMutation.isPending}
              className="flex-1 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
              disabled={deleteStudentMutation.isPending}
              className="flex-1 gap-2 rounded-2xl hover:shadow-xl transition-all duration-300"
            >
              {deleteStudentMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Student
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
