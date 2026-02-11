import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export function RoleRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect based on user role
  switch (user.role) {
    case 'admin':
      return <Redirect to="/admin" />;
    case 'mentor':
      return <Redirect to="/mentor" />;
    case 'mentee':
      return <Redirect to="/mentee" />;
    default:
      return <Redirect to="/auth" />;
  }
}
