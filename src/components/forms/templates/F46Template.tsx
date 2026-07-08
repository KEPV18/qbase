// ============================================================================
// F/46 — Management of Change Plan
// DOCX: 6 tables. Multi-section form.
// Paragraphs: Reference No, Date Prepared, Requested by, Designation, Dept, Location
// T0: Description of Proposed Change (2 rows × 1 col)
// T1: Reason + Signature + Approval (5 rows × 2 cols)
// T2: Type of Proposed Change checkboxes (2 rows × 1 col)
// T3: Change Priority + Change Impact checkboxes (4 rows × 1 col)
// T4: Resources Required + Top Management Decision (6 rows × 4 cols)
// T5: Implementation and Follow-Up (4 rows × 1 col)
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F46Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const CHANGE_TYPES = [
  "Business Change", "Process Change", "Organizational Change",
  "Technology Change", "Regulatory Change", "Other",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const IMPACT_OPTIONS = ["Low", "Medium", "High", "Critical"];

export function F46Template({ data, isTemplate = true, editMode = false, onChange, className }: F46Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[80px]") =>
    editMode ? (
      <textarea
        className={cn("w-full bg-transparent text-sm p-2 border-none outline-none resize-y", minH)}
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className={cn("whitespace-pre-wrap text-sm p-2", minH)}>
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  const checkbox = (groupKey: string, option: string) => {
    const current = val(d, groupKey);
    if (editMode) {
      return (
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="radio"
            name={groupKey}
            className="w-3 h-3"
            checked={current === option}
            onChange={() => onChange?.(groupKey, option)}
          />
          {option}
        </label>
      );
    }
    const checked = current === option;
    return (
      <span className="text-xs">
        {checked ? "☑" : "☐"} {option}
      </span>
    );
  };

  return (
    <FormDocument formCode="F/46" formName="Management of Change Plan" serial={val(d, "serial")} sectionName="Management & Documentation">
      {/* Paragraphs before tables */}
      <div className="border border-border p-3 text-sm space-y-1 mb-2">
        <div className="grid grid-cols-2 gap-4">
          <div>Reference No.: {inp("serial", "F/46-001", "w-32")}</div>
          <div>Date Prepared: {inp("date", "Date", "w-28")}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>Requested by: {inp("requested_by", "Name", "w-36")}</div>
          <div>Designation: {inp("designation", "Designation", "w-36")}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>Department: {inp("department", "Department", "w-36")}</div>
          <div>Location: {inp("location", "Location", "w-36")}</div>
        </div>
      </div>

      {/* Table 0: Description of Proposed Change — 2 rows × 1 col */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">
              Description of the Proposed Change:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 min-h-[80px]">
              {textArea("description", "Describe the proposed change...")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Table 1: Reason + Signature + Approval — 5 rows × 2 cols */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={2}>
              Reason for the Proposed Change:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 min-h-[60px]" colSpan={2}>
              {textArea("reason", "Enter reason...", "min-h-[60px]")}
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2" colSpan={2}>
              Requestor Signature: {inp("requestor_signature", "Name", "w-40")}
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={2}>
              Approval:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">Approved By: {inp("approved_by", "Name", "w-40")}</td>
            <td className="border border-border p-2">Date: {inp("approval_date", "Date", "w-28")}</td>
          </tr>
        </tbody>
      </table>

      {/* Table 2: Type of Proposed Change — 2 rows × 1 col */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">
              Type of Proposed Change:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">
              <div className="flex flex-wrap gap-4">
                {CHANGE_TYPES.map(opt => checkbox("change_type", opt))}
              </div>
              {val(d, "change_type") === "Other" && (
                <div className="mt-1">
                  Other (specify): {inp("change_type_other", "Specify", "w-48")}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Table 3: Change Priority + Change Impact — 4 rows × 1 col */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">
              Change Priority:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">
              <div className="flex flex-wrap gap-4">
                {PRIORITY_OPTIONS.map(opt => checkbox("priority", opt))}
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">
              Change Impact:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">
              <div className="flex flex-wrap gap-4">
                {IMPACT_OPTIONS.map(opt => checkbox("impact", opt))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Table 4: Resources Required + Top Management Decision — 6 rows × 4 cols */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={4}>
              Resources Required:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 min-h-[60px]" colSpan={4}>
              {textArea("resources", "List resources needed...", "min-h-[60px]")}
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={4}>
              Top Management Decision:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2" colSpan={4}>
              <div className="flex flex-wrap gap-4">
                {["Approved", "Rejected", "Deferred", "Conditional"].map(opt => checkbox("approval_status", opt))}
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">Approved By: {inp("top_mgmt_approved_by", "Name", "w-32")}</td>
            <td className="border border-border p-2">Target Date: {inp("implementation_date", "Date", "w-28")}</td>
            <td className="border border-border p-2">Signature: {inp("top_mgmt_signature", "Name", "w-32")}</td>
            <td className="border border-border p-2">Date: {inp("top_mgmt_date", "Date", "w-28")}</td>
          </tr>
          <tr>
            <td className="border border-border p-2" colSpan={4}>
              Comments: {inp("top_mgmt_comments", "Comments", "w-full")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Table 5: Implementation and Follow-Up — 4 rows × 1 col */}
      <table className="w-full border-collapse border border-border text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">
              Implementation and Follow-Up:
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2 min-h-[60px]">
              {textArea("implementation", "Describe implementation plan...", "min-h-[60px]")}
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">
              <div className="grid grid-cols-2 gap-4">
                <div>1st Follow up on: {inp("follow_up_date", "Date", "w-28")}</div>
                <div>Actual Completion Date: {inp("actual_completion_date", "Date", "w-28")}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-border p-2">
              <div className="grid grid-cols-2 gap-4">
                <div>Verified By: {inp("verified_by", "Name", "w-36")}</div>
                <div>Verification Date: {inp("verification_date", "Date", "w-28")}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>
  );
}
