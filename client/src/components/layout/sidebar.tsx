import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Minus,
  Palette,
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

const DRAWER_WIDTH = 304;
const COLLAPSED_DRAWER_WIDTH = 104;

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
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
  );
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
              <LayoutDashboard strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
        },
        {
          id: "academics",
          label: "Academics",
          icon: (
            <NavIcon>
              <GraduationCap strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
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
              <Users strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
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
              <BarChart3 strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
        },
        {
          id: "theme-studio",
          label: "Theme Studio",
          href: "/admin/theme-studio",
          icon: (
            <NavIcon>
              <Palette strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
        },
        {
          id: "profile",
          label: "Profile",
          href: "/admin/profile",
          icon: (
            <NavIcon>
              <UserRound strokeWidth={1.75} />
            </NavIcon>
          ),
          color: "#A78BFA",
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
            <LayoutDashboard strokeWidth={1.75} />
          </NavIcon>
        ),
        color: "#A78BFA",
      },
      {
        id: "learning",
        label: "Learning",
        icon: (
          <NavIcon>
            <GraduationCap strokeWidth={1.75} />
          </NavIcon>
        ),
        color: "#A78BFA",
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
            <Bot strokeWidth={1.75} />
          </NavIcon>
        ),
        color: "#A78BFA",
      },
      {
        id: "profile",
        label: "My Profile",
        href: "/student/profile",
        icon: (
          <NavIcon>
            <UserRound strokeWidth={1.75} />
          </NavIcon>
        ),
        color: "#A78BFA",
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
  const roleLabel =
    user.role === "superadmin" ? "Super admin" : user.role === "admin" ? "Admin" : "Student";
  const profileHref = isAdmin ? "/admin/profile" : "/student/profile";
  const footerIds = new Set(isAdmin ? ["theme-studio"] : []);
  const mainItems = menuItems.filter((item) => item.id !== "profile" && !footerIds.has(item.id));
  const footItems = menuItems.filter((item) => footerIds.has(item.id));

  const renderItemInner = (
    item: NavItem,
    tone: "active" | "open" | "idle",
    hasChildren: boolean,
    isExpanded: boolean
  ) => (
    <>
      <span
        className={cn(
          "sidebar-icon-well flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
          tone === "idle" && "group-hover:bg-white/10 group-hover:text-white"
        )}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-[13.5px] font-medium tracking-tight">{item.label}</span>
          {hasChildren &&
            (isExpanded ? (
              <Minus className="h-3.5 w-3.5 shrink-0 text-[#8B8B9C]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8B8B9C]" />
            ))}
        </>
      )}
    </>
  );

  const itemClass = (tone: "active" | "open" | "idle") =>
    cn(
      "group flex h-10 w-full items-center gap-2.5 rounded-xl text-left transition-colors duration-150",
      collapsed ? "justify-center px-0" : "px-1.5",
      tone === "active" && "sidebar-row-active bg-[rgba(139,92,246,0.16)] text-white",
      tone === "open" && "sidebar-row-open text-[#E4E4EE]",
      tone === "idle" && "text-[#A1A1B3] hover:bg-white/[0.04] hover:text-white"
    );

  const renderItems = (items: NavItem[]) =>
    items.map((item) => {
      const hasChildren = !!item.children?.length;
      const childActive = item.children?.some((c) => pathMatches(location, c.href)) ?? false;
      const selfActive = item.href ? pathMatches(location, item.href) : false;
      const isActive = collapsed ? selfActive || childActive : selfActive;
      const tone: "active" | "open" | "idle" = isActive
        ? "active"
        : childActive
          ? "open"
          : "idle";
      const isExpanded = !!expandedSections[item.id];
      const rowContent = renderItemInner(item, tone, hasChildren, isExpanded);

      const row =
        item.href && !hasChildren ? (
          <Link href={item.href} onClick={handleNavigate}>
            <div className={itemClass(tone)}>{rowContent}</div>
          </Link>
        ) : (
          <button
            type="button"
            className={itemClass(tone)}
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
        <div key={item.id}>
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
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mb-1 mt-1 space-y-0.5 pl-4">
                  {item.children!.map((child) => {
                    const childIsActive = pathMatches(location, child.href);
                    return (
                      <Link key={child.id} href={child.href} onClick={handleNavigate}>
                        <div
                          className={cn(
                            "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150",
                            childIsActive
                              ? "bg-[rgba(139,92,246,0.16)] text-white"
                              : "text-[#9A9AAB] hover:bg-white/[0.04] hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              childIsActive ? "bg-[#A78BFA]" : "bg-[#3A3A48]"
                            )}
                          />
                          {child.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });

  const navContent = (
    <div
      className={cn(
        "bg-sidebar-premium relative z-0 flex h-full flex-col overflow-hidden text-[#F4F4F8]",
        isMobile ? "rounded-r-[22px]" : "rounded-[22px]"
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-3.5 pb-2 pt-4", collapsed && "px-2")}>
        <div className="sidebar-logo-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
          <BookOpen className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight tracking-tight text-white">Edu Transform</p>
            <p className="truncate text-[11px] text-[#8E8EA0]">Aadi Technology</p>
          </div>
        )}
        <button
          type="button"
          onClick={isMobile ? onMobileClose : onToggleCollapse}
          className="rounded-lg p-1.5 text-[#8E8EA0] hover:bg-white/[0.06] hover:text-white"
          aria-label={isMobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMobile ? <X className="h-4 w-4" /> : collapsed ? <Menu className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-180" />}
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pb-2">
        <TooltipProvider delayDuration={0}>
          {!collapsed && (
            <p className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E6E80]">
              Workspace
            </p>
          )}
          <div className="space-y-1">{renderItems(mainItems)}</div>
          {footItems.length > 0 && (
            <div className="mt-auto space-y-1 pt-3">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E6E80]">
                  Studio
                </p>
              )}
              {renderItems(footItems)}
            </div>
          )}
        </TooltipProvider>
      </nav>

      <Link href={profileHref} onClick={handleNavigate}>
        <div
          className={cn(
            "sidebar-profile-card mx-2.5 mb-2.5 flex items-center rounded-2xl border",
            collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2.5"
          )}
        >
          <span className="relative shrink-0">
            <Avatar className="h-9 w-9 rounded-xl">
              {user.profilePhoto ? (
                <AvatarImage src={getProfilePhotoSrc(user.profilePhoto) || undefined} alt="" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-[#2A2344] text-[11px] font-semibold text-[#DDD6FE]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#121018] bg-[#22C55E]" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold leading-tight text-white">
                  {user.firstName} {user.lastName}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#8E8EA0]">
                {user.email || roleLabel}
              </span>
            </span>
          )}
        </div>
      </Link>
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
            "fixed inset-y-0 left-0 z-50 h-screen py-3 pl-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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
      className="h-screen shrink-0 p-3 transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH }}
    >
      {navContent}
    </aside>
  );
}
