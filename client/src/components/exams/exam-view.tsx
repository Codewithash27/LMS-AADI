import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Clock,
  LogOut,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  XCircle,
  ListChecks,
  Target,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import {
  mcqEncouragement,
  normalizeExamType,
  parseMcqScoreFromFeedback,
} from "@/lib/exam-mcq";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExamQuestion = {
  id: number;
  text: string;
  order: number;
  imageUrl?: string | null;
  options?: string[] | null;
};

type SubmitOutcome = {
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  questionResults: Record<number, boolean> | null;
};

type ExamViewProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  exam?: {
    id: number;
    title: string;
    description: string;
    duration?: number;
    acceptingResponses?: boolean;
    examType?: string;
  };
  /** dialog kept for compatibility; page = MCQ-style secure shell */
  mode?: "dialog" | "page";
};

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function getQuestionImageUrl(q: any): string | null {
  if (!q) return null;
  if (q.imageUrl && typeof q.imageUrl === "string" && q.imageUrl.trim() !== "") {
    return q.imageUrl.trim();
  }
  if (q.image_url && typeof q.image_url === "string" && q.image_url.trim() !== "") {
    return q.image_url.trim();
  }
  if (q.text && typeof q.text === "string") {
    const imgMatch =
      q.text.match(/\[IMG:(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i) ||
      q.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/uploads\/[^\s\)]+)\)/i) ||
      q.text.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch) {
      return imgMatch[1];
    }
  }
  return null;
}

export function getCleanQuestionText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[IMG:(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/gi, "")
    .replace(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/uploads\/[^\s\)]+)\)/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .trim();
}

function parseStoredAnswers(
  raw: unknown,
  questions: ExamQuestion[]
): Record<number, string> {
  const initial: Record<number, string> = {};
  questions.forEach((q) => {
    initial[q.id] = "";
  });
  if (!raw) return initial;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") {
      for (const q of questions) {
        const v =
          (parsed as Record<string, unknown>)[String(q.id)] ??
          (parsed as Record<string, unknown>)[q.id as unknown as string];
        if (typeof v === "string") initial[q.id] = v;
      }
    }
  } catch {
    // ignore
  }
  return initial;
}

