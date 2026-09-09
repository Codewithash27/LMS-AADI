import { useMemo, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ExamEditor from "@/components/exams/exam-editor";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  BookOpen,
  AlertTriangle,
  Send,
  Ban,
  Clock,
} from "lucide-react";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function isPublished(exam: any) {
  return exam?.acceptingResponses !== false;
}

export default function AdminExams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["/api/exams"],
  });

  const { data: courses = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: ["/api/courses"],
  });

  const { data: batches = [] } = useQuery<
    { id: number; name: string; courseId: number; batchCode?: string }[]
  >({
    queryKey: ["/api/batches"],
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      await apiRequest("DELETE", `/api/exams/${examId}`);
    },
    onSuccess: () => {
      toast({
        title: "Exam deleted successfully",
        description: `${selectedExam?.title} has been deleted`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedExam(null);
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete exam",
        description: error.message || "There was an error deleting the exam",
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({
      examId,
      acceptingResponses,
    }: {
      examId: number;
      acceptingResponses: boolean;
    }) => {
      const res = await apiRequest("PUT", `/api/exams/${examId}`, {
        acceptingResponses,
      });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.acceptingResponses ? "Exam published" : "Exam unpublished",
        description: vars.acceptingResponses
          ? "Assigned students can now see and take this exam."
          : "Students can no longer submit this exam.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update exam",
        description: error.message || "Could not change publish status",
        variant: "destructive",
      });
    },
  });

  const handleDeleteExam = () => {
    if (!selectedExam) return;
    deleteExamMutation.mutate(selectedExam.id);
  };

  const openDeleteDialog = (exam: any) => {
    setSelectedExam(exam);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateExam = () => {
    setSelectedExam(null);
    setIsEditorOpen(true);
  };

  const handleEditExam = (exam: any) => {
    setSelectedExam(exam);
    setIsEditorOpen(true);
  };

  const getCourseName = (courseId: number) => {
    const course = (courses as any[]).find((c: any) => c.id === courseId);
    return course ? course.title : "Unknown Course";
  };

  // Newest exams first (higher id = more recent)
  const sortedExams = useMemo(
    () =>
      [...(exams as any[])].sort(
        (a, b) => Number(b.id || 0) - Number(a.id || 0)
      ),
    [exams]
  );

  const filteredExams = sortedExams.filter((exam: any) => {
    const matchesSearch =
      exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCourseName(exam.courseId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const published = isPublished(exam);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && published) ||
      (statusFilter === "closed" && !published);

    return matchesSearch && matchesStatus;
  });

  const {
    page,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize,
  } = useClientPagination(filteredExams, 10);

  return (
    <DashboardLayout>
      <Header
        title="Exams"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search exams..."
            filters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[150px] rounded-xl border-border bg-card shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            }
            action={
              <ActionTooltip label="Create exam">
                <Button
                  type="button"
                  onClick={handleCreateExam}
                  className="h-11 w-11 shrink-0 rounded-xl p-0"
                  aria-label="Create exam"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </ActionTooltip>
            }
          />
        }
      />

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable
          title="Exam Directory"
          columns={[
            { key: "exam", label: "Exam", className: "min-w-[220px]" },
            { key: "course", label: "Course", className: "min-w-[160px]" },
            { key: "duration", label: "Duration", className: "w-[100px]" },
            { key: "status", label: "Status", className: "w-[130px]" },
            {
              key: "actions",
              label: "Actions",
              align: "right",
              className: "w-[180px] min-w-[180px]",
            },
          ]}
          isEmpty={filteredExams.length === 0}
          empty={
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-1 text-lg font-semibold">No exams found</h3>
              <p className="mb-4 text-[15px] text-muted-foreground">
                {searchTerm
                  ? "No exams match your search."
                  : "Create your first exam to get started."}
              </p>
              {!searchTerm && (
                <Button type="button" onClick={handleCreateExam} className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Create Exam
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
          {pageItems.map((exam: any) => {
            const published = isPublished(exam);
            return (
              <TableRow key={exam.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 max-w-[280px]">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                        {exam.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {exam.description?.trim() || "No description"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[200px] items-center gap-2 text-[15px] text-[#2D3748]/90">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#A0AEC0]" />
                    <span className="truncate">{getCourseName(exam.courseId)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[15px] text-[#2D3748]/90">
                    <Clock className="h-3.5 w-3.5 text-[#A0AEC0]" />
                    <span>{exam.duration ?? 60} min</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                        published
                          ? "border-green-200 bg-green-100 text-green-800"
                          : "border-gray-200 bg-gray-100 text-gray-800"
                      )}
                    >
                      {published ? "Published" : "Closed"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {published ? "Visible to students" : "Hidden from students"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ActionTooltip label={published ? "Unpublish" : "Publish"}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "h-9 w-9 p-0",
                          published
                            ? "text-amber-700 hover:bg-amber-50"
                            : "text-green-700 hover:bg-green-50"
                        )}
                        aria-label={published ? "Unpublish exam" : "Publish exam"}
                        disabled={publishMutation.isPending}
                        onClick={() =>
                          publishMutation.mutate({
                            examId: exam.id,
                            acceptingResponses: !published,
                          })
                        }
                      >
                        {published ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </ActionTooltip>
                    <Link href={`/admin/exams/${exam.id}`}>
                      <ActionTooltip label="View exam">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                          aria-label="View exam"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </ActionTooltip>
                    </Link>
                    <ActionTooltip label="Edit exam">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                        aria-label="Edit exam"
                        onClick={() => handleEditExam(exam)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete exam">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-[#d32f2f] hover:bg-[#d32f2f]/10"
                        aria-label="Delete exam"
                        onClick={() => openDeleteDialog(exam)}
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

      <ExamEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        courses={courses}
        batches={batches}
        exam={selectedExam}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Delete Exam
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedExam &&
                `Are you sure you want to delete "${selectedExam.title}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">This will permanently delete:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>The exam and all questions</li>
                  <li>Student attempts and grades for this exam</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteExamMutation.isPending}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExam}
              disabled={deleteExamMutation.isPending}
              className="flex-1 gap-2 rounded-xl"
            >
              {deleteExamMutation.isPending ? "Deleting..." : "Delete Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
