import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EditorShell } from "@/components/course-editor/EditorShell";
import { DetailsStep } from "@/components/course-editor/DetailsStep";
import { ContentStep } from "@/components/course-editor/ContentStep";
import { ThumbnailStep } from "@/components/course-editor/ThumbnailStep";
import { LivePreview } from "@/components/course-editor/LivePreview";
import { AddQuizDialog } from "@/components/course-editor/AddQuizDialog";
import type { FieldErrors } from "react-hook-form";
import {
  courseMetadataSchema,
  type CourseMetadataFormValues,
} from "@/lib/form-schemas";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  X,
  BookOpen,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Video,
  Plus,
  UserIcon,
  ClipboardList,
  PenLine,
  Shuffle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildCourseQuizQuestionsFromPool,
  parseMcqQuestionsFile,
  type ParsedMcqQuestion,
} from "@/lib/mcq-question-import";

const COURSE_FORM_ID = "course-editor-form";

const metadataDefaults: CourseMetadataFormValues = {
  title: "",
  description: "",
  category: "",
  difficulty: "",
  duration: 12,
  instructorId: null,
  isEnrollmentRequired: true,
};

interface CourseEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: any;
}

type ModuleType = {
  id: number;
  title: string;
  description?: string;
  isOpen?: boolean;
  lessons?: LessonType[];
};

type LessonType = {
  id: number;
  title: string;
  content?: string;
  contentType: 'video' | 'text' | 'pdf' | 'quiz';
  duration?: number;
  isRequired?: boolean;
  quizData?: any;
};

type QuizQuestion = {
  id: number;
  text: string;
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
  }[];
};

