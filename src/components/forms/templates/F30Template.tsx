// ============================================================================
// F/30 — Performance Appraisal Report
// DOCX: 5-Point Evaluation Scale (1=Poor → 5=Excellent)
// 11 evaluation sections, 20 criteria items, total marking, conclusion
// ============================================================================

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F30Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

// Evaluation sections — each section has a header + sub-items
interface EvalItem {
  id: string;
  category: string;
  score: number;
}

interface EvalSection {
  num: string;
  title: string;
  itemIds: string[];
}

const EVAL_SECTIONS: EvalSection[] = [
  { num: "1", title: "Follow-Up Of Job Timings", itemIds: ["1"] },
  { num: "2", title: "Working Style", itemIds: ["2a","2b","2c","2d","2e","2f","2g"] },
  { num: "3", title: "Innovativeness", itemIds: ["3a","3b","3c"] },
  { num: "4", title: "Improvements Compare To Last Year", itemIds: ["4"] },
  { num: "5", title: "Spare Time Utilisation", itemIds: ["5a","5b"] },
  { num: "6", title: "Follow Up Of The Instructions", itemIds: ["6"] },
  { num: "7", title: "Knowledge Of The Job Handled", itemIds: ["7"] },
  { num: "8", title: "Knowledge Of The Process", itemIds: ["8"] },
  { num: "9", title: "Co-Ordination With Other Depts.", itemIds: ["9"] },
  { num: "10", title: "Record Maintenance", itemIds: ["10"] },
  { num: "11", title: "Reporting To Immediate Boss", itemIds: ["11"] },
];

const FC = "F/30";

function parseMatrix(d: Record<string, unknown>): EvalItem[] {
  const raw = d.evaluation_matrix || d.evaluationMatrix || [];
  if (Array.isArray(raw) && raw.length > 0) return raw as EvalItem[];
  return [];
}

