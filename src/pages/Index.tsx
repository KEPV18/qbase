// ============================================================================
// QBase — Dashboard
// Grayscale workspace: one white panel per section, hairline dividers
// between rows, and a single blue accent reserved for action.
// NOW WITH: ISO Compliance Monitor, SLA Countdown Grid, Department Health,
//           Compliance Radar (gap analysis for ALL recurring forms)
// ============================================================================

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS, type FormSchema } from "@/data/formSchemas";
import { cn } from "@/lib/utils";
import {
  FileText, Folder, Search, ChevronRight, Plus,
  AlertTriangle, CheckCircle, Clock, ShieldAlert, Calendar,
  Radar, ArrowUpAZ, ArrowDownAZ, XCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import {
  parseFrequency, applyFrequency, getUrgencyText, getLastFiledText,
  computeDeptHealth, type FormCompliance, type DeptHealth,
} from "@/lib/compliance";
import { deptBorderStyle, deptAccentStyle } from "@/lib/departmentTheme";
import {
  getMonthsFromRecords, monthLabel, monthShortLabel,
  getRecordMonth, getAllMissingPeriods, RECURRING_FORMS,
  formatPeriodLabel,
} from "@/lib/temporalUtils";
import { PROJECTS } from "@/data/projectsData";
import { discardRecordDraft } from "@/services/recordStorage";
import { useDashboardStats } from "@/hooks/useRecordStorage";
import type { DashboardStats } from "@/services/dashboardStats";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";

const DEPT_ORDER = [
  "Sales & Customer Service",
  "Operations & Production",
  "Quality & Audit",
  "Procurement & Vendors",
  "HR & Training",
  "R&D & Design",
  "Management & Documentation",
];

function StatusText({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Approved: "bg-success/5 text-success-tint dark:bg-success/10",
    Pending_Approval: "bg-warning/5 text-warning-tint dark:bg-warning/10",
    Draft: "bg-ink/5 text-muted-foreground dark:bg-ink/10 dark:text-ink-3",
  };
  const label = status === "Pending_Approval" ? "Pending" : status;
  return <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", colors[status] || "bg-ink/5 text-muted-foreground")}>{label}</span>;
}

/* ─── SLA Health Pill ─────────────────────────────────────────────── */
function HealthPill({ health, dept }: { health: DeptHealth; dept: string }) {
  const accent = deptAccentStyle(dept);
  if (health.status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-tint" style={{ ...accent, backgroundColor: undefined, border: 'none', padding: 0 }}>
        <CheckCircle className="w-3 h-3" /> Up to date
      </span>
    );
  }
  if (health.status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-tint">
        <AlertTriangle className="w-3 h-3" /> {health.overdueCount} Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive-tint">
      <ShieldAlert className="w-3 h-3" /> {health.overdueCount} Overdue
    </span>
  );
}

