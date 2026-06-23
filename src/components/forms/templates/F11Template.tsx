// ============================================================================
// F/11 — Production Plan
// DOCX: 8-10 columns → canonical 7-column schema
//   product | batch_no | plan_date | plan_size | actual_date | actual_qty | yield_percent
//
// Renders as a proper HTML <table> with two-level spanning headers
// matching the ground-truth Word document exactly.
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F11Props {
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
  product: string;
  batch_no: string;
  plan_date: string;
  plan_size: string;
  actual_date: string;
  actual_qty: string;
  yield_percent: string;
}

function parseRows(d: Record<string, unknown>, count: number = 12): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    product: "", batch_no: "", plan_date: "", plan_size: "", actual_date: "", actual_qty: "", yield_percent: "",
  }));
}

export function F11Template({ data, isTemplate = true, editMode = false, onChange, className }: F11Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { product: "", batch_no: "", plan_date: "", plan_size: "", actual_date: "", actual_qty: "", yield_percent: "" }]);
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
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Title row */}
      <div className="grid grid-cols-[4fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Production Plan</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/11 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Sr No + Date row */}
      <div className="grid grid-cols-[2fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      {/* Month row */}
      <div className="border-x border-b border-border text-xs p-1.5">
        Month 🡪 {inp("month", "Month", "w-40")}
      </div>

      {/* Section header */}
      <div className="border-x border-b border-border text-xs p-1.5 bg-muted/50 font-semibold">
        Planning For Products
      </div>

      {/* ==================================================================
          PROPER HTML <table> WITH TWO-LEVEL SPANNING HEADERS
          Matches ground-truth DOCX exactly:
          
          Row 1 (parent): Sr(rowspan=2) | Product(rowspan=2) | Batch No.(rowspan=2)
                          | Plan For Completion(colspan=2) | Actual Completion(colspan=2)
                          | % Yield(rowspan=2)
          
          Row 2 (child):   | | | Date | # Size | Date | Qty. |
          ================================================================== */}
      <table className="w-full border-collapse border-x border-b border-border text-xs">
        <thead>
          {/* ── Row 1: Parent spanning headers ── */}
          <tr className="bg-muted font-semibold">
            <th rowSpan={2} className="border-r border-b border-border p-1 text-center w-[30px]">Sr.</th>
            <th rowSpan={2} className="border-r border-b border-border p-1 text-left">Product</th>
            <th rowSpan={2} className="border-r border-b border-border p-1 text-left">Batch No.</th>
            <th colSpan={2} className="border-r border-b border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30">Plan For Completion</th>
            <th colSpan={2} className="border-r border-b border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Actual Completion</th>
            <th rowSpan={2} className="border-b border-border p-1 text-center">% Yield</th>
          </tr>
          {/* ── Row 2: Child sub-headers ── */}
          <tr className="bg-muted/80 font-semibold">
            <th className="border-r border-b border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30">Date</th>
            <th className="border-r border-b border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30"># Size</th>
            <th className="border-r border-b border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Date</th>
            <th className="border-r border-b border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Qty.</th>
            <th className="border-b border-border p-1"></th> {/* empty cell under % Yield rowspan */}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-background dark:bg-[#1e1d1a]" : "bg-muted/30"}>
              <td className="border-r border-b border-border p-1 text-center text-muted-foreground">{idx + 1}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "product", "Product")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "batch_no", "Batch No.")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "plan_date", "Date")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "plan_size", "# Size")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "actual_date", "Date")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "actual_qty", "Qty")}</td>
              <td className="border-b border-border p-1 text-center">{cellInp(idx, "yield_percent", "%")}</td>
              {editMode && (
                <td className="border-b border-border p-1 text-center">
                  <button onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="w-3 h-3 inline" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row button (edit mode only) */}
      {editMode && (
        <button onClick={addRow} className="w-full border-x border-b border-border py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* ====== REMARKS ====== */}
      {editMode ? (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Remarks:</span>
          <input className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-3/4"
            value={val(d, "remarks")} onChange={e => onChange?.("remarks", e.target.value)} placeholder="Remarks" />
        </div>
      ) : (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Remarks:</span>
          <span>{val(d, "remarks") || (ph ? "___" : "")}</span>
        </div>
      )}

      {/* ====== PREPARED BY ====== */}
      {editMode ? (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Prepared By:</span>
          <input className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-48"
            value={val(d, "prepared_by")} onChange={e => onChange?.("prepared_by", e.target.value)} placeholder="Name" />
        </div>
      ) : (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Prepared By:</span>
          <span className="border-b border-dashed border-foreground/30 px-2">
            {val(d, "prepared_by") || (ph ? "_____________" : "")}
          </span>
        </div>
      )}

      {/* ====== UPDATED BASED ON PROGRESS ====== */}
      {editMode ? (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Updated Based On Progress:</span>
          <input className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-24"
            value={val(d, "updated_based_on_progress")} onChange={e => onChange?.("updated_based_on_progress", e.target.value)} placeholder="yes/no" />
        </div>
      ) : (
        <div className="border-x border-b border-border p-2 text-xs">
          <span className="font-semibold mr-2">Updated Based On Progress:</span>
          <span className="border-b border-dashed border-foreground/30 px-2">
            {val(d, "updated_based_on_progress") || (ph ? "___" : "")}
          </span>
        </div>
      )}
    </div>
  );
}
