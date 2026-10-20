import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ExamEditor from "@/components/exams/exam-editor";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExamAllowRetakeDialog } from "@/components/exams/exam-allow-retake-dialog";
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
import { useClientPagination } from "@/hooks/use-client-pagination";
import { apiRequest, queryClient } from "@/lib/queryClient";

const COURSE_COLORS = ["#7C6CFF", "#D4FF3F", "#43D9E8", "#FF8FA6", "#FFB547", "#3DDC97"];

function isPublished(exam: any) {
  return exam?.acceptingResponses !== false;
}

function courseColor(courseId: number) {
  return COURSE_COLORS[Math.abs(Number(courseId)) % COURSE_COLORS.length];
}

function DurationDial({ minutes, color }: { minutes: number; color: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const portion = Math.min(Math.max(minutes, 0) / 120, 1);
  return (
    <div className="relative h-[84px] w-[84px]" role="img" aria-label={`${minutes} minutes`}>
      <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90" aria-hidden>
        <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${circumference * portion} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-[Fraunces,Georgia,serif] text-[26px] font-semibold leading-none tracking-[-0.04em]">{minutes}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#A3A1B8]">min</span>
      </div>
    </div>
  );
}

export default function AdminExams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [boardView, setBoardView] = useState<"live" | "closed">("live");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [retakeExam, setRetakeExam] = useState<any>(null);
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

  const sortedExams = useMemo(
    () =>
      [...(exams as any[])].sort(
        (a, b) => Number(b.id || 0) - Number(a.id || 0)
      ),
    [exams]
  );

  const stats = useMemo(() => {
    const list = exams as any[];
    const published = list.filter(isPublished).length;
    const total = list.length;
    const avg =
      total === 0
        ? 0
        : Math.round(list.reduce((sum, exam) => sum + Number(exam.duration ?? 60), 0) / total);
    return { published, total, closed: total - published, avg };
  }, [exams]);

  const courseBars = useMemo(() => {
    const counts = new Map<number, number>();
    for (const exam of exams as any[]) {
      const id = Number(exam.courseId);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    const ids = Array.from(new Set([...(courses as { id: number }[]).map((course) => course.id), ...Array.from(counts.keys())]));
    const rows = ids.map((id) => ({
      id,
      name: getCourseName(id),
      count: counts.get(id) || 0,
      color: courseColor(id),
    }));
    rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return { rows, max };
  }, [exams, courses]);

  const filteredExams = sortedExams.filter((exam: any) => {
    const matchesSearch =
      exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCourseName(exam.courseId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter == null || Number(exam.courseId) === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const liveExams = filteredExams.filter(isPublished);
  const closedExams = filteredExams.filter((exam) => !isPublished(exam));
  const activeCourse = courseBars.rows.find((row) => row.id === courseFilter);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">Academics / Exams</p>
            <h1 className="font-[Fraunces,Georgia,serif] text-[72px] font-medium leading-none tracking-[-0.03em] max-[980px]:text-[44px]">
              Exam <i className="text-[#D4FF3F]">board</i>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-12 w-[280px] max-w-full items-center gap-2.5 rounded-full border border-white/[0.09] bg-[#0F0F18] px-[18px] text-[#B4B2C8] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#D4FF3F]">
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search exams…"
                aria-label="Search exams"
                className="w-full bg-transparent font-semibold text-[#F3F2FA] outline-none placeholder:text-[#B4B2C8]"
              />
            </label>
            <button
              type="button"
              onClick={handleCreateExam}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#D4FF3F] px-[22px] text-sm font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden />
              New exam
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 min-[981px]:grid-cols-[5fr_7fr]">
          <article className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0F0F18] p-[26px]">
            <div className="pointer-events-none absolute -right-[120px] -top-[120px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(212,255,63,0.22),transparent_65%)]" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">Accepting responses</p>
            <div className="relative flex items-end gap-3.5">
              <p className="font-[Fraunces,Georgia,serif] text-[150px] font-semibold leading-[0.9] tracking-[-0.04em] text-[#D4FF3F] max-[980px]:text-[96px]">
                {String(stats.published).padStart(2, "0")}
              </p>
              <p className="pb-2.5 text-base leading-snug text-[#A3A1B8]">
                live exams
                <br />
                of <b className="text-[#F3F2FA]">{stats.total}</b> in total
              </p>
            </div>
            <p className="relative flex justify-between text-[#A3A1B8]">
              <span>Avg duration <b className="text-[#F3F2FA]">{stats.avg} min</b></span>
              <span>{stats.closed} closed</span>
            </p>
          </article>

          <article className="rounded-[28px] border border-white/[0.07] bg-[#0F0F18] p-[26px]">
            <div className="mb-[22px] flex items-center justify-between gap-3">
              <h2 className="font-[Fraunces,Georgia,serif] text-[28px] font-medium tracking-[-0.03em]">
                Exams by <i className="text-[#D4FF3F]">course</i>
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">
                {activeCourse ? `filtering: ${activeCourse.name} · tap again to clear` : "tap a bar to filter"}
              </span>
            </div>
            <div className="flex flex-col gap-3.5">
              {courseBars.rows.length === 0 ? (
                <p className="text-[#A3A1B8]">No courses yet.</p>
              ) : (
                courseBars.rows.map((row) => {
                  const selected = courseFilter === row.id;
                  const dimmed = courseFilter != null && !selected;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setCourseFilter(selected ? null : row.id)}
                      className={`block w-full text-left focus-visible:rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4FF3F] ${dimmed ? "opacity-40" : ""}`}
                    >
                      <span className="mb-2 flex justify-between font-bold">
                        <span className="truncate">{row.name}</span>
                        <span className="font-[Fraunces,Georgia,serif] text-xl font-semibold">{row.count}</span>
                      </span>
                      <span className="block h-[30px] rounded-full bg-white/[0.06] p-1">
                        <span
                          className="flex h-full min-w-[22px] items-center justify-end rounded-full pr-1"
                          style={{ width: `${(row.count / courseBars.max) * 100}%`, background: row.color }}
                        >
                          <i className="block h-2.5 w-2.5 rounded-full bg-[#D4FF3F]" />
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </article>
        </section>

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4FF3F] border-t-transparent" />
          </div>
        ) : (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div role="radiogroup" aria-label="Exam status" className="flex rounded-full bg-[#13131E] p-1">
                {(
                  [
                    ["live", "Live now", liveExams.length],
                    ["closed", "Closed", closedExams.length],
                  ] as const
                ).map(([id, label, total]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={boardView === id}
                    onClick={() => setBoardView(id)}
                    className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] ${
                      boardView === id ? "bg-[#D4FF3F] text-[#0A0A0F]" : "text-[#A3A1B8]"
                    }`}
                  >
                    {label}
                    <span className={boardView === id ? "text-[#0A0A0F]/70" : "text-[#8E8CA6]"}>{total}</span>
                  </button>
                ))}
              </div>
            </div>
            <ExamColumn
              empty={boardView === "live" ? "No live exams. Flip a switch to publish one." : "Nothing closed."}
              exams={boardView === "live" ? liveExams : closedExams}
              getCourseName={getCourseName}
              publishPending={publishMutation.isPending}
              onToggle={(exam, published) =>
                publishMutation.mutate({ examId: exam.id, acceptingResponses: !published })
              }
              onRetake={setRetakeExam}
              onEdit={handleEditExam}
              onDelete={openDeleteDialog}
            />
          </section>
        )}
      </div>

      <ExamEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        courses={courses}
        batches={batches}
        exam={selectedExam}
      />

      <ExamAllowRetakeDialog
        exam={retakeExam ? { id: retakeExam.id, title: retakeExam.title, courseId: retakeExam.courseId } : null}
        open={!!retakeExam}
        onOpenChange={(open) => {
          if (!open) setRetakeExam(null);
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0F0F18] text-[#F3F2FA]">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF8FA6]/15">
              <Trash2 className="h-6 w-6 text-[#FF8FA6]" />
            </div>
            <DialogTitle className="text-center font-[Fraunces,Georgia,serif] text-xl font-medium">
              Delete Exam
            </DialogTitle>
            <DialogDescription className="text-center text-[#A3A1B8]">
              {selectedExam &&
                `Are you sure you want to delete "${selectedExam.title}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-[#FFB547]/30 bg-[#FFB547]/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-[#FFB547]" />
              <div className="text-sm text-[#F3F2FA]">
                <p className="font-medium">This will permanently delete:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-[#A3A1B8]">
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
              className="flex-1 rounded-full border-white/10 bg-transparent text-[#F3F2FA]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExam}
              disabled={deleteExamMutation.isPending}
              className="flex-1 gap-2 rounded-full"
            >
              {deleteExamMutation.isPending ? "Deleting..." : "Delete Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function ExamColumn({
  empty,
  exams,
  getCourseName,
  publishPending,
  onToggle,
  onRetake,
  onEdit,
  onDelete,
}: {
  empty: string;
  exams: any[];
  getCourseName: (courseId: number) => string;
  publishPending: boolean;
  onToggle: (exam: any, published: boolean) => void;
  onRetake: (exam: any) => void;
  onEdit: (exam: any) => void;
  onDelete: (exam: any) => void;
}) {
  const { page, pageCount, pageItems, setPage } = useClientPagination(exams, 6);
  const listKey = exams.map((exam) => exam.id).join(",");

  useEffect(() => {
    setPage(1);
  }, [listKey, setPage]);

  const pagerButton =
    "grid h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-extrabold text-[#A3A1B8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] disabled:opacity-40";

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 min-[981px]:grid-cols-2">
        {exams.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 px-8 py-[34px] text-center text-[#A3A1B8]">
            {empty}
          </div>
        ) : (
          pageItems.map((exam) => {
            const published = isPublished(exam);
            const color = courseColor(Number(exam.courseId));
            const minutes = Number(exam.duration ?? 60);
            return (
              <article
                key={exam.id}
                className={`grid grid-cols-[84px_1fr] gap-5 rounded-[28px] border border-white/[0.07] p-[22px] ${published ? "bg-[#0F0F18]" : "bg-[#0C0C13]"}`}
              >
                <DurationDial minutes={minutes} color={published ? color : "#6E6C82"} />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#171724] py-[5px] pl-[5px] pr-[11px] text-xs font-bold text-[#D6D4E6]">
                    <span className="h-[18px] w-[18px] rounded-full" style={{ background: color }} />
                    {getCourseName(exam.courseId)}
                  </span>
                  <h3 className={`mb-1.5 mt-3 font-[Fraunces,Georgia,serif] text-2xl font-medium tracking-[-0.03em] ${published ? "text-[#F3F2FA]" : "text-[#C9C7DA]"}`}>
                    {exam.title}
                  </h3>
                  <p className="text-[13px] leading-normal text-[#A3A1B8]">{exam.description?.trim() || "No description yet"}</p>
                </div>
                <div className="col-span-2 mt-[18px] flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={published}
                    aria-label={published ? "Unpublish exam" : "Publish exam"}
                    disabled={publishPending}
                    onClick={() => onToggle(exam, published)}
                    className="flex items-center gap-2.5 text-[13px] font-bold focus-visible:rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4FF3F] disabled:opacity-50"
                  >
                    <span className={`flex h-[26px] w-11 rounded-full p-[3px] transition ${published ? "bg-[#D4FF3F]" : "bg-white/[0.12]"}`}>
                      <span className={`block h-5 w-5 rounded-full transition ${published ? "translate-x-[18px] bg-[#0A0A0F]" : "bg-[#B4B2C8]"}`} />
                    </span>
                    {published ? "Visible to students" : "Hidden from students"}
                  </button>
                  <div className="flex gap-2">
                    <Link href={`/admin/exams/${exam.id}`}>
                      <ActionTooltip label="View exam">
                        <button type="button" aria-label="View exam" className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/[0.08] bg-[#171724] text-[#D6D4E6] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]">
                          <Eye className="h-[18px] w-[18px]" />
                        </button>
                      </ActionTooltip>
                    </Link>
                    <ActionTooltip label="Allow retake (student or batch)">
                      <button type="button" aria-label="Allow retake" onClick={() => onRetake(exam)} className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/[0.08] bg-[#171724] text-[#43D9E8] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]">
                        <RotateCcw className="h-[18px] w-[18px]" />
                      </button>
                    </ActionTooltip>
                    <ActionTooltip label="Edit exam">
                      <button type="button" aria-label="Edit exam" onClick={() => onEdit(exam)} className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/[0.08] bg-[#171724] text-[#D6D4E6] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]">
                        <Edit className="h-[18px] w-[18px]" />
                      </button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete exam">
                      <button type="button" aria-label="Delete exam" onClick={() => onDelete(exam)} className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/[0.08] bg-[#171724] text-[#FF8FA6] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]">
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </ActionTooltip>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      {pageCount > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Exam pages">
          <button type="button" aria-label="Previous page" onClick={() => setPage(page - 1)} disabled={page <= 1} className={pagerButton}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {pageWindow(page, pageCount).map((number) => (
            <button
              key={number}
              type="button"
              aria-label={`Page ${number}`}
              aria-current={number === page ? "page" : undefined}
              onClick={() => setPage(number)}
              className={number === page ? "grid h-10 w-10 place-items-center rounded-full bg-[#D4FF3F] text-sm font-extrabold text-[#0A0A0F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]" : pagerButton}
            >
              {number}
            </button>
          ))}
          <button type="button" aria-label="Next page" onClick={() => setPage(page + 1)} disabled={page >= pageCount} className={pagerButton}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
