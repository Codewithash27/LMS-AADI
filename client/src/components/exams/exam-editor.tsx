import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Trash,
  Plus,
  ClipboardList,
  Upload,
  Shuffle,
  FileText,
  Clock,
  ImageIcon,
  X,
  PenLine,
  ListChecks,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  OPTION_LETTERS,
  normalizeExamType,
  validateMcqQuestionClient,
  normalizeMcqOptions,
  inferMcqCorrectOption,
  sanitizeMcqQuestionStem,
} from "@/lib/exam-mcq";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { examFormSchema, type ExamFormValues } from "@/lib/form-schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  ExamStepRail,
  examStepOrder,
  EXAM_STEP_FIELDS,
  EXAM_STEP_HEADINGS,
  type ExamEditorStep,
} from "@/components/exams/ExamStepRail";

const EXAM_FORM_ID = "exam-editor-form";

type QuestionType = {
  id: number;
  text: string;
  order: number;
  modelAnswer?: string | null;
  imageUrl?: string | null;
  options?: string[];
  correctOption?: number | null;
};

type ParsedPdfQuestion = {
  text: string;
  modelAnswer?: string | null;
  imageUrl?: string | null;
  options?: string[];
  correctOption?: number;
};

const DEFAULT_MCQ_OPTIONS = ["", "", "", ""];

function ensureMcqOptions(q: QuestionType): QuestionType {
  const opts = [...(q.options?.length ? q.options : DEFAULT_MCQ_OPTIONS)];
  while (opts.length < 4) opts.push("");
  return { ...q, options: opts.slice(0, 6), correctOption: q.correctOption ?? null };
}

function buildQuestionsFromPool(
  pool: ParsedPdfQuestion[],
  count: number,
  isMcq: boolean
): QuestionType[] {
  const picked = shufflePick(pool, count);
  return picked.map((q, index) => {
    const opts = q.options?.slice(0, 6);
    const base: QuestionType = {
      id: index + 1,
      text: isMcq ? sanitizeMcqQuestionStem(q.text, opts) : q.text,
      order: index,
      modelAnswer: isMcq ? null : q.modelAnswer ?? null,
      imageUrl: q.imageUrl ?? null,
      options: opts,
      correctOption: q.correctOption ?? null,
    };
    return isMcq ? ensureMcqOptions(base) : base;
  });
}

type ExamEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: { id: number; title: string }[];
  batches?: {
    id: number;
    name: string;
    courseId: number;
    batchCode?: string;
  }[];
  exam?: {
    id: number;
    title?: string;
    description?: string;
    courseId?: number;
    batchId?: number | null;
    duration?: number;
    acceptingResponses?: boolean;
    examType?: string;
  };
};

