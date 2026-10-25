import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  CheckCircle2,
  Eye,
  GraduationCap,
  Award,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExamAllowRetakeDialog } from "@/components/exams/exam-allow-retake-dialog";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import { getQuestionImageUrl, getCleanQuestionText } from "@/components/exams/exam-view";
import {
  getAttemptGradingMeta,
  isPendingManualReview,
  normalizeExamType,
  type GradingTone,
} from "@shared/grading";

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
  score?: number | null;
  maxScore?: number | null;
  exam: {
    id: number;
    title: string;
    description: string;
    examType?: string;
  };
};

function gradingInput(attempt: ExamAttempt) {
  return {
    completedAt: attempt.completedAt,
    reviewedAt: attempt.reviewedAt,
    examType: attempt.exam.examType,
    score: attempt.score,
    maxScore: attempt.maxScore,
    feedback: attempt.feedback,
  };
}

type Question = {
  id: number;
  text: string;
  order: number;
  examId: number;
  imageUrl?: string | null;
};

type StatusFilter = "all" | "needs" | "graded" | "progress";

const TONE_COLOR: Record<GradingTone, string> = {
  needs: "#43D9E8",
  graded: "#3DDC97",
  progress: "#FFB547",
};

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: 5 }, (_, i) => start + i);
}

function sortAttempts(list: ExamAttempt[]) {
  const rank: Record<GradingTone, number> = { needs: 0, progress: 1, graded: 2 };
  return [...list].sort((a, b) => {
    const ra = rank[getAttemptGradingMeta(gradingInput(a)).tone];
    const rb = rank[getAttemptGradingMeta(gradingInput(b)).tone];
    if (ra !== rb) return ra - rb;
    const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return db - da;
  });
}

function initials(user: ExamAttempt["user"]) {
  return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "U";
}

