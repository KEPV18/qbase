// ============================================================================
// F/18 — Product Re-Call Report
// Canonical 12-field schema:
//   date, product_name, reference_inward_no, qty_taken,
//   products_identified_by, released_by, requested_by,
//   verified_by, verified_on, status, entry_closed_on, entry_closed_by
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

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Product Re-Call Report</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">F/18 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* Date */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Date: {inp("date", "Date", "w-28")}</div>
        <div className="p-1.5" />
      </div>

      {/* Product Details Table */}
      <table className="w-full border-collapse border-x border-b border-border text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="border border-border p-1.5 w-1/3">Parameter</th>
            <th className="border border-border p-1.5">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Name of Product</td>
            <td className="border border-border p-1.5">{inp("product_name", "Product Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Reference Inward No.</td>
            <td className="border border-border p-1.5">{inp("reference_inward_no", "Reference No.")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Qty. Taken</td>
            <td className="border border-border p-1.5">{inp("qty_taken", "Qty")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Products Identified By</td>
            <td className="border border-border p-1.5">{inp("products_identified_by", "Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Released By</td>
            <td className="border border-border p-1.5">{inp("released_by", "Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Requested By</td>
            <td className="border border-border p-1.5">{inp("requested_by", "Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Verified By</td>
            <td className="border border-border p-1.5">{inp("verified_by", "Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Verified On</td>
            <td className="border border-border p-1.5">{inp("verified_on", "Date")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Status</td>
            <td className="border border-border p-1.5">{inp("status", "Status")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Entry Closed On</td>
            <td className="border border-border p-1.5">{inp("entry_closed_on", "Date")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Entry Closed By</td>
            <td className="border border-border p-1.5">{inp("entry_closed_by", "Name")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
