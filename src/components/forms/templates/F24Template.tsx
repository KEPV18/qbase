// ============================================================================
// F/24 — Objectives & Targets
// DOCX: 9 rows × 18 columns
// R0: Title merged cols 0-9, Rev No cols 10-17
// R1: Department cols 0-3, Year cols 4-17
// R2: Headers with specific colspans → 18 cols total
// R3: Sub-headers
// R4–R8: 5 data rows
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F24Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface RowData {
  criteria: string;
  present_target: string;
  future_target: string;
  program: string;
  results: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.objectives || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as RowData[];
  }
  return [];
}

export function F24Template({ data, isTemplate = true, editMode = false, onChange, className }: F24Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("objectives", updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, {
      criteria: "", present_target: "", future_target: "", program: "", results: "",
    }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[10px] px-1 border-none outline-none"
        value={rows[idx]?.[key] || ""}
        onChange={e => updateRow(idx, key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className="text-[10px] whitespace-pre-wrap">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <FormDocument formCode="F/24" formName="Objectives & Targets" serial={val(d, "serial")} sectionName="Management & Documentation">
      {/* 9 rows × 18 columns table matching Word structure */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {/* Row 0: Title merged cols 0-9, Rev No cols 10-17 */}
            <tr>
              <td colSpan={10} className="border border-border p-2 font-bold text-sm bg-primary/5 text-center">
                Objectives & Targets
              </td>
              <td colSpan={8} className="border border-border p-2 text-right text-xs bg-primary/5">
                F/24 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: Department cols 0-3, Year cols 4-17 */}
            <tr>
              <td colSpan={4} className="border border-border p-1.5 text-xs">
                <span className="font-semibold">Department → </span>{inp("department", "Department", "w-40")}
              </td>
              <td colSpan={14} className="border border-border p-1.5 text-xs">
                <span className="font-semibold">Year → </span>{inp("year", "Year", "w-24")}
              </td>
            </tr>

            {/* Row 2: Column headers — 18 cols total */}
            <tr className="bg-muted/50">
              <td colSpan={4} className="border border-border px-1.5 py-1 text-left font-semibold">
                Quantifiable Criteria / Control Parameters
              </td>
              <td colSpan={2} className="border border-border px-1.5 py-1 text-center font-semibold">
                Present
              </td>
              <td colSpan={2} className="border border-border px-1.5 py-1 text-center font-semibold">
                Future
              </td>
              <td colSpan={2} className="border border-border px-1.5 py-1 text-left font-semibold">
                Program to achieve Objective
              </td>
              <td colSpan={8} className="border border-border px-1.5 py-1 text-center font-semibold">
                Results for the month of
              </td>
            </tr>

            {/* Row 3: Sub-headers for months */}
            <tr className="bg-muted/30">
              <td colSpan={4} className="border border-border px-1 py-0.5"></td>
              <td colSpan={2} className="border border-border px-1 py-0.5 text-center">Target</td>
              <td colSpan={2} className="border border-border px-1 py-0.5 text-center">Target</td>
              <td colSpan={2} className="border border-border px-1 py-0.5"></td>
              <td className="border border-border px-1 py-0.5 text-center">Jan</td>
              <td className="border border-border px-1 py-0.5 text-center">Feb</td>
              <td className="border border-border px-1 py-0.5 text-center">Mar</td>
              <td className="border border-border px-1 py-0.5 text-center">Apr</td>
              <td className="border border-border px-1 py-0.5 text-center">May</td>
              <td className="border border-border px-1 py-0.5 text-center">Jun</td>
              <td className="border border-border px-1 py-0.5 text-center">Jul</td>
              <td className="border border-border px-1 py-0.5 text-center">Aug</td>
              <td className="border border-border px-1 py-0.5 text-center">Sep</td>
              <td className="border border-border px-1 py-0.5 text-center">Oct</td>
              <td className="border border-border px-1 py-0.5 text-center">Nov</td>
              <td className="border border-border px-1 py-0.5 text-center">Dec</td>
            </tr>

            {/* Rows 4–8: 5 data rows */}
            {rows.map((row, idx) => (
              <tr key={idx} className={cn(idx % 2 === 1 && "bg-muted/20")}>
                <td colSpan={4} className="border border-border px-1.5 py-0.5">{cellInp(idx, "criteria", "Criteria")}</td>
                <td colSpan={2} className="border border-border px-1.5 py-0.5 text-center">{cellInp(idx, "present_target", "Target")}</td>
                <td colSpan={2} className="border border-border px-1.5 py-0.5 text-center">{cellInp(idx, "future_target", "Future")}</td>
                <td colSpan={2} className="border border-border px-1.5 py-0.5">{cellInp(idx, "program", "Program")}</td>
                <td colSpan={8} className="border border-border px-1.5 py-0.5 text-center">{cellInp(idx, "results", "Results")}</td>
                {editMode && rows.length > 1 && (
                  <td className="border border-border px-1 py-0.5 text-center">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button
          onClick={addRow}
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline mx-auto"
        >
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Signatures */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Prepared By → {inp("prepared_by", "Prepared By", "w-40")}</div>
        <div>Reviewed By → {inp("reviewed_by", "Reviewed By", "w-40")}</div>
      </div>
    </FormDocument>
  );
}
