import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FileText, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

function moduleColor(moduleClass?: string) {
  const base = moduleClass?.replace("module-", "") || "primary";
  const colors: Record<string, { icon: string; bg: string; border: string; accent: string; statBg: string }> = {
    sales: { icon: "text-violet-500", bg: "bg-violet-500/10", border: "border-border hover:border-violet-500/25", accent: "bg-violet-500", statBg: "bg-violet-500/10" },
    operations: { icon: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-border hover:border-cyan-500/25", accent: "bg-cyan-500", statBg: "bg-cyan-500/10" },
    quality: { icon: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-border hover:border-emerald-500/25", accent: "bg-emerald-500", statBg: "bg-emerald-500/10" },
    procurement: { icon: "text-amber-500", bg: "bg-amber-500/10", border: "border-border hover:border-amber-500/25", accent: "bg-amber-500", statBg: "bg-amber-500/10" },
    hr: { icon: "text-pink-500", bg: "bg-pink-500/10", border: "border-border hover:border-pink-500/25", accent: "bg-pink-500", statBg: "bg-pink-500/10" },
    rnd: { icon: "text-orange-500", bg: "bg-orange-500/10", border: "border-border hover:border-orange-500/25", accent: "bg-orange-500", statBg: "bg-orange-500/10" },
    management: { icon: "text-primary", bg: "bg-primary/10", border: "border-border hover:border-primary/25", accent: "bg-primary", statBg: "bg-primary/10" },
  };
  return colors[base] || colors.management;
}

export function ModuleCard({
  title, description, icon: Icon, moduleClass, isoClause,
  stats, isLoading = false, onClick,
}: ModuleCardProps) {
  const c = moduleColor(moduleClass);
  const total = stats.formsCount + stats.recordsCount;
  const issues = stats.pendingCount + stats.issuesCount;
  const complianceRate = total > 0 ? Math.round(((total - issues) / total) * 100) : 100;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card border rounded-lg overflow-hidden transition-all duration-200 group",
        "hover:shadow-md hover:-translate-y-0.5",
        c.border
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-1", c.accent)} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
            <Icon className={cn("w-5 h-5", c.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              {isoClause && (
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                  {isoClause}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("rounded-md p-2 text-center", c.statBg)}>
            <p className="text-xs text-muted-foreground">Forms</p>
            <p className="text-sm font-semibold">{stats.formsCount}</p>
          </div>
          <div className="bg-secondary/50 rounded-md p-2 text-center">
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="text-sm font-semibold">{stats.recordsCount}</p>
          </div>
          <div className={cn("rounded-md p-2 text-center", stats.pendingCount > 0 ? "bg-amber-500/10" : "bg-secondary/50")}>
            <p className="text-xs text-muted-foreground">Gaps</p>
            <p className={cn("text-sm font-semibold", stats.pendingCount > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
              {stats.pendingCount}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">
            {complianceRate}% coverage
          </span>
          <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Open <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  );
}