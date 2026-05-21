import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserPlus, User, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-destructive" };
  if (score === 2) return { score: 40, label: "Fair", color: "bg-warning" };
  if (score === 3) return { score: 60, label: "Good", color: "bg-warning" };
  if (score === 4) return { score: 80, label: "Strong", color: "bg-primary" };
  return { score: 100, label: "Excellent", color: "bg-success" };
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, user, loading } = useAuth();
  const strength = password ? getPasswordStrength(password) : null;

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email.trim())) errs.email = "Invalid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    const res = await register(email.trim(), password.trim(), name.trim());
    setIsLoading(false);
    if (!res.ok) {
      toast.error("Registration failed", { description: res.message });
      return;
    }
    toast.success("Request submitted", { description: "Your account request has been submitted and is awaiting admin approval." });
    navigate("/login");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRegister();
  };

  const clearError = (field: string) => setErrors(p => { const n = { ...p }; delete n[field]; return n; });

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

      <Card className="w-full max-w-[420px] shadow-xl border-neon-violet/10 rounded-sm overflow-hidden animate-fade-in bg-card/95 backdrop-blur-xl accent-line-top">
        <CardHeader className="text-center pt-10 pb-4">
          <div className="mb-5 relative mx-auto w-14 h-14">
            <div className="absolute inset-0 bg-neon-violet/15 rounded-sm blur-xl animate-glow-pulse" />
            <div className="relative w-14 h-14 bg-gradient-to-br from-neon-violet/20 to-neon-cyan/10 rounded-sm flex items-center justify-center border border-neon-violet/25">
              <UserPlus className="w-6 h-6 text-neon-violet" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create account</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-1 font-mono">Request access to the QMS platform</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3.5 px-7 pb-4" onKeyDown={handleKeyDown}>
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Full name</Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input id="name" value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }}
                placeholder="John Doe"
                className={`pl-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.name ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.name && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Email</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                placeholder="you@company.com"
                className={`pl-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Password</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input id="password" type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                placeholder="••••••••"
                className={`pl-10 pr-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.password ? 'border-destructive' : ''}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}

            {strength && (
              <div className="space-y-1.5 px-0.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground/70 uppercase tracking-wider">Strength</span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{strength.label}</span>
                </div>
                <Progress value={strength.score} className="h-1" indicatorClassName={strength.color} />
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                  {[
                    { met: password.length >= 6, text: "6+ characters" },
                    { met: /[A-Z]/.test(password), text: "Uppercase" },
                    { met: /[0-9]/.test(password), text: "Number" },
                    { met: /[^A-Za-z0-9]/.test(password), text: "Special char" },
                  ].map((r, i) => (
                    <span key={i} className={`text-[10px] flex items-center gap-1 font-mono ${r.met ? 'text-success' : 'text-muted-foreground/40'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {r.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">Confirm password</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-neon-cyan" />
              <Input id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                placeholder="••••••••"
                className={`pl-10 h-11 rounded-sm bg-muted/30 border-border/40 focus:border-neon-cyan/50 focus:ring-neon-cyan/20 transition-all text-sm font-mono ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.confirmPassword}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-7 pb-9">
          <Button
            className="w-full h-11 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all active:scale-[0.98] group"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                Submit request
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground font-mono">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline font-semibold transition-colors">
              Sign in
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