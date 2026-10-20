import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { CourseCover } from "@/components/courses/library/course-cover";

type CourseRowProps = {
  href: string;
  title: string;
  progress: number;
  thumbnail?: string | null;
  tone: number;
  level?: string | null;
};

export function CourseRow({ href, title, progress, thumbnail, tone, level }: CourseRowProps) {
  const pct = Math.max(0, Math.min(100, progress));
  const label = pct >= 100 ? "Review" : pct > 0 ? "Continue" : "Start";
  const lime = pct > 0 && pct < 100;
  return (
    <article className="dsh-course">
      <div className="dsh-cover">
        <CourseCover pattern={tone} thumbnail={thumbnail} level={level} />
      </div>
      <div className="dsh-course-copy">
        <h3>{title}</h3>
        <div className="dsh-course-bar">
          <span><i style={{ width: `${pct}%` }} /></span>
          <b>{pct}%</b>
        </div>
      </div>
      <Link href={href} className={lime ? "dsh-btn lime" : "dsh-btn ghost"}>
        {label}
        {lime ? <ArrowRight strokeWidth={2.2} aria-hidden /> : null}
      </Link>
    </article>
  );
}
