import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Clock, LogOut, AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();

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
        await apiRequest("PUT", `/api/exam-attempts/${attemptId}`, {
          completedAt: new Date().toISOString(),
          answers: JSON.stringify(answersRef.current),
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
              ? "You left the tab again. Your answers have been submitted."
              : "Your exam has been submitted. You cannot retake it.",
          variant: reason === "tab-switch" ? "destructive" : "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts/user"] });
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
    [exam, toast, closeExam]
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
            Type your answer
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
