import { useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  Download,
  HelpCircle,
  Layers,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportsPayload = {
  summary: {
    students: number;
    batches: number;
    courses: number;
    enrollments: number;
    avgProgress: number;
    examAttempts: number;
    examAttemptsInRange: number;
    activityEvents: number;
    exams: number;
  };
  activityByDay: { date: string; count: number }[];
  completionBuckets: { completed: number; inProgress: number; notStarted: number };
  batches: {
    id: number;
    name: string;
    batchCode: string;
    studentCount: number;
    courseCount: number;
    avgProgress: number;
    isActive: boolean;
  }[];
  batchDetail: null | {
    id: number;
    name: string;
    students: { id: number; name: string; avgProgress: number }[];
    courses: { id: number; title: string; avgProgress: number }[];
  };
  courses: {
    id: number;
    title: string;
    enrolled: number;
    avgProgress: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  }[];
  exams: {
    id: number;
    title: string;
    courseTitle: string;
    attempts: number;
    completed: number;
    reviewed: number;
    attemptsInRange: number;
  }[];
  students: {
    id: number;
    name: string;
    coursesEnrolled: number;
    avgProgress: number;
    examAttempts: number;
  }[];
  range: string;
};

const CHART = {
  teal: "#0D9488",
  blue: "#2563EB",
  amber: "#D97706",
  slate: "#94A3B8",
  green: "#16A34A",
  rose: "#E11D48",
};

const PIE_COLORS = [CHART.green, CHART.amber, CHART.slate];

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</h3>
        </div>
        <div className={cn("rounded-xl p-2.5", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const { toast } = useToast();

  const batchQuery =
    selectedBatchId !== "all" ? `&batchId=${selectedBatchId}` : "";

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ReportsPayload>({
    queryKey: [`/api/admin/reports?range=${dateRange}${batchQuery}`],
  });

  const summary = data?.summary;
  const activityByDay = data?.activityByDay || [];
  const batches = data?.batches || [];
  const courses = data?.courses || [];
  const exams = data?.exams || [];
  const students = data?.students || [];
  const batchDetail = data?.batchDetail;

  const completionPie = useMemo(() => {
    const buckets = data?.completionBuckets;
    if (!buckets) return [];
    return [
      { name: "Completed", value: buckets.completed, color: CHART.green },
      { name: "In Progress", value: buckets.inProgress, color: CHART.amber },
      { name: "Not Started", value: buckets.notStarted, color: CHART.slate },
    ].filter((d) => d.value > 0);
  }, [data?.completionBuckets]);

  const courseCompare = useMemo(
    () =>
      courses.slice(0, 8).map((c) => ({
        name: c.title.length > 18 ? `${c.title.slice(0, 16)}…` : c.title,
        fullName: c.title,
        enrolled: c.enrolled,
        avgProgress: c.avgProgress,
      })),
    [courses]
  );

  const examCompare = useMemo(
    () =>
      exams.slice(0, 8).map((e) => ({
        name: e.title.length > 16 ? `${e.title.slice(0, 14)}…` : e.title,
        fullName: e.title,
        attempts: e.attempts,
        completed: e.completed,
        reviewed: e.reviewed,
      })),
    [exams]
  );

  const batchBars = useMemo(
    () =>
      batches.map((b) => ({
        name: b.name.length > 14 ? `${b.name.slice(0, 12)}…` : b.name,
        fullName: b.name,
        students: b.studentCount,
        avgProgress: b.avgProgress,
        courses: b.courseCount,
      })),
    [batches]
  );

  const studentProgressBars = useMemo(
    () =>
      students.slice(0, 10).map((s) => ({
        name: s.name.length > 16 ? `${s.name.slice(0, 14)}…` : s.name,
        fullName: s.name,
        avgProgress: s.avgProgress,
        examAttempts: s.examAttempts,
        coursesEnrolled: s.coursesEnrolled,
      })),
    [students]
  );

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Reports refreshed",
      description: "Analytics data has been updated.",
    });
  };

  const handleExport = () => {
    if (!data) return;
    const lines = [
      "Section,Name,Metric,Value",
      ...batches.map((b) => `Batch,${JSON.stringify(b.name)},Students,${b.studentCount}`),
      ...courses.map((c) => `Course,${JSON.stringify(c.title)},AvgProgress,${c.avgProgress}`),
      ...exams.map((e) => `Exam,${JSON.stringify(e.title)},Attempts,${e.attempts}`),
      ...students.map((s) => `Student,${JSON.stringify(s.name)},AvgProgress,${s.avgProgress}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lms-reports-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Report exported",
      description: "CSV download started.",
    });
  };

  return (
    <DashboardLayout>
      <Header title="Reports & Analytics" />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card sm:w-44">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-xl bg-accent-brand text-white hover:opacity-95"
            onClick={handleExport}
            disabled={!data}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Students"
              value={summary?.students ?? 0}
              icon={Users}
              tone="bg-teal-100 text-teal-700"
            />
            <KpiCard
              label="Batches"
              value={summary?.batches ?? 0}
              icon={Layers}
              tone="bg-sky-100 text-sky-700"
            />
            <KpiCard
              label="Enrollments"
              value={summary?.enrollments ?? 0}
              icon={Award}
              tone="bg-amber-100 text-amber-700"
            />
            <KpiCard
              label="Avg Progress"
              value={`${summary?.avgProgress ?? 0}%`}
              icon={Activity}
              tone="bg-emerald-100 text-emerald-700"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-border bg-card p-1">
              <TabsTrigger value="overview" className="rounded-xl gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="batches" className="rounded-xl gap-1.5">
                <Layers className="h-4 w-4" />
                Batches
              </TabsTrigger>
              <TabsTrigger value="courses" className="rounded-xl gap-1.5">
                <BookOpen className="h-4 w-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="exams" className="rounded-xl gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Exams
              </TabsTrigger>
              <TabsTrigger value="students" className="rounded-xl gap-1.5">
                <Users className="h-4 w-4" />
                Students
              </TabsTrigger>
              <TabsTrigger value="mcq" className="rounded-xl gap-1.5">
                <HelpCircle className="h-4 w-4" />
                MCQ
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="border-border/80 shadow-sm xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Platform Activity</CardTitle>
                    <CardDescription>
                      Daily activity events for the selected range (logins, lessons, exams).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activityByDay.some((d) => d.count > 0) ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={activityByDay}>
                          <defs>
                            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART.teal} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={CHART.teal} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Events"
                            stroke={CHART.teal}
                            fill="url(#activityFill)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No activity in this date range yet." />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Course Completion</CardTitle>
                    <CardDescription>Enrollment progress buckets across all courses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {completionPie.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={completionPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {completionPie.map((entry, i) => (
                              <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No enrollment progress data yet." />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Courses"
                  value={summary?.courses ?? 0}
                  icon={BookOpen}
                  tone="bg-teal-100 text-teal-700"
                />
                <KpiCard
                  label="Exams"
                  value={summary?.exams ?? 0}
                  icon={ClipboardList}
                  tone="bg-sky-100 text-sky-700"
                />
                <KpiCard
                  label="Exam Attempts"
                  value={summary?.examAttempts ?? 0}
                  icon={Activity}
                  tone="bg-amber-100 text-amber-700"
                />
              </div>
            </TabsContent>

            {/* Batches */}
            <TabsContent value="batches" className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Compare batch size and average course progress. Select a batch for student detail.
                </p>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-full rounded-xl sm:w-56">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All batches</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Students per Batch</CardTitle>
                    <CardDescription>Column chart of membership counts.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {batchBars.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={batchBars}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number, _name, item) => [
                              value,
                              item?.payload?.fullName || "Students",
                            ]}
                          />
                          <Bar dataKey="students" name="Students" fill={CHART.teal} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No batches yet. Create a batch to see charts." />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Batch Avg Progress</CardTitle>
                    <CardDescription>Average enrollment progress across batch courses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {batchBars.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={batchBars}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar
                            dataKey="avgProgress"
                            name="Avg Progress %"
                            fill={CHART.blue}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No batch progress to compare yet." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {selectedBatchId !== "all" && batchDetail ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Card className="border-border/80 shadow-sm">
                    <CardHeader>
                      <CardTitle>{batchDetail.name} — Students</CardTitle>
                      <CardDescription>Average progress on this batch’s courses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {batchDetail.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No students enrolled in this batch.</p>
                      ) : (
                        batchDetail.students.map((s) => (
                          <div key={s.id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-medium text-foreground">{s.name}</span>
                              <span className="shrink-0 text-muted-foreground">{s.avgProgress}%</span>
                            </div>
                            <Progress value={s.avgProgress} className="h-2" />
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 shadow-sm">
                    <CardHeader>
                      <CardTitle>{batchDetail.name} — Courses</CardTitle>
                      <CardDescription>Average progress of batch members per course.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {batchDetail.courses.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={batchDetail.courses} layout="vertical" margin={{ left: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <YAxis
                              type="category"
                              dataKey="title"
                              width={110}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip />
                            <Bar dataKey="avgProgress" name="Avg %" fill={CHART.amber} radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart message="This batch has no linked courses." />
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : selectedBatchId !== "all" ? (
                <EmptyChart message="Loading batch detail…" />
              ) : (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Batch Directory</CardTitle>
                    <CardDescription>Quick snapshot of all batches.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {batches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No batches found.</p>
                    ) : (
                      batches.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.batchCode}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full">
                              {b.studentCount} students
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {b.courseCount} courses
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {b.avgProgress}% avg
                            </Badge>
                            <Badge
                              className={cn(
                                "rounded-full",
                                b.isActive
                                  ? "border-green-200 bg-green-100 text-green-800"
                                  : "border-gray-200 bg-gray-100 text-gray-700"
                              )}
                            >
                              {b.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Courses */}
            <TabsContent value="courses" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="border-border/80 shadow-sm xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Course Comparison</CardTitle>
                    <CardDescription>Enrolled students vs average progress %.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseCompare.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={courseCompare}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="enrolled"
                            name="Enrolled"
                            fill={CHART.teal}
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="avgProgress"
                            name="Avg Progress %"
                            fill={CHART.blue}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No courses to compare yet." />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Completion Status</CardTitle>
                    <CardDescription>How enrollments are progressing overall.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {completionPie.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={completionPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                          >
                            {completionPie.map((entry, i) => (
                              <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No completion data yet." />
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Course Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No courses found.</p>
                  ) : (
                    courses.map((c) => (
                      <div
                        key={c.id}
                        className="grid gap-2 rounded-xl border border-border/70 px-4 py-3 sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.enrolled} enrolled · {c.completed} completed · {c.inProgress} in
                            progress · {c.notStarted} not started
                          </p>
                        </div>
                        <div className="flex min-w-[140px] flex-col justify-center gap-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Avg progress</span>
                            <span>{c.avgProgress}%</span>
                          </div>
                          <Progress value={c.avgProgress} className="h-2" />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exams */}
            <TabsContent value="exams" className="space-y-6">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Exam Comparison</CardTitle>
                  <CardDescription>
                    Attempts vs submitted vs graded. Numeric scores are not stored yet — this shows
                    attempt lifecycle.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {examCompare.length > 0 ? (
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={examCompare}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="attempts" name="Started" fill={CHART.slate} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" name="Submitted" fill={CHART.teal} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reviewed" name="Graded" fill={CHART.blue} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No exams yet." />
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Total Attempts"
                  value={summary?.examAttempts ?? 0}
                  icon={ClipboardList}
                  tone="bg-slate-100 text-slate-700"
                />
                <KpiCard
                  label={`Attempts (${dateRange})`}
                  value={summary?.examAttemptsInRange ?? 0}
                  icon={Activity}
                  tone="bg-teal-100 text-teal-700"
                />
                <KpiCard
                  label="Exams"
                  value={summary?.exams ?? 0}
                  icon={BookOpen}
                  tone="bg-sky-100 text-sky-700"
                />
              </div>
            </TabsContent>

            {/* Students */}
            <TabsContent value="students" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Top Students by Progress</CardTitle>
                    <CardDescription>Average course progress across enrollments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studentProgressBars.length > 0 ? (
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={studentProgressBars} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="avgProgress"
                            name="Avg Progress %"
                            fill={CHART.teal}
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No student progress data yet." />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Exam Attempt Activity</CardTitle>
                    <CardDescription>How many exam attempts each top student has.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studentProgressBars.some((s) => s.examAttempts > 0) ? (
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={studentProgressBars} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="examAttempts"
                            name="Exam Attempts"
                            fill={CHART.amber}
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No exam attempts from these students yet." />
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Student Ranking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students found.</p>
                  ) : (
                    students.map((s, idx) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.coursesEnrolled} courses · {s.examAttempts} exam attempts
                            </p>
                          </div>
                        </div>
                        <Badge className="rounded-full border-teal-200 bg-teal-50 text-teal-800">
                          {s.avgProgress}% avg
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MCQ — coming soon */}
            <TabsContent value="mcq">
              <Card className="border-border/80 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
                    <HelpCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">MCQ analytics coming soon</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Lesson quiz (MCQ) scores are saved only on each student’s device today, so the
                    admin server cannot chart them yet. Once quiz attempts are stored in the
                    database, this tab will show comparison visuals.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}
