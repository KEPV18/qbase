// ============================================================================
// F/44 — Job Description
// WORD: 3R × 3C — Position/ReportsTo, Responsibilities, Delegation
// ============================================================================

import React from "react";
import { FormDocument, val } from "../FormKit";

export interface F44Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F44Template({ data, isTemplate = true, editMode = false, onChange, className }: F44Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-sm px-1 border-none outline-none"
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-sm px-1">{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, label: string, minH: string = "min-h-[120px]") =>
    editMode ? (
      <textarea className={`w-full ${minH} bg-transparent text-xs p-1 border-none outline-none resize-y`}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <div className={`whitespace-pre-wrap ${minH} text-xs px-1`}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  const signedDocUrl = val(d, "signed_document_url");

  return (
    <FormDocument formCode="F/44" formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training">
      {/* Signed Document Link */}
      {signedDocUrl && (
        <div className="mx-6 mt-4 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-xs flex items-center gap-2">
          <span className="font-semibold">Signed Document:</span>
          <a href={signedDocUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">
            View Signed PDF (Physical Signature)
          </a>
        </div>
      )}

      {/* Employee Name */}
      {val(d, "employee_name") && (
        <div className="mx-6 mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Employee:</span> {val(d, "employee_name")}
        </div>
      )}

      {/* ── 3-col table matching Word structure ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <colgroup><col /><col /><col /></colgroup>
          <tbody>
            {/* Row 0: Position | Reports To | empty */}
            <tr>
              <td className="border border-border p-2 font-semibold bg-muted/50" style={{ width: "33%" }}>
                Position → {inp("position", "Position")}
              </td>
              <td className="border border-border p-2 font-semibold bg-muted/50" style={{ width: "33%" }}>
                Reports To → {inp("reports_to", "Reports To")}
              </td>
              <td className="border border-border p-2 bg-muted/50" style={{ width: "34%" }}></td>
            </tr>
            {/* Row 1: Responsibilities (merged 3 cols) */}
            <tr>
              <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={3}>
                Write here Responsibilities of Person.
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2" colSpan={3}>
                {textArea("responsibilities", "Enter responsibilities...")}
              </td>
            </tr>
            {/* Row 2: Delegation (merged 3 cols) */}
            <tr>
              <td className="border border-border p-2 font-semibold bg-muted/50" colSpan={3}>
                Delegation Of Duties During Absence (Indicate Position Title):{"\n"}
                Authorities –{"\n"}
                Responsibilities –
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2" colSpan={3}>
                {textArea("delegation", "Enter delegation details...", "min-h-[80px]")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Approved By */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs px-6">
        <div>Approved By: {inp("approved_by", "Name")}</div>
      </div>
    </FormDocument>
  );
}
