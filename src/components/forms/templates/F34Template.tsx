// ============================================================================
// F/34 — Design Verification Report
// DOCX: 3C x 22R — Title, Project/Date, Product, verification rows, signature
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F34Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface VerifItem {
  input: string;
  output: string;
}

function parseItems(d: Record<string, unknown>): VerifItem[] {
  const raw = d.verification_items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as VerifItem[];
  return [];
}

export function F34Template({ data, isTemplate = true, editMode = false, onChange, className }: F34Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);

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
    const item = items[idx] || { input: "", output: "" };
    return editMode ? (
      <input
        className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={(item as any)[subKey] || ""}
        onChange={e => {
          const updated = [...items];
          updated[idx] = { ...updated[idx], [subKey]: e.target.value };
          onChange?.("verification_items", updated);
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
    <FormDocument formCode="F/34" formName="Design Verification" serial={val(d, "serial")} sectionName="R&D & Design">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {/* Row 0: Title + Rev No */}
            <tr>
              {td(<span className="font-bold text-sm">Design Verification Report</span>, 2)}
              {td(<>F 34 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</>, 1, 1, "text-right bg-muted/30")}
            </tr>

            {/* Row 1: Project Number + Date */}
            <tr>
              {td(<>Project Number 🡪 {inp("project_number", "F/34-001")}</>, 1)}
              {td(<>Date 🡪 {inp("date", "DD/MM/YYYY")}</>, 2)}
            </tr>

            {/* Row 2: Name Of Product */}
            <tr>
              {td(<>Name Of Product 🡪 {inp("product_name", "Product Name")}</>, 3)}
            </tr>

            {/* Row 3: Column headers */}
            <tr className="bg-muted/50">
              {td(<span className="font-semibold">Input Requirements</span>, 1)}
              {td(<span className="font-semibold">Output Observed</span>, 2)}
            </tr>

            {/* Rows 4-20: Verification items (17 data rows) */}
            {Array.from({ length: 17 }).map((_, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                {td(cellInp(idx, "input", "Input"), 1)}
                {td(cellInp(idx, "output", "Output"), 2)}
              </tr>
            ))}

            {/* Row 21: Signature row */}
            <tr className="bg-muted/30">
              {td(
                <div className="flex justify-between text-[10px]">
                  <span>Checked By: {inp("checked_by", "Name")}</span>
                  <span>Reviewed And Approved By: {inp("reviewed_and_approved_by", "Name")}</span>
                </div>,
                3
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
