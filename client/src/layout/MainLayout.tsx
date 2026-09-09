import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  BookOpen,
  ChevronDown,
  LogOut,
  Lock,
  Menu,
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={isMobile && mobileOpen}
        onMobileClose={closeMobile}
        collapsed={!isMobile && collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-app-main transition-[width,margin] duration-300 ease-out">
        <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card">
          <div className="flex h-11 items-center justify-between gap-3 px-3 sm:px-4 md:px-5">
            <div className="flex min-w-0 items-center gap-2">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              <Link href={homePath}>
                <span className="font-display cursor-pointer truncate text-[13px] font-bold tracking-tight text-foreground">
                  Edu Transform
                </span>
              </Link>
            </div>

            {user && (
              <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                <p className="hidden truncate text-[11px] text-muted-foreground md:block">
                  {greeting.text}, <span className="font-semibold text-foreground">{firstName}</span>
                </p>

                <div className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground sm:flex">
                  <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="w-24 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground md:w-36"
                    aria-label="Search"
                  />
                </div>

                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" strokeWidth={1.8} />
                </button>

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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          <div className="w-full min-w-0 px-3 py-3 sm:px-4 md:px-5 md:py-4">
            {children}
          </div>
        </main>

        <footer className="sticky bottom-0 z-20 flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-3 sm:px-4">
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
      </div>
    </div>
  );
}

export { MainLayout as DashboardLayout };
