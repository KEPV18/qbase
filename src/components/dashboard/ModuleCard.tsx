import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FileText, FolderOpen, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Types ───────────────────────────────────────────────────────── */
interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  moduleClass?: string;
  isoClause?: string;
  stats: { formsCount: number; recordsCount: number; pendingCount: number; issuesCount: number };
  isLoading?: boolean;
  onClick: () => void;
}

/* ─── Color helper ─────────────────────────────────────────────────── */
function moduleStyles(moduleClass?: string) {
  const base = moduleClass?.replace("module-", "") || "primary";
  return {
    iconBg: `bg-gradient-to-br from-[hsl(var(--module-${base})/0.25)] to-[hsl(var(--module-${base})/0.10)]`,
    iconText: `text-[hsl(var(--module-${base}))]`,
    border: `border-[hsl(var(--module-${base})/0.15)] hover:border-[hsl(var(--module-${base})/0.40)]`,
    accentBar: `bg-gradient-to-r from-[hsl(var(--module-${base}))] to-[hsl(var(--module-${base})/0.7)]`,
    statBg: `bg-[hsl(var(--module-${base})/0.08)]`,
    statIcon: `text-[hsl(var(--module-${base}))] opacity-60`,
  };
}

/* ─── Component ───────────────────────────────────────────────────── */
export function ModuleCard({
  title, description, icon: Icon, moduleClass, isoClause,
  stats, isLoading = false, onClick,
}: ModuleCardProps) {
  const s = moduleStyles(moduleClass);
  const total = stats.formsCount + stats.recordsCount;
  const issues = stats.pendingCount + stats.issuesCount;
  const complianceRate = total > 0 ? Math.round(((total - issues) / total) * 100) : 100;

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-[1.875rem] space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[3.75rem] w-[3.75rem] rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[3.125rem] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative bg-card/80 backdrop-blur-sm rounded-xl border overflow-hidden group cursor-pointer transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl text-left w-full",
        s.border
      )}
    >
      {/* Top accent bar — 5x taller */}
      <div className={cn("h-[0.46875rem] w-full", s.accentBar)} />

      <div className="p-[1.875rem] flex flex-col h-full">
        {/* Header — 1.25x scaled */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-[3.75rem] h-[3.75rem] rounded-[0.9375rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
              s.iconBg
            )}>
              <Icon className={cn("w-[1.875rem] h-[1.875rem]", s.iconText)} />
            </div>
            <div>
              <h3 className="text-[1.125rem] font-bold text-foreground leading-tight">{title}</h3>
              {isoClause && (
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">{isoClause}</span>
              )}
            </div>
          </div>
          <div className={cn(
            "w-[2.1875rem] h-[2.1875rem] rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0",
            s.statBg
          )}>
            <ArrowRight className={cn("w-[1.1rem] h-[1.1rem]", s.statIcon)} />
          </div>
        </div>

        <p className="text-[0.875rem] text-muted-foreground leading-relaxed mb-5 flex-1 line-clamp-2">{description}</p>

        {/* Stats — 1.25x scaled */}
        <div className="grid grid-cols-2 gap-[0.625rem] mb-5">
          <div className={cn("flex items-center gap-[0.625rem] p-[0.9375rem] rounded-lg", s.statBg)}>
            <FileText className={cn("w-[1.1rem] h-[1.1rem]", s.statIcon)} />
            <div>
              <span className="text-[1.125rem] font-bold font-mono text-foreground">{stats.formsCount}</span>
              <span className="text-[0.7rem] text-muted-foreground ml-1">Forms</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-[0.625rem] p-[0.9375rem] rounded-lg", s.statBg)}>
            <FolderOpen className={cn("w-[1.1rem] h-[1.1rem]", s.statIcon)} />
            <div>
              <span className="text-[1.125rem] font-bold font-mono text-foreground">{stats.recordsCount}</span>
              <span className="text-[0.7rem] text-muted-foreground ml-1">Records</span>
            </div>
          </div>
        </div>

        {/* Compliance bar — 5x taller */}
        <div className="space-y-[0.625rem]">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-[1.1rem] h-[1.1rem]" /> Compliance
            </span>
            <span className={cn(
              "text-[1.125rem] font-extrabold font-mono",
              complianceRate >= 80 ? "text-success" : complianceRate >= 50 ? "text-warning" : "text-destructive"
            )}>
              {complianceRate}%
            </span>
          </div>
          <div className="h-[3.125rem] w-full rounded-full bg-muted/30 overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out flex items-end",
              complianceRate >= 80 ? "bg-gradient-to-r from-success/60 to-success"
                : complianceRate >= 50 ? "bg-gradient-to-r from-warning/60 to-warning"
                  : "bg-gradient-to-r from-destructive/60 to-destructive"
            )} style={{ width: `${complianceRate}%` }} />
          </div>
        </div>

        {/* Alerts — 1.25x scaled */}
        {(stats.pendingCount > 0 || stats.issuesCount > 0) && (
          <div className="mt-[0.9375rem] flex items-center gap-[0.625rem] text-[0.8rem]">
            <Activity className="w-[1.1rem] h-[1.1rem] text-muted-foreground" />
            {stats.pendingCount > 0 && (
              <span className="bg-warning/10 text-warning font-semibold px-[0.46875rem] py-[0.1875rem] rounded-md font-mono">{stats.pendingCount} pending</span>
            )}
            {stats.issuesCount > 0 && (
              <span className="bg-destructive/10 text-destructive font-semibold px-[0.46875rem] py-[0.1875rem] rounded-md font-mono">{stats.issuesCount} issues</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}