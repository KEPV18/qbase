// ============================================================================
// F/20 — Management Review Meeting Agenda
// Doc: "Please be advised that there will be management Review Meeting..."
// Single-page letter-style form with fields + bulleted agenda items.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F20Props {
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

const AGENDA_ITEMS = [
  "The status of actions from previous management reviews",
  "Changes in external and internal issues relevant to QMS",
  "Information on the performance and effectiveness of QMS, including trends in:",
  "Customer satisfaction and feedback from relevant interested parties and customer complaints",
  "The extent to which quality objectives have been met",
  "Process performance and conformity of products and services",
  "Nonconformities and corrective actions",
  "Monitoring and measurement results and Review effectiveness of system in achieving Quality objectives",
  "Audit results",
  "The performance of external providers",
  "The adequacy of resources",
  "Effectiveness of actions to address risks and opportunities",
  "Opportunities for improvement",
];

export function F20Template({ data, isTemplate = true, editMode = false, onChange, className }: F20Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 min-w-[6rem] inline-block", width)}>
        {val(d, key) || (ph ? `___` : "")}
      </span>
    );

  return (
    <div className={cn("bg-white text-black text-sm leading-relaxed", className)}>
      {/* Header */}
      <div className="text-center font-bold text-base border-b border-black pb-2 mb-4 flex justify-between items-end">
        <div className="text-left text-xs text-muted-foreground">F/20</div>
        <div>Management Review Meeting Agenda</div>
        <div className="text-right text-xs">
          Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Sr No and other top fields */}
      <div className="flex gap-6 mb-4 text-sm">
        <div>Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div>Date 🡪 {inp("date", "Date")}</div>
      </div>

      {/* Main content */}
      <p className="mb-3">
        Please be advised that there will be management Review Meeting.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>Date: {inp("meeting_date", "Meeting Date")}</div>
        <div>Time: {inp("meeting_time", "Meeting Time")}</div>
        <div>Place: {inp("meeting_place", "Meeting Place")}</div>
      </div>

      <p className="font-semibold mb-2">The agenda will include:</p>
      <ol className="list-decimal list-outside ml-6 space-y-1 mb-6">
        {AGENDA_ITEMS.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>

      {/* Approved By */}
      <div className="mt-8 pt-4 border-t border-foreground/20 flex justify-end">
        <div className="text-sm">
          Approved By: {inp("approved_by", "Approved By", "w-40")}
        </div>
      </div>
    </div>
  );
}