function shufflePick<T>(items: T[], count: number): T[] {
  const n = Math.max(0, Math.min(count, items.length));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function ExamEditor({
  open,
  onOpenChange,
  courses,
  batches = [],
  exam,
}: ExamEditorProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [pdfPool, setPdfPool] = useState<ParsedPdfQuestion[]>([]);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [uploadingImageQuestionId, setUploadingImageQuestionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<ExamEditorStep>("basics");
  const [stepErrors, setStepErrors] = useState<Partial<Record<ExamEditorStep, boolean>>>({});
  const isEditing = !!exam?.id;
  const editorMode = isEditing ? "edit" : "create";
  const steps = examStepOrder(editorMode);
  const stepIndex = Math.max(0, steps.indexOf(step)) + 1;
  const totalSteps = steps.length;
  const isFirstStep = step === steps[0];
  const isLastStep = step === steps[steps.length - 1];

  const { data: fetchedExam, isLoading: isLoadingExam } = useQuery({
    queryKey: [`/api/exams/${exam?.id}`],
    queryFn: async () => {
      if (!exam?.id) return null;
      const response = await apiRequest("GET", `/api/exams/${exam.id}`);
      return await response.json();
    },
    enabled: !!exam?.id && open,
  });

  const { data: examQuestions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: [`/api/exams/${exam?.id}/questions`],
    queryFn: async () => {
      if (!exam?.id) return [];
      const response = await apiRequest("GET", `/api/exams/${exam.id}/questions`);
      return await response.json();
    },
    enabled: !!exam?.id && open,
  });

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      examType: "theory" as const,
      title: "",
      description: "",
      courseId: "",
      batchId: "none",
      duration: 60,
      acceptingResponses: true,
      questionSource: "manual",
      questionCount: 10,
    },
  });

  const selectedCourseId = form.watch("courseId");
  const examType = form.watch("examType");
  const questionSource = form.watch("questionSource");
  const questionCount = form.watch("questionCount");

  const courseBatches = useMemo(
    () => batches, // Show all batches, validation will happen on backend
    [batches]
  );

  useEffect(() => {
    if (fetchedExam && exam?.id) {
      form.reset({
        examType: normalizeExamType(fetchedExam.examType),
        title: fetchedExam.title,
        description: fetchedExam.description,
        courseId: String(fetchedExam.courseId),
        batchId: fetchedExam.batchId ? String(fetchedExam.batchId) : "none",
        duration: fetchedExam.duration ?? 60,
        acceptingResponses: fetchedExam.acceptingResponses !== false,
        questionSource: "manual",
        questionCount: 10,
      });
    } else if (!exam?.id && open) {
      form.reset({
        examType: "theory",
        title: "",
        description: "",
        courseId: "",
        batchId: "none",
        duration: 60,
        acceptingResponses: true,
        questionSource: "manual",
        questionCount: 10,
      });
      setPdfPool([]);
      setPdfFileName(null);
      setQuestions([]);
    }
  }, [fetchedExam, exam?.id, open, form]);

  useEffect(() => {
    if (open) {
      setStep("basics");
      setStepErrors({});
    }
  }, [open, exam?.id]);

  useEffect(() => {
    if (!exam?.id || !examQuestions) return;
    const type = normalizeExamType(fetchedExam?.examType);
    setQuestions(
      (examQuestions as QuestionType[]).map((q) =>
        type === "mcq" ? ensureMcqOptions(q) : q
      )
    );
  }, [examQuestions, exam?.id, fetchedExam?.examType]);

  // Note: Batch validation is now done on the backend
  // Users can select any batch, and the server will validate if the course is assigned to that batch

  const applyRandomFromPoolWith = (pool: ParsedPdfQuestion[], count: number) => {
    const isMcq = form.getValues("examType") === "mcq";
    setQuestions(buildQuestionsFromPool(pool, count, isMcq));
  };

  const applyRandomFromPool = (count?: number) => {
    if (pdfPool.length === 0) {
      toast({
        title: "No document questions",
        description: "Upload a questions PDF or Word (.docx) document first.",
        variant: "destructive",
      });
      return;
    }
    const n = count ?? questionCount ?? pdfPool.length;
    applyRandomFromPoolWith(pdfPool, n);
    toast({
      title: "Questions selected",
      description: `Randomly picked ${Math.min(n, pdfPool.length)} of ${pdfPool.length} questions from the document.`,
    });
  };

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (
      !nameLower.endsWith(".pdf") &&
      !nameLower.endsWith(".docx") &&
      !nameLower.endsWith(".doc")
    ) {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF (.pdf) or Word (.docx) file.",
        variant: "destructive",
      });
      return;
    }

    setIsParsingPdf(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/exams/parse-questions-file", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to parse document");
      }

      const parsed: ParsedPdfQuestion[] = data.questions || [];
      setPdfPool(parsed);
      setPdfFileName(data.fileName || file.name);
      form.setValue("questionSource", "pdf");
      const defaultCount = Math.min(10, parsed.length) || parsed.length;
      form.setValue("questionCount", defaultCount);
      applyRandomFromPoolWith(parsed, defaultCount);

      const stats = data.parseStats as
        | { total: number; withOptions: number; withCorrect: number }
        | undefined;
      let desc = `Found ${parsed.length} questions. ${defaultCount} randomly selected for this exam.`;
      if (form.getValues("examType") === "mcq" && stats) {
        desc += ` Options detected for ${stats.withOptions}, correct answer for ${stats.withCorrect}.`;
        if (stats.withOptions === 0) {
          desc += " Tip: use A) B) C) D) lines and Answer: B.";
        }
      }
      toast({ title: "Document parsed", description: desc });
    } catch (error: any) {
      toast({
        title: "Document parse failed",
        description: error?.message || "Could not read questions from the document.",
        variant: "destructive",
      });
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleQuestionImageUpload = async (questionId: number, file: File | null) => {
    if (!file) return;
    setUploadingImageQuestionId(questionId);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/exams/upload-question-image", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload image");
      }
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, imageUrl: data.imageUrl } : q))
      );
      toast({
        title: "Image attached",
        description: "Question image uploaded successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingImageQuestionId(null);
    }
  };

  const removeQuestionImage = (questionId: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, imageUrl: null } : q))
    );
  };

  const onSubmit = async (data: ExamFormValues) => {
    let questionsToSave = questions;
    if (data.questionSource === "pdf" && pdfPool.length > 0) {
      const n = data.questionCount ?? pdfPool.length;
      questionsToSave = buildQuestionsFromPool(pdfPool, n, data.examType === "mcq");
      setQuestions(questionsToSave);
    }

    const emptyQuestions = questionsToSave.filter((q) => !q.text.trim() && !q.imageUrl);
    if (emptyQuestions.length > 0) {
      toast({
        title: "Incomplete questions",
        description: "Please fill in text or attach an image for all questions before saving.",
        variant: "destructive",
      });
      return;
    }

    if (questionsToSave.length === 0) {
      toast({
        title: "No questions",
        description: "Add questions manually or upload a PDF / Word document question bank.",
        variant: "destructive",
      });
      return;
    }

    if (data.examType === "mcq") {
      questionsToSave = questionsToSave.map((q) => ({
        ...q,
        correctOption: inferMcqCorrectOption(
          q.options ?? [],
          q.correctOption,
          q.modelAnswer
        ),
      }));

      for (let i = 0; i < questionsToSave.length; i++) {
        const err = validateMcqQuestionClient(
          questionsToSave[i].text,
          questionsToSave[i].options ?? [],
          questionsToSave[i].correctOption,
          i + 1
        );
        if (err) {
          toast({ title: "Cannot save MCQ exam", description: err, variant: "destructive" });
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        courseId: parseInt(data.courseId, 10),
        duration: Number(data.duration),
        batchId: data.batchId && data.batchId !== "none" ? parseInt(data.batchId, 10) : null,
        acceptingResponses: data.acceptingResponses,
        examType: data.examType,
      };

      let examId: number;

      if (exam?.id) {
        await apiRequest("PUT", `/api/exams/${exam.id}`, payload);
        examId = exam.id;
        toast({
          title: "Exam updated",
          description: "The exam has been updated successfully.",
        });
      } else {
        const response = await apiRequest("POST", "/api/exams", payload);
        const newExam = await response.json();
        examId = newExam.id;
        toast({
          title: "Exam created",
          description: "The exam has been created successfully.",
        });
      }

      let questionsSaved = true;
      if (examId) {
        try {
          await apiRequest("DELETE", `/api/exams/${examId}/questions`);

          for (let index = 0; index < questionsToSave.length; index++) {
            const question = questionsToSave[index];
            let text = question.text;
            let options: string[] | null = null;
            let correctOption: number | null = null;
            const modelAnswer = question.modelAnswer || null;

            if (data.examType === "mcq") {
              const normalized = normalizeMcqOptions(
                question.options ?? [],
                question.correctOption
              );
              options = normalized.options;
              correctOption = normalized.correctOption;
              text = sanitizeMcqQuestionStem(text, options);
            } else if (question.options && question.options.length >= 2) {
              const lines = question.options
                .map((opt, i) => `${OPTION_LETTERS[i]}) ${opt.trim()}`)
                .filter((l) => l.length > 3);
              if (lines.length) text = `${text.trim()}\n${lines.join("\n")}`.trim();
            }

            await apiRequest("POST", `/api/exams/${examId}/questions`, {
              text,
              order: index,
              examId,
              modelAnswer: data.examType === "mcq" ? null : modelAnswer,
              imageUrl: question.imageUrl || null,
              options,
              correctOption,
            });
          }
        } catch (err: unknown) {
          questionsSaved = false;
          console.error("Error saving questions:", err);
          const msg = err instanceof Error ? err.message : "Could not save questions.";
          toast({
            title: "Exam saved — questions failed",
            description: msg,
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}/questions`] });
      if (questionsSaved) {
        onOpenChange(false);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "There was an error saving the exam.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => {
      const newQuestionId =
        prev.length > 0 ? Math.max(...prev.map((q) => q.id)) + 1 : 1;
      const base: QuestionType = {
        id: newQuestionId,
        text: "",
        order: prev.length,
        modelAnswer: null,
        imageUrl: null,
      };
      return [...prev, examType === "mcq" ? ensureMcqOptions(base) : base];
    });
  };

  const updateQuestionOptions = (questionId: number, options: string[]) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, options } : q)));
  };

  const setCorrectOption = (questionId: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, correctOption: index } : q))
    );
  };

  const addOptionToQuestion = (questionId: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...(q.options ?? DEFAULT_MCQ_OPTIONS)];
        if (opts.length >= 6) return q;
        return { ...q, options: [...opts, ""] };
      })
    );
  };

  const removeOptionFromQuestion = (questionId: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...(q.options ?? DEFAULT_MCQ_OPTIONS)];
        if (opts.length <= 2) return q;
        opts.splice(optIndex, 1);
        let correctOption = q.correctOption;
        if (correctOption != null) {
          if (correctOption === optIndex) correctOption = null;
          else if (correctOption > optIndex) correctOption -= 1;
        }
        return { ...q, options: opts, correctOption };
      })
    );
  };

  const updateQuestionText = (questionId: number, text: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, text } : question
      )
    );
  };

  const removeQuestion = (questionId: number) => {
    setQuestions((prev) => prev.filter((question) => question.id !== questionId));
  };

  const isLoading = (isLoadingExam || isLoadingQuestions) && isEditing;

  const watchedTitle = form.watch("title");
  const watchedCourseId = form.watch("courseId");
  const watchedDuration = form.watch("duration");
  const watchedLive = form.watch("acceptingResponses");

  const courseLabel =
    courses.find((c) => String(c.id) === watchedCourseId)?.title ?? "Not set";

  const goToStep = (next: ExamEditorStep) => {
    if (steps.includes(next)) setStep(next);
  };

  const goNext = async () => {
    const fields = EXAM_STEP_FIELDS[step];
    if (fields?.length) {
      const ok = await form.trigger(fields);
      if (!ok) {
        setStepErrors((prev) => ({ ...prev, [step]: true }));
        toast({
          title: "Fix this step first",
          description: "Fill in the required fields before you continue.",
          variant: "destructive",
        });
        return;
      }
      setStepErrors((prev) => ({ ...prev, [step]: false }));
    }
    if (step === "source" && questionSource === "pdf" && pdfPool.length === 0) {
      toast({
        title: "Upload a file",
        description: "Choose a PDF or Word file, or switch to typing questions.",
        variant: "destructive",
      });
      return;
    }
    const idx = steps.indexOf(step);
    if (idx >= 0 && idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const onInvalid = (errors: typeof form.formState.errors) => {
    const basicsKeys = EXAM_STEP_FIELDS.basics ?? [];
    const sourceKeys = EXAM_STEP_FIELDS.source ?? [];
    const errKeys = Object.keys(errors);
    if (errKeys.some((k) => basicsKeys.includes(k as keyof ExamFormValues))) {
      setStep("basics");
      setStepErrors((prev) => ({ ...prev, basics: true }));
    } else if (errKeys.some((k) => sourceKeys.includes(k as keyof ExamFormValues))) {
      if (steps.includes("source")) setStep("source");
      setStepErrors((prev) => ({ ...prev, source: true }));
    } else {
      setStep("questions");
    }
    const firstKey = Object.keys(errors)[0] as keyof ExamFormValues | undefined;
    const firstErr = firstKey ? errors[firstKey] : undefined;
    const msg =
      firstErr && typeof firstErr === "object" && "message" in firstErr
        ? String(firstErr.message)
        : "Please complete all required fields (title, description, course, exam type).";
    toast({
      title: "Cannot create exam",
      description: firstKey ? `${String(firstKey)}: ${msg}` : msg,
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ced exd">
        <header className="ced-head">
          <span className="ced-mark" aria-hidden>
            <ClipboardList strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="ced-h1">
              {isEditing ? "Edit" : "Create"} <i>exam</i>
            </DialogTitle>
            <DialogDescription className="ced-sub">
              {isEditing
                ? "Update the details and questions for this exam."
                : "Fill in the information below to create a new exam with questions."}
            </DialogDescription>
          </div>
          <button type="button" className="ced-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X strokeWidth={2} />
          </button>
        </header>
        <div className="ced-body">
          <ExamStepRail mode={editorMode} step={step} stepErrors={stepErrors} onChange={goToStep} />
          <div className="ced-main min-h-0 flex-1">
            {isLoading ? (
              <div className="flex h-48 flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4FF3F] border-t-transparent" />
              </div>
            ) : (
              <>
                <p className="k shrink-0">
                  Step {stepIndex} of {totalSteps}
                </p>
                <h2 className="ced-step-h shrink-0">
                  {EXAM_STEP_HEADINGS[step].k} <i>{EXAM_STEP_HEADINGS[step].word}</i>
                </h2>
                <p className="ced-note shrink-0">{EXAM_STEP_HEADINGS[step].sub}</p>
                <Form {...form}>
                  <form
                    id={EXAM_FORM_ID}
                    className="exd-form"
                    onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                  >
                    <div className="ced-scroll slim-scroll">
                      {step === "basics" && (
                        <div className="ced-grid">
                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem className="ced-span">
                      <FormLabel className="k">Exam type</FormLabel>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => field.onChange("theory")}
                          className={"exd-pick" + (field.value === "theory" ? " on" : "")}
                        >
                          <PenLine />
                          <strong>Theory</strong>
                          <span>Students write answers. You grade them.</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            field.onChange("mcq");
                            setQuestions((prev) => {
                              const next = prev.map((q) => ensureMcqOptions(q));
                              if (next.length === 0) {
                                return [
                                  ensureMcqOptions({
                                    id: 1,
                                    text: "",
                                    order: 0,
                                    modelAnswer: null,
                                    imageUrl: null,
                                  }),
                                ];
                              }
                              return next;
                            });
                          }}
                          className={"exd-pick" + (field.value === "mcq" ? " on" : "")}
                        >
                          <ListChecks />
                          <strong>Multiple choice</strong>
                          <span>One correct answer. Graded automatically.</span>
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="ced-span">
                      <FormLabel className="k">Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Midterm Exam - Physics 101"
                          className={"ced-input"}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="ced-span">
                      <FormLabel className="k">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide instructions or scope for this exam..."
                          className="ced-input ced-area"
                          rows={3}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="ced-span grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="k">Course</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger className={"ced-input"}>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="ced-pop">
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={String(course.id)}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="k">Batch</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? "none"}
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger className={"ced-input"}>
                              <SelectValue placeholder="All batches in course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="ced-pop">
                            <SelectItem value="none">All batches in course</SelectItem>
                            {courseBatches.map((batch) => (
                              <SelectItem key={batch.id} value={String(batch.id)}>
                                {batch.name}{" "}
                                {batch.batchCode ? `(${batch.batchCode})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="ced-span grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="k">Duration (minutes)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="number"
                              min={1}
                              max={600}
                              className={"ced-input" + " pl-9"}
                              disabled={isSaving}
                              value={field.value ?? 60}
                              onChange={(e) => {
                                const raw = e.target.value;
                                field.onChange(raw === "" ? 60 : Number(raw));
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptingResponses"
                    render={({ field }) => (
                      <FormItem className="ced-enroll">
                        <div>
                          <FormLabel className="k">Accepting responses</FormLabel>
                          <p>Students can open this exam and submit.</p>
                        </div>
                        <FormControl>
                          <Switch
                            className="ced-switch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSaving}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                        </div>
                      )}

                      {step === "source" && (
                        <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="questionSource"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => field.onChange("manual")}
                          className={"exd-pick" + (field.value === "manual" ? " on" : "")}
                        >
                          <PenLine />
                          <strong>Type them</strong>
                          <span>Write each question in the list below.</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => field.onChange("pdf")}
                          className={"exd-pick" + (field.value === "pdf" ? " on" : "")}
                        >
                          <FileText />
                          <strong>Upload a file</strong>
                          <span>PDF or Word. Questions and images are read from the file.</span>
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {questionSource === "pdf" && (
                  <div className="mt-4 space-y-4">
                    <div className="exd-drop">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4FF3F]/15 text-[#D4FF3F]">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#F3F2FA]">
                              {pdfFileName || "No file selected"}
                            </p>
                            <p className="text-[13px] text-[#A3A1B8]">PDF or Word, including images in the file.</p>
                            {examType === "mcq" && (
                              <p className="mt-1 text-[13px] text-[#A3A1B8]">
                                Number each question, write A) B) C) D), then Answer: B
                              </p>
                            )}
                            {pdfPool.length > 0 && (
                              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3DDC97]">
                                {pdfPool.length} questions found
                              </p>
                            )}
                          </div>
                        </div>
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept="application/pdf,.pdf,.docx,.doc"
                            className="hidden"
                            disabled={isSaving || isParsingPdf}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              void handlePdfUpload(file);
                              e.target.value = "";
                            }}
                          />
                          <span className="exd-ghost">
                            {isParsingPdf ? (
                              "Reading file..."
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                {pdfPool.length ? "Replace file" : "Choose file"}
                              </>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>

                    {pdfPool.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <FormField
                          control={form.control}
                          name="questionCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="k">How many to use</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={pdfPool.length}
                                  className={"ced-input"}
                                  disabled={isSaving}
                                  value={field.value ?? 1}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value)
                                    )
                                  }
                                />
                              </FormControl>
                              <FormDescription className="text-[13px] text-[#A3A1B8]">
                                Up to {pdfPool.length} from this file.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <button
                          type="button"
                          className="exd-ghost"
                          disabled={isSaving}
                          onClick={() => applyRandomFromPool(questionCount)}
                        >
                          <Shuffle className="h-4 w-4" />
                          Shuffle again
                        </button>
                      </div>
                    )}
                  </div>
                )}
                        </div>
                      )}

                      {step === "questions" && (
                        <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <div key={question.id} className="exd-q">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3>Question {questionIndex + 1}</h3>
                      <button
                        type="button"
                        className="exd-icon"
                        onClick={() => removeQuestion(question.id)}
                        disabled={isSaving}
                        aria-label="Remove question"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>

                    <label htmlFor={`question-${question.id}`} className="k">
                      Question
                    </label>
                    <Textarea
                      id={`question-${question.id}`}
                      value={question.text}
                      onChange={(e) => updateQuestionText(question.id, e.target.value)}
                      rows={2}
                      className="ced-input ced-area"
                      disabled={isSaving}
                      placeholder="e.g. How many triangles are there in the diagram below?"
                    />

                    {examType === "mcq" && (
                      <div className="mt-4 space-y-2">
                        <FormLabel className="k">Options</FormLabel>
                        <p className="mb-2 text-[13px] text-[#A3A1B8]">
                          Write at least two. Tap the letter to mark the correct one.
                        </p>
                        {(question.options ?? DEFAULT_MCQ_OPTIONS).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              title="Mark as correct"
                              onClick={() => setCorrectOption(question.id, optIdx)}
                              className={"exd-letter" + (question.correctOption === optIdx ? " on" : "")}
                            >
                              {question.correctOption === optIdx ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                OPTION_LETTERS[optIdx] ?? "?"
                              )}
                            </button>
                            <Input
                              value={opt}
                              disabled={isSaving}
                              className={"ced-input"}
                              placeholder={`Option ${OPTION_LETTERS[optIdx]}`}
                              onChange={(e) => {
                                const next = [...(question.options ?? DEFAULT_MCQ_OPTIONS)];
                                next[optIdx] = e.target.value;
                                updateQuestionOptions(question.id, next);
                              }}
                            />
                            {(question.options ?? DEFAULT_MCQ_OPTIONS).length > 2 && (
                              <button
                                type="button"
                                className="exd-icon"
                                onClick={() => removeOptionFromQuestion(question.id, optIdx)}
                                disabled={isSaving}
                                aria-label="Remove option"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {(question.options ?? DEFAULT_MCQ_OPTIONS).length < 6 && (
                          <button
                            type="button"
                            className="exd-ghost"
                            onClick={() => addOptionToQuestion(question.id)}
                            disabled={isSaving}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add option
                          </button>
                        )}
                      </div>
                    )}

                    {/* Question Image Attachment section */}
                    <div className="exd-photo">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="k">Diagram</p>
                        {question.imageUrl ? (
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#3DDC97]">Attached</span>
                        ) : null}
                      </div>

                      {question.imageUrl ? (
                        <div className="space-y-3">
                          <div className="inline-block overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0F] p-2">
                            <img
                              src={question.imageUrl}
                              alt={`Question ${questionIndex + 1} diagram`}
                              className="max-h-48 w-auto rounded-lg object-contain"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="exd-ghost cursor-pointer">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{uploadingImageQuestionId === question.id ? "Uploading..." : "Change photo"}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                className="hidden"
                                disabled={isSaving || uploadingImageQuestionId === question.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file) {
                                    void handleQuestionImageUpload(question.id, file);
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              className="exd-ghost"
                              onClick={() => removeQuestionImage(question.id)}
                              disabled={isSaving}
                            >
                              <Trash className="h-3.5 w-3.5" />
                              Remove photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="exd-ghost cursor-pointer">
                            <ImageIcon className="h-4 w-4" />
                            <span>
                              {uploadingImageQuestionId === question.id
                                ? "Uploading image..."
                                : "Attach a diagram"}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              className="hidden"
                              disabled={isSaving || uploadingImageQuestionId === question.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  void handleQuestionImageUpload(question.id, file);
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <p className="mt-2 text-[13px] text-[#A3A1B8]">PNG, JPG, or WEBP. It shows with the question.</p>
                        </div>
                      )}
                    </div>

                    {examType === "theory" && question.modelAnswer ? (
                      <p className="mt-3 rounded-2xl bg-[#13131E] px-3 py-2 text-[13px] text-[#A3A1B8]">
                        <span className="font-bold text-[#F3F2FA]">Model answer: </span>
                        {question.modelAnswer}
                      </p>
                    ) : examType === "theory" &&
                      question.options &&
                      question.options.filter((o) => o.trim()).length >= 2 ? (
                      <p className="mt-3 rounded-2xl border border-[#FFB547]/40 bg-[#FFB547]/10 px-3 py-2 text-[13px] text-[#FFB547]">
                        These options will be added to the question text when you save.
                      </p>
                    ) : examType === "theory" ? (
                      <p className="mt-3 text-[13px] text-[#A3A1B8]">Students write their answer.</p>
                    ) : null}
                  </div>
                ))}

                <button type="button" className="exd-ghost" onClick={addQuestion} disabled={isSaving}>
                  <Plus className="h-4 w-4" />
                  Add question
                </button>
                        </div>
                      )}
                    </div>
                  </form>
                </Form>
              </>
            )}
          </div>
          <aside className="ced-preview exd-preview">
            <p className="k">At a glance</p>
            <p className="ced-live-note">Summary updates as you fill each step.</p>
            <ul className="ced-summary">
              <li>
                <span>Title</span>
                <b>{watchedTitle.trim() || "Untitled exam"}</b>
              </li>
              <li>
                <span>Course</span>
                <b>{courseLabel}</b>
              </li>
              <li>
                <span>Type</span>
                <b>{examType === "mcq" ? "Multiple choice" : "Theory"}</b>
              </li>
              <li>
                <span>Duration</span>
                <b>{watchedDuration ?? 60} min</b>
              </li>
              <li>
                <span>Questions</span>
                <b>{questions.length}</b>
              </li>
              <li>
                <span>Live</span>
                <b>{watchedLive ? "Yes" : "No"}</b>
              </li>
            </ul>
          </aside>
        </div>
        <footer className="ced-foot exd-foot">
          <button type="button" className="ced-cancel" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </button>
          <div className="exd-foot-actions">
            {!isFirstStep && !isLoading ? (
              <button type="button" className="ced-cancel" onClick={goBack} disabled={isSaving}>
                <ChevronLeft strokeWidth={2.4} aria-hidden />
                Back
              </button>
            ) : null}
            {!isLastStep && !isLoading ? (
              <button type="button" className="ced-submit" onClick={() => void goNext()} disabled={isSaving}>
                Continue
                <ChevronRight strokeWidth={2.4} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="ced-submit"
                disabled={isSaving || isLoading}
                onClick={() => void form.handleSubmit(onSubmit, onInvalid)()}
              >
                <Check strokeWidth={2.4} aria-hidden />
                {isSaving ? "Saving..." : isEditing ? "Update exam" : "Create exam"}
              </button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
