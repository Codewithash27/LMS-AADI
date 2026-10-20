import { CourseCover } from "@/components/courses/library/course-cover";

type LivePreviewProps = {
  mode: "create" | "edit";
  title: string;
  category: string;
  duration: number;
  difficulty: string;
  thumbnail?: string | null;
  modules: number;
  lessons: number;
  instructor: string;
  enrollmentOn: boolean;
};

export function LivePreview({
  mode,
  title,
  category,
  duration,
  difficulty,
  thumbnail,
  modules,
  lessons,
  instructor,
  enrollmentOn,
}: LivePreviewProps) {
  const displayTitle = title.trim() || (mode === "create" ? "Untitled course" : "Untitled course");
  const meta =
    category || duration
      ? [category || (mode === "create" ? "Category" : ""), duration ? `${duration} weeks` : ""]
          .filter(Boolean)
          .join(" · ")
      : mode === "create"
        ? "Category · 12 weeks"
        : null;

  return (
    <div className="ced-live">
      <p className="k">Live preview</p>
      <p className="ced-live-note">How this course appears on the Courses screen.</p>
      <article className="course-card" data-tone={0}>
        <div className="course-card-link">
          <CourseCover
            pattern={0}
            thumbnail={thumbnail || null}
            level={difficulty ? difficulty.toUpperCase() : null}
          />
          <div className="course-body">
            <h2 className="course-title">{displayTitle}</h2>
            {meta ? <p className="course-meta">{meta}</p> : null}
            <div className="course-foot">
              <span className="course-enrolled">No enrollments yet</span>
            </div>
          </div>
        </div>
      </article>
      <ul className="ced-summary">
        <li><span>Modules</span><b>{modules}</b></li>
        <li><span>Lessons</span><b>{lessons}</b></li>
        <li><span>Instructor</span><b>{instructor || "Not set"}</b></li>
        <li><span>Enrollment</span><b>{enrollmentOn ? "On" : "Off"}</b></li>
      </ul>
    </div>
  );
}
