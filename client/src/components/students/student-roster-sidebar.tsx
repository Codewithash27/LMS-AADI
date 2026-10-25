import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { StudentFace } from "@/components/students/student-face";
import { statusDisplay, studentSubline } from "@/components/students/students-shared";
import { cn } from "@/lib/utils";

export type StudentStatusTab = "all" | "active" | "pending" | "inactive";

type StudentSummary = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  status?: string;
  profilePhoto?: string | null;
};

type StudentRosterSidebarProps = {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: StudentStatusTab;
  onStatusFilter: (value: StudentStatusTab) => void;
  counts: Record<StudentStatusTab, number>;
  students: StudentSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
};

const TABS: { id: StudentStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "inactive", label: "Inactive" },
];

export function StudentRosterSidebar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  counts,
  students,
  selectedId,
  onSelect,
  isLoading,
  rangeStart,
  rangeEnd,
  total,
  page,
  pageCount,
  onPage,
}: StudentRosterSidebarProps) {
  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-7rem)] flex-col rounded-[30px] border border-white/[0.07] bg-[#0F0F18] p-3.5 min-[1180px]:top-6">
      <label className="mb-3 flex h-12 items-center gap-2 rounded-full border border-white/[0.06] bg-[#0F0F18] px-4 focus-within:border-[#D4FF3F]/40">
        <Search className="h-4 w-4 shrink-0 text-[#8E8CA6]" aria-hidden />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, username, email…"
          aria-label="Search students"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#F3F2FA] outline-none placeholder:text-[#8E8CA6]"
        />
      </label>

      <div
        className="mb-3 grid grid-cols-2 gap-1 rounded-[20px] bg-[#0B0B12] p-1 min-[420px]:grid-cols-4"
        role="tablist"
        aria-label="Filter by status"
      >
        {TABS.map((tab) => {
          const on = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onStatusFilter(tab.id)}
              className={cn(
                "min-h-[44px] rounded-full px-1.5 py-2 text-[11px] font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F] min-[420px]:text-xs",
                on ? "bg-[#F3F2FA] text-[#0A0A0F]" : "bg-transparent text-[#B4B2C8]"
              )}
            >
              {tab.label} · {counts[tab.id]}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {isLoading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[70px] animate-pulse rounded-[20px] bg-[#13131E]" />
          ))
        ) : students.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm font-semibold text-[#A3A1B8]">No students match</p>
        ) : (
          students.map((student) => {
            const selected = selectedId === student.id;
            const meta = statusDisplay(student.status);
            const sub = studentSubline(student.username, student.email);
            return (
              <button
                key={student.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(student.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF3F]",
                  selected
                    ? "border border-[#D4FF3F]/30 bg-[#D4FF3F]/[0.06]"
                    : "border border-transparent hover:bg-[#13131E]"
                )}
              >
                <StudentFace
                  id={student.id}
                  firstName={student.firstName}
                  lastName={student.lastName}
                  profilePhoto={student.profilePhoto}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#F3F2FA]">
                    {student.firstName} {student.lastName}
                  </span>
                  {sub ? (
                    <span className="block truncate text-[12.5px] font-semibold text-[#8E8CA6]">{sub}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#B4B2C8]">
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} aria-hidden />
                  {meta.label}
                </span>
              </button>
            );
          })
        )}
      </div>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <p className="text-xs font-bold text-[#A3A1B8]">
          {total === 0 ? "0 of 0" : `${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 text-[#A3A1B8] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 text-[#A3A1B8] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF3F]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </aside>
  );
}
