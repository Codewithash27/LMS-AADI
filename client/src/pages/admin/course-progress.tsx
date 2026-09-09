import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Clock, Users, BookOpen, ChevronLeft, AlertTriangle, BarChart, Award } from "lucide-react";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

export default function AdminCourseProgress() {
  const [location] = useLocation();
  
  // Extract course ID from URL
  const courseId = parseInt(location.split("/").pop() || "0");
  
  // Define type for course data
  interface Course {
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    duration: number;
    tenantId: number;
  }
  
  // Fetch course data
  const { data: course, isLoading: isLoadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });
  
  // Define types for the progress data
  interface ProgressData {
    courseId: number;
    totalEnrollments: number;
    studentProgress: Array<{
      user: {
        id: number;
        username: string;
        firstName: string;
        lastName: string;
        email: string;
        profilePhoto?: string;
      };
      enrollment: {
        id: number;
        userId: number;
        courseId: number;
        enrollmentDate: string;
        progress: number;
      };
      completedLessonCount: number;
    }>;
  }
  
  // Fetch student progress data
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<ProgressData>({
    queryKey: [`/api/admin/course-progress/${courseId}`],
    enabled: !!courseId,
  });
  
  // Calculate average progress
  const calculateAverageProgress = () => {
    if (!progressData || !progressData.studentProgress || progressData.studentProgress.length === 0) {
      return 0;
    }
    
    const total = progressData.studentProgress.reduce(
      (sum: number, student) => sum + (student.enrollment.progress || 0), 
      0
    );
    
    return Math.round(total / progressData.studentProgress.length);
  };
  
  // Calculate completion rate
  const calculateCompletionRate = () => {
    if (!progressData || !progressData.studentProgress || progressData.studentProgress.length === 0) {
      return 0;
    }
    
    const completedCount = progressData.studentProgress.filter(
      (student) => student.enrollment.progress === 100
    ).length;
    
    return Math.round((completedCount / progressData.studentProgress.length) * 100);
  };
  
  // Sort students by progress
  const getSortedStudents = () => {
    if (!progressData || !progressData.studentProgress) {
      return [];
    }
    
    return [...progressData.studentProgress].sort(
      (a, b) => (b.enrollment.progress || 0) - (a.enrollment.progress || 0)
    );
  };
  
  // Generate avatar initials from name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  if (isLoadingCourse || isLoadingProgress) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Course not found</h3>
          <p className="text-gray-500 mb-4">
            The course you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/admin/courses">
            <Button>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Link href="/admin/courses">
            <Button variant="ghost" size="sm" className="mb-2">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Courses
            </Button>
          </Link>
          
          <Header 
            title={`${course.title} - Student Progress`}
          />
        </div>
        
        {!progressData || progressData.studentProgress.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No students enrolled
              </h3>
              <p className="text-gray-500">
                There are no students enrolled in this course yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-xl">Total Students</CardTitle>
                    <div className="text-3xl font-bold">
                      {progressData.totalEnrollments}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <BarChart className="h-8 w-8 text-blue-500 mb-2" />
                    <CardTitle className="text-xl">Average Progress</CardTitle>
                    <div className="text-3xl font-bold">
                      {calculateAverageProgress()}%
                    </div>
                    <Progress value={calculateAverageProgress()} className="w-32" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Award className="h-8 w-8 text-green-500 mb-2" />
                    <CardTitle className="text-xl">Completion Rate</CardTitle>
                    <div className="text-3xl font-bold">
                      {calculateCompletionRate()}%
                    </div>
                    <span className="text-sm text-gray-500">
                      {progressData.studentProgress.filter((s) => s.enrollment.progress === 100).length} of {progressData.totalEnrollments} completed
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Student Progress</CardTitle>
                <CardDescription>
                  Detailed progress for each student enrolled in this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Completed Lessons</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedStudents().map((student) => (
                      <TableRow key={student.user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {student.user.profilePhoto ? (
                                <AvatarImage
                                  src={getProfilePhotoSrc(student.user.profilePhoto) || undefined}
                                  alt={student.user.firstName}
                                />
                              ) : null}
                              <AvatarFallback>
                                {getInitials(student.user.firstName, student.user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.user.firstName} {student.user.lastName}</div>
                              <div className="text-sm text-gray-500">{student.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 w-48">
                            <div className="flex justify-between text-sm">
                              <span>{student.enrollment.progress || 0}%</span>
                            </div>
                            <Progress value={student.enrollment.progress || 0} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{student.completedLessonCount}</span> lessons
                        </TableCell>
                        <TableCell>
                          {student.enrollment.progress === 100 ? (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          ) : student.enrollment.progress >= 50 ? (
                            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              In Progress
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Just Started
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}