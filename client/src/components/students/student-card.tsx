import { BookOpen, Mail, Trash2, UserCircle } from "lucide-react";
import { Link } from "wouter";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import { cn } from "@/lib/utils";
import { useState } from "react";

const AVATAR_TONES = ["#7C6CFF", "#43D9E8", "#D4FF3F", "#FF8A6B", "#F5B94A"] as const;

function toneForId(id: number) {
  return AVATAR_TONES[Math.abs(id) % AVATAR_TONES.length];
}

function statusMeta(status?: string) {
  if (status === "inactive") return { label: "INACTIVE", dot: "#FF8FA6" };
  if (status === "pending") return { label: "PENDING", dot: "#F7C766" };
  return { label: "ACTIVE", dot: "#3DDC97" };
}

const PATTERN_STYLES = [
  "repeating-radial-gradient(circle at 50% 40%, COLOR 0 1.5px, transparent 1.5px 12px)",
  "repeating-linear-gradient(135deg, COLOR 0 1px, transparent 1px 11px)",
  "repeating-radial-gradient(circle at 0% 100%, COLOR 0 1.5px, transparent 1.5px 13px)",
] as const;

export type StudentCardStudent = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  status?: string;
  profilePhoto?: string | null;
};

export type StudentCardProps = {
  student: StudentCardStudent;
  cardIndex: number;
  selected: boolean;
  onSelect: () => void;
  onAssign: () => void;
  onDelete: () => void;
  profileHref: string;
  courseCount?: number;
  avgProgress?: number;
  showEnrollmentFooter?: boolean;
};

function CardAvatar({
  student,
  tone,
}: {
  student: StudentCardStudent;
  tone: string;
}) {
  const [broken, setBroken] = useState(false);
  const photo = getProfilePhotoSrc(student.profilePhoto);
  const initials = `${student.firstName?.charAt(0) || ""}${student.lastName?.charAt(0) || ""}`.toUpperCase();

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt=""
        className="relative z-10 h-[70px] w-[70px] rounded-full border-4 border-[#0F0F18] object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="relative z-10 flex h-[70px] w-[70px] items-center justify-center rounded-full border-4 border-[#0F0F18] font-[Fraunces,Georgia,serif] text-[21px] font-semibold text-[#07070C]"
      style={{ background: tone }}
    >
      {initials}
    </span>
  );
}

export function StudentCard({
  student,
  cardIndex,
  selected,
  onSelect,
  onAssign,
  onDelete,
  profileHref,
  courseCount = 0,
  avgProgress = 0,
  showEnrollmentFooter = true,
}: StudentCardProps) {
  const tone = toneForId(student.id);
  const meta = statusMeta(student.status);
  const patternIdx = cardIndex % 3;
  const patternColor = `${tone}99`;
  const bandBg = PATTERN_STYLES[patternIdx].replace(/COLOR/g, patternColor);
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  const progress = Math.min(100, Math.max(0, Math.round(avgProgress)));

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#0F0F18] font-[Manrope,system-ui,sans-serif] transition-[border-color,box-shadow]",
        "hover:border-white/[0.18]",
        selected && "border-[#D4FF3F]/55 ring-[3px] ring-[#D4FF3F]/10"
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${fullName}`}
        onClick={onSelect}
        className="absolute inset-0 z-[1] rounded-[26px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
      />

      <div
        className="relative h-[82px] bg-[#171724]"
        style={{ backgroundImage: bandBg, backgroundColor: "#171724" }}
      >
        <span className="absolute right-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-[#07070C]/80 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-[#F3F2FA]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
          {meta.label}
        </span>
      </div>

      <div className="relative z-10 px-4 pb-4 pt-0">
        <div className="-mt-[35px] flex justify-center">
          <CardAvatar student={student} tone={tone} />
        </div>

        <h3 className="relative z-10 mt-3 truncate text-center font-[Fraunces,Georgia,serif] text-[23px] font-medium leading-tight tracking-[-0.02em] text-[#F3F2FA]">
          {fullName}
        </h3>
        <p className="relative z-10 mt-1 truncate text-center text-[13px] font-semibold text-[#A3A1B8]">
          @{student.username}
        </p>
        <p className="relative z-10 mx-auto mt-2 flex max-w-full items-center justify-center gap-1.5 truncate px-1 text-[12.5px] text-[#C9C7DA]">
          <Mail className="h-3.5 w-3.5 shrink-0 text-[#8E8CA6]" aria-hidden />
          <span className="truncate">{student.email}</span>
        </p>

        <div className="relative z-10 mt-4 flex items-end justify-between gap-3 border-t border-white/[0.07] pt-4">
          {showEnrollmentFooter ? (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#F3F2FA]">
                {courseCount} course{courseCount === 1 ? "" : "s"}
                <span className="ml-2 font-semibold text-[#A3A1B8]">{progress}%</span>
              </p>
              <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#D4FF3F]"
                  style={{ width: `${courseCount === 0 ? 0 : progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="relative z-20 flex shrink-0 gap-2">
            <ActionTooltip label="View profile" side="top" className="course-tip">
              <Link
                href={profileHref}
                onClick={(e) => e.stopPropagation()}
                aria-label={`View profile for ${fullName}`}
                className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#171724] text-[#D6D4E6] hover:border-white/25 hover:bg-[#1d1d2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
              >
                <UserCircle className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </Link>
            </ActionTooltip>
            <ActionTooltip label="Assign course" side="top" className="course-tip">
              <button
                type="button"
                aria-label={`Assign course to ${fullName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#171724] text-[#D4FF3F] hover:bg-[#1d1d2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
              >
                <BookOpen className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </button>
            </ActionTooltip>
            <ActionTooltip label="Delete student" side="top" className="course-tip">
              <button
                type="button"
                aria-label={`Delete ${fullName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#171724] text-[#FF8FA6] hover:border-[#FF8FA6]/35 hover:bg-[#FF8FA6]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
              >
                <Trash2 className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </button>
            </ActionTooltip>
          </div>
        </div>
      </div>
    </article>
  );
}

export function StudentCardSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#0F0F18]"
      aria-hidden
    >
      <div className="h-[82px] bg-[#171724]" />
      <div className="px-4 pb-4 pt-0">
        <div className="-mt-[35px] mx-auto h-[70px] w-[70px] rounded-full bg-[#13131E]" />
        <div className="mx-auto mt-4 h-5 w-3/4 rounded bg-[#13131E]" />
        <div className="mx-auto mt-2 h-4 w-1/2 rounded bg-[#13131E]" />
        <div className="mt-4 flex justify-end gap-2 border-t border-white/[0.07] pt-4">
          <div className="h-11 w-11 rounded-[14px] bg-[#13131E]" />
          <div className="h-11 w-11 rounded-[14px] bg-[#13131E]" />
          <div className="h-11 w-11 rounded-[14px] bg-[#13131E]" />
        </div>
      </div>
    </div>
  );
}
