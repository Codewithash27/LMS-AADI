import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName, getTimeGreeting } from "@/lib/greeting";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import { CourseHero } from "@/components/student-course/CourseHero";
import { LessonActions } from "@/components/student-course/LessonActions";
import { ModulePanel, type PanelModule } from "@/components/student-course/ModulePanel";
import { PlayerFrame } from "@/components/student-course/PlayerFrame";
import { apiRequest, queryClient } from "@/lib/queryClient";
import VideoComponent from "@/components/courses/video-component";
import {
  BookOpen,
  Clock,
  ClipboardList,
  ExternalLink,
  FileText,
  Play,
} from "lucide-react";
import { hasQuizDraft, loadQuizDraft } from "@/lib/quiz-draft";
import { getQuizAttempts } from "@/lib/quiz-attempts";
import { parseLessonQuizData } from "@/lib/course-quiz-data";

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
  const [scrollSignal, setScrollSignal] = useState(0);
  const pendingLessonId = useRef<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
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
  
  // Set first lesson as active when module changes, unless Next/Previous asked for a specific lesson.
  useEffect(() => {
    const list = lessons as any[];
    if (list.length > 0) {
      const pending = pendingLessonId.current;
      if (pending && list.some((lesson) => lesson.id === pending)) {
        setActiveLessonId(pending);
        pendingLessonId.current = null;
      } else if (!pending) {
        setActiveLessonId(list[0].id);
      }
    } else if (!isLoadingLessons) {
      setActiveLessonId(null);
    }
  }, [lessons, activeModuleId, isLoadingLessons]);

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
  

  const documentUrl =
    activeLesson &&
    ["pdf", "text"].includes(String(activeLesson.contentType).toLowerCase())
      ? extractLessonUrl(activeLesson.content)
      : null;

  const isLessonCompleted = (lessonId: number) => {
    if (!courseProgress) return false;
    const modulesWithLessons = (courseProgress as any).modules || [];
    for (const module of modulesWithLessons) {
      const lesson = module.lessons?.find((l: any) => l.id === lessonId);
      if (lesson && lesson.completed) return true;
    }
    return false;
  };

  const progressModules = ((courseProgress as any)?.modules || []) as any[];
  const panelModules: PanelModule[] = (modules as any[]).map((module) => {
    const fromProgress = progressModules.find((item) => item.id === module.id);
    const source = fromProgress?.lessons?.length
      ? fromProgress.lessons
      : module.id === activeModuleId
        ? (lessons as any[])
        : [];
    const panelLessons = source.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType || "text",
      completed: Boolean(lesson.completed) || isLessonCompleted(lesson.id),
      locked: Boolean(lesson.locked || lesson.isLocked),
    }));
    return {
      id: module.id,
      title: module.title,
      complete: panelLessons.length > 0 && panelLessons.every((lesson: { completed: boolean }) => lesson.completed),
      lessons: panelLessons,
    };
  });

  const flat = progressModules.length
    ? progressModules.flatMap((module) =>
        (module.lessons || []).map((lesson: any) => ({ moduleId: module.id, lessonId: lesson.id }))
      )
    : (lessons as any[]).map((lesson) => ({ moduleId: activeModuleId, lessonId: lesson.id }));
  const flatIndex = flat.findIndex(
    (item) => item.moduleId === activeModuleId && item.lessonId === activeLessonId
  );
  const lessonIndex = (lessons as any[]).findIndex((lesson) => lesson.id === activeLessonId);
  const atStart = flatIndex >= 0 ? flatIndex === 0 : lessonIndex <= 0;
  const atEnd = flatIndex >= 0
    ? flatIndex === flat.length - 1
    : lessonIndex < 0 || lessonIndex === (lessons as any[]).length - 1;

  const goLesson = (step: number) => {
    if (flatIndex >= 0) {
      const next = flat[flatIndex + step];
      if (!next) return;
      if (next.moduleId !== activeModuleId) {
        pendingLessonId.current = next.lessonId;
        setActiveModuleId(next.moduleId);
      } else {
        setActiveLessonId(next.lessonId);
      }
    } else {
      const next = (lessons as any[])[lessonIndex + step];
      if (next) setActiveLessonId(next.id);
    }
    setScrollSignal((value) => value + 1);
  };

  if (isLoadingCourse || isLoadingEnrollments) {
    return (
      <DashboardLayout>
        <div className="scp">
          <div className="scp-page-skeleton" aria-busy="true">
            <div />
            <div />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="scp">
          <div className="scp-miss">
            <BookOpen aria-hidden />
            <h2>Course not found</h2>
            <p>The course you're looking for doesn't exist or you don't have access to it.</p>
            <Link href="/student/my-courses" className="scp-back">
              Back to My Courses
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const moduleNumber = (modules as any[]).findIndex((module) => module.id === activeModuleId) + 1;
  const kind = String(activeLesson?.contentType || "").toLowerCase();
  const kindLabel = kind === "video" ? "Video lesson" : kind === "quiz" ? "Quiz" : "Document";
  const lessonWords = String(activeLesson?.title || "").trim().split(/\s+/);
  const lessonLast = lessonWords.pop() || "";
  const lessonRest = lessonWords.join(" ");
  const kindTone = kind === "video" ? "cyan" : kind === "quiz" ? "violet" : "amber";
  const completed = activeLesson ? isLessonCompleted(activeLesson.id) : false;
  const firstName = getFirstName(`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "there");
  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() || "U";

  return (
    <DashboardLayout>
      <div className="scp">
        <CourseHero
          greeting={getTimeGreeting().text}
          name={firstName}
          photo={getProfilePhotoSrc(user?.profilePhoto)}
          initials={initials}
          title={(course as any).title}
          difficulty={(course as any).difficulty}
          category={(course as any).category}
          access={(course as any).isEnrollmentRequired ? "Restricted" : "Open"}
          progress={enrollment ? calculateProgress() : null}
          tab={activeTab}
          onTab={setActiveTab}
        />

        {activeTab === "overview" && (
          <div
            className="scp-panel scp-overview"
            role="tabpanel"
            id="scp-panel-overview"
            aria-labelledby="scp-tab-overview"
          >
            <section className="scp-block scp-about">
              <h2>About this course</h2>
              <p className="scp-about-text">{(course as any).description}</p>
              <dl className="scp-about-stats">
                <div>
                  <dt>Modules</dt>
                  <dd>{(modules as any[]).length}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{(course as any).duration ?? 12} wks</dd>
                </div>
                <div>
                  <dt>Level</dt>
                  <dd>{(course as any).difficulty || "All levels"}</dd>
                </div>
              </dl>
              <h3>What you&apos;ll learn</h3>
              <ul className="scp-learn-list">
                <li>Core concepts and fundamentals</li>
                <li>Practical application of skills</li>
                <li>Advanced techniques and best practices</li>
              </ul>
              <button type="button" className="scp-start" onClick={() => setActiveTab("content")}>
                Start learning
              </button>
            </section>
            <section className="scp-block scp-structure-wrap">
              <div className="scp-structure-head">
                <h2>
                  Course <i>structure</i>
                </h2>
                <p>Tap a module to jump into Course content.</p>
              </div>
              {isLoadingModules ? (
                <div className="scp-skeletons scp-structure-grid" aria-busy="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              ) : (modules as any[]).length === 0 ? (
                <p className="scp-note">No modules available yet.</p>
              ) : (
                <div className="scp-structure-grid slim-scroll">
                  {(modules as any[]).map((module, index) => (
                    <button
                      key={module.id}
                      type="button"
                      className="scp-structure-item"
                      title={module.title}
                      onClick={() => {
                        setActiveModuleId(module.id);
                        setActiveTab("content");
                        setScrollSignal((value) => value + 1);
                      }}
                    >
                      <span className="scp-structure-num">{index + 1}</span>
                      <span className="scp-structure-title">{module.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "content" && (
          <div className="scp-panel" role="tabpanel" id="scp-panel-content" aria-labelledby="scp-tab-content">
            <div className="scp-stage">
              <ModulePanel
                modules={panelModules}
                loading={isLoadingModules || Boolean(enrollment && isLoadingProgress)}
                activeModuleId={activeModuleId}
                activeLessonId={activeLessonId}
                scrollSignal={scrollSignal}
                onSelectModule={setActiveModuleId}
                onSelectLesson={setActiveLessonId}
              />
              <div className="scp-col">
                {!activeModuleId ? (
                  <div className="scp-card scp-miss">
                    <BookOpen aria-hidden />
                    <h3>Select a module</h3>
                    <p>Choose a module from the list to start learning</p>
                  </div>
                ) : isLoadingLessons && !activeLesson ? (
                  <PlayerFrame kind="loading" />
                ) : !activeLesson ? (
                  <div className="scp-card scp-miss">
                    <p>No lessons yet</p>
                  </div>
                ) : (
                  <>
                    {kind === "video" ? (
                      <PlayerFrame kind="video">
                        <VideoComponent videoUrl={activeLesson.content} />
                      </PlayerFrame>
                    ) : kind === "quiz" ? (
                      <PlayerFrame kind="quiz">
                        {(() => {
                          const hasDraft = !!activeModuleId && hasQuizDraft(courseId, activeModuleId, activeLesson.id);
                          const attempts = activeModuleId ? getQuizAttempts(courseId, activeModuleId, activeLesson.id) : 0;
                          void draftTick;
                          const ctaLabel = hasDraft ? "Continue Test" : attempts > 0 ? "Retake Test" : "Start Test";
                          const draft = activeModuleId && loadQuizDraft(courseId, activeModuleId, activeLesson.id);
                          const timeLabel = draft
                            ? `${Math.floor(draft.timeLeftSeconds / 60)}:${(draft.timeLeftSeconds % 60).toString().padStart(2, "0")} remaining`
                            : activeLesson.duration && activeLesson.duration > 0
                              ? `${activeLesson.duration} min limit`
                              : "15 min limit";
                          return (
                            <>
                              <div className="scp-exam">
                                <div>
                                  <h3>{activeLesson.title}</h3>
                                  <p>MCQ Assignment — opens in a secure new tab</p>
                                </div>
                                <span className={`scp-badge ${hasDraft ? "amber" : attempts > 0 ? "green" : "neutral"}`}>
                                  {hasDraft ? "In progress" : attempts > 0 ? `Attempted (${attempts})` : "Not taken"}
                                </span>
                              </div>
                              <p className="scp-note">
                                <FileText aria-hidden /> {parseLessonQuizData(activeLesson)?.questions?.length ?? 0} questions
                                {" · "}
                                <Clock aria-hidden /> {timeLabel}
                              </p>
                              <button
                                type="button"
                                className="scp-open"
                                onClick={() => {
                                  if (!activeModuleId) return;
                                  window.open(`/student/quiz/${courseId}/${activeModuleId}/${activeLesson.id}`, "_blank", "noopener,noreferrer");
                                }}
                              >
                                <Play aria-hidden />
                                {ctaLabel}
                              </button>
                            </>
                          );
                        })()}
                      </PlayerFrame>
                    ) : documentUrl ? (
                      <PlayerFrame kind="doc">
                        <h3>{activeLesson.title}</h3>
                        <p className="scp-note">Documentation — opens in a new tab</p>
                        <iframe src={documentUrl} title={activeLesson.title} />
                        <button type="button" className="scp-open" onClick={() => window.open(documentUrl, "_blank", "noopener,noreferrer")}>
                          <ExternalLink aria-hidden />
                          Open Document
                        </button>
                      </PlayerFrame>
                    ) : (
                      <PlayerFrame kind="doc">
                        <div dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
                      </PlayerFrame>
                    )}

                    {kind === "video" && (
                      <div className="scp-note">
                        <div dangerouslySetInnerHTML={{ __html: activeLesson.description || "No additional description provided." }} />
                      </div>
                    )}
                    {documentUrl && activeLesson.description ? (
                      <div className="scp-note">
                        <div dangerouslySetInnerHTML={{ __html: activeLesson.description }} />
                      </div>
                    ) : null}

                    <div className="scp-after">
                      <div className="scp-after-top">
                        <div className="scp-meta">
                          <span className={`scp-kind ${kindTone}`}>{kindLabel}</span>
                          <span>Module {moduleNumber} · Lesson {Math.max(lessonIndex + 1, 1)} of {(lessons as any[]).length}</span>
                        </div>
                        <LessonActions
                          completed={completed}
                          showComplete={kind !== "quiz"}
                          pending={updateProgressMutation.isPending}
                          atStart={atStart}
                          atEnd={atEnd}
                          onComplete={() => markLessonComplete(activeLesson.id)}
                          onPrevious={() => goLesson(-1)}
                          onNext={() => goLesson(1)}
                        />
                      </div>
                      <h2>
                        {lessonRest ? `${lessonRest} ` : ""}
                        <i>{lessonLast}</i>
                      </h2>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "exams" && (
          <div className="scp-panel" role="tabpanel" id="scp-panel-exams" aria-labelledby="scp-tab-exams">
            <section className="scp-block">
              <h2>
                <ClipboardList aria-hidden /> Course exams
              </h2>
              <p>Written exams for this course open in a new tab. Each exam can be submitted only once.</p>
              {courseExams.length === 0 ? (
                <p>No exams published for this course yet.</p>
              ) : (
                courseExams.map((exam) => {
                  const attempted = (examAttempts as any[]).some((a) => Number(a.examId) === Number(exam.id) && a.completedAt);
                  const inProgress = (examAttempts as any[]).some((a) => Number(a.examId) === Number(exam.id) && !a.completedAt);
                  const closed = exam.acceptingResponses === false;
                  const canStart = !attempted && !closed;
                  const label = attempted ? "Attempted" : closed ? "Unavailable" : inProgress ? "Continue Exam" : "Start Exam";
                  return (
                    <div key={exam.id} className="scp-exam">
                      <div>
                        <strong>{exam.title}</strong>
                        <p>
                          {exam.description || "No description"}
                          {exam.duration ? ` · ${exam.duration} min` : ""}
                        </p>
                        <p>Opens in a new tab · one attempt only</p>
                      </div>
                      <div className="scp-nav">
                        <span className={`scp-badge ${attempted ? "neutral" : closed ? "rose" : inProgress ? "amber" : "green"}`}>
                          {attempted ? "Attempted" : closed ? "Closed" : inProgress ? "In progress" : "Available"}
                        </span>
                        <button
                          type="button"
                          className={canStart ? "scp-open" : "scp-prev"}
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
                            window.open(`/student/take-exam/${exam.id}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          {label}
                          {canStart ? <ExternalLink aria-hidden /> : null}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
