import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "destructive";
  isLoading?: boolean;
}

export function StatusCard({ title, value, subtitle, icon: Icon, trend, variant = "default", isLoading = false }: StatusCardProps) {
  const styles = {
    default: {
      card: "border-border/50 hover:border-primary/40",
      iconBg: "bg-gradient-to-br from-primary/20 to-primary/10",
      iconText: "text-primary",
      glow: "shadow-primary/5",
      gradient: "from-primary/[0.07] via-primary/[0.02] to-transparent",
      hoverGlow: "hover:shadow-lg hover:shadow-primary/10",
    },
    success: {
      card: "border-success/20 hover:border-success/40",
      iconBg: "bg-gradient-to-br from-success/25 to-success/10",
      iconText: "text-success",
      glow: "shadow-success/5",
      gradient: "from-success/[0.07] via-success/[0.02] to-transparent",
      hoverGlow: "hover:shadow-lg hover:shadow-success/10",
    },
    warning: {
      card: "border-warning/20 hover:border-warning/40",
      iconBg: "bg-gradient-to-br from-warning/25 to-warning/10",
      iconText: "text-warning",
      glow: "shadow-warning/5",
      gradient: "from-warning/[0.07] via-warning/[0.02] to-transparent",
      hoverGlow: "hover:shadow-lg hover:shadow-warning/10",
    },
    destructive: {
      card: "border-destructive/20 hover:border-destructive/40",
      iconBg: "bg-gradient-to-br from-destructive/25 to-destructive/10",
      iconText: "text-destructive",
      glow: "shadow-destructive/5",
      gradient: "from-destructive/[0.07] via-destructive/[0.02] to-transparent",
      hoverGlow: "hover:shadow-lg hover:shadow-destructive/10",
    },
  };

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="w-12 h-12 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative bg-card/80 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 group cursor-pointer overflow-hidden border",
      
      styles[variant].card,
      styles[variant].hoverGlow
    )}>
      {/* Gradient background overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", styles[variant].gradient)} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{title}</p>
          <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight leading-none animate-counter">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md mt-1",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ",
          styles[variant].iconBg
        )}>
          <Icon className={cn("w-5 h-5", styles[variant].iconText)} />
        </div>
      </div>
    </div>
  );
}