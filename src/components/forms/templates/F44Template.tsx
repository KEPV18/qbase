// ============================================================================
// F/44 — Job Description
// DOCX: 3 rows, 3 cols. Very simple form.
// Row 0: Position 🡪 | Reports To 🡪
// Row 1: Responsibilities (gs=3)
// Row 2: Delegation Of Duties During Absence (gs=3)
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F44Props {
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

export function F44Template({ data, isTemplate = true, editMode = false, onChange, className }: F44Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="text-center font-bold text-base border-b border-black pb-2 mb-4 flex justify-between items-end">
        <div className="text-left text-xs text-muted-foreground">F/44</div>
        <div>Job Description</div>
        <div className="text-right text-xs">
          Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold bg-gray-50 w-1/2">Position 🡪</td>
            <td className="border border-black p-2 font-semibold bg-gray-50 w-1/2">Reports To 🡪</td>
          </tr>
          <tr>
            <td className="border border-black p-2">{inp("position", "Position")}</td>
            <td className="border border-black p-2">{inp("reports_to", "Reports To")}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold bg-gray-50" colSpan={2}>Write here Responsibilities of Person.</td>
          </tr>
          <tr>
            <td className="border border-black p-2 min-h-[120px]" colSpan={2}>
              {editMode ? (
                <textarea className="w-full min-h-[120px] bg-transparent text-xs p-1" value={val(d, "responsibilities") || ""} onChange={e => onChange?.("responsibilities", e.target.value)} placeholder="Enter responsibilities..." />
              ) : (
                <div className="whitespace-pre-wrap min-h-[60px]">{val(d, "responsibilities") || (ph ? "___" : "")}</div>
              )}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold bg-gray-50" colSpan={2}>Delegation Of Duties During Absence (Indicate Position)</td>
          </tr>
          <tr>
            <td className="border border-black p-2 min-h-[80px]" colSpan={2}>
              {editMode ? (
                <textarea className="w-full min-h-[80px] bg-transparent text-xs p-1" value={val(d, "delegation") || ""} onChange={e => onChange?.("delegation", e.target.value)} placeholder="Enter delegation details..." />
              ) : (
                <div className="whitespace-pre-wrap min-h-[40px]">{val(d, "delegation") || (ph ? "___" : "")}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Approved By */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Approved By: {inp("approved_by", "Name", "w-40")}</div>
      </div>
    </div>
  );
}