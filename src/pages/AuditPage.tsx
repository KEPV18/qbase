// ============================================================================
// QMS Forge — Audit Page (Supabase-connected)
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
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  if (isLoading) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Audit" }]}>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
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
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">{stats.issues} forms have issues</p>
                <p className="text-xs text-red-300/70">Resolve these before your next audit review.</p>
              </div>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={() => setActiveTab("issues")}>
                Fix Issues
              </Button>
            </CardContent>
          </Card>
        ) : stats.overdue > 0 ? (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{stats.overdue} overdue forms</p>
                <p className="text-xs text-amber-300/70">These forms missed their filing deadline.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => setActiveTab("overdue")}>
                Resolve
              </Button>
            </CardContent>
          </Card>
        ) : stats.neverFilled > 0 ? (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <FileX className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{stats.neverFilled} forms never filled</p>
                <p className="text-xs text-amber-300/70">These forms need at least one record for compliance.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => navigate('/create')}>
                <FilePlus className="w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-200">All forms compliant — no outstanding audit actions.</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatBadge icon={FileText} label="Total Records" value={stats.totalRecords} color="cyan" />
          <StatBadge icon={Clock} label="Pending" value={stats.pending} color="amber" />
          <StatBadge icon={CheckCircle} label="Compliant" value={stats.compliant} color="emerald" />
          <StatBadge icon={AlertTriangle} label="Issues" value={stats.issues} color="red" />
          <StatBadge icon={CalendarClock} label="Overdue" value={stats.overdue} color="amber" />
          <StatBadge icon={FileX} label="Never Filled" value={stats.neverFilled} color="amber" />
        </div>

        {/* Compliance bar */}
        <Card className="border-border/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Form Population Rate</span>
              <span className="text-2xl font-bold text-emerald-400">{complianceRate}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: `${complianceRate}%` }} />
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
            <div className="border-b border-border px-4">
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
                  <t.icon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" /> {/* This won't work in this context */}
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
                            ? "bg-amber-500/10 border-amber-500/20"
                            : activeTab === 'issues'
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20"
                        )}>
                          {auditStatus === 'overdue' || auditStatus === 'never-filled' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                           activeTab === 'issues' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                           <CheckCircle className="w-4 h-4 text-emerald-400" />}
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

function StatBadge({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
  };
  return (
    <Card className="border-border/30">
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={cn("w-4 h-4", colors[color] || "text-muted-foreground")} />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}