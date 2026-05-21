import { Suspense, lazy } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RecordsTable } from "@/components/records/RecordsTable";
import { AuditFilters } from "@/components/audit/AuditFilters";
import {
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock,
  AlertTriangle, Filter, FileX, CalendarClock, Loader2,
  CheckCheck, RotateCcw, Download, Upload, PlayCircle,
  LayoutGrid, List,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useAuditPage } from "./audit/useAuditPage";

const AuditCharts = lazy(() => import("@/components/audit/AuditCharts").then(m => ({ default: m.AuditCharts })));
const AutomatedAuditModal = lazy(() => import("@/components/audit/AutomatedAuditModal").then(m => ({ default: m.AutomatedAuditModal })));

/* ─── Tab definitions ───────────────────────────────────────────── */
const AUDIT_TABS = [
  { value: "pending" as const, label: "Pending", icon: Clock, color: "data-[state=active]:text-warning data-[state=active]:border-warning" },
  { value: "compliant" as const, label: "Approved", icon: CheckCircle, color: "data-[state=active]:text-success data-[state=active]:border-success" },
  { value: "issues" as const, label: "Issues", icon: AlertTriangle, color: "data-[state=active]:text-destructive data-[state=active]:border-destructive", critical: true },
  { value: "overdue" as const, label: "Overdue", icon: CalendarClock, color: "data-[state=active]:text-destructive data-[state=active]:border-destructive", critical: true },
  { value: "never-filled" as const, label: "Never Filled", icon: FileX, color: "data-[state=active]:text-warning data-[state=active]:border-warning" },
];

