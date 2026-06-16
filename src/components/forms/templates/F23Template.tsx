// ============================================================================
// F/23 — Master List of Records
// DOCX: 1 table, 16 rows, 10 cols. Grid layout with:
// Row 0: Title (gs=8) + Serial (gs=2)
// Row 1: Department (gs=6) + Date (gs=4)
// Row 2: Column headers: Record No | Title | Format No | Frequency | Method | Access | Storage | Retention Period (gs=2) | Person Responsible
// Rows 3-14: Data rows
// Row 15: Authorised Signature (gs=10)
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F23Props {
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

interface RowData {
  recordNo: string; title: string; formatNo: string; frequency: string;
  methodOfFiling: string; access: string; storagePlace: string;
  retentionPeriod: string; retentionYears: string; personResponsible: string;
}

function parseRows(d: Record<string, unknown>, count: number = 8): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as RowData[];
  }
  return Array.from({ length: count }, (_, i) => ({
    recordNo: "", title: "", formatNo: "", frequency: "",
    methodOfFiling: "", access: "", storagePlace: "",
    retentionPeriod: "", retentionYears: "", personResponsible: "",
  }));
}

export function F23Template({ data, isTemplate = true, editMode = false, onChange, className }: F23Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { recordNo: "", title: "", formatNo: "", frequency: "", methodOfFiling: "", access: "", storagePlace: "", retentionPeriod: "", retentionYears: "", personResponsible: "" }]);
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

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto] border border-black">
        <div className="col-span-1 p-2 font-bold bg-primary/5 text-base">Master List of Records</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/23 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Department / Date row */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Department 🡪 {inp("department", "Department")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[50px_1.5fr_70px_80px_80px_60px_70px_60px_60px_80px] border-x border-b border-black text-[9px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Record No.</div>
        <div className="p-1 border-r border-black">Title Of Record</div>
        <div className="p-1 border-r border-black">Format No.</div>
        <div className="p-1 border-r border-black">Frequency</div>
        <div className="p-1 border-r border-black">Method Of Filing</div>
        <div className="p-1 border-r border-black">Access</div>
        <div className="p-1 border-r border-black">Storage Place</div>
        <div className="p-1 border-r border-black text-center">Retention<br/>Period</div>
        <div className="p-1 border-r border-black text-center">Retention<br/>Years</div>
        <div className="p-1">Person Responsible</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[50px_1.5fr_70px_80px_80px_60px_70px_60px_60px_80px] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "recordNo", "F/XX")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "title", "Title")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "formatNo", "F/XX")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "frequency", "Monthly")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "methodOfFiling", "File")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "access", "All")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "storagePlace", "Cabinet")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "retentionPeriod", "2Y")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "retentionYears", "")}</div>
          <div className="p-1">{cellInp(idx, "personResponsible", "Name")}</div>
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

      {/* Authorised Signature */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Authorised Signature - Functional Head: {inp("authorised_signature", "Sign")}</div>
      </div>
    </div>
  );
}