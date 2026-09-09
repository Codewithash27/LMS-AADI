import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, User, CheckCircle2, Eye, GraduationCap, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getQuestionImageUrl, getCleanQuestionText } from "@/components/exams/exam-view";

type ExamAttempt = {
  id: number;
  userId: number;
  examId: number;
  startedAt: string;
  completedAt: string | null;
  answers: Record<string, string>;
  feedback: string | null;
  reviewedAt: string | null;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  exam: {
    id: number;
    title: string;
    description: string;
  };
};

type Question = {
  id: number;
  text: string;
  order: number;
  examId: number;
  imageUrl?: string | null;
};

export default function GradingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: examAttempts, isLoading } = useQuery({
    queryKey: ["/api/admin/exam-attempts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/exam-attempts");
      return await response.json();
    },
  });

  const { data: questions } = useQuery({
    queryKey: [`/api/exams/${selectedAttempt?.examId}/questions`],
    queryFn: async () => {
      if (!selectedAttempt?.examId) return [];
      const response = await apiRequest("GET", `/api/exams/${selectedAttempt.examId}/questions`);
      return await response.json();
    },
    enabled: !!selectedAttempt?.examId,
  });

  const filteredAttempts =
    examAttempts?.filter(
      (attempt: ExamAttempt) =>
        attempt.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const { page, pageSize, total, pageItems, setPage, setPageSize } =
    useClientPagination<ExamAttempt>(filteredAttempts, 10);

  const handleGrade = async () => {
    if (!selectedAttempt) return;

    setIsSubmitting(true);
    try {
      await apiRequest("PUT", `/api/admin/exam-attempts/${selectedAttempt.id}/grade`, {
        feedback,
      });

      toast({
        title: "Grading completed",
        description: "The exam has been graded successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-attempts"] });
      setIsGradingOpen(false);
      setSelectedAttempt(null);
      setFeedback("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to save grading. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGrading = (attempt: ExamAttempt) => {
    setSelectedAttempt(attempt);
    setFeedback(attempt.feedback || "");
    setIsGradingOpen(true);
  };

  const getStatusMeta = (attempt: ExamAttempt) => {
    if (!attempt.completedAt) {
      return { label: "In Progress", className: "border-amber-200 bg-amber-100 text-amber-800" };
    }
    if (attempt.reviewedAt) {
      return { label: "Graded", className: "border-green-200 bg-green-100 text-green-800" };
    }
    return { label: "Needs Grading", className: "border-blue-200 bg-blue-100 text-blue-800" };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Exam Grading"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by student or exam..."
          />
        }
      />

      <DataTable
        title="Grading Directory"
        columns={[
          { key: "exam", label: "Exam" },
          { key: "student", label: "Student" },
          { key: "submitted", label: "Submitted" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions", align: "right" },
        ]}
        isEmpty={filteredAttempts.length === 0}
        empty={
          <div className="text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 text-lg font-semibold">No submissions found</h3>
            <p className="text-[15px] text-muted-foreground">
              {searchTerm
                ? "No submissions match your search."
                : "No exam submissions available yet."}
            </p>
          </div>
        }
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      >
        {pageItems.map((attempt: ExamAttempt) => {
          const status = getStatusMeta(attempt);
          return (
            <TableRow key={attempt.id} className="hover:bg-muted/70">
              <TableCell className="py-3.5 pl-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                      {attempt.exam.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {attempt.exam.description || "No description"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-[15px] text-[#2D3748]/90">
                  <User className="h-3.5 w-3.5 shrink-0 text-[#A0AEC0]" />
                  <span className="truncate">
                    {attempt.user.firstName} {attempt.user.lastName}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-[15px] text-[#2D3748]/90">
                {attempt.completedAt
                  ? new Date(attempt.completedAt).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                    status.className
                  )}
                >
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="pr-5 text-right">
                {attempt.completedAt && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 gap-1.5 px-3 text-primary hover:bg-primary/10"
                    onClick={() => openGrading(attempt)}
                  >
                    <Eye className="h-4 w-4" />
                    {attempt.reviewedAt ? "View" : "Grade"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>

      <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-brand">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Grade Exam: {selectedAttempt?.exam.title}
            </DialogTitle>
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Student:{" "}
              <span className="font-semibold text-foreground">
                {selectedAttempt?.user.firstName} {selectedAttempt?.user.lastName}
              </span>{" "}
              ({selectedAttempt?.user.username})
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Award className="h-5 w-5 text-primary" />
                Student Answers
              </h3>
              <div className="space-y-4">
                {questions?.map((question: Question, index: number) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-border bg-white p-4 shadow-sm"
                  >
                    <h4 className="mb-2 font-semibold">Question {index + 1}</h4>
                    <p className="mb-3 leading-relaxed text-[#2D3748]">
                      {getCleanQuestionText(question.text)}
                    </p>
                    {getQuestionImageUrl(question) && (
                      <div className="mb-3 max-w-lg overflow-hidden rounded-xl border border-border bg-slate-50 p-2">
                        <img
                          src={getQuestionImageUrl(question)!}
                          alt={`Question ${index + 1} diagram`}
                          className="max-h-64 w-auto rounded-lg object-contain"
                        />
                      </div>
                    )}
                    <div className="rounded-xl border border-border bg-[#EEF3F5]/50 p-4">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Student Answer:
                      </Label>
                      <p className="mt-2 leading-relaxed text-[#2D3748]">
                        {selectedAttempt?.answers?.[question.id] || (
                          <span className="italic text-[#A0AEC0]">No answer provided</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label
                htmlFor="feedback"
                className="mb-2 flex items-center gap-2 text-lg font-semibold"
              >
                <FileText className="h-5 w-5 text-primary" />
                Instructor Feedback
              </Label>
              <Textarea
                id="feedback"
                placeholder="Provide detailed feedback on the student's performance..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-2 min-h-[120px] rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsGradingOpen(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrade}
              disabled={isSubmitting}
              className="flex-1 gap-2 rounded-xl"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Grading
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
