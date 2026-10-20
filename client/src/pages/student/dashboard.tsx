import { useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { CourseGauge } from "@/components/dashboard/CourseGauge";
import { CourseRow } from "@/components/dashboard/CourseRow";
import { DashSkeleton, DashboardShell, EmptyNote } from "@/components/dashboard/DashboardShell";
import { ExamCard } from "@/components/dashboard/ExamCard";
import { PageGreeting } from "@/components/dashboard/PageGreeting";
import { StatCard } from "@/components/dashboard/stat-card";
import { TickRing } from "@/components/dashboard/TickRing";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import { getFirstName, getTimeGreeting } from "@/lib/greeting";

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

  const { data: exams = [], isLoading: isLoadingExams } = useQuery<any[]>({
    queryKey: ["/api/exams"],
    enabled: !!user,
  });

  const { data: examAttempts = [], isLoading: isLoadingAttempts } = useQuery<any[]>({
    queryKey: ["/api/exam-attempts/user"],
    enabled: !!user,
  });

  const { data: activityLogs = [], isLoading: isLoadingActivity } = useQuery<any[]>({
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

  const gaugeTones = ["green", "rose", "violet"] as const;
  const firstName = getFirstName(`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "there");
  const loadingCourses = isLoadingEnrollments || isLoadingCourses;
  const loadingExams = isLoadingExams || isLoadingAttempts;

  return (
    <DashboardLayout>
      <DashboardShell>
        <PageGreeting
          workspace="Student"
          greeting={getTimeGreeting().text}
          firstName={firstName}
          photo={getProfilePhotoSrc(user?.profilePhoto)}
          initials={profileInitials}
          profileHref="/student/profile"
        />

        <div className="dsh-row a">
          <article className="dsh-card dsh-glow dsh-profile">
            <span className="k">My profile</span>
            {loadingCourses ? (
              <DashSkeleton tall />
            ) : (
              <>
                <div className="dsh-who">
                  {getProfilePhotoSrc(user?.profilePhoto) ? (
                    <img src={getProfilePhotoSrc(user?.profilePhoto) || ""} alt="" />
                  ) : (
                    <span>{profileInitials}</span>
                  )}
                  <div>
                    <h2>{user?.firstName} {user?.lastName}</h2>
                    <p>{user?.email || user?.username}</p>
                  </div>
                </div>
                <TickRing
                  value={avgProgress}
                  size={250}
                  figure={`${avgProgress}%`}
                  caption="Average progress"
                  label="Average progress"
                />
                <p className="dsh-foot">
                  {enrolledCourses.length} courses
                  <span>{completedCoursesCount} completed</span>
                </p>
              </>
            )}
          </article>

          <div className="dsh-stack">
            <div className="dsh-kpis">
              {loadingCourses || loadingExams ? (
                <>
                  <DashSkeleton /><DashSkeleton /><DashSkeleton />
                </>
              ) : (
                <>
                  <StatCard label="Enrolled courses" value={enrolledCourses.length} hint="Assigned to you" tone="violet" />
                  <StatCard label="Completed courses" value={completedCoursesCount} hint="Finished" tone="cyan" />
                  <StatCard
                    label="Upcoming exams"
                    value={upcomingExams.filter((exam) => exam.urgencyLabel !== "Attempted").length}
                    hint="Still open"
                    tone="amber"
                  />
                </>
              )}
            </div>
            <article className="dsh-card">
              <div className="dsh-card-head">
                <h2>Course <i>performance</i></h2>
              </div>
              {loadingCourses ? (
                <DashSkeleton />
              ) : coursePerformance.length === 0 ? (
                <EmptyNote>No courses assigned yet. Ask your administrator.</EmptyNote>
              ) : (
                <div className="dsh-gauges">
                  {coursePerformance.slice(0, 3).map((course, index) => (
                    <CourseGauge
                      key={course.name}
                      name={course.name}
                      percentage={course.percentage}
                      tone={gaugeTones[index % 3]}
                    />
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>

        <div className="dsh-row c">
          <article className="dsh-card">
            <div className="dsh-card-head">
              <h2>My <i>courses</i></h2>
              <Link href="/student/my-courses">All courses →</Link>
            </div>
            {loadingCourses ? (
              <DashSkeleton />
            ) : enrolledCourses.length === 0 ? (
              <EmptyNote>
                No courses assigned yet. Ask your administrator.
              </EmptyNote>
            ) : (
              enrolledCourses.slice(0, 3).map((course: any, index: number) => {
                const enrollment = enrollments.find((item) => Number(item.courseId) === Number(course.id));
                return (
                  <CourseRow
                    key={course.id}
                    href={`/student/my-courses/${course.id}`}
                    title={course.title}
                    progress={Number(enrollment?.progress || 0)}
                    thumbnail={getCourseThumbnailSrc(course.thumbnail)}
                    tone={index}
                    level={course.difficulty}
                  />
                );
              })
            )}
          </article>

          <article className="dsh-card">
            <div className="dsh-card-head">
              <h2>Upcoming <i>exams</i></h2>
              <Link href="/student/upcoming-exams">All exams →</Link>
            </div>
            {loadingExams ? (
              <DashSkeleton />
            ) : examsForWidget.length === 0 ? (
              <EmptyNote>No exams assigned yet.</EmptyNote>
            ) : (
              examsForWidget.map((exam) => {
                const open = exam.urgencyLabel === "Open" || exam.urgencyLabel === "In progress";
                return (
                  <ExamCard
                    key={exam.id}
                    title={exam.title}
                    detail={`${exam.subtitle} · ${exam.time}`}
                    open={open}
                    status={exam.urgencyLabel}
                    action={open ? <Link href={`/student/take-exam/${exam.id}`} className="dsh-btn ghost">Take exam</Link> : null}
                  />
                );
              })
            )}
          </article>
        </div>

        <article className="dsh-card">
          <div className="dsh-card-head">
            <h2>Recent <i>activity</i></h2>
            <Link href="/student/results">Results & progress →</Link>
          </div>
          {isLoadingActivity ? (
            <DashSkeleton />
          ) : recentActivities.length === 0 ? (
            <EmptyNote>No activity yet.</EmptyNote>
          ) : (
            <ActivityTimeline
              items={recentActivities.slice(0, 3).map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                time: item.time,
                tone: item.type === "exam-results" ? "green" : item.type === "new-course" ? "violet" : item.type === "progress" ? "lime" : "amber",
              }))}
            />
          )}
        </article>
      </DashboardShell>
    </DashboardLayout>
  );
}
