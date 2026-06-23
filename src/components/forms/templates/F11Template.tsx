// ============================================================================
// F/11 — Production Plan
// DOCX: 8-10 columns → canonical 7-column schema
//   product | batch_no | plan_date | plan_size | actual_date | actual_qty | yield_percent
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

      {/* ====== CORRECTED 7-COLUMN TABLE HEADER ======
          Original DOCX: Sr.No | Product | Batch No. | Plan For Completion (Date + #Size) | Actual Completion (Date + Qty) | % Yield
      */}
      <div className="grid grid-cols-[30px_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr] border-x border-b border-border text-[10px] font-semibold bg-muted">
        <div className="p-1 border-r border-border text-center">Sr.</div>
        <div className="p-1 border-r border-border">Product</div>
        <div className="p-1 border-r border-border">Batch No.</div>
        <div className="p-1 border-r border-border text-center bg-blue-50 dark:bg-blue-950/30">Plan Date</div>
        <div className="p-1 border-r border-border text-center bg-blue-50 dark:bg-blue-950/30">Plan Size</div>
        <div className="p-1 border-r border-border text-center bg-green-50 dark:bg-green-950/30">Actual Date</div>
        <div className="p-1 border-r border-border text-center bg-green-50 dark:bg-green-950/30">Actual Qty</div>
        <div className="p-1 text-center ml-[-1px]">% Yield</div>
      </div>

      {/* ====== DATA ROWS ====== */}
      {rows.map((row, idx) => (
        <div key={idx} className={cn(
          "grid grid-cols-[30px_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr] border-x border-b border-border text-xs",
          idx % 2 === 0 ? "bg-background dark:bg-[#1e1d1a]" : "bg-muted/30"
        )}>
          <div className="p-1 border-r border-border text-center text-muted-foreground">{idx + 1}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "product", "Product")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "batch_no", "Batch No.")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "plan_date", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "plan_size", "# Size")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "actual_date", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "actual_qty", "Qty")}</div>
          <div className="p-1 text-center">{cellInp(idx, "yield_percent", "%")}</div>
          {editMode && (
            <div className="p-1 flex items-center">
              <button onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}

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
    </div>
  );
}
