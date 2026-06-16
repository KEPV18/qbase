// ============================================================================
// F/32 — R&D Request Form
// DOCX: 17C x 25R — Multi-section: request info, product details, checkboxes,
//   feasibility review, priority, approvals
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F32Props {
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

export function F32Template({ data, isTemplate = true, editMode = false, onChange, className }: F32Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const radio = (key: string, value: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="radio" name={key} className="mx-1" checked={val(d, key) === value} onChange={() => onChange?.(key, value)} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 rounded-full text-center text-[10px]">{val(d, key) === value ? "●" : ""}</span>
      )}
      {label}
    </label>
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
      <textarea className={cn("w-full bg-transparent text-sm p-2 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Ref No + Date */}
      <div className="grid grid-cols-[1fr_1fr] border border-black text-xs">
        <div className="p-1.5 border-r border-black">Ref. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      {/* From/To */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">From 🡪 {inp("from_dept", "Department")}</div>
        <div className="p-1.5">To 🡪 R&amp;D Head</div>
      </div>

      {/* Request type */}
      <div className="border-x border-b border-black text-xs p-1.5">
        <div className="font-semibold mb-1">Request for:</div>
        <div className="flex gap-6">
          {radio("request_type", "new", "New product development")}
          {radio("request_type", "modification", "Modification in existing product")}
        </div>
      </div>

      {/* Product details */}
      <table className="w-full border-collapse border-x border-b border-black text-xs">
        <tbody>
          <tr><td className="border border-black p-1.5 bg-gray-50 w-[45%]">Name of customer</td><td className="border border-black p-1.5">{inp("customer_name", "Customer Name")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50">Name of product</td><td className="border border-black p-1.5">{inp("product_name", "Product Name")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50">Specification / standard</td><td className="border border-black p-1.5">{inp("specification", "Spec / Standard")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50">Product code no. (existing product)</td><td className="border border-black p-1.5">{inp("product_code", "Code No.")}</td></tr>
        </tbody>
      </table>

      {/* Sample enclosed checkboxes */}
      <div className="border-x border-b border-black text-xs p-1.5">
        <div className="font-semibold mb-1">Sample / standard enclosed / name of manufacturer:</div>
        <div className="flex gap-6">
          {chk("sample_yes", "Yes")}
          {chk("sample_no", "No")}
        </div>
        <div className="mt-1">Name of present manufacturer: {inp("manufacturer", "Manufacturer Name")}</div>
      </div>

      <div className="border-x border-b border-black text-xs p-1.5">
        Present market: {inp("present_market", "Market")}
      </div>

      {/* Reason & Details */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Reason for development</div>
        <div className="p-2 min-h-[40px]">{textArea("reason", "Reason...", "min-h-[40px]")}</div>
      </div>
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Design Input details</div>
        <div className="p-2 min-h-[40px]">{textArea("design_input", "Details...", "min-h-[40px]")}</div>
      </div>
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Target completion</div>
        <div className="p-2 min-h-[30px]">{inp("target_completion", "Target date")}</div>
      </div>
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Remarks</div>
        <div className="p-2 min-h-[30px]">{textArea("remarks", "Remarks...", "min-h-[30px]")}</div>
      </div>

      {/* Requested by */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Requested by:</div>
        <div className="p-1.5">Designation &amp; Signature: {inp("requested_designation", "Designation")}</div>
      </div>

      {/* Feasibility review */}
      <div className="border-x border-b border-black text-xs p-1.5 bg-gray-50 font-semibold">
        Feasibility review by Research &amp; Development Head
      </div>

      <div className="border-x border-b border-black text-xs p-1.5">
        <div className="flex gap-6 mb-1">
          {radio("feasibility", "approved", "Approved to process further")}
          {radio("feasibility", "rejected", "Rejected and verbally intimated to requestor")}
        </div>
      </div>

      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Reason for rejection, if any</div>
        <div className="p-2 min-h-[30px]">{textArea("rejection_reason", "Reason...", "min-h-[30px]")}</div>
      </div>

      <div className="border-x border-b border-black text-xs p-1.5">
        Project no. allotted: {inp("project_no", "Project No.")}
      </div>

      {/* Priority */}
      <div className="border-x border-b border-black text-xs p-1.5">
        <div className="font-semibold mb-1">Priority:</div>
        <div className="flex gap-6">
          {radio("priority", "high", "High")}
          {radio("priority", "normal", "Normal")}
          {radio("priority", "routine", "Routine")}
        </div>
      </div>

      <div className="border-x border-b border-black text-xs p-1.5">
        Target completion by R&amp;D: {inp("rd_target", "Target date")}
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">
        Job assigned to: {inp("assigned_to", "Assigned person")}
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">
        Remarks: {inp("rd_remarks", "Remarks")}
      </div>

      {/* Approval */}
      <div className="border border-t-2 border-black text-xs p-1.5">
        Approved by: Research &amp; Development Head — {inp("approved_by", "Name")}
      </div>
    </div>
  );
}