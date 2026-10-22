import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ChevronDown,
  LogOut,
  Lock,
  Menu,
  User as UserIcon,
} from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFirstName, getTimeGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const {
    collapsed,
    toggleCollapsed,
    mobileOpen,
    setMobileOpen,
    closeMobile,
  } = useSidebar();
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setUserMenuOpen(false);
    closeMobile();
  }, [location, closeMobile]);

  const greeting = getTimeGreeting();
  const firstName = getFirstName(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "User"
  );

  const homePath =
    user?.role === "student" ? "/student/dashboard" : "/admin/dashboard";
  const profilePath =
    user?.role === "student" ? "/student/profile" : "/admin/profile";

  const handleLogout = useCallback(() => {
    setUserMenuOpen(false);
    logoutMutation.mutate();
  }, [logoutMutation]);

  const syncedDash = location === "/" || location.startsWith("/admin/dashboard");
  const courseLibrary =
    location === "/admin/courses" || location === "/student/my-courses";
  const examBoard = location === "/admin/exams";
  const coursePlayer = /^\/student\/my-courses\/\d+/.test(location);
  const dashHome = syncedDash || location === "/student/dashboard";
  const flushDark = courseLibrary || coursePlayer || dashHome || examBoard;
  const darkShell = syncedDash || courseLibrary;
  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "U";

  return (
    <div className={cn("app-shell flex h-screen overflow-hidden bg-background", darkShell && "dash-app", flushDark && "course-shell")}>
      <Sidebar
        mobileOpen={isMobile && mobileOpen}
        onMobileClose={closeMobile}
        collapsed={!isMobile && collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div
        className={cn(
          "main-content-premium flex min-h-0 min-w-0 flex-1 flex-col transition-[width,margin] duration-300 ease-out",
          darkShell && !flushDark && "gap-3 py-3 pr-3",
          darkShell && !flushDark && (isMobile ? "pl-3" : "pl-0")
        )}
      >
        {!flushDark && (
        <header
          className={cn(
            "glass-appbar z-30 shrink-0",
            darkShell
              ? "rounded-[22px] border border-white/10"
              : "sticky top-0 border-b border-border/70 shadow-sm"
          )}
        >
          <div className={cn("flex items-center justify-between gap-3 px-3 sm:px-4", darkShell ? "h-14" : "h-12")}>
            <div className="flex min-w-0 items-center gap-2">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              {darkShell && user ? (
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <span className="animate-wave-hand shrink-0 text-lg leading-none sm:text-xl" aria-hidden>
                    👋
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
                      <span className="sm:hidden">Hi, {firstName}</span>
                      <span className="hidden sm:inline">
                        {greeting.text}, {firstName}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      <span className="sm:hidden">{greeting.text}</span>
                      <span className="hidden sm:inline">Admin workspace</span>
                    </p>
                  </div>
                </div>
              ) : (
                <Link href={homePath}>
                  <span className="font-display cursor-pointer truncate text-[13px] font-bold tracking-tight text-foreground">
                    Edu Transform
                  </span>
                </Link>
              )}
            </div>

            {user && (
              <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                {!darkShell && (
                  <p className="hidden truncate text-[11px] text-muted-foreground md:block">
                    {greeting.text}, <span className="font-semibold text-foreground">{firstName}</span>
                  </p>
                )}

                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="h-[22px] w-[22px] sm:h-7 sm:w-7">
                        {user.profilePhoto ? (
                          <AvatarImage
                            src={getProfilePhotoSrc(user.profilePhoto) || undefined}
                            alt=""
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary text-[9px] font-bold text-primary-foreground sm:text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[240px] rounded-2xl border-border p-2 shadow-card-soft"
                  >
                    <div className="mb-1 rounded-xl bg-muted/60 px-3 py-2.5">
                      <p className="text-sm font-bold text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {user.email || user.username}
                      </p>
                    </div>
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-xl py-2.5 font-medium"
                      onClick={() => setLocation(profilePath)}
                    >
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      Account Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-xl py-2.5 font-medium"
                      onClick={() => setLocation(profilePath)}
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Security Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-xl py-2.5 font-semibold text-destructive focus:text-destructive"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          <div
            className={cn(
              "w-full min-w-0",
              courseLibrary
                ? "course-library"
                : examBoard
                  ? "exam-board"
                : coursePlayer
                  ? "scp-shell"
                  : dashHome
                    ? "dash-home"
                : syncedDash
                  ? "flex h-full min-h-0 min-w-0 flex-col"
                  : darkShell
                    ? "px-1 sm:px-2"
                    : "px-3 py-3 sm:px-4 md:px-5 md:py-4"
            )}
          >
            {children}
          </div>
        </main>

        {!flushDark && (
        <footer
          className={cn(
            "z-20 flex shrink-0 items-center justify-between px-3 sm:px-4",
            darkShell
              ? "h-11 rounded-[22px] border border-white/10"
              : "sticky bottom-0 h-9 border-t border-border bg-card"
          )}
        >
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary">
              <BookOpen className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
            <span className="hidden text-[10px] font-semibold text-foreground sm:inline">
              Edu Transform
            </span>
          </div>
          <p className={cn("min-w-0 truncate text-center text-[10px] text-muted-foreground")}>
            © {new Date().getFullYear()} Edu Transform
          </p>
          <div className="hidden w-14 shrink-0 sm:block" />
        </footer>
        )}
      </div>
    </div>
  );
}

export { MainLayout as DashboardLayout };
