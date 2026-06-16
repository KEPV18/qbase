// ============================================================================
// F/28 — Training Attendance Sheet
// EXACT MATCH of the original DOCX template — 22 rows × 6 columns
// ============================================================================

import React, { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F28Props {
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

interface RowData {
  slNo: string; name: string; department: string; idNo: string; trainingDate: string; signature: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  // Return empty array if no data — dynamic rows will build from user input
  return [];
}

export function F28Template({ data, isTemplate = true, editMode = false, onChange, className }: F28Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  // useMemo so rows always reflect current data — no stale state trap
  const initialRows = useMemo(() => parseRows(d), [d.items, d.rows]);
  const [rows, setRows] = React.useState<RowData[]>(initialRows);

  // Reset rows when external data changes
  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { slNo: String(prev.length + 1), name: "", department: "", idNo: "", trainingDate: "", signature: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, slNo: String(i + 1) })));
  }, []);

  const inp = (key: string, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 py-0.5 border-0 border-b border-gray-300 dark:border-gray-600 outline-none" value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs text-gray-900 dark:text-gray-100">{val(d, key) || ""}</span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 py-0.5 border-0 border-b border-gray-300 dark:border-gray-600 outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs text-gray-900 dark:text-gray-100">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
        <tbody>
          {/* Title row */}
          <tr>
            <td colSpan={6} className="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center font-bold text-sm text-gray-900 dark:text-gray-100">
              Training Attendance Sheet
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              Sr. No. 🡪 {val(d, "serial") || ""}
            </td>
            <td colSpan={2} className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              Training Topic: {inp("training_topic", "Topic")}
            </td>
            <td colSpan={2} className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              Date 🡪 {inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* Column headers */}
          <tr className="bg-gray-50 dark:bg-gray-800">
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold text-center">Sl No</td>
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold">Name Of The Participant</td>
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold">Department</td>
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold">ID NO.</td>
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold">Training Date</td>
            <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-semibold">Signature</td>
          </tr>

          {rows.map((row, idx) => (
            <tr key={idx} className="relative group">
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs text-center">{idx + 1}</td>
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">{cellInp(idx, "name", "Name")}</td>
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">{cellInp(idx, "department", "Dept")}</td>
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">{cellInp(idx, "idNo", "ID")}</td>
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">{cellInp(idx, "trainingDate", "Date")}</td>
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">{cellInp(idx, "signature", "Sign")}</td>
              {editMode && rows.length > 1 && (
                <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                  <button onClick={() => removeRow(idx)} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                </td>
              )}
            </tr>
          ))}

          {editMode && (
            <tr>
              <td colSpan={6} className="border border-gray-400 dark:border-gray-600 px-2 py-1">
                <button onClick={addRow} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </td>
            </tr>
          )}

          {/* Footer: Trainer + Conducted By */}
          {rows.length > 0 && (
            <tr>
              <td colSpan={6} className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-xs">
                <div className="flex gap-4">
                  <span><strong>TRAINER'S SIGNATURE:</strong> {inp("trainer", "Name")}</span>
                  <span><strong>HR:</strong> {inp("conducted_by", "Name")}</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}