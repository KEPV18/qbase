// ============================================================================
// F/44 — Job Description (COMPLETE DOCX-Faithful Rebuild)
// Two render modes:
//   1. PDF mode: If signed_document_url exists, embed PDF inline (iframe)
//   2. Text mode: Word-style form with employee info, structured responsibilities
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, ExternalLink, Download, User, Building, Calendar, Briefcase } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F44Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const FC = "F/44";

// ── Parse responsibilities text into structured sections ──
interface RespSection {
  heading: string;
  tag: string; // "PRIMARY OWNER", "OVERSIGHT", etc.
  items: string[];
  isPlain: boolean; // for sections like Qualifications, KPIs (no bullet items)
}

function parseResponsibilities(raw: string): RespSection[] {
  if (!raw) return [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Section heading patterns: "Category (Clause X) — TAG" or "Category — TAG"
  const headingRe = /^(.+?)(?:\s*\(Clause[^)]*\))?\s*[—–-]\s*(.+)$/;
  // Non-clause headings: "Qualifications & Requirements", "Key Performance Indicators (KPIs)", etc.
  // NOTE: Employee Name/Signature/Date are NOT headings — they're signature fields
  const plainHeadingRe = /^(Qualifications|Key Performance|Financial & Risk)/i;

  const sections: RespSection[] = [];
  let current: RespSection | null = null;

  for (const line of lines) {
    // Check if this line is a section heading
    const clauseMatch = line.match(headingRe);
    const isPlainHeading = plainHeadingRe.test(line);
    // A heading is a line where the next lines are detail items (no trailing colon)
    // Heuristic: if line contains "—" and has uppercase tag OR matches plainHeading
    const isHeading = (clauseMatch && clauseMatch[2] && (
      clauseMatch[2].includes('OWNER') ||
      clauseMatch[2].includes('OVERSIGHT') ||
      clauseMatch[2].includes('PRIMARY') ||
      clauseMatch[2].includes('INTERIM')
    )) || isPlainHeading;

    if (isHeading) {
      // Save previous section
      if (current) sections.push(current);

      if (clauseMatch && !isPlainHeading) {
        current = {
          heading: clauseMatch[1].trim(),
          tag: clauseMatch[2].trim(),
          items: [],
          isPlain: false,
        };
      } else {
        current = {
          heading: line,
          tag: '',
          items: [],
          isPlain: true,
        };
      }
    } else {
      // This is a detail item
      if (!current) {
        // Orphan item before any heading — create a default section
        current = { heading: 'General', tag: '', items: [], isPlain: false };
      }

      // Lines starting with "Employee Name:" or "Date:" or "Employee Signature:" are signature fields
      if (/^(Employee Name|Employee Signature|Date)\s*:/i.test(line)) {
        current.items.push(line);
      } else {
        current.items.push(line);
      }
    }
  }
  if (current) sections.push(current);

  return sections;
}

