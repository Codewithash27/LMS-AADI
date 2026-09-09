import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Clock,
  Calendar,
  BarChart2,
  Award,
  CheckCircle2,
  AlertCircle,
  Eye,
  Target,
  Trophy,
  BookOpen,
  FileQuestion,
  RotateCcw,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { getQuestionImageUrl, getCleanQuestionText } from "@/components/exams/exam-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  getAllQuizScores,
  getQuizScoresGrouped,
  type QuizScoreGroup,
  type QuizScoreRecord,
} from "@/lib/quiz-attempts";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Question = {
  id: number;
  text: string;
  order: number;
  examId: number;
  imageUrl?: string | null;
};

function scoreTone(percent: number) {
  if (percent >= 80) return "good";
  if (percent >= 60) return "mid";
  return "low";
}

function ScoreRing({ percent, size = 72 }: { percent: number; size?: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const tone = scoreTone(percent);
  const stroke =
    tone === "good" ? "#22c55e" : tone === "mid" ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e8e0d5" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums leading-none text-gray-900">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export default function StudentResults() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("mcq");
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [selectedMcq, setSelectedMcq] = useState<QuizScoreRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [mcqScores, setMcqScores] = useState<QuizScoreRecord[]>([]);
  const [mcqGroups, setMcqGroups] = useState<QuizScoreGroup[]>([]);

  const refreshMcqScores = useCallback(() => {
    setMcqScores(getAllQuizScores());
    setMcqGroups(getQuizScoresGrouped());
  }, []);

  useEffect(() => {
    refreshMcqScores();
    const onFocus = () => refreshMcqScores();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "lms-quiz-score-history") refreshMcqScores();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshMcqScores]);

  const { data: examAttempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["/api/exam-attempts/user"],
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["/api/exams"],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["/api/enrollments/user"],
  });

  const { data: questions } = useQuery({
    queryKey: [`/api/exams/${selectedAttempt?.examId}/questions`],
    queryFn: async () => {
      if (!selectedAttempt?.examId) return [];
      const response = await apiRequest("GET", `/api/exams/${selectedAttempt.examId}/questions`);
      return await response.json();
    },
    enabled: !!selectedAttempt?.examId,
  });

  const getExamById = (examId: number) =>
    (exams as any[]).find((exam) => exam.id === examId);

  const getCourseById = (courseId: number) =>
    (courses as any[]).find((course) => course.id === courseId);

  const formatDate = (dateString: string) =>
    format(new Date(dateString), "MMM d, yyyy h:mm a");

  const filteredMcqGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return mcqGroups;
    return mcqGroups.filter(
      (g) =>
        g.lessonTitle.toLowerCase().includes(q) ||
        g.courseTitle.toLowerCase().includes(q)
    );
  }, [mcqGroups, searchTerm]);

  const filteredAttempts = (examAttempts as any[]).filter((attempt) => {
    const exam = getExamById(attempt.examId);
    if (!exam) return false;
    const course = getCourseById(exam.courseId);
    const q = searchTerm.toLowerCase();
    return (
      exam.title.toLowerCase().includes(q) ||
      (course && course.title.toLowerCase().includes(q))
    );
  });

  const sortedAttempts = [...filteredAttempts].sort(
    (a, b) =>
      new Date(b.completedAt || b.startedAt).getTime() -
      new Date(a.completedAt || a.startedAt).getTime()
  );

  const mcqAverage =
    mcqScores.length > 0
      ? Math.round(mcqScores.reduce((acc, r) => acc + r.percent, 0) / mcqScores.length)
      : 0;
  const mcqBest =
    mcqScores.length > 0 ? Math.max(...mcqScores.map((r) => r.percent)) : 0;
  const uniqueMcqTests = new Set(
    mcqScores.map((r) => `${r.courseId}:${r.moduleId}:${r.lessonId}`)
  ).size;

  const courseProgressData = (enrollments as any[]).map((enrollment) => {
    const course = getCourseById(enrollment.courseId);
    return {
      name: course?.title || `Course ${enrollment.courseId}`,
      progress: enrollment.progress || 0,
    };
  });

  const scoreDistribution = [
    { name: "0–49%", value: 0, color: "#ef4444" },
    { name: "50–69%", value: 0, color: "#f59e0b" },
    { name: "70–89%", value: 0, color: "var(--color-primary-main)" },
    { name: "90–100%", value: 0, color: "var(--color-brand-blue)" },
  ];
  mcqScores.forEach((r) => {
    if (r.percent < 50) scoreDistribution[0].value++;
    else if (r.percent < 70) scoreDistribution[1].value++;
    else if (r.percent < 90) scoreDistribution[2].value++;
    else scoreDistribution[3].value++;
  });

  const progressData = [...mcqScores]
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      name: r.lessonTitle.substring(0, 14),
      score: r.percent,
      date: format(new Date(r.completedAt), "MMM d"),
    }));

  const openExamDetail = (attempt: any) => {
    setSelectedMcq(null);
    setSelectedAttempt(attempt);
    setIsDetailOpen(true);
  };

  const openMcqDetail = (record: QuizScoreRecord) => {
    setSelectedAttempt(null);
    setSelectedMcq(record);
    setIsDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <Header title="Results & Progress" />

      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-border bg-gradient-to-br from-brand-turquoise/15 to-brand-blue/10 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg MCQ Score</p>
                <h3 className="text-2xl font-bold tabular-nums">{mcqAverage}%</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-accent-brand shadow-sm">
                <Award className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">MCQ Attempts</p>
                <h3 className="text-2xl font-bold tabular-nums">{mcqScores.length}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {uniqueMcqTests} unique test{uniqueMcqTests === 1 ? "" : "s"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500 shadow-sm">
                <FileQuestion className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Courses Enrolled</p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {(enrollments as any[]).length}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500 shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-sky-500/10 to-brand-blue/10 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Best Score</p>
                <h3 className="text-2xl font-bold tabular-nums">{mcqBest}%</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-blue shadow-sm">
                <Trophy className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tests or courses..."
              className="pl-9 bg-white border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-5 h-auto flex-wrap gap-1 bg-white/80 border border-border p-1">
            <TabsTrigger value="mcq" className="gap-1.5">
              <Target className="h-3.5 w-3.5" />
              MCQ Scores
            </TabsTrigger>
            <TabsTrigger value="exams">Written Exams</TabsTrigger>
            <TabsTrigger value="progress">Course Progress</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ——— MCQ Scores ——— */}
          <TabsContent value="mcq" className="space-y-4">
            {filteredMcqGroups.length === 0 ? (
              <Card className="border-border bg-white/80">
                <CardContent className="py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-turquoise/15">
                    <Target className="h-7 w-7 text-brand-turquoise" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No MCQ scores yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                    Complete a quiz from one of your courses. Every attempt’s score will
                    appear here.
                  </p>
                  <Link href="/student/my-courses">
                    <Button className="bg-accent-brand text-white hover:opacity-90">
                      Go to My Courses
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMcqGroups.map((group) => (
                  <Card
                    key={group.key}
                    className="border-border bg-white/80 shadow-sm overflow-hidden"
                  >
                    <CardHeader className="pb-3 border-b border-border/60 bg-cream-subtle/40">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <ScoreRing percent={group.latest.percent} />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {group.lessonTitle}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {group.courseTitle}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="border-border font-normal"
                            >
                              {group.attempts.length} attempt
                              {group.attempts.length === 1 ? "" : "s"}
                            </Badge>
                            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 font-normal">
                              Best {group.bestPercent}%
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-normal">
                              Latest {group.latest.percent}%
                            </Badge>
                          </div>
                        </div>
                        <Link
                          href={`/student/quiz/${group.courseId}/${group.moduleId}/${group.lessonId}`}
                        >
                          <Button
                            size="sm"
                            className="bg-accent-brand text-white hover:opacity-90 gap-1.5 shrink-0"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retake
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="px-4 sm:px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border/40">
                        Attempt history
                      </div>
                      <ul className="divide-y divide-border/50">
                        {/* Newest first so latest is on top; still lists every attempt */}
                        {[...group.attempts].reverse().map((record) => {
                          const tone = scoreTone(record.percent);
                          return (
                            <li
                              key={record.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-cream-subtle/30"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums",
                                    tone === "good" && "bg-emerald-100 text-emerald-800",
                                    tone === "mid" && "bg-amber-100 text-amber-800",
                                    tone === "low" && "bg-red-100 text-red-800"
                                  )}
                                >
                                  {record.percent}%
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900">
                                      Attempt {record.attemptNumber}
                                    </span>
                                    {record.id === group.latest.id && (
                                      <Badge className="bg-brand-turquoise/20 text-brand-turquoise hover:bg-brand-turquoise/20 text-[10px] px-1.5 py-0">
                                        Latest
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                    <span>
                                      {record.score}/{record.total} correct
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(record.completedAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 border-border shrink-0 self-start sm:self-center"
                                onClick={() => openMcqDetail(record)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Details
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ——— Written Exams ——— */}
          <TabsContent value="exams">
            {isLoadingAttempts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse border-border">
                    <CardContent className="p-5 space-y-3">
                      <div className="h-5 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedAttempts.length === 0 ? (
              <Card className="border-border bg-white/80">
                <CardContent className="py-14 text-center">
                  <Award className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No written exams yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Submitted written exams will appear here after review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedAttempts.map((attempt: any) => {
                  const exam = getExamById(attempt.examId);
                  if (!exam) return null;
                  const course = getCourseById(exam.courseId);
                  const isCompleted = !!attempt.completedAt;
                  const isGraded = !!attempt.reviewedAt && !!attempt.feedback;

                  return (
                    <Card
                      key={attempt.id}
                      className="border-border bg-white/80 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between gap-3 items-start">
                          <div className="min-w-0">
                            <CardTitle className="text-lg truncate">{exam.title}</CardTitle>
                            <p className="text-sm text-muted-foreground truncate">
                              {course?.title || "Unknown Course"}
                            </p>
                          </div>
                          {isGraded ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0">
                              Graded
                            </Badge>
                          ) : isCompleted ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0">
                              Pending review
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 shrink-0">
                              In progress
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pb-5 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {exam.duration != null && exam.duration !== "" && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              Duration: {exam.duration} minutes
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {isCompleted
                              ? `Submitted: ${formatDate(attempt.completedAt)}`
                              : `Started: ${formatDate(attempt.startedAt)}`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 border-border"
                          disabled={!isCompleted}
                          onClick={() => openExamDetail(attempt)}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            {courseProgressData.length === 0 ? (
              <Card className="border-border bg-white/80">
                <CardContent className="py-14 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No courses enrolled</h3>
                  <p className="text-sm text-muted-foreground">
                    Enroll in courses to track your progress
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {courseProgressData.map((course, index) => (
                  <Card key={index} className="border-border bg-white/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between gap-3">
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        <Badge
                          className={
                            course.progress >= 100
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : "bg-sky-100 text-sky-800 hover:bg-sky-100"
                          }
                        >
                          {course.progress >= 100 ? "Completed" : "In Progress"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium tabular-nums">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-white/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <BarChart2 className="h-5 w-5 mr-2 text-brand-turquoise" />
                    MCQ Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {mcqScores.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={scoreDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) =>
                              percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                            }
                          >
                            {scoreDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Complete MCQ tests to see distribution
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-white/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <BarChart2 className="h-5 w-5 mr-2 text-brand-blue" />
                    Recent MCQ Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {progressData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="score"
                            name="Score (%)"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No MCQ history yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <BarChart2 className="h-5 w-5 mr-2 text-amber-600" />
                  Course Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {courseProgressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={courseProgressData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="progress" name="Completion (%)" fill="hsl(var(--brand-blue))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No course data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedMcq ? (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedMcq.lessonTitle}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedMcq.courseTitle}</p>
                </DialogHeader>
                <div className="flex flex-col items-center py-4 gap-3">
                  <ScoreRing percent={selectedMcq.percent} size={100} />
                  <p className="text-sm text-muted-foreground">
                    {selectedMcq.score} of {selectedMcq.total} questions correct
                  </p>
                  {selectedMcq.attemptNumber >= 1 && (
                    <Badge variant="outline">Attempt {selectedMcq.attemptNumber}</Badge>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-cream-subtle/50 px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">{formatDate(selectedMcq.completedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-medium">{selectedMcq.percent}%</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Link
                    href={`/student/quiz/${selectedMcq.courseId}/${selectedMcq.moduleId}/${selectedMcq.lessonId}`}
                  >
                    <Button className="bg-accent-brand text-white hover:opacity-90 gap-1.5">
                      <RotateCcw className="h-4 w-4" />
                      Retake Test
                    </Button>
                  </Link>
                </div>
              </>
            ) : selectedAttempt ? (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {getExamById(selectedAttempt.examId)?.title || "Exam"}
                  </DialogTitle>
                  <div className="text-sm text-muted-foreground">
                    Submitted on{" "}
                    {selectedAttempt.completedAt
                      ? format(new Date(selectedAttempt.completedAt), "MMM d, yyyy h:mm a")
                      : "Not completed"}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {selectedAttempt.reviewedAt && selectedAttempt.feedback ? (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Graded
                        </Badge>
                      ) : selectedAttempt.completedAt ? (
                        <Badge className="bg-amber-100 text-amber-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      ) : (
                        <Badge className="bg-sky-100 text-sky-800">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium mb-3">Your Answers</h3>
                    <div className="space-y-3">
                      {questions?.map((question: Question, index: number) => (
                        <div key={question.id} className="border border-border rounded-lg p-3">
                          <h4 className="font-medium mb-1 text-sm">Question {index + 1}</h4>
                          <p className="text-gray-700 mb-2 text-sm">{getCleanQuestionText(question.text)}</p>
                          {getQuestionImageUrl(question) && (
                            <div className="mb-2 max-w-md overflow-hidden rounded-lg border border-border bg-slate-50 p-1.5">
                              <img
                                src={getQuestionImageUrl(question)!}
                                alt={`Question ${index + 1} diagram`}
                                className="max-h-56 w-auto rounded object-contain"
                              />
                            </div>
                          )}
                          <div className="bg-sky-50 rounded p-2.5">
                            <Label className="text-xs font-medium text-sky-700">Your Answer:</Label>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedAttempt?.answers?.[question.id] || "No answer provided"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedAttempt.feedback && (
                    <div>
                      <h3 className="text-base font-medium mb-2">Instructor Feedback</h3>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap text-sm">
                          {selectedAttempt.feedback}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedAttempt.completedAt && !selectedAttempt.feedback && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-amber-800 text-sm">
                        Your exam is being reviewed. Feedback will be available soon.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
