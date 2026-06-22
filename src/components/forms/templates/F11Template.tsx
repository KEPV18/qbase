// ============================================================================
// F/11 — Production Plan
// DOCX: 10C x 29R — Header + date/month + product planning table + remarks + signatures
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
  product: string; batchNo: string; planDate: string; planCompletion: string; planSize: string; actualDate: string; actualQty: string; yieldPercent: string;
}

function parseRows(d: Record<string, unknown>, count: number = 12): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    product: "", batchNo: "", planDate: "", planCompletion: "", planSize: "", actualDate: "", actualQty: "", yieldPercent: "",
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
    setRows(prev => [...prev, { product: "", batchNo: "", planDate: "", planCompletion: "", planSize: "", actualDate: "", actualQty: "", yieldPercent: "" }]);
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

      {/* Table header - two-level */}
      <div className="grid grid-cols-[35px_100px_60px_60px_60px_60px_60px_60px_50px] border-x border-b border-border text-[9px] font-semibold bg-muted">
        <div className="p-1 border-r border-border">Sr.</div>
        <div className="p-1 border-r border-border">Product</div>
        <div className="p-1 border-r border-border">Batch No.</div>
        <div className="p-1 border-r border-border col-span={3} text-center bg-blue-50 dark:bg-blue-950/30">Plan For Completion</div>
        <div className="p-1 col-span={2} text-center bg-green-50 dark:bg-green-950/30">Actual Completion</div>
        <div className="p-1 border-l border-r border-border">% Yield</div>
      </div>
      <div className="grid grid-cols-[35px_100px_60px_60px_60px_60px_60px_60px_50px] border-x border-b border-border text-[9px] font-semibold bg-muted">
        <div className="p-1 border-r border-border"></div>
        <div className="p-1 border-r border-border"></div>
        <div className="p-1 border-r border-border"></div>
        <div className="p-1 border-r border-border text-center bg-blue-50 dark:bg-blue-950/30">Date</div>
        <div className="p-1 border-r border-border text-center bg-blue-50 dark:bg-blue-950/30">Qty</div>
        <div className="p-1 border-r border-border text-center bg-blue-50 dark:bg-blue-950/30"># Size</div>
        <div className="p-1 border-r border-border text-center bg-green-50 dark:bg-green-950/30">Date</div>
        <div className="p-1 text-center bg-green-50 dark:bg-green-950/30">Qty</div>
        <div className="p-1"></div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[35px_100px_60px_60px_60px_60px_60px_60px_50px] border-x border-b border-border text-xs relative group min-h-[26px]">
          <div className="p-1 border-r border-border text-center">{idx + 1}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "product", "Product")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "batchNo", "Batch")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "planDate", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "planCompletion", "Qty")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "planSize", "Size")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "actualDate", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "actualQty", "Qty")}</div>
          <div className="p-1">{cellInp(idx, "yieldPercent", "%")}</div>
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

      {/* Remarks */}
      <div className="border-x border-b border-border text-xs mt-0">
        <div className="p-1.5 bg-muted/50 font-semibold">Remarks</div>
        <div className="p-2 min-h-[40px]">
          {editMode ? (
            <textarea className="w-full bg-transparent text-xs border-none outline-none min-h-[40px]" value={val(d, "remarks") || ""} onChange={e => onChange?.("remarks", e.target.value)} placeholder="Remarks..." />
          ) : (
            <span className="whitespace-pre-wrap">{val(d, "remarks") || (ph ? "___" : "")}</span>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_2fr] border border-t-2 border-border text-xs">
        <div className="p-1.5 border-r border-border">Prepared By:</div>
        <div className="p-1.5">Updated Based On Progress: {inp("updated_by", "Name")}</div>
      </div>
    </div>
  );
}