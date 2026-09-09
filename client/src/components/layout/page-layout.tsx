import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
};

const gapMap = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-6",
} as const;

/**
 * PageLayout — header slot + content stack (Campus Axis pattern).
 */
export default function PageLayout({
  children,
  header,
  className,
  spacing = "md",
}: PageLayoutProps) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col", gapMap[spacing], className)}>
      {header}
      {children}
    </div>
  );
}
