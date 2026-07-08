// ============================================================================
// F/46 — Management of Change Plan
// DOCX: 6 tables. Multi-section form with description, reason, type, priority,
// resources, approvals, and follow-up.
// Canonical keys match DB form_data exactly.
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

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[80px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm space-y-4", className)}>
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border pb-2">
        <div className="text-left text-xs text-muted-foreground">F/46</div>
        <div className="text-center font-bold text-base">Management of Change Plan</div>
        <div className="text-right text-xs">Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* Reference + Date */}
      <div className="grid grid-cols-2 gap-4 text-xs border border-border p-2">
        <div>Reference No.: {inp("serial", "F/46-001", "w-32")}</div>
        <div>Date Prepared: {inp("date", "Date", "w-28")}</div>
        <div>Requested by: {inp("requested_by", "Name", "w-36")}</div>
        <div>Designation: {inp("designation", "Designation", "w-36")}</div>
        <div>Department: {inp("department", "Department", "w-36")}</div>
        <div>Location: {inp("location", "Location", "w-36")}</div>
      </div>

      {/* Table 1: Description */}
      <div className="border border-border">
        <div className="p-2 font-semibold bg-muted/50 text-sm">Description of the Proposed Change:</div>
        <div className="p-2 border-t border-border">{textArea("description", "Describe the proposed change...")}</div>
      </div>

      {/* Table 2: Reason + Signature */}
      <div className="border border-border">
        <div className="p-2 font-semibold bg-muted/50 text-sm">Reason for the Proposed Change:</div>
        <div className="p-2 border-t border-border min-h-[60px]">{textArea("reason", "Enter reason...", "min-h-[60px]")}</div>
        <div className="p-2 border-t border-border text-xs">
          Requestor Signature: {inp("designation", "Name", "w-40")}
        </div>
      </div>

      {/* Table 3: Type of Change */}
      <div className="border border-border">
        <div className="p-2 font-semibold bg-muted/50 text-sm">Type of Proposed Change:</div>
        <div className="p-2 border-t border-border text-xs">
          {val(d, "change_type") || (ph ? "Business Change: Workload & escalation process update" : "")}
        </div>
      </div>

      {/* Table 4: Priority + Impact */}
      <div className="border border-border">
        <div className="grid grid-cols-2">
          <div>
            <div className="p-2 font-semibold bg-muted/50 text-sm">Change Priority:</div>
            <div className="p-2 border-t border-border text-xs">
              {val(d, "priority") || (ph ? "High" : "")}
            </div>
          </div>
          <div className="border-l border-border">
            <div className="p-2 font-semibold bg-muted/50 text-sm">Change Impact:</div>
            <div className="p-2 border-t border-border text-xs">
              {val(d, "impact") || (ph ? "High" : "")}
            </div>
          </div>
        </div>
        {val(d, "impact_description") && (
          <div className="p-2 border-t border-border text-xs">
            Description: {val(d, "impact_description")}
          </div>
        )}
      </div>

      {/* Table 5: Resources + Top Management */}
      <div className="border border-border">
        <div className="p-2 font-semibold bg-muted/50 text-sm">Resources Required:</div>
        <div className="p-2 border-t border-border min-h-[60px]">{textArea("resources", "List resources...", "min-h-[60px]")}</div>
        <div className="p-2 border-t border-border font-semibold bg-muted/50 text-sm">Top Management Decision:</div>
        <div className="p-2 border-t border-border text-xs">
          {val(d, "approval_status") || (ph ? "Approved" : "")}
        </div>
        <div className="p-2 border-t border-border text-xs grid grid-cols-3 gap-4">
          <div>Approved By: {inp("approved_by", "Name", "w-32")}</div>
          <div>Target Date: {inp("implementation_date", "Date", "w-28")}</div>
        </div>
      </div>

      {/* Table 6: Implementation */}
      <div className="border border-border">
        <div className="p-2 font-semibold bg-muted/50 text-sm">Implementation and Follow-Up:</div>
        <div className="p-2 border-t border-border text-xs space-y-2">
          {val(d, "follow_up") ? (
            <div className="whitespace-pre-wrap">{val(d, "follow_up")}</div>
          ) : (
            <>
              <div>1st Follow up on: {inp("follow_up", "Date", "w-28")}</div>
              <div>Actual Completion Date: {inp("actual_completion_date", "Date", "w-28")}</div>
            </>
          )}
          <div>Verified By: {inp("verified_by", "Name", "w-36")}</div>
          <div>Verification Date: {inp("verification_date", "Date", "w-28")}</div>
        </div>
        {val(d, "comments") && (
          <div className="p-2 border-t border-border text-xs">
            Comments: {val(d, "comments")}
          </div>
        )}
      </div>
    </div>
  );
}
