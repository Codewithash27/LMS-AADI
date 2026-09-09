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
import {
  CreateFormDialog,
  CreateFormFooter,
  FormSection,
  createFormControlClass,
  createFormLabelClass,
} from "@/components/ui/create-form-dialog";
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
} from "lucide-react";

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

  const form = useForm<CourseMetadataFormValues>({
    resolver: zodResolver(courseMetadataSchema),
    defaultValues: metadataDefaults,
  });
  
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(course?.thumbnail || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingModule, setIsSavingModule] = useState<boolean>(false);
  const [isSavingLesson, setIsSavingLesson] = useState<boolean>(false);

  // Fetch modules when course changes
  useEffect(() => {
    if (course?.id) {
      const fetchModules = async () => {
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
        }
      };
      
      fetchModules();
    } else {
      setModules([]);
    }
  }, [course?.id, toast]);

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

  // Save all modules and their lessons to the server
  const saveAllModules = async (courseId: number) => {
    try {
      // First, fetch existing modules to determine what needs to be updated vs. created
      const modulesResponse = await apiRequest("GET", `/api/courses/${courseId}/modules`);
      const existingModules = await modulesResponse.json();
      
      // Process each module
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
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
            
            // Check if lesson already exists
            const existingLesson = existingLessons.find((l: any) => l.id === lesson.id);
            
            // Prepare lesson data based on content type
            let lessonData: any = {
              title: lesson.title,
              contentType: lesson.contentType || 'text',
              moduleId: moduleId,
              order: j + 1,
              isRequired: lesson.isRequired || true,
              duration: lesson.duration || null
            };
            
            // Add appropriate content based on type
            if (lesson.contentType === 'quiz' && lesson.quizData) {
              lessonData.content = JSON.stringify(lesson.quizData) || '';
              lessonData.quizData = lesson.quizData;
            } else {
              lessonData.content = lesson.content || '';
              lessonData.quizData = null;
            }
            
            if (existingLesson) {
              // Update existing lesson
              await apiRequest("PUT", `/api/lessons/${lesson.id}`, lessonData);
            } else {
              // Create new lesson
              await apiRequest("POST", `/api/lessons`, lessonData);
            }
          }
          
          // Delete lessons that are no longer in the editor
          for (const existingLesson of existingLessons) {
            const stillExists = module.lessons.some(l => l.id === existingLesson.id);
            if (!stillExists) {
              await apiRequest("DELETE", `/api/lessons/${existingLesson.id}`);
            }
          }
        }
      }
      
      // Delete modules that are no longer in the editor
      for (const existingModule of existingModules) {
        const stillExists = modules.some(m => m.id === existingModule.id);
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
      // Save all modules and lessons after course creation
      if (newCourse.id && modules.length > 0) {
        await saveAllModules(newCourse.id);
      }
      
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
    onSuccess: async (updatedCourse) => {
      // Save all modules and lessons after course update
      if (updatedCourse.id && modules.length > 0) {
        await saveAllModules(updatedCourse.id);
      }
      
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

      if (course) {
        await updateCourseMutation.mutateAsync(submitData);
      } else {
        await createCourseMutation.mutateAsync(submitData);
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

  const addLesson = (moduleId: number, contentType: 'video' | 'text' | 'pdf' | 'quiz' = 'text') => {
    setModules(modules.map(module => {
      if (module.id === moduleId) {
        const lessons = module.lessons || [];
        const newLessonId = lessons.length > 0 
          ? Math.max(...lessons.map(l => l.id)) + 1 
          : 1;
        
        return {
          ...module,
          lessons: [...lessons, {
            id: newLessonId,
            title: `New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Lesson`,
            content: '',
            contentType: contentType,
            duration: contentType === 'video' ? 30 : undefined,
            isRequired: true,
            quizData: contentType === 'quiz' ? { questions: [] } : undefined
          }]
        };
      }
      return module;
    }));
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
      if (lesson.contentType === 'quiz' && lesson.quizData && lesson.quizData.questions) {
        setQuizQuestions(lesson.quizData.questions);
      } else {
        // Reset quiz questions for non-quiz lessons
        setQuizQuestions([]);
      }
    }
  };

  // Save lesson edits
  const saveLessonEdit = () => {
    if (!editingLessonIds) return;
    
    setIsSavingLesson(true);
    
    setModules(modules.map(module => 
      module.id === editingLessonIds.moduleId 
        ? { 
            ...module, 
            lessons: module.lessons?.map(lesson => {
              if (lesson.id === editingLessonIds.lessonId) {
                // Check if this is a quiz lesson
                if (lesson.contentType === 'quiz') {
                  return {
                    ...lesson,
                    title: editLessonTitle,
                    quizData: {
                      questions: quizQuestions
                    }
                  };
                } else {
                  // For non-quiz lessons
                  return {
                    ...lesson,
                    title: editLessonTitle,
                    content: editLessonContent
                  };
                }
              }
              return lesson;
            })
          } 
        : module
    ));
    
    // Reset editing state
    setEditingLessonIds(null);
    setEditLessonTitle('');
    setEditLessonContent('');
    setQuizQuestions([]);
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

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={course ? "Edit Course" : "Create Course"}
      description={
        course
          ? "Update course details, content, and thumbnail."
          : "Set up a new course with modules, lessons, and a cover image."
      }
      icon={<BookOpen className="h-7 w-7 text-white" />}
      maxWidth="max-w-4xl"
      footer={
        <CreateFormFooter
          formId={COURSE_FORM_ID}
          onCancel={() => onOpenChange(false)}
          submitLabel={course ? "Update Course" : "Create Course"}
          pendingLabel={thumbnail ? "Uploading Image..." : "Saving..."}
          isPending={isSubmitting}
        />
      }
    >
      <Form {...form}>
        <form
          id={COURSE_FORM_ID}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <FormSection
            title="Course details"
            description="Title, description, category, and difficulty"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className={createFormLabelClass}>Course Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Advanced Web Development with React"
                        className={createFormControlClass}
                        disabled={isSubmitting}
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel className={createFormLabelClass}>Course Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of the course"
                        rows={4}
                        className={createFormControlClass + " h-auto min-h-[100px] resize-none py-2.5"}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={createFormLabelClass}>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className={createFormControlClass}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={createFormLabelClass}>Difficulty Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className={createFormControlClass}>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {difficulties.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  difficulty === "Beginner"
                                    ? "bg-green-100 text-green-800"
                                    : difficulty === "Intermediate"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-teal-100 text-teal-800"
                                }
                              >
                                {difficulty}
                              </Badge>
                            </div>
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={createFormLabelClass}>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#A0AEC0]" />
                        Duration (weeks)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        className={createFormControlClass}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={createFormLabelClass}>
                      <span className="inline-flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-[#A0AEC0]" />
                        Instructor
                      </span>
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : null)
                      }
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className={createFormControlClass}>
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={String(instructor.id)}>
                            {instructor.name}
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
                name="isEnrollmentRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border bg-white p-4 sm:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={createFormLabelClass}>
                        Enrollment Required
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Uncheck for free access without enrollment
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Course Content - Modules and Lessons */}
          <FormSection title="Course content" description="Modules and lessons for this course">
              <div className="mb-4 flex justify-end">
                <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={addModule}>
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
              </div>
              
              {modules.map((module) => (
                <div key={module.id} className="mb-4 border border-gray-200 rounded-md overflow-hidden">
                  {editingModuleId === module.id ? (
                    <div className="bg-gray-50 p-3">
                      <div className="flex flex-col space-y-3">
                        <Input
                          value={editModuleTitle}
                          onChange={(e) => setEditModuleTitle(e.target.value)}
                          placeholder="Module Title"
                          className="w-full"
                        />
                        <Textarea
                          value={editModuleDescription}
                          onChange={(e) => setEditModuleDescription(e.target.value)}
                          placeholder="Module Description (optional)"
                          rows={2}
                          className="w-full resize-none"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" size="sm" onClick={cancelModuleEdit}>
                            Cancel
                          </Button>
                          <Button type="button" variant="default" size="sm" onClick={saveModuleEdit} disabled={isSavingModule}>
                            {isSavingModule ? (
                              <>
                                <span className="animate-spin mr-1">⧗</span>
                                Saving...
                              </>
                            ) : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 mr-2"
                          onClick={() => toggleModule(module.id)}
                        >
                          {module.isOpen ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                        </Button>
                        <div>
                          <h5 className="font-medium">{module.title}</h5>
                          {module.description && (
                            <p className="text-xs text-gray-500">{module.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 text-gray-600"
                          onClick={() => startEditingModule(module.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 text-gray-600 hover:text-red-500"
                          onClick={() => deleteModule(module.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {module.isOpen && !editingModuleId && (
                    <div className="p-4">
                      <div className="space-y-3">
                        {module.lessons?.map((lesson) => (
                          <div key={lesson.id} className="bg-white border border-gray-200 rounded-md">
                            {editingLessonIds && 
                             editingLessonIds.moduleId === module.id && 
                             editingLessonIds.lessonId === lesson.id ? (
                              <div className="p-3">
                                <div className="flex flex-col space-y-3">
                                  <div className="flex items-center">
                                    {getLessonIcon(lesson.contentType)}
                                    <Input
                                      value={editLessonTitle}
                                      onChange={(e) => setEditLessonTitle(e.target.value)}
                                      placeholder="Lesson Title"
                                      className="flex-1"
                                    />
                                  </div>
                                  
                                  {lesson.contentType === 'quiz' ? (
                                    <div className="border rounded-md p-4 bg-gray-50">
                                      <h4 className="font-medium mb-3">Quiz Questions</h4>
                                      
                                      {/* Existing Questions List */}
                                      {quizQuestions.length > 0 && (
                                        <div className="mb-4 space-y-3">
                                          <h5 className="text-sm font-medium">Existing Questions</h5>
                                          {quizQuestions.map(question => (
                                            <div key={question.id} className="bg-white p-3 rounded border">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <p className="font-medium">{question.text}</p>
                                                  <ul className="mt-2 space-y-1 text-sm">
                                                    {question.options.map(option => (
                                                      <li 
                                                        key={option.id}
                                                        className={option.isCorrect ? 'text-green-600 font-medium' : ''}
                                                      >
                                                        {option.isCorrect ? '✓ ' : ''}
                                                        {option.text}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                                <Button 
                                                  type="button" 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="text-red-500"
                                                  onClick={() => removeQuizQuestion(question.id)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Add New Question Form */}
                                      <div className="border-t pt-4 mt-4">
                                        <h5 className="text-sm font-medium mb-2">Add New Question</h5>
                                        
                                        <div className="space-y-3">
                                          <div>
                                            <Label htmlFor="questionText">Question Text</Label>
                                            <Input
                                              id="questionText"
                                              value={currentQuestion}
                                              onChange={(e) => setCurrentQuestion(e.target.value)}
                                              placeholder="Enter your question"
                                              className="mt-1"
                                            />
                                          </div>
                                          
                                          <div>
                                            <Label className="mb-2 block">Answer Options</Label>
                                            {questionOptions.map((option) => (
                                              <div key={option.id} className="flex items-center space-x-2 mb-2">
                                                <Checkbox
                                                  id={`option-${option.id}`}
                                                  checked={option.isCorrect}
                                                  onCheckedChange={() => toggleOptionCorrect(option.id)}
                                                />
                                                <Input
                                                  value={option.text}
                                                  onChange={(e) => updateOptionText(option.id, e.target.value)}
                                                  placeholder={`Option ${option.id}`}
                                                  className="flex-1"
                                                />
                                              </div>
                                            ))}
                                            <p className="text-xs text-gray-500 mt-1">
                                              Check the box next to correct answer(s).
                                            </p>
                                          </div>
                                          
                                          <Button 
                                            type="button" 
                                            onClick={addQuizQuestion}
                                            variant="outline" 
                                            size="sm"
                                            className="mt-2"
                                          >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Question
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <Textarea
                                      value={editLessonContent}
                                      onChange={(e) => setEditLessonContent(e.target.value)}
                                      placeholder="Lesson content"
                                      rows={4}
                                      className="w-full resize-none"
                                    />
                                  )}
                                  
                                  <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" size="sm" onClick={cancelLessonEdit}>
                                      Cancel
                                    </Button>
                                    <Button type="button" variant="default" size="sm" onClick={saveLessonEdit} disabled={isSavingLesson}>
                                      {isSavingLesson ? (
                                        <>
                                          <span className="animate-spin mr-1">⧗</span>
                                          Saving...
                                        </>
                                      ) : "Save"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-2">
                                <div className="flex items-center">
                                  {getLessonIcon(lesson.contentType)}
                                  <span>{lesson.title}</span>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-1 text-gray-600"
                                    onClick={() => startEditingLesson(module.id, lesson.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-1 text-gray-600 hover:text-red-500"
                                    onClick={() => deleteLesson(module.id, lesson.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="text-sm" 
                          onClick={() => addLesson(module.id, 'text')}
                        >
                          <FileText className="h-4 w-4 mr-1 text-green-500" />
                          Add Text
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="text-sm" 
                          onClick={() => addLesson(module.id, 'video')}
                        >
                          <Video className="h-4 w-4 mr-1 text-blue-500" />
                          Add Video
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="text-sm" 
                          onClick={() => addLesson(module.id, 'pdf')}
                        >
                          <FileText className="h-4 w-4 mr-1 text-red-500" />
                          Add PDF
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="text-sm" 
                          onClick={() => addLesson(module.id, 'quiz')}
                        >
                          <Edit className="h-4 w-4 mr-1 text-teal-600" />
                          Add Quiz
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {modules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No modules added yet. Click "Add Module" to get started.</p>
                </div>
              )}
          </FormSection>

          {/* Course Thumbnail */}
          <FormSection title="Course thumbnail" description="Cover image for the course card">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={formatThumbnailUrl(thumbnailPreview)}
                    alt="Course thumbnail preview"
                    className="h-48 w-full rounded-xl border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0"
                    onClick={handleRemoveThumbnail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-white p-8 text-center transition-colors hover:border-[#0F766E]"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 h-12 w-12 text-[#A0AEC0]" />
                  <p className="mb-2 text-lg font-medium text-[#2D3748]">
                    Drag & drop your course image here
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Recommended size: 800x450 pixels • Max 5MB
                  </p>
                  <Button type="button" variant="outline" className="gap-2 rounded-xl">
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <p className="mt-2 text-xs text-muted-foreground">
                Supported formats: JPEG, PNG, GIF, WebP • Max file size: 5MB
              </p>
          </FormSection>
        </form>
      </Form>
    </CreateFormDialog>
  );
}