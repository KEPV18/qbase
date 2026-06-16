// ============================================================================
// F/48 — Internal Audit Report
// DOCX: 1 table, 7 rows, 3 cols. Contains:
// R0: TYPE OF AUDIT | DATE OF AUDIT | AUDIT REPORT NO. {{SERIAL}}
// R1: AUDIT TEAM | AUDIT STANDARD | AUDIT LOCATION
// R2: AUDIT SCOPE (gs=2) | AUDITEE
// R3: Summary Report (gs=3)
// R4: Audit Findings (NCs) (gs=3)
// R5: FOLLOW-UP REQUIRED + DATE (gs=3)
// R6: SIGNATURE (gs=3)
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F48Props {
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

export function F48Template({ data, isTemplate = true, editMode = false, onChange, className }: F48Props) {
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

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      <table className="w-full border-collapse border border-black text-xs">
        <tbody>
          {/* Row 0: TYPE | DATE | REPORT NO */}
          <tr>
            <td className="border border-black p-2 font-semibold bg-gray-50 w-1/3">TYPE OF AUDIT:</td>
            <td className="border border-black p-2 w-1/3">
              {editMode ? (
                <select className="w-full bg-transparent text-xs" value={val(d, "audit_type")} onChange={e => onChange?.("audit_type", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                  <option value="Supplier">Supplier</option>
                </select>
              ) : (
                val(d, "audit_type") || (ph ? "___" : "")
              )}
            </td>
            <td className="border border-black p-2 font-semibold bg-gray-50 w-1/6">DATE OF AUDIT:</td>
          </tr>
          <tr>
            <td className="border border-black p-2">{inp("audit_type_value", "Type")}</td>
            <td className="border border-black p-2">{inp("date_of_audit", "Date")}</td>
            <td className="border border-black p-2 text-xs">
              AUDIT REPORT NO: {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
            </td>
          </tr>
          {/* Row 1: TEAM | STANDARD | LOCATION */}
          <tr>
            <td className="border border-black p-1.5 font-semibold bg-gray-50">AUDIT TEAM:</td>
            <td className="border border-black p-1.5 font-semibold bg-gray-50">AUDIT STANDARD:</td>
            <td className="border border-black p-1.5 font-semibold bg-gray-50">AUDIT LOCATION:</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5">{inp("audit_team", "Team members")}</td>
            <td className="border border-black p-1.5">{inp("audit_standard", "ISO 9001:2015")}</td>
            <td className="border border-black p-1.5">{inp("audit_location", "Location")}</td>
          </tr>
          {/* Row 2: SCOPE + AUDITEE */}
          <tr>
            <td className="border border-black p-1.5 font-semibold bg-gray-50" colSpan={2}>AUDIT SCOPE:</td>
            <td className="border border-black p-1.5 font-semibold bg-gray-50">AUDITEE:</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5" colSpan={2}>{inp("audit_scope", "Scope of audit")}</td>
            <td className="border border-black p-1.5">{inp("auditee", "Auditee")}</td>
          </tr>
          {/* Summary Report */}
          <tr>
            <td className="border border-black p-1.5 font-semibold bg-gray-50" colSpan={3}>Summary Report:</td>
          </tr>
          <tr>
            <td className="border border-black p-2 min-h-[100px]" colSpan={3}>
              {editMode ? (
                <textarea className="w-full min-h-[100px] bg-transparent text-xs p-1" value={val(d, "summary_report") || ""} onChange={e => onChange?.("summary_report", e.target.value)} placeholder="Enter summary report..." />
              ) : (
                <div className="whitespace-pre-wrap min-h-[60px]">{val(d, "summary_report") || (ph ? "___" : "")}</div>
              )}
            </td>
          </tr>
          {/* Audit Findings */}
          <tr>
            <td className="border border-black p-1.5 font-semibold bg-gray-50" colSpan={3}>Audit Findings (NCs):</td>
          </tr>
          <tr>
            <td className="border border-black p-2 min-h-[100px]" colSpan={3}>
              {editMode ? (
                <textarea className="w-full min-h-[100px] bg-transparent text-xs p-1" value={val(d, "audit_findings") || ""} onChange={e => onChange?.("audit_findings", e.target.value)} placeholder="Enter audit findings..." />
              ) : (
                <div className="whitespace-pre-wrap min-h-[60px]">{val(d, "audit_findings") || (ph ? "___" : "")}</div>
              )}
            </td>
          </tr>
          {/* Follow-up */}
          <tr>
            <td className="border border-black p-2" colSpan={3}>
              <div className="space-y-1">
                <div>FOLLOW-UP AUDIT REQUIRED: {inp("followup_required", "Yes/No")}</div>
                <div>DATE OF FOLLOW UP AUDIT: {inp("followup_date", "Date")}</div>
              </div>
            </td>
          </tr>
          {/* Signature */}
          <tr>
            <td className="border border-black p-2" colSpan={3}>
              <div className="text-center">
                SIGNATURE<br/><br/>
                (Auditor) {inp("auditor_signature", "Name", "w-48")}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}