// ============================================================================
// F/22 — Corrective Action Report
// DOCX: Complex form with checkboxes for NC source, root cause analysis,
// corrective actions, and verification.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F22Props {
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

const NC_SOURCES = [
  "Raw-Material Inspection and Testing",
  "Inprocess Inspection & Testing",
  "Manufacturing",
  "Final Inspection and Testing",
  "Handling of Customer Complaints",
  "Internal Quality Audit",
  "Others",
];

export function F22Template({ data, isTemplate = true, editMode = false, onChange, className }: F22Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const chk = (key: string) => editMode ? (
    <input type="checkbox" className="mx-1" checked={val(d, key) === "true" || val(d, key) === "on"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
  ) : (
    <span className="inline-block w-4 h-4 border border-foreground/30 align-middle mx-1 text-center text-[10px]">
      {(val(d, key) === "true" || val(d, key) === "on") ? "✓" : ""}
    </span>
  );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Corrective Action Report</div>
        <div className="p-2 border-l border-black bg-primary/5 text-center text-xs">
          F/22 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}<br />Page 1 of 1
        </div>
      </div>

      {/* Sr No / Date / Department */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-36")}</div>
      </div>
      <div className="grid grid-cols-[1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Department 🡪 {inp("department", "Department", "w-64")}</div>
      </div>

      {/* NC Source checkboxes */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 font-semibold bg-gray-50">Non-conformities Identified During:</div>
        <div className="grid grid-cols-2 gap-1 p-1.5">
          {NC_SOURCES.map((source, i) => (
            <div key={i} className="flex items-center gap-1">
              {chk(`nc_source_${i}`)}
              <span>{source}</span>
              {source === "Inprocess Inspection & Testing" && <span className="text-[10px]">({inp("inprocess_specify", "specify", "w-20")})</span>}
              {source === "Others" && <span className="text-[10px]">({inp("others_specify", "specify", "w-20")})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Non-conformity Description */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 font-semibold bg-gray-50">Description of Non-conformity:</div>
        <div className="p-1.5 min-h-[60px]">
          {editMode ? (
            <textarea className="w-full min-h-[60px] bg-transparent text-xs p-1" value={val(d, "nc_description") || ""} onChange={e => onChange?.("nc_description", e.target.value)} placeholder="Describe the non-conformity..." />
          ) : (
            <div className="whitespace-pre-wrap">{val(d, "nc_description") || (ph ? "___" : "")}</div>
          )}
        </div>
      </div>

      {/* Root Cause Analysis */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 font-semibold bg-gray-50">Root Cause Analysis:</div>
        <div className="p-1.5 min-h-[60px]">
          {editMode ? (
            <textarea className="w-full min-h-[60px] bg-transparent text-xs p-1" value={val(d, "root_cause") || ""} onChange={e => onChange?.("root_cause", e.target.value)} placeholder="Analyze root cause..." />
          ) : (
            <div className="whitespace-pre-wrap">{val(d, "root_cause") || (ph ? "___" : "")}</div>
          )}
        </div>
      </div>

      {/* Corrective Action */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 font-semibold bg-gray-50">Corrective Action:</div>
        <div className="p-1.5 min-h-[60px]">
          {editMode ? (
            <textarea className="w-full min-h-[60px] bg-transparent text-xs p-1" value={val(d, "corrective_action") || ""} onChange={e => onChange?.("corrective_action", e.target.value)} placeholder="Describe corrective action taken..." />
          ) : (
            <div className="whitespace-pre-wrap">{val(d, "corrective_action") || (ph ? "___" : "")}</div>
          )}
        </div>
      </div>

      {/* Verification */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Responsible: {inp("responsible", "Person")}</div>
        <div className="p-1.5">Target Date: {inp("target_date", "Date", "w-28")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Verification: {inp("verification", "Result")}</div>
        <div className="p-1.5">Verification Date: {inp("verification_date", "Date", "w-28")}</div>
      </div>

      {/* Signature */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Prepared By: {inp("prepared_by", "Name", "w-36")}</div>
        <div>Approved By: {inp("approved_by", "Name", "w-36")}</div>
      </div>
    </div>
  );
}