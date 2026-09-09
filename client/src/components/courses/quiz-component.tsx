import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Check, X, Award, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type QuizQuestion = {
  id: number;
  text: string;
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
  }[];
};

type QuizData = {
  questions: QuizQuestion[];
};

export type QuizProgressSnapshot = {
  selectedOptions: number[];
  currentQuestionIndex: number;
  timeLeftSeconds: number;
};

interface QuizComponentProps {
  quizData: QuizData | string;
  onComplete?: (score: number, totalQuestions: number) => void;
  mode?: "inline" | "secure";
  timeLimitSeconds?: number;
  allowRetry?: boolean;
  title?: string;
  forceSubmitSignal?: number;
  initialSelectedOptions?: number[];
  initialQuestionIndex?: number;
  onProgressChange?: (snapshot: QuizProgressSnapshot) => void;
  /** Current attempt number (1 = first). Shown from 2 onward. */
  attemptNumber?: number;
  /** Called when student chooses Retake after submit */
  onRetake?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function QuizComponent({
  quizData,
  onComplete,
  mode = "inline",
  timeLimitSeconds,
  allowRetry = true,
  title,
  forceSubmitSignal = 0,
  initialSelectedOptions,
  initialQuestionIndex = 0,
  onProgressChange,
  attemptNumber = 1,
  onRetake,
}: QuizComponentProps) {
  const parsedQuizData: QuizData =
    typeof quizData === "string" ? JSON.parse(quizData) : (quizData as QuizData);

  const questions = parsedQuizData.questions || [];
  const questionCount = questions.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() =>
    Math.min(Math.max(0, initialQuestionIndex), Math.max(0, questionCount - 1))
  );
  const [selectedOptions, setSelectedOptions] = useState<number[]>(() => {
    if (initialSelectedOptions && initialSelectedOptions.length === questionCount) {
      return [...initialSelectedOptions];
    }
    return new Array(questionCount).fill(-1);
  });
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() =>
    timeLimitSeconds && timeLimitSeconds > 0 ? timeLimitSeconds : 0
  );

  const completedRef = useRef(false);
  const selectedOptionsRef = useRef(selectedOptions);
  const questionIndexRef = useRef(currentQuestionIndex);
  const timeLeftRef = useRef(timeLeft);
  const lastForceSignal = useRef(0);
  const initializedRef = useRef(false);

  const isSecure = mode === "secure";
  const currentQuestion = questions[currentQuestionIndex];
  const progress =
    questionCount > 0 ? ((currentQuestionIndex + 1) / questionCount) * 100 : 0;

  useEffect(() => {
    selectedOptionsRef.current = selectedOptions;
  }, [selectedOptions]);

  useEffect(() => {
    questionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Sync initial props once when secure resume loads
  useEffect(() => {
    if (initializedRef.current) return;
    if (questionCount === 0) return;
    initializedRef.current = true;
    if (initialSelectedOptions && initialSelectedOptions.length === questionCount) {
      setSelectedOptions([...initialSelectedOptions]);
    } else {
      setSelectedOptions(new Array(questionCount).fill(-1));
    }
    setCurrentQuestionIndex(
      Math.min(Math.max(0, initialQuestionIndex), Math.max(0, questionCount - 1))
    );
    if (timeLimitSeconds && timeLimitSeconds > 0) {
      setTimeLeft(timeLimitSeconds);
    }
  }, [questionCount, initialSelectedOptions, initialQuestionIndex, timeLimitSeconds]);

  const emitProgress = useCallback(() => {
    onProgressChange?.({
      selectedOptions: [...selectedOptionsRef.current],
      currentQuestionIndex: questionIndexRef.current,
      timeLeftSeconds: timeLeftRef.current,
    });
  }, [onProgressChange]);

  const finishQuiz = useCallback(
    (options: number[]) => {
      if (completedRef.current) return;
      completedRef.current = true;

      let correctAnswers = 0;
      questions.forEach((question, index) => {
        const selectedOptionId = options[index];
        const selectedOption = question.options.find((opt) => opt.id === selectedOptionId);
        if (selectedOption?.isCorrect) {
          correctAnswers++;
        }
      });

      setScore(correctAnswers);
      setShowResults(true);
      onComplete?.(correctAnswers, questions.length);
    },
    [questions, onComplete]
  );

  // Timer countdown (secure mode)
  useEffect(() => {
    if (!isSecure || !timeLimitSeconds || showResults || completedRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishQuiz(selectedOptionsRef.current);
          return 0;
        }
        const next = prev - 1;
        timeLeftRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSecure, timeLimitSeconds, showResults, finishQuiz]);

  // Autosave progress every 5s while in secure mode
  useEffect(() => {
    if (!isSecure || showResults || !onProgressChange) return;
    emitProgress();
    const id = setInterval(emitProgress, 5000);
    return () => clearInterval(id);
  }, [isSecure, showResults, onProgressChange, emitProgress, selectedOptions, currentQuestionIndex]);

  // External force submit
  useEffect(() => {
    if (
      forceSubmitSignal > 0 &&
      forceSubmitSignal !== lastForceSignal.current &&
      !showResults
    ) {
      lastForceSignal.current = forceSubmitSignal;
      finishQuiz(selectedOptionsRef.current);
    }
  }, [forceSubmitSignal, showResults, finishQuiz]);

  const handleOptionSelect = (optionId: number) => {
    if (showResults || completedRef.current) return;
    const next = [...selectedOptions];
    next[currentQuestionIndex] = optionId;
    setSelectedOptions(next);
    selectedOptionsRef.current = next;
    emitProgress();
  };

  const isOptionSelected = (optionId: number) =>
    selectedOptions[currentQuestionIndex] === optionId;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      questionIndexRef.current = nextIdx;
      emitProgress();
    } else {
      finishQuiz(selectedOptions);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const nextIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(nextIdx);
      questionIndexRef.current = nextIdx;
      emitProgress();
    }
  };

  const hasSelectedOption = selectedOptions[currentQuestionIndex] !== -1;

  const getQuestionResult = (questionIndex: number) => {
    const question = questions[questionIndex];
    const selectedOptionId = selectedOptions[questionIndex];
    const selectedOption = question.options.find((opt) => opt.id === selectedOptionId);
    return selectedOption?.isCorrect;
  };

  const handleRetry = () => {
    if (!allowRetry) return;
    completedRef.current = false;
    setCurrentQuestionIndex(0);
    setSelectedOptions(new Array(questions.length).fill(-1));
    setShowResults(false);
    setScore(0);
    if (timeLimitSeconds) setTimeLeft(timeLimitSeconds);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-xl border border-warm-border bg-white p-8 text-center text-sm text-muted-foreground">
        No questions available for this quiz.
      </div>
    );
  }

  const timerUrgent = isSecure && timeLeft > 0 && timeLeft <= 60;
  const answeredCount = selectedOptions.filter((o) => o !== -1).length;

  // ——— Secure test: split “arena” layout ———
  if (isSecure && !showResults) {
    const totalSec = timeLimitSeconds && timeLimitSeconds > 0 ? timeLimitSeconds : 1;
    const timePct = Math.min(100, Math.max(0, (timeLeft / totalSec) * 100));
    const circumference = 2 * Math.PI * 42;
    const dashOffset = circumference * (1 - timePct / 100);

    return (
      <div className="select-none w-full h-full grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] overflow-hidden rounded-2xl border border-white/40 shadow-xl">
        {/* Immersive side / top panel */}
        <aside
          className={cn(
            "relative overflow-hidden text-white",
            "bg-gradient-to-br from-primary via-[#14B8A6] to-brand-blue",
            "px-4 py-4 md:py-6 flex flex-col gap-4 md:gap-6"
          )}
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <p className="text-[11px] font-medium text-white/80 truncate">{title || "MCQ Test"}</p>
            <p className="text-lg font-bold tracking-tight mt-0.5">
              Question {currentQuestionIndex + 1}
              <span className="text-white/70 font-medium text-sm"> / {questions.length}</span>
            </p>
            {attemptNumber >= 2 && (
              <p className="mt-1 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                Attempt {attemptNumber}
              </p>
            )}
          </div>

          {/* Circular timer */}
          {timeLimitSeconds != null && timeLimitSeconds > 0 && (
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
                    stroke={timerUrgent ? "#fecaca" : "#fff"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-[stroke-dashoffset] duration-1000 linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Clock className={cn("h-3.5 w-3.5 mb-0.5", timerUrgent ? "text-red-100" : "text-white/80")} />
                  <span className={cn("text-xl font-bold tabular-nums leading-none", timerUrgent && "text-red-100")}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-1 gap-2 text-sm">
                <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2">
                  <p className="text-[10px] text-white/70 uppercase tracking-wide">Answered</p>
                  <p className="font-bold text-lg leading-tight">
                    {answeredCount}
                    <span className="text-white/60 text-sm font-medium">/{questions.length}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2">
                  <p className="text-[10px] text-white/70 uppercase tracking-wide">Progress</p>
                  <p className="font-bold text-lg leading-tight">{Math.round(progress)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Question jump on side panel (desktop) / wrap under timer (mobile) */}
          <div className="relative z-10 mt-auto">
            <p className="text-[10px] uppercase tracking-wider text-white/70 mb-2 font-semibold">
              Jump to
            </p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((_, idx) => {
                const answered = selectedOptions[idx] !== -1;
                const active = idx === currentQuestionIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      questionIndexRef.current = idx;
                      emitProgress();
                    }}
                    className={cn(
                      "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                      active && "bg-white text-primary shadow-md scale-105",
                      !active && answered && "bg-white/25 text-white ring-1 ring-white/40",
                      !active && !answered && "bg-black/15 text-white/80 hover:bg-white/20"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Question stage */}
        <section className="bg-[#F4F8F9] flex flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-warm-border px-3 py-1 text-[11px] font-medium text-muted-foreground mb-4 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-turquoise animate-pulse" />
              Pick one answer
            </div>

            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug text-gray-900 max-w-3xl">
              {currentQuestion.text}
            </h2>

            <RadioGroup
              value={selectedOptions[currentQuestionIndex]?.toString()}
              className="mt-5 sm:mt-6 flex flex-col gap-2.5 max-w-3xl"
            >
              {currentQuestion.options.map((option, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex);
                const selected = isOptionSelected(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOptionSelect(option.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-all",
                      selected
                        ? "border-transparent bg-white shadow-lg ring-2 ring-[#0F766E]/60"
                        : "border-transparent bg-white/80 hover:bg-white hover:shadow-md"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors",
                        selected
                          ? "bg-accent-brand text-white shadow-sm"
                          : "bg-cream-muted text-gray-600 group-hover:bg-brand-turquoise/20"
                      )}
                    >
                      {letter}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-gray-800 leading-snug">
                      {option.text}
                    </span>
                    {selected && (
                      <Check className="ml-auto h-5 w-5 text-brand-turquoise shrink-0" />
                    )}
                    <RadioGroupItem
                      value={option.id.toString()}
                      id={`secure-opt-${option.id}`}
                      checked={selected}
                      className="sr-only"
                    />
                  </button>
                );
              })}
            </RadioGroup>
          </div>

          <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 border-t border-warm-border bg-white/70 backdrop-blur-sm">
            <Button
              variant="outline"
              className="h-10 px-5 rounded-xl border-warm-border"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              className="h-10 px-6 rounded-xl bg-accent-brand text-white hover:opacity-90 shadow-md"
              onClick={handleNextQuestion}
              disabled={!hasSelectedOption}
            >
              {currentQuestionIndex === questions.length - 1 ? "Submit Test" : "Next question"}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // ——— Secure results ———
  if (isSecure && showResults) {
    return (
      <div className="select-none w-full max-w-2xl mx-auto rounded-xl border border-warm-border bg-white overflow-hidden shadow-xl">
        <div className="px-4 sm:px-6 py-6 text-center border-b border-warm-border">
          <Award className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Test Submitted</h2>
          {attemptNumber >= 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              {attemptNumber === 1 ? "First attempt" : `Attempt ${attemptNumber}`}
            </p>
          )}
          <p className="text-2xl font-bold mt-2">
            {score} / {questions.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {Math.round((score / questions.length) * 100)}% Score
          </p>
          <Progress value={(score / questions.length) * 100} className="h-2 mt-4" />
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-2 max-h-[40vh] overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2">Review</h3>
          {questions.map((question, index) => {
            const isCorrect = getQuestionResult(index);
            return (
              <div
                key={question.id}
                className={cn(
                  "p-2.5 rounded-lg border text-sm",
                  isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{question.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your answer:{" "}
                      {question.options.find((o) => o.id === selectedOptions[index])?.text ||
                        "Not answered"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center px-4 py-4 border-t border-warm-border bg-cream-subtle/40">
          {onRetake && (
            <Button
              className="bg-accent-brand text-white hover:opacity-90"
              onClick={onRetake}
            >
              Retake Test
              <span className="ml-1 text-white/80 text-xs font-normal">
                (Attempt {attemptNumber + 1})
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              try {
                window.close();
              } catch {
                /* ignore */
              }
            }}
          >
            Close tab
          </Button>
        </div>
      </div>
    );
  }

  // ——— Inline (non-secure) layout ———
  return (
    <Card className="w-full border-warm-border bg-white/95 shadow-lg">
      {!showResults ? (
        <>
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <CardTitle className="mt-4 text-lg">{currentQuestion.text}</CardTitle>
          </CardHeader>

          <CardContent>
            <RadioGroup
              value={selectedOptions[currentQuestionIndex]?.toString()}
              className="space-y-2"
            >
              {currentQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                    isOptionSelected(option.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <RadioGroupItem
                    value={option.id.toString()}
                    id={`option-${option.id}`}
                    checked={isOptionSelected(option.id)}
                  />
                  <Label htmlFor={`option-${option.id}`} className="flex-grow cursor-pointer text-sm">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button size="sm" onClick={handleNextQuestion} disabled={!hasSelectedOption}>
              {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next"}
            </Button>
          </CardFooter>
        </>
      ) : (
        <>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Quiz Results</CardTitle>
            <div className="mt-2 flex justify-center">
              <Award className="h-10 w-10 text-yellow-500" />
            </div>
            <div className="mt-2 text-center">
              <p className="text-2xl font-bold">
                {score} / {questions.length}
              </p>
              <p className="text-muted-foreground text-sm">
                {Math.round((score / questions.length) * 100)}% Score
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={(score / questions.length) * 100} className="h-2 mb-4" />
            <div className="space-y-2">
              {questions.map((question, index) => {
                const isCorrect = getQuestionResult(index);
                return (
                  <div
                    key={question.id}
                    className={cn(
                      "p-2.5 rounded-lg border text-sm",
                      isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{question.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Your answer:{" "}
                          {question.options.find((o) => o.id === selectedOptions[index])?.text ||
                            "Not answered"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          {allowRetry && (
            <CardFooter className="flex justify-center border-t pt-4">
              <Button size="sm" onClick={handleRetry}>
                Retry Quiz
              </Button>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
