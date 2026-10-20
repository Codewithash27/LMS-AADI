import { Link } from "wouter";
import { Edit, Eye, Trash2, UserPlus } from "lucide-react";
import { CourseCover } from "./course-cover";
import { AvatarStack } from "./avatar-stack";

type AvatarPerson = {
  id: number;
  initials: string;
  photo?: string | null;
};

type CourseCardProps = {
  href: string;
  title: string;
  tone: number;
  thumbnail?: string | null;
  level?: string | null;
  meta?: string | null;
  people: AvatarPerson[];
  enrolled: number;
  progress: number | null;
  onEdit: () => void;
  onAssign: () => void;
  onView: () => void;
  onDelete: () => void;
};

export function CourseCard({
  href,
  title,
  tone,
  thumbnail,
  level,
  meta,
  people,
  enrolled,
  progress,
  onEdit,
  onAssign,
  onView,
  onDelete,
}: CourseCardProps) {
  return (
    <article className="course-card" data-tone={tone % 6}>
      <Link href={href} className="course-card-link">
        <CourseCover pattern={tone} thumbnail={thumbnail} level={level} />
        <div className="course-body">
          <h2 className="course-title">{title}</h2>
          {meta ? <p className="course-meta">{meta}</p> : null}
          <div className="course-foot">
            <AvatarStack people={people} count={enrolled} />
            {progress != null && <span className="course-progress">{progress}%</span>}
          </div>
        </div>
      </Link>
      <div className="course-actions">
        <button type="button" aria-label="Edit course" onClick={onEdit}>
          <Edit strokeWidth={2} />
        </button>
        <button type="button" aria-label="Assign students" onClick={onAssign}>
          <UserPlus strokeWidth={2} />
        </button>
        <button type="button" aria-label="View course" onClick={onView}>
          <Eye strokeWidth={2} />
        </button>
        <button type="button" aria-label="Delete course" onClick={onDelete}>
          <Trash2 strokeWidth={2} />
        </button>
      </div>
    </article>
  );
}
