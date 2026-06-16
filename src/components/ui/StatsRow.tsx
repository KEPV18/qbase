import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  icon: LucideIcon;
  value: number | string;
  label: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  onClick?: () => void;
}

interface StatsRowProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const variantStyles: Record<string, { icon: string; value: string; bg: string; border: string }> = {
  default: { icon: "text-primary", value: "text-foreground", bg: "bg-primary/10", border: "border-primary/20" },
  success: { icon: "text-success", value: "text-success", bg: "bg-success/10", border: "border-success/20" },
  warning: { icon: "text-warning", value: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  destructive: { icon: "text-destructive", value: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  info: { icon: "text-info", value: "text-info", bg: "bg-info/10", border: "border-info/20" },
};

const colStyles: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

export function StatsRow({ stats, columns, className }: StatsRowProps) {
  const cols = columns || (stats.length <= 4 ? 4 : stats.length <= 5 ? 5 : 6);

  return (
    <div className={cn(
      "grid gap-3 animate-fade-in",
      colStyles[cols],
      className
    )}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const variant = stat.variant || "default";
        const styles = variantStyles[variant];

        return (
          <div
            key={i}
            className={cn(
              "bg-card border border-border/50 rounded-sm p-4 flex items-center gap-3 transition-colors duration-150 group",
              stat.onClick && "cursor-pointer"
            )}
            onClick={stat.onClick}
          >
            
            <div className="flex items-center gap-3 w-full">
              <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border", styles.bg, styles.border)}>
                <Icon className={cn("w-5 h-5", styles.icon)} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xl font-black leading-none", styles.value)}>{stat.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
