// ============================================================================
// F/29 — Employee Training & Competence Record Sheet
// DOCX: 22 rows × 34 cols — wide horizontal matrix
// Structure:
//   R0-R1: Title + Annual Assessment Done By/On (Top Management) + Rev No
//   R2-R3: Column headers (Sr.No | Name & Designation | Qual Req/Avail | Exp Req/Avail | Skill | Training Topics 1-15)
//   R4-R11: Data rows (employees with topic checkboxes)
//   R12: Training Status legend (Identified / Given / Effective / Not Required)
//   R13-R19: Type Of Training Given (Sr.No | Topic No. | Reviewed By Authorised Person)
//   R20: Note about Req./Avail.
//   R21: Review of employees competence on
// ============================================================================

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F29Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

interface RowData {
  srNo: string;
  name: string;
  designation: string;
  qualReq: string;
  qualAvail: string;
  expReq: string;
  expAvail: string;
  skillAvail: string;
  [key: string]: string; // training1..training15
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items || d.rows || [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as RowData[];
    } catch { /* ignore */ }
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return [];
}

// Training status legend — matching DOCX order
const STATUS_ITEMS = [
  { key: "training_identified", label: "Training Is Identified" },
  { key: "training_given", label: "Training Is Given" },
  { key: "training_effective", label: "Training Is Effective" },
  { key: "training_not_required", label: "Training Not Required" },
];

const FC = "F/29";
const NUM_TOPICS = 15;

