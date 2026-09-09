import { useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Book,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function hasCompletedAttempt(examAttempts: any[], examId: number) {
  return examAttempts.some(
    (attempt) =>
      Number(attempt.examId) === Number(examId) && attempt.completedAt
  );
}

function hasInProgressAttempt(examAttempts: any[], examId: number) {
  return examAttempts.some(
    (attempt) =>
      Number(attempt.examId) === Number(examId) && !attempt.completedAt
  );
}

export default function StudentUpcomingExams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const { toast } = useToast();

  const { data: exams = [], isLoading: isLoadingExams } = useQuery({
    queryKey: ["/api/exams"],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ["/api/exam-attempts/user"],
  });

  const getCourseName = (courseId: number) => {
    const course = (courses as any[]).find((c) => c.id === courseId);
    return course ? course.title : "Unknown Course";
  };

  // Newest exams first
  const sortedExams = useMemo(
    () =>
      [...(exams as any[])].sort(
        (a, b) => Number(b.id || 0) - Number(a.id || 0)
      ),
    [exams]
  );

  const filteredExams = sortedExams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCourseName(exam.courseId)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const { page, pageSize, total, pageItems, setPage, setPageSize } =
    useClientPagination(filteredExams, 10);

  const getExamState = (exam: any) => {
    const attempted = hasCompletedAttempt(examAttempts as any[], exam.id);
    const inProgress = hasInProgressAttempt(examAttempts as any[], exam.id);
    const closed = exam.acceptingResponses === false;

    if (attempted) {
      return {
        label: "Attempted",
        color: "border-slate-200 bg-slate-100 text-slate-800",
        icon: <CheckCircle2 className="mr-1 h-3.5 w-3.5" />,
        canStart: false,
        buttonLabel: "Attempted",
      };
    }

    if (closed) {
      return {
        label: "Closed",
        color: "border-red-200 bg-red-100 text-red-800",
        icon: <XCircle className="mr-1 h-3.5 w-3.5" />,
        canStart: false,
        buttonLabel: "Unavailable",
      };
    }

    if (inProgress) {
      return {
        label: "In Progress",
        color: "border-amber-200 bg-amber-100 text-amber-800",
        icon: <CheckCircle2 className="mr-1 h-3.5 w-3.5" />,
        canStart: true,
        buttonLabel: "Continue Exam",
      };
    }

    return {
      label: "Available",
      color: "border-green-200 bg-green-100 text-green-800",
      icon: <CheckCircle2 className="mr-1 h-3.5 w-3.5" />,
      canStart: true,
      buttonLabel: "Start Exam",
    };
  };

  const handleStartExam = (exam: any) => {
    const state = getExamState(exam);
    if (!state.canStart) {
      toast({
        title: state.buttonLabel === "Attempted" ? "Already attempted" : "Cannot start exam",
        description:
          state.buttonLabel === "Attempted"
            ? "You already submitted this exam. Only one attempt is allowed."
            : "This exam is not available at this time.",
        variant: "destructive",
      });
      return;
    }

    window.open(
      `/student/take-exam/${exam.id}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const viewToggle = (
    <div className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-sm">
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
    </div>
  );

  const emptyState = (
    <div className="py-12 text-center">
      <Book className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
      <h3 className="mb-1 text-lg font-semibold">No exams found</h3>
      <p className="text-[15px] text-muted-foreground">
        {searchTerm
          ? "Try a different search term"
          : "There are no exams for your assigned courses yet"}
      </p>
    </div>
  );

  return (
    <DashboardLayout>
      <Header
        title="Upcoming Exams"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search exams..."
            extras={viewToggle}
          />
        }
      />

      {isLoadingExams ? (
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          )}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse rounded-card bg-muted",
                view === "grid" ? "h-40" : "h-20"
              )}
            />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        emptyState
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam: any) => {
            const state = getExamState(exam);
            return (
              <Card
                key={exam.id}
                className="flex flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase",
                        state.color
                      )}
                    >
                      <span className="flex items-center">
                        {state.icon}
                        {state.label}
                      </span>
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-[17px]">
                    {exam.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getCourseName(exam.courseId)}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto space-y-4 pb-4">
                  <p className="line-clamp-2 text-[15px] text-muted-foreground">
                    {exam.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opens in a new tab · one attempt only
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleStartExam(exam)}
                    disabled={!state.canStart}
                    variant={state.canStart ? "default" : "outline"}
                  >
                    {state.buttonLabel}
                    {state.canStart ? <ExternalLink className="h-4 w-4" /> : null}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <DataTable
          title="Exam Directory"
          columns={[
            { key: "exam", label: "Exam" },
            { key: "course", label: "Course" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", align: "right", className: "min-w-[140px]" },
          ]}
          isEmpty={filteredExams.length === 0}
          empty={emptyState}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          {pageItems.map((exam: any) => {
            const state = getExamState(exam);
            return (
              <TableRow key={exam.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                        {exam.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {exam.description || "No description"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[15px] text-[#2D3748]/90">
                    <Book className="h-3.5 w-3.5 text-[#A0AEC0]" />
                    <span className="truncate">{getCourseName(exam.courseId)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      state.color
                    )}
                  >
                    <span className="flex items-center">
                      {state.icon}
                      {state.label}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={state.canStart ? "default" : "outline"}
                    className="h-9 gap-1.5 rounded-xl"
                    onClick={() => handleStartExam(exam)}
                    disabled={!state.canStart}
                  >
                    {state.buttonLabel}
                    {state.canStart ? <ExternalLink className="h-3.5 w-3.5" /> : null}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </DashboardLayout>
  );
}
