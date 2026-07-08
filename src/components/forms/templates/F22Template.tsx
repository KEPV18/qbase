// ============================================================================
// F/22 — Corrective Action Report
// WORD: 19 rows × 8 columns
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F22Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

function nestedBool(data: Record<string, unknown> | undefined, parent: string, child: string): boolean {
  if (!data) return false;
  const parentObj = data[parent];
  if (!parentObj || typeof parentObj !== "object") return false;
  const v = (parentObj as Record<string, unknown>)[child];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "on";
  return false;
}

const NC_SOURCES = [
  "Raw-Material",
  "Handling",
  "Manufacturing",
  "InProcess",
  "Final Inspection",
  "Customer Complaints",
  "Internal Quality Audit",
  "Others",
];

export function F22Template({ data, isTemplate = true, editMode = false, onChange, className }: F22Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[11px] px-1 border-none outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-[11px] leading-tight block min-w-[3rem]">
        {val(d, key) || (ph ? "" : "")}
      </span>
    );

  const txtArea = (key: string, placeholder: string, minH: string = "min-h-[40px]") =>
    editMode ? (
      <textarea
        className={cn("w-full bg-transparent text-[11px] px-1 border-none outline-none resize-none", minH)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className={cn("whitespace-pre-wrap text-[11px] leading-relaxed min-h-[20px]")}>
        {val(d, key) || (ph ? "" : "")}
      </div>
    );

  const chk = (src: string) => {
    const checked = nestedBool(d, "nc_sources", src);
    return editMode ? (
      <input
        type="checkbox"
        className="mr-1"
        checked={checked}
        onChange={e => {
          const current = (d.nc_sources as Record<string, unknown>) || {};
          onChange?.("nc_sources", { ...current, [src]: e.target.checked });
        }}
      />
    ) : (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-foreground/30 align-middle mr-1 text-[9px]">
        {checked ? "✓" : ""}
      </span>
    );
  };

  const cls = "border border-border text-[11px] px-1.5 py-1";
  const clsH = cn(cls, "font-semibold bg-muted/50");

  return (
    <FormDocument formCode="F/22" formName="Corrective Action" serial={val(d, "serial")} sectionName="Quality & Audit">
      {/* Mobile fallback */}
      <div className="md:hidden space-y-2 text-xs p-2 border border-border rounded-lg">
        <div className="font-bold text-sm">Corrective Action Report</div>
        <div>Sr. No: {val(d, "sr_no")}</div>
        <div>Date: {inp("date", "Date")}</div>
        <div>Department: {inp("department", "Dept")}</div>
        <div>Description: {txtArea("description", "Description")}</div>
        <div>Root Cause: {txtArea("root_cause", "Root Cause")}</div>
        <div>Corrective Action: {txtArea("immediate_action", "Action")}</div>
        <div>Prevent Recurrence: {txtArea("prevent_recurrence", "Prevention")}</div>
        <div>Target Date: {inp("target_date", "Date")}</div>
        <div>Responsibility: {inp("responsibility", "Name")}</div>
        <div>Verified By: {inp("verified_by", "Name")}</div>
        <div>Reviewed By: {inp("reviewed_by", "Name")}</div>
        <div>Approved By: {inp("approved_by", "Name")}</div>
      </div>

      {/* Desktop table — 8 columns */}
      <table className="w-full border-collapse border border-border text-[11px] hidden md:table">
        <tbody>
          {/* Row 0: Title merged 0-6, col 7 = rev */}
          <tr>
            <td colSpan={7} className={cn(cls, "font-bold text-center text-sm bg-primary/5")}>
              Corrective Action Report
            </td>
            <td className={cn(cls, "text-right bg-primary/5 whitespace-nowrap")}>
              F/22 Rev No.{val(d, "sr_no") || (ph ? "{{SERIAL}}" : "")} Page 1 of 1
            </td>
          </tr>

          {/* Row 1: Sr. No. cols 0-3, Date cols 4-7 */}
          <tr>
            <td colSpan={4} className={cls}>
              Sr. No. → {val(d, "sr_no") || (ph ? "{{SERIAL}}" : "")}
            </td>
            <td colSpan={4} className={cls}>
              Date → {inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* Row 2: Department merged 0-7 */}
          <tr>
            <td colSpan={8} className={cls}>
              Department → {inp("department", "Department Name")}
            </td>
          </tr>

          {/* Row 3: Non-conformities Identified During merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Non-conformities Identified During
            </td>
          </tr>

          {/* Row 4: Checkboxes */}
          <tr>
            <td colSpan={8} className={cls}>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {NC_SOURCES.map(src => (
                  <label key={src} className="flex items-center text-[11px] cursor-pointer">
                    {chk(src)}
                    <span>{src}</span>
                  </label>
                ))}
              </div>
            </td>
          </tr>

          {/* Row 5: Description Of Non-Conformity merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Description Of Non-Conformity
            </td>
          </tr>

          {/* Row 6: value */}
          <tr>
            <td colSpan={8} className={cls}>
              {txtArea("description", "Describe the non-conformity...")}
            </td>
          </tr>

          {/* Row 7: Immediate Corrective Action merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Immediate Corrective Action
            </td>
          </tr>

          {/* Row 8: value */}
          <tr>
            <td colSpan={8} className={cls}>
              {txtArea("immediate_action", "Immediate corrective action taken...")}
            </td>
          </tr>

          {/* Row 9: Root Cause Analysis merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Root Cause Analysis
            </td>
          </tr>

          {/* Row 10: value */}
          <tr>
            <td colSpan={8} className={cls}>
              {txtArea("root_cause", "Root cause analysis...")}
            </td>
          </tr>

          {/* Row 11: Corrective Action To Prevent Recurrence merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Corrective Action To Prevent Recurrence
            </td>
          </tr>

          {/* Row 12: value */}
          <tr>
            <td colSpan={8} className={cls}>
              {txtArea("prevent_recurrence", "Action to prevent recurrence...")}
            </td>
          </tr>

          {/* Row 13: Target Date | Responsibility */}
          <tr>
            <td colSpan={4} className={cn(clsH)}>
              Target Date
            </td>
            <td colSpan={4} className={cn(clsH)}>
              Responsibility
            </td>
          </tr>

          {/* Row 14: value */}
          <tr>
            <td colSpan={4} className={cls}>
              {inp("target_date", "DD/MM/YYYY")}
            </td>
            <td colSpan={4} className={cls}>
              {inp("responsibility", "Responsible Person")}
            </td>
          </tr>

          {/* Row 15: Verification Of Effectiveness merged 0-7 */}
          <tr>
            <td colSpan={8} className={cn(clsH)}>
              Verification Of Effectiveness
            </td>
          </tr>

          {/* Row 16: value */}
          <tr>
            <td colSpan={8} className={cls}>
              {txtArea("verification_status", "Verification results...")}
            </td>
          </tr>

          {/* Row 17: Reviewed By | Approved By */}
          <tr>
            <td colSpan={4} className={cn(clsH)}>
              Reviewed By
            </td>
            <td colSpan={4} className={cn(clsH)}>
              Approved By
            </td>
          </tr>

          {/* Row 18: value */}
          <tr>
            <td colSpan={4} className={cls}>
              {inp("reviewed_by", "Reviewer Name")}
            </td>
            <td colSpan={4} className={cls}>
              {inp("approved_by", "Approver Name")}
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>
  );
}
