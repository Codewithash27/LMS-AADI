import { ChevronLeft } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/brand/BrandMark";
import { Link } from "wouter";
import { CourseTabs } from "./CourseTabs";

type CourseHeroProps = {
  greeting: string;
  name: string;
  photo?: string | null;
  initials: string;
  title: string;
  difficulty?: string | null;
  category?: string | null;
  access?: string | null;
  progress: number | null;
  tab: string;
  onTab: (value: string) => void;
};

function accentTitle(title: string) {
  const words = title.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return { rest: words.join(" "), last };
}

function difficultyTone(value?: string | null) {
  const key = String(value || "").toLowerCase();
  if (key === "beginner") return "lime";
  if (key === "intermediate") return "cyan";
  if (key === "advanced") return "violet";
  return "neutral";
}

export function CourseHero({
  greeting,
  name,
  photo,
  initials,
  title,
  difficulty,
  category,
  access,
  progress,
  tab,
  onTab,
}: CourseHeroProps) {
  const heading = accentTitle(title);
  return (
    <header className="scp-hero">
      <div className="scp-top">
        <div className="scp-brand">
          <BrandMark size="sm" />
          <BrandWordmark className="scp-brand-name" />
        </div>
        <div className="scp-user">
          <span>
            {greeting}, {name}
          </span>
          {photo ? (
            <img src={photo} alt="" className="scp-avatar" />
          ) : (
            <span className="scp-avatar" aria-hidden>
              {initials}
            </span>
          )}
        </div>
      </div>

      <Link href="/student/my-courses" className="scp-back">
        <ChevronLeft strokeWidth={2} aria-hidden />
        Back to My Courses
      </Link>

      <div className="scp-hero-row">
        <div className="scp-hero-copy">
          <div className="scp-chips">
            {difficulty ? (
              <span className={`scp-chip ${difficultyTone(difficulty)}`}>{difficulty}</span>
            ) : null}
            {category ? <span className="scp-chip">{category}</span> : null}
            {access ? <span className="scp-chip">{access}</span> : null}
          </div>
          <h1>
            {heading.rest ? `${heading.rest} ` : ""}
            <i>{heading.last}</i>
          </h1>
        </div>
        <div className="scp-hero-side">
          {progress != null ? (
            <div className="scp-progress">
              <span className="k">Progress</span>
              <strong>{progress}%</strong>
              <span className="scp-bar" aria-hidden>
                <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
              </span>
            </div>
          ) : null}
          <CourseTabs value={tab} onChange={onTab} />
        </div>
      </div>
    </header>
  );
}
