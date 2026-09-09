import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Users, Clock, Plus, Eye, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { batchFormSchema, type BatchFormValues } from "@/lib/form-schemas";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DataTable from "@/components/primitives/DataTable";
import EnrollStudentsDialog from "@/components/batches/enroll-students-dialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreateFormDialog,
  CreateFormFooter,
  FormSection,
  createFormControlClass,
  createFormLabelClass,
} from "@/components/ui/create-form-dialog";

const BATCH_FORM_ID = "batch-form";

function parseBatchDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? undefined : d;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: number;
}

interface Course {
  id: number;
  title: string;
  description: string;
  tenantId: number;
  createdBy: number;
  isEnrollmentRequired: boolean;
}

interface Batch {
  id: number;
  name: string;
  courseId: number;
  courseIds?: number[];
  studentCount?: number;
  batchCode: string;
  trainerId: number;
  startDate: string;
  endDate?: string | null;
  batchTime: string;
  tenantId: number;
  createdBy: number;
  description: string | null;
  maxStudents: number | null;
  isActive: boolean;
}

export default function BatchesPage() {
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isEditing = Boolean(editingBatch);

  const queryClient = useQueryClient();

  // Fetch batches
  const { data: batches, isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch courses for the dropdown
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch trainers (admins) for the dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Trainers are users with role 'admin'
  const trainers = users?.filter(user => user.role === 'admin' || user.role === 'superadmin') || [];
  
  // Students are users with role 'student'
  const students = users?.filter(user => user.role === 'student') || [];

  // Form for creating a new batch
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      name: "",
      batchCode: "",
      courseIds: [],
      batchTime: "09:00 AM",
      description: "",
      isActive: true,
    },
  });

  // Reset / prefill form when dialog opens or closes
  useEffect(() => {
    if (!openBatchDialog) {
      setEditingBatch(null);
      form.reset({
        name: "",
        batchCode: "",
        courseIds: [],
        batchTime: "09:00 AM",
        description: "",
        isActive: true,
      });
      return;
    }

    if (editingBatch) {
      const startDate = parseBatchDate(editingBatch.startDate) || new Date();
      const endDate = parseBatchDate(editingBatch.endDate) || startDate;
      const courseIds =
        editingBatch.courseIds && editingBatch.courseIds.length > 0
          ? editingBatch.courseIds
          : [editingBatch.courseId];

      form.reset({
        name: editingBatch.name,
        batchCode: editingBatch.batchCode,
        courseIds,
        trainerId: editingBatch.trainerId,
        startDate,
        endDate,
        batchTime: editingBatch.batchTime || "09:00 AM",
        description: editingBatch.description || "",
        isActive: editingBatch.isActive,
      });
    } else {
      form.reset({
        name: "",
        batchCode: "",
        courseIds: [],
        batchTime: "09:00 AM",
        description: "",
        isActive: true,
      });
    }
  }, [openBatchDialog, editingBatch, form]);

  // Mutation for creating a batch
  const createBatchMutation = useMutation({
    mutationFn: async (values: BatchFormValues) => {
      const formattedValues = {
        name: values.name,
        batchCode: values.batchCode,
        courseIds: values.courseIds,
        courseId: values.courseIds[0],
        trainerId: values.trainerId,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: format(values.endDate, "yyyy-MM-dd"),
        batchTime: values.batchTime,
        description: values.description || null,
        isActive: values.isActive,
      };

      return await apiRequest("POST", "/api/batches", formattedValues);
    },
    onSuccess: () => {
      toast({
        title: "🎉 Batch created successfully",
        description: "The batch has been created successfully.",
      });
      setOpenBatchDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create batch",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: BatchFormValues }) => {
      const formattedValues = {
        name: values.name,
        batchCode: values.batchCode,
        courseIds: values.courseIds,
        courseId: values.courseIds[0],
        trainerId: values.trainerId,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: format(values.endDate, "yyyy-MM-dd"),
        batchTime: values.batchTime,
        description: values.description || null,
        isActive: values.isActive,
      };

      return await apiRequest("PUT", `/api/batches/${id}`, formattedValues);
    },
    onSuccess: () => {
      toast({
        title: "Batch updated",
        description: "The batch has been updated successfully.",
      });
      setOpenBatchDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update batch",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      await apiRequest("DELETE", `/api/batches/${batchId}`);
    },
    onSuccess: () => {
      toast({
        title: "Batch deleted",
        description: `${batchToDelete?.name || "Batch"} has been deleted.`,
      });
      setOpenDeleteDialog(false);
      setBatchToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete batch",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: BatchFormValues) {
    if (editingBatch) {
      updateBatchMutation.mutate({ id: editingBatch.id, values });
    } else {
      createBatchMutation.mutate(values);
    }
  }

  function openCreateBatch() {
    setEditingBatch(null);
    setOpenBatchDialog(true);
  }

  function handleEditBatch(batch: Batch) {
    setEditingBatch(batch);
    setOpenBatchDialog(true);
  }

  function handleDeleteBatch(batch: Batch) {
    setBatchToDelete(batch);
    setOpenDeleteDialog(true);
  }

  function confirmDeleteBatch() {
    if (batchToDelete?.id) {
      deleteBatchMutation.mutate(batchToDelete.id);
    }
  }

  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);
  const selectedBatchCourseIds =
    selectedBatch?.courseIds && selectedBatch.courseIds.length > 0
      ? selectedBatch.courseIds
      : selectedBatch
        ? [selectedBatch.courseId]
        : [];
  const selectedBatchCourseTitles = selectedBatchCourseIds
    .map((id) => courses?.find((c) => c.id === id)?.title)
    .filter(Boolean)
    .join(", ");

  // Filter batches based on search term and filters
  const filteredBatches = batches?.filter((batch) => {
    const matchesSearch = 
      batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && batch.isActive) ||
      (statusFilter === "inactive" && !batch.isActive);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const {
    page,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize,
  } = useClientPagination(filteredBatches, 10);

  return (
    <DashboardLayout>
      <Header
        title="Batches"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search batches..."
            filters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-border bg-card shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
            action={
              <ActionTooltip label="Create batch">
                <Button
                  type="button"
                  onClick={openCreateBatch}
                  className="h-11 w-11 shrink-0 rounded-xl p-0"
                  aria-label="Create batch"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </ActionTooltip>
            }
          />
        }
      />

      {isLoadingBatches ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable
          title="Batch Directory"
          columns={[
            { key: "batch", label: "Batch" },
            { key: "course", label: "Course" },
            { key: "trainer", label: "Trainer" },
            { key: "start", label: "Start Date" },
            { key: "time", label: "Time" },
            { key: "students", label: "Students" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", align: "right" },
          ]}
          isEmpty={filteredBatches.length === 0}
          empty={
            <div className="text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-1 text-lg font-semibold">No batches found</h3>
              <p className="mb-4 text-[15px] text-muted-foreground">
                {searchTerm
                  ? "No batches match your search."
                  : "Create your first batch to get started."}
              </p>
              {!searchTerm && (
                <Button type="button" onClick={openCreateBatch} className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Create Batch
                </Button>
              )}
            </div>
          }
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          {pageItems.map((batch) => {
            const courseIds =
              batch.courseIds && batch.courseIds.length > 0
                ? batch.courseIds
                : [batch.courseId];
            const courseTitles = courseIds
              .map((id) => courses?.find((c) => c.id === id)?.title)
              .filter(Boolean) as string[];
            const trainer = trainers?.find(t => t.id === batch.trainerId);
            const studentCount = batch.studentCount ?? 0;

            return (
              <TableRow key={batch.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">{batch.name}</p>
                      <p className="text-xs text-muted-foreground">{batch.batchCode}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  <div className="min-w-0">
                    <p className="truncate">{courseTitles[0] || "Unknown Course"}</p>
                    {courseTitles.length > 1 ? (
                      <p className="text-xs text-muted-foreground">
                        +{courseTitles.length - 1} more
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {trainer ? `${trainer.firstName} ${trainer.lastName}` : "Unknown Trainer"}
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  <div>
                    <p>{new Date(batch.startDate).toLocaleDateString()}</p>
                    {batch.endDate ? (
                      <p className="text-xs text-muted-foreground">
                        to {new Date(batch.endDate).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[15px] text-[#2D3748]/90">
                    <Clock className="h-3.5 w-3.5 text-[#A0AEC0]" />
                    <span>{batch.batchTime}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[15px] text-[#2D3748]/90">
                    <GraduationCap className="h-3.5 w-3.5 text-[#A0AEC0]" />
                    <span>{studentCount}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      batch.isActive
                        ? "border-green-200 bg-green-100 text-green-800"
                        : "border-gray-200 bg-gray-100 text-gray-800"
                    )}
                  >
                    {batch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/batches/${batch.id}`}>
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
                    <ActionTooltip label="Edit batch">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Edit batch"
                        onClick={() => handleEditBatch(batch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Enroll students">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Enroll students"
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setOpenEnrollDialog(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete batch">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-[#d32f2f] hover:bg-[#d32f2f]/10"
                        aria-label="Delete batch"
                        onClick={() => handleDeleteBatch(batch)}
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

      <CreateFormDialog
        open={openBatchDialog}
        onOpenChange={setOpenBatchDialog}
        title={isEditing ? "Edit Batch" : "Create Batch"}
        description={
          isEditing
            ? "Update batch details, courses, schedule, and trainer."
            : "Fill in the details to create a new batch. Students in a batch will be enrolled in all selected courses."
        }
        icon={<Users className="h-7 w-7 text-white" />}
        maxWidth="max-w-2xl"
        footer={
          <CreateFormFooter
            formId={BATCH_FORM_ID}
            onCancel={() => setOpenBatchDialog(false)}
            submitLabel={isEditing ? "Save Changes" : "Create Batch"}
            pendingLabel={isEditing ? "Saving..." : "Creating..."}
            isPending={createBatchMutation.isPending || updateBatchMutation.isPending}
          />
        }
      >
        <Form {...form}>
          <form
            id={BATCH_FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormSection
              title="Batch details"
              description="Name, code, courses, and description"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Batch Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter batch name"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>A descriptive name for the batch</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Batch Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter batch code"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>A unique code for this batch</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="courseIds"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={createFormLabelClass}>Courses</FormLabel>
                      <FormDescription className="mb-2">
                        Select one or more courses for this batch. Checked = included.
                      </FormDescription>
                      <div className="max-h-[220px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-white">
                        {isLoadingCourses ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        ) : !courses?.length ? (
                          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No courses available
                          </p>
                        ) : (
                          <ul className="divide-y divide-border/80">
                            {courses.map((course) => {
                              const checked = field.value?.includes(course.id);
                              return (
                                <li key={course.id}>
                                  <label
                                    className={cn(
                                      "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/70",
                                      checked && "bg-primary/5"
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const next = value === true
                                          ? [...(field.value || []), course.id]
                                          : (field.value || []).filter((id) => id !== course.id);
                                        field.onChange(next);
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[15px] font-medium text-[#2D3748]">
                                        {course.title}
                                      </p>
                                    </div>
                                    {checked ? (
                                      <Badge className="shrink-0 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                                        Selected
                                      </Badge>
                                    ) : null}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {(field.value?.length || 0)} of {courses?.length || 0} selected
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={createFormLabelClass}>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter batch description"
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
              title="Schedule & trainer"
              description="When the batch runs and who leads it. Past start dates are allowed."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="trainerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Trainer</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className={createFormControlClass}>
                            <SelectValue placeholder="Select a trainer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingUsers ? (
                            <SelectItem value="loading" disabled>
                              Loading trainers...
                            </SelectItem>
                          ) : (
                            trainers.map((trainer) => (
                              <SelectItem key={trainer.id} value={trainer.id.toString()}>
                                {trainer.firstName} {trainer.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Admin who will be responsible for this batch
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>Batch Time</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 09:00 AM"
                          className={createFormControlClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={createFormLabelClass}>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                createFormControlClass,
                                "w-full justify-start pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            captionLayout="dropdown-buttons"
                            fromYear={2018}
                            toYear={new Date().getFullYear() + 8}
                            defaultMonth={field.value}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Past dates are allowed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={createFormLabelClass}>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                createFormControlClass,
                                "w-full justify-start pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            captionLayout="dropdown-buttons"
                            fromYear={2018}
                            toYear={new Date().getFullYear() + 8}
                            defaultMonth={field.value || form.getValues("startDate")}
                            disabled={(date) => {
                              const start = form.getValues("startDate");
                              if (!start) return false;
                              const startDay = new Date(start);
                              startDay.setHours(0, 0, 0, 0);
                              return date < startDay;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Must be on or after start date</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border bg-white p-4 sm:col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className={createFormLabelClass}>Active Batch</FormLabel>
                        <FormDescription>Is this batch currently active?</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
          </form>
        </Form>
      </CreateFormDialog>

      <EnrollStudentsDialog
        open={openEnrollDialog}
        onOpenChange={setOpenEnrollDialog}
        batchId={selectedBatchId}
        batchName={selectedBatch?.name}
        courseTitle={selectedBatchCourseTitles || undefined}
        students={students}
      />

      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg">Delete Batch</DialogTitle>
            <DialogDescription className="text-center text-[15px]">
              {batchToDelete &&
                `Are you sure you want to delete "${batchToDelete.name}"? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Batch enrollments and related student assignments for this batch will be removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenDeleteDialog(false)}
              disabled={deleteBatchMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBatch}
              disabled={deleteBatchMutation.isPending}
            >
              {deleteBatchMutation.isPending ? "Deleting..." : "Delete Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
