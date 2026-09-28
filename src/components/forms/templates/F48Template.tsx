// ============================================================================
// F/48 — Internal Audit Report
// DOCX: 7 rows × 3 columns
// R0: TYPE OF AUDIT | DATE OF AUDIT | AUDIT REPORT NO: {serial}
// R1: AUDIT TEAM | AUDIT STANDARD | AUDIT LOCATION
// R2: AUDIT SCOPE | AUDITEE | empty
// R3: Summary Report (merged 3 cols)
// R4: value row (merged 3 cols)
// R5: Audit Findings (NCs) (merged 3 cols)
// R6: value row (merged 3 cols)
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F48Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F48Template({ data, isTemplate = true, editMode = false, onChange, className }: F48Props) {
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

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[100px]") =>
    editMode ? (
      <textarea
        className="w-full min-h-[100px] bg-transparent text-sm p-1 border-none outline-none resize-y"
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className="whitespace-pre-wrap min-h-[60px] text-sm p-1">
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  return (
    <FormDocument formCode="F/48" formName="Internal Audit Report" serial={val(d, "serial")} sectionName="Quality & Audit">
      <table className="w-full border-collapse border border-border text-sm">
        <tbody>
          {/* Row 0: TYPE | DATE | REPORT NO */}
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50 w-1/3">TYPE OF AUDIT:</td>
            <td className="border border-border p-2 w-1/3">
              {editMode ? (
                <select
                  className="w-full bg-transparent text-sm"
                  value={val(d, "audit_type")}
                  onChange={e => onChange?.("audit_type", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Second Party">Second Party</option>
                </select>
              ) : (
                <span>{val(d, "audit_type") || (ph ? "___" : "")}</span>
              )}
            </td>
            <td className="border border-border p-2 font-semibold bg-muted/50 w-1/3">
              DATE OF AUDIT: {inp("date_of_audit", "Date", "w-28")}
            </td>
          </tr>

          {/* Row 1: TEAM | STANDARD | LOCATION */}
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">AUDIT TEAM:</td>
            <td className="border border-border p-2 font-semibold bg-muted/50">AUDIT STANDARD:</td>
            <td className="border border-border p-2 font-semibold bg-muted/50">AUDIT LOCATION:</td>
          </tr>
          <tr>
            <td className="border border-border p-2">{inp("audit_team", "Team members")}</td>
            <td className="border border-border p-2">{inp("audit_standard", "ISO 9001:2015")}</td>
            <td className="border border-border p-2">{inp("audit_location", "Location")}</td>
          </tr>

          {/* Row 2: SCOPE | AUDITEE | empty */}
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50">AUDIT SCOPE:</td>
            <td className="border border-border p-2 font-semibold bg-muted/50">AUDITEE:</td>
            <td className="border border-border p-2"></td>
          </tr>
          <tr>
            <td className="border border-border p-2">{inp("audit_scope", "Scope of audit")}</td>
            <td className="border border-border p-2">{inp("auditee", "Auditee")}</td>
            <td className="border border-border p-2"></td>
          </tr>

          {/* Row 3: Summary Report header (merged 3 cols) */}
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={3}>
              AUDIT REPORT NO: {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
            </td>
          </tr>

          {/* Row 4: Summary Report value (merged 3 cols) */}
          <tr>
            <td className="border border-border p-2" colSpan={3}>
              <div className="font-semibold mb-1">Summary Report:</div>
              {textArea("summary_report", "Enter summary report...")}
            </td>
          </tr>

          {/* Row 5: Audit Findings header (merged 3 cols) */}
          <tr>
            <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={3}>
              Audit Findings (NCs):
            </td>
          </tr>

          {/* Row 6: Audit Findings value (merged 3 cols) */}
          <tr>
            <td className="border border-border p-2" colSpan={3}>
              {textArea("audit_findings", "Enter audit findings...")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Follow-up and Signature footer */}
      <div className="border border-border border-t-0 p-2 text-xs space-y-1">
        <div className="grid grid-cols-2 gap-4">
          <div>FOLLOW-UP AUDIT REQUIRED: {inp("followup_required", "Yes/No")}</div>
          <div>DATE OF FOLLOW UP AUDIT: {inp("followup_date", "Date")}</div>
        </div>
        <div className="text-center pt-2">
          SIGNATURE<br />
          (Auditor) {inp("auditor_signature", "Name", "w-48")}
        </div>
      </div>
    </FormDocument>
  );
}
