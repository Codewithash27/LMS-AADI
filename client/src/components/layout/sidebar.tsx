import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Palette,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 88;

/** Live theme colors via CSS vars (updated by Theme Studio) */
const themeColor = {
  primary: "var(--color-primary-main)",
  secondary: "var(--color-secondary-main, var(--color-brand-blue))",
  accent: "var(--color-brand-blue)",
  text: "var(--color-text-primary)",
  textMuted: "var(--color-text-muted)",
  border: "var(--color-border-subtle)",
};

type NavChild = { id: string; label: string; href: string };
type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon: ReactNode;
  color: string;
  children?: NavChild[];
};

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">{children}</span>;
}

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function pathMatches(location: string, href: string) {
  if (href === "/admin/dashboard" || href === "/student/dashboard") {
    return location === href || location === "/";
  }
  return location === href || location.startsWith(href + "/");
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const menuItems: NavItem[] = useMemo(() => {
    if (isAdmin) {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: (
            <NavIcon>
              <LayoutDashboard strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
        },
        {
          id: "academics",
          label: "Academics",
          icon: (
            <NavIcon>
              <GraduationCap strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
          children: [
            { id: "courses", label: "Courses", href: "/admin/courses" },
            { id: "exams", label: "Exams", href: "/admin/exams" },
            { id: "grading", label: "Grading", href: "/admin/grading" },
          ],
        },
        {
          id: "students",
          label: "Students",
          icon: (
            <NavIcon>
              <Users strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
          children: [
            { id: "students-list", label: "All Students", href: "/admin/students" },
            { id: "batches", label: "Batches", href: "/admin/batches" },
          ],
        },
        {
          id: "reports",
          label: "Reports",
          href: "/admin/reports",
          icon: (
            <NavIcon>
              <BarChart3 strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
        },
        {
          id: "theme-studio",
          label: "Theme Studio",
          href: "/admin/theme-studio",
          icon: (
            <NavIcon>
              <Palette strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
        },
        {
          id: "profile",
          label: "Profile",
          href: "/admin/profile",
          icon: (
            <NavIcon>
              <UserRound strokeWidth={2} />
            </NavIcon>
          ),
          color: themeColor.primary,
        },
      ];
    }

    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/student/dashboard",
        icon: (
          <NavIcon>
            <LayoutDashboard strokeWidth={2} />
          </NavIcon>
        ),
        color: themeColor.primary,
      },
      {
        id: "learning",
        label: "Learning",
        icon: (
          <NavIcon>
            <GraduationCap strokeWidth={2} />
          </NavIcon>
        ),
        color: themeColor.primary,
        children: [
          { id: "my-courses", label: "My Courses", href: "/student/my-courses" },
          { id: "upcoming", label: "Upcoming Exams", href: "/student/upcoming-exams" },
          { id: "results", label: "Results & Progress", href: "/student/results" },
        ],
      },
      {
        id: "ai",
        label: "AI Assistant",
        href: "/student/ai-assistant",
        icon: (
          <NavIcon>
            <Bot strokeWidth={2} />
          </NavIcon>
        ),
        color: themeColor.primary,
      },
      {
        id: "profile",
        label: "My Profile",
        href: "/student/profile",
        icon: (
          <NavIcon>
            <UserRound strokeWidth={2} />
          </NavIcon>
        ),
        color: themeColor.primary,
      },
    ];
  }, [isAdmin]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (
        (item.href && pathMatches(location, item.href)) ||
        item.children?.some((c) => pathMatches(location, c.href))
      ) {
        next[item.id] = true;
      }
    });
    setExpandedSections(next);
  }, [menuItems, location]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    const term = searchTerm.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.children?.some((c) => c.label.toLowerCase().includes(term))
    );
  }, [menuItems, searchTerm]);

  if (!user) return null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const wasOpen = prev[id];
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = false;
      });
      if (!wasOpen) next[id] = true;
      return next;
    });
  };

  /** Only close the temporary mobile drawer — never collapse the desktop sidebar. */
  const handleNavigate = () => {
    if (isMobile) {
      onMobileClose?.();
    }
  };

  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase();

  const renderItemInner = (item: NavItem, isActive: boolean, hasChildren: boolean, isExpanded: boolean) => (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center transition-all duration-300",
          isActive
            ? "opacity-100"
            : "opacity-70 group-hover:opacity-100 group-hover:scale-110"
        )}
        style={{ color: isActive ? item.color : themeColor.textMuted }}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <>
          <span
            className={cn(
              "flex-1 truncate text-sm tracking-tight",
              isActive ? "font-semibold" : "font-medium"
            )}
          >
            {item.label}
          </span>
          {hasChildren && (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-300",
                isExpanded ? "rotate-0" : "-rotate-90"
              )}
              style={{ color: themeColor.textMuted, opacity: 0.55 }}
            />
          )}
        </>
      )}
    </>
  );

  const itemClass = (active: boolean, _color: string) =>
    cn(
      "group relative flex w-full items-center gap-3 rounded-2xl mx-1 my-0.5 text-left transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-x-0.5",
      collapsed ? "justify-center px-1 py-2.5" : "px-3 py-2.5",
      active ? "font-semibold" : "font-medium"
    );

  const itemStyle = (active: boolean, _color: string): CSSProperties => ({
    backgroundColor: active
      ? "color-mix(in srgb, var(--color-primary-main) 12%, transparent)"
      : "transparent",
    color: active ? themeColor.primary : themeColor.textMuted,
    borderLeft: active ? `6px solid ${themeColor.primary}` : "6px solid transparent",
  });

  const navContent = (
    <div
      className="flex h-full flex-col overflow-hidden border-r shadow-[4px_0_24px_rgba(0,0,0,0.04)] bg-sidebar-warm"
      style={{ borderColor: themeColor.border, color: themeColor.text }}
    >
      <div
        className="mb-2 flex items-center justify-between px-4 py-5 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
        style={{
          background: `linear-gradient(135deg, ${themeColor.primary} 0%, ${themeColor.accent} 100%)`,
          borderRadius: "0 0 40px 40px",
        }}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white p-1.5 shadow-md">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-white">
                Edu Transform
              </p>
              <p className="truncate text-[11px] font-medium tracking-wide text-white/75">
                Learning Platform
              </p>
            </div>
          </div>
        )}
        <div className={cn("flex items-center gap-1", collapsed && "mx-auto")}>
          {isMobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-full bg-white/20 p-2 text-white shadow-sm hover:bg-white/30"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4 rotate-180" />
              )}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 rounded-[15px] border bg-white/80 px-3 py-1.5 transition-all focus-within:bg-white focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-main)_12%,transparent)]"
            style={{ borderColor: "color-mix(in srgb, var(--color-primary-main) 20%, transparent)" }}
          >
            <Search
              className="h-4 w-4 shrink-0"
              style={{ color: themeColor.primary, opacity: 0.6 }}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quick Search..."
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
              style={{ color: themeColor.text }}
            />
          </div>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-1">
        <TooltipProvider delayDuration={0}>
          {filteredItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const childActive = item.children?.some((c) => pathMatches(location, c.href)) ?? false;
            const selfActive = item.href ? pathMatches(location, item.href) : false;
            const isActive = selfActive || childActive;
            const isExpanded = !!expandedSections[item.id];

            const rowContent = renderItemInner(item, isActive, hasChildren, isExpanded);

            const row =
              item.href && !hasChildren ? (
                <Link href={item.href} onClick={handleNavigate}>
                  <div
                    className={itemClass(isActive, item.color)}
                    style={itemStyle(isActive, item.color)}
                  >
                    {rowContent}
                  </div>
                </Link>
              ) : (
                <button
                  type="button"
                  className={itemClass(isActive, item.color)}
                  style={itemStyle(isActive, item.color)}
                  onClick={() => {
                    if (hasChildren) {
                      if (collapsed) onToggleCollapse?.();
                      toggleSection(item.id);
                    }
                  }}
                >
                  {rowContent}
                </button>
              );

            return (
              <div key={item.id} className="mb-0.5">
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>{row}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  row
                )}

                {hasChildren && isExpanded && !collapsed && (
                  <div className="pb-1">
                    {item.children!.map((child) => {
                      const childIsActive = pathMatches(location, child.href);
                      return (
                        <Link key={child.id} href={child.href} onClick={handleNavigate}>
                          <div
                            className={cn(
                              "mx-4 ml-14 my-0.5 cursor-pointer rounded-xl px-3 py-2 text-[13px] leading-snug tracking-tight transition-all duration-200",
                              childIsActive
                                ? "bg-primary/10 font-semibold text-primary"
                                : "font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                            )}
                          >
                            {child.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      <div
        className={cn(
          "mx-4 mb-6 mt-auto rounded-[24px] border bg-white shadow-card-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)]",
          collapsed ? "p-2" : "px-4 py-3"
        )}
        style={{ borderColor: "color-mix(in srgb, var(--color-text-muted) 10%, transparent)" }}
      >
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar
            className={cn(
              "border-[3px] border-white shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary-main)_15%,transparent)]",
              collapsed ? "h-11 w-11" : "h-[46px] w-[46px]"
            )}
          >
            {user.profilePhoto ? (
              <AvatarImage
                src={getProfilePhotoSrc(user.profilePhoto) || undefined}
                alt=""
              />
            ) : null}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold leading-snug tracking-tight"
                style={{ color: themeColor.text }}
              >
                {user.firstName} {user.lastName}
              </p>
              <p
                className="mt-0.5 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: themeColor.textMuted }}
              >
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={onMobileClose} aria-hidden />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ width: DRAWER_WIDTH }}
        >
          {navContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className="h-screen shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH }}
    >
      {navContent}
    </aside>
  );
}
