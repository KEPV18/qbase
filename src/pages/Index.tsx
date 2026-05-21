import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AuditReadiness } from "@/components/dashboard/AuditReadiness";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingActions } from "@/components/dashboard/PendingActions";
import { PipelineItem } from "@/components/dashboard/PipelineItem";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { StateScreen } from "@/components/ui/StateScreen";
import {
  useQMSData, useModuleStats, useAuditSummary,
  useReviewSummary, useMonthlyComparison, useRecentActivity,
} from "@/hooks/useQMSData";
import { MODULE_CONFIG } from "@/config/modules";
import {
  FileText, AlertTriangle, Clock, CheckCircle,
  TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Dashboard page ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useQMSData();

  // These hooks take records as input (useMemo-based, not React Query)
  const moduleStats = useModuleStats(records);
  const auditSummary = useAuditSummary(records);
  const reviewSummary = useReviewSummary(records);
  const monthlyComparison = useMonthlyComparison(records);
  const recentActivity = useRecentActivity(records, 5);

  const stats = useMemo(() => {
    const totalEvidence = reviewSummary.completed + reviewSummary.pending + reviewSummary.rejected;
    const gapsCount = records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0;
    return {
      evidence: totalEvidence,
      approved: reviewSummary.completed,
      pending: reviewSummary.pending,
      rejected: reviewSummary.rejected,
      gaps: gapsCount,
    };
  }, [records, reviewSummary]);

  if (isLoading) return <StateScreen state="loading" title="Loading dashboard…" />;
  if (error) return <StateScreen state="error" title="Failed to load data" message={error.message} action={{ label: "Retry", onClick: () => window.location.reload() }} />;

  const totalReviewItems = stats.approved + stats.pending + stats.rejected;
  const approvedPct = totalReviewItems > 0 ? Math.round((stats.approved / totalReviewItems) * 100) : 0;
  const pendingPct = totalReviewItems > 0 ? Math.round((stats.pending / totalReviewItems) * 100) : 0;
  const rejectedPct = totalReviewItems > 0 ? Math.round((stats.rejected / totalReviewItems) * 100) : 0;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-6">

        {/* Decision banner */}
        {stats.rejected > 0 ? (
          <DecisionBanner priority="critical" title={`${stats.rejected} Rejected Records`} description="Resolve rejected records to maintain compliance." action={{ label: "Fix Now", href: "/audit?tab=issues" }} />
        ) : stats.pending > 0 ? (
          <DecisionBanner priority="warning" title={`${stats.pending} Records Pending Review`} description="Approve or reject pending records to keep your audit trail current." action={{ label: "Review Now", href: "/audit?tab=pending" }} />
        ) : stats.approved > 0 ? (
          <DecisionBanner priority="success" title="All Clear" description="No outstanding reviews. All records are approved." />
        ) : null}

        {/* Stats */}
        <StatsRow stats={[
          { icon: FileText, value: stats.evidence, label: "Evidence", variant: "default" as const },
          { icon: CheckCircle, value: stats.approved, label: "Approved", variant: "success" as const, onClick: () => navigate("/audit?tab=compliant") },
          { icon: Clock, value: stats.pending, label: "Pending", variant: "warning" as const, onClick: () => navigate("/audit?tab=pending") },
          { icon: AlertTriangle, value: stats.rejected, label: "Rejected", variant: "destructive" as const, onClick: () => navigate("/audit?tab=issues") },
          { icon: BarChart3, value: stats.gaps, label: "Gaps", variant: "default" as const },
        ]} />

        {/* Pipeline */}
        <div className="space-y-3">
          <SectionHeader title="Review Pipeline" description="Approval status across all records" action={<Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate("/audit")}>View Audit</Button>} />
          <div className="bg-card border border-border rounded-sm overflow-hidden divide-y divide-border/50">
            <PipelineItem label="Approved" count={stats.approved} pct={approvedPct} variant="success" onClick={() => navigate("/audit?tab=compliant")} />
            <PipelineItem label="Pending Review" count={stats.pending} pct={pendingPct} variant="warning" onClick={() => navigate("/audit?tab=pending")} />
            <PipelineItem label="Rejected" count={stats.rejected} pct={rejectedPct} variant="destructive" onClick={() => navigate("/audit?tab=issues")} />
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          <SectionHeader title="QMS Modules" description="Quality management modules" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {moduleStats.map(mod => {
              const config = MODULE_CONFIG[mod.id];
              const Icon = config?.icon || FileText;
              return (
                <ModuleCard
                  key={mod.id}
                  title={config?.name || mod.name}
                  description={config?.description || "QMS module."}
                  icon={Icon}
                  moduleClass={config?.moduleClass}
                  isoClause={config?.isoClause}
                  stats={{
                    formsCount: mod.formsCount,
                    recordsCount: mod.recordsCount,
                    pendingCount: mod.pendingCount,
                    issuesCount: mod.issuesCount,
                  }}
                  onClick={() => navigate(`/module/${mod.id}`)}
                />
              );
            })}
          </div>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuickActions />
          <AuditReadiness
            moduleStats={moduleStats}
            complianceRate={auditSummary.complianceRate}
            isLoading={isLoading}
            emptyFormsCount={stats.gaps}
          />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentActivity records={recentActivity || []} isLoading={isLoading} />
          <PendingActions records={records || []} isLoading={isLoading} />
        </div>

        {/* Comparison */}
        {monthlyComparison && monthlyComparison.currentMonth > 0 && (
          <div className="space-y-3">
            <SectionHeader title="Monthly Comparison" description="Current vs previous period" />
            <div className="bg-card border border-border rounded-sm p-5 grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-success">{monthlyComparison.currentMonth}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Current Period</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {monthlyComparison.isPositive
                    ? <TrendingUp className="w-3 h-3 text-success" />
                    : <TrendingDown className="w-3 h-3 text-destructive" />}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {monthlyComparison.isPositive ? "+" : ""}{monthlyComparison.percentageChange}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-muted-foreground">{monthlyComparison.previousMonth}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Previous Period</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}