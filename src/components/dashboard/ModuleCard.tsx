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

/* ─── Color helper — generates styles from module class ──────────── */
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
  const totalRecords = stats.recordsCount;
  const approvedRecords = totalRecords - stats.pendingCount - stats.issuesCount;
  const complianceRate = totalRecords > 0 ? Math.max(0, Math.round((approvedRecords / totalRecords) * 100)) : 100;

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
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
      {/* Top accent bar */}
      <div className={cn("h-1.5 w-full", s.accentBar)} />

      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
              s.iconBg
            )}>
              <Icon className={cn("w-6 h-6", s.iconText)} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
              {isoClause && (
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{isoClause}</span>
              )}
            </div>
          </div>
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0",
            s.statBg
          )}>
            <ArrowRight className={cn("w-3.5 h-3.5", s.statIcon)} />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-2">{description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={cn("flex items-center gap-2 p-2.5 rounded-lg", s.statBg)}>
            <FileText className={cn("w-3.5 h-3.5", s.statIcon)} />
            <div>
              <span className="text-sm font-bold font-mono text-foreground">{stats.formsCount}</span>
              <span className="text-[9px] text-muted-foreground ml-1">Forms</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 p-2.5 rounded-lg", s.statBg)}>
            <FolderOpen className={cn("w-3.5 h-3.5", s.statIcon)} />
            <div>
              <span className="text-sm font-bold font-mono text-foreground">{stats.recordsCount}</span>
              <span className="text-[9px] text-muted-foreground ml-1">Records</span>
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Compliance
            </span>
            <span className={cn(
              "text-sm font-extrabold font-mono",
              complianceRate >= 80 ? "text-success" : complianceRate >= 50 ? "text-warning" : "text-destructive"
            )}>
              {complianceRate}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/30 overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              complianceRate >= 80 ? "bg-gradient-to-r from-success/60 to-success"
                : complianceRate >= 50 ? "bg-gradient-to-r from-warning/60 to-warning"
                  : "bg-gradient-to-r from-destructive/60 to-destructive"
            )} style={{ width: `${complianceRate}%` }} />
          </div>
        </div>

        {/* Alerts */}
        {(stats.pendingCount > 0 || stats.issuesCount > 0) && (
          <div className="mt-3 flex items-center gap-2 text-[10px]">
            <Activity className="w-3 h-3 text-muted-foreground" />
            {stats.pendingCount > 0 && (
              <span className="bg-warning/10 text-warning font-semibold px-1.5 py-0.5 rounded-md font-mono">{stats.pendingCount} pending</span>
            )}
            {stats.issuesCount > 0 && (
              <span className="bg-destructive/10 text-destructive font-semibold px-1.5 py-0.5 rounded-md font-mono">{stats.issuesCount} issues</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}