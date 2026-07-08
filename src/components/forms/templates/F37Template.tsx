// ============================================================================
// F/37 — Experiment Data Sheet
// DOCX: 6C x 27R — Title, Sr.No/Date, Product/ExpNo, Incharge, Objective,
//   6-col experiment table, Conclusion, Signature
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F37Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface ExperimentRow {
  quantity: string;
  description: string;
  observation: string;
}

function parseExperiments(d: Record<string, unknown>): ExperimentRow[] {
  const raw = d.experiments;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as ExperimentRow[];
  return [];
}

export function F37Template({ data, isTemplate = true, editMode = false, onChange, className }: F37Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const experiments = parseExperiments(d);

  const inp = (key: string, placeholder: string, className?: string) =>
    editMode ? (
      <input
        className={cn("w-full bg-transparent text-xs px-1 border-none outline-none", className)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className={cn("text-xs", className)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH = "min-h-[40px]") =>
    editMode ? (
      <textarea
        className={cn("w-full bg-transparent text-xs p-1 border border-dashed border-foreground/30 rounded resize-none", minH)}
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className={cn("whitespace-pre-wrap text-xs", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  const cellInp = (idx: number, subKey: string, label: string) => {
    const item = experiments[idx] || { quantity: "", description: "", observation: "" };
    return editMode ? (
      <input
        className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={(item as any)[subKey] || ""}
        onChange={e => {
          const updated = [...experiments];
          updated[idx] = { ...updated[idx], [subKey]: e.target.value };
          onChange?.("experiments", updated);
        }}
        placeholder={label}
      />
    ) : (
      <span className="text-[10px]">{(item as any)[subKey] || ""}</span>
    );
  };

  const td = (children: React.ReactNode, colSpan = 1, rowSpan = 1, className?: string) => (
    <td colSpan={colSpan} rowSpan={rowSpan} className={cn("border border-border p-1.5 text-xs", className)}>
      {children}
    </td>
  );

  return (
    <FormDocument formCode="F/37" formName="Experiment Data" serial={val(d, "serial")} sectionName="R&D & Design">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {/* Row 0: Title + Issue No */}
            <tr>
              {td(<span className="font-bold text-sm">Experiment Data Sheet</span>, 5)}
              {td(<>F 37 Issue No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</>, 1, 1, "text-right bg-muted/30")}
            </tr>

            {/* Row 1: Sr. No + Date */}
            <tr>
              {td(<>Sr. No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</>, 3)}
              {td(<>Date 🡪 {inp("date", "DD/MM/YYYY")}</>, 3)}
            </tr>

            {/* Row 2: Product + Experiment No. */}
            <tr>
              {td(<>Product 🡪 {inp("product_name", "Product Name")}</>, 3)}
              {td(<>Experiment No. 🡪 {inp("experiment_no", "Exp No.")}</>, 3)}
            </tr>

            {/* Row 3: Incharge */}
            <tr>
              {td(<>Incharge 🡪 {inp("incharge", "Incharge Name")}</>, 6)}
            </tr>

            {/* Row 4: Object And Variables */}
            <tr>
              {td(
                <div>
                  <div className="font-semibold mb-1">Object And Variables</div>
                  {textArea("objective", "Object and variables...")}
                </div>,
                6,
                1,
                "min-h-[50px]"
              )}
            </tr>

            {/* Rows 5-25: Experiment data rows (21 rows) */}
            {Array.from({ length: 21 }).map((_, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                {td(cellInp(idx, "quantity", "Qty"), 2)}
                {td(cellInp(idx, "description", "Description"), 2)}
                {td(cellInp(idx, "observation", "Results"), 2)}
              </tr>
            ))}

            {/* Row 26: Signature row */}
            <tr className="bg-muted/30">
              {td(
                <div className="flex justify-between text-[10px]">
                  <span>Done By 🡪 {inp("done_by", "Name")}</span>
                  <span>Reviewed By 🡪 {inp("reviewed_by", "Name")}</span>
                </div>,
                6
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
