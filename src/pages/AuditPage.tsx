// ============================================================================
// QBase — Audit Page (Supabase-connected)
// Shows audit status of all 35 forms and their records.
// ============================================================================

import { Suspense, lazy, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import {
  RefreshCw, CheckCircle, Clock,
  AlertTriangle, FileX, CalendarClock, FileText,
  Search, ChevronRight, FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelCell, PanelCells, PanelFigure, UnifiedPanel } from "@/components/ui/UnifiedPanel";
import { cn } from "@/lib/utils";
import { useAuditPage, type AuditTab } from "./audit/useAuditPage";
import { FORM_SCHEMAS } from "@/data/formSchemas";

/* ─── Tab definitions ───────────────────────────────────────────── */
const AUDIT_TABS: { value: AuditTab; label: string; icon: React.ElementType }[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "compliant", label: "Compliant", icon: CheckCircle },
  { value: "issues", label: "Issues", icon: AlertTriangle },
  { value: "overdue", label: "Overdue", icon: CalendarClock },
  { value: "never-filled", label: "Never Filled", icon: FileX },
];

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AuditPage() {
  const navigate = useNavigate();
  const {
    records, stats, isLoading, error, refetch,
    activeTab, setActiveTab, search, setSearch,
  } = useAuditPage();

  const complianceRate = stats.totalForms > 0
    ? Math.round((stats.filledForms / stats.totalForms) * 100)
    : 0;

  if (isLoading || error) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Audit" }]}>
        <AsyncBoundary
          isLoading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Audit Dashboard" }]}>
      <div className="space-y-5">
        {/* Header */}
        <PageHeader
          icon={CheckCircle}
          title="Audit Dashboard"
          description="ISO 9001:2015 Compliance Review"
          onBack="/"
          actions={[
            { label: "Sync", icon: RefreshCw, onClick: refetch, disabled: isLoading },
          ]}
        />

        {/* Decision banner */}
        {stats.issues > 0 ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive-tint" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive-tint">{stats.issues} forms have issues</p>
                <p className="text-xs text-destructive-tint">Resolve these before your next audit review.</p>
              </div>
              <Button size="sm" variant="outline" className="border-destructive/30 text-destructive-tint hover:bg-destructive/10" onClick={() => setActiveTab("issues")}>
                Fix Issues
              </Button>
            </CardContent>
          </Card>
        ) : stats.overdue > 0 ? (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-warning-tint" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-tint">{stats.overdue} overdue forms</p>
                <p className="text-xs text-warning-tint">These forms missed their filing deadline.</p>
              </div>
              <Button size="sm" variant="outline" className="border-warning/30 text-warning-tint hover:bg-warning/10" onClick={() => setActiveTab("overdue")}>
                Resolve
              </Button>
            </CardContent>
          </Card>
        ) : stats.neverFilled > 0 ? (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <FileX className="w-5 h-5 text-warning-tint" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-tint">{stats.neverFilled} forms never filled</p>
                <p className="text-xs text-warning-tint">These forms need at least one record for compliance.</p>
              </div>
              <Button size="sm" variant="outline" className="border-warning/30 text-warning-tint hover:bg-warning/10" onClick={() => navigate('/create')}>
                <FilePlus className="w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success-tint" />
              <p className="text-sm font-medium text-success-tint">All forms compliant — no outstanding audit actions.</p>
            </CardContent>
          </Card>
        )}

        {/* Stats — ONE panel of hairline-separated cells.
            These were six separately-bordered `Card`s in a grid, and each
            one tinted its ICON, so a row of six sibling figures read as
            six little coloured chips rather than six facts.  The rule
            `StatsRow` already follows: the semantic colour goes on the
            NUMBER, the icon stays grayscale, and the surface stays white.
            The status dot beside the label keeps it scannable. */}
        <UnifiedPanel>
          <PanelCells columns={6}>
            <PanelCell><PanelFigure icon={FileText} label="Total Records" value={stats.totalRecords} /></PanelCell>
            <PanelCell><PanelFigure icon={Clock} label="Pending" value={stats.pending} tone="warning" dot /></PanelCell>
            <PanelCell><PanelFigure icon={CheckCircle} label="Compliant" value={stats.compliant} tone="success" dot /></PanelCell>
            <PanelCell><PanelFigure icon={AlertTriangle} label="Issues" value={stats.issues} tone="destructive" dot /></PanelCell>
            <PanelCell><PanelFigure icon={CalendarClock} label="Overdue" value={stats.overdue} tone="warning" dot /></PanelCell>
            <PanelCell><PanelFigure icon={FileX} label="Never Filled" value={stats.neverFilled} tone="warning" dot /></PanelCell>
          </PanelCells>
        </UnifiedPanel>

        {/* Compliance bar */}
        <Card className="border-border/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Form Population Rate</span>
              <span className="text-2xl font-bold text-success-tint">{complianceRate}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div className="bg-success h-2 rounded-full transition-all duration-200 ease-out-quart" style={{ width: `${complianceRate}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {stats.filledForms} of {stats.totalForms} forms have records
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial, form name, or code..."
            className="pl-9 bg-muted/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Card className="border-border/30 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuditTab)}>
            <div className="border-b border-border px-4 overflow-x-auto">
              <TabsList className="bg-transparent h-11 p-0 gap-1">
                {AUDIT_TABS.map(t => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none h-11 px-3 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {records.length === 0 ? (
                <div className="p-12 text-center">
                  <FileX className="w-10 h-10 text-ink-4 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'never-filled' ? 'All forms have records!' :
                     activeTab === 'compliant' ? 'No compliant forms yet.' :
                     activeTab === 'issues' ? 'No issues found.' :
                     activeTab === 'overdue' ? 'No overdue forms.' :
                     'No records found.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {records.map((r, idx) => {
                    const fd = (r.formData as Record<string, unknown>) || {};
                    const hasSerial = !!(r.serial as string);
                    const auditStatus = (fd._auditStatus as string) || '';
                    const frequency = (fd._frequency as string) || '';
                    const section = (fd._section as string) || '';

                    return (
                      <div
                        key={(r.serial as string) || `${r.formCode}-${idx}`}
                        className={cn(
                          "px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors",
                          hasSerial && "cursor-pointer"
                        )}
                        onClick={() => hasSerial && navigate(`/records/${encodeURIComponent(r.serial as string)}`)}
                      >
                        {/* Status icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
                          auditStatus === 'overdue' || auditStatus === 'never-filled'
                            ? "bg-warning/10 border-warning/20"
                            : activeTab === 'issues'
                            ? "bg-destructive/10 border-destructive/20"
                            : "bg-success/10 border-success/20"
                        )}>
                          {auditStatus === 'overdue' || auditStatus === 'never-filled' ? <AlertTriangle className="w-4 h-4 text-warning-tint" /> :
                           activeTab === 'issues' ? <AlertTriangle className="w-4 h-4 text-destructive-tint" /> :
                           <CheckCircle className="w-4 h-4 text-success-tint" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium">
                              {hasSerial ? r.serial : r.formCode}
                            </span>
                            <Badge variant="outline" className="text-[9px]">{r.formCode}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{r.formName}</span>
                          {section && <span className="text-[10px] text-muted-foreground ml-2">· {section}</span>}
                          {frequency && <span className="text-[10px] text-muted-foreground ml-2">· {frequency}</span>}
                        </div>

                        {hasSerial && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </Card>
      </div>
    </AppShell>
  );
}

/**
 * One stat tile.
 *
 * `tone` is a semantic name, not a raw palette key.  The old map keyed on
 * `cyan` / `amber` / `emerald` / `red` — the Tailwind-500 hue names — so
 * the same semantic state had to be spelled differently on every page, and
 * `purple` did not exist at all.  The four states below are the four the
 * design system actually has, and each resolves to a token.
 *
 * The map itself now lives in `UnifiedPanel.PanelFigure`, so the four
 * states have exactly one spelling in the whole app: `default`,
 * `success`, `warning`, `destructive`, `info`.
 */