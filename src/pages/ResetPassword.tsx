// ============================================================================
// ResetPassword.tsx — In-app "Set New Password" page (password-recovery flow).
//
// Contract
// --------
// This route is PUBLIC (registered in App.tsx OUTSIDE <RequireAuth>): a user
// arriving from a recovery e-mail is not an app user yet, so RequireAuth must
// not guard it.
//
// The recovery e-mail link lands on `${origin}/reset-password` with an implicit
// grant fragment (`#access_token=...&type=recovery`). The Supabase client is
// created with `detectSessionInUrl: true`, so on construction it parses that
// fragment, persists a *recovery* session and notifies PASSWORD_RECOVERY.
//
// Terminal states
// ---------------
//   checking → resolving whether a recovery session exists
//   invalid  → no session: the link is absent, expired or already used
//   form     → recovery session present; the user can set a new password
//   success  → password updated; recovery session cleared, link back to /login
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/services/logger";
import {
  KeyRound,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

const MIN_PASSWORD_LENGTH = 6;

type Phase = "checking" | "invalid" | "form" | "success";

export default function ResetPassword() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);

  /* ── Resolve the recovery session ───────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      try {
        // getSession() awaits the client's initialize() promise, which is what
        // consumes the `#access_token=...&type=recovery` fragment. So by the
        // time this resolves, a recovery session — if any — is in storage.
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data?.session?.user) {
          setPhase("invalid");
          return;
        }
        setRecoveryEmail(data.session.user.email ?? null);
        setPhase("form");
      } catch (err: unknown) {
        if (cancelled) return;
        log.auth.unauthorized("reset_password:getSession_failed");
        setPhase("invalid");
      }
    };

    resolveSession();

    // Safety net: PASSWORD_RECOVERY may be emitted a tick after the first
    // session read (the client notifies subscribers from a deferred task).
    // Only promote a currently-invalid/checking view — never clobber success.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY" || !session?.user) return;
      setRecoveryEmail(session.user.email ?? null);
      setPhase((prev) => (prev === "success" ? prev : "form"));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /* ── Validation + submit ────────────────────────────────────────────────── */

  const validate = useCallback(() => {
    const errs: typeof errors = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      errs.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [password, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    // Client-side gate: no network call when the input is invalid.
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setSubmitError(error.message || "Could not update the password. Please try again.");
        log.auth.unauthorized("reset_password:updateUser_failed");
        return;
      }

      // Clear the recovery session so /login renders its form instead of
      // bouncing an already-authenticated recovery user straight into the app.
      try {
        await supabase.auth.signOut();
      } catch {
        // Non-fatal: the password change already succeeded.
      }
      log.auth.logout();
      setPassword("");
      setConfirmPassword("");
      setPhase("success");
    } catch (err: unknown) {
      setSubmitError((err as Error)?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [password, validate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) handleSubmit();
  };

  /* ── Shared chrome ──────────────────────────────────────────────────────── */

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <img src={logoImg} alt="QBase" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">QBase</h1>
          <p className="text-sm text-muted-foreground mt-1">Quality Management System</p>
        </div>
        {children}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          QBase v2.5 · ISO 9001 Quality Management
        </p>
      </div>
    </div>
  );

  /* ── Checking ───────────────────────────────────────────────────────────── */

  if (phase === "checking") {
    return shell(
      <Card className="border-border/60 shadow-lg" data-testid="reset-password-checking">
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your recovery link…</p>
        </CardContent>
      </Card>,
    );
  }

  /* ── Invalid / expired link ─────────────────────────────────────────────── */

  if (phase === "invalid") {
    return shell(
      <Card
        className="border-destructive/40 shadow-lg"
        data-testid="reset-password-invalid"
      >
        <CardHeader>
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-destructive/10 border border-destructive/20 mb-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <CardTitle className="text-xl text-foreground">Link invalid or expired</CardTitle>
          <CardDescription>
            We could not verify a password-recovery session for this page. The link may have
            expired, already been used, or been opened without its security token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">
              Request a fresh link from the sign-in page using{" "}
              <span className="text-foreground font-medium">Forgot password?</span>, then open the
              newest e-mail you received.
            </p>
          </div>
          <Button asChild className="w-full h-11 font-semibold" data-testid="reset-password-back-to-login">
            <Link to="/login">
              Back to sign in <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>,
    );
  }

  /* ── Success ────────────────────────────────────────────────────────────── */

  if (phase === "success") {
    return shell(
      <Card className="border-success/40 shadow-lg" data-testid="reset-password-success">
        <CardHeader>
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-success/10 border border-success/20 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <CardTitle className="text-xl text-foreground">Password updated</CardTitle>
          <CardDescription>
            Your new password has been saved. You can now sign in to QBase with it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full h-11 font-semibold" data-testid="reset-password-go-to-login">
            <Link to="/login">
              Continue to sign in <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>,
    );
  }

  /* ── Set new password form ──────────────────────────────────────────────── */

  return shell(
    <Card className="border-border/60 shadow-lg" data-testid="reset-password-form">
      <CardHeader>
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 mb-2">
          <KeyRound className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="text-xl text-foreground">Set New Password</CardTitle>
        <CardDescription>
          {recoveryEmail
            ? `Choose a new password for ${recoveryEmail}.`
            : "Choose a new password for your account."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {submitError && (
          <div
            className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3"
            data-testid="reset-password-error"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{submitError}</p>
          </div>
        )}

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onKeyDown={handleKeyDown}
              className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
              autoComplete="new-password"
              data-testid="reset-password-new"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide new password" : "Show new password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              onKeyDown={handleKeyDown}
              className={`pl-10 pr-10 h-11 ${errors.confirmPassword ? "border-destructive" : ""}`}
              autoComplete="new-password"
              data-testid="reset-password-confirm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <Button
          className="w-full h-11 font-semibold"
          onClick={handleSubmit}
          disabled={isSubmitting}
          data-testid="reset-password-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating password…
            </>
          ) : (
            <>
              Set New Password <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>

      <CardFooter className="justify-center">
        <Link to="/login" className="text-xs text-primary hover:underline font-medium">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>,
  );
}
