import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
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

  const itemClass = (active: boolean) =>
    cn(
      "group relative flex w-full items-center gap-3 rounded-2xl mx-1.5 my-0.5 text-left transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
      collapsed ? "justify-center px-1 py-2.5" : "px-3 py-2.5",
      active ? "sidebar-nav-active font-semibold text-primary" : "font-medium text-muted-foreground hover:bg-white/50 hover:text-foreground hover:shadow-sm"
    );

  const navContent = (
    <div
      className="bg-sidebar-premium relative z-0 flex h-full flex-col overflow-hidden border-r border-border/60 shadow-[8px_0_32px_rgba(15,23,42,0.06)]"
      style={{ color: themeColor.text }}
    >
      <div className="relative z-10 mb-1">
        <div className="sidebar-brand-gradient relative flex items-center justify-between overflow-hidden px-4 py-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.22)] rounded-b-[2rem]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%)",
            }}
          />
          {!collapsed && (
            <div className="relative flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95 p-2 shadow-lg ring-2 ring-white/30 transition-transform duration-300 group-hover:scale-105">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold leading-snug tracking-tight text-white drop-shadow-sm">
                  Edu Transform
                </p>
                <p className="truncate text-[11px] font-medium tracking-wide text-white/80">
                  Learning Platform
                </p>
              </div>
            </div>
          )}
          <div className={cn("relative flex items-center gap-1", collapsed && "mx-auto")}>
            {isMobile ? (
              <button
                type="button"
                onClick={onMobileClose}
                className="rounded-xl bg-white/20 p-2 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/30"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="rounded-xl bg-white/20 p-2 text-white shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/30"
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
      </div>

      {!collapsed && (
        <div className="relative z-10 px-4 pb-3">
          <div
            className="sidebar-glass-input flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all duration-300 focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-main)_14%,transparent)]"
            style={{ borderColor: "color-mix(in srgb, var(--color-primary-main) 18%, transparent)" }}
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

      <nav className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-2 scrollbar-thin">
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
                  <div className={itemClass(isActive)}>{rowContent}</div>
                </Link>
              ) : (
                <button
                  type="button"
                  className={itemClass(isActive)}
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

                <AnimatePresence initial={false}>
                  {hasChildren && isExpanded && !collapsed && (
                    <motion.div
                      key={`sub-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="relative ml-8 border-l border-primary/15 pb-1 pl-3">
                        {item.children!.map((child, idx) => {
                          const childIsActive = pathMatches(location, child.href);
                          return (
                            <motion.div
                              key={child.id}
                              initial={{ x: -6, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.04, duration: 0.22 }}
                            >
                              <Link href={child.href} onClick={handleNavigate}>
                                <div
                                  className={cn(
                                    "my-0.5 cursor-pointer rounded-xl px-3 py-2 text-[13px] leading-snug tracking-tight transition-all duration-200",
                                    childIsActive
                                      ? "sidebar-nav-active font-semibold text-primary"
                                      : "font-medium text-muted-foreground hover:translate-x-0.5 hover:bg-white/45 hover:text-foreground"
                                  )}
                                >
                                  {child.label}
                                </div>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      <div
        className={cn(
          "sidebar-profile-card relative z-10 mx-3 mb-5 mt-auto rounded-2xl border border-white/60 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
          collapsed ? "p-2" : "px-4 py-3"
        )}
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
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity"
            onClick={onMobileClose}
            aria-hidden
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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
      className="h-screen shrink-0 transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH }}
    >
      {navContent}
    </aside>
  );
}
