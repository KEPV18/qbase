import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  isLoading?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-500",
};

export function StatCard({
  icon: Icon,
  value,
  label,
  variant = "default",
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn("bg-card/40 backdrop-blur-xl border border-border/40 hover:border-primary/40 rounded-sm p-5 md:p-6 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1 overflow-hidden group", className)}>
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10">
        <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center shrink-0 shadow-inner border border-border/50 group-hover:scale-105 transition-transform duration-500", variantStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="text-2xl font-bold text-muted-foreground animate-pulse">--</div>
          ) : (
            <div className="text-2xl font-bold text-foreground">{value}</div>
          )}
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}