import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type DataTableColumn = {
  key: string;
  label: string;
  className?: string;
  align?: "left" | "right" | "center";
};

export type DataTableProps = {
  /** Uppercase directory label, e.g. "STUDENT DIRECTORY" */
  title: string;
  columns: DataTableColumn[];
  children: ReactNode;
  className?: string;
  empty?: ReactNode;
  isEmpty?: boolean;
  /** Pagination (Campus Axis footer) */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

/**
 * Campus Axis directory table:
 * white card, label row, teal→blue header, clean rows, pagination footer.
 */
export default function DataTable({
  title,
  columns,
  children,
  className,
  empty,
  isEmpty,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: DataTableProps) {
  const showPagination = typeof onPageChange === "function";
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-card-soft",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {total === 0
            ? "Showing 0 of 0"
            : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
        </p>
      </div>

      {isEmpty ? (
        <div className="px-6 py-14">{empty}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-11 border-0 bg-primary px-4 text-[11px] font-bold uppercase tracking-wider text-primary-foreground first:pl-5 last:pr-5",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-border/60">
                {children}
              </TableBody>
            </Table>
          </div>

          {showPagination ? (
            <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => onPageSizeChange?.(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[72px] rounded-lg border-border bg-card text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {total === 0
                    ? "0-0 of 0"
                    : `${rangeStart}-${rangeEnd} of ${total}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted"
                  disabled={page <= 1}
                  onClick={() => onPageChange?.(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted"
                  disabled={page >= pageCount}
                  onClick={() => onPageChange?.(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { TableRow, TableCell };
