// ============================================================================
// F/43 — Induction Training Form
// DOCX: 10C x 21R — Employee info + training topics table + signatures
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F43Props {
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

export function F43Template({ data, isTemplate = true, editMode = false, onChange, className }: F43Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="checkbox" className="mx-1" checked={val(d, key) === "true"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 text-center text-[10px]">{val(d, key) === "true" ? "✓" : ""}</span>
      )}
      {label}
    </label>
  );

  // Default training topics
  const defaultTopics = [
    { num: "1", topic: "Details about the organization", trainer: "", completed: "" },
    { num: "2", topic: "Organization business activities", trainer: "", completed: "" },
    { num: "3", topic: "Organization structure in general", trainer: "", completed: "" },
    { num: "4", topic: "Salary, employment and working conditions", trainer: "", completed: "" },
    { num: "5", topic: "Industrial relations and safety issues", trainer: "", completed: "" },
    { num: "6", topic: "Security and confidentiality matters", trainer: "", completed: "" },
    { num: "7", topic: "Job responsibilities and authorities", trainer: "", completed: "" },
    { num: "8", topic: "Functional training", trainer: "", completed: "" },
  ];

  const topics = Array.isArray(d.topics) ? d.topics : defaultTopics;

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[4fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Induction Training Form</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/43 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Employee info fields */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">
        Name Of Employee 🡪 {inp("employee_name", "Employee Name")}
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Date Of Joining 🡪 {inp("date_of_joining", "Date")}</div>
        <div className="p-1.5">Department 🡪 {inp("department", "Department")}</div>
      </div>
      <div className="border-x border-b border-black text-xs p-1.5">
        Qualification And Experience 🡪 {inp("qualification", "Qualification")}
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Designation 🡪 {inp("designation", "Designation")}</div>
        <div className="p-1.5">Induction Report Issued By 🡪 {inp("issued_by", "Authorised Person")}</div>
      </div>

      {/* Training type */}
      <div className="border-x border-b border-black text-xs p-1.5 bg-gray-50 font-semibold">
        Type Of Training Imparted
      </div>

      {/* Training topics table */}
      <div className="grid grid-cols-[35px_1fr_100px_120px] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Sr.</div>
        <div className="p-1 border-r border-black">Topics Of Training</div>
        <div className="p-1 border-r border-black">Trainer</div>
        <div className="p-1">Training Completed On &amp; Signature</div>
      </div>

      {topics.map((topic: Record<string, unknown>, idx: number) => (
        <div key={idx} className="grid grid-cols-[35px_1fr_100px_120px] border-x border-b border-black text-xs min-h-[26px]">
          <div className="p-1 border-r border-black text-center">{typeof topic === "object" && "num" in topic ? String(topic.num) : String(idx + 1)}</div>
          <div className="p-1 border-r border-black">
            {editMode ? (
              <input className="w-full bg-transparent text-xs border-none outline-none" value={typeof topic === "object" && "topic" in topic ? String(topic.topic) : ""} onChange={e => {
                const newTopics = [...topics];
                newTopics[idx] = { ...newTopics[idx] as object, topic: e.target.value };
                onChange?.("topics", JSON.stringify(newTopics));
              }} />
            ) : (
              <span>{typeof topic === "object" && "topic" in topic ? String(topic.topic) : ""}</span>
            )}
          </div>
          <div className="p-1 border-r border-black">
            {editMode ? (
              <input className="w-full bg-transparent text-xs border-none outline-none" value={typeof topic === "object" && "trainer" in topic ? String(topic.trainer) : ""} onChange={e => {
                const newTopics = [...topics];
                newTopics[idx] = { ...newTopics[idx] as object, trainer: e.target.value };
                onChange?.("topics", JSON.stringify(newTopics));
              }} placeholder="Trainer" />
            ) : (
              <span>{typeof topic === "object" && "trainer" in topic ? String(topic.trainer) : ""}</span>
            )}
          </div>
          <div className="p-1">
            {editMode ? (
              <input className="w-full bg-transparent text-xs border-none outline-none" value={typeof topic === "object" && "completed" in topic ? String(topic.completed) : ""} onChange={e => {
                const newTopics = [...topics];
                newTopics[idx] = { ...newTopics[idx] as object, completed: e.target.value };
                onChange?.("topics", JSON.stringify(newTopics));
              }} placeholder="Date/Sign" />
            ) : (
              <span>{typeof topic === "object" && "completed" in topic ? String(topic.completed) : ""}</span>
            )}
          </div>
        </div>
      ))}

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_1fr_1fr] border border-t-2 border-black text-xs mt-1">
        <div className="p-1.5 border-r border-black">Sign. Inductee: {inp("inductee_sign", "Name")}</div>
        <div className="p-1.5 border-r border-black">Date: {inp("sign_date", "Date", "w-28")}</div>
        <div className="p-1.5">Authorised Person: {inp("authorised_sign", "Name")}</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border border-t border-black text-xs">
        <div className="p-1.5 border-r border-black">Effectiveness On Training 🡪 {inp("effectiveness", "By Trainer/HOD")}</div>
        <div className="p-1.5">Signature – Trainer / HOD: {inp("trainer_sign", "Name")}</div>
      </div>
    </div>
  );
}