// ============================================================================
// F/23 — Master List of Records
// DOCX: 16 rows × 10 columns
// R0: Title merged cols 0-7, rev cols 8-9
// R1: Department merged cols 0-5, Date merged cols 6-9
// R2: 8 headers (Retention Period = 2 cols) → 10 cols total
// R3-R15: 13 data rows
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F23Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface RowData {
  record_no: string;
  title: string;
  format_no: string;
  frequency: string;
  method_of_filing: string;
  access: string;
  storage_place: string;
  retention_period: string;
  person_responsible: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.records || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as RowData[];
  }
  return [];
}

const COL_KEYS: (keyof RowData)[] = [
  "record_no", "title", "format_no", "frequency", "method_of_filing",
  "access", "storage_place", "retention_period", "person_responsible",
];

const COL_HEADERS = [
  "Record No.",
  "Title Of Record",
  "Format No. (If Any)",
  "Frequency Of Collection",
  "Method Of Filing",
  "Access",
  "Storage Place",
  "Retention Period",
  "Person Responsible",
];

// 10-col widths for 9 headers (retention spans 2)
const COL_WIDTHS = ["w-[6%]", "w-[16%]", "w-[8%]", "w-[10%]", "w-[10%]", "w-[7%]", "w-[8%]", "w-[14%]", "w-[14%]"];

export function F23Template({ data, isTemplate = true, editMode = false, onChange, className }: F23Props) {
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
    onChange?.("records", updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, {
      record_no: "", title: "", format_no: "", frequency: "",
      method_of_filing: "", access: "", storage_place: "",
      retention_period: "", person_responsible: "",
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

  return (
    <FormDocument formCode="F/23" formName="Master List of Records" serial={val(d, "serial")} sectionName="Management & Documentation">
      {/* 16 rows × 10 columns table matching Word structure */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {/* Row 0: Title merged cols 0-7, Rev No cols 8-9 */}
            <tr>
              <td colSpan={8} className="border border-border p-2 font-bold text-sm bg-primary/5 text-center">
                Master List of Records
              </td>
              <td colSpan={2} className="border border-border p-2 text-right text-xs bg-primary/5">
                F/23 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: Department merged cols 0-5, Date merged cols 6-9 */}
            <tr>
              <td colSpan={6} className="border border-border p-1.5 text-xs">
                <span className="font-semibold">Department → </span>{inp("department", "Department", "w-40")}
              </td>
              <td colSpan={4} className="border border-border p-1.5 text-xs">
                <span className="font-semibold">Date → </span>{inp("date", "DD/MM/YYYY", "w-28")}
              </td>
            </tr>

            {/* Row 2: Headers — 9 headers in 10 cols (Retention spans 2) */}
            <tr className="bg-muted/50">
              {COL_HEADERS.map((h, i) => (
                <td
                  key={i}
                  colSpan={i === 7 ? 2 : 1}
                  className="border border-border px-1.5 py-1 text-left font-semibold whitespace-nowrap"
                >
                  {h}
                </td>
              ))}
              {editMode && <td className="border border-border px-1.5 py-1 w-8">#</td>}
            </tr>

            {/* Rows 3–15: 13 data rows */}
            {rows.map((row, idx) => (
              <tr key={idx} className={cn(idx % 2 === 1 && "bg-muted/20")}>
                {COL_KEYS.map((key) => (
                  <td key={key} className="border border-border px-1.5 py-0.5">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent border-b border-dashed border-foreground/30 outline-none text-[10px]"
                        value={row[key]}
                        onChange={(e) => updateRow(idx, key, e.target.value)}
                      />
                    ) : (
                      <span>{row[key]}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td className="border border-border px-1 py-0.5 text-center">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove row"
                    >
                      <Trash2 className="h-3 w-3" />
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
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
        >
          <Plus className="h-3 w-3" /> Add Record Entry
        </button>
      )}

      {/* Footer */}
      <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t">
        <div>
          <span className="text-foreground/50">Maintained By: </span>
          <span className="font-medium">{val(d, "maintained_by") || (ph ? "Ahmed Khaled" : "")}</span>
        </div>
      </div>
    </FormDocument>
  );
}
