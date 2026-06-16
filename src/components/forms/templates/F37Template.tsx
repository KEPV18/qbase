// ============================================================================
// F/37 — Experiment Data Sheet
// DOCX: 6C x 27R — Header fields + quantities table + signatures
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F37Props {
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
  quantities: string; description: string; observation: string;
}

function parseRows(d: Record<string, unknown>, count: number = 10): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({ quantities: "", description: "", observation: "" }));
}

export function F37Template({ data, isTemplate = true, editMode = false, onChange, className }: F37Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { quantities: "", description: "", observation: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
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
      <div className="grid grid-cols-[5fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Experiment Data Sheet</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/37 Issue No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Key-value fields */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-b border-black">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5 border-b border-black">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Product 🡪 {inp("product", "Product Name")}</div>
        <div className="p-1.5">Experiment No. 🡪 {inp("experiment_no", "Exp No.")}</div>
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">
        Incharge 🡪 {inp("incharge", "Incharge Name")}
      </div>

      {/* Object and Variables */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Object And Variables</div>
        <div className="p-2 min-h-[40px]">
          {editMode ? (
            <textarea className="w-full bg-transparent text-xs border-none outline-none min-h-[40px]" value={val(d, "object_variables") || ""} onChange={e => onChange?.("object_variables", e.target.value)} placeholder="Object and variables..." />
          ) : (
            <span className="whitespace-pre-wrap">{val(d, "object_variables") || (ph ? "___" : "")}</span>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="grid grid-cols-[80px_1fr_1fr] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Quantities</div>
        <div className="p-1 border-r border-black">Description</div>
        <div className="p-1">Observation / Results</div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[80px_1fr_1fr] border-x border-b border-black text-xs relative group min-h-[26px]">
          <div className="p-1 border-r border-black">{cellInp(idx, "quantities", "Qty")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "description", "Description")}</div>
          <div className="p-1">{cellInp(idx, "observation", "Results")}</div>
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

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_1fr] border border-t-2 border-black text-xs mt-2">
        <div className="p-1.5">Done By Chemists: {inp("done_by", "Name")}</div>
        <div className="p-1.5 border-l border-black">Reviewed By R&amp;D Head: {inp("reviewed_by", "Name")}</div>
      </div>
    </div>
  );
}