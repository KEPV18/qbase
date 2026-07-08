// ============================================================================
// F/21 — Management Review Meeting Minutes
// DOCX: 1 row × 1 column — single cell with meeting minutes text
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F21Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
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
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, placeholder: string) =>
    editMode ? (
      <textarea
        className="w-full bg-transparent text-sm p-2 border border-dashed border-foreground/40 rounded resize-none min-h-[120px]"
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-relaxed min-h-[120px]">
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  return (
    <FormDocument formCode="F/21" formName="Review Minutes" serial={val(d, "serial")} sectionName="Management & Documentation">
      {/* 1 row × 1 column table matching Word structure */}
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <td className="border border-border p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="font-semibold">Meeting Date: </span>{inp("meeting_date", "Date", "w-32")}</div>
                  <div><span className="font-semibold">Meeting Time: </span>{inp("meeting_time", "Time", "w-28")}</div>
                  <div><span className="font-semibold">Meeting Place: </span>{inp("meeting_place", "Place", "w-32")}</div>
                </div>

                <div>
                  <p className="font-semibold mb-1">Following Points have been discussed.</p>
                  {textArea("discussion_points", "Enter discussion points...")}
                </div>

                <div>
                  <p className="font-semibold mb-1">Minutes Circulate with:</p>
                  {inp("minutes_circulated_with", "Circulated with...", "w-full")}
                </div>

                <div>
                  <p className="font-semibold mb-1">Next meeting schedule:</p>
                  {inp("next_meeting", "Next meeting date", "w-64")}
                </div>

                <div className="text-right">
                  <span className="font-semibold">Approved By: </span>{inp("approved_by", "Approved By", "w-40")}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>
  );
}
