import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ListToolbarProps = {
  /** Filter dropdowns / secondary controls (left of search) */
  filters?: ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Primary action — usually the gradient + button */
  action?: ReactNode;
  /** Extra controls after search (e.g. grid/list toggle) */
  extras?: ReactNode;
  className?: string;
};

/**
 * Campus Axis header toolbar: filters + pill search + primary action.
 * Pass as `actions` to Header / PageHeader.
 */
export default function ListToolbar({
  filters,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  action,
  extras,
  className,
}: ListToolbarProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto",
        className
      )}
    >
      {filters}
      <div className="relative w-full min-w-[180px] sm:w-[240px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 rounded-full border-border bg-card pl-10 text-[15px] shadow-sm"
        />
      </div>
      {extras}
      {action}
    </div>
  );
}
