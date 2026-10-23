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
import { CANONICAL_FORMS } from "@/data/formCatalog";
import { cn } from "@/lib/utils";
import {
  FileText, Folder, Search, ChevronRight, Plus,
  AlertTriangle, CheckCircle, Clock, ShieldAlert, Calendar,
  Radar, ArrowUpAZ, ArrowDownAZ, XCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import {
  parseFrequency, buildComplianceMap, getUrgencyText, getLastFiledText,
  computeDeptHealth, type FormCompliance, type DeptHealth,
} from "@/lib/compliance";
import type { Period } from "@/lib/compliancePeriods";
import { getDeptTheme } from "@/lib/departmentTheme";
import { PanelCell, PanelCells, PanelHeader, PanelRow, PanelRows, UnifiedPanel } from "@/components/ui/UnifiedPanel";
import {
  getMonthsFromRecords, monthLabel, monthShortLabel,
  getRecordMonth,
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
  /* Only the state that needs attention carries colour.
     The dashboard paints one of these per record row, and "Approved" is the
     NORMAL state — seventeen green pills down a column is decoration, not
     information, and the word already says what it is.  The amber is left
     for the row that is actually waiting on someone.  (Same rule as the
     SLA Health Pill below: greyscale for OK, colour for the exception.) */
  const colors: Record<string, string> = {
    Approved: "bg-ink/5 text-muted-foreground dark:bg-ink/10 dark:text-ink-3",
    Pending_Approval: "bg-warning/5 text-warning-tint dark:bg-warning/10",
    Draft: "bg-ink/5 text-muted-foreground dark:bg-ink/10 dark:text-ink-3",
  };
  const label = status === "Pending_Approval" ? "Pending" : status;
  return <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", colors[status] || "bg-ink/5 text-muted-foreground")}>{label}</span>;
}

/* ─── SLA Health Pill ─────────────────────────────────────────────── */
function HealthPill({ health }: { health: DeptHealth }) {
  if (health.status === 'healthy') {
    /* The OK state is deliberately GRAYSCALE.  Colour is reserved for the
       states that need attention, so the eye goes straight to the amber and
       the red.  (The old code reached this by accident: it spread the
       department theme's inline `color` over `text-success-tint`, and an
       inline colour always wins — so the green was never painted.) */
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        <CheckCircle className="w-3 h-3" /> Up to date
      </span>
    );
  }
  if (health.status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning-tint whitespace-nowrap">
        <AlertTriangle className="w-3 h-3" /> {health.overdueCount} Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive-tint whitespace-nowrap">
      <ShieldAlert className="w-3 h-3" /> {health.overdueCount} Overdue
    </span>
  );
}

/* ─── Department Metric Cell ──────────────────────────────────────── */
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
  /* The cell shows the department's SHORT label ("Sales", "R&D",
     "Management") with the full name on hover.  Seven of these sit across
     a 1080px grid, which leaves ~150px a cell — "Management &
     Documentation" needs three lines there and used to push the whole row
     30px past its container and clip the row's right-hand cells.  The
     short labels already existed in `departmentTheme` for exactly this
     reason; nothing had used them.

     The cell is THREE lines, not two: the label, then the two figures,
     then the status.  The status used to sit BESIDE the label, and at
     seven across there was no room for both — the label truncated to
     "Oper…" and the status wrapped onto two lines.  The status is the
     one thing that must never be clipped, so it gets its own line. */
  const shortLabel = getDeptTheme(dept).label;
  return (
    <PanelCell
      as="button"
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title={dept}
      className={cn(
        "min-w-0 text-left transition-colors hover:bg-foreground/[0.03]",
        isActive && "bg-foreground/[0.05] shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.18)]"
      )}
    >
      <p className="text-[13px] font-semibold text-foreground leading-tight truncate mb-2">{shortLabel}</p>
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground leading-none">{health.totalForms}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Forms</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground leading-none">{health.totalSubmissions}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Filed</p>
        </div>
      </div>
      <div className="mt-2">
        <HealthPill health={health} />
      </div>
    </PanelCell>
  );
}

