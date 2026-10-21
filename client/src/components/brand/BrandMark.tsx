import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "brand-mark brand-mark-sm",
  md: "brand-mark",
  lg: "brand-mark brand-mark-lg",
} as const;

export function BrandMark({ size = "md", className }: BrandMarkProps) {
  return (
    <span className={cn(sizeClass[size], className)} aria-hidden>
      <BookOpen strokeWidth={2.2} />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-wordmark", className)}>
      Edu <i>Transform</i>
    </span>
  );
}
