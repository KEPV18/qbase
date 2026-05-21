// ============================================================================
// F/46 — Management of Change Plan
// DOCX: 6 tables. Multi-section form with description, reason, type, priority,
// resources, approvals, and follow-up.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F46Props {
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

export function F46Template({ data, isTemplate = true, editMode = false, onChange, className }: F46Props) {
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

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="checkbox" className="mx-1" checked={val(d, key) === "true"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 align-middle text-center text-[10px]">
          {val(d, key) === "true" ? "✓" : ""}
        </span>
      )}
      {label}
    </label>
  );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[80px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm space-y-4", className)}>
      {/* Header */}
      <div className="flex justify-between items-end border-b border-black pb-2">
        <div className="text-left text-xs text-muted-foreground">F/46</div>
        <div className="text-center font-bold text-base">Management of Change Plan</div>
        <div className="text-right text-xs">Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* Table 1: Description */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Description of the Proposed Change:</div>
        <div className="p-2 border-t border-black">{textArea("change_description", "Describe the proposed change...")}</div>
      </div>

      {/* Table 2: Reason + Signature */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Reason for the Proposed Change:</div>
        <div className="p-2 border-t border-black min-h-[60px]">{textArea("change_reason", "Enter reason...", "min-h-[60px]")}</div>
        <div className="p-2 border-t border-black text-xs">
          Requestor Signature: {inp("requestor_signature", "Name", "w-40")}
        </div>
      </div>

      {/* Table 2: Initial Approval */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Initial Approval</div>
        <div className="p-2 border-t border-black flex gap-6">
          {chk("change_accepted", "Proposed Change is Accepted")}
          {chk("change_rejected", "Proposed Change is Rejected")}
        </div>
        <div className="p-2 border-t border-black text-xs">
          Remarks: {inp("approval_remarks", "Remarks", "w-full")}
        </div>
      </div>

      {/* Table 3: Type of Change */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Type of Proposed Change:</div>
        <div className="p-2 border-t border-black text-xs space-y-1">
          <div className="flex flex-wrap gap-4">
            {chk("type_organizational", "Organizational Structural Change")}
            {chk("type_process", "Process Change")}
            {chk("type_document", "Document Change")}
            {chk("type_resource", "Resource Change")}
            {chk("type_other", "Other")}
          </div>
          {editMode && val(d, "type_other") === "true" && (
            <div className="mt-1">Specify: {inp("type_other_specify", "Specify change type", "w-64")}</div>
          )}
        </div>
      </div>

      {/* Table 4: Priority + Impact */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Change Priority:</div>
        <div className="p-2 border-t border-black flex gap-4 text-xs">
          {chk("priority_urgent", "Urgent")}
          {chk("priority_high", "High")}
          {chk("priority_medium", "Medium")}
          {chk("priority_low", "Low")}
        </div>
        <div className="p-2 border-t border-black font-semibold bg-gray-50 text-sm">Change Impact:</div>
        <div className="p-2 border-t border-black flex gap-4 text-xs">
          {chk("impact_extreme", "Extreme")}
          {chk("impact_high", "High")}
          {chk("impact_moderate", "Moderate")}
          {chk("impact_low", "Low")}
        </div>
      </div>

      {/* Table 5: Resources + Top Management */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Resources Required:</div>
        <div className="p-2 border-t border-black min-h-[60px]">{textArea("resources_required", "List resources...", "min-h-[60px]")}</div>
        <div className="p-2 border-t border-black font-semibold bg-gray-50 text-sm">Top Management Decision:</div>
        <div className="p-2 border-t border-black flex gap-6 text-xs">
          {chk("management_approved", "Approved")}
          {chk("management_rejected", "Rejected")}
        </div>
        <div className="p-2 border-t border-black text-sm">Responsibility:</div>
        <div className="p-2 border-b border-black text-xs grid grid-cols-3 gap-4">
          <div>Name: {inp("responsible_name", "Name", "w-32")}</div>
          <div>Designation: {inp("responsible_designation", "Designation", "w-32")}</div>
          <div>Target Date: {inp("target_date", "Date", "w-28")}</div>
        </div>
      </div>

      {/* Table 6: Implementation */}
      <div className="border border-black">
        <div className="p-2 font-semibold bg-gray-50 text-sm">Implementation and Follow-Up:</div>
        <div className="p-2 border-t border-black text-xs space-y-2">
          <div>1st Follow up on: {inp("followup_date_1", "Date", "w-28")}</div>
          <div>2nd Follow up on: {inp("followup_date_2", "Date", "w-28")}</div>
          <div>Actual Completion Date: {inp("completion_date", "Date", "w-28")}</div>
          <div>Verified By: {inp("verified_by", "Name", "w-36")}</div>
        </div>
      </div>
    </div>
  );
}