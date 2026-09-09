import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/** Simple section block with optional title row. */
export default function SectionLayout({
  children,
  title,
  description,
  actions,
  className,
}: SectionLayoutProps) {
  return (
    <section className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-bold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
