import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/courses/library/page-header";
import { FilterPills, type LibraryFilter } from "@/components/courses/library/filter-pills";
import { CourseCard } from "@/components/courses/library/course-card";
import { useQuery } from "@tanstack/react-query";
import { getCourseThumbnailSrc } from "@/lib/course-thumbnail";

export default function StudentMyCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");

  const {
    data: allCourses = [],
    isLoading: isLoadingCourses,
    isError: coursesError,
    refetch: refetchCourses,
  } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/user"],
  });

  const enrolledCourseIds = new Set(
    (enrollments as any[]).map((enrollment) => Number(enrollment.courseId))
  );
  const enrolledCourses = (allCourses as any[]).filter((course) =>
    enrolledCourseIds.has(Number(course.id))
  );

  const getEnrollmentProgress = (courseId: number) => {
    const row = (enrollments as any[]).find((e) => Number(e.courseId) === Number(courseId));
    const value = Number(row?.progress);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };

  const filteredCourses = enrolledCourses.filter((course: any) => {
    const matchesSearch =
      (course.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (course.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const progress = getEnrollmentProgress(course.id);
    const difficulty = (course.difficulty || "").toLowerCase();

    if (libraryFilter === "in_progress") {
      return progress > 0 && progress < 100;
    }
    if (libraryFilter === "beginner") {
      return difficulty === "beginner";
    }
    if (libraryFilter === "intermediate") {
      return difficulty === "intermediate";
    }
    return true;
  });

  const courseMeta = (course: any) => {
    const parts: string[] = [];
    if (course.category) parts.push(String(course.category));
    if (course.duration != null && course.duration !== "") {
      parts.push(`${course.duration} weeks`);
    }
    return parts.length ? parts.join(" · ") : null;
  };

  const isLoading = isLoadingCourses || isLoadingEnrollments;

  return (
    <DashboardLayout>
      <PageHeader variant="student" search={searchTerm} onSearch={setSearchTerm} />
      <FilterPills
        variant="student"
        value={libraryFilter}
        total={enrolledCourses.length}
        onChange={setLibraryFilter}
      />

      {isLoading ? (
        <div className="course-grid" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="course-skeleton" />
          ))}
        </div>
      ) : coursesError ? (
        <div className="lib-state">
          <h2>Couldn&apos;t load courses</h2>
          <button type="button" className="lib-new" onClick={() => refetchCourses()}>
            Try again
          </button>
        </div>
      ) : enrolledCourses.length === 0 ? (
        <div className="lib-state">
          <h2>No courses assigned yet</h2>
          <p className="lib-state-sub">
            Ask your administrator to assign courses to your account.
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="lib-state">
          <h2>No courses match</h2>
          <p className="lib-state-sub">Try another search or filter.</p>
        </div>
      ) : (
        <div className="course-grid">
          {filteredCourses.map((course: any) => {
            const tone = Math.max(
              0,
              enrolledCourses.findIndex((item) => item.id === course.id)
            );
            return (
              <CourseCard
                key={course.id}
                variant="student"
                href={`/student/my-courses/${course.id}`}
                title={course.title}
                tone={tone}
                thumbnail={getCourseThumbnailSrc(course.thumbnail)}
                level={course.difficulty ? String(course.difficulty).toUpperCase() : null}
                meta={courseMeta(course)}
                progress={getEnrollmentProgress(course.id)}
              />
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
