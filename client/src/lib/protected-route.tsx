import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole } from "@shared/schema";
import { ReactElement } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => ReactElement | null;
  requiredRole?: string;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        // If requiredRole is specified, check if user has that role
        if (requiredRole && user.role !== requiredRole) {
          // Redirect based on user role
          if (user.role === UserRole.ADMIN) {
            return <Redirect to="/" />;
          } else if (user.role === UserRole.MENTOR) {
            return <Redirect to="/mentor" />;
          } else {
            return <Redirect to="/mentee" />;
          }
        }

        return <Component />;
      }}
    </Route>
  );
}
