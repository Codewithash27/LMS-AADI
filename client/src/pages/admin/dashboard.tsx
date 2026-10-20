import { useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { CapsuleProgress } from "@/components/dashboard/CapsuleProgress";
import { DashSkeleton, DashboardShell, EmptyNote } from "@/components/dashboard/DashboardShell";
import { ExamCard } from "@/components/dashboard/ExamCard";
import { PageGreeting } from "@/components/dashboard/PageGreeting";
import { StatCard } from "@/components/dashboard/stat-card";
import { TickRing } from "@/components/dashboard/TickRing";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getFirstName, getTimeGreeting } from "@/lib/greeting";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

type DashboardPayload = {
  stats: {
    totalStudents: number;
    activeCourses: number;
    totalExams: number;
    publishedExams: number;
    closedExams: number;
    totalEnrollments: number;
    avgCompletion: number;
    activityEvents: number;
  };
  coursePerformance: { id: number; name: string; percentage: number; enrolled: number }[];
  batchProgress?: { id: number; name: string; percentage: number; enrolled: number }[];
  activitySeries: {
    weekly: { day: string; percentage: number; count: number; isCurrentDay?: boolean }[];
    monthly: { day: string; percentage: number; count: number }[];
    yearly: { day: string; percentage: number; count: number }[];
  };
  weekChangePct: number;
  thisWeekCount: number;
  prevWeekCount: number;
  recentActivities: {
    id: number;
    type: "new-course" | "exam-results" | "deadline" | "new-students" | "progress";
    title: string;
    description: string;
    time: string;
  }[];
  upcomingExams: {
    id: number;
    title: string;
    subtitle: string;
    urgency: "high" | "medium" | "low";
    urgencyLabel: string;
    time: string;
  }[];
};

const ACTIVITY_TONE = {
  "new-course": "violet",
  "exam-results": "green",
  deadline: "amber",
  "new-students": "cyan",
  progress: "lime",
} as const;

function scoreTone(percentage: number) {
  if (percentage >= 30) return "lime";
  if (percentage >= 15) return "amber";
  return "rose";
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<DashboardPayload>({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/dashboard")).json(),
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    apiRequest("POST", "/api/activity-logs", {
      activityType: "dashboard_view",
      resourceId: 0,
      resourceType: "dashboard",
    }).catch(() => undefined);
  }, [user]);

  const stats = data?.stats;
  const batches = [...(data?.batchProgress || [])].sort(
    (a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name)
  );
  const avgBatch =
    batches.length === 0
      ? 0
      : Math.round(batches.reduce((sum, batch) => sum + batch.percentage, 0) / batches.length);
  const courses = data?.coursePerformance || [];
  const activities = data?.recentActivities || [];
  const exams = data?.upcomingExams || [];
  const firstName = getFirstName(
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "there"
  );
  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() || "A";

  return (
    <DashboardLayout>
      <DashboardShell>
        <PageGreeting
          workspace="Admin"
          greeting={getTimeGreeting().text}
          firstName={firstName}
          photo={getProfilePhotoSrc(user?.profilePhoto)}
          initials={initials}
          profileHref="/admin/profile"
        />

        <div className="dsh-row a">
          <article className="dsh-card dsh-glow dsh-complete">
            <span className="k">Overall completion</span>
            {isLoading || !stats ? (
              <DashSkeleton tall />
            ) : (
              <>
                <TickRing
                  value={stats.avgCompletion}
                  size={300}
                  figure={`${stats.avgCompletion}%`}
                  caption="Completion"
                  label="Overall completion"
                />
                <p className="dsh-foot">
                  Batches average {avgBatch}%
                  <span>{stats.totalStudents} students</span>
                </p>
              </>
            )}
          </article>

          <div className="dsh-stack">
            <div className="dsh-kpis">
              {isLoading || !stats ? (
                <>
                  <DashSkeleton /><DashSkeleton /><DashSkeleton />
                </>
              ) : (
                <>
                  <StatCard label="Students" value={stats.totalStudents} hint={`${batches.length} batches`} tone="violet" />
                  <StatCard label="Courses" value={stats.activeCourses} hint="All active" tone="cyan" />
                  <StatCard label="Exams" value={stats.totalExams} hint={`${stats.publishedExams} open now`} tone="amber" />
                </>
              )}
            </div>
            <article className="dsh-card dsh-batch-card">
              <div className="dsh-card-head">
                <h2>Batch <i>progress</i></h2>
                {batches.length > 5 ? <Link href="/admin/batches">All {batches.length} →</Link> : null}
              </div>
              {isLoading ? (
                <DashSkeleton />
              ) : batches.length === 0 ? (
                <EmptyNote>
                  No active batches yet. <Link href="/admin/batches">View batches</Link>
                </EmptyNote>
              ) : (
                <div className="dsh-scroll batches">
                  <CapsuleProgress rows={batches} average={avgBatch} />
                </div>
              )}
            </article>
          </div>
        </div>

        <div className="dsh-row b">
          <article className="dsh-card">
            <div className="dsh-card-head">
              <h2>Course <i>performance</i></h2>
              <Link href="/admin/reports">All {courses.length} →</Link>
            </div>
            {isLoading ? (
              <DashSkeleton />
            ) : courses.length === 0 ? (
              <EmptyNote>No course progress yet.</EmptyNote>
            ) : (
              <div className="dsh-scroll">
                <ul className="dsh-scores">
                  {courses.map((course) => (
                    <li key={course.id} className={scoreTone(course.percentage)}>
                      <div>
                        <span>{course.name}</span>
                        <strong>{course.percentage}%</strong>
                      </div>
                      <span className="dsh-score-bar"><i style={{ width: `${Math.max(0, Math.min(100, course.percentage))}%` }} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          <article className="dsh-card">
            <div className="dsh-card-head">
              <h2>Recent <i>activities</i></h2>
              <Link href="/admin/reports">View all</Link>
            </div>
            {isLoading ? (
              <DashSkeleton />
            ) : activities.length === 0 ? (
              <EmptyNote>No activity yet.</EmptyNote>
            ) : (
              <div className="dsh-scroll">
                <ActivityTimeline
                  items={activities.map((item) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    time: item.time,
                    tone: ACTIVITY_TONE[item.type],
                  }))}
                />
              </div>
            )}
          </article>

          <article className="dsh-card dsh-exams">
            <div className="dsh-card-head">
              <h2>Upcoming <i>exams</i></h2>
            </div>
            {isLoading ? (
              <DashSkeleton />
            ) : exams.length === 0 ? (
              <EmptyNote>No upcoming exams.</EmptyNote>
            ) : (
              <div className="dsh-scroll">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    title={exam.title}
                    detail={exam.subtitle}
                    open={exam.urgencyLabel.toLowerCase() === "open" || exam.urgency === "high"}
                    status={exam.urgencyLabel}
                  />
                ))}
              </div>
            )}
            <Link href="/admin/exams" className="dsh-btn lime">Manage exams</Link>
          </article>
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}
