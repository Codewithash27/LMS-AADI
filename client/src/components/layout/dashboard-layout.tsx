import type { ReactNode } from "react";
import MainLayout from "@/layout/MainLayout";

type DashboardLayoutProps = {
  children: ReactNode;
};

/**
 * Thin re-export of MainLayout for existing page imports.
 * Shell: sidebar + glass AppBar + scroll main + sticky footer (Campus Axis pattern).
 * Bottom MobileNav removed — mobile uses temporary drawer only.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <MainLayout>{children}</MainLayout>;
}
