// ============================================================================
// F/23 — Master List of Records
// DOCX: 9-column table with 35 data rows
// Columns: Record No. | Title Of Record | Format No. (If Any) | Frequency
//          Of Collection | Method Of Filing | Access | Storage Place |
//          Retention Period | Person Responsible
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F23Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
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

const COL_KEYS: (keyof RowData)[] = [
  "record_no", "title", "format_no", "frequency", "method_of_filing",
  "access", "storage_place", "retention_period", "person_responsible",
];

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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="border-b pb-2 mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Master List of Records
        </h3>
        <div className="text-xs text-foreground/50">F/23</div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-foreground/50">Serial: </span>
          <span className="font-medium">{val(d, "serial") || (ph ? "F/23-001" : "")}</span>
        </div>
        <div>
          <span className="text-foreground/50">Date: </span>
          <span className="font-medium">{val(d, "date") || (ph ? "01/01/2026" : "")}</span>
        </div>
        <div>
          <span className="text-foreground/50">Department: </span>
          <span className="font-medium">{val(d, "department") || (ph ? "All Departments" : "")}</span>
        </div>
      </div>

      {/* 9-Column Table */}
      <div className="w-full overflow-x-auto border rounded-md">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {COL_HEADERS.map((h, i) => (
                <th key={i} className="border px-1.5 py-1 text-left font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
              {editMode && <th className="border px-1.5 py-1 w-8">#</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="even:bg-muted/20">
                {COL_KEYS.map((key) => (
                  <td key={key} className="border px-1.5 py-0.5">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent border-b border-dashed border-foreground/30 outline-none"
                        value={row[key]}
                        onChange={(e) => updateRow(idx, key, e.target.value)}
                      />
                    ) : (
                      <span>{row[key]}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td className="border px-1 py-0.5 text-center">
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
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
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
    </div>
  );
}
