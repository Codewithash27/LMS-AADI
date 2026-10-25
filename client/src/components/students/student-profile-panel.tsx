import { Link } from "wouter";
import { BookOpen, Eye, Mail, Phone, GraduationCap, Calendar, Trash2 } from "lucide-react";
import { StudentFace } from "@/components/students/student-face";
import { dash, statusDisplay, studentSubline } from "@/components/students/students-shared";
import { cn } from "@/lib/utils";

type StudentRecord = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber?: string | null;
  educationLevel?: string | null;
  yearOfStudy?: string | null;
  dateOfBirth?: string | null;
  status?: string;
  profilePhoto?: string | null;
};

type EnrollmentRow = {
  courseId: number;
  progress?: number;
  course?: { title?: string; level?: string; duration?: number | string | null } | null;
};

type StudentProfilePanelProps = {
  student: StudentRecord | null;
  enrollments: EnrollmentRow[];
  batchLockedCourseIds: number[];
  isLoadingEnrollments: boolean;
  coursesById: Record<number, { title: string; level?: string; duration?: number | string | null }>;
  onAssign: () => void;
  onDelete: () => void;
  emptyList: boolean;
};

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[20px] bg-[#13131E] p-4">
      <div className="mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#7C6CFF]/15 text-[#7C6CFF]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8E8CA6]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#F3F2FA]">{value}</p>
    </div>
  );
}

export function StudentProfilePanel({
  student,
  enrollments,
  batchLockedCourseIds,
  isLoadingEnrollments,
  coursesById,
  onAssign,
  onDelete,
  emptyList,
}: StudentProfilePanelProps) {
  if (emptyList) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-[34px] border border-white/[0.07] bg-[#0F0F18] p-8">
        <p className="font-[Fraunces,Georgia,serif] text-4xl text-[#F3F2FA]">No students found</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-[34px] border border-white/[0.07] bg-[#0F0F18] p-8">
        <p className="text-sm font-semibold text-[#A3A1B8]">Select a student</p>
      </div>
    );
  }

  const status = statusDisplay(student.status);
  const locked = new Set(batchLockedCourseIds.map(Number));
  const batchCount = enrollments.filter((e) => locked.has(Number(e.courseId))).length;
  const sub = studentSubline(student.username, student.email);

  const educationParts = [student.educationLevel, student.yearOfStudy ? `Year ${student.yearOfStudy}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="min-w-0 overflow-hidden rounded-[34px] border border-white/[0.07] bg-[#0F0F18]">
      <div
        className="relative h-32 shrink-0 overflow-hidden bg-[#171724]"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 50%, rgba(124,108,255,0.35) 0 1px, transparent 1px 14px)",
        }}
      >
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#0B0B12]/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#F3F2FA]">
          <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} aria-hidden />
          {status.label}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-[#0B0B12]/90 px-3 py-1.5 text-[11px] font-bold text-[#A3A1B8]">
          ID {student.id}
        </span>
      </div>

      <div className="px-[30px] pb-[30px]">
        <div className="-mt-[46px] mb-6">
          <StudentFace
            id={student.id}
            firstName={student.firstName}
            lastName={student.lastName}
            profilePhoto={student.profilePhoto}
            size="lg"
            className="border-[5px] border-[#0F0F18]"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#D4FF3F] px-4 text-sm font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] sm:w-auto sm:px-5"
          >
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
            Assign course
          </button>
          <Link
            href={`/admin/students/${student.id}`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/[0.09] bg-[#13131E] px-4 text-sm font-extrabold text-[#F3F2FA] hover:bg-[#171724] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] sm:w-auto sm:px-5"
          >
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
            View details
          </Link>
          <button
            type="button"
            aria-label="Delete student"
            onClick={onDelete}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF8FA6]/15 text-[#FF8FA6] hover:bg-[#FF8FA6]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="min-w-0 border-b border-white/[0.06] pb-6">
          <h2 className="break-words font-[Fraunces,Georgia,serif] text-[clamp(1.75rem,4vw,2.875rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#F3F2FA]">
            {student.firstName}{" "}
            <i className="italic text-[#D4FF3F]">{student.lastName}</i>
          </h2>
          {sub ? <p className="mt-2 break-words text-sm font-semibold text-[#A3A1B8]">{sub}</p> : null}
        </div>

        <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
          <InfoCard icon={Mail} label="Email" value={student.email || dash} />
          <InfoCard icon={Phone} label="Mobile" value={student.mobileNumber?.trim() || dash} />
          <InfoCard icon={GraduationCap} label="Education" value={educationParts || dash} />
          <InfoCard icon={Calendar} label="Date of birth" value={student.dateOfBirth?.trim() || dash} />
        </div>

        <div className="mt-8 min-w-0">
          <h3 className="font-[Fraunces,Georgia,serif] text-[28px] font-medium tracking-[-0.02em] text-[#F3F2FA]">
            Enrolled <i className="italic text-[#D4FF3F]">courses</i>
          </h3>
          <p className="mt-1 text-sm font-semibold text-[#A3A1B8]">
            {enrollments.length} course{enrollments.length === 1 ? "" : "s"}
            {batchCount > 0 ? ` · ${batchCount} via batch` : ""}
          </p>

          <div className="mt-4 space-y-2">
            {isLoadingEnrollments ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-[#13131E]" />
              ))
            ) : enrollments.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#13131E] px-4 py-10 text-center">
                <p className="text-sm font-bold text-[#A3A1B8]">No courses yet</p>
                <button
                  type="button"
                  onClick={onAssign}
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#D4FF3F] px-5 text-sm font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A]"
                >
                  Assign course
                </button>
              </div>
            ) : (
              enrollments.map((row) => {
                const courseId = Number(row.courseId);
                const course = row.course || coursesById[courseId];
                const title = course?.title || `Course #${courseId}`;
                const level = course?.level;
                const duration = course?.duration;
                const subParts = [level, duration != null && duration !== "" ? `${duration} wks` : null]
                  .filter(Boolean)
                  .join(" · ");
                const progress = Math.min(100, Math.max(0, Math.round(Number(row.progress) || 0)));
                const viaBatch = locked.has(courseId);
                return (
                  <div
                    key={`${courseId}-${row.progress}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#13131E] p-3"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7C6CFF]/15 text-[#7C6CFF]">
                      <BookOpen className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#F3F2FA]">{title}</p>
                      {subParts ? (
                        <p className="truncate text-xs font-semibold capitalize text-[#8E8CA6]">{subParts}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn("h-full rounded-full", progress >= 100 ? "bg-[#3DDC97]" : "bg-[#D4FF3F]")}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-extrabold text-[#A3A1B8]">{progress}%</span>
                      </div>
                    </div>
                    {viaBatch ? (
                      <span className="shrink-0 rounded-full bg-[#F7C766]/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#F7C766]">
                        Via batch
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
