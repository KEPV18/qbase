// ============================================================================
// F/43 — Induction Training Form
// WORD: 21R × 10C — Employee info + 15 training topic rows + signature
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

const DEFAULT_TOPICS: { num: string; topic: string }[] = [
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

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className="border-b border-dashed border-foreground/40 bg-transparent text-sm px-1" style={{ width }}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]" style={{ width }}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const topics = Array.isArray(d.topics) ? d.topics as Record<string, string>[] : DEFAULT_TOPICS;

  const th = "border border-border p-1 text-[9px] font-semibold bg-muted";
  const tc = "border border-border p-0.5 text-[10px]";

  // ── Mobile fallback ──
  const mobileView = (
    <div className="md:hidden space-y-2 text-xs p-2">
      <div><strong>Employee:</strong> {val(d, "employee_name") || "—"}</div>
      <div><strong>Dept:</strong> {val(d, "department") || "—"}</div>
      <div><strong>Date:</strong> {val(d, "date") || "—"}</div>
      {topics.map((t, i) => (
        <div key={i} className="flex gap-2">
          <span>{t.num || i + 1}.</span>
          <span>{t.topic}</span>
        </div>
      ))}
    </div>
  );

  return (
    <FormDocument formCode="F/43" formName="Induction Training Form" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Row 0: Title ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <colgroup><col span={10} /></colgroup>
          <tbody>
            {/* Row 0: Title + Rev */}
            <tr>
              <td colSpan={8} className="border border-border p-2 font-bold bg-primary/5 text-sm">Induction Training Form</td>
              <td colSpan={2} className="border border-border p-2 bg-primary/5 text-right text-xs">
                F/43 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
            {/* Row 1: Sr.No + Date */}
            <tr>
              <td colSpan={4} className="border border-border p-1.5 text-xs">Sr. No. → {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</td>
              <td colSpan={6} className="border border-border p-1.5 text-xs">Date → {inp("date", "Date")}</td>
            </tr>
            {/* Row 2: Name Of Employee */}
            <tr>
              <td colSpan={10} className="border border-border p-1.5 text-xs">Name Of Employee → {inp("employee_name", "Employee Name")}</td>
            </tr>
            {/* Row 3: Date Of Joining */}
            <tr>
              <td colSpan={10} className="border border-border p-1.5 text-xs">Date Of Joining → {inp("date_of_joining", "Date")}</td>
            </tr>
            {/* Row 4: Department */}
            <tr>
              <td colSpan={10} className="border border-border p-1.5 text-xs">Department → {inp("department", "Department")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile fallback */}
      {mobileView}

      {/* ── Rows 5-19: Training topics checklist (10-col table) ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] hidden md:table">
          <thead>
            <tr className="bg-muted">
              <th className={th} style={{ width: "35px" }}>Sr.</th>
              <th className={th} colSpan={9}>Training Topics / Checklist</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic, idx) => {
              const num = String(topic.num || idx + 1);
              const topicText = topic.topic || "";
              const completed = val(d, `topic_${num}_completed`);
              const trainer = val(d, `topic_${num}_trainer`);
              return (
                <tr key={idx}>
                  <td className={tc + " text-center"}>{num}</td>
                  <td className={tc} colSpan={4}>{topicText}</td>
                  <td className={tc} colSpan={2}>
                    {editMode ? (
                      <input className="w-full bg-transparent text-[10px] border-none outline-none"
                        value={trainer} onChange={e => onChange?.(`topic_${num}_trainer`, e.target.value)} placeholder="Trainer" />
                    ) : <span>{trainer}</span>}
                  </td>
                  <td className={tc} colSpan={3}>
                    {editMode ? (
                      <input className="w-full bg-transparent text-[10px] border-none outline-none"
                        value={completed} onChange={e => onChange?.(`topic_${num}_completed`, e.target.value)} placeholder="Completed On / Sign" />
                    ) : <span>{completed}</span>}
                  </td>
                </tr>
              );
            })}
            {/* Pad to ~15 rows if fewer topics */}
            {Array.from({ length: Math.max(0, 15 - topics.length) }, (_, i) => (
              <tr key={`empty-${i}`}>
                <td className={tc + " text-center"}>{topics.length + i + 1}</td>
                <td className={tc} colSpan={9}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Row 20: Signature row ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <colgroup><col span={10} /></colgroup>
          <tbody>
            <tr>
              <td className="border border-border p-1.5 text-xs font-semibold" colSpan={2}>
                Sign. Inductee: {inp("inductee_sign", "Name")}
              </td>
              <td className="border border-border p-1.5 text-xs font-semibold" colSpan={3}>
                Date: {inp("sign_date", "Date")}
              </td>
              <td className="border border-border p-1.5 text-xs font-semibold" colSpan={2}>
                Authorised Person: {inp("authorised_sign", "Name")}
              </td>
              <td className="border border-border p-1.5 text-xs" colSpan={3}>
                Effectiveness On Training → {inp("effectiveness", "By Trainer/HOD")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
