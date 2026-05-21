// ============================================================================
// F/42 — Annual Training Program
// DOCX: 14C x 11R — Header + training program table + approval
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F42Props {
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
  topicNo: string; title: string; participants: string; identifiedBy: string; reason: string; modeInternal: string; modeExternal: string; faculty: string; plannedDate: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    topicNo: "", title: "", participants: "", identifiedBy: "", reason: "", modeInternal: "", modeExternal: "", faculty: "", plannedDate: "",
  }));
}

export function F42Template({ data, isTemplate = true, editMode = false, onChange, className }: F42Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { topicNo: "", title: "", participants: "", identifiedBy: "", reason: "", modeInternal: "", modeExternal: "", faculty: "", plannedDate: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

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
      <div className="grid grid-cols-[6fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Annual Training Program</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/42 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Date/Year row */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Date 🡪 {inp("date", "Date", "w-28")}</div>
        <div className="p-1.5">Year 🡪 {inp("year", "Year", "w-20")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_1fr_80px_1fr_40px_40px_80px_70px] border-x border-b border-black text-[9px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Topic No.</div>
        <div className="p-1 border-r border-black">Title Of Training</div>
        <div className="p-1 border-r border-black">Participants</div>
        <div className="p-1 border-r border-black">Identified By</div>
        <div className="p-1 border-r border-black">Reason For Need</div>
        <div className="p-1 border-r border-black text-center">Int.</div>
        <div className="p-1 border-r border-black text-center">Ext.</div>
        <div className="p-1 border-r border-black">Faculty</div>
        <div className="p-1">Planned Date</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[40px_1fr_1fr_80px_1fr_40px_40px_80px_70px] border-x border-b border-black text-xs relative group min-h-[26px]">
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "topicNo", "#")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "title", "Title")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "participants", "Who")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "identifiedBy", "By")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "reason", "Reason")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "modeInternal", "✓")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "modeExternal", "✓")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "faculty", "Name")}</div>
          <div className="p-1">{cellInp(idx, "plannedDate", "Date")}</div>
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

      {/* Approval */}
      <div className="border border-t-2 border-black text-xs mt-2 p-1.5">
        Reviewed And Approved By: {inp("approved_by", "Authorised Person")}
      </div>
    </div>
  );
}