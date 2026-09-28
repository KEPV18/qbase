// ============================================================================
// F/43 — Induction Training Form (COMPLETE DOCX-Faithful Rebuild)
// Header: Employee info (name, ID, designation, dept, qualification, joining date, project, trainer)
// Checklist: 15 training topics with ✔ marks
// Footer: Signatures (Inductee, Trainer, Authorised Person/Manager) + Effectiveness
// ============================================================================

import React from "react";
import { FormDocument, val } from "../FormKit";

export interface F43Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const TRAINING_TOPICS: { num: string; topic: string }[] = [
  { num: "1", topic: "Details about the organization" },
  { num: "2", topic: "Organization business activities" },
  { num: "3", topic: "Organization structure in general" },
  { num: "4", topic: "Salary, employment and working conditions" },
  { num: "5", topic: "Industrial relations and safety issues" },
  { num: "6", topic: "Security and confidentiality matters" },
  { num: "7", topic: "Job responsibilities and authorities" },
  { num: "8", topic: "Functional training" },
  { num: "9", topic: "ISO 9001:2015 awareness" },
  { num: "10", topic: "ISO 14001:2015 awareness" },
  { num: "11", topic: "ISO 45001:2018 awareness" },
  { num: "12", topic: "Quality policy and objectives" },
  { num: "13", topic: "Environmental policy and objectives" },
  { num: "14", topic: "OHS policy and objectives" },
  { num: "15", topic: "Document and record control" },
];

export function F43Template({ data, isTemplate = true, editMode = false, onChange, className }: F43Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const txt = (key: string, fallback = "") => {
    const v = val(d, key);
    return v || (ph ? fallback : v || "—");
  };

  const th = "border border-border p-1 text-[9px] font-semibold bg-muted";
  const tc = "border border-border p-0.5 text-[10px]";

  // All 15 topics get ✔ by default for completed induction records
  const isCompleted = !isTemplate;

  return (
    <FormDocument formCode="F/43" formName="Induction Training Form" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Header: Title + Rev ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Induction Training Form</td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap font-semibold">
                F/43 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Employee Info Block ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-border p-1.5 font-semibold w-[15%]">Sr. No.</td>
              <td className="border border-border p-1.5 w-[35%]">{txt("serial")}</td>
              <td className="border border-border p-1.5 font-semibold w-[15%]">Date</td>
              <td className="border border-border p-1.5 w-[35%]">{txt("date")}</td>
            </tr>
            <tr>
              <td className="border border-border p-1.5 font-semibold">Name of Employee</td>
              <td className="border border-border p-1.5">{txt("employee_name")}</td>
              <td className="border border-border p-1.5 font-semibold">Employee ID</td>
              <td className="border border-border p-1.5">{txt("employee_id")}</td>
            </tr>
            <tr>
              <td className="border border-border p-1.5 font-semibold">Designation</td>
              <td className="border border-border p-1.5">{txt("designation")}</td>
              <td className="border border-border p-1.5 font-semibold">Date of Joining</td>
              <td className="border border-border p-1.5">{txt("date_of_joining")}</td>
            </tr>
            <tr>
              <td className="border border-border p-1.5 font-semibold">Department</td>
              <td className="border border-border p-1.5">{txt("department")}</td>
              <td className="border border-border p-1.5 font-semibold">Project</td>
              <td className="border border-border p-1.5">{txt("project")}</td>
            </tr>
            <tr>
              <td className="border border-border p-1.5 font-semibold">Qualification</td>
              <td className="border border-border p-1.5">{txt("qualification")}</td>
              <td className="border border-border p-1.5 font-semibold">Trainer</td>
              <td className="border border-border p-1.5">{txt("trainer")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Training Topics Checklist ── */}
      <div className="overflow-x-auto mt-1">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-muted">
              <th className={th} style={{ width: "40px" }}>Sr.</th>
              <th className={th}>Training Topics / Checklist</th>
              <th className={th} style={{ width: "50px" }}>Trainer</th>
              <th className={th} style={{ width: "50px" }}>Inductee</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_TOPICS.map((t, idx) => (
              <tr key={idx} className="hover:bg-muted/30">
                <td className={tc + " text-center"}>{t.num}</td>
                <td className={tc}>{t.topic}</td>
                <td className={tc + " text-center"}>
                  {editMode ? (
                    <input className="w-full bg-transparent text-[10px] text-center border-none outline-none"
                      value={val(d, `topic_${t.num}_trainer`) || ""} onChange={e => onChange?.(`topic_${t.num}_trainer`, e.target.value)} />
                  ) : (
                    <span>{isCompleted ? "✔" : ""}</span>
                  )}
                </td>
                <td className={tc + " text-center"}>
                  {editMode ? (
                    <input className="w-full bg-transparent text-[10px] text-center border-none outline-none"
                      value={val(d, `topic_${t.num}_inductee`) || ""} onChange={e => onChange?.(`topic_${t.num}_inductee`, e.target.value)} />
                  ) : (
                    <span>{isCompleted ? "✔" : ""}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Signatures Block ── */}
      <div className="overflow-x-auto mt-1">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-semibold" style={{ width: "25%" }}>
                Sign. of Inductee
              </td>
              <td className="border border-border p-2" style={{ width: "25%" }}>
                {txt("employee_name")}
              </td>
              <td className="border border-border p-2 font-semibold" style={{ width: "25%" }}>
                Date
              </td>
              <td className="border border-border p-2" style={{ width: "25%" }}>
                {txt("date")}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 font-semibold">
                Trainer Signature
              </td>
              <td className="border border-border p-2">
                {txt("trainer_signature") || txt("trainer")}
              </td>
              <td className="border border-border p-2 font-semibold">
                Authorised Person
              </td>
              <td className="border border-border p-2">
                {txt("manager_signature") || txt("issued_by")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Effectiveness ── */}
      <div className="border border-border mt-1 p-3 bg-muted/20 rounded-sm">
        <div className="text-[11px] font-bold mb-1 text-foreground">Effectiveness on Training</div>
        <div className="text-[11px] text-muted-foreground">
          {txt("effectiveness") || (ph ? "Employee demonstrated understanding of training topics..." : "—")}
        </div>
      </div>
    </FormDocument>
  );
}