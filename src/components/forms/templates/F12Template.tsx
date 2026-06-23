// ============================================================================
// F/12 — Disposal of Non-Conforming Products
// DOCX: 1 table, 13 cells per row (some merged).
// Column layout (13 cells, 0-indexed):
//   0=Sr.No | 1=Date | 2=Stage | 3=Product | 4=Id.No |
//   5-6=Reason(merged, colspan=2) | 7=Qty | 8=DisposalAction |
//   9-10=Re-Inspection(merged, colspan=2) | 11=Qty.OK | 12=Signature
//
// Renders as a proper HTML <table> with colspan for merged cells.
// NO "Department" field — the DOCX has no such field.
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
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto] border border-border text-xs">
        <div className="col-span-1 p-2 font-bold bg-primary/5 flex items-center text-base">
          Disposal of Non-Conforming Products
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}<br />
          F/12 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Top info row — NO "Department" field (DOCX has no such field) */}
      <div className="border-x border-b border-border text-xs p-1.5">
        Month 🡪 {inp("month", "Month")}
      </div>

      {/* ==================================================================
          PROPER HTML <table> WITH colspan FOR MERGED CELLS
          Matches DOCX 13-cell layout exactly:
          
          Header: Sr.No | Date | Stage | Name of Product | Id. No.
                  | Reason for Nonconformity(colspan=2) | Qty.
                  | Disposal Action Taken
                  | Re-Inspection, If Any(colspan=2) | Qty. OK
                  | Sign. Of Authorised Person
          
          Data rows: same 13-cell layout with reason(colspan=2)
                     and reInspection(colspan=2)
          ================================================================== */}
      <table className="w-full border-collapse border-x border-b border-border text-xs">
        <thead>
          <tr className="bg-muted font-semibold text-[10px]">
            <th className="border-r border-b border-border p-1 text-center w-[30px]">Sr. No</th>
            <th className="border-r border-b border-border p-1 text-center w-[65px]">Date</th>
            <th className="border-r border-b border-border p-1 text-center w-[60px]">Stage</th>
            <th className="border-r border-b border-border p-1 text-left">Name of Product</th>
            <th className="border-r border-b border-border p-1 text-center w-[60px]">Id. No.</th>
            <th colSpan={2} className="border-r border-b border-border p-1 text-left">Reason for Nonconformity</th>
            <th className="border-r border-b border-border p-1 text-center w-[45px]">Qty.</th>
            <th className="border-r border-b border-border p-1 text-left">Disposal Action Taken</th>
            <th colSpan={2} className="border-r border-b border-border p-1 text-center">Re-Inspection, If Any</th>
            <th className="border-r border-b border-border p-1 text-center w-[45px]">Qty. OK</th>
            <th className="border-b border-border p-1 text-center w-[70px]">Sign. Of Authorised Person</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-background dark:bg-[#1e1d1a]" : "bg-muted/30"}>
              <td className="border-r border-b border-border p-1 text-center text-muted-foreground">{idx + 1}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "date", "Date")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "stage", "Stage")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "productName", "Product")}</td>
              <td className="border-r border-b border-border p-1 text-center">{cellInp(idx, "idNo", "ID No")}</td>
              <td colSpan={2} className="border-r border-b border-border p-1">{cellInp(idx, "reason", "Reason")}</td>
              <td className="border-r border-b border-border p-1 text-center">{cellInp(idx, "qty", "Qty")}</td>
              <td className="border-r border-b border-border p-1">{cellInp(idx, "disposalAction", "Action")}</td>
              <td colSpan={2} className="border-r border-b border-border p-1 text-center">{cellInp(idx, "reInspection", "Re-Insp")}</td>
              <td className="border-r border-b border-border p-1 text-center">{cellInp(idx, "qtyOk", "OK")}</td>
              <td className="border-b border-border p-1 text-center">{cellInp(idx, "signature", "Sign")}</td>
              {editMode && rows.length > 1 && (
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

      {editMode && (
        <button onClick={addRow} className="w-full border-x border-b border-border py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Authorised Signature footer — NOT a data column, just a footer */}
      <div className="border-x border-b border-border p-2 text-xs flex justify-end">
        <span className="font-semibold mr-2">Authorised Signature - Functional Head:</span>
        <span className="border-b border-dashed border-foreground/30 px-2">
          {val(d, "authorised_signature") || (ph ? "_____________" : "")}
        </span>
      </div>
    </div>
  );
}
