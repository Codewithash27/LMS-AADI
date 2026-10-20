import type { ReactNode } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="dsh">{children}</div>;
}

export function DashSkeleton({ tall }: { tall?: boolean }) {
  return <div className={tall ? "dsh-skel tall" : "dsh-skel"} aria-busy="true" />;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="dsh-empty">{children}</p>;
}
