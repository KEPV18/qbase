// ============================================================================
// F/25 — Audit Plan
// DOCX: Complex form with audit schedule table.
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F25Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

interface AuditRow {
  clause: string; department: string; auditor: string; date: string; time: string; scope: string;
}

function parseRows(d: Record<string, unknown>, count: number = 8): AuditRow[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as AuditRow[];
  return Array.from({ length: count }, () => ({
    clause: "", department: "", auditor: "", date: "", time: "", scope: "",
  }));
}

export function F25Template({ data, isTemplate = true, editMode = false, onChange, className }: F25Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<AuditRow[]>(() => parseRows(d, 8));

  const updateRow = useCallback((idx: number, key: keyof AuditRow, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { clause: "", department: "", auditor: "", date: "", time: "", scope: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, key: keyof AuditRow, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[8fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Audit Plan</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs whitespace-nowrap">
          F/25 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Sr No / Date */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Audit Plan No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">From 🡪 {inp("from", "Management Representative", "w-64")}</div>
        <div className="p-1.5">To 🡪 {inp("to", "Auditors / Auditee", "w-48")}</div>
      </div>

      {/* Last audit info */}
      <div className="grid grid-cols-[2fr_2fr_2fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Last Audit Done In: {inp("last_audit_month", "Month", "w-20")}</div>
        <div className="p-1.5 border-r border-black">Last Audit Plan No.: {inp("last_audit_plan_no", "Plan No", "w-20")}</div>
        <div className="p-1.5">Last Audit Plan Date: {inp("last_audit_plan_date", "Date", "w-20")}</div>
      </div>

      {/* Audit Schedule Table */}
      <div className="border-x border-b border-black text-[10px] font-semibold bg-gray-100 grid grid-cols-[60px_1fr_1fr_70px_60px_1.5fr]">
        <div className="p-1 border-r border-black">Clause</div>
        <div className="p-1 border-r border-black">Department</div>
        <div className="p-1 border-r border-black">Auditor</div>
        <div className="p-1 border-r border-black">Date</div>
        <div className="p-1 border-r border-black">Time</div>
        <div className="p-1">Scope</div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[60px_1fr_1fr_70px_60px_1.5fr] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "clause", "7.x")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "department", "Dept")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "auditor", "Name")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "date", "Date")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "time", "09:00")}</div>
          <div className="p-1">{cellInp(idx, "scope", "Scope")}</div>
          {editMode && rows.length > 1 && (
            <button onClick={() => removeRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {editMode && (
        <button onClick={addRow} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Signature */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Prepared By: {inp("prepared_by", "Name", "w-36")}</div>
        <div>Approved By: {inp("approved_by", "Name", "w-36")}</div>
      </div>
    </div>
  );
}