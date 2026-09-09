import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import VideoComponent from "@/components/courses/video-component";
import {
  BookOpen,
  BookText,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ClipboardList,
  ExternalLink,
  FileText,
  Play,
  Video
} from "lucide-react";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";
import { hasQuizDraft, loadQuizDraft } from "@/lib/quiz-draft";
import { getQuizAttempts } from "@/lib/quiz-attempts";

/** Pull a usable http(s) URL out of lesson content (plain text or light HTML). */
function extractLessonUrl(content: string | null | undefined): string | null {
  if (!content) return null;
  const text = content.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").trim();
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match) return null;
  return match[0].replace(/[.,);]+$/, "");
}

export default function StudentCourseDetails() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [draftTick, setDraftTick] = useState(0);
  const { toast } = useToast();
  
  // Extract course ID from URL
  const courseId = parseInt(location.split("/").pop() || "0");
  
  // Fetch course data
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });
  
  // Fetch modules
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: [`/api/courses/${courseId}/modules`],
    enabled: !!courseId,
  });
  
  // Fetch enrollment data for progress tracking
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ["/api/enrollments/user"],
  });
  
  // Find enrollment for this course
  const enrollment = (enrollments as any[]).find(e => e.courseId === courseId);
  
  // Fetch lessons for the active module
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: [`/api/modules/${activeModuleId}/lessons`],
    enabled: !!activeModuleId,
  });
  
  // Fetch course progress to check which lessons are completed
  const { data: courseProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: [`/api/course-progress/${courseId}`],
    enabled: !!courseId && !!enrollment,
  });

  const { data: allExams = [] } = useQuery<any[]>({
    queryKey: ["/api/exams"],
    enabled: !!courseId,
  });

  const { data: examAttempts = [] } = useQuery<any[]>({
    queryKey: ["/api/exam-attempts/user"],
    enabled: !!courseId,
  });

  const courseExams = (allExams as any[])
    .filter((e) => Number(e.courseId) === Number(courseId))
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  
  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { lessonId: number, moduleId: number, courseId: number, completed: boolean }) => {
      // Call the API endpoint to mark lesson as complete
      await apiRequest("POST", "/api/lesson-progress", { 
        lessonId: data.lessonId,
        moduleId: data.moduleId,
        courseId: data.courseId,
        completed: data.completed 
      });
      
      toast({
        title: "Progress updated",
        description: `Lesson marked as ${data.completed ? 'completed' : 'incomplete'}`,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh progress data
      queryClient.invalidateQueries({queryKey: ["/api/enrollments/user"]});
      queryClient.invalidateQueries({queryKey: [`/api/course-progress/${courseId}`]});
    }
  });
  
  // Mark lesson as complete
  const markLessonComplete = (lessonId: number) => {
    if (!activeModuleId) return;
    
    const module = (modules as any[]).find(m => m.id === activeModuleId);
    if (!module) return;
    
    updateProgressMutation.mutate({ 
      lessonId,
      moduleId: activeModuleId, 
      courseId, 
      completed: true 
    });
  };
  
  // Set first module as active on initial load
  useEffect(() => {
    if ((modules as any[]).length > 0 && !activeModuleId) {
      setActiveModuleId((modules as any[])[0].id);
    }
  }, [modules, activeModuleId]);
  
  // Set first lesson as active when module changes
  useEffect(() => {
    if ((lessons as any[]).length > 0) {
      setActiveLessonId((lessons as any[])[0].id);
    } else {
      setActiveLessonId(null);
    }
  }, [lessons, activeModuleId]);

  // Refresh progress when returning from quiz tab
  useEffect(() => {
    const onFocus = () => {
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: [`/api/course-progress/${courseId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/enrollments/user"] });
      }
      setDraftTick((t) => t + 1);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [courseId]);
  
  // Find active lesson
  const activeLesson = (lessons as any[]).find(lesson => lesson.id === activeLessonId);
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!enrollment) return 0;
    return enrollment.progress || 0;
  };
  
  // Get lesson icon based on content type
  const getLessonIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'quiz':
        return <FileText className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'text':
      default:
        return <BookText className="h-4 w-4" />;
    }
  };

  const documentUrl =
    activeLesson &&
    ["pdf", "text"].includes(String(activeLesson.contentType).toLowerCase())
      ? extractLessonUrl(activeLesson.content)
      : null;
  
  // Check if a lesson is completed
  const isLessonCompleted = (lessonId: number) => {
    if (!courseProgress) return false;
    
    // Check if this lesson is marked as completed in the course progress data
    const modulesWithLessons = (courseProgress as any).modules || [];
    
    for (const module of modulesWithLessons) {
      const lesson = module.lessons?.find((l: any) => l.id === lessonId);
      if (lesson && lesson.completed) {
        return true;
      }
    }
    
    return false;
  };
  
  if (isLoadingCourse) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Course not found</h3>
          <p className="text-gray-500 mb-4">
            The course you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/student/my-courses">
            <Button>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to My Courses
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const thumb = getCourseThumbnailSrc((course as any).thumbnail);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Link href="/student/my-courses">
            <Button variant="ghost" size="sm" className="mb-2">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to My Courses
            </Button>
          </Link>

          {thumb ? (
            <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={thumb}
                alt=""
                className="h-48 w-full object-cover sm:h-56"
              />
            </div>
          ) : null}
          
          <Header title={(course as any).title} />
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {(course as any).difficulty}
              </Badge>
              <Badge variant="outline" className="bg-gray-100">
                {(course as any).category}
              </Badge>
              {(course as any).isEnrollmentRequired && (
                <Badge variant="outline" className="bg-teal-100 text-teal-800">
                  Restricted
                </Badge>
              )}
            </div>
            
            {enrollment && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Progress: {calculateProgress()}%</span>
                <Progress value={calculateProgress()} className="w-32" />
              </div>
            )}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Course Content</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>About this Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p>{(course as any).description}</p>
                  <h3>What you'll learn</h3>
                  <ul>
                    <li>Core concepts and fundamentals</li>
                    <li>Practical application of skills</li>
                    <li>Advanced techniques and best practices</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Course Structure</CardTitle>
                <CardDescription>
                  This course contains {(modules as any[]).length} modules with various lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingModules ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (modules as any[]).length === 0 ? (
                    <p className="text-gray-500">No modules available yet.</p>
                  ) : (
                    (modules as any[]).map((module, index) => (
                      <div key={module.id} className="border rounded-lg p-4">
                        <h3 className="font-medium">{module.title}</h3>
                        <p className="text-sm text-gray-500">{module.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("content")} className="w-full">
                  Start Learning
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>Course Modules</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {isLoadingModules ? (
                        <div className="animate-pulse p-4 space-y-4">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      ) : (modules as any[]).length === 0 ? (
                        <div className="p-4">
                          <p className="text-gray-500">No modules available yet.</p>
                        </div>
                      ) : (
                        (modules as any[]).map((module, index) => (
                          <div 
                            key={module.id} 
                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                              activeModuleId === module.id ? 'bg-gray-50' : ''
                            }`}
                            onClick={() => setActiveModuleId(module.id)}
                          >
                            <div className="font-medium">{module.title}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {module.description}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                {activeModuleId ? (
                  <>
                    <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                      <CardHeader>
                        <CardTitle>
                          {activeModuleId && 
                            (modules as any[]).find(m => m.id === activeModuleId)?.title
                          }
                        </CardTitle>
                        <CardDescription>
                          {activeModuleId && 
                            (modules as any[]).find(m => m.id === activeModuleId)?.description
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {isLoadingLessons ? (
                            <div className="animate-pulse p-4 space-y-4">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="h-10 bg-gray-200 rounded"></div>
                              ))}
                            </div>
                          ) : (lessons as any[]).length === 0 ? (
                            <div className="p-4">
                              <p className="text-gray-500">No lessons available for this module yet.</p>
                            </div>
                          ) : (
                            (lessons as any[]).map((lesson) => (
                              <div 
                                key={lesson.id} 
                                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                  activeLessonId === lesson.id ? 'bg-gray-50' : ''
                                }`}
                                onClick={() => setActiveLessonId(lesson.id)}
                              >
                                <div className="flex items-center">
                                  {getLessonIcon(lesson.contentType)}
                                  <span className="ml-2">{lesson.title}</span>
                                </div>
                                
                                {isLessonCompleted(lesson.id) && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {activeLesson && (
                      <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                        <CardHeader>
                          <CardTitle>{activeLesson.title}</CardTitle>
                          <div className="flex items-center text-sm text-gray-500">
                            {getLessonIcon(activeLesson.contentType)}
                            <span className="ml-1 capitalize">{activeLesson.contentType} lesson</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {activeLesson.contentType === 'quiz' ? (
                            <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-turquoise/10 to-brand-blue/10 p-6 space-y-4">
                              {(() => {
                                const hasDraft =
                                  !!activeModuleId &&
                                  hasQuizDraft(courseId, activeModuleId, activeLesson.id);
                                const attempts =
                                  activeModuleId
                                    ? getQuizAttempts(courseId, activeModuleId, activeLesson.id)
                                    : 0;
                                void draftTick;
                                const ctaLabel = hasDraft
                                  ? "Continue Test"
                                  : attempts > 0
                                    ? "Retake Test"
                                    : "Start Test";
                                return (
                                  <>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-semibold">{activeLesson.title}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    MCQ Assignment — opens in a secure new tab
                                  </p>
                                </div>
                                {hasDraft ? (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0">
                                    In progress
                                  </Badge>
                                ) : attempts > 0 ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                                    Attempted ({attempts})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="shrink-0">
                                    Not taken
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <FileText className="h-4 w-4" />
                                  {(() => {
                                    try {
                                      const data =
                                        typeof activeLesson.quizData === "string"
                                          ? JSON.parse(activeLesson.quizData)
                                          : activeLesson.quizData;
                                      return data?.questions?.length || 0;
                                    } catch {
                                      return 0;
                                    }
                                  })()}{" "}
                                  questions
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  {(() => {
                                    const draft =
                                      activeModuleId &&
                                      loadQuizDraft(courseId, activeModuleId, activeLesson.id);
                                    if (draft) {
                                      const m = Math.floor(draft.timeLeftSeconds / 60);
                                      const s = draft.timeLeftSeconds % 60;
                                      return `${m}:${s.toString().padStart(2, "0")} remaining`;
                                    }
                                    return activeLesson.duration && activeLesson.duration > 0
                                      ? `${activeLesson.duration} min limit`
                                      : "15 min limit";
                                  })()}
                                </span>
                              </div>

                              <Button
                                size="lg"
                                className="w-full sm:w-auto bg-accent-brand text-white hover:opacity-90"
                                onClick={() => {
                                  if (!activeModuleId) return;
                                  window.open(
                                    `/student/quiz/${courseId}/${activeModuleId}/${activeLesson.id}`,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                {ctaLabel}
                              </Button>
                                  </>
                                );
                              })()}
                            </div>
                          ) : activeLesson.contentType === 'video' ? (
                            <>
                              <VideoComponent videoUrl={activeLesson.content} />
                              <div className="prose prose-sm max-w-none mt-4">
                                <div dangerouslySetInnerHTML={{ __html: activeLesson.description || 'No additional description provided.' }}></div>
                              </div>
                            </>
                          ) : documentUrl ? (
                            <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-turquoise/10 to-brand-blue/10 p-6 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-semibold">{activeLesson.title}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Documentation — opens in a new tab
                                  </p>
                                </div>
                                <Badge variant="outline" className="shrink-0 capitalize">
                                  {activeLesson.contentType}
                                </Badge>
                              </div>

                              {activeLesson.description ? (
                                <div className="prose prose-sm max-w-none text-muted-foreground">
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: activeLesson.description,
                                    }}
                                  />
                                </div>
                              ) : null}

                              <Button
                                size="lg"
                                className="w-full sm:w-auto bg-accent-brand text-white hover:opacity-90"
                                onClick={() => {
                                  window.open(documentUrl, "_blank", "noopener,noreferrer");
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Document
                              </Button>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: activeLesson.content }}></div>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-6">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const currentIndex = (lessons as any[]).findIndex(l => l.id === activeLessonId);
                              if (currentIndex > 0) {
                                setActiveLessonId((lessons as any[])[currentIndex - 1].id);
                              }
                            }}
                            disabled={
                              (lessons as any[]).findIndex(l => l.id === activeLessonId) === 0
                            }
                          >
                            Previous Lesson
                          </Button>
                          
                          <div className="flex space-x-2">
                            {activeLesson.contentType !== "quiz" && (
                              <Button
                                onClick={() => markLessonComplete(activeLesson.id)}
                                variant="outline"
                                className="gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark as Complete
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => {
                                const currentIndex = (lessons as any[]).findIndex(l => l.id === activeLessonId);
                                if (currentIndex < (lessons as any[]).length - 1) {
                                  setActiveLessonId((lessons as any[])[currentIndex + 1].id);
                                }
                              }}
                              disabled={
                                (lessons as any[]).findIndex(l => l.id === activeLessonId) === 
                                (lessons as any[]).length - 1
                              }
                            >
                              Next Lesson
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                      <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Select a Module
                      </h3>
                      <p className="text-gray-500">
                        Choose a module from the left to start learning
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Course Exams
                </CardTitle>
                <CardDescription>
                  Written exams for this course open in a new tab. Each exam can be submitted only once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseExams.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exams published for this course yet.
                  </p>
                ) : (
                  courseExams.map((exam) => {
                    const attempted = (examAttempts as any[]).some(
                      (a) => Number(a.examId) === Number(exam.id) && a.completedAt
                    );
                    const inProgress = (examAttempts as any[]).some(
                      (a) => Number(a.examId) === Number(exam.id) && !a.completedAt
                    );
                    const closed = exam.acceptingResponses === false;
                    const canStart = !attempted && !closed;
                    const label = attempted
                      ? "Attempted"
                      : closed
                        ? "Unavailable"
                        : inProgress
                          ? "Continue Exam"
                          : "Start Exam";

                    return (
                      <div
                        key={exam.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <p className="truncate font-semibold text-foreground">{exam.title}</p>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {exam.description || "No description"}
                            {exam.duration ? ` · ${exam.duration} min` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Opens in a new tab · one attempt only
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {attempted ? (
                            <Badge className="rounded-full border-slate-200 bg-slate-100 text-slate-800">
                              Attempted
                            </Badge>
                          ) : closed ? (
                            <Badge className="rounded-full border-red-200 bg-red-100 text-red-800">
                              Closed
                            </Badge>
                          ) : inProgress ? (
                            <Badge className="rounded-full border-amber-200 bg-amber-100 text-amber-800">
                              In progress
                            </Badge>
                          ) : (
                            <Badge className="rounded-full border-green-200 bg-green-100 text-green-800">
                              Available
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5 rounded-xl"
                            variant={canStart ? "default" : "outline"}
                            disabled={!canStart}
                            onClick={() => {
                              if (!canStart) {
                                toast({
                                  title: attempted ? "Already attempted" : "Cannot start exam",
                                  description: attempted
                                    ? "You already submitted this exam. Only one attempt is allowed."
                                    : "This exam is not available.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              window.open(
                                `/student/take-exam/${exam.id}`,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                          >
                            {label}
                            {canStart ? <ExternalLink className="h-3.5 w-3.5" /> : null}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}