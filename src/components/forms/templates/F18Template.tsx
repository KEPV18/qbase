// ============================================================================
// F/18 — Product Re-Call Report
// WORD: 21 rows × 14 columns
// Row 0: Title merged 0-10, cols 11-13 = rev
// Row 1: Headers (13 cols, col 11 spans 2 for Entry Closed On)
// Rows 2-20: data rows
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F18Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F18Template({ data, isTemplate = true, editMode = false, onChange, className }: F18Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-[10px] leading-tight block">
        {val(d, key) || (ph ? "" : "")}
      </span>
    );

  const cls = "border border-border text-[10px] px-1 py-1 whitespace-nowrap";
  const clsH = cn(cls, "font-semibold bg-muted/50 text-center");

  const COLS = 14;

  return (
    <FormDocument formCode="F/18" formName="Product Re-Call" serial={val(d, "serial")} sectionName="Sales & Customer Service">
      {/* Mobile fallback */}
      <div className="md:hidden space-y-2 text-xs p-2 border border-border rounded-lg">
        <div className="font-bold text-sm">Product Re-Call Report</div>
        <div>Date: {inp("date", "Date")}</div>
        <div>Product: {inp("product_name", "Product")}</div>
        <div>Ref Inward No: {inp("reference_inward_no", "Ref")}</div>
        <div>Qty Taken: {inp("qty_taken", "Qty")}</div>
        <div>Identified By: {inp("products_identified_by", "Name")}</div>
        <div>Status: {inp("status", "Status")}</div>
      </div>

      {/* Desktop table — 14 columns */}
      <div className="w-full overflow-x-auto hidden md:block">
        <table className="w-full border-collapse border border-border text-[10px]" style={{ minWidth: "1100px" }}>
          <tbody>
            {/* Row 0: Title merged 0-10, cols 11-13 */}
            <tr>
              <td colSpan={11} className={cn(cls, "font-bold text-center text-sm bg-primary/5")}>
                Product Re-Call Report
              </td>
              <td colSpan={3} className={cn(cls, "text-right bg-primary/5 whitespace-nowrap")}>
                F/18 Rev No.{val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
              </td>
            </tr>

            {/* Row 1: Headers — 13 logical headers (col 11 spans 2 for Entry Closed On) */}
            <tr>
              <td className={clsH}>Date</td>
              <td className={clsH}>Name Of Products</td>
              <td className={clsH}>Reference Inward No.</td>
              <td className={clsH}>Qty Taken</td>
              <td className={clsH}>Products Identified By</td>
              <td className={clsH}>Released By</td>
              <td className={clsH}>Requested By</td>
              <td className={clsH}>Verified By</td>
              <td className={clsH}>Verified On</td>
              <td className={clsH}>Status</td>
              <td className={clsH} colSpan={2}>Entry Closed On</td>
              <td className={clsH}>Entry Closed By</td>
            </tr>

            {/* Rows 2-20: 19 data rows */}
            {Array.from({ length: 19 }).map((_, i) => (
              <tr key={i}>
                <td className={cls}>{inp(`row${i}_date`, "Date")}</td>
                <td className={cls}>{inp(`row${i}_product_name`, "Product")}</td>
                <td className={cls}>{inp(`row${i}_ref_inward_no`, "Ref No.")}</td>
                <td className={cls}>{inp(`row${i}_qty_taken`, "Qty")}</td>
                <td className={cls}>{inp(`row${i}_identified_by`, "Identified By")}</td>
                <td className={cls}>{inp(`row${i}_released_by`, "Released By")}</td>
                <td className={cls}>{inp(`row${i}_requested_by`, "Requested By")}</td>
                <td className={cls}>{inp(`row${i}_verified_by`, "Verified By")}</td>
                <td className={cls}>{inp(`row${i}_verified_on`, "Verified On")}</td>
                <td className={cls}>{inp(`row${i}_status`, "Status")}</td>
                <td className={cls} colSpan={2}>{inp(`row${i}_entry_closed_on`, "Closed On")}</td>
                <td className={cls}>{inp(`row${i}_entry_closed_by`, "Closed By")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
