import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import EnrollStudentsDialog from "@/components/batches/enroll-students-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  UserPlus,
  ArrowLeft,
  BookOpen,
  Clock,
  CalendarDays,
  Users,
  GraduationCap,
} from "lucide-react";

export default function BatchDetailsPage() {
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const { id } = useParams<{ id: string }>();
  const batchId = parseInt(id);
  const queryClient = useQueryClient();

  interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }

  interface Course {
    id: number;
    title: string;
    description: string;
  }

  interface Batch {
    id: number;
    name: string;
    batchCode: string;
    courseId: number;
    courseIds?: number[];
    trainerId: number;
    startDate: string;
    endDate?: string | null;
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

  const { data: batch, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: [`/api/batches/${batchId}`],
    enabled: !!batchId,
  });

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<
    BatchEnrollment[]
  >({
    queryKey: [`/api/batches/${batchId}/enrollments`],
    enabled: !!batchId,
  });

  const courseIds = useMemo(() => {
    if (!batch) return [];
    if (batch.courseIds && batch.courseIds.length > 0) return batch.courseIds;
    return batch.courseId ? [batch.courseId] : [];
  }, [batch]);

  const batchCourses = useMemo(
    () =>
      courseIds
        .map((cid) => courses.find((c) => c.id === cid))
        .filter(Boolean) as Course[],
    [courseIds, courses]
  );

  const trainer = users?.find((user) => user.id === batch?.trainerId);

  const enrolledUserIds = enrollments.map((enrollment) => enrollment.userId);
  const enrolledStudents =
    users?.filter(
      (user) => enrolledUserIds.includes(user.id) && user.role === "student"
    ) || [];

  const allStudents =
    users?.filter((user) => user.role === "student") || [];

  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      return await apiRequest("DELETE", `/api/batch-enrollments/${enrollmentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Student removed",
        description: "Student has been removed from the batch successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/batches/${batchId}/enrollments`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove student",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  function removeStudent(enrollmentId: number) {
    if (
      confirm(
        "Remove this student from the batch? Batch-linked courses will stay enrolled until you unassign them (or they become unlocked after removal)."
      )
    ) {
      removeStudentMutation.mutate(enrollmentId);
    }
  }

  if (isLoadingBatch || isLoadingCourses || isLoadingUsers || isLoadingEnrollments) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <p className="mb-4 text-lg text-gray-500">Batch not found</p>
              <Link href="/admin/batches">
                <Button>Back to Batches</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const courseTitlesLabel = batchCourses.map((c) => c.title).join(", ");

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/batches">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{batch.name}</h1>
              <p className="text-muted-foreground">Batch Code: {batch.batchCode}</p>
            </div>
            <Badge variant={batch.isActive ? "default" : "secondary"}>
              {batch.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Courses
                </p>
                <p className="text-xl font-bold text-[#2D3748]">{batchCourses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Students
                </p>
                <p className="text-xl font-bold text-[#2D3748]">{enrolledStudents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Start
                </p>
                <p className="text-sm font-semibold text-[#2D3748]">
                  {format(new Date(batch.startDate), "PP")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Time
                </p>
                <p className="text-sm font-semibold text-[#2D3748]">{batch.batchTime}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Assigned Courses ({batchCourses.length})
              </CardTitle>
              <CardDescription>
                Courses linked to this batch. Students enrolled here get these courses
                automatically (locked in Assign Course).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses linked.</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {batchCourses.map((course, index) => (
                    <li
                      key={course.id}
                      className="flex items-center gap-3 bg-white px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                          {course.title}
                        </p>
                        {course.description ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {course.description}
                          </p>
                        ) : null}
                      </div>
                      {course.id === batch.courseId ? (
                        <Badge className="shrink-0 rounded-full border border-primary/20 bg-primary/10 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Primary
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Batch Details</CardTitle>
              <CardDescription>Schedule and trainer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Trainer
                  </p>
                  <p className="font-medium text-[#2D3748]">
                    {trainer
                      ? `${trainer.firstName} ${trainer.lastName}`
                      : "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start date
                  </p>
                  <p className="font-medium text-[#2D3748]">
                    {format(new Date(batch.startDate), "PPP")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    End date
                  </p>
                  <p className="font-medium text-[#2D3748]">
                    {batch.endDate
                      ? format(new Date(batch.endDate), "PPP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Batch time
                  </p>
                  <p className="font-medium text-[#2D3748]">{batch.batchTime}</p>
                </div>
                {batch.maxStudents ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Max students
                    </p>
                    <p className="font-medium text-[#2D3748]">{batch.maxStudents}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <p className="text-[#2D3748]">
                    {batch.description || "No description provided."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList>
            <TabsTrigger value="students">Enrolled Students</TabsTrigger>
            <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                Enrolled Students ({enrolledStudents.length})
              </h2>
              <Button type="button" onClick={() => setOpenEnrollDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Enroll Students
              </Button>
            </div>

            {enrolledStudents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="mb-4 text-lg text-muted-foreground">
                    No students enrolled in this batch yet
                  </p>
                  <Button type="button" onClick={() => setOpenEnrollDialog(true)}>
                    Enroll Your First Student
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Enrolled On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolledStudents.map((student) => {
                      const enrollment = enrollments.find(
                        (e) => e.userId === student.id
                      );
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.username}</TableCell>
                          <TableCell>
                            {enrollment?.enrolledAt
                              ? format(new Date(enrollment.enrolledAt), "PP")
                              : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                enrollment?.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {enrollment?.status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                enrollment && removeStudent(enrollment.id)
                              }
                              disabled={removeStudentMutation.isPending}
                            >
                              {removeStudentMutation.isPending
                                ? "Removing..."
                                : "Remove"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Student performance data for this batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Performance metrics will be available as students progress through
                  the linked courses.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <EnrollStudentsDialog
          open={openEnrollDialog}
          onOpenChange={setOpenEnrollDialog}
          batchId={batchId}
          batchName={batch.name}
          courseTitle={courseTitlesLabel || undefined}
          students={allStudents}
        />
      </div>
    </DashboardLayout>
  );
}