/* ─── Empty state ──────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof CheckCircle; title: string; subtitle: string }) {
  return (
    <div className="p-16 text-center flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-success/5 flex items-center justify-center mb-4 border border-success/10">
        <Icon className="w-10 h-10 text-success/30" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

/* ─── Bulk actions bar ───────────────────────────────────────────── */
function BulkActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
      {children}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AuditPage() {
  const {
    activeTab, setActiveTab: handleTabChange,
    viewMode, setViewMode, search, setSearch,
    categoryFilter, setCategoryFilter, projectFilter, setProjectFilter,
    yearFilter, setYearFilter, dateFilter, setDateFilter,
    bulkLoading, isAuditModalOpen, setIsAuditModalOpen,
    records, isLoading, error,
    pendingRecords, compliantRecords, issueRecords,
    overdueRecords, neverFilledRecords,
    stats, categoryBreakdown,
    categories, projects, years,
    totalFilteredCount, complianceRate, lastUpdated,
    handleRefresh, handleBulkStatusChange, handleApproveRecord,
    handleExportMetadata, handleImportMetadata, handleExportCSV,
  } = useAuditPage();

  const tabCounts = {
    pending: pendingRecords.length,
    compliant: compliantRecords.length,
    issues: issueRecords.length,
    overdue: overdueRecords.length,
    "never-filled": neverFilledRecords.length,
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Audit Dashboard" }]}>
      <div className="space-y-5">

        {/* Header */}
        <PageHeader
          icon={CheckCircle}
          iconClassName="text-primary"
          title="Audit Dashboard"
          description="ISO 9001:2015 Compliance Review"
          onBack="/"
          actions={[
            { label: "Run Audit", icon: PlayCircle, onClick: () => setIsAuditModalOpen(true), variant: "default", className: "shadow-md hover:shadow-lg hover:scale-[1.02] transition-all" },
            { label: "Backup", icon: Download, onClick: handleExportMetadata, disabled: !records || records.length === 0 },
            { label: "Restore", icon: Upload, onClick: handleImportMetadata, disabled: bulkLoading },
            { label: "Sync", icon: RefreshCw, onClick: handleRefresh, disabled: isLoading },
          ]}
        >
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-sm border border-border/50 shrink-0">
              <div className="w-1.5 h-1.5 rounded-sm bg-success animate-pulse" />
              Synced {lastUpdated}
            </span>
          )}
        </PageHeader>

        {/* Decision banner */}
        {stats.issues > 0 ? (
          <DecisionBanner
            priority="critical"
            title={`${stats.issues} Issue${stats.issues > 1 ? "s" : ""} Found in Audit`}
            description="Rejected records block compliance. Resolve these before your next audit review."
            action={{ label: `Fix ${stats.issues} Issue${stats.issues > 1 ? "s" : ""}`, onClick: () => handleTabChange("issues") }}
          />
        ) : stats.overdue > 0 ? (
          <DecisionBanner
            priority="warning"
            title={`${stats.overdue} Overdue Record${stats.overdue > 1 ? "s" : ""}`}
            description="These records missed their filing deadline. Address them to avoid compliance gaps."
            action={{ label: `Resolve ${stats.overdue} Overdue`, onClick: () => handleTabChange("overdue") }}
          />
        ) : stats.pending > 0 ? (
          <DecisionBanner
            priority="info"
            title={`${stats.pending} Record${stats.pending > 1 ? "s" : ""} Awaiting Review`}
            description="Review and approve pending records to complete the audit cycle."
            action={{ label: `Review ${stats.pending} Pending`, onClick: () => handleTabChange("pending") }}
          />
        ) : (stats.compliant > 0 && stats.pending === 0 && stats.issues === 0) ? (
          <DecisionBanner priority="success" title="All Records Approved" description="No outstanding audit actions. System is compliant." />
        ) : null}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <StatsRow stats={[
          { icon: Filter, value: records?.length || 0, label: "Templates", variant: "default" },
          { icon: Clock, value: stats.pending, label: "Pending", variant: "warning", onClick: () => handleTabChange("pending") },
          { icon: CheckCircle, value: stats.compliant, label: "Approved", variant: "success", onClick: () => handleTabChange("compliant") },
          { icon: AlertTriangle, value: stats.issues, label: "Issues", variant: "destructive", onClick: () => handleTabChange("issues") },
          { icon: CalendarClock, value: stats.overdue, label: "Overdue", variant: "destructive", onClick: () => handleTabChange("overdue") },
          { icon: FileX, value: stats.neverFilled, label: "Never Filled", variant: "warning", onClick: () => handleTabChange("never-filled") },
        ]} />

        {/* Charts */}
        <Suspense fallback={<div className="h-[200px] bg-muted/20 rounded-sm animate-pulse" />}>
          <AuditCharts stats={stats} categoryBreakdown={categoryBreakdown} />
        </Suspense>

        {/* Compliance bar */}
        <div className="bg-card rounded-sm border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Template Population Rate</span>
            <span className="text-2xl font-bold text-success">{complianceRate}%</span>
          </div>
          <div className="w-full bg-muted/30 rounded-sm h-2 overflow-hidden">
            <div className="bg-success h-2 rounded-sm transition-all duration-700" style={{ width: `${complianceRate}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {stats.filledTemplatesCount} of {stats.totalTemplates} templates populated
          </p>
        </div>

        {/* Project filter banner */}
        {projectFilter !== "all" && (
          <div className="flex items-center gap-2 px-5 py-2 bg-primary/[0.03] border-b border-border/30">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Filtered by:</span>
            <span className="text-xs font-bold text-primary">{projectFilter}</span>
            <button onClick={() => { setProjectFilter("all"); }} className="text-[10px] text-muted-foreground hover:text-destructive ml-1 underline">Clear</button>
          </div>
        )}

        {/* Filters */}
        <AuditFilters
          search={search} onSearchChange={setSearch}
          categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter} categories={categories}
          projectFilter={projectFilter} onProjectChange={setProjectFilter} projects={projects}
          yearFilter={yearFilter} onYearChange={setYearFilter} years={years}
          dateFilter={dateFilter} onDateChange={setDateFilter}
          onExportCSV={handleExportCSV} totalFiltered={totalFilteredCount}
          totalAll={stats.pending + stats.compliant + stats.issues}
        />

        {/* Tabs + Content */}
        <div className="bg-card rounded-sm border border-border overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="px-5 py-2 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-x-auto overflow-y-hidden">
              <TabsList className="bg-transparent h-11 p-0 gap-1 shrink-0">
                {AUDIT_TABS.map(t => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className={cn(
                      "data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none h-11 px-3 gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative",
                      t.color
                    )}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label} ({tabCounts[t.value]})
                    {t.critical && activeTab !== t.value && tabCounts[t.value] > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* View toggle */}
              <div className="hidden sm:flex items-center bg-muted/40 rounded-sm p-0.5 border border-border/50 shrink-0">
                <Button variant="ghost" size="sm" className={cn("h-8 w-10 p-0 rounded-md", viewMode === "compact" && "bg-background shadow-sm text-primary")} onClick={() => setViewMode("compact")} title="List View">
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className={cn("h-8 w-10 p-0 rounded-md", viewMode === "card" && "bg-background shadow-sm text-primary")} onClick={() => setViewMode("card")} title="Card View">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tab panels */}
            <TabsContent value="pending" className="m-0">
              {pendingRecords.length > 0 && (
                <BulkActions>
                  <Button size="sm" className="h-7 gap-1.5 text-xs" disabled={bulkLoading} onClick={() => handleBulkStatusChange(pendingRecords, 'approved')}>
                    {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                    Approve All ({pendingRecords.length})
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 gap-1.5 text-xs" disabled={bulkLoading} onClick={() => handleBulkStatusChange(pendingRecords, 'rejected')}>
                    Reject All
                  </Button>
                </BulkActions>
              )}
              <ErrorBoundary>
                <RecordsTable records={pendingRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="compliant" className="m-0">
              {compliantRecords.length > 0 && (
                <BulkActions>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={bulkLoading} onClick={() => handleBulkStatusChange(compliantRecords, 'pending_review')}>
                    {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Reset All to Pending ({compliantRecords.length})
                  </Button>
                </BulkActions>
              )}
              <ErrorBoundary>
                <RecordsTable records={compliantRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="issues" className="m-0">
              {issueRecords.length > 0 && (
                <BulkActions>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-sm px-3 py-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>Use the <strong className="text-success">Approve</strong> button on each record to approve individually</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs ml-auto" disabled={bulkLoading} onClick={() => handleBulkStatusChange(issueRecords, 'pending_review')}>
                    <RotateCcw className="w-3 h-3" />
                    Reset All to Pending
                  </Button>
                </BulkActions>
              )}
              <ErrorBoundary>
                <RecordsTable records={issueRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="overdue" className="m-0">
              {overdueRecords.length === 0 ? (
                <EmptyState icon={CheckCircle} title="No overdue records" subtitle="All records are up to date" />
              ) : (
                <ErrorBoundary>
                  <RecordsTable records={overdueRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
                </ErrorBoundary>
              )}
            </TabsContent>

            <TabsContent value="never-filled" className="m-0">
              {neverFilledRecords.length === 0 ? (
                <EmptyState icon={CheckCircle} title="All templates have records" subtitle="No empty templates found" />
              ) : (
                <ErrorBoundary>
                  <RecordsTable records={neverFilledRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} />
                </ErrorBoundary>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Suspense fallback={null}>
          <AutomatedAuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} records={records || []} />
        </Suspense>
      </div>
    </AppShell>
  );
}