/* ─── Compliance Micro Badge ────────────────────────────────────── */
function ComplianceBadge({ compliance }: { compliance: FormCompliance }) {
  const { isPeriodic, frequencyLabel, daysSinceLast, isOverdue, overdueDays, missingCount } = compliance;

  // Forms without a fixed cadence ("On event", "Daily", "Per project") owe no
  // deadline — say what they are instead of showing a countdown to nothing.
  if (!isPeriodic) {
    return <span className="text-[10px] text-muted-foreground font-medium">{frequencyLabel}</span>;
  }
  if (daysSinceLast === null) {
    return <span className="text-[10px] text-warning-tint font-medium">Never filed</span>;
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-destructive-tint font-medium">
        <ShieldAlert className="w-3 h-3" /> Overdue by {overdueDays}d
        {missingCount > 1 ? ` · ${compliance.missingCountLabel}` : ''}
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
interface ComplianceGap {
  code: string;
  name: string;
  frequency: string;
  periods: Period[];
  overdueDays: number;
  recordCount: number;
  /** 'month' | 'quarter' | 'half-year' | 'year' — the cadence's own unit. */
  unit: string;
  /** '5 months' — the missed count in that unit. */
  countLabel: string;
}

function ComplianceRadarCard({
  gaps,
}: {
  gaps: ComplianceGap[];
}) {
  if (gaps.length === 0) {
    return (
      <UnifiedPanel>
        <div className="px-5 py-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success-tint shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            All Recurring Forms Are Up to Date
          </span>
        </div>
        <div className="px-5 pb-4 -mt-2">
          <p className="text-xs text-muted-foreground ml-6">
            No compliance gaps detected across monthly, quarterly, semi-annual, or annual forms.
          </p>
        </div>
      </UnifiedPanel>
    );
  }

  /* The radar used to be a full `bg-warning/10` block in which every one
     of its rows was amber text on an amber ground — forty-odd chromatic
     text nodes on one screen, which is the "colour as decoration" the
     design system rejects.  It is ONE white panel now: the heat colour
     stays on the icon and on the form code (the identifier), and the
     description is ordinary ink. */
  return (
    <UnifiedPanel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-warning-tint" />
            Compliance Radar
          </span>
        }
        meta={`${gaps.length} form${gaps.length > 1 ? 's' : ''} with gaps`}
      />
      <PanelRows>
        {gaps.map(gap => {
          // Every missed period is named, not just the first three: the
          // question this card answers is "how far behind is this form?",
          // and the answer is a LIST of the months it skipped.
          const shown = gap.periods.slice(0, 6);
          const rest = gap.periods.length - shown.length;
          return (
            <PanelRow key={gap.code} className="items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-tint mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  <span className="font-semibold text-warning-tint">{gap.code}</span> · {gap.name} —{' '}
                  {gap.recordCount === 0 ? (
                    <>never filed — {gap.countLabel} owed</>
                  ) : (
                    <>
                      missing <span className="font-semibold">{gap.countLabel}</span>
                      {shown.length > 0 && (
                        <>: {shown.map(p => p.label).join(', ')}</>
                      )}
                      {rest > 0 ? ` +${rest} more` : ''}
                    </>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {gap.frequency} form — {gap.countLabel} overdue ({gap.overdueDays} days)
                </p>
              </div>
            </PanelRow>
          );
        })}
      </PanelRows>
    </UnifiedPanel>
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
      <div className="ds-panel px-5 py-4 animate-pulse" aria-busy="true">
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
      className="ds-panel px-5 py-4"
      title="Live KPIs from public.dashboard_stats() (migration 20260929_04): records_total / records_by_status / records_last_30d / capa_total / capa_closed / capa_open / capa_closure_rate / capa_overdue / pending_review_aging — counts computed from records and capas tables."
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Quality Pulse</span>
        <span className="text-[10px] text-muted-foreground">
          <span>{stats.recordsLast30d}</span> filed in the last 30 days
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="text-muted-foreground">
          Records: <strong className="text-foreground">{stats.recordsTotal}</strong>
          {/* Only a count that means something is coloured.  A green
              "311 approved" paints the NORMAL state as a signal, and an
              amber "0 pending" is a warning about nothing — both are
              decoration pretending to be information.  So: grey by
              default, amber once something is actually waiting, red once
              something has been turned down. */}
          <span className="ml-1.5 text-muted-foreground">{by.approved} approved</span>
          <span className={cn("ml-1.5", by.pending_review > 0 ? "text-warning-tint" : "text-muted-foreground")}>
            {by.pending_review} pending
          </span>
          <span className="ml-1.5 text-muted-foreground">{by.draft} draft</span>
          <span className={cn("ml-1.5", by.rejected > 0 ? "text-destructive-tint" : "text-muted-foreground")}>
            {by.rejected} rejected
          </span>
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
            <ShieldAlert className="w-3 h-3" /> <span>{stats.capaOverdue}</span> CAPA overdue
          </span>
        )}
        {stats.pendingReviewAging.over_30d > 0 ? (
          <span className="inline-flex items-center gap-1 text-destructive-tint">
            <Clock className="w-3 h-3" /> <span>{stats.pendingReviewAging.over_30d}</span> reviews waiting &gt;30d
          </span>
        ) : stats.pendingReviewAging.from_7_to_30d > 0 ? (
          <span className="inline-flex items-center gap-1 text-warning-tint">
            <Clock className="w-3 h-3" /> <span>{stats.pendingReviewAging.from_7_to_30d}</span> reviews waiting 7–30d
          </span>
        ) : (
          <span className="text-muted-foreground">Reviews current (<span>{stats.pendingReviewAging.under_7d}</span> &lt;7d)</span>
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

  // ── COMPLIANCE — one model, one number ───────────────────────────
  // The dashboard counter, the department health cards and the Compliance
  // Radar all read the same period coverage engine, so they cannot contradict
  // each other (they used to: "All Recurring Forms Are Up to Date" sat next to
  // "8 overdue forms" because the radar checked a fixed Jan–Jun 2026 window
  // while the counter used a different rule).
  const complianceMap = useMemo(() => {
    const filings = (records || []).map(r => ({
      formCode: String(r.formCode),
      createdAt: String(r._createdAt || ''),
      month: getRecordMonth(r),
    }));
    return buildComplianceMap(
      filings,
      CANONICAL_FORMS.map(f => ({ code: f.code, name: f.name, frequency: f.frequency })),
    );
  }, [records]);

  // ── COMPLIANCE RADAR — the forms that owe a filing and have not filed ──
  const complianceGaps = useMemo<ComplianceGap[]>(() => {
    const gaps: ComplianceGap[] = [];
    complianceMap.forEach(c => {
      if (c.missingCount === 0) return;
      gaps.push({
        code: c.formCode,
        name: c.formName,
        frequency: c.frequencyLabel,
        periods: c.missingPeriods,
        overdueDays: c.overdueDays,
        recordCount: c.recordCount,
        unit: c.periodUnit,
        countLabel: c.missingCountLabel,
      });
    });
    return gaps.sort((a, b) => b.overdueDays - a.overdueDays);
  }, [complianceMap]);

  // ── Department health ────────────────────────────────────────────
  const deptHealthMap = useMemo(() => {
    const map = new Map<string, DeptHealth>();
    DEPT_ORDER.forEach(dept => {
      const deptForms = CANONICAL_FORMS.filter(f => f.sectionName === dept).map(f => ({
        code: f.code,
        frequencyType: parseFrequency(f.frequency),
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
    let f = CANONICAL_FORMS.filter(s => s.sectionName === activeDept);
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
      const deptCodes = CANONICAL_FORMS.filter(f => f.sectionName === activeDept).map(f => f.code);
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
            <span>{totalRecords}</span> records · <span>{approvedCount}</span> approved · <span>{deptHealthMap.size}</span> departments
            {globalOverdue > 0 && <span className="text-destructive-tint ml-1">· <span>{globalOverdue}</span> overdue forms</span>}
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
        <div className="ds-panel p-5">
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
      {!activeMonth && !activeProject && <ComplianceRadarCard gaps={complianceGaps} />}

      {/* QUALITY PULSE — org KPIs via the ONE dashboard_stats RPC (Prime §D6) */}
      {!activeMonth && !activeProject && <DashboardStatsCard stats={stats} isLoading={statsLoading} error={statsError} />}

      {/* Department Metric Cells (Executive Row) — ONE panel of seven
          hairline-separated cells.  They used to be seven separate bordered
          cards in a `gap-3` grid, which is exactly the fragmentation the
          design system's first rule rejects: sibling items belong on one
          surface divided by hairlines.  It also fixes the row's overflow —
          the cells now carry `min-w-0` and the short department labels, so
          the grid can no longer be pushed past its container. */}
      <UnifiedPanel>
        <PanelCells columns={7}>
          {DEPT_ORDER.map((dept) => (
            <DeptMetricCard
              key={dept}
              dept={dept}
              health={deptHealthMap.get(dept) || { totalForms: 0, totalSubmissions: 0, overdueCount: 0, cyclicalForms: 0, healthyCyclical: 0, status: 'healthy' }}
              isActive={activeDept === dept}
              onClick={() => handleDeptClick(dept)}
            />
          ))}
        </PanelCells>
      </UnifiedPanel>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left — Forms with Compliance Telemetry */}
        <div className="lg:col-span-4">
          {/* `ds-panel`, not `bg-card border-border rounded-xl`: that
              spelling set only the border COLOUR with no border WIDTH and
              an ad-hoc 12px radius, so the panel drew no border at all and
              did not match the token's radius tier. */}
          <div className="ds-panel overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-border dark:border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground dark:text-foreground">Forms</h2>
                <span className="text-[11px] text-muted-foreground">{filteredForms.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
                <input
                  type="text"
                  placeholder="Search forms…"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
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
                        <FileText className="w-3.5 h-3.5 text-ink-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground dark:text-foreground truncate">{schema.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-mono text-muted-foreground">{schema.code}</p>
                          {compliance && (<ComplianceBadge compliance={compliance} />)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Last record: {getLastFiledText(compliance?.lastRecordDate || null)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {recordCount > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground">{recordCount}</span>
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
          <div className="ds-panel overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-border dark:border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-display font-bold text-foreground dark:text-foreground">
                  {selectedForm
                    ? `Records — ${CANONICAL_FORMS.find(f => f.code === selectedForm)?.name || selectedForm}`
                    : `${activeDept} Records`}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5"><span>{displayedRecords.length}</span> entries</p>
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
                        <p className="text-[10px] text-muted-foreground mt-0.5">{record.formCode}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusText status={String(record._approvalStatus || "Approved")} />
                        <span className="text-[10px] text-muted-foreground">
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
