import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { log } from "@/services/logger";

/**
 * RequireAuth — guards routes that need a logged-in user.
 *
 * Behaviour:
 *   - While `loading` is true, render a spinner and do NOT redirect.
 *     This lets the bootstrap effect (useSupabaseAuth) restore the
 *     session from localStorage without bouncing to /login on refresh.
 *   - A 6s safety timer clears a stuck `loading` state so the UI never
 *     hangs forever if auth never resolves. Only after that fallback
 *     do we redirect to /login when there is no user.
 *   - When `loading` is false and a user exists, render the children.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [fallbackReady, setFallbackReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFallbackReady(false);
      return;
    }
    const timer = setTimeout(() => setFallbackReady(true), 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Still restoring session — show spinner, do not redirect
  if (loading && !fallbackReady) {
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

/**
 * RequireRole — guards routes that need a specific role.
 * Same loading-aware semantics as RequireAuth.
 */
export function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [fallbackReady, setFallbackReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFallbackReady(false);
      return;
    }
    const timer = setTimeout(() => setFallbackReady(true), 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !fallbackReady) {
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