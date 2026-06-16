// ============================================================================
// F/30 — Performance Appraisal Report
// DOCX: 10C x 39R — Employee info + 11 evaluation criteria + totals + conclusion
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F30Props {
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

// Evaluation criteria sections
const EVAL_SECTIONS = [
  { num: "1", title: "Follow-Up Of Job Timings", items: ["Follow-Up Of Job Timings"] },
  { num: "2", title: "Working Style", items: [
    "Positive Attitude", "Work Involvement", "Learning Attitude",
    "Work Allotment To The Next Employee", "Co-Ordination With The Next Employee",
    "Motivation Of The Next Employee", "Speed Of Work",
  ]},
  { num: "3", title: "Innovativeness", items: [
    "Any Development Is Done", "Any Cost Effective Measures Implemented",
    "Any Control Established On Expenses",
  ]},
  { num: "4", title: "Improvements Compare To Last Year", items: ["Improvements Compare To Last Year"] },
  { num: "5", title: "Spare Time Utilisation", items: [
    "Any Achievement During The Year", "Responsibility Sharing",
  ]},
  { num: "6", title: "Follow Up Of The Instructions", items: ["Follow Up Of The Instructions"] },
  { num: "7", title: "Knowledge Of The Job Handled", items: ["Knowledge Of The Job Handled"] },
  { num: "8", title: "Knowledge Of The Process", items: ["Knowledge Of The Process"] },
  { num: "9", title: "Co-Ordination With Other Depts.", items: ["Co-Ordination With Other Depts."] },
  { num: "10", title: "Record Maintenance", items: ["Record Maintenance"] },
  { num: "11", title: "Reporting To Immediate Boss", items: ["Reporting To Immediate Boss"] },
];

export function F30Template({ data, isTemplate = true, editMode = false, onChange, className }: F30Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  // Score input for a criteria item (1-4 scale)
  const scoreInp = (key: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-center text-xs border-none outline-none" type="number" min={1} max={4} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder="0" />
    ) : (
      <span className="text-center text-xs">{val(d, key) || ""}</span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[40px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-1 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[4fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Performance Appraisal Report</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/30 Rev. No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-[2fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">Name Of Employees 🡪 {inp("employee_name", "Employee Name")}</div>
      <div className="border-x border-b border-black text-xs p-1.5">Designation 🡪 {inp("designation", "Designation")}</div>
      <div className="border-x border-b border-black text-xs p-1.5">Department 🡪 {inp("department", "Department")}</div>
      <div className="border-x border-b border-black text-xs p-1.5">Working In Organisation 🡪 {inp("working_months", "X", "w-12")} Months</div>
      <div className="border-x border-b border-black text-xs p-1.5">Last Year Increment 🡪 {inp("last_increment", "N/A or amount")}</div>
      <div className="border-x border-b border-black text-xs p-1.5">Evaluation Done By 🡪 {inp("evaluated_by", "Project Lead")}</div>

      {/* Evaluation Criteria Table */}
      <div className="grid grid-cols-[35px_1fr_40px_40px_40px_40px] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Sr.</div>
        <div className="p-1 border-r border-black">Evaluation Criteria</div>
        <div className="p-1 border-r border-black text-center">1</div>
        <div className="p-1 border-r border-black text-center">2</div>
        <div className="p-1 border-r border-black text-center">3</div>
        <div className="p-1 text-center">4</div>
      </div>

      {/* Evaluation rows grouped by section */}
      {EVAL_SECTIONS.map((section) => (
        <React.Fragment key={section.num}>
          {/* Section header */}
          <div className="grid grid-cols-[35px_1fr_160px] border-x border-b border-black text-xs bg-blue-50/50">
            <div className="p-1 border-r border-black font-semibold text-center">{section.num}</div>
            <div className="p-1 border-r border-black font-semibold">{section.title}</div>
            <div className="p-1 text-center text-[10px] text-muted-foreground">1=Poor → 4=Excellent</div>
          </div>
          {/* Items */}
          {section.items.map((item, idx) => {
            const itemKey = `eval_${section.num}_${idx}`;
            const scoreVal = val(d, itemKey);
            return (
              <div key={itemKey} className="grid grid-cols-[35px_1fr_40px_40px_40px_40px] border-x border-b border-black text-xs min-h-[24px]">
                <div className="p-1 border-r border-black text-center text-muted-foreground"></div>
                <div className="p-1 border-r border-black">{item}</div>
                <div className="p-1 border-r border-black text-center">
                  {editMode ? (
                    <input type="radio" name={itemKey} checked={scoreVal === "1"} onChange={() => onChange?.(itemKey, "1")} className="w-3 h-3" />
                  ) : (<span>{scoreVal === "1" ? "●" : ""}</span>)}
                </div>
                <div className="p-1 border-r border-black text-center">
                  {editMode ? (
                    <input type="radio" name={itemKey} checked={scoreVal === "2"} onChange={() => onChange?.(itemKey, "2")} className="w-3 h-3" />
                  ) : (<span>{scoreVal === "2" ? "●" : ""}</span>)}
                </div>
                <div className="p-1 border-r border-black text-center">
                  {editMode ? (
                    <input type="radio" name={itemKey} checked={scoreVal === "3"} onChange={() => onChange?.(itemKey, "3")} className="w-3 h-3" />
                  ) : (<span>{scoreVal === "3" ? "●" : ""}</span>)}
                </div>
                <div className="p-1 text-center">
                  {editMode ? (
                    <input type="radio" name={itemKey} checked={scoreVal === "4"} onChange={() => onChange?.(itemKey, "4")} className="w-3 h-3" />
                  ) : (<span>{scoreVal === "4" ? "●" : ""}</span>)}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}

      {/* Total */}
      <div className="grid grid-cols-[35px_1fr_160px] border-x border-b border-black text-xs bg-gray-100 font-semibold">
        <div className="p-1 border-r border-black"></div>
        <div className="p-1 border-r border-black">Total Marking 🡪</div>
        <div className="p-1 text-center">{inp("total_marking", "Total", "w-16")}</div>
      </div>

      {/* Conclusions */}
      <div className="border-x border-b border-black text-xs p-1.5">
        Further Training Need Is Identified 🡪 {inp("training_need", "e.g. Improve quality")}
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Promotion, If Any 🡪 {inp("promotion", "N/A")}</div>
        <div className="p-1.5">Increment 🡪 {inp("increment", "As per company policy")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Suggestions for improvement 🡪 {inp("suggestions", "Suggestions")}</div>
        <div className="p-1.5">Evaluated By: {inp("evaluator_name", "Name")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Responsibility Shared 🡪 {inp("responsibility", "Details")}</div>
        <div className="p-1.5">Evaluated By: {inp("evaluator_name2", "Name")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Authorities Issued 🡪 {inp("authorities", "Details")}</div>
        <div className="p-1.5">Evaluated By: {inp("evaluator_name3", "Name")}</div>
      </div>
    </div>
  );
}