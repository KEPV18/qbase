// ============================================================================
// F/34 — Design Verification Report
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F34Props {
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

export function F34Template({ data, isTemplate = true, editMode = false, onChange, className }: F34Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[80px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      <div className="flex justify-between items-end border-b border-black pb-2">
        <div className="text-left text-xs text-muted-foreground">F/34</div>
        <div className="text-center font-bold text-base">Design Verification Report</div>
        <div className="text-right text-xs">Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] border border-black text-xs mt-2">
        <div className="p-1.5 border-r border-b border-black">Project Number 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5 border-b border-black">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      <table className="w-full border-collapse border-x border-black text-xs">
        <tbody>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold w-1/3">Name Of Product</td><td className="border border-black p-1.5">{inp("product_name", "Product Name")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Input Requirements</td><td className="border border-black p-1.5">{inp("input_requirements", "Requirements")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Output Observed</td><td className="border border-black p-1.5">{inp("output_observed", "Observations")}</td></tr>
        </tbody>
      </table>

      <div className="border-x border-b border-black mt-0">
        <div className="p-1.5 bg-gray-50 font-semibold text-xs">Verification Details:</div>
        <div className="p-2 min-h-[80px]">{textArea("verification_details", "Enter verification details...")}</div>
      </div>

      <div className="border-x border-b border-black mt-0">
        <div className="p-1.5 bg-gray-50 font-semibold text-xs">Verification Result:</div>
        <div className="p-2 min-h-[60px]">{textArea("verification_result", "Pass/Fail details...", "min-h-[60px]")}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Verified By: {inp("verified_by", "Name")}</div>
        <div className="p-1.5">Approved By: {inp("approved_by", "Name")}</div>
      </div>
    </div>
  );
}