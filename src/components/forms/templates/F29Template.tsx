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

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, User, GraduationCap, Award, CheckCircle2, ClipboardCheck, FileSignature } from "lucide-react";
import { FormDocument, val, InfoCard, SectionDivider, StatBadge } from "../FormKit";

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
  training1: string;
  training2: string;
  training3: string;
  training4: string;
  training5: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return [];
}

// Training status legend
const STATUS_ITEMS = [
  { key: "training_identified", label: "Training Is Identified", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { key: "training_given", label: "Training Is Given", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "training_effective", label: "Training Is Effective", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  { key: "training_not_required", label: "Training Not Required", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800" },
];

// Training topics given (sub-table)
interface TrainingGivenRow {
  srNo: string;
  topicNo: string;
  reviewedBy: string;
}

function parseTrainingGiven(d: Record<string, unknown>): TrainingGivenRow[] {
  const raw = d.training_given_items || d.trainingTopics || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as TrainingGivenRow[];
  return [];
}

export function F29Template({ data, isTemplate = true, editMode = false, onChange, className }: F29Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const rows = useMemo(() => parseRows(d), [d]);
  const trainingGivenRows = useMemo(() => parseTrainingGiven(d), [d]);

  // Training status
  const trainingStatus = (d.training_status && typeof d.training_status === "object" ? d.training_status : d.result && typeof d.result === "object" ? d.result : {}) as Record<string, string>;

  const inp = (key: string, label: string, width = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-amber-400 dark:border-amber-700 bg-transparent text-[12px] font-semibold px-1 outline-none", width)}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-amber-300 dark:border-amber-700 px-1 inline-block min-w-[4rem] text-[12px] font-semibold", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const FC = "F/29";

  return (
    <FormDocument formCode={FC} formName="Employee Training & Competence Record Sheet" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      <div className="p-6 space-y-4">
        {/* ── Annual Assessment Info ── */}
        <InfoCard formCode={FC} variant="tinted" icon={<Award size={14} />} title="Annual Assessment">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Assessed By</span>
                <span className="text-[12px] font-semibold text-foreground">{val(d, "assessed_by") || "Top Management"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Assessed On</span>
                {inp("assessed_on", "Date")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Training Type / Course</span>
                <span className="text-[12px] font-semibold text-foreground truncate">{val(d, "training_type") || val(d, "course_name")}</span>
              </div>
            </div>
          </div>
        </InfoCard>

        {/* ── Employee Info ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Employee Name</span>
            <span className="text-[12px] font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 pb-0.5">{val(d, "employee_name") || "\u00A0"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Employee ID</span>
            <span className="text-[12px] font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 pb-0.5">{val(d, "employee_id") || "\u00A0"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Department</span>
            <span className="text-[12px] font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 pb-0.5">{val(d, "department") || "\u00A0"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Trainer</span>
            <span className="text-[12px] font-semibold text-foreground border-b border-dashed border-amber-300 dark:border-amber-700 pb-0.5">{val(d, "trainer") || "\u00A0"}</span>
          </div>
        </div>

        {/* ── Competence Matrix Table ── */}
        <SectionDivider formCode={FC} title="Competence & Training Matrix" icon={<CheckCircle2 size={14} />} />

        {/* Desktop: horizontal scroll table matching DOCX */}
        <div className="w-full overflow-x-auto border border-border rounded-md">
          <table className="w-full border-collapse text-[10px]" style={{ minWidth: "900px" }}>
            <thead>
              {/* Header row 1 */}
              <tr className="bg-amber-50 dark:bg-amber-950/30">
                <th className="border border-border px-1.5 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase" rowSpan={2} style={{ width: "35px" }}>Sr. No.</th>
                <th className="border border-border px-1.5 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase" rowSpan={2}>Name Of Employee & Designation</th>
                <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={2}>Qualification</th>
                <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={2}>Experience</th>
                <th className="border border-border px-1.5 py-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase" rowSpan={2} style={{ width: "60px" }}>Skill Avail.</th>
                <th className="border border-border px-1.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" colSpan={5}>Type Of Training (Topic No.)</th>
              </tr>
              {/* Header row 2 */}
              <tr className="bg-amber-50 dark:bg-amber-950/30">
                <th className="border border-border px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center">Req.</th>
                <th className="border border-border px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center">Avail.</th>
                <th className="border border-border px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center">Req.</th>
                <th className="border border-border px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center">Avail.</th>
                <th className="border border-border px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "30px" }}>1</th>
                <th className="border border-border px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "30px" }}>2</th>
                <th className="border border-border px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "30px" }}>3</th>
                <th className="border border-border px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "30px" }}>4</th>
                <th className="border border-border px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center" style={{ width: "30px" }}>5</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="border border-border px-1.5 py-1 text-center text-foreground">{row.srNo || idx + 1}</td>
                  <td className="border border-border px-1.5 py-1 text-foreground">
                    <span className="font-semibold">{row.name}</span>
                    {row.designation && <span className="text-muted-foreground text-[9px] ml-1">({row.designation})</span>}
                  </td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.qualReq || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.qualAvail || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.expReq || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.expAvail || ""}</td>
                  <td className="border border-border px-1 py-1 text-center text-foreground">{row.skillAvail || ""}</td>
                  {[1, 2, 3, 4, 5].map(n => {
                    const v = (row as Record<string, string>)[`training${n}`];
                    return (
                      <td key={n} className="border border-border px-1 py-1 text-center">
                        {v === "☑" || v === "✓" ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">☑</span>
                        ) : v ? (
                          <span className="text-foreground">{v}</span>
                        ) : ""}
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={13} className="border border-border px-2 py-4 text-center text-muted-foreground text-[10px] italic">
                    No competence records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Training Status Legend ── */}
        <SectionDivider formCode={FC} title="Training Status" icon={<CheckCircle2 size={14} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_ITEMS.map(item => {
            const checked = trainingStatus[item.key] === "☑" || trainingStatus[item.key] === "✓" || trainingStatus[item.key] === "true";
            return (
              <div key={item.key} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-[11px]",
                checked ? cn(item.bg, item.border) : "border-border bg-muted/10",
              )}>
                <span className={cn(
                  "inline-flex items-center justify-center w-4 h-4 border rounded text-[10px] font-bold shrink-0",
                  checked ? cn(item.color, "border-current") : "border-border text-muted-foreground",
                )}>
                  {checked ? "☑" : ""}
                </span>
                <span className={cn("font-medium", checked ? item.color : "text-muted-foreground")}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Type Of Training Given ── */}
        <SectionDivider formCode={FC} title="Type Of Training Given" icon={<FileSignature size={14} />} />
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-amber-50 dark:bg-amber-950/30">
                <th className="border border-border px-2 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" style={{ width: "50px" }}>Sr. No.</th>
                <th className="border border-border px-2 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase text-center" style={{ width: "80px" }}>Topic No.</th>
                <th className="border border-border px-2 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">Reviewed By — Authorised Person</th>
              </tr>
            </thead>
            <tbody>
              {trainingGivenRows.length > 0 ? trainingGivenRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="border border-border px-2 py-1 text-center text-foreground">{row.srNo || idx + 1}</td>
                  <td className="border border-border px-2 py-1 text-center text-foreground">{row.topicNo}</td>
                  <td className="border border-border px-2 py-1 text-foreground">{row.reviewedBy}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="border border-border px-2 py-3 text-center text-muted-foreground text-[10px] italic">
                    No training topics recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Note ── */}
        <div className="px-4 py-2.5 rounded-md bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-200">
          <span className="font-bold">Note:</span> Req. Means Min. Required, Avail. Means Available. Skill Should Be Required Min. As Per E/HRD/01
        </div>

        {/* ── Review of competence ── */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Review of employees competence on</span>
          {inp("training_date", "Date", "w-32")}
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
              <span className="text-[12px] font-semibold text-foreground">{val(d, "authorised_by") || "\u00A0"}</span>
            </div>
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Authorised By</p>
          </div>
        </div>
      </div>
    </FormDocument>
  );
}