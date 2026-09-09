import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import ListToolbar from "@/components/layout/list-toolbar";
import DataTable from "@/components/primitives/DataTable";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  ArrowUpRight,
  PlayCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";

export default function StudentMyCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");

  const { data: allCourses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ["/api/enrollments/user"],
  });

  // Enrollments are source of truth — never show catalog courses without assignment
  const enrolledCourseIds = new Set(
    (enrollments as any[]).map((enrollment) => Number(enrollment.courseId))
  );
  const enrolledCourses = (allCourses as any[]).filter((course) =>
    enrolledCourseIds.has(Number(course.id))
  );

  const filteredEnrolledCourses = enrolledCourses.filter(
    (course: any) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { page, pageSize, total, pageItems, setPage, setPageSize } =
    useClientPagination(filteredEnrolledCourses, 10);

  const getDifficultyColor = (difficulty: string) => {
    switch ((difficulty || "").toLowerCase()) {
      case "beginner":
        return "border-green-200 bg-green-100 text-green-800";
      case "intermediate":
        return "border-blue-200 bg-blue-100 text-blue-800";
      case "advanced":
        return "border-teal-200 bg-teal-100 text-teal-800";
      default:
        return "border-gray-200 bg-gray-100 text-gray-800";
    }
  };

  const getEnrollmentData = (courseId: number) => {
    return (enrollments as any[]).find((e) => Number(e.courseId) === Number(courseId));
  };

  const viewToggle = (
    <div className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-sm">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "h-9 w-9 rounded-lg p-0",
          view === "grid" && "bg-brand-turquoise/15 text-brand-turquoise"
        )}
        onClick={() => setView("grid")}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "h-9 w-9 rounded-lg p-0",
          view === "list" && "bg-brand-turquoise/15 text-brand-turquoise"
        )}
        onClick={() => setView("list")}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );

  const emptyState = (
    <div className="py-12 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
      <h3 className="mb-1 text-lg font-semibold">
        {searchTerm ? "No matching courses" : "No courses assigned yet"}
      </h3>
      <p className="text-[15px] text-muted-foreground">
        {searchTerm
          ? "Try a different search term."
          : "Ask your administrator to assign courses to your account."}
      </p>
    </div>
  );

  return (
    <DashboardLayout>
      <Header
        title="My Courses"
        actions={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search your courses..."
            extras={viewToggle}
          />
        }
      />

      {isLoadingEnrollments || isLoadingCourses ? (
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          )}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse rounded-card bg-muted",
                view === "grid" ? "h-64" : "h-20"
              )}
            />
          ))}
        </div>
      ) : filteredEnrolledCourses.length === 0 ? (
        emptyState
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEnrolledCourses.map((course: any) => {
            const enrollment = getEnrollmentData(course.id);
            const progress = enrollment?.progress || 0;
            const thumb = getCourseThumbnailSrc(course.thumbnail);

            return (
              <Card
                key={course.id}
                className="flex flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
              >
                <div className="relative h-32 bg-gradient-to-br from-brand-turquoise/15 to-brand-blue/10">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-10 w-10 text-brand-turquoise/70" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-[17px]">{course.title}</CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase",
                        getDifficultyColor(course.difficulty)
                      )}
                    >
                      {course.difficulty || "All Levels"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-[15px]">
                    {course.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3 pb-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration || "8"} weeks
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border p-3">
                  <Link href={`/student/my-courses/${course.id}`} className="w-full">
                    <Button className="w-full gap-2" size="sm">
                      {progress > 0 ? (
                        <>
                          <PlayCircle className="h-4 w-4" />
                          Continue
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4" />
                          Start Course
                        </>
                      )}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <DataTable
          title="My Courses"
          columns={[
            { key: "course", label: "Course" },
            { key: "level", label: "Level" },
            { key: "progress", label: "Progress" },
            { key: "duration", label: "Duration" },
            { key: "actions", label: "Actions", align: "right" },
          ]}
          isEmpty={filteredEnrolledCourses.length === 0}
          empty={emptyState}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          {pageItems.map((course: any) => {
            const enrollment = getEnrollmentData(course.id);
            const progress = enrollment?.progress || 0;
            const thumb = getCourseThumbnailSrc(course.thumbnail);
            return (
              <TableRow key={course.id} className="hover:bg-muted/70">
                <TableCell className="py-3.5 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#2D3748]">
                        {course.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {course.description || "No description"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      getDifficultyColor(course.difficulty)
                    )}
                  >
                    {course.difficulty || "All Levels"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-[120px] items-center gap-2">
                    <Progress value={progress} className="h-2 w-16" />
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-[15px] text-[#2D3748]/90">
                  {course.duration || "8"} weeks
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Link href={`/student/my-courses/${course.id}`}>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 gap-1.5 px-3 text-primary hover:bg-primary/10"
                    >
                      {progress > 0 ? (
                        <>
                          <PlayCircle className="h-4 w-4" />
                          Continue
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </DashboardLayout>
  );
}
