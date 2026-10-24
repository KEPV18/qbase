// ============================================================================
// QBase — Audit Page (Supabase-connected)
// Shows audit status of all 35 forms and their records.
//
// The compliance model comes from the SERVER (see `@/hooks/useCompliance`),
// and the list behind the table is ONE PAGE of the register, filtered on the
// server — not the whole table, downloaded and filtered in the browser.
// ============================================================================

import { Suspense, lazy, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import {
  RefreshCw, CheckCircle, Clock,
  AlertTriangle, FileX, CalendarClock, FileText,
  Search, ChevronRight, ChevronLeft, FilePlus,
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
import { useAuditPage, type AuditTab, type AuditFormRow } from "./audit/useAuditPage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

/* ─── Tab definitions ───────────────────────────────────────────── */
const AUDIT_TABS: { value: AuditTab; label: string; icon: React.ElementType }[] = [
  { value: "pending", label: "Pending Review", icon: Clock },
  { value: "compliant", label: "Compliant", icon: CheckCircle },
  { value: "issues", label: "Issues", icon: AlertTriangle },
  { value: "overdue", label: "Overdue", icon: CalendarClock },
  { value: "never-filled", label: "Never Filled", icon: FileX },
];

/* ─── The record rows ────────────────────────────────────────────── */
function RecordRows({
  records,
  activeTab,
  scopeIsOrgWide,
  hasRecordsInView,
  onOpen,
}: {
  records: RecordData[];
  activeTab: AuditTab;
  scopeIsOrgWide: boolean;
  hasRecordsInView: boolean;
  onOpen: (serial: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileX className="w-10 h-10 text-ink-4 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {!scopeIsOrgWide && !hasRecordsInView
            ? 'No records are visible to your account yet.'
            : activeTab === 'compliant' ? 'No compliant records.'
            : activeTab === 'issues' ? 'No issues found.'
            : activeTab === 'pending' ? 'Nothing is waiting for a review.'
            : 'No records found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/20">
      {records.map((r, idx) => {
        // A server row carries its metadata at the TOP level — the same
        // shape `parseRowToRecord` produces.
        const fd = r as unknown as Record<string, unknown>;
        const hasSerial = !!(r.serial as string);
        const frequency = (fd._frequency as string) || '';
        const section = (fd._sectionName as string) || '';

        return (
          <div
            key={(r.id as string) || (r.serial as string) || `${r.formCode}-${idx}`}
            className={cn(
              "px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors",
              hasSerial && "cursor-pointer"
            )}
            onClick={() => hasSerial && onOpen(r.serial as string)}
          >
            {/* Status icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
              activeTab === 'pending'
                ? "bg-warning/10 border-warning/20"
                : activeTab === 'issues'
                ? "bg-destructive/10 border-destructive/20"
                : "bg-success/10 border-success/20"
            )}>
              {activeTab === 'pending' ? <Clock className="w-4 h-4 text-warning-tint" /> :
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

            {hasSerial && <ChevronRight className="w-3.5 w-3.5 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── The form rows ──────────────────────────────────────────────── */
//
// A form is what owes a filing; a record is never "overdue".  The two
// FORM tabs therefore list forms, and each row opens the detailed report
// for that form — the big page behind the Compliance Radar.
function FormRows({
  rows,
  scopeIsOrgWide,
  hasRecordsInView,
  onOpen,
}: {
  rows: AuditFormRow[];
  scopeIsOrgWide: boolean;
  hasRecordsInView: boolean;
  onOpen: (code: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileX className="w-10 h-10 text-ink-4 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {!scopeIsOrgWide && !hasRecordsInView
            ? 'No records are visible to your account yet.'
            : 'All forms have records!'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/20">
      {rows.map((row) => (
        <div
          key={row.code}
          className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={() => onOpen(row.code)}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center border shrink-0 bg-warning/10 border-warning/20">
            {row.status === 'overdue'
              ? <AlertTriangle className="w-4 h-4 text-warning-tint" />
              : <FileX className="w-4 h-4 text-muted-foreground" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium">{row.code}</span>
              <Badge variant="outline" className="text-[9px]">{row.frequency}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{row.name}</span>
            {row.section && <span className="text-[10px] text-muted-foreground ml-2">· {row.section}</span>}
            {row.missingCount > 0 && (
              <span className="text-[10px] text-warning-tint ml-2">
                · {row.missingCountLabel} missing
                {row.missingPeriods.length > 0 && `: ${row.missingPeriods.join(', ')}`}
              </span>
            )}
          </div>

          {row.overdueDays > 0 && (
            <span className="text-[10px] text-destructive-tint font-medium shrink-0">
              {row.overdueDays}d late
            </span>
          )}
          <ChevronRight className="w-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AuditPage() {
  const navigate = useNavigate();
  const {
    records, formRows, stats, isLoading, error, refetch,
    activeTab, setActiveTab, search, setSearch,
    page, pageCount, totalRows, setPage,
    scopeIsOrgWide,
  } = useAuditPage();

  const complianceRate = stats.totalForms > 0
    ? Math.round((stats.filledForms / stats.totalForms) * 100)
    : 0;

  // Does the viewer have any records in view at all?
  const hasRecordsInView = stats.totalRecords > 0;

  // Two of the five tabs list FORMS (a form is what owes a filing); the
  // other three list RECORDS, one server-filtered page at a time.
  const isRecordTab = activeTab === "pending" || activeTab === "compliant" || activeTab === "issues";
  const shownPage = page + 1;

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
        {!scopeIsOrgWide ? (
          /* A scoped viewer cannot support an organisation-wide verdict.
             The compliance figures are computed from the records their
             role gives them access to; presenting them as facts about
             the company is how a user with an empty view was told the
             company had never filled 36 forms. */
          <Card className="border-border/30 bg-muted/20">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {hasRecordsInView
                    ? `Showing the ${stats.totalRecords} record${stats.totalRecords === 1 ? "" : "s"} you can access`
                    : "No records are visible to your account yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasRecordsInView
                    ? "These figures cover the records your role gives you access to — not the whole organisation. The organisation-wide compliance view is available to managers, department heads and admins."
                    : "Your account can see the records you filed and the records in your department. There are none to review yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : stats.issues > 0 ? (
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
            <PanelCell><PanelFigure icon={Clock} label="Pending Review" value={stats.pendingReview} tone="warning" dot /></PanelCell>
            <PanelCell><PanelFigure icon={CheckCircle} label="Compliant" value={stats.compliant} tone="success" dot /></PanelCell>
            <PanelCell><PanelFigure icon={AlertTriangle} label="Issues" value={stats.issues} tone="destructive" dot /></PanelCell>
            <PanelCell><PanelFigure icon={CalendarClock} label="Overdue" value={stats.overdue} tone="warning" dot /></PanelCell>
            <PanelCell><PanelFigure icon={FileX} label={scopeIsOrgWide ? "Never Filled" : "Never Filled (in view)"} value={stats.neverFilled} tone="warning" dot /></PanelCell>
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
              {stats.filledForms} of {stats.totalForms} forms have records{scopeIsOrgWide ? "" : " in your view"}
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
              {isRecordTab ? (
                <RecordRows
                  records={records}
                  activeTab={activeTab}
                  scopeIsOrgWide={scopeIsOrgWide}
                  hasRecordsInView={hasRecordsInView}
                  onOpen={(serial) => navigate(`/records/${encodeURIComponent(serial)}`)}
                />
              ) : (
                <FormRows
                  rows={formRows}
                  scopeIsOrgWide={scopeIsOrgWide}
                  hasRecordsInView={hasRecordsInView}
                  onOpen={(code) => navigate(`/compliance?form=${encodeURIComponent(code)}`)}
                />
              )}
            </div>

            {/* The paging — the record tabs ask the server for one page at a
                time, so the list behind the table is no longer the whole
                table. */}
            {isRecordTab && pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground">
                  {totalRows} record{totalRows === 1 ? '' : 's'} · page {shownPage} of {pageCount}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="ds-press ds-focus-ring px-2.5 py-1 text-[11px] font-medium bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="ds-press ds-focus-ring px-2.5 py-1 text-[11px] font-medium bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </Tabs>
        </Card>
      </div>
    </AppShell>
  );
}
