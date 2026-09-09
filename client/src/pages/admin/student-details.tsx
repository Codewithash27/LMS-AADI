import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft, 
  BookOpen, 
  CalendarDays, 
  Clock, 
  Users,
  GraduationCap,
  Award,
  Eye,
  EyeOff,
  Key,
  Mail,
  Phone,
  Cake,
  School,
  User,
  Copy,
  Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id);
  const [showPassword, setShowPassword] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const COURSE_PREVIEW_LIMIT = 6;

  // Enhanced Interfaces with password field
  interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    gender?: string;
    dateOfBirth: string;
    profilePhoto?: string;
    educationLevel: string;
    schoolCollege: string;
    yearOfStudy: string;
    role: string;
    password?: string;
    plainPassword?: string;
    createdAt?: string;
    lastLogin?: string;
  }

  interface Course {
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    duration: number;
    thumbnail?: string;
  }

  interface Enrollment {
    id: number;
    userId: number;
    courseId: number;
    enrolledAt: string;
    completedAt?: string;
    progress: number;
  }

  interface Batch {
    id: number;
    name: string;
    batchCode: string;
    courseId: number;
    trainerId: number;
    startDate: string;
    batchTime: string;
    description: string | null;
    maxStudents: number | null;
    isActive: boolean;
  }

  interface BatchEnrollment {
    id: number;
    batchId: number;
    userId: number;
    enrolledAt: string;
    enrolledBy: number;
    status: string;
  }

  interface Exam {
    id: number;
    title: string;
    description: string;
    courseId: number;
    duration: number;
    startTime: string;
    endTime: string;
    maxAttempts: number;
  }

  interface ExamAttempt {
    id: number;
    userId: number;
    examId: number;
    startedAt: string;
    completedAt?: string;
    score?: number;
  }

  // Fetch the student details
  const { data: student, isLoading: isLoadingStudent } = useQuery<User>({
    queryKey: [`/api/users/${studentId}`],
    enabled: !!studentId,
  });

  // Fetch all courses
  const { data: allCourses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  // Fetch student's course enrollments
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: [`/api/enrollments/user/${studentId}`],
    enabled: !!studentId,
  });

  // Fetch all batches
  const { data: allBatches = [], isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
  });

  // Fetch student's batch enrollments
  const { data: batchEnrollments = [], isLoading: isLoadingBatchEnrollments } = useQuery<BatchEnrollment[]>({
    queryKey: [`/api/batch-enrollments/user/${studentId}`],
    enabled: !!studentId,
  });

  // Fetch exam attempts
  const { data: examAttempts = [], isLoading: isLoadingExamAttempts } = useQuery<ExamAttempt[]>({
    queryKey: [`/api/exam-attempts/user/${studentId}`],
    enabled: !!studentId,
  });

  // Fetch all exams
  const { data: allExams = [], isLoading: isLoadingExams } = useQuery<Exam[]>({
    queryKey: ['/api/exams'],
  });

  // Copy password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Password has been copied to clipboard",
    });
  };

  // Get enrolled courses
  const enrolledCourses = allCourses.filter(course => 
    enrollments.some(enrollment => enrollment.courseId === course.id)
  );

  // Get enrolled batches with course info
  const enrolledBatches = allBatches.filter(batch => 
    batchEnrollments.some(enrollment => enrollment.batchId === batch.id)
  );

  // Get exam attempts with exam info
  const studentExamAttempts = examAttempts.map(attempt => {
    const exam = allExams.find(e => e.id === attempt.examId);
    return {
      ...attempt,
      exam: exam ? exam : undefined,
    };
  });

  // Get completion stats
  const completedCourses = enrollments.filter(e => e.completedAt).length;
  const averageProgress = enrollments.length > 0 
    ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length 
    : 0;
  
  const averageScore = studentExamAttempts.length > 0 && studentExamAttempts.some(a => a.score !== undefined)
    ? studentExamAttempts.filter(a => a.score !== undefined)
        .reduce((sum, a) => sum + (a.score || 0), 0) / 
      studentExamAttempts.filter(a => a.score !== undefined).length
    : null;

  if (isLoadingStudent || isLoadingCourses || isLoadingEnrollments || 
      isLoadingBatches || isLoadingBatchEnrollments || isLoadingExams || isLoadingExamAttempts) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading student details...</p>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center p-12">
              <User className="h-16 w-16 text-gray-400 mb-4" />
              <p className="mb-4 text-xl font-semibold text-gray-900">Student not found</p>
              <Link href="/admin/students">
                <Button className="gap-2 bg-accent-brand text-white rounded-2xl">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Students
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3">
        <Header
          title="Student Details"
          links={[
            { title: "Students", path: "/admin/students" },
            { title: "Student Details", path: `/admin/students/${studentId}` },
          ]}
        />

        {/* Profile + stats — content-sized, no stretch gaps */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
          {/* Profile sidebar */}
          <Card className="border border-white/20 bg-white/80 shadow-md lg:col-span-4 xl:col-span-3">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center lg:flex-col">
                <Avatar className="h-16 w-16 shrink-0 border-2 border-white shadow-md sm:h-20 sm:w-20">
                  {student.profilePhoto ? (
                    <AvatarImage
                      src={getProfilePhotoSrc(student.profilePhoto) || undefined}
                      alt={`${student.firstName} ${student.lastName}`}
                    />
                  ) : null}
                  <AvatarFallback className="bg-accent-brand text-lg font-bold text-white">
                    {student.firstName.charAt(0)}
                    {student.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 sm:w-full">
                  <h2 className="truncate text-base font-bold text-foreground">
                    {student.firstName} {student.lastName}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground sm:justify-center">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                  <Badge className="mt-1.5 border-0 bg-gradient-to-r from-green-500 to-emerald-600 text-[10px] text-white">
                    {student.role}
                  </Badge>
                </div>
              </div>

              {student.plainPassword ? (
                <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/80 p-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                    <Key className="h-3.5 w-3.5" />
                    Password
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={student.plainPassword}
                      readOnly
                      className="h-8 flex-1 bg-white font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(student.plainPassword!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 space-y-1.5 text-xs">
                {[
                  { icon: User, label: "Username", value: student.username },
                  { icon: Phone, label: "Mobile", value: student.mobileNumber },
                  ...(student.gender
                    ? [{ icon: User, label: "Gender", value: student.gender }]
                    : []),
                  {
                    icon: Cake,
                    label: "DOB",
                    value: format(new Date(student.dateOfBirth), "PP"),
                  },
                  { icon: School, label: "Education", value: student.educationLevel },
                  { icon: School, label: "School", value: student.schoolCollege },
                  { icon: GraduationCap, label: "Year", value: student.yearOfStudy },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-2 rounded-lg bg-cream-muted/50 px-2 py-1.5"
                  >
                    <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <row.icon className="h-3 w-3" />
                      {row.label}
                    </span>
                    <span className="max-w-[55%] text-right font-medium text-foreground break-words">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats + tabs */}
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-8 xl:col-span-9">
            <Card className="border border-white/20 bg-white/80 shadow-md">
              <CardHeader className="space-y-0 px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      icon: BookOpen,
                      value: enrolledCourses.length,
                      label: "Courses",
                      color: "from-blue-500 to-cyan-600",
                    },
                    {
                      icon: CalendarDays,
                      value: enrolledBatches.length,
                      label: "Batches",
                      color: "from-green-500 to-emerald-600",
                    },
                    {
                      icon: Award,
                      value: completedCourses,
                      label: "Completed",
                      color: "from-brand-blue to-primary",
                    },
                    {
                      icon: GraduationCap,
                      value: `${Math.round(averageProgress)}%`,
                      label: "Avg Progress",
                      color: "from-orange-500 to-red-600",
                    },
                    {
                      icon: Clock,
                      value: studentExamAttempts.length,
                      label: "Attempts",
                      color: "from-primary to-brand-blue",
                    },
                    {
                      icon: Users,
                      value:
                        averageScore !== null ? `${Math.round(averageScore)}%` : "N/A",
                      label: "Avg Score",
                      color: "from-[#0D9488] to-brand-blue",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-border/60 bg-white/90 p-2.5 text-center"
                    >
                      <div
                        className={cn(
                          "mx-auto mb-1.5 inline-flex rounded-lg bg-gradient-to-br p-1.5 text-white shadow-sm",
                          stat.color
                        )}
                      >
                        <stat.icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-base font-bold leading-tight text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-white/70 p-1">
                {[
                  { value: "courses", label: "Courses", icon: BookOpen },
                  { value: "batches", label: "Batches", icon: Users },
                  { value: "exams", label: "Exams", icon: Award },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1 rounded-lg px-2 py-2 text-xs data-[state=active]:bg-accent-brand data-[state=active]:text-white sm:text-sm"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="truncate">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="courses" className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Enrolled Courses ({enrolledCourses.length})
                  </p>
                  {enrolledCourses.length > COURSE_PREVIEW_LIMIT ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAllCourses((v) => !v)}
                    >
                      {showAllCourses
                        ? "Show less"
                        : `Show all ${enrolledCourses.length}`}
                    </Button>
                  ) : null}
                </div>
                {enrolledCourses.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="py-6 text-center text-sm text-muted-foreground">
                      No courses enrolled yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    className={cn(
                      "pr-0.5",
                      (showAllCourses || enrolledCourses.length > COURSE_PREVIEW_LIMIT) &&
                        "max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain"
                    )}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {(showAllCourses
                        ? enrolledCourses
                        : enrolledCourses.slice(0, COURSE_PREVIEW_LIMIT)
                      ).map((course) => {
                        const enrollment = enrollments.find(
                          (e) => e.courseId === course.id
                        );
                        const progress = enrollment?.progress || 0;
                        return (
                          <Card
                            key={course.id}
                            className="border border-border/70 bg-white/90 shadow-sm"
                          >
                            <CardContent className="space-y-2 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                                  {course.title}
                                </h3>
                                <Badge
                                  className={cn(
                                    "shrink-0 border-0 text-[10px] text-white",
                                    course.difficulty === "Beginner"
                                      ? "bg-green-600"
                                      : course.difficulty === "Intermediate"
                                        ? "bg-blue-600"
                                        : "bg-teal-700"
                                  )}
                                >
                                  {course.difficulty}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {course.category} · {course.duration}h
                                {enrollment
                                  ? ` · ${format(new Date(enrollment.enrolledAt), "PP")}`
                                  : ""}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className="h-full rounded-full bg-accent-brand"
                                    style={{
                                      width: `${Math.max(progress, progress > 0 ? 2 : 0)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] font-semibold text-foreground">
                                  {progress}%
                                </span>
                              </div>
                              <Link href={`/admin/courses/${course.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-full text-xs"
                                >
                                  View Course
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="batches" className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Batch Enrollments ({enrolledBatches.length})
                </p>
                {enrolledBatches.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="py-6 text-center text-sm text-muted-foreground">
                      Not enrolled in any batches.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden border shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-cream-muted/50">
                            <TableHead className="h-9 text-xs">Batch</TableHead>
                            <TableHead className="h-9 text-xs">Code</TableHead>
                            <TableHead className="h-9 text-xs">Course</TableHead>
                            <TableHead className="h-9 text-xs">Start</TableHead>
                            <TableHead className="h-9 text-xs">Status</TableHead>
                            <TableHead className="h-9 text-right text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrolledBatches.map((batch) => {
                            const batchEnrollment = batchEnrollments.find(
                              (be) => be.batchId === batch.id
                            );
                            const course = allCourses.find((c) => c.id === batch.courseId);
                            return (
                              <TableRow key={batch.id}>
                                <TableCell className="py-2 text-sm font-medium">
                                  {batch.name}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className="font-mono text-[10px]">
                                    {batch.batchCode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[140px] truncate py-2 text-xs">
                                  {course?.title || "Unknown"}
                                </TableCell>
                                <TableCell className="py-2 text-xs">
                                  {format(new Date(batch.startDate), "PP")}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    className={cn(
                                      "border-0 text-[10px] text-white",
                                      batchEnrollment?.status === "active"
                                        ? "bg-green-600"
                                        : "bg-gray-500"
                                    )}
                                  >
                                    {batchEnrollment?.status || "Unknown"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Link href={`/admin/batches/${batch.id}`}>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                      View
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="exams" className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Exam Results ({studentExamAttempts.length})
                </p>
                {studentExamAttempts.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="py-6 text-center text-sm text-muted-foreground">
                      No exam attempts yet.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden border shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-cream-muted/50">
                            <TableHead className="h-9 text-xs">Exam</TableHead>
                            <TableHead className="h-9 text-xs">Course</TableHead>
                            <TableHead className="h-9 text-xs">Started</TableHead>
                            <TableHead className="h-9 text-xs">Score</TableHead>
                            <TableHead className="h-9 text-xs">Status</TableHead>
                            <TableHead className="h-9 text-right text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentExamAttempts.map((attempt) => {
                            const exam = attempt.exam;
                            const course = exam
                              ? allCourses.find((c) => c.id === exam.courseId)
                              : null;
                            const isCompleted = !!attempt.completedAt;
                            return (
                              <TableRow key={attempt.id}>
                                <TableCell className="max-w-[160px] truncate py-2 text-sm font-medium">
                                  {attempt.exam?.title || "Unknown Exam"}
                                </TableCell>
                                <TableCell className="max-w-[140px] truncate py-2 text-xs">
                                  {course?.title || "Unknown"}
                                </TableCell>
                                <TableCell className="py-2 text-xs">
                                  {format(new Date(attempt.startedAt), "PP")}
                                </TableCell>
                                <TableCell className="py-2">
                                  {attempt.score !== undefined ? (
                                    <Badge
                                      className={cn(
                                        "border-0 text-[10px] text-white",
                                        attempt.score >= 80
                                          ? "bg-green-600"
                                          : attempt.score >= 60
                                            ? "bg-blue-600"
                                            : "bg-red-600"
                                      )}
                                    >
                                      {attempt.score}%
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant={isCompleted ? "default" : "secondary"}
                                    className="text-[10px]"
                                  >
                                    {isCompleted ? "Completed" : "In Progress"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {attempt.exam ? (
                                    <Link href={`/admin/exams/${attempt.exam.id}`}>
                                      <Button variant="outline" size="sm" className="h-7 text-xs">
                                        View
                                      </Button>
                                    </Link>
                                  ) : (
                                    <Button variant="outline" size="sm" disabled className="h-7 text-xs">
                                      View
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}