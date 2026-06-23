// ============================================================================
// F/18 — Product Re-Call Report
// HORIZONTAL 12-COLUMN TABLE (logging matrix, NOT vertical profile)
// Columns: Date | Name Of Products | Reference Inward No. | Qty Taken
//          | Products Identified By | Released By | Requested By
//          | Verified By | Verified On | Status | Entry Closed On
//          | Entry Closed By
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F18Props {
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

export function F18Template({ data, isTemplate = true, editMode = false, onChange, className }: F18Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[11px] px-1 border-none outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className="text-[11px] leading-tight block min-w-[4rem]">{val(d, key) || (ph ? "—" : "")}</span>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Product Re-Call Report</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">F/18 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* 12-Column Horizontal Table */}
      <div className="w-full overflow-x-auto border-x border-b border-border rounded-xl">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[80px]">Date</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[120px]">Name Of Products</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[120px]">Reference Inward No.</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[80px]">Qty Taken</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[120px]">Products Identified By</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[100px]">Released By</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[100px]">Requested By</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[100px]">Verified By</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[80px]">Verified On</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[120px]">Status</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[90px]">Entry Closed On</th>
              <th className="border border-border p-1.5 text-[11px] font-semibold whitespace-nowrap min-w-[120px]">Entry Closed By</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-1.5">{inp("date", "Date")}</td>
              <td className="border border-border p-1.5">{inp("product_name", "Product Name")}</td>
              <td className="border border-border p-1.5">{inp("reference_inward_no", "Ref No.")}</td>
              <td className="border border-border p-1.5">{inp("qty_taken", "Qty")}</td>
              <td className="border border-border p-1.5">{inp("products_identified_by", "Identified By")}</td>
              <td className="border border-border p-1.5">{inp("released_by", "Released By")}</td>
              <td className="border border-border p-1.5">{inp("requested_by", "Requested By")}</td>
              <td className="border border-border p-1.5">{inp("verified_by", "Verified By")}</td>
              <td className="border border-border p-1.5">{inp("verified_on", "Verified On")}</td>
              <td className="border border-border p-1.5">{inp("status", "Status")}</td>
              <td className="border border-border p-1.5">{inp("entry_closed_on", "Closed On")}</td>
              <td className="border border-border p-1.5">{inp("entry_closed_by", "Closed By")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
