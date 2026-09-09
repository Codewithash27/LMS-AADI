import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type RoleType = "admin" | "student" | "superadmin";

export function ProtectedRoute({
  path,
  component: Component,
  roles = []
}: {
  path: string;
  component: () => React.JSX.Element;
  roles?: RoleType[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If roles are specified, check if user has proper role
  if (roles.length > 0 && !roles.includes(user.role as RoleType)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user.role === "admin" || user.role === "superadmin" 
      ? "/admin/dashboard" 
      : "/student/dashboard";
    
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