export function F29Template({ data, isTemplate = true, editMode = false, onChange, className }: F29Props) {
  const d = data ?? {};
  const rows = useMemo(() => parseRows(d), [d]);

  // Training status — check both training_status and result objects
  const trainingStatus = useMemo(() => {
    const src = (d.training_status && typeof d.training_status === "object" ? d.training_status : d.result && typeof d.result === "object" ? d.result : {}) as Record<string, string>;
    return src;
  }, [d]);

  const inp = (key: string, label: string, width = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-amber-400 dark:border-amber-700 bg-transparent text-[12px] font-semibold px-1 outline-none", width)}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-amber-300 dark:border-amber-700 px-1 inline-block min-w-[4rem] text-[12px] font-semibold", width)}>
        {val(d, key) || (isTemplate ? "___" : "\u00A0")}
      </span>
    );

  const isChecked = (v: string | undefined) => v === "☑" || v === "✓" || v === "✔";

  return (
    <FormDocument formCode={FC} formName="Employee Training & Competence Record Sheet" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      <div className="p-5 space-y-4">
        {/* ── Annual Assessment Header (matches DOCX R0-R1) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Annual Assessment Done By</span>
            <span className="text-[12px] font-bold text-foreground border-b border-dashed border-amber-400 dark:border-amber-700 px-2">{val(d, "assessed_by") || "Top Management"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Annual Assessment Done On</span>
            {inp("assessed_on", "Date", "w-32")}
          </div>
        </div>

        {/* ── Competence & Training Matrix Table (DOCX R2-R11) ── */}
        <div className="w-full overflow-x-auto border border-border rounded-md">
          <table className="w-full border-collapse text-[10px]" style={{ minWidth: "1200px" }}>
            <thead>
              {/* Header row 1 */}
              <tr className="bg-amber-50 dark:bg-amber-950/30">
                <th className="border border-border px-1 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" rowSpan={2} style={{ minWidth: "30px" }}>Sr. No.</th>
                <th className="border border-border px-1 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" rowSpan={2} style={{ minWidth: "120px" }}>Name Of Employee And Designation</th>
                <th className="border border-border px-1 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={2}>Qualification</th>
                <th className="border border-border px-1 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={2}>Experience</th>
                <th className="border border-border px-1 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" rowSpan={2} style={{ minWidth: "50px" }}>Skill Available</th>
                <th className="border border-border px-1 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={NUM_TOPICS}>Type Of Training (Topic No. As Per Training Need Form)</th>
              </tr>
              {/* Header row 2 — Req/Avail + topic numbers 1-15 */}
              <tr className="bg-amber-50 dark:bg-amber-950/30">
                <th className="border border-border px-0.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 text-center">Req.</th>
                <th className="border border-border px-0.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 text-center">Avail.</th>
                <th className="border border-border px-0.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 text-center">Req.</th>
                <th className="border border-border px-0.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 text-center">Avail.</th>
                {Array.from({ length: NUM_TOPICS }, (_, i) => (
                  <th key={i} className="border border-border px-0.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "28px" }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="border border-border px-1 py-1 text-center text-foreground font-semibold">{row.srNo || idx + 1}</td>
                  <td className="border border-border px-1.5 py-1 text-foreground font-semibold whitespace-nowrap">{row.name}{row.designation ? ` ${row.designation}` : ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.qualReq || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.qualAvail || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.expReq || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.expAvail || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.skillAvail || ""}</td>
                  {Array.from({ length: NUM_TOPICS }, (_, i) => {
                    const v = row[`training${i + 1}`];
                    return (
                      <td key={i} className="border border-border px-0.5 py-1 text-center">
                        {isChecked(v) ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">☑</span>
                        ) : (v ? (
                          <span className="text-foreground text-[9px]">{v}</span>
                        ) : null)}
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={7 + NUM_TOPICS} className="border border-border px-2 py-4 text-center text-muted-foreground text-[10px] italic">
                    No competence records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Training Status Legend (DOCX R12) ── */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-md border border-border bg-muted/10">
          {STATUS_ITEMS.map(item => {
            const checked = isChecked(trainingStatus[item.key]);
            return (
              <div key={item.key} className="flex items-center gap-1.5 text-[11px]">
                <span className="text-amber-600 dark:text-amber-400 text-[12px]">→</span>
                <span className={cn("font-medium", checked ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                {checked && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[12px]">☑</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Type Of Training Given (DOCX R13-R19) ── */}
        <div className="px-4 py-3 rounded-md border border-border bg-muted/5 space-y-3">
          {/* Text line: course name + reviewed by + authorised person */}
          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide text-[9px] whitespace-nowrap">Type Of Training Given:</span>
              <span className="font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 flex-1 px-2">
                {val(d, "training_type") || val(d, "course_name") || "\u00A0"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide text-[9px] whitespace-nowrap">Reviewed By:</span>
              <span className="font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 flex-1 px-2">
                {val(d, "trainer") || "\u00A0"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide text-[9px] whitespace-nowrap">Authorised Person:</span>
              <span className="font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 flex-1 px-2">
                {val(d, "authorised_by") || "\u00A0"}
              </span>
            </div>
          </div>

          {/* Sub-table: Sr. No. | Topic No. — 3 column pairs like DOCX */}
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-amber-50 dark:bg-amber-950/30">
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Sr. No.</th>
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Topic No.</th>
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Sr. No.</th>
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Topic No.</th>
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Sr. No.</th>
                  <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center">Topic No.</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground">1</td>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground">T-01</td>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground">2</td>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground"></td>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground">3</td>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Note (DOCX R20) ── */}
        <div className="px-4 py-2.5 rounded-md bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-200">
          <span className="font-bold">Note:</span> Req. Means Min. Required, Avail. Means Available. Skill Should Be Required Min. As Per E/HRD/01
        </div>

        {/* ── Review of competence on (DOCX R21) ── */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Review of employees competence on</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-[12px]">→</span>
          <span className="text-[12px] font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 px-2">
            {val(d, "assessed_on") || "\u00A0"}
          </span>
        </div>

        {/* ── Signatures ── */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-border">
          <div className="flex flex-col">
            <div className="min-h-[28px] border-b border-border pb-1 mb-1">
              <span className="text-[12px] font-semibold text-foreground">{val(d, "prepared_by") || "\u00A0"}</span>
            </div>
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Prepared By</p>
          </div>
          <div className="flex flex-col">
            <div className="min-h-[28px] border-b border-border pb-1 mb-1">
              <span className="text-[12px] font-semibold text-foreground">{val(d, "recorded_by") || "\u00A0"}</span>
            </div>
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Recorded By</p>
          </div>
        </div>
      </div>
    </FormDocument>
  );
}