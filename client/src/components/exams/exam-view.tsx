import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Clock,
  LogOut,
  AlertTriangle,
  Check,
  Award,
  X,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  normalizeExamType,
  mcqEncouragement,
  OPTION_LETTERS,
  sanitizeMcqQuestionStem,
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

type SubmitScoreSummary = {
  score: number;
  maxScore: number;
  percent: number;
  feedback: string;
  questionResults?: Record<number, boolean>;
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

function normalizeQuestionOptions(q: { options?: unknown }): string[] {
  if (!Array.isArray(q.options)) return [];
  return q.options.map((o) => String(o ?? "").trim()).filter(Boolean);
}

function displayQuestionStem(q: ExamQuestion | undefined, isMcq: boolean): string {
  if (!q) return "";
  const base = getCleanQuestionText(q.text);
  return isMcq ? sanitizeMcqQuestionStem(base, q.options ?? []) : base;
}

function scoreTone(percent: number): "good" | "mid" | "low" {
  if (percent >= 80) return "good";
  if (percent >= 60) return "mid";
  return "low";
}

function McqScoreRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const tone = scoreTone(percent);
  const stroke =
    tone === "good" ? "#22c55e" : tone === "mid" ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8e0d5" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums leading-none text-gray-900">
          {percent}%
        </span>
      </div>
    </div>
  );
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
  const [submitScore, setSubmitScore] = useState<SubmitScoreSummary | null>(null);
  const { toast } = useToast();

  const isMcqExam = normalizeExamType(exam?.examType) === "mcq";

  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const jumpButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const examAttemptIdRef = useRef(examAttemptId);
  const isSubmittingRef = useRef(isSubmitting);
  const submittedRef = useRef(submitted);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    jumpButtonRefs.current[currentQuestionIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentQuestionIndex]);
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

        const sorted = [...questionsData]
          .sort((a: any, b: any) => a.order - b.order)
          .map((q: any) => ({
            ...q,
            options: normalizeQuestionOptions(q),
          }));
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
        const res = await apiRequest("PUT", `/api/exam-attempts/${attemptId}`, {
          completedAt: new Date().toISOString(),
          answers: JSON.stringify(answersRef.current),
        });
        const data = await res.json();
        setSubmitted(true);
        submittedRef.current = true;
        queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts/user"] });

        const mcq =
          isMcqExam &&
          data.maxScore != null &&
          data.maxScore > 0 &&
          data.score != null;
        if (mcq) {
          const percent = Math.round((Number(data.score) / Number(data.maxScore)) * 100);
          const qr = data.questionResults as Record<number, boolean> | undefined;
          setSubmitScore({
            score: Number(data.score),
            maxScore: Number(data.maxScore),
            percent,
            feedback: String(data.feedback || ""),
            questionResults: qr,
          });
          toast({
            title:
              reason === "tab-switch"
                ? "Exam auto-submitted"
                : reason === "timeout"
                  ? "Time up — exam submitted"
                  : "MCQ exam submitted",
            description: `Your score: ${data.score} / ${data.maxScore} (${percent}%).`,
            variant: reason === "tab-switch" ? "destructive" : "default",
          });
          return;
        }

        toast({
          title:
            reason === "tab-switch"
              ? "Exam auto-submitted"
              : reason === "timeout"
                ? "Time up — exam submitted"
                : "Exam submitted",
          description:
            reason === "tab-switch"
              ? "You left the tab again. Your answers have been submitted."
              : "Your exam has been submitted. You cannot retake it.",
          variant: reason === "tab-switch" ? "destructive" : "default",
        });
        closeExam();
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
    [exam, toast, closeExam, isMcqExam]
  );

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

  if (submitted && submitScore) {
    const reviewQuestions = questionsRef.current;
    const tone = scoreTone(submitScore.percent);
    return (
      <div className="flex h-[100dvh] select-none flex-col overflow-hidden bg-gradient-to-br from-[#1a3a4a] via-[#0f766e]/90 to-[#1e3a5f]">
        <header className="shrink-0 px-4 py-3 text-center text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            MCQ exam complete
          </p>
          <h1 className="mt-1 truncate text-lg font-bold">{exam?.title}</h1>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-4 pb-6">
          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <McqScoreRing percent={submitScore.percent} />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <Award
                      className={cn(
                        "h-5 w-5",
                        tone === "good"
                          ? "text-emerald-600"
                          : tone === "mid"
                            ? "text-amber-600"
                            : "text-red-500"
                      )}
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      {mcqEncouragement(submitScore.percent)}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
                    {submitScore.score}
                    <span className="text-lg font-medium text-muted-foreground">
                      {" "}
                      / {submitScore.maxScore}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">questions correct</p>
                </div>
              </div>
              <div className="w-full sm:max-w-[180px]">
                <Progress value={submitScore.percent} className="h-2.5" />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {submitScore.percent}% overall
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-xl">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-gray-900">Question review</h2>
            </div>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {reviewQuestions.map((q, idx) => {
                const ok =
                  submitScore.questionResults?.[q.id] ??
                  submitScore.questionResults?.[String(q.id) as unknown as number];
                const answered = (answersRef.current[q.id] || "").trim();
                return (
                  <li
                    key={q.id}
                    className={cn(
                      "rounded-xl border p-3 text-sm",
                      ok === true && "border-emerald-200 bg-emerald-50/80",
                      ok === false && "border-red-200 bg-red-50/80",
                      ok === undefined && "border-border bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {ok === true ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : ok === false ? (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-gray-900">
                          Q{idx + 1}. {displayQuestionStem(q, true)}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Your answer:{" "}
                          <span className="font-medium text-gray-800">
                            {answered || "Not answered"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Button
            className="h-12 shrink-0 rounded-xl bg-accent-brand text-base font-semibold text-white shadow-lg hover:opacity-90"
            onClick={closeExam}
          >
            Back to exams
          </Button>
        </main>
      </div>
    );
  }

  const arena = (
    <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-white/40 shadow-xl md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Left: MCQ-style gradient panel + circular timer */}
      <aside className="relative flex min-h-0 flex-col gap-4 overflow-hidden bg-gradient-to-br from-primary via-[#14B8A6] to-brand-blue px-4 py-4 text-white md:gap-4 md:py-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10 shrink-0">
          <p className="truncate text-[11px] font-medium text-white/80">
            {exam?.title || (isMcqExam ? "MCQ Exam" : "Written Exam")}
          </p>
          <p className="mt-0.5 text-lg font-bold tracking-tight">
            Question {currentQuestionIndex + 1}
            <span className="text-sm font-medium text-white/70">
              {" "}
              / {questions.length}
            </span>
          </p>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-4 md:flex-col md:items-stretch">
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

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            Jump to
          </p>
          <p className="mb-2 shrink-0 text-[10px] text-white/55">
            Scroll the list · tap a number to open that question
          </p>
          <div
            className="min-h-[120px] flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-white/10 bg-black/10 p-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.45)_transparent]"
            aria-label="Question navigation"
          >
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {questions.map((q, idx) => {
                const answered = (answers[q.id] || "").trim() !== "";
                const active = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    ref={(el) => {
                      jumpButtonRefs.current[idx] = el;
                    }}
                    type="button"
                    title={`Question ${idx + 1}${answered ? " (answered)" : ""}`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "h-8 w-full min-w-0 rounded-lg text-xs font-bold transition-all",
                      active && "scale-105 bg-white text-primary shadow-md ring-2 ring-white/80",
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
        </div>
      </aside>

      {/* Right: soft stage (not a floating white card) */}
      <section className="flex min-h-0 min-w-0 flex-col bg-[#F4F8F9]">
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-turquoise" />
            {isMcqExam ? "Pick one answer" : "Type your answer"}
          </div>

          <h2 className="max-w-3xl text-lg font-bold leading-snug text-gray-900 sm:text-xl lg:text-2xl">
            {displayQuestionStem(currentQuestion, isMcqExam)}
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
            {isMcqExam ? (
              (currentQuestion?.options?.length ?? 0) >= 2 ? (
                <div className="flex flex-col gap-2.5">
                  {(currentQuestion?.options ?? []).map((opt, optIdx) => {
                    const selected =
                      (answers[currentQuestion?.id] || "").trim() === opt.trim();
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={exam?.acceptingResponses === false}
                        onClick={() => {
                          if (!currentQuestion) return;
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: opt,
                          }));
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-all",
                          selected
                            ? "border-primary bg-white shadow-lg ring-2 ring-primary/30"
                            : "border-transparent bg-white/90 hover:bg-white hover:shadow-md"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                            selected
                              ? "bg-accent-brand text-white"
                              : "bg-muted text-gray-600"
                          )}
                        >
                          {OPTION_LETTERS[optIdx] ?? "?"}
                        </span>
                        <span className="text-sm font-medium leading-snug text-gray-800 sm:text-base">
                          {opt}
                        </span>
                        {selected && (
                          <Check className="ml-auto h-5 w-5 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This question has no answer choices. Ask your instructor to fix the exam.
                </p>
              )
            ) : (
              <>
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
                {(answers[currentQuestion?.id] || "").trim() !== "" && (
                  <Badge className="mt-2 rounded-full border-green-200 bg-green-50 text-green-800">
                    Answer saved for this question
                  </Badge>
                )}
              </>
            )}
            {isMcqExam && (answers[currentQuestion?.id] || "").trim() !== "" && (
              <Badge className="mt-2 rounded-full border-green-200 bg-green-50 text-green-800">
                Answer selected
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
            onClick={() => setIsExitDialogOpen(true)}
          >
            <LogOut className="h-3 w-3" />
            Exit
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col p-2 sm:p-3 md:p-4">
        {arena}
      </main>

      {dialogs}
    </div>
  );
}
