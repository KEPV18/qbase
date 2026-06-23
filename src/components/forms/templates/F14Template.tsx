// ============================================================================
// F/14 — Indent and Incoming Inspection Record
// Canonical rewrite matching DOCX structure exactly.
// Pillar 1: Horizontal Matrix — 6-column items table preserved
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Info } from "lucide-react";

export interface F14Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

interface RowData {
  date: string; itemDescription: string; qty: string; supplier: string; inspectionStatus: string; inspectedBy: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return [{ date: "", itemDescription: "", qty: "", supplier: "", inspectionStatus: "", inspectedBy: "" }];
}

export function F14Template({ data, isTemplate = true, editMode = false, onChange, className }: F14Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { date: "", itemDescription: "", qty: "", supplier: "", inspectionStatus: "", inspectedBy: "" }]);
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
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[3fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Indent and Incoming Inspection Record</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/14 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Indent No. + Date ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Indent No.: {val(d, "indent_no") || val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date: {inp("date", "Date", "w-28")}</div>
      </div>

      {/* ── 6-Column Items Table (Horizontal Matrix) ── */}
      <div className="grid grid-cols-[70px_1fr_60px_1fr_1fr_1fr] border-x border-b border-border text-[10px] font-semibold bg-muted">
        <div className="p-1 border-r border-border">Date</div>
        <div className="p-1 border-r border-border">Item Description</div>
        <div className="p-1 border-r border-border">Qty.</div>
        <div className="p-1 border-r border-border">Name Of Supplier</div>
        <div className="p-1 border-r border-border">Inspection Status</div>
        <div className="p-1">Inspected By</div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[70px_1fr_60px_1fr_1fr_1fr] border-x border-b border-border text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-border">{cellInp(idx, "date", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "itemDescription", "Item")}</div>
          <div className="p-1 border-r border-border text-center">{cellInp(idx, "qty", "Qty")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "supplier", "Supplier")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "inspectionStatus", "Status")}</div>
          <div className="p-1">{cellInp(idx, "inspectedBy", "By")}</div>
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

      {/* ── Disclaimer Callout ── */}
      {val(d, "disclaimer") && (
        <div className="mx-0 mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border-x border-b border-border text-xs">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <span className="text-blue-800 dark:text-blue-300">{val(d, "disclaimer")}</span>
          </div>
        </div>
      )}

      {/* ── Footer Signatures ── */}
      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Prepared By: {inp("prepared_by", "Name", "w-36")}</div>
        <div>Checked By: {inp("checked_by", "Name", "w-36")}</div>
      </div>
    </div>
  );
}