/* ─── Department Metric Card ──────────────────────────────────────── */
function DeptMetricCard({
  dept,
  health,
  isActive,
  onClick,
}: {
  dept: string;
  health: DeptHealth;
  isActive: boolean;
  onClick: () => void;
}) {
  const borderStyle = deptBorderStyle(dept);
  return (
    <button
      onClick={onClick}
      style={borderStyle}
      className={cn(
        "text-left rounded-xl border p-4 transition-all w-full",
        isActive
          ? "bg-card border-foreground/20 shadow-sm"
          : "bg-card border-border dark:border-border hover:border-foreground/20"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground dark:text-foreground">{dept}</p>
        <HealthPill health={health} dept={dept} />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <p className="text-lg font-bold tabular-nums text-foreground dark:text-foreground">{health.totalForms}</p>
          <p className="text-[10px] text-muted-foreground/70">Forms Available</p>
        </div>
        <div className="w-px h-8 bg-border dark:bg-border" />
        <div>
          <p className="text-lg font-bold tabular-nums text-foreground dark:text-foreground">{health.totalSubmissions}</p>
          <p className="text-[10px] text-muted-foreground/70">Records Filed</p>
        </div>
      </div>
    </button>
  );
}

/* ─── Compliance Micro Badge ────────────────────────────────────── */
function ComplianceBadge({ compliance }: { compliance: FormCompliance }) {
  const { frequencyType, daysSinceLast, isOverdue, overdueDays } = compliance;

  if (frequencyType === 'Event-Driven') {
    return <span className="text-[10px] text-muted-foreground/70 font-medium">On-Demand Event</span>;
  }
  if (frequencyType === 'Per-Project') {
    return <span className="text-[10px] text-muted-foreground/70 font-medium">Required per Project</span>;
  }
  if (!daysSinceLast) {
    return <span className="text-[10px] text-warning-tint font-medium">Never filed</span>;
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-destructive-tint font-medium">
        <ShieldAlert className="w-3 h-3" /> Overdue by {overdueDays}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-success-tint font-medium">
      <Clock className="w-3 h-3" /> {getUrgencyText(compliance)}
    </span>
  );
}

/* ─── Compliance Radar Card ─────────────────────────────────────── */
function ComplianceRadarCard({
  missingPeriodsMap,
}: {
  missingPeriodsMap: Map<string, string[]>;
}) {
  if (missingPeriodsMap.size === 0) {
    return (
      <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-xl">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success-tint" />
          <span className="text-sm font-semibold text-success-tint">
            All Recurring Forms Are Up to Date
          </span>
        </div>
        <p className="text-xs text-success-tint/70 ml-6 mt-1">
          No compliance gaps detected across monthly, quarterly, semi-annual, or annual forms.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-warning/10 border border-warning/20 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Radar className="w-4 h-4 text-warning-tint" />
        <span className="text-sm font-semibold text-warning-tint">
          Compliance Radar — {missingPeriodsMap.size} Gap{missingPeriodsMap.size > 1 ? 's' : ''} Detected
        </span>
      </div>
      <div className="space-y-2">
        {Array.from(missingPeriodsMap.entries()).map(([code, missing]) => {
          const def = RECURRING_FORMS[code];
          if (!def) return null;
          const freqLabel = def.frequency.charAt(0).toUpperCase() + def.frequency.slice(1);
          return (
            <div key={code} className="flex items-start gap-3 ml-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-tint mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-warning-tint">
                  Compliance Gap: {code} ({def.name}) — Missing for{' '}
                  {/* Array.map passes (value, index, array), so passing the function
                      straight to map handed the array INDEX to `frequency`, which is
                      never 'quarterly'/'semi-annual'/'annual' — every label fell
                      through to the monthly branch. The form's real frequency is in
                      scope here. */}
                  {missing.map(ym => formatPeriodLabel(ym, def.frequency)).join(', ')}
                </p>
                <p className="text-[10px] text-warning-tint/70 mt-0.5">
                  {freqLabel} form — expected {missing.length} period{missing.length > 1 ? 's' : ''} in 2026
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Quality Pulse (Prime §D6) ───────────────────────────────────
   Every tile's number comes from the ONE dashboard_stats() RPC; the
   migration comments each field with its exact SQL (source of truth).
   Loading → skeleton; error → surfaced message; empty CAPA register →
   "No CAPA data" — never fabricated numbers (Prime §9 / §D6). */
function DashboardStatsCard({ stats, isLoading, error }: {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <div className="px-4 py-3 bg-card border rounded-xl animate-pulse" aria-busy="true">
        <p className="text-sm font-semibold text-muted-foreground">Loading statistics…</p>
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl" role="alert">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive-tint" />
          <span className="text-sm font-semibold text-destructive-tint">
            Statistics unavailable
          </span>
        </div>
        <p className="text-xs text-destructive-tint/80 mt-1">
          {error?.message || 'No statistics loaded.'} No numbers are shown rather than guessed values.
        </p>
      </div>
    );
  }

  const { recordsByStatus: by } = stats;
  const capaEmpty = stats.capaTotal === 0;

  return (
    <div
      className="px-4 py-3 bg-card border rounded-xl"
      title="Live KPIs from public.dashboard_stats() (migration 20260929_04): records_total / records_by_status / records_last_30d / capa_total / capa_closed / capa_open / capa_closure_rate / capa_overdue / pending_review_aging — counts computed from records and capas tables."
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Quality Pulse</span>
        <span className="text-[10px] text-muted-foreground/70">
          {stats.recordsLast30d} filed in the last 30 days
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="text-muted-foreground">
          Records: <strong className="text-foreground">{stats.recordsTotal}</strong>
          <span className="ml-1.5 text-success-tint">{by.approved} approved</span>
          <span className="ml-1.5 text-warning-tint">{by.pending_review} pending</span>
          <span className="ml-1.5 text-muted-foreground">{by.draft} draft</span>
          <span className="ml-1.5 text-muted-foreground">{by.rejected} rejected</span>
        </span>
        <span className="w-px h-4 bg-border" />
        {capaEmpty ? (
          <span className="text-muted-foreground">No CAPA data</span>
        ) : (
          <span className="text-muted-foreground">
            CAPA closure: <strong className="text-foreground">{stats.capaClosureRate}%</strong>
            <span className="ml-1.5 text-muted-foreground">({stats.capaClosed}/{stats.capaTotal} closed)</span>
          </span>
        )}
        {stats.capaOverdue > 0 && (
          <span className="inline-flex items-center gap-1 text-destructive-tint">
            <ShieldAlert className="w-3 h-3" /> {stats.capaOverdue} CAPA overdue
          </span>
        )}
        {stats.pendingReviewAging.over_30d > 0 ? (
          <span className="inline-flex items-center gap-1 text-destructive-tint">
            <Clock className="w-3 h-3" /> {stats.pendingReviewAging.over_30d} reviews waiting &gt;30d
          </span>
        ) : stats.pendingReviewAging.from_7_to_30d > 0 ? (
          <span className="inline-flex items-center gap-1 text-warning-tint">
            <Clock className="w-3 h-3" /> {stats.pendingReviewAging.from_7_to_30d} reviews waiting 7–30d
          </span>
        ) : (
          <span className="text-muted-foreground">Reviews current ({stats.pendingReviewAging.under_7d} &lt;7d)</span>
        )}
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: records, isLoading: recordsLoading, error: recordsError, refetch: refetchRecords } = useRecords();
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const [activeDept, setActiveDept] = useState(() => {
    const saved = localStorage.getItem('qms_activeDept');
    return saved || "Sales & Customer Service";
  });
  const [selectedForm, setSelectedForm] = useState<string | null>(() => {
    return localStorage.getItem('qms_selectedForm') || null;
  });
  const [formSearch, setFormSearch] = useState("");

  // Persist activeDept and selectedForm to localStorage
  useEffect(() => {
    localStorage.setItem('qms_activeDept', activeDept);
  }, [activeDept]);
  useEffect(() => {
    if (selectedForm) localStorage.setItem('qms_selectedForm', selectedForm);
    else localStorage.removeItem('qms_selectedForm');
  }, [selectedForm]);

  const firstName = (user?.name || "User").split(" ")[0];

  // ── Global month selector (synced with URL ?month= from Sidebar) ──
  const [globalMonth, setGlobalMonth] = useState(() => localStorage.getItem('qms_globalMonth') || "");
  const [globalProject, setGlobalProject] = useState(() => localStorage.getItem('qms_globalProject') || "");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('qms_sortOrder') as 'asc' | 'desc') || 'asc';
  });
  const availableMonths = useMemo(() => getMonthsFromRecords(records || []), [records]);

  // URL params from Sidebar filters act as the source of truth when present
  const urlMonth = searchParams.get('month') || "";
  const urlProject = searchParams.get('project') || "";
  const activeMonth = urlMonth || globalMonth;
  const activeProject = urlProject || globalProject;

  useEffect(() => {
    if (urlMonth) setGlobalMonth(urlMonth);
    if (urlProject) setGlobalProject(urlProject);
  }, [urlMonth, urlProject]);

  useEffect(() => { localStorage.setItem('qms_globalMonth', globalMonth); }, [globalMonth]);
  useEffect(() => { localStorage.setItem('qms_globalProject', globalProject); }, [globalProject]);
  useEffect(() => { localStorage.setItem('qms_sortOrder', sortOrder); }, [sortOrder]);

  // ── COMPLIANCE RADAR — Gap analysis for ALL recurring forms ──────
  const missingPeriodsMap = useMemo(() => getAllMissingPeriods(records || []), [records]);
  const hasMissingPeriods = missingPeriodsMap.size > 0;

  // ── Build compliance map ─────────────────────────────────────────
  const complianceMap = useMemo(() => {
    const recordMeta = (records || []).map(r => ({
      formCode: String(r.formCode),
      createdAt: String(r._createdAt || r.createdAt || new Date().toISOString()),
    }));
    const map = new Map<string, FormCompliance>();
    // Build from records
    const latestByForm = new Map<string, string>();
    recordMeta.forEach(r => {
      const prev = latestByForm.get(r.formCode);
      if (!prev || r.createdAt > prev) latestByForm.set(r.formCode, r.createdAt);
    });
    latestByForm.forEach((lastDate, code) => {
      const freq = parseFrequency(FORM_SCHEMAS.find(f => f.code === code)?.frequency || '');
      let c: FormCompliance = {
        formCode: code,
        frequencyType: freq,
        lastRecordDate: lastDate,
        nextDueDate: null,
        daysSinceLast: Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)),
        daysUntilDue: null,
        isOverdue: false,
        overdueDays: 0,
        recordCount: recordMeta.filter(r => r.formCode === code).length,
      };
      c = applyFrequency(c, freq);
      map.set(code, c);
    });
    // Pre-fill forms that have NO records yet
    FORM_SCHEMAS.forEach(f => {
      if (!map.has(f.code)) {
        const freq = parseFrequency(f.frequency);
        map.set(f.code, {
          formCode: f.code,
          frequencyType: freq,
          lastRecordDate: null,
          nextDueDate: null,
          daysSinceLast: null,
          daysUntilDue: null,
          isOverdue: freq === 'Monthly' || freq === 'Yearly',
          overdueDays: 0,
          recordCount: 0,
        });
      }
    });
    return map;
  }, [records]);

  // ── Department health ────────────────────────────────────────────
  const deptHealthMap = useMemo(() => {
    const map = new Map<string, DeptHealth>();
    DEPT_ORDER.forEach(dept => {
      const deptForms = FORM_SCHEMAS.filter(f => f.sectionName === dept).map(f => ({
        code: f.code,
        frequency: parseFrequency(f.frequency),
      }));
      map.set(dept, computeDeptHealth(deptForms, complianceMap));
    });
    return map;
  }, [complianceMap]);

  // ── Global totals ────────────────────────────────────────────────
  const monthFilteredRecords = useMemo(() => {
    if (!activeMonth || !records) return records || [];
    return records.filter(r => getRecordMonth(r) === activeMonth);
  }, [records, activeMonth]);

  const totalRecords = monthFilteredRecords.length;
  const approvedCount = monthFilteredRecords.filter((r) => r._approvalStatus === "Approved").length || 0;
  const globalOverdue = useMemo(() => {
    let count = 0;
    complianceMap.forEach(c => { if (c.isOverdue) count++; });
    return count;
  }, [complianceMap]);

  // ── Forms list ───────────────────────────────────────────────────
  const filteredForms = useMemo(() => {
    let f = FORM_SCHEMAS.filter(s => s.sectionName === activeDept);
    if (formSearch.trim()) {
      const q = formSearch.toLowerCase();
      f = f.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return f;
  }, [activeDept, formSearch]);

  // ── Records display ──────────────────────────────────────────────
  const displayedRecords = useMemo(() => {
    if (!records) return [];
    let r = [...records];
    if (activeMonth) r = r.filter((rec) => getRecordMonth(rec) === activeMonth);
    if (activeProject) r = r.filter((rec) => rec.project_id === activeProject);
    if (selectedForm) r = r.filter((rec) => rec.formCode === selectedForm);
    else {
      const deptCodes = FORM_SCHEMAS.filter(f => f.sectionName === activeDept).map(f => f.code);
      r = r.filter((rec) => deptCodes.includes(String(rec.formCode)));
    }
    const sorted = r.sort((a, b) => String(a.serial || '').localeCompare(String(b.serial || ''), undefined, { numeric: true, sensitivity: 'base' }));
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [records, activeMonth, activeProject, selectedForm, activeDept, sortOrder]);

  const handleDeptClick = useMemo(() => (dept: string) => {
    setActiveDept(dept);
    setSelectedForm(null);
  }, []);

  // ── Continue drafts (Prime §D4) — unsent server-side drafts resurface here ──
  const myDrafts = useMemo(() => {
    if (!records || !user?.email) return [];
    return records.filter(r => r._status === "draft" && r._createdBy === user.email);
  }, [records, user?.email]);

  const [discardingSerial, setDiscardingSerial] = useState<string | null>(null);
  const handleDiscardDraft = async (id: string, serial: string) => {
    setDiscardingSerial(serial);
    const result = await discardRecordDraft(id);
    setDiscardingSerial(null);
    if (!result.success) {
      // Never hide a refusal — the draft stays so nothing is silently lost.
      toast.error(`Could not discard draft ${serial}: ${result.error}`);
      return;
    }
    toast.success(`Draft ${serial} discarded`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome + Global Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground dark:text-foreground">Hey, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalRecords} records · {approvedCount} approved · {deptHealthMap.size} departments
            {globalOverdue > 0 && <span className="text-destructive-tint ml-1">· {globalOverdue} overdue forms</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Project selector (synced with Sidebar ?project=) */}
          <div className="relative">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={activeProject}
              onChange={e => {
                const val = e.target.value;
                setGlobalProject(val);
                setSelectedForm(null);
                const next = new URLSearchParams(searchParams);
                if (val) next.set("project", val); else next.delete("project");
                setSearchParams(next, { replace: true });
              }}
              className="h-11 pl-9 pr-4 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">All Projects</option>
              {PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Month selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={activeMonth}
              onChange={e => {
                const val = e.target.value;
                setGlobalMonth(val);
                setSelectedForm(null);
                const next = new URLSearchParams(searchParams);
                if (val) next.set("month", val); else next.delete("month");
                setSearchParams(next, { replace: true });
              }}
              className="h-11 pl-9 pr-4 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate("/create")}
            className="self-start shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Record
          </button>
        </div>
      </div>

      {/* Continue drafts (Prime §D4) — abandoned unsent drafts resurface here */}
      {myDrafts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-display font-bold text-foreground dark:text-foreground">Continue drafts</h2>
            <span className="text-[11px] text-muted-foreground">{myDrafts.length} unsent</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {myDrafts.map(d => (
              <div
                key={String(d.id)}
                className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg border border-border bg-background text-sm"
              >
                <button
                  onClick={() => navigate(`/create?formCode=${encodeURIComponent(String(d.formCode))}`)}
                  className="flex items-center gap-2 hover:text-primary-tint transition-colors"
                  title="Resume this draft"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{String(d.formName || d.formCode)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{String(d.serial)}</span>
                </button>
                <button
                  onClick={() => handleDiscardDraft(String(d.id), String(d.serial))}
                  disabled={discardingSerial === d.serial}
                  title="Discard draft"
                  className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-destructive-tint transition-colors disabled:opacity-50 ds-hit-44"
                >
                  {discardingSerial === d.serial
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLIANCE RADAR — Prominent Gap Alert Card */}
      {!activeMonth && !activeProject && <ComplianceRadarCard missingPeriodsMap={missingPeriodsMap} />}

      {/* QUALITY PULSE — org KPIs via the ONE dashboard_stats RPC (Prime §D6) */}
      {!activeMonth && !activeProject && <DashboardStatsCard stats={stats} isLoading={statsLoading} error={statsError} />}

      {/* Department Metric Cards (Executive Row) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DEPT_ORDER.map((dept) => (
          <DeptMetricCard
            key={dept}
            dept={dept}
            health={deptHealthMap.get(dept) || { totalForms: 0, totalSubmissions: 0, overdueCount: 0, cyclicalForms: 0, healthyCyclical: 0, status: 'healthy' }}
            isActive={activeDept === dept}
            onClick={() => handleDeptClick(dept)}
          />
        ))}
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left — Forms with Compliance Telemetry */}
        <div className="lg:col-span-4">
          <div className="bg-card border-border rounded-xl">
            <div className="px-5 pt-5 pb-3 border-b border-border dark:border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground dark:text-foreground">Forms</h2>
                <span className="text-[11px] text-muted-foreground">{filteredForms.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search forms…"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </div>
            </div>
            <div>
              <div className="divide-y divide-border">
                {filteredForms.map((schema) => {
                  const isSelected = selectedForm === schema.code;
                  const compliance = complianceMap.get(schema.code);
                  const recordCount = compliance?.recordCount || 0;
                  return (
                    <button
                      key={schema.code}
                      onClick={() => setSelectedForm(isSelected ? null : schema.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
                        isSelected ? "bg-background dark:bg-card" : "hover:bg-background dark:hover:bg-card/50"
                      )}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-background dark:bg-card border border-border dark:border-border shrink-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground dark:text-foreground truncate">{schema.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-mono text-muted-foreground/70">{schema.code}</p>
                          {compliance && (<ComplianceBadge compliance={compliance} />)}
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Last record: {getLastFiledText(compliance?.lastRecordDate || null)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {recordCount > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground/70">{recordCount}</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-ink-3 dark:text-ink-2" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Records */}
        <div className="lg:col-span-8">
          <div className="bg-card border-border rounded-xl">
            <div className="px-5 pt-5 pb-3 border-b border-border dark:border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-display font-bold text-foreground dark:text-foreground">
                  {selectedForm
                    ? `Records — ${FORM_SCHEMAS.find((f: FormSchema) => f.code === selectedForm)?.name || selectedForm}`
                    : `${activeDept} Records`}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{displayedRecords.length} entries</p>
              </div>
              {selectedForm && (
                <button onClick={() => setSelectedForm(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Clear</button>
              )}
            </div>
            <div>
              <AsyncBoundary
                isLoading={recordsLoading}
                error={recordsError}
                onRetry={() => refetchRecords()}
                isEmpty={displayedRecords.length === 0}
                emptyTitle="No records"
                emptyMessage="Select a form or department to view records."
              >
                <div>
                  {/* Sort order toggle */}
                  <div className="flex items-center justify-end gap-2 px-5 py-2 border-b border-border dark:border-border/50">
                    <span className="text-[10px] text-muted-foreground">Order:</span>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
                      title={sortOrder === 'asc' ? 'Ascending (F/01-001 → F/01-999)' : 'Descending (F/01-999 → F/01-001)'}
                    >
                      {sortOrder === 'asc' ? <ArrowUpAZ className="w-3 h-3" /> : <ArrowDownAZ className="w-3 h-3" />}
                      {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                  {displayedRecords.map((record, idx) => (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/${encodeURIComponent(record.serial || "")}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-background dark:hover:bg-card/50 transition-colors text-left group"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-5 text-right">{idx + 1}</span>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{record.serial}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground dark:text-foreground truncate">
                          {(record as RecordData).form_data?.client_name as string || (record as RecordData).form_data?.project_name as string || record.formName}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{record.formCode}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusText status={String(record._approvalStatus || "Approved")} />
                        <span className="text-[10px] text-muted-foreground/70">
                          {new Date(String(record._createdAt || record.createdAt || new Date().toISOString())).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                </div>
              </AsyncBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
