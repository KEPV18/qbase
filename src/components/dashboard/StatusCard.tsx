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
  const colors = {
    default: { icon: "text-primary", iconBg: "bg-primary/10", border: "border-border hover:border-primary/20" },
    success: { icon: "text-emerald-500", iconBg: "bg-emerald-500/10", border: "border-border hover:border-emerald-500/20" },
    warning: { icon: "text-amber-500", iconBg: "bg-amber-500/10", border: "border-border hover:border-amber-500/20" },
    destructive: { icon: "text-red-500", iconBg: "bg-red-500/10", border: "border-border hover:border-red-500/20" },
  };
  const c = colors[variant];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card border rounded-lg p-5 transition-all duration-200 cursor-default",
      c.border
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={cn("text-xs font-medium flex items-center gap-1", trend.isPositive ? "text-emerald-500" : "text-red-500")}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("w-5 h-5", c.icon)} />
        </div>
      </div>
    </div>
  );
}