export default function CourseEditor({ open, onOpenChange, course }: CourseEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modules, setModules] = useState<ModuleType[]>([]);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editingLessonIds, setEditingLessonIds] = useState<{moduleId: number, lessonId: number} | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState<string>("");
  const [editModuleDescription, setEditModuleDescription] = useState<string>("");
  const [editLessonTitle, setEditLessonTitle] = useState<string>("");
  const [editLessonContent, setEditLessonContent] = useState<string>("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionOptions, setQuestionOptions] = useState<{id: number, text: string, isCorrect: boolean}[]>([
    { id: 1, text: "", isCorrect: false },
    { id: 2, text: "", isCorrect: false },
    { id: 3, text: "", isCorrect: false },
    { id: 4, text: "", isCorrect: false }
  ]);
  const [quizAddModuleId, setQuizAddModuleId] = useState<number | null>(null);
  const [quizBuilderMode, setQuizBuilderMode] = useState<"manual" | "upload">("manual");
  const [quizPdfPool, setQuizPdfPool] = useState<ParsedMcqQuestion[]>([]);
  const [quizPdfFileName, setQuizPdfFileName] = useState("");
  const [quizImportCount, setQuizImportCount] = useState(10);
  const [isParsingQuizDoc, setIsParsingQuizDoc] = useState(false);
  const quizDocInputRef = useRef<HTMLInputElement>(null);
  const quizDocPickerModuleRef = useRef<number | null>(null);

  const form = useForm<CourseMetadataFormValues>({
    resolver: zodResolver(courseMetadataSchema),
    defaultValues: metadataDefaults,
  });
  
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(course?.thumbnail || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingModule, setIsSavingModule] = useState<boolean>(false);
  const [isSavingLesson, setIsSavingLesson] = useState<boolean>(false);
  const [step, setStep] = useState<"details" | "content" | "thumbnail">("details");
  const [modulesLoading, setModulesLoading] = useState(false);
  const [thumbDragOver, setThumbDragOver] = useState(false);

  // Fetch modules when course changes
  useEffect(() => {
    if (course?.id) {
      const fetchModules = async () => {
        setModulesLoading(true);
        try {
          const modulesResponse = await apiRequest("GET", `/api/courses/${course.id}/modules`);
          const modulesData = await modulesResponse.json();
          
          // For each module, fetch its lessons
          const modulesWithLessons = await Promise.all(
            modulesData.map(async (module: any) => {
              try {
                const lessonsResponse = await apiRequest("GET", `/api/modules/${module.id}/lessons`);
                const lessonsData = await lessonsResponse.json();
                
                // Process lessons and parse quiz data
                const processedLessons = lessonsData.map((lesson: any) => {
                  let processedLesson: any = {
                    id: lesson.id,
                    title: lesson.title,
                    contentType: lesson.contentType || "text",
                    content: lesson.content || "",
                    duration: lesson.duration,
                    isRequired: lesson.isRequired,
                    order: lesson.order
                  };
                  
                  // Handle quiz data
                  if (lesson.contentType === 'quiz' && lesson.quizData) {
                    let quizData;
                    try {
                      if (typeof lesson.quizData === 'string') {
                        quizData = JSON.parse(lesson.quizData);
                      } else {
                        quizData = lesson.quizData;
                      }
                      
                      if (!quizData.questions) {
                        quizData.questions = [];
                      }
                      
                      processedLesson.quizData = quizData;
                    } catch (e) {
                      console.error("Error parsing quiz data:", e);
                      processedLesson.quizData = { questions: [] };
                    }
                  }
                  
                  return processedLesson;
                });
                
                return {
                  ...module,
                  isOpen: true,
                  lessons: processedLessons
                };
              } catch (error) {
                console.error(`Error fetching lessons for module ${module.id}:`, error);
                return {
                  ...module,
                  isOpen: true,
                  lessons: []
                };
              }
            })
          );
          
          setModules(modulesWithLessons);
        } catch (error) {
          console.error("Error fetching modules:", error);
          setModules([]);
          toast({
            title: "Error",
            description: "Failed to load course content. Please try again.",
            variant: "destructive",
          });
        } finally {
          setModulesLoading(false);
        }
      };
      
      fetchModules();
    } else {
      setModules([]);
      setModulesLoading(false);
    }
  }, [course?.id, toast]);

  useEffect(() => {
    if (open) setStep("details");
  }, [open, course?.id]);

  // Helper function to format thumbnail URL for display
  const formatThumbnailUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    // If it's already a full URL (http/https) or data URL, return as is
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    // If it's a relative path, prepend /uploads/
    if (url.startsWith("/")) {
      return url;
    }
    return `/uploads/${url}`;
  };

  // Reset form when course changes or dialog opens/closes
  useEffect(() => {
    if (course && open) {
      form.reset({
        title: course.title || "",
        description: course.description || "",
        category: course.category || "",
        difficulty: course.difficulty || "",
        duration: course.duration || 12,
        instructorId: course.instructorId || null,
        isEnrollmentRequired: course.isEnrollmentRequired ?? true,
      });
      setThumbnailPreview(formatThumbnailUrl(course.thumbnail) || "");
      setThumbnail(null);
    } else if (!open && !course) {
      form.reset(metadataDefaults);
      setThumbnailPreview("");
      setThumbnail(null);
      setModules([]);
    }
  }, [course, open, form]);

  // Function to upload image to backend
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload failed:", errorText);
      throw new Error("Failed to upload image");
    }
    
    const data = await response.json();
    // Return the relative path (without /uploads/ prefix) for storage
    return data.url;
  };

  const applyPendingLessonEdits = (source: ModuleType[]): ModuleType[] => {
    if (!editingLessonIds) return source;
    return source.map((module) => {
      if (module.id !== editingLessonIds.moduleId) return module;
      return {
        ...module,
        lessons: module.lessons?.map((lesson) => {
          if (lesson.id !== editingLessonIds.lessonId) return lesson;
          if (lesson.contentType === "quiz") {
            return {
              ...lesson,
              title: editLessonTitle.trim() || lesson.title,
              duration: lesson.duration ?? 15,
              quizData: {
                questions: quizQuestions,
                builderMode: quizBuilderMode,
              },
            };
          }
          return {
            ...lesson,
            title: editLessonTitle.trim() || lesson.title,
            content: editLessonContent,
          };
        }),
      };
    });
  };

  const nextClientLessonId = (lessons: LessonType[] | undefined) => {
    const list = lessons || [];
    const minNeg = list.reduce((min, l) => (l.id < min ? l.id : min), 0);
    return minNeg <= 0 ? minNeg - 1 : -1;
  };

  // Save all modules and their lessons to the server
  const saveAllModules = async (courseId: number, modulesSnapshot: ModuleType[]) => {
    try {
      // First, fetch existing modules to determine what needs to be updated vs. created
      const modulesResponse = await apiRequest("GET", `/api/courses/${courseId}/modules`);
      const existingModules = await modulesResponse.json();
      
      // Process each module
      for (let i = 0; i < modulesSnapshot.length; i++) {
        const module = modulesSnapshot[i];
        let moduleId;
        
        // Check if this is an existing module or a new one
        const existingModule = existingModules.find((m: any) => m.id === module.id);
        
        if (existingModule) {
          // Update existing module
          const response = await apiRequest("PUT", `/api/modules/${module.id}`, {
            title: module.title,
            description: module.description || null,
            order: i + 1
          });
          const updatedModule = await response.json();
          moduleId = updatedModule.id;
        } else {
          // Create new module
          const response = await apiRequest("POST", `/api/modules`, {
            title: module.title,
            description: module.description || null,
            courseId: courseId,
            order: i + 1
          });
          const newModule = await response.json();
          moduleId = newModule.id;
        }
        
        // Process lessons for this module
        if (moduleId && module.lessons && module.lessons.length > 0) {
          // Fetch existing lessons
          const lessonsResponse = await apiRequest("GET", `/api/modules/${moduleId}/lessons`);
          const existingLessons = await lessonsResponse.json();
          
          for (let j = 0; j < module.lessons.length; j++) {
            const lesson = module.lessons[j];
            
            const existingLesson =
              lesson.id > 0
                ? existingLessons.find((l: any) => l.id === lesson.id)
                : undefined;

            const quizPayload =
              lesson.contentType === "quiz" && lesson.quizData
                ? {
                    questions: lesson.quizData.questions ?? [],
                    ...(lesson.quizData.builderMode
                      ? { builderMode: lesson.quizData.builderMode }
                      : {}),
                  }
                : null;

            let lessonData: any = {
              title: (lesson.title || "").trim() || "Untitled lesson",
              contentType: lesson.contentType || "text",
              moduleId: moduleId,
              order: j + 1,
              isRequired: lesson.isRequired ?? true,
              duration:
                lesson.contentType === "quiz"
                  ? lesson.duration && lesson.duration > 0
                    ? lesson.duration
                    : 15
                  : lesson.duration ?? null,
            };

            if (lesson.contentType === "quiz" && quizPayload) {
              lessonData.content = JSON.stringify(quizPayload);
              lessonData.quizData = quizPayload;
            } else {
              lessonData.content = lesson.content || "";
              lessonData.quizData = null;
            }

            if (existingLesson) {
              await apiRequest("PUT", `/api/lessons/${lesson.id}`, lessonData);
            } else {
              await apiRequest("POST", "/api/lessons", lessonData);
            }
          }
          
          // Delete lessons that are no longer in the editor
          for (const existingLesson of existingLessons) {
            const stillExists = module.lessons.some(
              (l) => l.id > 0 && l.id === existingLesson.id
            );
            if (!stillExists) {
              await apiRequest("DELETE", `/api/lessons/${existingLesson.id}`);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/modules/");
        },
      });

      // Delete modules that are no longer in the editor
      for (const existingModule of existingModules) {
        const stillExists = modulesSnapshot.some(m => m.id === existingModule.id);
        if (!stillExists) {
          await apiRequest("DELETE", `/api/modules/${existingModule.id}`);
        }
      }
      
      toast({
        title: "Course content saved",
        description: "All modules and lessons have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving modules and lessons:", error);
      toast({
        title: "Error",
        description: "There was an error saving the course content.",
        variant: "destructive",
      });
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating course with data:", data);
      const response = await apiRequest("POST", "/api/courses", data);
      return response.json();
    },
    onSuccess: async (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course created successfully",
        description: "Your new course has been added to the system.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error creating course:", error);
      toast({
        title: "Error creating course",
        description: "There was an error creating the course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Updating course with data:", data);
      const response = await apiRequest("PUT", `/api/courses/${course.id}`, data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course updated successfully",
        description: "Your course has been updated.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error updating course:", error);
      toast({
        title: "Error updating course",
        description: "There was an error updating the course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset(metadataDefaults);
    setThumbnail(null);
    setThumbnailPreview("");
    setModules([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, GIF, etc.).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setThumbnail(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const inputEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(inputEvent);
    }
  };

  const handleSubmit = async (values: CourseMetadataFormValues) => {
    try {
      setIsUploading(true);

      // Use existing thumbnail if no new file is selected, otherwise upload new one
      let thumbnailUrl = course?.thumbnail || "";

      // Upload new thumbnail if selected
      if (thumbnail) {
        console.log("Starting image upload...");
        try {
          thumbnailUrl = await uploadImage(thumbnail);
          console.log("Image uploaded successfully:", thumbnailUrl);
          
          // Clean up the object URL if we created a preview
          if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
            URL.revokeObjectURL(thumbnailPreview);
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Error uploading image",
            description: "There was an error uploading the course thumbnail. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Prepare data for API
      const submitData = {
        title: values.title,
        description: values.description || "",
        category: values.category,
        difficulty: values.difficulty,
        duration: values.duration,
        instructorId: values.instructorId,
        moduleCount: modules.length,
        lessonCount: modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0),
        thumbnail: thumbnailUrl,
        isEnrollmentRequired: values.isEnrollmentRequired,
      };

      console.log("Submitting course data with thumbnail:", submitData.thumbnail);

      const modulesSnapshot = applyPendingLessonEdits(modules);
      setModules(modulesSnapshot);
      if (editingLessonIds) {
        setEditingLessonIds(null);
        setEditLessonTitle("");
        setEditLessonContent("");
      }

      if (course) {
        const updatedCourse = await updateCourseMutation.mutateAsync(submitData);
        if (updatedCourse?.id && modulesSnapshot.length > 0) {
          await saveAllModules(updatedCourse.id, modulesSnapshot);
        }
      } else {
        const newCourse = await createCourseMutation.mutateAsync(submitData);
        if (newCourse?.id && modulesSnapshot.length > 0) {
          await saveAllModules(newCourse.id, modulesSnapshot);
        }
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "There was an error saving the course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Module and Lesson Management Functions
  const toggleModule = (moduleId: number) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { ...module, isOpen: !module.isOpen } 
        : module
    ));
  };

  const addModule = () => {
    const newModuleId = modules.length > 0 
      ? Math.max(...modules.map(m => m.id)) + 1 
      : 1;
    
    setModules([...modules, {
      id: newModuleId,
      title: `Module ${newModuleId}: New Module`,
      isOpen: true,
      lessons: []
    }]);
  };

  const openQuizLessonEditor = (
    moduleId: number,
    lessonId: number,
    title: string,
    questions: QuizQuestion[],
    mode: "manual" | "upload"
  ) => {
    setEditingLessonIds({ moduleId, lessonId });
    setEditLessonTitle(title);
    setEditLessonContent("");
    setQuizQuestions(questions);
    setQuizBuilderMode(mode);
    setCurrentQuestion("");
    setQuestionOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false },
    ]);
  };

  const addLesson = (
    moduleId: number,
    contentType: "video" | "text" | "pdf" | "quiz" = "text",
    opts?: {
      autoEdit?: boolean;
      quizQuestions?: QuizQuestion[];
      quizMode?: "manual" | "upload";
    }
  ) => {
    type CreatedQuizEdit = {
      moduleId: number;
      lessonId: number;
      title: string;
      questions: QuizQuestion[];
      mode: "manual" | "upload";
    };
    const createdRef: { current?: CreatedQuizEdit } = {};

    setModules((prev) =>
      prev.map((module) => {
        if (module.id !== moduleId) return module;
        const lessons = module.lessons || [];
        const newLessonId = nextClientLessonId(lessons);
        const title = `New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Lesson`;
        const initialQuestions = opts?.quizQuestions ?? [];
        const newLesson: LessonType = {
          id: newLessonId,
          title,
          content: "",
          contentType,
          duration:
            contentType === "video" ? 30 : contentType === "quiz" ? 15 : undefined,
          isRequired: true,
          quizData:
            contentType === "quiz"
              ? { questions: initialQuestions, builderMode: opts?.quizMode ?? "manual" }
              : undefined,
        };
        if (opts?.autoEdit && contentType === "quiz") {
          createdRef.current = {
            moduleId,
            lessonId: newLessonId,
            title,
            questions: initialQuestions,
            mode: opts.quizMode ?? "manual",
          };
        }
        return { ...module, isOpen: true, lessons: [...lessons, newLesson] };
      })
    );

    const created = createdRef.current;
    if (created) {
      queueMicrotask(() =>
        openQuizLessonEditor(
          created.moduleId,
          created.lessonId,
          created.title,
          created.questions,
          created.mode
        )
      );
    }
  };

  const handleQuizAddManual = () => {
    if (quizAddModuleId == null) return;
    addLesson(quizAddModuleId, "quiz", { autoEdit: true, quizMode: "manual" });
    setQuizAddModuleId(null);
  };

  const handleQuizAddUploadClick = () => {
    if (quizAddModuleId == null) return;
    quizDocPickerModuleRef.current = quizAddModuleId;
    setQuizAddModuleId(null);
    quizDocInputRef.current?.click();
  };

  const importParsedQuizDocument = (
    parsed: ParsedMcqQuestion[],
    fileName: string,
    parseStats?: { total: number; withOptions: number; withCorrect: number }
  ) => {
    const defaultCount = Math.min(10, parsed.length) || parsed.length;
    setQuizPdfPool(parsed);
    setQuizPdfFileName(fileName);
    setQuizImportCount(defaultCount);
    const built = buildCourseQuizQuestionsFromPool(parsed, defaultCount);
    setQuizQuestions(built);
    setQuizBuilderMode("upload");
    let desc = `Imported ${built.length} MCQ(s) from ${parsed.length} in the document.`;
    if (parseStats) {
      desc += ` Options: ${parseStats.withOptions}, correct: ${parseStats.withCorrect}.`;
    }
    toast({ title: "Quiz document parsed", description: desc });
    return built;
  };

  const parseQuizDocumentFile = async (file: File) => {
    setIsParsingQuizDoc(true);
    try {
      const { questions: parsed, fileName, parseStats } =
        await parseMcqQuestionsFile(file);
      if (parsed.length === 0) {
        throw new Error("No questions found in this document.");
      }
      return importParsedQuizDocument(parsed, fileName, parseStats);
    } catch (err: unknown) {
      toast({
        title: "Could not parse document",
        description: err instanceof Error ? err.message : "Try another file.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsParsingQuizDoc(false);
    }
  };

  const handleQuizDocumentSelected = async (file: File | null) => {
    const moduleId = quizDocPickerModuleRef.current;
    if (!file || moduleId == null) return;
    quizDocPickerModuleRef.current = null;

    const built = await parseQuizDocumentFile(file);
    if (quizDocInputRef.current) quizDocInputRef.current.value = "";
    if (!built) return;

    addLesson(moduleId, "quiz", {
      autoEdit: true,
      quizMode: "upload",
      quizQuestions: built,
    });
  };

  const handleQuizDocumentInEditor = async (file: File | null) => {
    if (!file) return;
    await parseQuizDocumentFile(file);
  };

  const applyQuizQuestionsFromPool = (count?: number) => {
    if (quizPdfPool.length === 0) {
      toast({
        title: "No document loaded",
        description: "Upload a PDF or Word question bank first.",
        variant: "destructive",
      });
      return;
    }
    const n = count ?? quizImportCount ?? quizPdfPool.length;
    const built = buildCourseQuizQuestionsFromPool(quizPdfPool, n);
    setQuizQuestions(built);
    toast({
      title: "Questions updated",
      description: `Using ${built.length} question(s) from the uploaded document.`,
    });
  };

  // Start editing a module
  const startEditingModule = (moduleId: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      setEditingModuleId(moduleId);
      setEditModuleTitle(module.title);
      setEditModuleDescription(module.description || '');
    }
  };

  // Save module edits
  const saveModuleEdit = () => {
    if (editingModuleId === null) return;
    
    setIsSavingModule(true);
    
    setModules(modules.map(module => 
      module.id === editingModuleId 
        ? { 
            ...module, 
            title: editModuleTitle,
            description: editModuleDescription 
          } 
        : module
    ));
    
    // Reset editing state
    setEditingModuleId(null);
    setEditModuleTitle('');
    setEditModuleDescription('');
    
    toast({
      title: "Module updated",
      description: "Module details have been updated successfully.",
    });
    
    setIsSavingModule(false);
  };

  // Cancel module editing
  const cancelModuleEdit = () => {
    setEditingModuleId(null);
    setEditModuleTitle('');
    setEditModuleDescription('');
  };

  // Start editing a lesson
  const startEditingLesson = (moduleId: number, lessonId: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.lessons) return;
    
    const lesson = module.lessons.find(l => l.id === lessonId);
    if (lesson) {
      setEditingLessonIds({ moduleId, lessonId });
      setEditLessonTitle(lesson.title);
      setEditLessonContent(lesson.content || '');
      
      // If this is a quiz, set up the quiz questions
      if (lesson.contentType === "quiz" && lesson.quizData?.questions) {
        setQuizQuestions(lesson.quizData.questions);
        setQuizBuilderMode(
          lesson.quizData.builderMode === "upload" ? "upload" : "manual"
        );
      } else {
        setQuizQuestions([]);
        setQuizBuilderMode("manual");
      }
    }
  };

  // Save lesson edits
  const saveLessonEdit = () => {
    if (!editingLessonIds) return;
    
    setIsSavingLesson(true);
    
    setModules((prev) =>
      prev.map((module) =>
        module.id === editingLessonIds.moduleId
          ? {
              ...module,
              lessons: module.lessons?.map((lesson) => {
                if (lesson.id !== editingLessonIds.lessonId) return lesson;
                if (lesson.contentType === "quiz") {
                  return {
                    ...lesson,
                    title: editLessonTitle.trim() || lesson.title,
                    duration: lesson.duration ?? 15,
                    quizData: {
                      questions: quizQuestions,
                      builderMode: quizBuilderMode,
                    },
                  };
                }
                return {
                  ...lesson,
                  title: editLessonTitle.trim() || lesson.title,
                  content: editLessonContent,
                };
              }),
            }
          : module
      )
    );
    
    // Reset editing state
    setEditingLessonIds(null);
    setEditLessonTitle('');
    setEditLessonContent('');
    setQuizQuestions([]);
    setQuizPdfPool([]);
    setQuizPdfFileName("");
    setCurrentQuestion('');
    setQuestionOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false }
    ]);
    
    toast({
      title: "Lesson updated",
      description: "Lesson details have been updated successfully.",
    });
    
    setIsSavingLesson(false);
  };

  // Cancel lesson editing
  const cancelLessonEdit = () => {
    setEditingLessonIds(null);
    setEditLessonTitle('');
    setEditLessonContent('');
    setQuizQuestions([]);
    setQuizPdfPool([]);
    setQuizPdfFileName("");
    setCurrentQuestion('');
    setQuestionOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false }
    ]);
  };

  // Add a new question to the quiz
  const addQuizQuestion = () => {
    if (!currentQuestion.trim()) {
      toast({
        title: "Error",
        description: "Question text cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if at least one option is marked as correct
    const hasCorrectOption = questionOptions.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      toast({
        title: "Error",
        description: "You must mark at least one option as correct.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all options have text
    const emptyOptions = questionOptions.filter(option => !option.text.trim());
    if (emptyOptions.length > 0) {
      toast({
        title: "Error",
        description: "All option fields must be filled.",
        variant: "destructive",
      });
      return;
    }
    
    // Create new question
    const newQuestion: QuizQuestion = {
      id: quizQuestions.length > 0 ? Math.max(...quizQuestions.map(q => q.id)) + 1 : 1,
      text: currentQuestion,
      options: [...questionOptions]
    };
    
    // Add to questions list
    setQuizQuestions([...quizQuestions, newQuestion]);
    
    // Reset form
    setCurrentQuestion('');
    setQuestionOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false }
    ]);
    
    toast({
      title: "Question added",
      description: "Question has been added to the quiz.",
    });
  };

  // Remove a question from the quiz
  const removeQuizQuestion = (questionId: number) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  // Update option text for the current question being created
  const updateOptionText = (optionId: number, text: string) => {
    setQuestionOptions(
      questionOptions.map(option => 
        option.id === optionId ? { ...option, text } : option
      )
    );
  };

  // Toggle whether an option is correct for the current question
  const toggleOptionCorrect = (optionId: number) => {
    setQuestionOptions(
      questionOptions.map(option => 
        option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option
      )
    );
  };

  // Delete a module
  const deleteModule = (moduleId: number) => {
    setModules(modules.filter(module => module.id !== moduleId));
    toast({
      title: "Module deleted",
      description: "Module and its lessons have been deleted.",
    });
  };

  // Delete a lesson
  const deleteLesson = (moduleId: number, lessonId: number) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { 
            ...module, 
            lessons: module.lessons?.filter(lesson => lesson.id !== lessonId) 
          } 
        : module
    ));
    toast({
      title: "Lesson deleted",
      description: "Lesson has been removed from the module.",
    });
  };

  // Helper function to render appropriate icon for lesson content type
  const getLessonIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Video className="h-5 w-5 text-blue-500 mr-2" />;
      case 'text':
        return <FileText className="h-5 w-5 text-green-500 mr-2" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500 mr-2" />;
      case 'quiz':
        return <Edit className="h-5 w-5 text-teal-600 mr-2" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500 mr-2" />;
    }
  };

  const categories = [
    "Computer Science",
    "Web Development", 
    "Data Science",
    "Mobile Development",
    "Design",
    "Business",
    "Mathematics",
    "Engineering"
  ];

  const difficulties = [
    "Beginner",
    "Intermediate", 
    "Advanced"
  ];

  const instructors = [
    { id: 1, name: "Admin User" },
    { id: 2, name: "Gayatri Kopnar" },
    { id: 3, name: "Namrata Jadhav" },
    { id: 4, name: "Prajakta Jadhav" },
    { id: 5, name: "Shreyas" },
    { id: 6, name: "Ayush" },
    { id: 7, name: "Aman Hukkerikar" }
  ];

  const isSubmitting = createCourseMutation.isPending || updateCourseMutation.isPending || isUploading;

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const watched = form.watch();
  const lessonCount = modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0);
  const instructorName = instructors.find((person) => person.id === watched.instructorId)?.name || "";
  const mode = course ? "edit" : "create";
  const stepErrors = {
    details: Boolean(
      form.formState.errors.title ||
      form.formState.errors.category ||
      form.formState.errors.difficulty ||
      form.formState.errors.duration
    ),
  };
  const quizProps = {
    mode: quizBuilderMode,
    onMode: setQuizBuilderMode,
    questions: quizQuestions,
    fileName: quizPdfFileName,
    pool: quizPdfPool,
    importCount: quizImportCount,
    parsing: isParsingQuizDoc,
    currentQuestion,
    options: questionOptions,
    onFile: (file: File | null) => { void handleQuizDocumentInEditor(file); },
    onCount: setQuizImportCount,
    onPick: () => applyQuizQuestionsFromPool(),
    onRemove: removeQuizQuestion,
    onQuestion: setCurrentQuestion,
    onOptionText: updateOptionText,
    onToggleCorrect: toggleOptionCorrect,
    onAdd: addQuizQuestion,
  };

  const jumpToError = (errors: FieldErrors<CourseMetadataFormValues>) => {
    setStep("details");
    const order = ["title", "description", "category", "difficulty", "duration", "instructorId"] as const;
    const first = order.find((key) => errors[key]);
    if (first) window.setTimeout(() => form.setFocus(first), 0);
  };

  return (
    <EditorShell
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      step={step}
      stepErrors={stepErrors}
      onStep={setStep}
      isPending={isSubmitting}
      pendingLabel={thumbnail ? "Uploading Image..." : "Saving..."}
      submitLabel={course ? "Update course" : "Create course"}
      formId={COURSE_FORM_ID}
      preview={
        <LivePreview
          mode={mode}
          title={watched.title || ""}
          category={watched.category || ""}
          duration={Number(watched.duration) || 0}
          difficulty={watched.difficulty || ""}
          thumbnail={thumbnailPreview ? formatThumbnailUrl(thumbnailPreview) : null}
          modules={modules.length}
          lessons={lessonCount}
          instructor={instructorName}
          enrollmentOn={watched.isEnrollmentRequired !== false}
        />
      }
    >
      <Form {...form}>
        <form id={COURSE_FORM_ID} onSubmit={form.handleSubmit(handleSubmit, jumpToError)}>
          {step === "details" && (
            <DetailsStep
              form={form}
              disabled={isSubmitting}
              categories={categories}
              difficulties={difficulties}
              instructors={instructors}
            />
          )}
          {step === "content" && (
            <ContentStep
              mode={mode}
              loading={modulesLoading}
              modules={modules}
              editingModuleId={editingModuleId}
              quiz={quizProps}
              onAddModule={addModule}
              bind={(moduleId) => ({
                editTitle: editModuleTitle,
                editDescription: editModuleDescription,
                savingModule: isSavingModule,
                editingLessonId: editingLessonIds?.moduleId === moduleId ? editingLessonIds.lessonId : null,
                editLessonTitle,
                editLessonContent,
                savingLesson: isSavingLesson,
                onToggle: () => toggleModule(moduleId),
                onStartModule: () => startEditingModule(moduleId),
                onCancelModule: cancelModuleEdit,
                onSaveModule: saveModuleEdit,
                onModuleTitle: setEditModuleTitle,
                onModuleDescription: setEditModuleDescription,
                onStartLesson: (lessonId: number) => startEditingLesson(moduleId, lessonId),
                onCancelLesson: cancelLessonEdit,
                onSaveLesson: saveLessonEdit,
                onDeleteLesson: (lessonId: number) => deleteLesson(moduleId, lessonId),
                onDeleteModule: () => deleteModule(moduleId),
                onLessonTitle: setEditLessonTitle,
                onLessonContent: setEditLessonContent,
                onAdd: (type: "text" | "video" | "pdf") => addLesson(moduleId, type),
                onAddQuiz: () => setQuizAddModuleId(moduleId),
              })}
            />
          )}
          {step === "thumbnail" && (
            <ThumbnailStep
              preview={thumbnailPreview}
              dragging={thumbDragOver}
              inputRef={fileInputRef}
              formatUrl={formatThumbnailUrl}
              onDragOver={(event) => {
                setThumbDragOver(true);
                handleDragOver(event);
              }}
              onDragLeave={() => setThumbDragOver(false)}
              onDrop={(event) => {
                setThumbDragOver(false);
                handleDrop(event);
              }}
              onSelect={handleFileSelect}
              onRemove={handleRemoveThumbnail}
            />
          )}
        </form>
      </Form>
      <input
        ref={quizDocInputRef}
        type="file"
        accept="application/pdf,.pdf,.docx,.doc"
        className="hidden"
        onChange={(event) => {
          void handleQuizDocumentSelected(event.target.files?.[0] ?? null);
        }}
      />
      <AddQuizDialog
        open={quizAddModuleId != null}
        parsing={isParsingQuizDoc}
        onOpenChange={(next) => {
          if (!next) setQuizAddModuleId(null);
        }}
        onManual={handleQuizAddManual}
        onUpload={handleQuizAddUploadClick}
      />
    </EditorShell>
  );
}
