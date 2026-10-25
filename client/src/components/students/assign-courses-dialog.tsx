import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Loader2, Lock, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type CourseRow = {
  id: number;
  title: string;
  level?: string | null;
  duration?: number | string | null;
};

type AssignCoursesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentLabel: string;
  courses: CourseRow[];
  selectedIds: number[];
  initialIds: number[];
  lockedIds: number[];
  isLoading: boolean;
  isSaving: boolean;
  onToggle: (courseId: number, checked: boolean) => void;
  onSave: () => void;
};

export function AssignCoursesDialog({
  open,
  onOpenChange,
  studentLabel,
  courses,
  selectedIds,
  initialIds,
  lockedIds,
  isLoading,
  isSaving,
  onToggle,
  onSave,
}: AssignCoursesDialogProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "selected" | "open">("all");
  const locked = useMemo(() => new Set(lockedIds.map(Number)), [lockedIds]);
  const selected = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);
  const initial = useMemo(() => new Set(initialIds.map(Number)), [initialIds]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTab("all");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const id = Number(course.id);
      if (tab === "selected" && !selected.has(id)) return false;
      if (tab === "open" && initial.has(id)) return false;
      if (!needle) return true;
      return course.title.toLowerCase().includes(needle);
    });
  }, [courses, query, tab, selected, initial]);

  const toAdd = selectedIds.filter((id) => !initial.has(Number(id))).length;
  const toRemove = initialIds.filter((id) => !selected.has(Number(id)) && !locked.has(Number(id))).length;
  const unchanged = toAdd === 0 && toRemove === 0;
  const ratio = courses.length === 0 ? 0 : Math.round((selectedIds.length / courses.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] gap-0 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0C0C14] p-0 font-[Manrope,system-ui,sans-serif] text-[#F3F2FA] shadow-[0_28px_80px_rgba(0,0,0,0.55)] [&>button.absolute]:hidden">
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#D4FF3F] text-[#0A0A0F]">
            <BookOpen className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="font-[Fraunces,Georgia,serif] text-[32px] font-medium leading-none tracking-[-0.03em] text-[#F3F2FA]">
              Assign <i className="text-[#D4FF3F]">courses</i>
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-5 text-[#A3A1B8]">
              Choose courses for {studentLabel}. Batch enrollments stay locked.
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#13131E] text-[#F3F2FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="border-t border-white/[0.09] bg-[#0A0A11] px-6 py-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-[#F3F2FA]">
              <span className="font-[Fraunces,Georgia,serif] text-4xl font-medium leading-none">
                {selectedIds.length}
              </span>
              <span className="ml-2 text-sm text-[#A3A1B8]">of {courses.length} selected</span>
            </p>
            {lockedIds.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7C766]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#F7C766]">
                <Lock className="h-3 w-3" aria-hidden />
                {lockedIds.length} via batch
              </span>
            ) : null}
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="img"
            aria-label={`${ratio}% selected`}
          >
            <span className="block h-full rounded-full bg-[#D4FF3F]" style={{ width: `${ratio}%` }} />
          </div>
        </div>

        <div className="px-6 pt-4">
          <label className="flex h-[50px] items-center gap-2 rounded-2xl border border-transparent bg-[#13131E] px-4 focus-within:border-[#D4FF3F]">
            <Search className="h-4 w-4 shrink-0 text-[#8E8CA6]" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search course title"
              aria-label="Search courses"
              className="h-full w-full bg-transparent text-sm text-[#F3F2FA] outline-none placeholder:text-[#8E8CA6]"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 px-6 py-3">
          <div className="flex rounded-full bg-[#13131E] p-1" role="tablist" aria-label="Filter courses">
            {(
              [
                ["all", "All"],
                ["selected", "Selected"],
                ["open", "Not enrolled"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F] ${
                  tab === id ? "bg-[#D4FF3F] text-[#0A0A0F]" : "text-[#A3A1B8]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(360px,38vh)] space-y-2 overflow-y-auto px-6 pb-4 [scrollbar-width:thin]">
          {isLoading ? (
            [0, 1, 2, 3].map((row) => (
              <div key={row} className="h-[68px] animate-pulse rounded-2xl bg-[#13131E]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-[Fraunces,Georgia,serif] text-2xl text-[#F3F2FA]">No courses match</p>
            </div>
          ) : (
            filtered.map((course) => {
              const id = Number(course.id);
              const isLocked = locked.has(id);
              const isSelected = selected.has(id) || isLocked;
              const enrolled = initial.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  disabled={isLocked}
                  onClick={() => onToggle(id, !isSelected)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] ${
                    isLocked
                      ? "cursor-not-allowed border-white/[0.06] bg-[#0F0F18]"
                      : isSelected
                        ? "border-[#D4FF3F]/30 bg-[#D4FF3F]/[0.06] hover:bg-[#D4FF3F]/10"
                        : "border-white/[0.06] bg-[#0F0F18] hover:bg-[#13131E]"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C6CFF]/20 text-[#7C6CFF]">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#F3F2FA]">{course.title}</span>
                    {course.level ? (
                      <span className="block truncate text-xs capitalize text-[#8E8CA6]">{course.level}</span>
                    ) : null}
                  </span>
                  {isLocked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F7C766]/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#F7C766]">
                      <Lock className="h-3 w-3" aria-hidden />
                      Batch
                    </span>
                  ) : enrolled ? (
                    <span className="shrink-0 rounded-full bg-[#43D9E8]/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#43D9E8]">
                      Enrolled
                    </span>
                  ) : null}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isLocked
                        ? "bg-[#8E8CA6] text-[#0A0A0F]"
                        : isSelected
                          ? "bg-[#D4FF3F] text-[#0A0A0F]"
                          : "border border-white/15 bg-transparent"
                    }`}
                    aria-hidden
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.09] bg-[#0A0A11] px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-extrabold">
            {unchanged ? (
              <span className="text-[#8E8CA6]">No changes yet</span>
            ) : (
              <>
                {toAdd > 0 ? (
                  <span className="rounded-full bg-[#D4FF3F]/[0.12] px-2.5 py-1 text-[#D4FF3F]">+{toAdd} to add</span>
                ) : null}
                {toRemove > 0 ? (
                  <span className="rounded-full bg-red-500/[0.12] px-2.5 py-1 text-red-300">−{toRemove} to remove</span>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 min-w-[44px] rounded-full border border-white/[0.09] bg-[#0F0F18] px-5 text-sm font-extrabold text-[#F3F2FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isLoading || isSaving || unchanged}
              className="inline-flex h-12 min-w-[44px] items-center gap-2 rounded-full bg-[#D4FF3F] px-5 text-sm font-extrabold text-[#0A0A0F] hover:bg-[#E4FF7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
              {isSaving ? "Saving…" : "Save enrollments"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
