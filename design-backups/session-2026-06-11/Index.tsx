// ============================================================================
// QBase — Dashboard (2-Column Workspace / Dual-Theme Glass Cards)
// Department pill selector + Forms Registry (left) + Saved Records (right)
// ============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { cn } from "@/lib/utils";
import {
  FileText, Folder, Search, ChevronRight, Plus,
} from "lucide-react";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

const DEPT_ORDER = [
  "All",
  "Sales & Customer Service",
  "HR & Training",
  "Operations & Production",
  "Quality & Audit",
  "R&D & Design",
  "Management & Documentation",
];

const DEPT_META: Record<string, { icon: React.ElementType; color: string }> = {
  "All": { icon: Folder, color: "text-zinc-500" },
  "Sales & Customer Service": { icon: FileText, color: "text-emerald-500" },
  "HR & Training": { icon: FileText, color: "text-blue-500" },
  "Operations & Production": { icon: FileText, color: "text-amber-500" },
  "Quality & Audit": { icon: FileText, color: "text-violet-500" },
  "R&D & Design": { icon: FileText, color: "text-rose-500" },
  "Management & Documentation": { icon: FileText, color: "text-zinc-500" },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Approved: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", label: "Approved" },
    Pending_Approval: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", label: "Pending" },
    Draft: { bg: "bg-slate-50 dark:bg-zinc-800", text: "text-zinc-500 dark:text-zinc-400", label: "Draft" },
  };
  const s = map[status] || map.Draft;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: records } = useRecords();
  const [activeDept, setActiveDept] = useState("All");
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formSearch, setFormSearch] = useState("");

  const firstName = (user?.name || "User").split(" ")[0];

  const deptStats = useMemo(() => {
    const stats: Record<string, { forms: number; records: number }> = {};
    (FORM_SCHEMAS as any[]).forEach((s: any) => {
      const dept = s.sectionName || "Other";
      if (!stats[dept]) stats[dept] = { forms: 0, records: 0 };
      stats[dept].forms += 1;
    });
    records?.forEach((r: any) => {
      const schema = (FORM_SCHEMAS as any[]).find((f: any) => f.code === r.formCode);
      const dept = schema?.sectionName || "Other";
      if (!stats[dept]) stats[dept] = { forms: 0, records: 0 };
      stats[dept].records += 1;
    });
    return stats;
  }, [records]);

  const allForms = useMemo(() => {
    const forms = Object.entries(FORM_SCHEMAS).map(([code, schema]: [string, any]) => ({
      code,
      name: schema.name || code,
      sectionName: schema.sectionName || "Other",
      description: schema.description || "",
      recordCount: records?.filter((r) => r.formCode === code).length || 0,
    }));
    return forms.sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  const filteredForms = useMemo(() => {
    let f = allForms;
    if (activeDept !== "All") f = f.filter((form) => form.sectionName === activeDept);
    if (formSearch.trim()) {
      const q = formSearch.toLowerCase();
      f = f.filter((form) => form.code.toLowerCase().includes(q) || form.name.toLowerCase().includes(q));
    }
    return f;
  }, [allForms, activeDept, formSearch]);

  const displayedRecords = useMemo(() => {
    if (!records) return [];
    let r = [...records];
    if (selectedForm) {
      r = r.filter((rec) => rec.formCode === selectedForm);
    } else if (activeDept !== "All") {
      r = r.filter((rec) => {
        const schema = (FORM_SCHEMAS as any[]).find((f: any) => f.code === rec.formCode);
        return schema?.sectionName === activeDept;
      });
    }
    return r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, selectedForm, activeDept]);

  const totalRecords = records?.length || 0;
  const approvedCount = records?.filter((r) => r.status === "Approved").length || 0;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Hey, {firstName}!</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {totalRecords} records · {approvedCount} approved · {Object.keys(deptStats).length} departments
          </p>
        </div>
        <button
          onClick={() => navigate("/create")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-900 text-white text-sm font-semibold hover:shadow-lg transition-shadow"
        >
          <Plus className="w-4 h-4" />
          New Record
        </button>
      </div>

      {/* Department Selector Pill Bar */}
      <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-1 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 dark:border-zinc-800/40 flex gap-1 overflow-x-auto">
        {DEPT_ORDER.map((dept) => {
          const isActive = activeDept === dept;
          const stat = deptStats[dept];
          const count = dept === "All" ? totalRecords : stat?.records || 0;
          return (
            <button
              key={dept}
              onClick={() => { setActiveDept(dept); setSelectedForm(null); }}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-900 text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <span>{dept === "All" ? "All" : dept}</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Workspace Grid */}
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Panel — Forms Registry */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col h-full overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-50 dark:border-zinc-800/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Forms Registry</h2>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{filteredForms.length} forms</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search forms…"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="space-y-0.5">
                {filteredForms.map((form) => {
                  const isSelected = selectedForm === form.code;
                  return (
                    <button
                      key={form.code}
                      onClick={() => setSelectedForm(isSelected ? null : form.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
                          : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-blue-100 dark:bg-blue-900/30" : "bg-slate-100 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-800")}>
                        <FileText className={cn("w-4 h-4", isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{form.name}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{form.code}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {form.recordCount > 0 && (
                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md px-1.5 py-0.5">{form.recordCount}</span>
                        )}
                        <ChevronRight className={cn("w-4 h-4 transition-colors", isSelected ? "text-blue-500 dark:text-blue-400" : "text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400")} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Saved Records */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col h-full overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-50 dark:border-zinc-800/30 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedForm
                    ? `Records — ${(FORM_SCHEMAS as any).find((f: any) => f.code === selectedForm)?.name || selectedForm}`
                    : activeDept === "All"
                      ? "All Saved Records"
                      : `${activeDept} Records`}
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{displayedRecords.length} entries</p>
              </div>
              {selectedForm && (
                <button onClick={() => setSelectedForm(null)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Clear filter
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {displayedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <Folder className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">No records found</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {selectedForm
                      ? "This form template has no completed records yet."
                      : "Select a department or form to view records."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                  {displayedRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/${encodeURIComponent(record.serial || "")}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
                    >
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 rounded px-2 py-0.5 shrink-0 border border-slate-100 dark:border-zinc-700 group-hover:border-slate-200 dark:group-hover:border-zinc-600 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-colors">
                        {record.serial}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{record.formName}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {(record as any).formData?.client_name || (record as any).formData?.project_name || record.formCode}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={record.status || "Draft"} />
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {new Date(record.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
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