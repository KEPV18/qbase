import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lock, Mail, Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import logoImg from "@/assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login, user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const validate = () => {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email.trim()) && email.trim() !== "admin@local") errs.email = "Invalid email address";
    if (!password.trim()) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    const res = await login(email.trim(), password.trim());
    setIsLoading(false);
    if (!res.ok) {
      toast.error("Login failed", { description: res.message });
      return;
    }
    navigate("/");
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const isDev = import.meta.env.DEV;
    const url = isDev ? "http://localhost:3001/api/auth" : "/api/auth";
    window.location.href = url;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden grid-bg">
      {/* Aurora glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden aurora-bg opacity-60" />

      {/* Brand mark */}
      <div className="absolute top-8 left-8 flex items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 bg-neon-cyan/10 rounded-sm flex items-center justify-center border border-neon-cyan/20">
          <span className="text-primary font-mono font-black text-[10px] tracking-tighter">QMS</span>
        </div>
        <div>
          <div className="text-xl font-black text-foreground tracking-tight">QMS Suite</div>
          <div className="text-[8px] text-muted-foreground font-mono font-bold uppercase tracking-[0.3em]">ISO 9001:2015</div>
        </div>
      </div>

      {/* Corporate Branding */}
      <div className="absolute top-8 right-8 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
        <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Founded by</span>
        <img src={logoImg} alt="Vezloo" className="w-5 h-5 object-contain" />
        <span className="text-xs font-bold text-foreground font-mono">Vezloo Group</span>
      </div>

      <Card className="w-full max-w-[420px] shadow-xl border-neon-cyan/10 rounded-sm overflow-hidden animate-fade-in bg-card/95 backdrop-blur-xl accent-line-top">
        <CardHeader className="text-center pt-10 pb-4">
          <div className="mb-5 relative mx-auto w-14 h-14">
            <div className="absolute inset-0 bg-neon-cyan/15 rounded-sm blur-xl animate-glow-pulse" />
            <div className="relative w-14 h-14 bg-gradient-to-br from-neon-cyan/20 to-neon-violet/10 rounded-sm flex items-center justify-center border border-neon-cyan/25">
              <Lock className="w-6 h-6 text-neon-cyan" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Vezloo QMS</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-1 font-mono">Sign in to your enterprise quality account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-7 pb-4" onKeyDown={handleKeyDown}>
          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-11 rounded-sm gap-3 font-semibold border-border/50 hover:bg-muted/60 hover:border-neon-cyan/20 transition-all text-sm"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-4 text-muted-foreground/70 font-mono font-medium uppercase tracking-wider text-[10px]">or continue with email</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Email</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="you@company.com"
                className={`pl-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Password</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                placeholder="••••••••"
                className={`pl-10 pr-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>
            )}
          </div>
        </CardContent>

        <CardContent className="px-7 pb-2">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" className="h-4 w-4 rounded-sm" />
            <label htmlFor="remember" className="text-[10px] font-mono text-muted-foreground/70 cursor-pointer">Remember me</label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-7 pb-9">
          <Button
            className="w-full h-11 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all active:scale-[0.98] group"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                Sign in
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>

          <button
            onClick={() => toast.info("Password Reset", { description: "Please contact your administrator to reset your password." })}
            className="text-[10px] text-muted-foreground/60 font-mono hover:text-primary transition-colors w-full text-center"
          >
            Forgot your password?
          </button>

          <p className="text-center text-xs text-muted-foreground font-mono">
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")} className="text-primary hover:underline font-semibold transition-colors">
              Request access
            </button>
          </p>
        </CardFooter>
      </Card>

      <div className="absolute bottom-8 text-[9px] font-mono font-bold uppercase tracking-[0.4em] text-muted-foreground/30">
        Vezloo QMS Platform v2.5.0
      </div>
    </div>
  );
}