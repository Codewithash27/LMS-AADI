import { cn } from "@/lib/utils";

export type LibraryFilter =
  | "all"
  | "active"
  | "in_progress"
  | "beginner"
  | "intermediate";

type FilterPillsProps = {
  value: LibraryFilter;
  total: number;
  onChange: (value: LibraryFilter) => void;
  variant?: "admin" | "student";
};

const ADMIN_OPTIONS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
];

const STUDENT_OPTIONS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
];

export function FilterPills({
  value,
  total,
  onChange,
  variant = "admin",
}: FilterPillsProps) {
  const options = variant === "student" ? STUDENT_OPTIONS : ADMIN_OPTIONS;

  return (
    <div
      className="lib-filters"
      role="group"
      aria-label={variant === "student" ? "Filter your courses" : "Filter courses"}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn("lib-pill", value === option.id && "on")}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.id === "all" ? `All · ${total}` : option.label}
        </button>
      ))}
    </div>
  );
}
