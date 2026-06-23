// ============================================================================
// QBase — Dashboard (NotionWarm Workspace)
// Warm paper-toned cards, serif headings, soft borders, felt warmth
// NOW WITH: ISO Compliance Monitor, SLA Countdown Grid, Department Health
// ============================================================================

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS, type FormSchema } from "@/data/formSchemas";
import { cn } from "@/lib/utils";
import {
  FileText, Folder, Search, ChevronRight, Plus,
  AlertTriangle, CheckCircle, Clock, ShieldAlert, Calendar,
} from "lucide-react";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import {
  parseFrequency, applyFrequency, getUrgencyText, getLastFiledText,
  computeDeptHealth, type FormCompliance, type DeptHealth,
} from "@/lib/compliance";
import { deptBorderStyle, deptAccentStyle } from "@/lib/departmentTheme";
import {
  getMonthsFromRecords, monthLabel, monthShortLabel,
  getRecordMonth, getMissingMonths, getAllMissingMonths,
  MONTHLY_FORM_CODES,
} from "@/lib/temporalUtils";
import { bulkCreateMissingMonths } from "@/lib/bulkCreate";
import { toast } from "sonner";

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
    Approved: "bg-emerald-500/5 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    Pending_Approval: "bg-amber-500/5 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    Draft: "bg-zinc-500/5 text-muted-foreground dark:bg-zinc-400/10 dark:text-zinc-400",
  };
  const label = status === "Pending_Approval" ? "Pending" : status;
  return <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", colors[status] || "bg-zinc-500/5 text-muted-foreground")}>{label}</span>;
}

/* ─── SLA Health Pill ─────────────────────────────────────────────── */
function HealthPill({ health, dept }: { health: DeptHealth; dept: string }) {
  const accent = deptAccentStyle(dept);
  if (health.status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400" style={{ ...accent, backgroundColor: undefined, border: 'none', padding: 0 }}>
        <CheckCircle className="w-3 h-3" /> Up to date
      </span>
    );
  }
  if (health.status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3 h-3" /> {health.overdueCount} Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
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
        "text-left rounded-r-xl border border-l-0 p-4 transition-all w-full",
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
          <p className="text-lg font-bold text-foreground dark:text-foreground">{health.totalForms}</p>
          <p className="text-[10px] text-muted-foreground/70">Forms Available</p>
        </div>
        <div className="w-px h-8 bg-[#e8e3db] dark:bg-[#3a3834]" />
        <div>
          <p className="text-lg font-bold text-foreground dark:text-foreground">{health.totalSubmissions}</p>
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
    return <span className="text-[10px] text-amber-600 font-medium">Never filed</span>;
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium">
        <ShieldAlert className="w-3 h-3" /> Overdue by {overdueDays}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
      <Clock className="w-3 h-3" /> {getUrgencyText(compliance)}
    </span>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: records, isLoading: recordsLoading } = useRecords();
  const [activeDept, setActiveDept] = useState("Sales & Customer Service");
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formSearch, setFormSearch] = useState("");
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);

  const handleBulkCreate = useCallback(async (formCode: string) => {
    if (!records || !user) return;
    setIsCreatingBulk(true);
    try {
      const result = await bulkCreateMissingMonths(
        records as RecordData[], formCode,
        user.email || user.id || 'unknown', user.name || 'unknown',
      );
      if (result.created > 0) {
        toast.success(`Created ${result.created} record(s) for ${formCode}`);
      }
      if (result.failed.length > 0) {
        toast.error(`Failed: ${result.failed.map(f => `${f.month} (${f.error})`).join(', ')}`);
      }
    } catch (err) {
      toast.error(`Bulk create failed: ${(err as Error).message}`);
    } finally {
      setIsCreatingBulk(false);
    }
  }, [records, user]);

  const firstName = (user?.name || "User").split(" ")[0];

  // ── Global month selector ────────────────────────────────────────
  const [globalMonth, setGlobalMonth] = useState("");
  const availableMonths = useMemo(() => getMonthsFromRecords(records || []), [records]);

  // ── Missing months for monthly forms ─────────────────────────────
  const missingMonthsMap = useMemo(() => getAllMissingMonths(records || []), [records]);
  const hasMissingMonths = missingMonthsMap.size > 0;

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
    if (!globalMonth || !records) return records || [];
    return records.filter(r => getRecordMonth(r) === globalMonth);
  }, [records, globalMonth]);

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
    if (globalMonth) r = r.filter((rec) => getRecordMonth(rec) === globalMonth);
    if (selectedForm) r = r.filter((rec) => rec.formCode === selectedForm);
    else {
      const deptCodes = FORM_SCHEMAS.filter(f => f.sectionName === activeDept).map(f => f.code);
      r = r.filter((rec) => deptCodes.includes(String(rec.formCode)));
    }
    return r.sort((a, b) => new Date(String(b._createdAt || new Date().toISOString())).getTime() - new Date(String(a._createdAt || new Date().toISOString())).getTime());
  }, [records, globalMonth, selectedForm, activeDept]);

  const handleDeptClick = useCallback((dept: string) => {
    setActiveDept(dept);
    setSelectedForm(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome + Global Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground dark:text-foreground">Hey, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalRecords} records · {approvedCount} approved · {deptHealthMap.size} departments
            {globalOverdue > 0 && <span className="text-red-500 ml-1">· {globalOverdue} overdue forms</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={globalMonth}
              onChange={e => { setGlobalMonth(e.target.value); setSelectedForm(null); }}
              className="pl-9 pr-4 py-2.5 rounded-lg bg-background dark:bg-[#1a1a18] border border-border dark:border-border text-sm text-foreground dark:text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate("/create")}
            className="self-start shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-primary-foreground dark:bg-primary dark:text-primary-foreground text-sm font-medium hover:bg-foreground/90 dark:hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Record
          </button>
        </div>
      </div>

      {/* Missing Months Alert */}
      {hasMissingMonths && !globalMonth && (
        <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Missing Monthly Records</span>
          </div>
          <div className="space-y-1">
            {Array.from(missingMonthsMap.entries()).map(([code, missing]) => {
              const form = FORM_SCHEMAS.find(f => f.code === code);
              return (
                <p key={code} className="text-xs text-amber-600/80 dark:text-amber-400/80 ml-6">
                  {code} ({form?.name || code}) — Missing: {missing.map(monthLabel).join(', ')}
                </p>
              );
            })}
          </div>
        </div>
      )}

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
                <h2 className="text-sm font-heading font-bold text-foreground dark:text-foreground">Forms</h2>
                <span className="text-[11px] text-muted-foreground">{filteredForms.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search forms…"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background dark:bg-[#1a1a18] border border-border dark:border-border text-sm text-foreground dark:text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
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
                        isSelected ? "bg-background dark:bg-[#1a1a18]" : "hover:bg-background dark:hover:bg-[#1a1a18]/50"
                      )}
                    >
                      <div className="w-7 h-7 rounded flex items-center justify-center bg-background dark:bg-[#1a1a18] border border-border dark:border-border shrink-0">
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
                        <ChevronRight className="w-3.5 h-3.5 text-[#e8e3db] dark:text-[#3a3834]" />
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
                <h2 className="text-sm font-heading font-bold text-foreground dark:text-foreground">
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
              {displayedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Folder className="w-8 h-8 text-[#e8e3db] dark:text-[#3a3834] mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No records</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Select a form or department to view records.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {displayedRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/${encodeURIComponent(record.serial || "")}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-background dark:hover:bg-[#1a1a18]/50 transition-colors text-left group"
                    >
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
