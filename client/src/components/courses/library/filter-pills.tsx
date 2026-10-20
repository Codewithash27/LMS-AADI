import { cn } from "@/lib/utils";

export type LibraryFilter = "all" | "active" | "beginner" | "intermediate";

type FilterPillsProps = {
  value: LibraryFilter;
  total: number;
  onChange: (value: LibraryFilter) => void;
};

const OPTIONS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
];

export function FilterPills({ value, total, onChange }: FilterPillsProps) {
  return (
    <div className="lib-filters" role="group" aria-label="Filter courses">
      {OPTIONS.map((option) => (
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
