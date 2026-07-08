// ============================================================================
// F/44 — Job Description (COMPLETE DOCX-Faithful Rebuild)
// Two render modes:
//   1. PDF mode: If signed_document_url exists, embed PDF inline (iframe)
//   2. Text mode: Word-style form with employee info, responsibilities, delegation
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, ExternalLink, Download } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F44Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const FC = "F/44";

export function F44Template({ data, isTemplate = true, editMode = false, onChange, className }: F44Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-sm px-1 border-b border-dashed border-foreground/40 outline-none"
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-sm px-1 border-b border-dashed border-foreground/30 inline-block min-w-[4rem]">
        {val(d, key) || (ph ? "___" : "—")}
      </span>
    );

  const textArea = (key: string, _label: string, minH = "min-h-[120px]") =>
    editMode ? (
      <textarea className={cn(`w-full ${minH} bg-transparent text-xs p-1 border border-dashed border-foreground/40 rounded resize-y outline-none`)}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} />
    ) : (
      <div className={cn(`whitespace-pre-wrap ${minH} text-xs px-1 leading-relaxed text-foreground`)}>
        {val(d, key) || (ph ? "" : "—")}
      </div>
    );

  const signedDocUrl = val(d, "signed_document_url");

  // ── PDF MODE: embed PDF inline ──
  if (signedDocUrl && !editMode) {
    // Extract filename for display
    const fileName = signedDocUrl.split('/').pop()?.replace(/%2F/g, '/').replace(/%20/g, ' ') || 'Signed Document';

    return (
      <FormDocument formCode={FC} formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
        <div className="p-4 space-y-4">
          {/* PDF header bar */}
          <div className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-border">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <div>
                <div className="text-sm font-bold text-foreground">Signed Job Description — PDF</div>
                <div className="text-xs text-muted-foreground">
                  {val(d, "employee_name") || "—"} — {val(d, "position") || val(d, "job_title") || "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={signedDocUrl} download
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                <Download size={12} /> Download
              </a>
              <a href={signedDocUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                <ExternalLink size={12} /> Open
              </a>
            </div>
          </div>

          {/* Embedded PDF viewer */}
          <div className="w-full rounded-md border border-border overflow-hidden bg-muted/20">
            <object data={signedDocUrl} type="application/pdf" className="w-full" style={{ height: "800px" }}>
              <iframe src={signedDocUrl} className="w-full" style={{ height: "800px", border: "none" }}
                title="Signed Job Description PDF">
                <p className="p-4 text-sm text-muted-foreground text-center">
                  Your browser does not support inline PDFs. 
                  <a href={signedDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">
                    Click here to view the PDF
                  </a>
                </p>
              </iframe>
            </object>
          </div>

          {/* Metadata footer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="border border-border rounded p-2 bg-muted/10">
              <div className="text-muted-foreground mb-0.5">Employee</div>
              <div className="font-semibold text-foreground">{val(d, "employee_name") || "—"}</div>
            </div>
            <div className="border border-border rounded p-2 bg-muted/10">
              <div className="text-muted-foreground mb-0.5">Position</div>
              <div className="font-semibold text-foreground">{val(d, "position") || val(d, "job_title") || "—"}</div>
            </div>
            <div className="border border-border rounded p-2 bg-muted/10">
              <div className="text-muted-foreground mb-0.5">Department</div>
              <div className="font-semibold text-foreground">{val(d, "department") || "—"}</div>
            </div>
            <div className="border border-border rounded p-2 bg-muted/10">
              <div className="text-muted-foreground mb-0.5">Date</div>
              <div className="font-semibold text-foreground">{val(d, "date") || "—"}</div>
            </div>
          </div>
        </div>
      </FormDocument>
    );
  }

  // ── PDF link in edit mode (can't embed in edit) ──
  if (signedDocUrl && editMode) {
    return (
      <FormDocument formCode={FC} formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-border">
            <FileText size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Signed Document (PDF):</span>
            <a href={signedDocUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary underline hover:opacity-80">{signedDocUrl.split('/').pop()}</a>
          </div>
        </div>
      </FormDocument>
    );
  }

  // ── TEXT MODE: Word-style form ──
  const th = "border border-border p-1.5 text-[10px] font-semibold bg-muted";
  const tc = "border border-border p-1.5 text-[11px]";

  return (
    <FormDocument formCode={FC} formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      {/* ── Header ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Job Description</td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs font-semibold whitespace-nowrap">
                F/44 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Employee Info Grid ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className={th + " w-[15%]"}>Sr. No.</td>
              <td className={tc + " w-[35%]"}>{val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</td>
              <td className={th + " w-[15%]"}>Date</td>
              <td className={tc + " w-[35%]"}>{val(d, "date") || (ph ? "___" : "—")}</td>
            </tr>
            <tr>
              <td className={th}>Employee Name</td>
              <td className={tc}>{inp("employee_name", "Employee Name")}</td>
              <td className={th}>Employee ID</td>
              <td className={tc}>{inp("employee_id", "ID")}</td>
            </tr>
            <tr>
              <td className={th}>Job Title</td>
              <td className={tc}>{inp("job_title", "Job Title")}</td>
              <td className={th}>Department</td>
              <td className={tc}>{inp("department", "Department")}</td>
            </tr>
            <tr>
              <td className={th}>Reports To</td>
              <td className={tc}>{inp("reports_to", "Reports To")}</td>
              <td className={th}>Position</td>
              <td className={tc}>{inp("position", "Position")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Responsibilities ── */}
      <div className="mt-1">
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="bg-muted px-3 py-2">
            <span className="text-xs font-bold text-foreground">Key Responsibilities & Authorities</span>
          </div>
          <div className="p-3">
            {textArea("responsibilities", "Responsibilities", "min-h-[200px]")}
          </div>
        </div>
      </div>

      {/* ── Feedback / Notes ── */}
      {val(d, "feedback") && val(d, "feedback") !== "Document" && (
        <div className="mt-1">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="bg-muted px-3 py-2">
              <span className="text-xs font-bold text-foreground">Feedback / Remarks</span>
            </div>
            <div className="p-3">
              {textArea("feedback", "Feedback", "min-h-[80px]")}
            </div>
          </div>
        </div>
      )}

      {/* ── Reason for Leaving (if applicable) ── */}
      {val(d, "reason_for_leaving") && (
        <div className="mt-1">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="bg-muted px-3 py-2">
              <span className="text-xs font-bold text-foreground">Reason for Leaving</span>
            </div>
            <div className="p-3">
              {textArea("reason_for_leaving", "Reason", "min-h-[60px]")}
            </div>
          </div>
        </div>
      )}

      {/* ── Signatures ── */}
      <div className="mt-1">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-semibold w-1/3">Prepared By</td>
              <td className="border border-border p-2 w-1/6">{val(d, "prepared_by") || (ph ? "___" : "—")}</td>
              <td className="border border-border p-2 font-semibold w-1/6">Approved By</td>
              <td className="border border-border p-2 w-1/6">{val(d, "approved_by") || (ph ? "___" : "—")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}