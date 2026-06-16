// ============================================================================
// F/21 — Management Review Meeting Minutes
// Doc: "Meeting Date / Time / Place / Points discussed / Minutes / Next meeting"
// Minimal structured form with free-text areas.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F21Props {
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

export function F21Template({ data, isTemplate = true, editMode = false, onChange, className }: F21Props) {
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
        <div className="text-left text-xs text-muted-foreground">F/21</div>
        <div>Management Review Meeting Minutes</div>
        <div className="text-right text-xs">
          Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Top fields */}
      <div className="grid grid-cols-3 gap-6 mb-4 text-sm">
        <div>Meeting Date: {inp("meeting_date", "Date")}</div>
        <div>Meeting Time: {inp("meeting_time", "Time")}</div>
        <div>Meeting Place: {inp("meeting_place", "Place")}</div>
      </div>

      {/* Discussion points */}
      <div className="mb-4">
        <p className="font-semibold mb-1">Following Points have been discussed:</p>
        {editMode ? (
          <textarea
            className="w-full border border-foreground/20 rounded p-2 text-sm min-h-[120px]"
            value={val(d, "discussion_points") || ""}
            onChange={e => onChange?.("discussion_points", e.target.value)}
            placeholder="Enter discussion points..."
          />
        ) : (
          <div className="min-h-[120px] whitespace-pre-wrap">
            {val(d, "discussion_points") || (ph ? "___" : "")}
          </div>
        )}
      </div>

      {/* Minutes circulated with */}
      <div className="mb-4">
        <p className="font-semibold mb-1">Minutes Circulate with:</p>
        {editMode ? (
          <input
            className="w-full border-b border-dashed border-foreground/40 bg-transparent text-sm px-1"
            value={val(d, "minutes_circulated_with")}
            onChange={e => onChange?.("minutes_circulated_with", e.target.value)}
            placeholder="Circulated with..."
          />
        ) : (
          <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[12rem]">
            {val(d, "minutes_circulated_with") || (ph ? "___" : "")}
          </span>
        )}
      </div>

      {/* Next meeting schedule */}
      <div className="mb-4">
        <p className="font-semibold mb-1">Next meeting schedule:</p>
        {editMode ? (
          <input
            className="border-b border-dashed border-foreground/40 bg-transparent text-sm px-1 w-64"
            value={val(d, "next_meeting")}
            onChange={e => onChange?.("next_meeting", e.target.value)}
            placeholder="Next meeting date"
          />
        ) : (
          <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[8rem]">
            {val(d, "next_meeting") || (ph ? "___" : "")}
          </span>
        )}
      </div>

      {/* Approved By */}
      <div className="mt-8 pt-4 border-t border-foreground/20 flex justify-end">
        <div className="text-sm">
          Approved By: {inp("approved_by", "Approved By", "w-40")}
        </div>
      </div>
    </div>
  );
}