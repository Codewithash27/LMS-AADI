import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BrandWordmark } from "@/components/brand/BrandMark";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Palette,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getProfilePhotoSrc } from "@/lib/profile-photo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavChild = { id: string; label: string; href: string };
type NavItemData = {
  id: string;
  label: string;
  href?: string;
  icon: ReactNode;
  children?: NavChild[];
};

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
  if (href === "/student/my-courses" && location.startsWith("/student/quiz/")) return true;
  if (href === "/student/upcoming-exams" && location.startsWith("/student/take-exam/")) return true;
  return location === href || location.startsWith(href + "/");
}

function RailIcon({ children }: { children: ReactNode }) {
  return <span className="rail-icon">{children}</span>;
}

function NavItem({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("ni", active && "on")}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {!collapsed && <span className="ni-label">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{link}</div>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavGroup({
  label,
  icon,
  open,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  icon: ReactNode;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const button = (
    <button
      type="button"
      className="ni"
      aria-expanded={open}
      onClick={onToggle}
    >
      {icon}
      {!collapsed && (
        <>
          <span className="ni-label">{label}</span>
          {open ? (
            <ChevronDown className="rail-chevron" strokeWidth={2.4} aria-hidden />
          ) : (
            <ChevronRight className="rail-chevron" strokeWidth={2.4} aria-hidden />
          )}
        </>
      )}
    </button>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{button}</div>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {!collapsed && (
        <div className={cn("subnav", open && "open")}>
          <div>
            <div className="subnav-list">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
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

  const menuItems: NavItemData[] = useMemo(() => {
    if (isAdmin) {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: (
            <RailIcon>
              <LayoutDashboard strokeWidth={2} />
            </RailIcon>
          ),
        },
        {
          id: "academics",
          label: "Academics",
          icon: (
            <RailIcon>
              <GraduationCap strokeWidth={2} />
            </RailIcon>
          ),
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
            <RailIcon>
              <Users strokeWidth={2} />
            </RailIcon>
          ),
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
            <RailIcon>
              <BarChart3 strokeWidth={2} />
            </RailIcon>
          ),
        },
        {
          id: "theme-studio",
          label: "Theme Studio",
          href: "/admin/theme-studio",
          icon: (
            <RailIcon>
              <Palette strokeWidth={2} />
            </RailIcon>
          ),
        },
        {
          id: "profile",
          label: "Profile",
          href: "/admin/profile",
          icon: (
            <RailIcon>
              <UserRound strokeWidth={2} />
            </RailIcon>
          ),
        },
      ];
    }

    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/student/dashboard",
        icon: (
          <RailIcon>
            <LayoutDashboard strokeWidth={2} />
          </RailIcon>
        ),
      },
      {
        id: "learning",
        label: "Learning",
        icon: (
          <RailIcon>
            <GraduationCap strokeWidth={2} />
          </RailIcon>
        ),
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
          <RailIcon>
            <Bot strokeWidth={2} />
          </RailIcon>
        ),
      },
      {
        id: "profile",
        label: "My Profile",
        href: "/student/profile",
        icon: (
          <RailIcon>
            <UserRound strokeWidth={2} />
          </RailIcon>
        ),
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

  const handleNavigate = () => {
    if (isMobile) onMobileClose?.();
  };

  const initials =
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "U";
  const profileHref = isAdmin ? "/admin/profile" : "/student/profile";
  const mainItems = menuItems;
  const footItems: NavItemData[] = [];
  const roleLabel = user.role === "superadmin" ? "Super admin" : user.role === "admin" ? "Admin" : "Student";
  const photo = getProfilePhotoSrc(user.profilePhoto);
  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;

  const renderItems = (items: NavItemData[]) =>
    items.map((item) => {
      const visibleChildren = item.children ?? [];
      const hasChildren = visibleChildren.length > 0;
      const childActive = visibleChildren.some((c) => pathMatches(location, c.href));
      const selfActive = item.href ? pathMatches(location, item.href) : false;
      const isExpanded = !!expandedSections[item.id];

      if (hasChildren) {
        return (
          <NavGroup
            key={item.id}
            label={item.label}
            icon={item.icon}
            open={isExpanded}
            collapsed={collapsed}
            onToggle={() => {
              if (collapsed) onToggleCollapse?.();
              toggleSection(item.id);
            }}
          >
            {visibleChildren.map((child) => {
              const active = pathMatches(location, child.href);
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  onClick={handleNavigate}
                  className={cn("si", active && "on")}
                  aria-current={active ? "page" : undefined}
                >
                  {child.label}
                </Link>
              );
            })}
          </NavGroup>
        );
      }

      if (!item.href) return null;

      return (
        <NavItem
          key={item.id}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={collapsed ? selfActive || childActive : selfActive}
          collapsed={collapsed}
          onNavigate={handleNavigate}
        />
      );
    });

  const rail = (
    <div className={cn("rail", collapsed && !isMobile && "is-collapsed")}>
      <div className="rail-brand">
        <div
          className="rail-logo"
          aria-label={collapsed ? "Expand sidebar" : undefined}
          role={collapsed && !isMobile ? "button" : undefined}
          tabIndex={collapsed && !isMobile ? 0 : undefined}
          onClick={collapsed && !isMobile ? onToggleCollapse : undefined}
          onKeyDown={
            collapsed && !isMobile
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") onToggleCollapse?.();
                }
              : undefined
          }
        >
          <BookOpen strokeWidth={2.4} />
        </div>
        {!collapsed && (
          <div className="rail-brand-text">
            <BrandWordmark className="rail-name" />
            <div className="rail-sub">Aadi Technology</div>
          </div>
        )}
        {isMobile ? (
          <button type="button" className="rail-icon-btn" onClick={onMobileClose} aria-label="Close menu">
            <X strokeWidth={2} />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              className="rail-icon-btn rail-collapse"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronRight className="rail-chevron turn" strokeWidth={2.4} />
            </button>
          )
        )}
      </div>

      <TooltipProvider delayDuration={0}>
        <nav className="rail-nav" aria-label="Workspace">
          {!collapsed && <div className="k">Workspace</div>}
          {renderItems(mainItems)}
          <div className="rail-spacer" />
          {footItems.length > 0 && (
            <>
              {!collapsed && <div className="k">Studio</div>}
              {renderItems(footItems)}
            </>
          )}
        </nav>
      </TooltipProvider>

      <Link href={profileHref} onClick={handleNavigate} className="rail-user">
        {photo ? (
          <img src={photo} alt="" className="rail-avatar" />
        ) : (
          <span className="rail-avatar">{initials}</span>
        )}
        {!collapsed && (
          <span className="rail-user-text">
            <span className="rail-user-name">{displayName}</span>
            <span className="rail-user-email">{user.email ? `${roleLabel} · ${user.email}` : roleLabel}</span>
          </span>
        )}
      </Link>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="rail-backdrop" onClick={onMobileClose} aria-hidden />
        )}
        <aside
          className={cn("rail-drawer", mobileOpen && "open")}
          aria-label="Main navigation"
          aria-hidden={!mobileOpen}
        >
          {rail}
        </aside>
      </>
    );
  }

  return (
    <aside className="rail-slot" aria-label="Main navigation">
      {rail}
    </aside>
  );
}

export { NavItem, NavGroup };
