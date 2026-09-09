import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
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
import {
  CreateFormDialog,
  CreateFormFooter,
  FormSection,
  createFormControlClass,
  createFormLabelClass,
} from "@/components/ui/create-form-dialog";

const EXAM_FORM_ID = "exam-editor-form";

type QuestionType = {
  id: number;
  text: string;
  order: number;
  modelAnswer?: string | null;
  imageUrl?: string | null;
};

type ParsedPdfQuestion = {
  text: string;
  modelAnswer?: string | null;
  imageUrl?: string | null;
};

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
  const isEditing = !!exam?.id;

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
  const questionSource = form.watch("questionSource");
  const questionCount = form.watch("questionCount");

  const courseBatches = useMemo(
    () => batches, // Show all batches, validation will happen on backend
    [batches]
  );

  useEffect(() => {
    if (fetchedExam && exam?.id) {
      form.reset({
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
    if (examQuestions && exam?.id) {
      setQuestions(examQuestions);
    } else if (!exam?.id) {
      setQuestions([]);
    }
  }, [examQuestions, exam?.id]);

  // Note: Batch validation is now done on the backend
  // Users can select any batch, and the server will validate if the course is assigned to that batch

  const applyRandomFromPoolWith = (pool: ParsedPdfQuestion[], count: number) => {
    const picked = shufflePick(pool, count);
    setQuestions(
      picked.map((q, index) => ({
        id: index + 1,
        text: q.text,
        order: index,
        modelAnswer: q.modelAnswer ?? null,
        imageUrl: q.imageUrl ?? null,
      }))
    );
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

      toast({
        title: "Document parsed",
        description: `Found ${parsed.length} questions. ${defaultCount} randomly selected for this exam.`,
      });
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
    if (data.questionSource === "pdf" && pdfPool.length > 0 && questions.length === 0) {
      applyRandomFromPool(data.questionCount);
    }

    const emptyQuestions = questions.filter((q) => !q.text.trim() && !q.imageUrl);
    if (emptyQuestions.length > 0) {
      toast({
        title: "Incomplete questions",
        description: "Please fill in text or attach an image for all questions before saving.",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "No questions",
        description: "Add questions manually or upload a PDF / Word document question bank.",
        variant: "destructive",
      });
      return;
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

      if (examId) {
        try {
          await apiRequest("DELETE", `/api/exams/${examId}/questions`);

          for (let index = 0; index < questions.length; index++) {
            const question = questions[index];
            await apiRequest("POST", `/api/exams/${examId}/questions`, {
              text: question.text,
              order: index,
              examId,
              modelAnswer: question.modelAnswer || null,
              imageUrl: question.imageUrl || null,
            });
          }
        } catch (err) {
          console.error("Error saving questions:", err);
          toast({
            title: "Warning",
            description: "Exam was saved but there was an issue saving the questions.",
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}/questions`] });
      onOpenChange(false);
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
    const newQuestionId =
      questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;

    setQuestions([
      ...questions,
      {
        id: newQuestionId,
        text: "",
        order: questions.length,
        modelAnswer: null,
        imageUrl: null,
      },
    ]);
  };

  const updateQuestionText = (questionId: number, text: string) => {
    setQuestions(
      questions.map((question) =>
        question.id === questionId ? { ...question, text } : question
      )
    );
  };

  const removeQuestion = (questionId: number) => {
    setQuestions(questions.filter((question) => question.id !== questionId));
  };

  const isLoading = (isLoadingExam || isLoadingQuestions) && isEditing;

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Exam" : "Create New Exam"}
      description={
        isEditing
          ? "Update the details and questions for this exam."
          : "Fill in the information below to create a new exam with questions."
      }
      icon={<ClipboardList className="h-6 w-6 text-white" />}
      footer={
        <CreateFormFooter
          formId={EXAM_FORM_ID}
          onCancel={() => onOpenChange(false)}
          submitLabel={isEditing ? "Update Exam" : "Create Exam"}
          pendingLabel="Saving..."
          isPending={isSaving}
          submitDisabled={isLoading}
        />
      }
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <Form {...form}>
          <form
            id={EXAM_FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormSection
              title="Basic details"
              description="Name, course association, time limit, and response availability"
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>
                        Exam Title <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Midterm Exam - Physics 101"
                          className={createFormControlClass}
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
                    <FormItem>
                      <FormLabel className={createFormLabelClass}>
                        Description <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide instructions or scope for this exam..."
                          className={createFormControlClass + " h-auto min-h-[80px] py-2.5"}
                          rows={3}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={createFormLabelClass}>
                          Course <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger className={createFormControlClass}>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormLabel className={createFormLabelClass}>
                          Batch (Optional)
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? "none"}
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger className={createFormControlClass}>
                              <SelectValue placeholder="All batches in course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={createFormLabelClass}>
                          Duration (minutes) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="number"
                              min={1}
                              max={600}
                              className={createFormControlClass + " pl-9"}
                              disabled={isSaving}
                              value={field.value ?? 60}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value)
                                )
                              }
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
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border bg-white p-3.5 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-semibold text-[#2D3748]">
                            Accepting Responses
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Students can access and submit
                          </p>
                        </div>
                        <FormControl>
                          <Switch
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
            </FormSection>

            {!isEditing && (
              <FormSection
                title="Question source"
                description="Choose whether to type questions manually or upload a PDF/Word document"
              >
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
                          className={
                            "rounded-xl border p-4 text-left transition-colors " +
                            (field.value === "manual"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-white hover:bg-muted/40")
                          }
                        >
                          <p className="text-sm font-semibold text-[#2D3748]">Manual entry</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Type questions & attach photos manually below.
                          </p>
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => field.onChange("pdf")}
                          className={
                            "rounded-xl border p-4 text-left transition-colors " +
                            (field.value === "pdf"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-white hover:bg-muted/40")
                          }
                        >
                          <p className="text-sm font-semibold text-[#2D3748]">Upload PDF / Word Document</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Parse questions and embedded images automatically.
                          </p>
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {questionSource === "pdf" && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-dashed border-border bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2D3748]">
                              {pdfFileName || "No file selected"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Supports PDF (.pdf) and Word (.docx) files with text & images.
                            </p>
                            {pdfPool.length > 0 && (
                              <Badge className="mt-2 rounded-full border border-green-200 bg-green-100 text-[10px] font-bold uppercase tracking-wide text-green-800">
                                {pdfPool.length} questions in pool
                              </Badge>
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
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 gap-2 rounded-xl"
                            disabled={isSaving || isParsingPdf}
                            asChild
                          >
                            <span>
                              {isParsingPdf ? (
                                "Parsing..."
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  {pdfPool.length ? "Replace Document" : "Upload Document"}
                                </>
                              )}
                            </span>
                          </Button>
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
                              <FormLabel className={createFormLabelClass}>
                                Questions to pick randomly
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={pdfPool.length}
                                  className={createFormControlClass}
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
                              <FormDescription className="text-xs">
                                Max {pdfPool.length} from uploaded document.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 gap-2 rounded-xl"
                          disabled={isSaving}
                          onClick={() => applyRandomFromPool(questionCount)}
                        >
                          <Shuffle className="h-4 w-4" />
                          Re-shuffle
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </FormSection>
            )}

            <FormSection
              title="Exam questions"
              description={
                questionSource === "pdf" && pdfPool.length > 0
                  ? "Randomly selected from document — review questions & images before saving"
                  : "Questions with optional diagram/photo attachment"
              }
            >
              <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <div
                    key={question.id}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h5 className="text-sm font-semibold text-[#2D3748]">
                        Question {questionIndex + 1}
                      </h5>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[#A0AEC0] hover:text-red-500"
                        onClick={() => removeQuestion(question.id)}
                        disabled={isSaving}
                        aria-label="Remove question"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    <label
                      htmlFor={`question-${question.id}`}
                      className={createFormLabelClass + " mb-1.5 block"}
                    >
                      Question Text
                    </label>
                    <Textarea
                      id={`question-${question.id}`}
                      value={question.text}
                      onChange={(e) => updateQuestionText(question.id, e.target.value)}
                      rows={2}
                      className={createFormControlClass + " h-auto min-h-[72px] py-2.5"}
                      disabled={isSaving}
                      placeholder="e.g. How many triangles are there in the diagram below?"
                    />

                    {/* Question Image Attachment section */}
                    <div className="mt-3.5 rounded-xl border border-border/80 bg-slate-50/50 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className={createFormLabelClass + " flex items-center gap-1.5"}>
                          <ImageIcon className="h-4 w-4 text-primary" />
                          Question Image / Photo
                        </FormLabel>
                        {question.imageUrl && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                            Image Attached
                          </Badge>
                        )}
                      </div>

                      {question.imageUrl ? (
                        <div className="space-y-3">
                          <div className="relative inline-block overflow-hidden rounded-xl border border-border bg-white p-2 shadow-sm">
                            <img
                              src={question.imageUrl}
                              alt={`Question ${questionIndex + 1} diagram`}
                              className="max-h-48 w-auto rounded-lg object-contain"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-slate-50 transition-colors">
                              <Upload className="h-3.5 w-3.5 text-gray-500" />
                              <span>{uploadingImageQuestionId === question.id ? "Uploading..." : "Change Photo"}</span>
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

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
                              onClick={() => removeQuestionImage(question.id)}
                              disabled={isSaving}
                            >
                              <Trash className="h-3.5 w-3.5" />
                              Remove Photo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-primary/10 transition-all">
                            <ImageIcon className="h-4 w-4" />
                            <span>
                              {uploadingImageQuestionId === question.id
                                ? "Uploading image..."
                                : "Attach Image / Picture (PNG, JPG)"}
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
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Supports PNG, JPG, JPEG, WEBP files. Appears directly with question.
                          </p>
                        </div>
                      )}
                    </div>

                    {question.modelAnswer ? (
                      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-[#2D3748]">Model answer: </span>
                        {question.modelAnswer}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Students will provide written answers.
                      </p>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 rounded-xl border-border font-semibold text-[#2D3748]"
                  onClick={addQuestion}
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4" />
                  Add New Question
                </Button>
              </div>
            </FormSection>
          </form>
        </Form>
      )}
    </CreateFormDialog>
  );
}
