import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { log } from "@/services/logger";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showSpinner, setShowSpinner] = useState(loading);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    // SAFETY: if loading stays true for more than 3s, force show content
    // This prevents infinite spinner if auth state is stuck
    const timer = setTimeout(() => {
      setShowSpinner(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (showSpinner && !user) {
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
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showSpinner, setShowSpinner] = useState(loading);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(false), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (showSpinner && !user) {
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
