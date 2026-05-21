// ============================================================================
// F/12 — Disposal of Non-Conforming Products
// DOCX: 1 table, 10 rows, 13 cols. Header row + column headers + 7 data rows
// + signature row. Columns: Sr. No | Date | Stage | Name of Product | Id. No. |
// Reason for Nonconformity | Qty. | Disposal Action Taken | Re-Inspection |
// Qty. OK | Sign. Of Authorised Person
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F12Props {
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
  srNo: string; date: string; stage: string; productName: string;
  idNo: string; reason: string; qty: string; disposalAction: string;
  reInspection: string; qtyOk: string; signature: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as RowData[];
  }
  return [{ srNo: "1", date: "", stage: "", productName: "", idNo: "", reason: "", qty: "", disposalAction: "", reInspection: "", qtyOk: "", signature: "" }];
}

export function F12Template({ data, isTemplate = true, editMode = false, onChange, className }: F12Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    // Also push to parent via onChange
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { srNo: String(prev.length + 1), date: "", stage: "", productName: "", idNo: "", reason: "", qty: "", disposalAction: "", reInspection: "", qtyOk: "", signature: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, srNo: String(i + 1) })));
  }, []);

  const inp = (key: string, label: string, width: string = "w-36") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || (ph ? "" : "")}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto] border border-black text-xs">
        <div className="col-span-1 p-2 font-bold bg-primary/5 flex items-center text-base">
          Disposal of Non-Conforming Products
        </div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}<br />
          F/12 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Top info row */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Department 🡪 {inp("department", "Department")}</div>
        <div className="p-1.5">Month 🡪 {inp("month", "Month")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_70px_60px_1fr_70px_1.2fr_50px_1fr_70px_50px_80px] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Sr. No</div>
        <div className="p-1 border-r border-black">Date</div>
        <div className="p-1 border-r border-black">Stage</div>
        <div className="p-1 border-r border-black">Name of Product</div>
        <div className="p-1 border-r border-black">Id. No.</div>
        <div className="p-1 border-r border-black col-span-2">Reason for Nonconformity</div>
        <div className="p-1 border-r border-black">Qty.</div>
        <div className="p-1 border-r border-black">Disposal Action Taken</div>
        <div className="p-1 border-r border-black">Re-Inspection, If Any</div>
        <div className="p-1 border-r border-black">Qty. OK</div>
        <div className="p-1">Sign. Of Authorised Person</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[40px_70px_60px_1fr_70px_1.2fr_50px_1fr_70px_50px_80px] border-x border-b border-black text-xs relative group">
          <div className="p-1 border-r border-black text-center">{idx + 1}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "date", "Date")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "stage", "Stage")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "productName", "Product")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "idNo", "ID No")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "reason", "Reason")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "qty", "Qty")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "disposalAction", "Action")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "reInspection", "Re-Insp")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "qtyOk", "OK")}</div>
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

      {/* Approved By */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Authorised Signature - Functional Head: {inp("authorised_signature", "Sign")}</div>
      </div>
    </div>
  );
}