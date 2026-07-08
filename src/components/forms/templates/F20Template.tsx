// ============================================================================
// F/20 — Management Review Meeting Agenda
// DOCX: 1 row × 1 column — single cell with full agenda text
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F20Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

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
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, placeholder: string) =>
    editMode ? (
      <textarea
        className="w-full bg-transparent text-sm p-2 border border-dashed border-foreground/40 rounded resize-none min-h-[200px]"
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-relaxed min-h-[200px]">
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  return (
    <FormDocument formCode="F/20" formName="Review Agenda" serial={val(d, "serial")} sectionName="Management & Documentation">
      {/* 1 row × 1 column table matching Word structure */}
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <td className="border border-border p-4">
              <div className="space-y-4">
                <p>Please be advised that there will be management Review Meeting.</p>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="font-semibold">Date: </span>{inp("date", "DD/MM/YYYY", "w-32")}</div>
                  <div><span className="font-semibold">Time: </span>{inp("time", "Time", "w-28")}</div>
                  <div><span className="font-semibold">Place: </span>{inp("place", "Place", "w-32")}</div>
                </div>

                <div>
                  <p>The agenda will include.</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>The status of actions from previous management reviews;</li>
                    <li>Changes in external and internal issues relevant to QMS;</li>
                    <li>Information on the performance and effectiveness of QMS, including trends in:
                      <ul className="list-disc ml-6 mt-1 space-y-1">
                        <li>Customer satisfaction and feedback from relevant interested parties and customer complaints;</li>
                        <li>The extent to which quality objectives have been met;</li>
                        <li>Process performance and conformity of products and services;</li>
                        <li>Nonconformities and corrective actions;</li>
                        <li>Monitoring and measurement results and Review effectiveness of system in achieving Quality objectives;</li>
                      </ul>
                    </li>
                    <li>Audit results;</li>
                    <li>The performance of external providers;</li>
                    <li>The adequacy of resources;</li>
                    <li>Effectiveness of actions to address risks and opportunities</li>
                    <li>Opportunities for improvement</li>
                  </ul>
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