export function F30Template({ data, isTemplate = true, editMode = false, onChange, className }: F30Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const matrix = parseMatrix(d);
  const matrixMap = useMemo(() => {
    const m = new Map<string, EvalItem>();
    matrix.forEach(item => m.set(item.id, item));
    return m;
  }, [matrix]);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-border bg-transparent text-foreground text-sm px-1 outline-none", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-border text-foreground px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "\u00A0")}</span>
    );

  // Score columns 1-5
  const SCORE_COLS = [1, 2, 3, 4, 5];

  return (
    <FormDocument formCode={FC} formName="Performance Appraisal" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[4fr_1fr] border border-border rounded-t-lg overflow-hidden">
        <div className="p-3 font-bold bg-muted/40 text-foreground text-base">Performance Appraisal Report</div>
        <div className="p-3 border-l border-border bg-muted/40 text-right text-xs text-foreground">
          F/30 Rev. No. {val(d, "serial") || (ph ? "—" : "")}
        </div>
      </div>

      {/* ── Employee Info Grid ── */}
      <div className="border-x border-b border-border">
        <div className="grid grid-cols-2 border-b border-border text-xs text-foreground">
          <div className="p-2 border-r border-border">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Sr. No.</span>
            <div className="font-semibold">{val(d, "serial") || (ph ? "—" : "")}</div>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Date</span>
            <div className="font-semibold">{val(d, "date") || (ph ? "—" : "")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-border text-xs text-foreground">
          <div className="p-2 border-r border-border">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Name Of Employee</span>
            <div className="font-semibold">{val(d, "employee_name") || (ph ? "—" : "")}</div>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Designation</span>
            <div className="font-semibold">{val(d, "designation") || (ph ? "—" : "")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-border text-xs text-foreground">
          <div className="p-2 border-r border-border">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Department</span>
            <div className="font-semibold">{val(d, "department") || (ph ? "—" : "")}</div>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Working In Organisation</span>
            <div className="font-semibold">{val(d, "working_in_organisation") || (ph ? "—" : "")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-border text-xs text-foreground">
          <div className="p-2 border-r border-border">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Last Year Increment</span>
            <div className="font-semibold">{val(d, "last_year_increment") || (ph ? "—" : "")}</div>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Evaluation Done By</span>
            <div className="font-semibold">{val(d, "evaluation_done_by") || (ph ? "—" : "")}</div>
          </div>
        </div>
      </div>

      {/* ── Evaluation Matrix Table ── */}
      <div className="w-full overflow-x-auto border-x border-b border-border">
        <table className="w-full border-collapse text-xs" style={{ minWidth: "500px" }}>
          <thead>
            <tr className="bg-muted/50 text-foreground font-semibold">
              <th className="border-r border-border p-2 text-center" style={{ width: "40px" }}>Sr.</th>
              <th className="border-r border-border p-2 text-left">Evaluation Criteria</th>
              {SCORE_COLS.map(n => (
                <th key={n} className="border-r border-border p-2 text-center" style={{ width: "36px" }}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVAL_SECTIONS.map((section) => {
              const items = section.itemIds.map(id => matrixMap.get(id)).filter(Boolean) as EvalItem[];
              // If no matrix data and template mode, build placeholder items from section definitions
              const displayItems = items.length > 0 ? items : (ph ? section.itemIds.map(id => ({
                id,
                category: section.itemIds.length === 1 ? section.title : getFallbackCategory(id),
                score: 0,
              })) : []);

              return (
                <React.Fragment key={section.num}>
                  {/* Section header row */}
                  <tr className="bg-muted/30 text-foreground">
                    <td className="border-r border-border p-1.5 text-center font-bold">{section.num}</td>
                    <td className="border-r border-border p-1.5 font-semibold" colSpan={SCORE_COLS.length}>{section.title}</td>
                  </tr>
                  {/* Item rows */}
                  {displayItems.map((item) => (
                    <tr key={item.id} className="text-foreground hover:bg-muted/10">
                      <td className="border-r border-border p-1.5 text-center text-muted-foreground">{item.id}</td>
                      <td className="border-r border-border p-1.5">{item.category}</td>
                      {SCORE_COLS.map(n => (
                        <td key={n} className="border-r border-border p-1.5 text-center">
                          {item.score === n ? (
                            <span className="text-amber-500 dark:text-amber-400 font-bold text-sm">✔</span>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scale legend */}
      <div className="px-3 py-1.5 border-x border-b border-border text-[10px] text-muted-foreground text-center">
        1 = Poor &nbsp;·&nbsp; 2 = Below Average &nbsp;·&nbsp; 3 = Average &nbsp;·&nbsp; 4 = Good &nbsp;·&nbsp; 5 = Excellent
      </div>

      {/* ── Total Marking ── */}
      <div className="grid grid-cols-[35px_1fr_120px] border-x border-b border-border text-xs bg-muted/40 font-semibold text-foreground">
        <div className="p-2 border-r border-border"></div>
        <div className="p-2 border-r border-border">Total Marking →</div>
        <div className="p-2 text-center text-sm font-bold text-amber-600 dark:text-amber-400">
          {val(d, "total_marking") || (ph ? "—" : "")}
        </div>
      </div>

      {/* ── Conclusions ── */}
      <div className="border-x border-b border-border text-xs text-foreground p-2">
        <span className="text-[9px] font-bold uppercase text-muted-foreground">Further Training Need Is Identified</span>
        <div className="font-semibold">{val(d, "further_training_need") || (ph ? "—" : "")}</div>
      </div>

      <div className="grid grid-cols-2 border-x border-b border-border text-xs text-foreground">
        <div className="p-2 border-r border-border">
          <span className="text-[9px] font-bold uppercase text-muted-foreground">Promotion, If Any</span>
          <div className="font-semibold">{val(d, "promotion") || (ph ? "—" : "")}</div>
        </div>
        <div className="p-2">
          <span className="text-[9px] font-bold uppercase text-muted-foreground">Increment</span>
          <div className="font-semibold">{val(d, "increment") || (ph ? "—" : "")}</div>
        </div>
      </div>

      <div className="border-x border-b border-border text-xs text-foreground p-2">
        <span className="text-[9px] font-bold uppercase text-muted-foreground">Suggestions For Improvement</span>
        <div className="font-semibold">{val(d, "suggestions_for_improvement") || (ph ? "—" : "")}</div>
      </div>

      <div className="border-x border-b border-border text-xs text-foreground p-2">
        <span className="text-[9px] font-bold uppercase text-muted-foreground">Responsibility Shared</span>
        <div className="font-semibold">{val(d, "responsibility_shared") || (ph ? "—" : "")}</div>
      </div>

      <div className="border-x border-b border-border text-xs text-foreground p-2">
        <span className="text-[9px] font-bold uppercase text-muted-foreground">Authorities Issued</span>
        <div className="font-semibold">{val(d, "authorities_issued") || (ph ? "—" : "")}</div>
      </div>

      {/* ── Signature Block ── */}
      <div className="grid grid-cols-2 border-x border-b border-border rounded-b-lg overflow-hidden">
        <div className="p-3 border-r border-border">
          <div className="min-h-[30px] border-b border-border mb-1">
            <span className="text-sm font-semibold text-foreground">{val(d, "evaluated_by") || (ph ? "—" : "")}</span>
          </div>
          <p className="text-[9px] font-bold uppercase text-muted-foreground">Evaluated By</p>
        </div>
        <div className="p-3">
          <div className="min-h-[30px] border-b border-border mb-1">
            <span className="text-sm font-semibold text-foreground">{val(d, "evaluation_done_by") || (ph ? "—" : "")}</span>
          </div>
          <p className="text-[9px] font-bold uppercase text-muted-foreground">Authorised By</p>
        </div>
      </div>
    </FormDocument>
  );
}

// Fallback category names for template mode
function getFallbackCategory(id: string): string {
  const map: Record<string, string> = {
    "2a": "Positive Attitude", "2b": "Work Involvement", "2c": "Learning Attitude",
    "2d": "Work Allotment To The Next Employee", "2e": "Co-Ordination With The Next Employee",
    "2f": "Motivation Of The Next Employee", "2g": "Speed Of Work",
    "3a": "Any Development Is Done", "3b": "Any Cost Effective Measures Implemented",
    "3c": "Any Control Established On Expenses",
    "5a": "Any Achievement During The Year", "5b": "Responsibility Sharing",
  };
  return map[id] || "";
}