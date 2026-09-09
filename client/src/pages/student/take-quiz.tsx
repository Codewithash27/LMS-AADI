import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QuizComponent, {
  type QuizProgressSnapshot,
} from "@/components/courses/quiz-component";
import {
  clearQuizDraft,
  loadQuizDraft,
  saveQuizDraft,
  type QuizDraft,
} from "@/lib/quiz-draft";
import {
  getQuizAttempts,
  recordQuizScore,
} from "@/lib/quiz-attempts";
import {
  BookOpen,
  Clock,
  Loader2,
  LogOut,
  Play,
  RotateCcw,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Lesson = {
  id: number;
  title: string;
  contentType: string;
  duration?: number | null;
  quizData?: any;
  description?: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function StudentTakeQuiz() {
  const params = useParams<{ courseId: string; moduleId: string; lessonId: string }>();
  const courseId = parseInt(params.courseId || "0", 10);
  const moduleId = parseInt(params.moduleId || "0", 10);
  const lessonId = parseInt(params.lessonId || "0", 10);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [started, setStarted] = useState(false);
  const [forceSubmitSignal, setForceSubmitSignal] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [attemptsCompleted, setAttemptsCompleted] = useState(0);
  const [attemptSession, setAttemptSession] = useState(0);
  const [justSubmittedAttempt, setJustSubmittedAttempt] = useState(0);

  const latestProgress = useRef<QuizProgressSnapshot | null>(null);

  const { data: lessons = [], isLoading: loadingLessons } = useQuery<Lesson[]>({
    queryKey: [`/api/modules/${moduleId}/lessons`],
    enabled: !!moduleId,
  });

  const { data: course } = useQuery<{ title?: string }>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

  const lesson = useMemo(
    () => (lessons as Lesson[]).find((l) => l.id === lessonId),
    [lessons, lessonId]
  );

  const questionCount = useMemo(() => {
    if (!lesson?.quizData) return 0;
    const data =
      typeof lesson.quizData === "string"
        ? JSON.parse(lesson.quizData)
        : lesson.quizData;
    return data?.questions?.length || 0;
  }, [lesson]);

  const fullTimeLimitSeconds = useMemo(() => {
    const minutes = lesson?.duration && lesson.duration > 0 ? lesson.duration : 15;
    return minutes * 60;
  }, [lesson]);

  // Load draft + attempt count once ids are ready
  useEffect(() => {
    if (!courseId || !moduleId || !lessonId) return;
    const existing = loadQuizDraft(courseId, moduleId, lessonId);
    setDraft(existing);
    if (existing) {
      setViolations(existing.violations || 0);
    }
    setAttemptsCompleted(getQuizAttempts(courseId, moduleId, lessonId));
    setDraftChecked(true);
  }, [courseId, moduleId, lessonId]);

  /** Current run number: completed + 1 (show label only when ≥ 2) */
  const currentAttemptNumber = attemptsCompleted + 1;
  const activeTimeLimit = draft?.timeLeftSeconds ?? fullTimeLimitSeconds;

  const progressMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/lesson-progress", {
        lessonId,
        moduleId,
        courseId,
        completed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/course-progress/${courseId}`] });
    },
  });

  const persistProgress = useCallback(
    (snapshot: QuizProgressSnapshot, violationCount = violations) => {
      latestProgress.current = snapshot;
      if (snapshot.timeLeftSeconds <= 0) return;
      saveQuizDraft(courseId, moduleId, lessonId, {
        selectedOptions: snapshot.selectedOptions,
        currentQuestionIndex: snapshot.currentQuestionIndex,
        timeLeftSeconds: snapshot.timeLeftSeconds,
        violations: violationCount,
      });
      setDraft({
        ...snapshot,
        violations: violationCount,
        savedAt: Date.now(),
      });
    },
    [courseId, moduleId, lessonId, violations]
  );

  const markTaken = useCallback(
    (score: number, total: number) => {
      if (submitted) return;
      setSubmitted(true);
      clearQuizDraft(courseId, moduleId, lessonId);
      setDraft(null);
      const recorded = recordQuizScore({
        courseId,
        moduleId,
        lessonId,
        lessonTitle: lesson?.title || "MCQ Test",
        courseTitle: course?.title || "Course",
        score,
        total,
      });
      const attemptNum = recorded.attemptNumber;
      setAttemptsCompleted(attemptNum);
      setJustSubmittedAttempt(attemptNum);
      progressMutation.mutate(undefined, {
        onSuccess: () => {
          const pct = recorded.percent;
          toast({
            title: "Test submitted",
            description:
              attemptNum === 1
                ? `You scored ${score}/${total} (${pct}%).`
                : `Attempt ${attemptNum}: you scored ${score}/${total} (${pct}%).`,
          });
        },
        onError: () => {
          toast({
            title: "Could not save progress",
            description: "Your answers were scored locally, but progress may not have saved.",
            variant: "destructive",
          });
        },
      });
    },
    [
      submitted,
      progressMutation,
      toast,
      courseId,
      moduleId,
      lessonId,
      lesson?.title,
      course?.title,
    ]
  );

  const handleRetake = useCallback(() => {
    clearQuizDraft(courseId, moduleId, lessonId);
    setDraft(null);
    setViolations(0);
    setSubmitted(false);
    setForceSubmitSignal(0);
    setJustSubmittedAttempt(0);
    latestProgress.current = null;
    setAttemptSession((s) => s + 1);
    setStarted(true);
  }, [courseId, moduleId, lessonId]);

  const leaveTest = useCallback(() => {
    const snap = latestProgress.current;
    if (snap && snap.timeLeftSeconds > 0) {
      persistProgress(snap, violations);
      toast({
        title: "Progress saved",
        description: `You can continue later with ${formatTime(snap.timeLeftSeconds)} remaining and your answers restored.`,
      });
    }
    const courseUrl = `/student/my-courses/${courseId}`;
    // Prefer navigating back in this tab; also try close if opened via window.open
    setLocation(courseUrl);
    window.setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, 100);
  }, [persistProgress, violations, toast, courseId, setLocation]);

  // Anti-cheat while test is in progress
  useEffect(() => {
    if (!started || submitted) return;

    const blockEvent = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const onVisibility = () => {
      if (!document.hidden) return;
      setViolations((v) => {
        const next = v + 1;
        if (latestProgress.current) {
          persistProgress(latestProgress.current, next);
        }
        if (next === 1) {
          queueMicrotask(() => {
            toast({
              title: "Warning: tab switch detected",
              description: "Leaving this tab again will auto-submit your test.",
              variant: "destructive",
            });
          });
        } else if (next === 2) {
          queueMicrotask(() => {
            toast({
              title: "Test auto-submitted",
              description: "You left the tab again. Your answers have been submitted.",
              variant: "destructive",
            });
            setForceSubmitSignal((s) => s + 1);
          });
        }
        return next;
      });
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latestProgress.current) {
        persistProgress(latestProgress.current, violations);
      }
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
  }, [started, submitted, toast, persistProgress, violations]);

  if (loadingLessons || !draftChecked) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
      </div>
    );
  }

  if (!lesson || lesson.contentType !== "quiz") {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full border-border">
          <CardHeader>
            <CardTitle>Quiz not found</CardTitle>
            <CardDescription>
              This MCQ assignment could not be loaded. Go back to the course and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/student/my-courses/${courseId}`}>
              <Button className="w-full">Back to course</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasResume = !!draft && draft.timeLeftSeconds > 0;
  const isRetake = !hasResume && attemptsCompleted > 0;
  const startLabel = hasResume
    ? "Continue Test"
    : isRetake
      ? "Retake Test"
      : "Start Test";
  const previewSeconds = hasResume ? draft!.timeLeftSeconds : fullTimeLimitSeconds;
  const previewPct = Math.min(
    100,
    Math.max(0, (previewSeconds / Math.max(1, fullTimeLimitSeconds)) * 100)
  );
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - previewPct / 100);
  const savedAnswers = hasResume
    ? draft!.selectedOptions.filter((o: number) => o !== -1).length
    : 0;

  return (
    <div
      className={
        started && !submitted
          ? "h-[100dvh] select-none flex flex-col overflow-hidden bg-[#1a3a4a]"
          : "h-[100dvh] flex flex-col overflow-hidden bg-[#1a3a4a]"
      }
    >
      <header className="shrink-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-black/20 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-brand">
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Edu Transform</p>
            <p className="truncate text-[10px] text-white/60">
              {started ? "Secure exam mode" : lesson.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {started && !submitted && violations > 0 && (
            <span className="hidden sm:inline text-[10px] text-amber-200 bg-amber-500/20 border border-amber-400/30 rounded px-2 py-0.5">
              {violations} warning{violations > 1 ? "s" : ""}
            </span>
          )}
          {started && !submitted ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white px-2 text-xs"
              onClick={() => setExitOpen(true)}
            >
              <LogOut className="h-3 w-3" />
              Exit
            </Button>
          ) : (
            <Link href={`/student/my-courses/${courseId}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white px-2 text-xs"
              >
                Back
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full min-h-0 p-2 sm:p-3 md:p-4 flex flex-col">
        {!started ? (
          <div className="flex-1 min-h-0 w-full grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] overflow-hidden rounded-2xl border border-white/40 shadow-xl">
            {/* Left: same gradient arena panel */}
            <aside className="relative overflow-hidden text-white bg-gradient-to-br from-primary via-primary to-brand-blue px-5 py-6 flex flex-col gap-5">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <p className="text-[11px] font-medium text-white/80">
                  {hasResume
                    ? "Resume attempt"
                    : isRetake
                      ? "Ready to retake"
                      : "Ready to begin"}
                </p>
                <p className="text-xl font-bold tracking-tight mt-1 leading-snug">
                  {lesson.title}
                </p>
                {currentAttemptNumber >= 2 && (
                  <p className="mt-2 inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
                    Attempt {currentAttemptNumber}
                  </p>
                )}
              </div>

              <div className="relative z-10 flex md:flex-col items-center md:items-stretch gap-4">
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
                      stroke="#fff"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Clock className="h-3.5 w-3.5 mb-0.5 text-white/80" />
                    <span className="text-xl font-bold tabular-nums leading-none">
                      {formatTime(previewSeconds)}
                    </span>
                    <span className="text-[9px] text-white/70 mt-0.5">
                      {hasResume ? "left" : "limit"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-1 gap-2 text-sm">
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2">
                    <p className="text-[10px] text-white/70 uppercase tracking-wide">Questions</p>
                    <p className="font-bold text-lg leading-tight">{questionCount}</p>
                  </div>
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2">
                    <p className="text-[10px] text-white/70 uppercase tracking-wide">Saved</p>
                    <p className="font-bold text-lg leading-tight">
                      {savedAnswers}
                      <span className="text-white/60 text-sm font-medium">
                        /{questionCount}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2 md:col-span-1 col-span-2">
                    <p className="text-[10px] text-white/70 uppercase tracking-wide">Status</p>
                    <p className="font-bold text-base leading-tight">
                      {hasResume
                        ? "In progress"
                        : isRetake
                          ? `Attempted (${attemptsCompleted})`
                          : "Not started"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right: rules + CTA */}
            <section className="bg-[#F4F8F9] flex flex-col min-h-0 min-w-0">
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground mb-4 shadow-sm">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      hasResume
                        ? "bg-amber-500 animate-pulse"
                        : isRetake
                          ? "bg-brand-blue"
                          : "bg-brand-turquoise"
                    )}
                  />
                  {hasResume
                    ? "Saved attempt ready"
                    : isRetake
                      ? "Retake available"
                      : "Secure MCQ assignment"}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug max-w-xl">
                  {hasResume
                    ? "Pick up where you left off"
                    : isRetake
                      ? "Ready for another attempt"
                      : "Before you start the test"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  {hasResume
                    ? "Your answers and remaining time are restored. Continue when you're ready."
                    : isRetake
                      ? `You've completed ${attemptsCompleted} attempt${attemptsCompleted === 1 ? "" : "s"}. Starting again resets the timer and clears answers.`
                      : "The timer starts when you click Start Test. You can exit anytime to save progress."}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                  {[
                    "Copy, paste, and right-click are disabled",
                    "Leaving the tab twice auto-submits",
                    "Exit saves answers and remaining time",
                    "You can retake after submitting",
                  ].map((rule) => (
                    <div
                      key={rule}
                      className="flex items-start gap-2.5 rounded-2xl bg-white/90 border border-border px-3.5 py-3 shadow-sm"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-brand text-white">
                        <Shield className="h-3 w-3" />
                      </span>
                      <p className="text-sm text-gray-700 leading-snug">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-border bg-white/70 backdrop-blur-sm">
                <Link href={`/student/my-courses/${courseId}`} className="sm:w-auto w-full">
                  <Button
                    variant="outline"
                    className="h-11 w-full sm:w-auto px-5 rounded-xl border-border"
                  >
                    Back to course
                  </Button>
                </Link>
                <Button
                  className="h-11 px-6 rounded-xl bg-accent-brand text-white hover:opacity-90 shadow-md w-full sm:w-auto"
                  onClick={() => setStarted(true)}
                  disabled={questionCount === 0}
                >
                  {isRetake && !hasResume ? (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {startLabel}
                  {isRetake && !hasResume && currentAttemptNumber >= 2 && (
                    <span className="ml-1.5 text-white/80 text-xs font-normal">
                      ({currentAttemptNumber})
                    </span>
                  )}
                </Button>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full flex flex-col">
            <QuizComponent
              key={attemptSession}
              quizData={lesson.quizData}
              mode="secure"
              title={lesson.title}
              timeLimitSeconds={
                submitted ? fullTimeLimitSeconds : activeTimeLimit
              }
              allowRetry={false}
              forceSubmitSignal={forceSubmitSignal}
              initialSelectedOptions={
                submitted ? undefined : draft?.selectedOptions
              }
              initialQuestionIndex={
                submitted ? 0 : draft?.currentQuestionIndex ?? 0
              }
              onProgressChange={persistProgress}
              onComplete={markTaken}
              attemptNumber={
                justSubmittedAttempt > 0
                  ? justSubmittedAttempt
                  : currentAttemptNumber
              }
              onRetake={handleRetake}
            />
          </div>
        )}
      </main>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit the test?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Your answers and remaining time will be saved. When you return, you can
                continue from where you left off with the same timer.
              </span>
              {latestProgress.current && (
                <span className="block font-medium text-foreground">
                  Time left: {formatTime(latestProgress.current.timeLeftSeconds)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in test</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={leaveTest}
            >
              Yes, exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
