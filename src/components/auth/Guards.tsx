import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { log } from "@/services/logger";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    log.auth.unauthorized(`route:${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export function RequireRole({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    log.auth.unauthorized(`route:${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!roles.includes(user.role)) {
    log.auth.unauthorized(`route:${location.pathname}:role_required:${roles.join(',')}`, user.id);
    return <Navigate to="/" replace />;
  }
  return children;
}
