import { useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ActivityChart from "@/components/dashboard/activity-chart";
import PerformanceMetrics from "@/components/dashboard/performance-metrics";
import RecentActivities from "@/components/dashboard/recent-activities";
import UpcomingExams from "@/components/dashboard/upcoming-exams";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Calendar, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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
  const batchBars = (data?.batchProgress || []).map((batch) => ({
    day: batch.name,
    percentage: batch.percentage,
    count: batch.enrolled,
  }));
  const avgBatch =
    batchBars.length === 0
      ? 0
      : Math.round(batchBars.reduce((sum, batch) => sum + batch.percentage, 0) / batchBars.length);
  const courses = (data?.coursePerformance || []).map((c) => ({
    name: c.name,
    percentage: c.percentage,
  }));
  const activities = data?.recentActivities || [];
  const exams = data?.upcomingExams || [];

  const statItems = [
    {
      label: "Students",
      value: isLoading || !stats ? "—" : stats.totalStudents,
      icon: Users,
      tone: "bg-gradient-to-br from-[#0F766E] to-[#0E7490]",
    },
    {
      label: "Courses",
      value: isLoading || !stats ? "—" : stats.activeCourses,
      icon: BookOpen,
      tone: "bg-gradient-to-br from-[#14B8A6] to-[#0F766E]",
    },
    {
      label: "Exams",
      value: isLoading || !stats ? "—" : stats.publishedExams,
      icon: Calendar,
      tone: "bg-gradient-to-br from-[#0E7490] to-[#155E75]",
    },
    {
      label: "Completion",
      value: isLoading || !stats ? "—" : `${stats.avgCompletion}%`,
      icon: Target,
      tone: "bg-gradient-to-br from-[#5B7C8D] to-[#334155]",
    },
  ];

  return (
    <DashboardLayout>
      {/* Full width of main pane — no max-width island / side gaps */}
      <div className="dash-sync flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5 sm:gap-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <Card key={item.label} className="border border-[#D4DEE3] bg-white shadow-sm">
              <CardContent className="flex items-center gap-2.5 p-2.5 sm:p-3">
                <div className={cn("shrink-0 rounded-lg p-2 text-white shadow-sm", item.tone)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="truncate text-lg font-bold leading-tight text-foreground">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Equal fixed heights — lists scroll inside, no staircase gap */}
        <div className="grid min-h-[240px] flex-1 grid-cols-1 gap-2.5 lg:min-h-0 lg:grid-cols-3 lg:gap-3">
          <div className="min-h-[220px] min-w-0 overflow-hidden lg:col-span-2 lg:h-full lg:min-h-0">
            <ActivityChart
              data={batchBars}
              title="Batch progress"
              hideTimeframe
              wideBars
              changePercentage={`${avgBatch}%`}
              isPositiveChange
              summaryTitle="Batches"
              summaryHint="Average student progress"
              emptyMessage="No active batches yet."
              className="h-full"
            />
          </div>
          <div className="min-h-[220px] min-w-0 overflow-hidden lg:h-full lg:min-h-0">
            <PerformanceMetrics
              courses={courses}
              reportHref="/admin/reports"
              fillHeight
              className="h-full"
            />
          </div>
        </div>

        <div className="grid min-h-[240px] flex-1 grid-cols-1 gap-2.5 lg:min-h-0 lg:grid-cols-3 lg:gap-3">
          <div className="min-h-[220px] min-w-0 overflow-hidden lg:col-span-2 lg:h-full lg:min-h-0">
            <RecentActivities
              activities={activities}
              viewAllHref="/admin/reports"
              fillHeight
              className="h-full"
            />
          </div>
          <div className="min-h-[220px] min-w-0 overflow-hidden lg:h-full lg:min-h-0">
            <UpcomingExams
              exams={exams}
              examListHref="/admin/exams"
              scheduleLabel="Manage Exams"
              fillHeight
              className="h-full"
              onScheduleExam={() => {
                window.location.href = "/admin/exams";
              }}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
