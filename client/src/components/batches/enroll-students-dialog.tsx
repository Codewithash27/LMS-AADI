import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CreateFormDialog,
  CreateFormFooter,
  FormSection,
} from "@/components/ui/create-form-dialog";

export type EnrollStudentOption = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type EnrollStudentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: number | null;
  batchName?: string;
  courseTitle?: string;
  students: EnrollStudentOption[];
  onSuccess?: () => void;
};

export default function EnrollStudentsDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  courseTitle,
  students,
  onSuccess,
}: EnrollStudentsDialogProps) {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: batchEnrollments = [], isLoading: isLoadingEnrollments } = useQuery<
    { id: number; userId: number; batchId: number }[]
  >({
    queryKey: [`/api/batches/${batchId}/enrollments`],
    queryFn: async () => {
      if (!batchId) return [];
      const res = await apiRequest("GET", `/api/batches/${batchId}/enrollments`);
      return res.json();
    },
    enabled: open && !!batchId,
  });

  const alreadyEnrolledIds = useMemo(
    () => new Set(batchEnrollments.map((e) => Number(e.userId))),
    [batchEnrollments]
  );

  const availableStudents = useMemo(
    () => students.filter((s) => !alreadyEnrolledIds.has(s.id)),
    [students, alreadyEnrolledIds]
  );

  const enrolledStudents = useMemo(
    () => students.filter((s) => alreadyEnrolledIds.has(s.id)),
    [students, alreadyEnrolledIds]
  );

  useEffect(() => {
    if (!open) {
      setSelectedStudents([]);
    }
  }, [open]);

  const enrollStudentsMutation = useMutation({
    mutationFn: async ({ batchId, userIds }: { batchId: number; userIds: number[] }) => {
      return await apiRequest("POST", "/api/batch-enrollments/bulk", { batchId, userIds });
    },
    onSuccess: () => {
      toast({
        title: "Students enrolled successfully",
        description:
          "Students were added to the batch and enrolled in all linked courses.",
      });
      onOpenChange(false);
      setSelectedStudents([]);
      if (batchId) {
        queryClient.invalidateQueries({ queryKey: [`/api/batches/${batchId}/enrollments`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/course"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to enroll students",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  function toggleStudentSelection(studentId: number) {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function enrollStudents() {
    if (batchId && selectedStudents.length > 0) {
      enrollStudentsMutation.mutate({ batchId, userIds: selectedStudents });
    } else {
      toast({
        title: "No students selected",
        description: "Please select at least one student to enroll.",
        variant: "destructive",
      });
    }
  }

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Enroll Students"
      description="Select students for this batch. They will also be enrolled in all courses linked to the batch."
      icon={<GraduationCap className="h-7 w-7 text-white" />}
      maxWidth="max-w-2xl"
      footer={
        <CreateFormFooter
          onCancel={() => onOpenChange(false)}
          submitLabel="Enroll Selected Students"
          pendingLabel="Enrolling..."
          isPending={enrollStudentsMutation.isPending}
          submitDisabled={
            selectedStudents.length === 0 || !batchId || isLoadingEnrollments
          }
          submitType="button"
          onSubmit={enrollStudents}
        />
      }
    >
      <div className="space-y-4">
        {(batchName || courseTitle) && (
          <FormSection title="Selected batch">
            <p className="text-sm text-[#4A5568]">
              {[batchName, courseTitle].filter(Boolean).join(" — ")}
            </p>
          </FormSection>
        )}

        <FormSection
          title="Select students"
          description={`${selectedStudents.length} selected · ${enrolledStudents.length} already in batch`}
        >
          {isLoadingEnrollments ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-[#A0AEC0]" />
              <p className="text-sm text-muted-foreground">No students available</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-white">
              <ul className="divide-y divide-border/80">
                {availableStudents.map((student) => {
                  const checked = selectedStudents.includes(student.id);
                  return (
                    <li key={student.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/70",
                          checked && "bg-primary/5"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <span className="text-sm font-semibold text-primary">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}

                {enrolledStudents.map((student) => (
                  <li key={`enrolled-${student.id}`}>
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-3 opacity-80">
                      <Checkbox checked disabled />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <span className="text-sm font-semibold text-primary">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                      <Badge className="shrink-0 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                        In batch
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>

              {availableStudents.length === 0 && enrolledStudents.length > 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  All students are already enrolled in this batch.
                </p>
              ) : null}
            </div>
          )}
        </FormSection>
      </div>
    </CreateFormDialog>
  );
}