export function F44Template({ data, isTemplate = true, editMode = false, onChange, className }: F44Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const signedDocUrl = val(d, "signed_document_url");

  // ── PDF MODE: embed PDF inline ──
  if (signedDocUrl && !editMode) {
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
            {[
              { icon: User, label: 'Employee', value: val(d, "employee_name") },
              { icon: Briefcase, label: 'Position', value: val(d, "position") || val(d, "job_title") },
              { icon: Building, label: 'Department', value: val(d, "department") },
              { icon: Calendar, label: 'Date', value: val(d, "date") },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="border border-border rounded p-2 bg-muted/10">
                <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                  <Icon size={11} /> {label}
                </div>
                <div className="font-semibold text-foreground">{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </FormDocument>
    );
  }

  // ── PDF link in edit mode ──
  if (signedDocUrl && editMode) {
    return (
      <FormDocument formCode={FC} formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
        <div className="p-4">
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

  // ── TEXT MODE: Word-style structured form ──
  const th = "border border-border p-1.5 text-[10px] font-semibold bg-muted";
  const tc = "border border-border p-1.5 text-[11px]";

  const respRaw = val(d, "responsibilities") || "";
  const sections = parseResponsibilities(respRaw);

  // Separate signature-related items from the last sections
  const signatureItems: string[] = [];
  const filteredSections = sections.map(s => {
    const sigItems = s.items.filter(i => /^(Employee Name|Employee Signature|Date)\s*:/i.test(i));
    if (sigItems.length > 0) {
      signatureItems.push(...sigItems);
      return { ...s, items: s.items.filter(i => !sigItems.includes(i)) };
    }
    return s;
  }).filter(s => s.items.length > 0 || s.isPlain);

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
              <td className={tc}>{val(d, "employee_name") || (ph ? "___" : "—")}</td>
              <td className={th}>Employee ID</td>
              <td className={tc}>{val(d, "employee_id") || (ph ? "___" : "—")}</td>
            </tr>
            <tr>
              <td className={th}>Job Title</td>
              <td className={tc}>{val(d, "job_title") || (ph ? "___" : "—")}</td>
              <td className={th}>Department</td>
              <td className={tc}>{val(d, "department") || (ph ? "___" : "—")}</td>
            </tr>
            <tr>
              <td className={th}>Reports To</td>
              <td className={tc}>{val(d, "reports_to") || (ph ? "___" : "—")}</td>
              <td className={th}>Position</td>
              <td className={tc}>{val(d, "position") || (ph ? "___" : "—")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Responsibilities — Structured sections ── */}
      <div className="mt-2">
        <div className="border border-border rounded-sm overflow-hidden">
          {/* Section header bar */}
          <div className="bg-primary/10 px-3 py-2 border-b border-border">
            <span className="text-xs font-bold text-foreground tracking-wide uppercase">Key Responsibilities & Authorities</span>
          </div>

          {/* Sections */}
          <div className="divide-y divide-border">
            {filteredSections.map((section, idx) => (
              <div key={idx} className="p-3">
                {/* Section heading */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[11px] font-bold text-foreground">{section.heading}</span>
                  {section.tag && (
                    <span className={cn(
                      "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                      section.tag.includes('PRIMARY') ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {section.tag}
                    </span>
                  )}
                  {section.isPlain && !section.tag && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      Details
                    </span>
                  )}
                </div>
                {/* Section items as bullet list */}
                <ul className="space-y-1 ml-1">
                  {section.items.map((item, i) => {
                    // Signature lines
                    if (/^Employee Name\s*:/i.test(item)) {
                      return (
                        <li key={i} className="text-[11px] mt-3 flex items-center gap-2">
                          <span className="font-semibold text-foreground">{item.split(':')[0]}:</span>
                          <span className="text-muted-foreground">{item.split(':').slice(1).join(':').trim() || '_______________________'}</span>
                        </li>
                      );
                    }
                    if (/^Employee Signature\s*:/i.test(item)) {
                      return (
                        <li key={i} className="text-[11px] flex items-center gap-2">
                          <span className="font-semibold text-foreground">{item.split(':')[0]}:</span>
                          <span className="text-muted-foreground">{item.split(':').slice(1).join(':').trim() || '_______________________'}</span>
                        </li>
                      );
                    }
                    if (/^Date\s*:/i.test(item)) {
                      return (
                        <li key={i} className="text-[11px] flex items-center gap-2">
                          <span className="font-semibold text-foreground">{item.split(':')[0]}:</span>
                          <span className="text-muted-foreground">{item.split(':').slice(1).join(':').trim() || '_______________________'}</span>
                        </li>
                      );
                    }
                    // KPI items with ":" get special formatting
                    if (item.includes(':') && !item.includes('Clause')) {
                      const [k, ...v] = item.split(':');
                      return (
                        <li key={i} className="text-[11px] flex items-start gap-1.5 leading-relaxed">
                          <span className="text-muted-foreground shrink-0">▸</span>
                          <span><span className="font-semibold text-foreground">{k}:</span> <span className="text-muted-foreground">{v.join(':').trim()}</span></span>
                        </li>
                      );
                    }
                    // Regular bullet
                    return (
                      <li key={i} className="text-[11px] flex items-start gap-1.5 leading-relaxed">
                        <span className="text-muted-foreground shrink-0">▸</span>
                        <span className="text-foreground/90">{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feedback / Remarks ── */}
      {val(d, "feedback") && val(d, "feedback") !== "Document" && (
        <div className="mt-2">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Feedback / Remarks</span>
            </div>
            <div className="p-3 text-[11px] whitespace-pre-wrap leading-relaxed">
              {val(d, "feedback")}
            </div>
          </div>
        </div>
      )}

      {/* ── Reason for Leaving ── */}
      {val(d, "reason_for_leaving") && (
        <div className="mt-2">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Reason for Leaving</span>
            </div>
            <div className="p-3 text-[11px] whitespace-pre-wrap leading-relaxed">
              {val(d, "reason_for_leaving")}
            </div>
          </div>
        </div>
      )}

      {/* ── Signatures ── */}
      <div className="mt-2">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-semibold w-1/4">Prepared By</td>
              <td className="border border-border p-2 w-1/4">{val(d, "prepared_by") || (ph ? "___" : "—")}</td>
              <td className="border border-border p-2 font-semibold w-1/4">Approved By</td>
              <td className="border border-border p-2 w-1/4">{val(d, "approved_by") || (ph ? "___" : "—")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}