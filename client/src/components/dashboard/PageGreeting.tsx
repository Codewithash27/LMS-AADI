import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, LogOut, Search, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

type PageGreetingProps = {
  workspace: "Admin" | "Student";
  greeting: string;
  firstName: string;
  photo?: string | null;
  initials: string;
  profileHref: string;
};

function Face({ photo, initials }: { photo?: string | null; initials: string }) {
  const [broken, setBroken] = useState(false);
  const letters = initials.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "U";
  if (!photo || broken) return <span className="dsh-face">{letters}</span>;
  return <img className="dsh-face" src={photo} alt="" onError={() => setBroken(true)} />;
}

export function PageGreeting({ workspace, greeting, firstName, photo, initials, profileHref }: PageGreetingProps) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || firstName;
  const email = user?.email || user?.username || "";

  return (
    <header className="dsh-greet">
      <div>
        <p className="k">Aadi Technology · {workspace} workspace</p>
        <h1>
          {greeting},<br />
          <i>{firstName}</i>
        </h1>
      </div>
      <div className="dsh-greet-side">
        <label className="dsh-search">
          <Search strokeWidth={2} aria-hidden />
          <input type="search" placeholder="Search" aria-label="Search" />
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="dsh-avatar" aria-label="Account menu">
              <Face photo={photo} initials={initials} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} collisionPadding={16} className="dsh-menu">
            <div className="dsh-menu-who">
              <Face photo={photo} initials={initials} />
              <div>
                <strong>{name}</strong>
                <p>{email}</p>
              </div>
            </div>
            <DropdownMenuItem className="dsh-menu-item" onClick={() => setLocation(profileHref)}>
              <UserRound strokeWidth={2} aria-hidden />
              Account Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="dsh-menu-item" onClick={() => setLocation(profileHref)}>
              <Lock strokeWidth={2} aria-hidden />
              Security Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="dsh-menu-item out"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut strokeWidth={2} aria-hidden />
              {logoutMutation.isPending ? "Signing out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
