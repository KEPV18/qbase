// ============================================================================
// F/17 — Sample Test Request Slip
// DOCX: QA test request for development/in-process/finished samples
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

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="checkbox" className="mx-1" checked={val(d, key) === "true"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 text-center text-[10px]">{val(d, key) === "true" ? "✓" : ""}</span>
      )}
      {label}
    </label>
  );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[60px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-1 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      <div className="grid grid-cols-[2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">QA Test Request Slip for Development / Process / Finished Product</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">F/17 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Request No: {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date: {inp("date", "Date", "w-28")}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">From: {inp("request_from", "Department")}</div>
        <div className="p-1.5 border-r border-black">To: {inp("request_to", "QA Dept")}</div>
        <div className="p-1.5">Sample Qty: {inp("sample_qty", "Quantity")}</div>
      </div>

      {/* Sample type */}
      <div className="border-x border-b border-black text-xs p-1.5">
        <div className="font-semibold mb-1">For:</div>
        <div className="flex gap-6">
          {chk("type_incoming", "Incoming Sample")}
          {chk("type_inprocess", "In-Process / Finished Sample")}
        </div>
      </div>

      <table className="w-full border-collapse border-x border-b border-black text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-black p-1.5 w-1/4">Parameter</th>
            <th className="border border-black p-1.5">Details / Specification</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className="border border-black p-1.5 font-semibold">Product Name</td><td className="border border-black p-1.5">{inp("product_name", "Product Name")}</td></tr>
          <tr><td className="border border-black p-1.5 font-semibold">Batch No.</td><td className="border border-black p-1.5">{inp("batch_no", "Batch No.")}</td></tr>
          <tr><td className="border border-black p-1.5 font-semibold">Sample Description</td><td className="border border-black p-1.5">{inp("sample_description", "Description")}</td></tr>
          <tr><td className="border border-black p-1.5 font-semibold">Test Required</td><td className="border border-black p-1.5 min-h-[40px]">{textArea("test_required", "Tests required...", "min-h-[40px]")}</td></tr>
        </tbody>
      </table>

      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Requested By: {inp("requested_by", "Name")}</div>
        <div className="p-1.5">Test Result Reference: {inp("test_result_ref", "Reference")}</div>
      </div>

      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Requested By: {inp("signature_requested", "Name", "w-36")}</div>
        <div>Approved By: {inp("signature_approved", "Name", "w-36")}</div>
      </div>
    </div>
  );
}