// ============================================================================
// F/28 — Training Attendance Sheet
// DOCX: Simple table: Sl No | Name | Department | ID NO | Training Date | Signature
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F28Props {
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
  slNo: string; name: string; department: string; idNo: string; trainingDate: string; signature: string;
}

function parseRows(d: Record<string, unknown>, count: number = 10): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, (_, i) => ({
    slNo: String(i + 1), name: "", department: "", idNo: "", trainingDate: "", signature: "",
  }));
}

export function F28Template({ data, isTemplate = true, editMode = false, onChange, className }: F28Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { slNo: String(prev.length + 1), name: "", department: "", idNo: "", trainingDate: "", signature: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, slNo: String(i + 1) })));
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
      <div className="grid grid-cols-[3fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Training Attendance Sheet</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/28 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Top info */}
      <div className="grid grid-cols-[1fr_1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5 border-r border-black">Training Topic: {inp("training_topic", "Topic")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_1.5fr_1fr_70px_80px_80px] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Sl No</div>
        <div className="p-1 border-r border-black">Name Of The Participant</div>
        <div className="p-1 border-r border-black">Department</div>
        <div className="p-1 border-r border-black">ID NO.</div>
        <div className="p-1 border-r border-black">Training Date</div>
        <div className="p-1">Signature</div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[40px_1.5fr_1fr_70px_80px_80px] border-x border-b border-black text-xs relative group min-h-[24px]">
          <div className="p-1 border-r border-black text-center">{idx + 1}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "name", "Name")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "department", "Dept")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "idNo", "ID")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "trainingDate", "Date")}</div>
          <div className="p-1">{cellInp(idx, "signature", "Sign")}</div>
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

      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Trainer: {inp("trainer", "Name", "w-36")}</div>
        <div>Conducted By: {inp("conducted_by", "Name", "w-36")}</div>
      </div>
    </div>
  );
}