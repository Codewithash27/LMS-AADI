import { useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/dashboard/stat-card";
import PerformanceMetrics from "@/components/dashboard/performance-metrics";
import RecentActivities from "@/components/dashboard/recent-activities";
import UpcomingExams from "@/components/dashboard/upcoming-exams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  GraduationCap,
  Clock,
  ArrowUpRight,
  Mail,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

type ActivityType = "new-course" | "exam-results" | "deadline" | "new-students" | "progress";

function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/user"],
    enabled: !!user,
  });

  const { data: allCourses = [], isLoading: isLoadingCourses } = useQuery<any[]>({
    queryKey: ["/api/courses"],
    enabled: !!user,
  });

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ["/api/exams"],
    enabled: !!user,
  });

  const { data: examAttempts = [] } = useQuery<any[]>({
    queryKey: ["/api/exam-attempts/user"],
    enabled: !!user,
  });

  const { data: activityLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/activity-logs/user"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const logActivity = async () => {
      try {
        await apiRequest("POST", "/api/activity-logs", {
          activityType: "dashboard_view",
          resourceId: 0,
          resourceType: "dashboard",
        });
      } catch {
        // Activity logging should not disrupt the dashboard
      }
    };
    logActivity();
  }, [user]);

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((enrollment) => Number(enrollment.courseId))),
    [enrollments]
  );

  const enrolledCourses = useMemo(
    () => allCourses.filter((course) => enrolledCourseIds.has(Number(course.id))),
    [allCourses, enrolledCourseIds]
  );

  const courseById = useMemo(() => {
    const map = new Map<number, any>();
    for (const course of allCourses) map.set(Number(course.id), course);
    // Also index enrolled list in case catalog cache is filtered
    for (const course of enrolledCourses) map.set(Number(course.id), course);
    return map;
  }, [allCourses, enrolledCourses]);

  const examById = useMemo(() => {
    const map = new Map<number, any>();
    for (const exam of exams) map.set(Number(exam.id), exam);
    return map;
  }, [exams]);

  const completedCoursesCount = enrollments.filter(
    (e) => e.completedAt || Number(e.progress || 0) >= 100
  ).length;

  const avgProgress = useMemo(() => {
    if (enrollments.length === 0) return 0;
    const total = enrollments.reduce((sum, e) => sum + Number(e.progress || 0), 0);
    return Math.round(total / enrollments.length);
  }, [enrollments]);

  const profileInitials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "S";

  // Real course completion for this student
  const coursePerformance = useMemo(
    () =>
      enrolledCourses.map((course) => {
        const enrollment = enrollments.find(
          (e) => Number(e.courseId) === Number(course.id)
        );
        return {
          name: course.title,
          percentage: Math.min(100, Math.max(0, Number(enrollment?.progress || 0))),
        };
      }),
    [enrolledCourses, enrollments]
  );

  // Upcoming exams = exams for assigned courses (from API), prefer open / not finished
  const upcomingExams = useMemo(() => {
    const completedExamIds = new Set(
      examAttempts
        .filter((a) => a.completedAt)
        .map((a) => Number(a.examId))
    );
    const startedExamIds = new Set(examAttempts.map((a) => Number(a.examId)));

    return exams
      .filter((exam) => enrolledCourseIds.has(Number(exam.courseId)))
      .map((exam) => {
        const course = courseById.get(Number(exam.courseId));
        const isCompleted = completedExamIds.has(Number(exam.id));
        const isStarted = startedExamIds.has(Number(exam.id));
        const isOpen = exam.acceptingResponses !== false;

        let urgency: "high" | "medium" | "low" = "low";
        let urgencyLabel = "Available";

        if (isCompleted) {
          urgency = "low";
          urgencyLabel = "Attempted";
        } else if (isStarted) {
          urgency = "medium";
          urgencyLabel = "In progress";
        } else if (isOpen) {
          urgency = "high";
          urgencyLabel = "Open";
        } else {
          urgency = "low";
          urgencyLabel = "Closed";
        }

        return {
          id: exam.id,
          title: exam.title,
          subtitle: course?.title || exam.description || "Assigned course exam",
          urgency,
          urgencyLabel,
          time: isCompleted
            ? "Submitted · one attempt used"
            : isOpen
              ? "Accepting responses"
              : "Not accepting responses",
          _sort: isCompleted ? 2 : isStarted ? 1 : 0,
          _id: Number(exam.id),
        };
      })
      .sort((a, b) => a._sort - b._sort || b._id - a._id)
      .slice(0, 5)
      .map(({ _sort, _id, ...exam }) => exam);
  }, [exams, enrolledCourseIds, courseById, examAttempts]);

  // Recent activities — name first (lesson/exam/course), action as subtitle
  const recentActivities = useMemo(() => {
    type ActivityRow = {
      id: string | number;
      type: ActivityType;
      title: string;
      description: string;
      time: string;
      colorIndex?: number;
      sortAt: number;
    };

    const rows: ActivityRow[] = [];
    let courseColor = 0;

    const resolveCourseTitle = (courseId: number, enrollment?: any) =>
      enrollment?.course?.title ||
      courseById.get(courseId)?.title ||
      `Course #${courseId}`;

    // Course assignments
    for (const enrollment of enrollments) {
      const courseId = Number(enrollment.courseId);
      const when = enrollment.enrolledAt ? new Date(enrollment.enrolledAt).getTime() : 0;
      rows.push({
        id: `enroll-${enrollment.id}`,
        type: "new-course",
        title: resolveCourseTitle(courseId, enrollment),
        description: "Course assigned",
        time: formatRelativeTime(enrollment.enrolledAt),
        colorIndex: courseColor++,
        sortAt: when,
      });
    }

    // Activity logs (enriched by API with lessonTitle / examTitle / courseTitle)
    for (const log of activityLogs) {
      if (log.activityType === "dashboard_view") continue;

      const when = log.timestamp ? new Date(log.timestamp).getTime() : 0;
      let type: ActivityType = "deadline";
      let title = "Activity";
      let description = "";
      let colorIndex: number | undefined;

      if (log.activityType === "course_assign" || log.activityType === "course_enroll") {
        type = "new-course";
        title =
          log.courseTitle ||
          resolveCourseTitle(Number(log.resourceId));
        description = "Course assigned";
        colorIndex = courseColor++;
      } else if (log.activityType === "lesson_complete") {
        type = "progress";
        title =
          log.lessonTitle ||
          log.courseTitle ||
          resolveCourseTitle(Number(log.resourceId));
        description = log.lessonTitle && log.courseTitle
          ? `Lesson completed · ${log.courseTitle}`
          : "Lesson completed";
      } else if (log.activityType === "exam_start") {
        const exam = examById.get(Number(log.resourceId));
        type = "deadline";
        title = log.examTitle || exam?.title || `Exam #${log.resourceId}`;
        description = log.courseTitle
          ? `Exam started · ${log.courseTitle}`
          : exam?.courseId
            ? `Exam started · ${resolveCourseTitle(Number(exam.courseId))}`
            : "Exam started";
      } else if (log.activityType === "exam_complete") {
        const exam = examById.get(Number(log.resourceId));
        type = "exam-results";
        title = log.examTitle || exam?.title || `Exam #${log.resourceId}`;
        description = log.courseTitle
          ? `Exam submitted · ${log.courseTitle}`
          : exam?.courseId
            ? `Exam submitted · ${resolveCourseTitle(Number(exam.courseId))}`
            : "Exam submitted";
      } else if (log.activityType === "course_view") {
        type = "progress";
        title =
          log.courseTitle ||
          resolveCourseTitle(Number(log.resourceId));
        description = "Course viewed";
      } else {
        continue;
      }

      rows.push({
        id: `log-${log.id}`,
        type,
        title,
        description,
        time: formatRelativeTime(log.timestamp),
        colorIndex,
        sortAt: when,
      });
    }

    // Exam results / reviews
    for (const attempt of examAttempts) {
      const exam = examById.get(Number(attempt.examId));
      const examTitle = exam?.title || `Exam #${attempt.examId}`;
      const courseLabel = exam?.courseId
        ? resolveCourseTitle(Number(exam.courseId))
        : null;

      if (attempt.reviewedAt) {
        const when = new Date(attempt.reviewedAt).getTime();
        rows.push({
          id: `review-${attempt.id}`,
          type: "exam-results",
          title: examTitle,
          description: courseLabel
            ? `Results available · ${courseLabel}`
            : "Results available",
          time: formatRelativeTime(attempt.reviewedAt),
          sortAt: when,
        });
      } else if (attempt.completedAt) {
        const when = new Date(attempt.completedAt).getTime();
        rows.push({
          id: `attempt-${attempt.id}`,
          type: "exam-results",
          title: examTitle,
          description: courseLabel
            ? `Exam submitted · ${courseLabel}`
            : "Exam submitted",
          time: formatRelativeTime(attempt.completedAt),
          sortAt: when,
        });
      }
    }

    const seen = new Set<string>();
    return rows
      .sort((a, b) => b.sortAt - a.sortAt)
      .filter((row) => {
        const key = `${row.type}|${row.title}|${row.description}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map(({ sortAt, ...activity }, index) => ({
        ...activity,
        colorIndex: activity.colorIndex ?? index,
      }));
  }, [enrollments, activityLogs, examAttempts, courseById, examById]);

  const examsForWidget = useMemo(() => {
    const open = upcomingExams.filter((e) => e.urgencyLabel !== "Completed");
    return (open.length > 0 ? open : upcomingExams).slice(0, 3);
  }, [upcomingExams]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            title="Enrolled Courses"
            value={enrolledCourses.length}
            icon={<BookOpen />}
            iconColor="primary"
          />
          <StatCard
            title="Completed Courses"
            value={completedCoursesCount}
            icon={<GraduationCap />}
            iconColor="accent"
          />
          <StatCard
            title="Upcoming Exams"
            value={upcomingExams.filter((e) => e.urgencyLabel !== "Completed").length}
            icon={<Clock />}
            iconColor="secondary"
          />
        </div>

        {/* Profile | Upcoming Exams | Performance — equal height */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch">
          <Card className="flex h-full w-full flex-col overflow-hidden border border-white/20 bg-white/70 shadow-xl backdrop-blur-sm">
            <div className="shrink-0 bg-accent-brand px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/20 p-1.5">
                  <UserRound className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-sm font-semibold text-white">My Profile</p>
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                  {user?.profilePhoto ? (
                    <AvatarImage
                      src={getProfilePhotoSrc(user.profilePhoto) || undefined}
                      alt=""
                    />
                  ) : null}
                  <AvatarFallback className="bg-brand-turquoise text-sm font-semibold text-white">
                    {profileInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {user?.role}
                  </p>
                  {user?.email ? (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-cream-muted/70 p-2">
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">{enrolledCourses.length}</p>
                  <p className="text-[10px] text-muted-foreground">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">{completedCoursesCount}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">{avgProgress}%</p>
                  <p className="text-[10px] text-muted-foreground">Avg</p>
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="font-semibold text-gray-800">{avgProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-accent-brand"
                    style={{
                      width: `${Math.max(avgProgress, avgProgress > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              <Link href="/student/profile" className="mt-auto pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full rounded-lg text-xs font-medium"
                >
                  View Profile
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <UpcomingExams
            exams={examsForWidget}
            showScheduleButton={false}
            fillHeight
            className="h-full w-full"
          />

          <PerformanceMetrics
            courses={coursePerformance}
            fillHeight
            className="h-full w-full"
          />
        </div>

        {/* My Courses — full width, compact grid */}
        <Card className="border border-white/20 bg-white/70 shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 sm:px-5">
            <div>
              <CardTitle className="text-base">My Courses</CardTitle>
              <CardDescription>Continue where you left off</CardDescription>
            </div>
            <Link href="/student/my-courses">
              <Button variant="outline" size="sm" className="shrink-0 gap-1">
                View All
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-5">
            {isLoadingEnrollments || isLoadingCourses ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-warm-border p-3">
                    <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
                    <div className="mb-3 h-3 w-full rounded bg-gray-200" />
                    <div className="h-2 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div className="py-6 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <h3 className="mb-1 text-sm font-semibold text-gray-900">No courses assigned</h3>
                <p className="text-xs text-gray-500">
                  Your administrator will assign courses to your account.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {enrolledCourses.slice(0, 3).map((course: any) => {
                  const enrollment = enrollments.find(
                    (e) => Number(e.courseId) === Number(course.id)
                  );
                  const progress = enrollment?.progress || 0;
                  const thumb = getCourseThumbnailSrc(course.thumbnail);

                  return (
                    <div
                      key={course.id}
                      className="flex flex-col rounded-xl border border-warm-border/80 bg-white/80 p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0F766E]/15">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-[#0F766E]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-gray-900">
                            {course.title}
                          </h3>
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                            {course.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="shrink-0 text-[11px] font-medium text-gray-600">
                          {progress}%
                        </span>
                      </div>
                      <Link href={`/student/my-courses/${course.id}`} className="mt-3">
                        <Button size="sm" variant="outline" className="h-8 w-full gap-1 text-xs">
                          Continue
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <RecentActivities
          activities={recentActivities}
          className="w-full"
          listMaxHeightClass="max-h-[220px] overflow-y-auto"
        />
      </div>
    </DashboardLayout>
  );
}
