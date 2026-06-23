// ============================================================================
// F/17 — QA Test Request Slip
// Canonical 17-field schema:
//   request_no, date, from_department, to_department, sample_qty,
//   product_name, stage_of_test, version_build_no, qty_received,
//   batch_no_lot_no, challan_no_date, batch_size, test_results[],
//   status, requested_by, received_by, tested_by, approved_by
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F17Props {
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

export function F17Template({ data, isTemplate = true, editMode = false, onChange, className }: F17Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[60px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-1 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  // Parse test_results array
  const rawResults = d.test_results;
  let testResults: { test_required: string; results: string }[] = [];
  if (Array.isArray(rawResults) && rawResults.length > 0) {
    testResults = rawResults as { test_required: string; results: string }[];
  }

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">QA Test Request Slip for Development / Process / Finished Product</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">F/17 Rev No. {val(d, "request_no") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* Request No + Date */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Request No: {val(d, "request_no") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date: {inp("date", "Date", "w-28")}</div>
      </div>

      {/* From / To / Sample Qty */}
      <div className="grid grid-cols-[1fr_1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">From: {inp("from_department", "Department")}</div>
        <div className="p-1.5 border-r border-border">To: {inp("to_department", "QA Dept")}</div>
        <div className="p-1.5">Sample Qty: {inp("sample_qty", "Quantity")}</div>
      </div>

      {/* Product Details Table */}
      <table className="w-full border-collapse border-x border-b border-border text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="border border-border p-1.5 w-1/4">Parameter</th>
            <th className="border border-border p-1.5">Details / Specification</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Name of Product</td>
            <td className="border border-border p-1.5">{inp("product_name", "Product Name")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Stage of Test</td>
            <td className="border border-border p-1.5">{inp("stage_of_test", "Stage")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Version / Build No.</td>
            <td className="border border-border p-1.5">{inp("version_build_no", "Version")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Qty. Received</td>
            <td className="border border-border p-1.5">{inp("qty_received", "Qty")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Batch No. / Lot No.</td>
            <td className="border border-border p-1.5">{inp("batch_no_lot_no", "Batch No.")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Challan No. &amp; Date</td>
            <td className="border border-border p-1.5">{inp("challan_no_date", "Challan No.")}</td>
          </tr>
          <tr>
            <td className="border border-border p-1.5 font-semibold">Batch Size</td>
            <td className="border border-border p-1.5">{inp("batch_size", "Batch Size")}</td>
          </tr>
        </tbody>
      </table>

      {/* Test Results Table */}
      <div className="border-x border-b border-border text-xs">
        <div className="p-1.5 font-semibold bg-muted">Test Results</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 w-1/2">Test Required</th>
              <th className="border border-border p-1.5">Results</th>
            </tr>
          </thead>
          <tbody>
            {testResults.length > 0 ? testResults.map((tr, i) => (
              <tr key={i}>
                <td className="border border-border p-1.5">{tr.test_required}</td>
                <td className="border border-border p-1.5">{tr.results}</td>
              </tr>
            )) : (
              <tr>
                <td className="border border-border p-1.5" colSpan={2}>
                  {ph ? "___" : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Status: {inp("status", "Status")}</div>
        <div className="p-1.5" />
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Requested By: {inp("requested_by", "Name")}</div>
        <div className="p-1.5 border-r border-border">Received By: {inp("received_by", "Name")}</div>
        <div className="p-1.5 border-r border-border">Tested By: {inp("tested_by", "Name")}</div>
        <div className="p-1.5">Approved By: {inp("approved_by", "Name")}</div>
      </div>
    </div>
  );
}
