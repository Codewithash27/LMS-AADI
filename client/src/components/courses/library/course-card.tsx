import { Link } from "wouter";
import { ArrowUpRight, Edit, Eye, PlayCircle, Trash2, UserPlus } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { CourseCover } from "./course-cover";
import { AvatarStack } from "./avatar-stack";

type AvatarPerson = {
  id: number;
  initials: string;
  photo?: string | null;
};

type CourseCardBase = {
  href: string;
  title: string;
  tone: number;
  thumbnail?: string | null;
  level?: string | null;
  meta?: string | null;
};

type AdminCourseCardProps = CourseCardBase & {
  variant?: "admin";
  people: AvatarPerson[];
  enrolled: number;
  progress: number | null;
  onEdit: () => void;
  onAssign: () => void;
  onView: () => void;
  onDelete: () => void;
};

type StudentCourseCardProps = CourseCardBase & {
  variant: "student";
  progress: number;
};

export type CourseCardProps = AdminCourseCardProps | StudentCourseCardProps;

export function CourseCard(props: CourseCardProps) {
  const { href, title, tone, thumbnail, level, meta } = props;
  const student = props.variant === "student";
  const studentProgress = student ? props.progress : 0;
  const continuing = student && studentProgress > 0;
  const ctaLabel = continuing ? "Continue course" : "Start course";

  return (
    <article className="course-card" data-tone={tone % 6}>
      <Link href={href} className="course-card-link">
        <CourseCover pattern={tone} thumbnail={thumbnail} level={level} />
        <div className="course-body">
          <h2 className="course-title">{title}</h2>
          {meta ? <p className="course-meta">{meta}</p> : null}
          <div className="course-foot">
            {student ? (
              <>
                <span className="course-meta">{continuing ? "In progress" : "Not started"}</span>
                <span className="course-progress">{studentProgress}%</span>
              </>
            ) : (
              <>
                <AvatarStack people={props.people} count={props.enrolled} />
                {props.progress != null && (
                  <span className="course-progress">{props.progress}%</span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="course-actions">
        {student ? (
          <ActionTooltip label={ctaLabel} side="bottom" className="course-tip">
            <Link href={href} aria-label={ctaLabel}>
              {continuing ? <PlayCircle strokeWidth={2} /> : <ArrowUpRight strokeWidth={2} />}
            </Link>
          </ActionTooltip>
        ) : (
          <>
            <ActionTooltip label="Edit" side="bottom" className="course-tip">
              <button type="button" aria-label="Edit course" onClick={props.onEdit}>
                <Edit strokeWidth={2} />
              </button>
            </ActionTooltip>
            <ActionTooltip label="Assign" side="bottom" className="course-tip">
              <button type="button" aria-label="Assign students" onClick={props.onAssign}>
                <UserPlus strokeWidth={2} />
              </button>
            </ActionTooltip>
            <ActionTooltip label="View" side="bottom" className="course-tip">
              <button type="button" aria-label="View course" onClick={props.onView}>
                <Eye strokeWidth={2} />
              </button>
            </ActionTooltip>
            <ActionTooltip label="Delete" side="bottom" className="course-tip">
              <button type="button" aria-label="Delete course" onClick={props.onDelete}>
                <Trash2 strokeWidth={2} />
              </button>
            </ActionTooltip>
          </>
        )}
      </div>
    </article>
  );
}
