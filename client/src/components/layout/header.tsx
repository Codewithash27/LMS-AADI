import type { ReactNode } from "react";
import PageHeader, { type NavLink } from "./page-header";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title: string;
  /** @deprecated unused — kept optional for call-site compatibility */
  subtitle?: string;
  actions?: ReactNode;
  links?: NavLink[];
  className?: string;
};

/**
 * Page chrome: Home + breadcrumbs | actions (filters / search / add).
 */
export default function Header({ title, actions, links, className }: HeaderProps) {
  const [location] = useLocation();
  const crumbLinks: NavLink[] = links ?? [{ title, path: location }];

  return (
    <div className={cn("mb-3", className)}>
      <PageHeader links={crumbLinks} actions={actions} />
    </div>
  );
}
