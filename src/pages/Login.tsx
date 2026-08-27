import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lock, Mail, Loader2, Eye, EyeOff, ArrowRight, Trash2 } from "lucide-react";
import logoImg from "@/assets/logo.png";

/* ── Nuclear cache clear ──────────────────────────────────────────── */
function nukeCache() {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(";").forEach(c => {
    const [name] = c.split("=");
    document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  window.location.reload();
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login, resetPassword, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const validate = () => {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email.trim()) && email.trim() !== "admin@local") errs.email = "Invalid email format";
    if (!password.trim()) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    // Race login against a 10s timeout so the spinner always clears
    const loginPromise = login(email.trim(), password.trim());
    const timeoutPromise = new Promise<{ ok: false; code: string; message: string }>(
      (resolve) => setTimeout(
        () => resolve({ ok: false, code: "timeout", message: "Login timed out. Please try again." }),
        10000,
      ),
    );
    const res = await Promise.race([loginPromise, timeoutPromise]);
    setIsLoading(false);
    if (!res.ok) {
      toast.error("Login failed", { description: res.message });
      return;
    }
    // Explicit navigate on success — don't rely solely on useEffect redirect
    // (useEffect still handles session-restore on refresh; this handles fresh login)
    const from = location.state?.from?.pathname || "/";
    navigate(from, { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first", { description: "Please enter your email address above." });
      return;
    }
    setResetLoading(true);
    const res = await resetPassword(email.trim());
    setResetLoading(false);
    if (res.ok) {
      setResetSent(true);
      toast.success("Reset link sent", { description: res.message });
    } else {
      toast.error("Failed to send reset link", { description: res.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Soft gradient accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <img src={logoImg} alt="QBase" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">QBase</h1>
          <p className="text-sm text-muted-foreground mt-1">Quality Management System</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="pt-6 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
                  onKeyDown={handleKeyDown}
                  className={`pl-10 h-11 ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                  onKeyDown={handleKeyDown}
                  className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Forgot Password */}
            <div className="text-right -mt-2">
              {resetSent ? (
                <p className="text-xs text-success font-medium">✓ Reset link sent! Check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              )}
            </div>

            {/* Sign in button */}
            <Button
              className="w-full h-11 font-semibold"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>

            {/* Clear cache button */}
            <button
              type="button"
              onClick={nukeCache}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Use this if the app feels stuck or shows old data"
            >
              <Trash2 className="w-3 h-3" /> Clear cache &amp; reload
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          QBase v2.5 · ISO 9001 Quality Management
        </p>
      </div>
    </div>
  );
}