export default function ExamView({
  open = true,
  onOpenChange,
  exam,
  mode = "page",
}: ExamViewProps) {
  const isPage = mode === "page";
  const isOpen = isPage ? true : Boolean(open);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [examAttemptId, setExamAttemptId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isTimeWarningOpen, setIsTimeWarningOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome | null>(null);
  const { toast } = useToast();

  const isMcqExam = normalizeExamType(exam?.examType) === "mcq";

  const answersRef = useRef(answers);
  const examAttemptIdRef = useRef(examAttemptId);
  const isSubmittingRef = useRef(isSubmitting);
  const submittedRef = useRef(submitted);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    examAttemptIdRef.current = examAttemptId;
  }, [examAttemptId]);
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);
  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  const closeExam = useCallback(() => {
    onOpenChange?.(false);
    if (isPage) {
      try {
        window.close();
      } catch {
        // ignore
      }
      window.location.href = "/student/upcoming-exams";
    }
  }, [onOpenChange, isPage]);

  const persistAnswers = useCallback(async () => {
    const attemptId = examAttemptIdRef.current;
    if (!attemptId || submittedRef.current) return;
    try {
      await apiRequest("PUT", `/api/exam-attempts/${attemptId}`, {
        answers: JSON.stringify(answersRef.current),
      });
    } catch {
      // best-effort save
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !exam) return;
    let cancelled = false;

    const start = async () => {
      try {
        if (exam.acceptingResponses === false) {
          toast({
            title: "Exam closed",
            description: "This exam is no longer accepting responses.",
            variant: "destructive",
          });
          closeExam();
          return;
        }

        const attemptResponse = await apiRequest("POST", "/api/exam-attempts", {
          examId: exam.id,
        });
        const attemptData = await attemptResponse.json();
        if (cancelled) return;
        setExamAttemptId(attemptData.id);

        const questionsResponse = await apiRequest(
          "GET",
          `/api/exams/${exam.id}/questions`
        );
        const questionsData = await questionsResponse.json();
        if (cancelled) return;

        const sorted = [...questionsData].sort(
          (a: any, b: any) => a.order - b.order
        );
        setQuestions(sorted);
        setAnswers(parseStoredAnswers(attemptData.answers, sorted));

        const secs = (exam.duration || 60) * 60;
        setTotalSeconds(secs);
        setTimeRemaining(secs);
        setIsLoading(false);
      } catch (error: any) {
        const msg = String(error?.message || "");
        toast({
          title: "Cannot start exam",
          description: msg.toLowerCase().includes("already submitted")
            ? "You have already submitted this exam. Only one attempt is allowed."
            : "There was an error starting the exam. Please try again.",
          variant: "destructive",
        });
        closeExam();
      }
    };

    start();
    return () => {
      cancelled = true;
    };
  }, [isOpen, exam?.id]);

  const handleSubmitExam = useCallback(
    async (reason?: "manual" | "timeout" | "tab-switch") => {
      if (submittedRef.current || isSubmittingRef.current) return;
      const attemptId = examAttemptIdRef.current;
      if (!attemptId || !exam) return;
      if (exam.acceptingResponses === false) {
        toast({
          title: "Submission blocked",
          description: "This exam is no longer accepting responses.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      isSubmittingRef.current = true;
      try {
        const response = await apiRequest("PUT", `/api/exam-attempts/${attemptId}`, {
          completedAt: new Date().toISOString(),
          answers: JSON.stringify(answersRef.current),
        });
        const data = await response.json();

        let score: number | null = typeof data.score === "number" ? data.score : null;
        let maxScore: number | null = typeof data.maxScore === "number" ? data.maxScore : null;
        if (score == null || maxScore == null) {
          const parsed = parseMcqScoreFromFeedback(data.feedback);
          if (parsed) {
            score = parsed.score;
            maxScore = parsed.maxScore;
          }
        }
        const percent =
          score != null && maxScore != null && maxScore > 0
            ? Math.round((score / maxScore) * 100)
            : null;

        setSubmitOutcome({
          score,
          maxScore,
          percent,
          questionResults: (data.questionResults as Record<number, boolean>) ?? null,
        });
        setSubmitted(true);
        submittedRef.current = true;
        toast({
          title:
            reason === "tab-switch"
              ? "Exam auto-submitted"
              : reason === "timeout"
                ? "Time up — exam submitted"
                : "Exam submitted",
          description:
            reason === "tab-switch"
              ? "Your answers have been submitted."
              : "See your result below.",
          variant: reason === "tab-switch" ? "destructive" : "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts/user"] });
      } catch {
        toast({
          title: "Error submitting exam",
          description: "There was an error submitting your exam. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        setIsSubmitDialogOpen(false);
      }
    },
    [exam, toast]
  );

  const leaveAfterSubmit = useCallback(() => {
    window.location.href = "/student/upcoming-exams";
  }, []);

  // Same anti-cheat as MCQ take-quiz: block copy/paste; 1st leave = warn, 2nd = auto-submit
  useEffect(() => {
    if (isLoading || submitted || !examAttemptId) return;

    const blockEvent = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const onVisibility = () => {
      if (!document.hidden) return;
      setViolations((v) => {
        const next = v + 1;
        void persistAnswers();
        if (next === 1) {
          queueMicrotask(() => {
            toast({
              title: "Warning: tab switch detected",
              description: "Leaving this tab again will auto-submit your exam.",
              variant: "destructive",
            });
          });
        } else if (next >= 2) {
          queueMicrotask(() => {
            void handleSubmitExam("tab-switch");
          });
        }
        return next;
      });
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      void persistAnswers();
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    document.addEventListener("copy", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isLoading, submitted, examAttemptId, toast, persistAnswers, handleSubmitExam]);

  // Autosave answers every 5s (like MCQ draft)
  useEffect(() => {
    if (isLoading || submitted || !examAttemptId) return;
    const id = window.setInterval(() => {
      void persistAnswers();
    }, 5000);
    return () => window.clearInterval(id);
  }, [isLoading, submitted, examAttemptId, persistAnswers]);

  useEffect(() => {
    if (!isOpen || !exam || isLoading || timeRemaining <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === 300) setIsTimeWarningOpen(true);
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmitExam("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, exam, isLoading, timeRemaining, handleSubmitExam, submitted]);

  const answeredCount = Object.values(answers).filter((a) => a.trim() !== "").length;
  const progress =
    questions.length > 0
      ? ((currentQuestionIndex + 1) / questions.length) * 100
      : 0;
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 60;
  const circumference = 2 * Math.PI * 42;
  const timePct =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, (timeRemaining / totalSeconds) * 100))
      : 0;
  const dashOffset = circumference * (1 - timePct / 100);
  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered = Object.values(answers).every((a) => a.trim() !== "");

  const dialogs = (
    <>
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              {!allAnswered && (
                <span className="mb-2 flex items-center text-amber-600">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  You have unanswered questions.
                </span>
              )}
              Once submitted, you cannot change answers or retake this exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSubmitExam("manual")}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isTimeWarningOpen} onOpenChange={setIsTimeWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-amber-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Time is running out!
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have 5 minutes remaining to complete the exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You can return later to finish if you have not submitted yet. After
              submit, only one attempt is allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={closeExam}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#1a3a4a]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
        {dialogs}
      </div>
    );
  }

  const scoreRing = (percent: number, size = 120, light = false) => {
    const r = 42;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
    const stroke = percent >= 80 ? "#4ade80" : percent >= 60 ? "#fbbf24" : "#f87171";
    const track = light ? "rgba(255,255,255,0.25)" : "#e5e7eb";
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="drop-shadow-sm"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              light ? "text-white" : "text-gray-900"
            )}
          >
            {percent}%
          </span>
        </div>
      </div>
    );
  };

  const questionResultStats = (() => {
    const results = submitOutcome?.questionResults;
    if (!results) return null;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    for (const q of questions) {
      const ans = (answers[q.id] || "").trim();
      const ok = results[q.id];
      if (!ans) unanswered += 1;
      else if (ok === true) correct += 1;
      else if (ok === false) incorrect += 1;
    }
    return { correct, incorrect, unanswered };
  })();

  const resultPanel = submitted && (
    <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-white/40 shadow-xl md:grid-cols-[minmax(260px,300px)_1fr] lg:grid-cols-[minmax(280px,320px)_1fr]">
      <aside className="relative flex flex-col gap-5 overflow-y-auto bg-gradient-to-br from-primary via-[#14B8A6] to-brand-blue px-5 py-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10">
          <Badge className="mb-3 border-white/30 bg-white/15 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-white/15">
            {isMcqExam ? "MCQ result" : "Submission received"}
          </Badge>
          <p className="text-[11px] font-medium text-white/75">Exam complete</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-bold leading-snug tracking-tight">
            {exam?.title || "Exam"}
          </h2>
        </div>

        {submitOutcome?.percent != null && submitOutcome.maxScore != null ? (
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Trophy className="h-6 w-6 text-amber-200" />
            </div>
            {scoreRing(submitOutcome.percent, 132, true)}
            <p className="mt-4 text-base font-semibold">
              {submitOutcome.score ?? 0}{" "}
              <span className="font-medium text-white/80">of</span>{" "}
              {submitOutcome.maxScore}{" "}
              <span className="font-medium text-white/80">correct</span>
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/90">
              <Sparkles className="h-4 w-4 text-amber-200" />
              {mcqEncouragement(submitOutcome.percent)}
            </p>
            {questionResultStats && (
              <div className="mt-6 grid w-full grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Correct
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {questionResultStats.correct}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Wrong
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {questionResultStats.incorrect}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Skipped
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {questionResultStats.unanswered}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center py-4 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-200" />
            <h3 className="mt-4 text-lg font-bold">Exam submitted</h3>
            <p className="mt-2 text-sm text-white/85">
              {isMcqExam
                ? "Your score will appear on Results once grading finishes."
                : "Your instructor will review your written answers."}
            </p>
          </div>
        )}

        <div className="relative z-10 mt-auto flex flex-col gap-2 pt-2">
          <Link href="/student/upcoming-exams">
            <Button className="w-full rounded-xl bg-white text-primary shadow-md hover:bg-white/95">
              Back to exams
            </Button>
          </Link>
          <Link href="/student/results">
            <Button
              variant="outline"
              className="w-full rounded-xl border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              View all results
            </Button>
          </Link>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-[#F4F8F9]">
        <div className="shrink-0 border-b border-border bg-white/70 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-gray-900">Answer review</h3>
              <p className="text-xs text-muted-foreground">
                {questions.length} question{questions.length === 1 ? "" : "s"} · compare your
                responses
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {questions.map((q, idx) => {
            const ans = (answers[q.id] || "").trim();
            const ok = submitOutcome?.questionResults?.[q.id];
            const hasResult = submitOutcome?.questionResults != null;
            const showMcqOptions =
              isMcqExam && q.options && q.options.filter((o) => o.trim()).length >= 2;
            const cleanText = getCleanQuestionText(q.text);
            const imgUrl = getQuestionImageUrl(q);

            return (
              <article
                key={q.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
                  hasResult && ok === true && "border-emerald-200/80",
                  hasResult && ok === false && "border-red-200/80",
                  hasResult && ok == null && "border-border",
                  !hasResult && "border-border"
                )}
              >
                <div
                  className={cn(
                    "flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5",
                    hasResult && ok === true && "bg-emerald-50/80",
                    hasResult && ok === false && "bg-red-50/60",
                    !hasResult && "bg-slate-50/80"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                        hasResult && ok === true && "bg-emerald-600 text-white",
                        hasResult && ok === false && "bg-red-500 text-white",
                        !hasResult && "bg-primary/10 text-primary"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Question {idx + 1}
                      </p>
                      {hasResult && (
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            ok === true && "text-emerald-800",
                            ok === false && "text-red-800"
                          )}
                        >
                          {ok === true ? "Correct" : ok === false ? "Incorrect" : "Submitted"}
                        </p>
                      )}
                    </div>
                  </div>
                  {hasResult &&
                    (ok ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-6 w-6 shrink-0 text-red-500" />
                    ))}
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-base font-medium leading-relaxed text-gray-900">{cleanText}</p>

                  {imgUrl && (
                    <div className="max-w-xl overflow-hidden rounded-xl border border-border bg-slate-50 p-2">
                      <img
                        src={imgUrl}
                        alt={`Question ${idx + 1} illustration`}
                        className="max-h-64 w-auto rounded-lg object-contain"
                      />
                    </div>
                  )}

                  {showMcqOptions ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your selection
                      </p>
                      <div className="flex flex-col gap-2">
                        {q.options!.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const trimmed = opt.trim();
                          if (!trimmed) return null;
                          const selected = ans === trimmed;
                          return (
                            <div
                              key={optIdx}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm",
                                selected &&
                                  hasResult &&
                                  ok === true &&
                                  "border-emerald-500 bg-emerald-50 text-emerald-900",
                                selected &&
                                  hasResult &&
                                  ok === false &&
                                  "border-red-400 bg-red-50 text-red-900",
                                selected && !hasResult && "border-primary bg-primary/5",
                                !selected && "border-border/80 bg-slate-50/50 text-gray-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  selected ? "bg-black/10" : "bg-white"
                                )}
                              >
                                {letter}
                              </span>
                              <span className="flex-1">{trimmed}</span>
                              {selected && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 rounded-full text-[10px] uppercase"
                                >
                                  Yours
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        hasResult && ok === true && "border-emerald-200 bg-emerald-50/50",
                        hasResult && ok === false && "border-red-200 bg-red-50/40",
                        !hasResult && "border-sky-200 bg-sky-50/60"
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your answer
                      </p>
                      <p
                        className={cn(
                          "mt-1.5 text-sm leading-relaxed",
                          hasResult && ok === true && "text-emerald-900",
                          hasResult && ok === false && "text-red-900",
                          !hasResult && "text-gray-900"
                        )}
                      >
                        {ans || (
                          <span className="italic text-muted-foreground">No answer provided</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Target className="h-3.5 w-3.5" />
            Results are saved to your profile
          </p>
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
            <Link href="/student/results">
              <Button variant="outline" className="w-full rounded-xl sm:w-auto">
                All results
              </Button>
            </Link>
            <Link href="/student/upcoming-exams">
              <Button className="w-full rounded-xl bg-accent-brand text-white sm:w-auto">
                Continue learning
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );

  const arena = (
    <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-white/40 shadow-xl md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Left: MCQ-style gradient panel + circular timer */}
      <aside className="relative flex flex-col gap-4 overflow-hidden bg-gradient-to-br from-primary via-[#14B8A6] to-brand-blue px-4 py-4 text-white md:gap-6 md:py-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10">
          <p className="truncate text-[11px] font-medium text-white/80">
            {exam?.title || "Written Exam"}
          </p>
          <p className="mt-0.5 text-lg font-bold tracking-tight">
            Question {currentQuestionIndex + 1}
            <span className="text-sm font-medium text-white/70">
              {" "}
              / {questions.length}
            </span>
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 md:flex-col md:items-stretch">
          <div className="relative mx-auto h-[108px] w-[108px] shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={timerUrgent ? "#fecaca" : "#fff"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-1000 linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Clock
                className={cn(
                  "mb-0.5 h-3.5 w-3.5",
                  timerUrgent ? "text-red-100" : "text-white/80"
                )}
              />
              <span
                className={cn(
                  "text-xl font-bold tabular-nums leading-none",
                  timerUrgent && "text-red-100"
                )}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-2 text-sm md:grid-cols-1">
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-white/70">
                Answered
              </p>
              <p className="text-lg font-bold leading-tight">
                {answeredCount}
                <span className="text-sm font-medium text-white/60">
                  /{questions.length}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-white/70">
                Progress
              </p>
              <p className="text-lg font-bold leading-tight">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            Jump to
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, idx) => {
              const answered = (answers[q.id] || "").trim() !== "";
              const active = idx === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                    active && "scale-105 bg-white text-primary shadow-md",
                    !active &&
                      answered &&
                      "bg-white/25 text-white ring-1 ring-white/40",
                    !active &&
                      !answered &&
                      "bg-black/15 text-white/80 hover:bg-white/20"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right: soft stage (not a floating white card) */}
      <section className="flex min-h-0 min-w-0 flex-col bg-[#F4F8F9]">
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-turquoise" />
            {isMcqExam ? "Choose one option" : "Type your answer"}
          </div>

          <h2 className="max-w-3xl text-lg font-bold leading-snug text-gray-900 sm:text-xl lg:text-2xl">
            {getCleanQuestionText(currentQuestion?.text || "")}
          </h2>

          {getQuestionImageUrl(currentQuestion) && (
            <div className="mt-4 max-w-3xl overflow-hidden rounded-2xl border border-border bg-white p-3.5 shadow-md">
              <img
                src={getQuestionImageUrl(currentQuestion)!}
                alt={`Question ${currentQuestionIndex + 1} illustration`}
                className="max-h-[420px] w-auto rounded-xl object-contain"
              />
            </div>
          )}

          <div className="mt-5 max-w-3xl sm:mt-6">
            {isMcqExam && currentQuestion?.options && currentQuestion.options.length >= 2 ? (
              <div className="flex flex-col gap-3">
                {currentQuestion.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const selected = (answers[currentQuestion.id] || "").trim() === opt.trim();
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={exam?.acceptingResponses === false}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base shadow-sm transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-white/90 hover:border-primary/40"
                      )}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-bold">
                        {letter}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Textarea
                value={answers[currentQuestion?.id] || ""}
                onChange={(e) => {
                  if (!currentQuestion) return;
                  if (exam?.acceptingResponses === false) return;
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }));
                }}
                placeholder="Type your answer here..."
                className="min-h-[220px] w-full rounded-2xl border-0 bg-white/90 p-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                disabled={exam?.acceptingResponses === false}
              />
            )}
            {(answers[currentQuestion?.id] || "").trim() !== "" && (
              <Badge className="mt-2 rounded-full border-green-200 bg-green-50 text-green-800">
                Answer saved for this question
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <Button
            variant="outline"
            className="h-10 rounded-xl px-5"
            onClick={() =>
              setCurrentQuestionIndex((i) => Math.max(0, i - 1))
            }
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4"
              onClick={() => {
                if (!currentQuestion) return;
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: "" }));
              }}
              disabled={!(answers[currentQuestion?.id] || "").trim()}
            >
              Clear
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                className="h-10 rounded-xl bg-accent-brand px-6 text-white shadow-md hover:opacity-90"
                onClick={() =>
                  setCurrentQuestionIndex((i) =>
                    Math.min(questions.length - 1, i + 1)
                  )
                }
              >
                Next question
              </Button>
            ) : (
              <Button
                className="h-10 rounded-xl bg-accent-brand px-6 text-white shadow-md hover:opacity-90"
                onClick={() => setIsSubmitDialogOpen(true)}
                disabled={exam?.acceptingResponses === false}
              >
                Submit Exam
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex h-[100dvh] select-none flex-col overflow-hidden bg-[#1a3a4a]">
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 bg-black/20 px-3 py-2 text-white sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-brand">
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Edu Transform</p>
            <p className="truncate text-[10px] text-white/60">Secure exam mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!submitted && violations > 0 && (
            <span className="hidden rounded border border-amber-400/30 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200 sm:inline">
              {violations} warning{violations > 1 ? "s" : ""}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-white/30 bg-white/10 px-2 text-xs text-white hover:bg-white/20 hover:text-white"
            onClick={() => (submitted ? leaveAfterSubmit() : setIsExitDialogOpen(true))}
          >
            <LogOut className="h-3 w-3" />
            Exit
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col p-2 sm:p-3 md:p-4">
        {submitted ? resultPanel : arena}
      </main>

      {dialogs}
    </div>
  );
}
