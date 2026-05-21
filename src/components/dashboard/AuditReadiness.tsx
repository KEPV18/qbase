import { CheckCircle, Clock, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleStats } from "@/lib/googleSheets";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface AuditReadinessProps {
  moduleStats: ModuleStats[];
  complianceRate: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  emptyFormsCount?: number;
}

const statusConfig = {
  compliant: { icon: CheckCircle, color: "text-success", bg: "bg-success", dotBg: "bg-success" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning", dotBg: "bg-warning" },
  attention: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive", dotBg: "bg-destructive" },
};

function getModuleStatus(s: ModuleStats): "compliant" | "pending" | "attention" {
  if (s.issuesCount > 0) return "attention";
  if (s.pendingCount > 0) return "pending";
  return "compliant";
}

function getModuleProgress(s: ModuleStats): number {
  if (s.formsCount === 0) return 0;
  return Math.round((s.compliantFormsCount / s.formsCount) * 100);
}

// Animated SVG circular gauge with gradient stroke
function ReadinessGauge({ value, size = 88 }: { value: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;

  const gaugeColor = value >= 80 ? "success" : value >= 50 ? "warning" : "destructive";
  const gradientId = `gauge-gradient-${gaugeColor}`;

  // Gradient colors based on compliance level
  const gradientStops = {
    success: { start: "hsl(var(--success))", end: "hsl(var(--success)/0.6)", glow: "hsl(var(--success)/0.3)" },
    warning: { start: "hsl(var(--warning))", end: "hsl(var(--warning)/0.6)", glow: "hsl(var(--warning)/0.3)" },
    destructive: { start: "hsl(var(--destructive))", end: "hsl(var(--destructive)/0.6)", glow: "hsl(var(--destructive)/0.3)" },
  }[gaugeColor];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStops.start} />
            <stop offset="100%" stopColor={gradientStops.end} />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted)/0.3)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc with gradient */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          ref={(el) => {
            if (el) {
              // Trigger animation after mount
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  el.style.strokeDashoffset = String(offset);
                });
              });
            }
          }}
          filter="url(#gauge-glow)"
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "text-xl font-extrabold font-mono",
          value >= 80 ? "text-success" : value >= 50 ? "text-warning" : "text-destructive"
        )}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// Animated compliance bar for each module
function ComplianceBar({ value, name, icon: Icon, color }: { value: number; name: string; icon: React.ElementType; color: string }) {
  const barColor = value >= 80 ? "bg-gradient-to-r from-success/60 to-success" : value >= 50 ? "bg-gradient-to-r from-warning/60 to-warning" : "bg-gradient-to-r from-destructive/60 to-destructive";

  return (
    <div className="flex items-center gap-3 group">
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground truncate">{name}</span>
          <span className={cn(
            "text-[10px] font-bold font-mono",
            value >= 80 ? "text-success" : value >= 50 ? "text-warning" : "text-destructive"
          )}>
            {value}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AuditReadiness({ moduleStats, complianceRate, isLoading = false, onRefresh, emptyFormsCount = 0 }: AuditReadinessProps) {
  // Sort modules worst-first (lowest compliance first)
  const sortedModules = useMemo(() => {
    const valid = (moduleStats ?? []).filter(m => m.formsCount > 0);
    return [...valid].sort((a, b) => getModuleProgress(a) - getModuleProgress(b));
  }, [moduleStats]);

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full mb-3" />)}
      </div>
    );
  }

  const displayCompliance = sortedModules.length > 0 ? Math.max(0, Math.min(100, complianceRate)) : 0;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
      {/* Header with gauge */}
      <div className="px-5 py-5 border-b border-border/50 flex items-center gap-5">
        <ReadinessGauge value={displayCompliance} />
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">System Readiness</h3>
              <p className="text-[10px] text-muted-foreground">{sortedModules.length} active modules</p>
            </div>
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="ghost" size="sm" className="h-7 mt-1 text-[10px] gap-1.5 px-2">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Module compliance bars — sorted worst-first */}
      <div className="p-5 space-y-3">
        {sortedModules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading modules...</p>
        ) : (
          sortedModules.map(module => {
            const status = getModuleStatus(module);
            const config = statusConfig[status];
            const Icon = config.icon;
            const progress = getModuleProgress(module);

            return (
              <div key={module.id}>
                <ComplianceBar
                  value={progress}
                  name={module.name}
                  icon={Icon}
                  color={config.color}
                />
                {(module.issuesCount > 0 || module.pendingCount > 0) && (
                  <div className="flex gap-2 text-[9px] mt-1 ml-7">
                    {module.pendingCount > 0 && <span className="text-warning font-semibold"><span className="font-mono">{module.pendingCount}</span> pending</span>}
                    {module.issuesCount > 0 && <span className="text-destructive font-semibold"><span className="font-mono">{module.issuesCount}</span> issues</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {emptyFormsCount > 0 && (
        <div className="px-5 py-3 bg-warning/5 border-t border-warning/10 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-warning">Documentation Gaps</span>
          <span className="text-[10px] font-bold font-mono text-warning">{emptyFormsCount} empty</span>
        </div>
      )}
    </div>
  );
}