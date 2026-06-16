// ============================================================================
// F/24 — Objectives & Targets
// DOCX: 1 table, 9 rows, 18 cols. Complex grid layout.
// R0: Title (gs=10) + Rev No (gs=8)
// R1: Department (gs=4) + Year (gs=14)
// R2: Column headers: Quantifiable Criteria | Target (gs=2) | Program (gs=2) | Results for months (gs=13)
// R3-R7: Data rows (months are split across 13 cols)
// R8: Signature (gs=5) + empty data
// Simplification: 5-column grid (Criteria | Present Target | Future Target | Program | Results)
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F24Props {
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
  criteria: string; presentTarget: string; futureTarget: string;
  program: string; results: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    criteria: "", presentTarget: "", futureTarget: "", program: "", results: "",
  }));
}

export function F24Template({ data, isTemplate = true, editMode = false, onChange, className }: F24Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { criteria: "", presentTarget: "", futureTarget: "", program: "", results: "" }]);
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
      <div className="grid grid-cols-[2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Objectives & Targets</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/24 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Department / Year */}
      <div className="grid grid-cols-[2fr_5fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Department 🡪 {inp("department", "Department")}</div>
        <div className="p-1.5">Year 🡪 {inp("year", "Year", "w-24")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_2fr] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Quantifiable Criteria / Control Parameters</div>
        <div className="p-1 border-r border-black text-center">Present<br/>Target</div>
        <div className="p-1 border-r border-black text-center">Future<br/>Target</div>
        <div className="p-1 border-r border-black">Program to Achieve Objective</div>
        <div className="p-1">Results</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_2fr] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black">{cellInp(idx, "criteria", "Criteria")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "presentTarget", "Target")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "futureTarget", "Future")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "program", "Program")}</div>
          <div className="p-1">{cellInp(idx, "results", "Results")}</div>
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
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Signature Of Functional Head 🡪 {inp("signature", "Signature", "w-40")}</div>
      </div>
    </div>
  );
}