function formatSubmitted(completedAt: string | null) {
  if (!completedAt) return "Still in progress";
  return new Date(completedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scorePercent(attempt: ExamAttempt): number | null {
  const max = attempt.maxScore ?? 0;
  const score = attempt.score ?? 0;
  if (max <= 0) return null;
  return Math.round((score / max) * 100);
}

function matchesStatusFilter(attempt: ExamAttempt, filter: StatusFilter): boolean {
  const input = gradingInput(attempt);
  const meta = getAttemptGradingMeta(input);
  if (filter === "all") return true;
  if (filter === "progress") return meta.tone === "progress";
  if (filter === "needs") return isPendingManualReview(input);
  if (filter === "graded") return meta.tone === "graded";
  return true;
}

function StudentDial({ attempt }: { attempt: ExamAttempt }) {
  const meta = getAttemptGradingMeta(gradingInput(attempt));
  const color = TONE_COLOR[meta.tone];
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const pct = scorePercent(attempt);
  const isMcq = normalizeExamType(attempt.exam.examType) === "mcq";
  const portion =
    isMcq && pct != null
      ? pct / 100
      : meta.tone === "graded"
        ? 1
        : meta.tone === "needs"
          ? 0.88
          : 0.45;

  return (
    <div className="relative h-[84px] w-[84px]" role="img" aria-label={`${meta.label}, ${initials(attempt.user)}`}>
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
        {isMcq && pct != null ? (
          <span className="font-[Fraunces,Georgia,serif] text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#F3F2FA]">
            {pct}%
          </span>
        ) : (
          <span className="font-[Fraunces,Georgia,serif] text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#F3F2FA]">
            {initials(attempt.user)}
          </span>
        )}
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#A3A1B8]">
          {isMcq ? "mcq" : meta.label.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}

function SubmissionCard({
  attempt,
  onGrade,
  onRetake,
}: {
  attempt: ExamAttempt;
  onGrade: (a: ExamAttempt) => void;
  onRetake: (a: ExamAttempt) => void;
}) {
  const meta = getAttemptGradingMeta(gradingInput(attempt));
  const accent = TONE_COLOR[meta.tone];
  const student = `${attempt.user.firstName} ${attempt.user.lastName}`.trim();
  const active = meta.tone === "needs";
  const isMcq = normalizeExamType(attempt.exam.examType) === "mcq";
  const canManualGrade = meta.requiresManualGrading && Boolean(attempt.completedAt);
  const pct = scorePercent(attempt);

  return (
    <article
      className={cn(
        "grid grid-cols-[84px_1fr] gap-5 rounded-[28px] border border-white/[0.07] p-[22px]",
        active ? "bg-[#0F0F18]" : "bg-[#0C0C13]",
        active && "shadow-[0_0_0_1px_rgba(67,217,232,0.12)]"
      )}
    >
      <StudentDial attempt={attempt} />
      <div className="min-w-0">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#171724] py-[5px] pl-[5px] pr-[11px] text-xs font-bold text-[#D6D4E6]">
            <span className="h-[18px] w-[18px] rounded-full" style={{ background: accent }} />
            {meta.label}
          </span>
          <span className="rounded-full bg-[#13131E] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#A3A1B8]">
            {isMcq ? "MCQ" : "Theory"}
          </span>
        </span>
        <h3 className="mb-1.5 mt-3 font-[Fraunces,Georgia,serif] text-2xl font-medium tracking-[-0.03em] text-[#F3F2FA]">
          {attempt.exam.title}
        </h3>
        <p className="text-[13px] leading-normal text-[#A3A1B8]">
          {attempt.exam.description?.trim() || "No description"}
        </p>
        <p className="mt-3 text-sm font-bold text-[#F3F2FA]">{student}</p>
        <p className="text-xs text-[#8E8CA6]">@{attempt.user.username}</p>
      </div>
      <div className="col-span-2 mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <p className="text-[13px] font-bold text-[#A3A1B8]">
          Submitted <span className="text-[#F3F2FA]">{formatSubmitted(attempt.completedAt)}</span>
          {isMcq && pct != null ? (
            <span className="ml-2 text-[#3DDC97]">
              · {attempt.score}/{attempt.maxScore} ({pct}%)
            </span>
          ) : null}
        </p>
        <div className="flex gap-2">
          <ActionTooltip label="Allow retake">
            <button
              type="button"
              aria-label="Allow retake"
              onClick={() => onRetake(attempt)}
              className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/[0.08] bg-[#171724] text-[#43D9E8] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
            >
              <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </button>
          </ActionTooltip>
          {attempt.completedAt ? (
            <ActionTooltip
              label={
                canManualGrade
                  ? attempt.reviewedAt
                    ? "View grading"
                    : "Grade theory submission"
                  : "View auto-graded MCQ"
              }
            >
              <button
                type="button"
                onClick={() => onGrade(attempt)}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-xl bg-[#D4FF3F] px-4 text-xs font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
              >
                <Eye className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {canManualGrade ? (attempt.reviewedAt ? "View" : "Grade") : "View"}
              </button>
            </ActionTooltip>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SubmissionBoard({
  attempts,
  empty,
  onGrade,
  onRetake,
}: {
  attempts: ExamAttempt[];
  empty: string;
  onGrade: (a: ExamAttempt) => void;
  onRetake: (a: ExamAttempt) => void;
}) {
  const { page, pageCount, pageItems, setPage } = useClientPagination(attempts, 6);
  const listKey = attempts.map((a) => a.id).join(",");

  useEffect(() => {
    setPage(1);
  }, [listKey, setPage]);

  const pagerButton =
    "grid h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-extrabold text-[#A3A1B8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] disabled:opacity-40";

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 min-[981px]:grid-cols-2">
        {attempts.length === 0 ? (
          <div className="col-span-full rounded-[28px] border border-dashed border-white/15 px-8 py-[34px] text-center text-[#A3A1B8]">
            {empty}
          </div>
        ) : (
          pageItems.map((attempt) => (
            <SubmissionCard
              key={attempt.id}
              attempt={attempt}
              onGrade={onGrade}
              onRetake={onRetake}
            />
          ))
        )}
      </div>
      {pageCount > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Submission pages">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className={pagerButton}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {pageWindow(page, pageCount).map((number) => (
            <button
              key={number}
              type="button"
              aria-label={`Page ${number}`}
              aria-current={number === page ? "page" : undefined}
              onClick={() => setPage(number)}
              className={
                number === page
                  ? "grid h-10 w-10 place-items-center rounded-full bg-[#D4FF3F] text-sm font-extrabold text-[#0A0A0F]"
                  : pagerButton
              }
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount}
            className={pagerButton}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default function GradingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("needs");
  const [examFilter, setExamFilter] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retakeForAttempt, setRetakeForAttempt] = useState<ExamAttempt | null>(null);
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

  const stats = useMemo(() => {
    const list = (examAttempts as ExamAttempt[] | undefined) ?? [];
    let needs = 0;
    let graded = 0;
    let progress = 0;
    for (const attempt of list) {
      const input = gradingInput(attempt);
      if (isPendingManualReview(input)) needs += 1;
      else if (getAttemptGradingMeta(input).tone === "graded") graded += 1;
      else progress += 1;
    }
    return { total: list.length, needs, graded, progress };
  }, [examAttempts]);

  const examQueue = useMemo(() => {
    const list = (examAttempts as ExamAttempt[] | undefined) ?? [];
    const map = new Map<string, number>();
    for (const attempt of list) {
      if (!isPendingManualReview(gradingInput(attempt))) continue;
      const title = attempt.exam.title;
      map.set(title, (map.get(title) || 0) + 1);
    }
    const rows = [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [examAttempts]);

  const filteredAttempts = useMemo(() => {
    const list = (examAttempts as ExamAttempt[] | undefined) ?? [];
    const q = searchTerm.toLowerCase();
    const filtered = list.filter((attempt) => {
      if (examFilter && attempt.exam.title !== examFilter) return false;
      const matchesSearch =
        !q ||
        attempt.user.firstName.toLowerCase().includes(q) ||
        attempt.user.lastName.toLowerCase().includes(q) ||
        attempt.exam.title.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      return matchesStatusFilter(attempt, statusFilter);
    });
    return sortAttempts(filtered);
  }, [examAttempts, searchTerm, statusFilter, examFilter]);

  const handleGrade = async () => {
    if (!selectedAttempt) return;
    const manual = getAttemptGradingMeta(gradingInput(selectedAttempt)).requiresManualGrading;
    if (!manual) return;
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Add instructor feedback before saving a theory grade.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest("PUT", `/api/admin/exam-attempts/${selectedAttempt.id}/grade`, { feedback });
      toast({ title: "Grading completed", description: "The exam has been graded successfully." });
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

  const emptyMessage =
    searchTerm || examFilter || statusFilter !== "all"
      ? "No submissions match your search or filters."
      : "No exam submissions yet.";

  const selectedManual =
    selectedAttempt != null &&
    getAttemptGradingMeta(gradingInput(selectedAttempt)).requiresManualGrading;
  const selectedMcq =
    selectedAttempt != null && normalizeExamType(selectedAttempt.exam.examType) === "mcq";
  const selectedPct = selectedAttempt ? scorePercent(selectedAttempt) : null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4FF3F] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">
              Academics / Grading
            </p>
            <h1 className="font-[Fraunces,Georgia,serif] text-[52px] font-medium leading-none tracking-[-0.03em] max-[980px]:text-[40px]">
              Exam <i className="text-[#D4FF3F]">grading</i>
            </h1>
          </div>
          <label className="flex h-12 w-[280px] max-w-full items-center gap-2.5 rounded-full border border-white/[0.09] bg-[#0F0F18] px-[18px] text-[#B4B2C8] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#D4FF3F]">
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or exam…"
              aria-label="Search submissions"
              className="w-full bg-transparent font-semibold text-[#F3F2FA] outline-none placeholder:text-[#B4B2C8]"
            />
          </label>
        </header>

        <section className="grid grid-cols-1 gap-5 min-[981px]:grid-cols-[5fr_7fr]">
          <article className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0F0F18] p-[26px]">
            <div className="pointer-events-none absolute -right-[120px] -top-[120px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(67,217,232,0.24),transparent_65%)]" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">
              Theory queue
            </p>
            <div className="relative flex items-end gap-3.5">
              <p className="font-[Fraunces,Georgia,serif] text-[96px] font-semibold leading-[0.9] tracking-[-0.04em] text-[#43D9E8] max-[980px]:text-[72px]">
                {String(stats.needs).padStart(2, "0")}
              </p>
              <p className="pb-2.5 text-base leading-snug text-[#A3A1B8]">
                theory exams
                <br />
                need review · <b className="text-[#F3F2FA]">{stats.total}</b> attempts total
              </p>
            </div>
            <p className="relative flex justify-between text-[#A3A1B8]">
              <span>
                Graded <b className="text-[#3DDC97]">{stats.graded}</b>
              </span>
              <span>
                In progress <b className="text-[#FFB547]">{stats.progress}</b>
              </span>
            </p>
          </article>

          <article className="rounded-[28px] border border-white/[0.07] bg-[#0F0F18] p-[26px]">
            <div className="mb-[22px] flex items-center justify-between gap-3">
              <h2 className="font-[Fraunces,Georgia,serif] text-[28px] font-medium tracking-[-0.03em]">
                Filter by <i className="text-[#D4FF3F]">exam</i>
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A3A1B8]">
                {examFilter ? `filtering · tap again to clear` : "tap a bar to filter"}
              </span>
            </div>
            <div className="slim-scroll flex max-h-[280px] flex-col gap-3.5 overflow-y-auto pr-1">
              {examQueue.rows.length === 0 ? (
                <p className="text-[#A3A1B8]">Nothing waiting — you are caught up.</p>
              ) : (
                examQueue.rows.map((row) => {
                  const selected = examFilter === row.name;
                  const dimmed = examFilter != null && !selected;
                  return (
                    <button
                      key={row.name}
                      type="button"
                      onClick={() => setExamFilter(selected ? null : row.name)}
                      className={cn(
                        "block w-full text-left focus-visible:rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4FF3F]",
                        dimmed && "opacity-40"
                      )}
                    >
                      <span className="mb-2 flex justify-between font-bold">
                        <span className="truncate text-[#F3F2FA]">{row.name}</span>
                        <span className="font-[Fraunces,Georgia,serif] text-xl font-semibold">{row.count}</span>
                      </span>
                      <span className="block h-[30px] rounded-full bg-white/[0.06] p-1">
                        <span
                          className="flex h-full min-w-[22px] items-center justify-end rounded-full pr-1"
                          style={{
                            width: `${(row.count / examQueue.max) * 100}%`,
                            background: selected ? "#D4FF3F" : "#43D9E8",
                          }}
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

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="Submission status" className="flex flex-wrap rounded-full bg-[#13131E] p-1">
              {(
                [
                  ["needs", "Theory queue", stats.needs],
                  ["all", "All", stats.total],
                  ["graded", "Graded", stats.graded],
                  ["progress", "In progress", stats.progress],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={statusFilter === id}
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]",
                    statusFilter === id ? "bg-[#D4FF3F] text-[#0A0A0F]" : "text-[#A3A1B8]"
                  )}
                >
                  {label}
                  <span className={statusFilter === id ? "text-[#0A0A0F]/70" : "text-[#8E8CA6]"}>{count}</span>
                </button>
              ))}
            </div>
            {examFilter ? (
              <button
                type="button"
                onClick={() => setExamFilter(null)}
                className="inline-flex max-w-[min(100%,320px)] items-center gap-2 truncate rounded-full border border-[#D4FF3F]/30 bg-[#D4FF3F]/10 px-4 py-2 text-xs font-extrabold text-[#D4FF3F]"
              >
                Exam: {examFilter}
                <span aria-hidden>×</span>
              </button>
            ) : (
              <p className="text-sm font-bold text-[#A3A1B8]">
                {filteredAttempts.length} submission{filteredAttempts.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <SubmissionBoard
            attempts={filteredAttempts}
            empty={emptyMessage}
            onGrade={openGrading}
            onRetake={setRetakeForAttempt}
          />
        </section>
      </div>

      <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-white/10 bg-[#0F0F18] text-[#F3F2FA]">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4FF3F]/15">
              <GraduationCap className="h-6 w-6 text-[#D4FF3F]" />
            </div>
            <DialogTitle className="text-center font-[Fraunces,Georgia,serif] text-xl font-medium">
              {selectedManual ? "Grade" : "Review"}: {selectedAttempt?.exam.title}
            </DialogTitle>
            <div className="mt-2 text-center text-sm text-[#A3A1B8]">
              Student:{" "}
              <span className="font-semibold text-[#F3F2FA]">
                {selectedAttempt?.user.firstName} {selectedAttempt?.user.lastName}
              </span>{" "}
              ({selectedAttempt?.user.username})
            </div>
            {selectedMcq && selectedPct != null ? (
              <p className="mt-3 text-center font-[Fraunces,Georgia,serif] text-2xl text-[#3DDC97]">
                Auto-graded · {selectedAttempt?.score}/{selectedAttempt?.maxScore} ({selectedPct}%)
              </p>
            ) : null}
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#F3F2FA]">
                <Award className="h-5 w-5 text-[#D4FF3F]" aria-hidden />
                Student answers
              </h3>
              <div className="space-y-4">
                {questions?.map((question: Question, index: number) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#13131E] p-4"
                  >
                    <h4 className="mb-2 font-semibold text-[#F3F2FA]">Question {index + 1}</h4>
                    <p className="mb-3 leading-relaxed text-[#D6D4E6]">
                      {getCleanQuestionText(question.text)}
                    </p>
                    {getQuestionImageUrl(question) && (
                      <div className="mb-3 max-w-lg overflow-hidden rounded-xl border border-white/[0.08] bg-[#0C0C13] p-2">
                        <img
                          src={getQuestionImageUrl(question)!}
                          alt={`Question ${index + 1} diagram`}
                          className="max-h-64 w-auto rounded-lg object-contain"
                        />
                      </div>
                    )}
                    <div className="rounded-xl border border-white/[0.06] bg-[#0C0C13] p-4">
                      <Label className="text-sm font-semibold text-[#A3A1B8]">Student answer</Label>
                      <p className="mt-2 leading-relaxed text-[#F3F2FA]">
                        {selectedAttempt?.answers?.[question.id] || (
                          <span className="italic text-[#8E8CA6]">No answer provided</span>
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
                className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#F3F2FA]"
              >
                <FileText className="h-5 w-5 text-[#D4FF3F]" aria-hidden />
                {selectedMcq ? "Auto feedback" : "Instructor feedback"}
              </Label>
              <Textarea
                id="feedback"
                readOnly={selectedMcq}
                placeholder={
                  selectedManual
                    ? "Provide detailed feedback on the student's performance..."
                    : "MCQ exams are scored automatically when submitted."
                }
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-2 min-h-[120px] rounded-2xl border-white/10 bg-[#13131E] text-[#F3F2FA] placeholder:text-[#8E8CA6] read-only:opacity-90"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsGradingOpen(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-full border-white/10 bg-transparent text-[#F3F2FA]"
            >
              {selectedManual ? "Cancel" : "Close"}
            </Button>
            {selectedManual ? (
              <Button
                onClick={handleGrade}
                disabled={isSubmitting}
                className="flex-1 gap-2 rounded-full bg-[#D4FF3F] text-[#0A0A0F] hover:bg-[#E4FF7A]"
              >
                {isSubmitting ? (
                  "Saving..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Save grading
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExamAllowRetakeDialog
        exam={
          retakeForAttempt
            ? { id: retakeForAttempt.examId, title: retakeForAttempt.exam.title }
            : null
        }
        open={!!retakeForAttempt}
        initialUserId={retakeForAttempt?.userId}
        onOpenChange={(open) => {
          if (!open) setRetakeForAttempt(null);
        }}
      />
    </DashboardLayout>
  );
}
