import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ActivityChart from "@/components/dashboard/activity-chart";
import PerformanceMetrics from "@/components/dashboard/performance-metrics";
import RecentActivities from "@/components/dashboard/recent-activities";
import UpcomingExams from "@/components/dashboard/upcoming-exams";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Calendar, Target, ClipboardList, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
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

type Timeframe = "weekly" | "monthly" | "yearly";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");

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
  const chartData =
    timeframe === "monthly"
      ? data?.activitySeries?.monthly || []
      : timeframe === "yearly"
        ? data?.activitySeries?.yearly || []
        : data?.activitySeries?.weekly || [];

  const weekChange = data?.weekChangePct ?? 0;
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
      <div className="flex w-full min-w-0 flex-col gap-2.5 sm:gap-3">
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
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-3">
          <div className="min-w-0 h-[300px] lg:col-span-2 sm:h-[320px]">
            <ActivityChart
              data={chartData}
              changePercentage={`${Math.abs(weekChange)}%`}
              isPositiveChange={weekChange >= 0}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              className="h-full"
            />
          </div>
          <div className="min-w-0 h-[300px] sm:h-[320px]">
            <PerformanceMetrics
              courses={courses}
              reportHref="/admin/reports"
              fillHeight
              className="h-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-3">
          <div className="min-w-0 h-[280px] lg:col-span-2 sm:h-[300px]">
            <RecentActivities
              activities={activities}
              viewAllHref="/admin/reports"
              fillHeight
              className="h-full"
            />
          </div>
          <div className="min-w-0 h-[280px] sm:h-[300px]">
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              href: "/admin/courses",
              label: "Courses",
              icon: BookOpen,
              tone: "from-[#0F766E]/15 to-[#0E7490]/10 text-[#0E7490]",
            },
            {
              href: "/admin/exams",
              label: "Exams",
              icon: ClipboardList,
              tone: "from-teal-100 to-cyan-50 text-teal-800",
            },
            {
              href: "/admin/reports",
              label: "Reports",
              icon: BarChart3,
              tone: "from-slate-100 to-slate-50 text-slate-700",
            },
            {
              href: "/admin/students",
              label: "Students",
              icon: Users,
              tone: "from-cyan-100 to-teal-50 text-cyan-800",
            },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="cursor-pointer border border-[#D4DEE3] bg-white shadow-sm transition hover:shadow-md">
                <CardContent
                  className={cn(
                    "flex flex-col items-center gap-1 bg-gradient-to-br py-2.5 sm:py-3",
                    a.tone
                  )}
                >
                  <a.icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
