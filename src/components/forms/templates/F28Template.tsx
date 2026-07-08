// ============================================================================
// F/28 — Training Attendance Sheet
// EXACT MATCH of the original DOCX template — VEZLOO corporate format
// Header: VEZLOO | Training Attendance Sheet | F/28 Rev No. Page No.
// Metadata: Topic | Department | Conducted By | Designation | Signature | Date
// Table: Sl No | Name Of The Participant | Department | ID NO. | Training Date | Signature
// Footer: TRAINER'S SIGNATURE: ____________
// ============================================================================

import React, { useMemo, useCallback, useState, useEffect } from "react";
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

interface AttendeeRow {
  sl_no: number;
  name: string;
  department: string;
  id_no: string;
  date: string;
  signature: string;
}

function parseAttendees(d: Record<string, unknown>): AttendeeRow[] {
  const raw = d.attendees || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((a: Record<string, unknown>, i: number) => ({
      sl_no: Number(a.sl_no ?? a.slNo ?? (i + 1)),
      name: String(a.name ?? ""),
      department: String(a.department ?? ""),
      id_no: String(a.id_no ?? a.idNo ?? a.id ?? ""),
      date: String(a.date ?? a.training_date ?? a.trainingDate ?? ""),
      signature: String(a.signature ?? a.signed_by ?? ""),
    }));
  }
  return [];
}

export function F28Template({ data, isTemplate = true, editMode = false, onChange, className }: F28Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const initialRows = useMemo(() => parseAttendees(d), [d.attendees, d.items, d.rows]);
  const [rows, setRows] = useState<AttendeeRow[]>(initialRows);

  useEffect(() => { setRows(initialRows); }, [initialRows]);

  const updateRow = useCallback((idx: number, key: keyof AttendeeRow, value: string | number) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("attendees", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { sl_no: prev.length + 1, name: "", department: "", id_no: "", date: "", signature: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sl_no: i + 1 })));
  }, []);

  // Ensure at least 20 data rows for DOCX fidelity
  const displayRows = useMemo(() => {
    const minRows = 20;
    if (rows.length >= minRows) return rows;
    const padded = [...rows];
    while (padded.length < minRows) {
      padded.push({ sl_no: padded.length + 1, name: "", department: "", id_no: "", date: "", signature: "" });
    }
    return padded;
  }, [rows]);

  const metaField = (label: string, key: string, full = false) => (
    <div className={cn("flex items-center gap-1", full ? "col-span-1" : "")}>
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}:</span>
      {editMode ? (
        <input
          className="flex-1 bg-transparent text-[11px] outline-none border-b border-slate-300 dark:border-gray-600 pb-0.5 min-w-0"
          value={val(d, key)}
          onChange={e => onChange?.(key, e.target.value)}
          placeholder=""
        />
      ) : (
        <span className="text-[11px] text-slate-800 dark:text-slate-200 truncate">{val(d, key) || (ph ? "" : "")}</span>
      )}
    </div>
  );

  return (
    <div className={cn("w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg overflow-hidden", className)}>
      {/* ── VEZLOO Corporate Header (DOCX Header Table 1) ── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-950 dark:to-blue-800 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">VEZLOO</h2>
            <p className="text-xs text-blue-200">Training Attendance Sheet</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">F/28</p>
            <p className="text-[10px] text-blue-200">Rev No. {val(d, "serial") || "F/28-001"} &nbsp;|&nbsp; Page No. 1</p>
          </div>
        </div>
      </div>

      {/* ── Metadata Grid (DOCX Header Table 2: 3×4) ── */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {metaField("Topic", "course_name")}
          {metaField("Department", "department")}
          {metaField("Conducted By", "trainer")}
          {metaField("Designation", "designation")}
          {metaField("Signature", "trainer_signature")}
          {metaField("Date of Training", "date")}
        </div>
      </div>

      {/* ── 6-Column Attendance Table (21 rows: 1 header + 20 data) ── */}
      <div className="px-6 py-4">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 dark:border-gray-600">
            <thead>
              <tr className="bg-slate-100 dark:bg-gray-800">
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center w-12">Sl No</th>
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">Name Of The Participant</th>
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">Department</th>
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center w-20">ID NO.</th>
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center w-28">Training Date</th>
                <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">Signature</th>
                {editMode && <th className="border border-slate-300 dark:border-gray-600 px-3 py-2 text-center w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-slate-50/50 dark:bg-gray-800/30"}>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-center text-slate-600 dark:text-slate-400">
                    {editMode ? (
                      <input className="w-10 bg-transparent text-xs text-center outline-none" type="number" min={1} value={row.sl_no} onChange={e => updateRow(idx, "sl_no", parseInt(e.target.value) || idx + 1)} />
                    ) : (
                      row.sl_no
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200">
                    {editMode ? (
                      <input className="w-full bg-transparent text-xs outline-none border-b border-border dark:border-gray-600" value={row.name} onChange={e => updateRow(idx, "name", e.target.value)} placeholder="Name" />
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200">
                    {editMode ? (
                      <input className="w-full bg-transparent text-xs outline-none border-b border-border dark:border-gray-600" value={row.department} onChange={e => updateRow(idx, "department", e.target.value)} placeholder="Department" />
                    ) : (
                      row.department
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200">
                    {editMode ? (
                      <input className="w-16 bg-transparent text-xs text-center outline-none border-b border-border dark:border-gray-600" value={row.id_no} onChange={e => updateRow(idx, "id_no", e.target.value)} placeholder="ID" />
                    ) : (
                      row.id_no
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200">
                    {editMode ? (
                      <input className="w-24 bg-transparent text-xs text-center outline-none border-b border-border dark:border-gray-600" value={row.date} onChange={e => updateRow(idx, "date", e.target.value)} placeholder="DD/MM/YYYY" />
                    ) : (
                      row.date
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-gray-600 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200">
                    {editMode ? (
                      <input className="w-full bg-transparent text-xs outline-none border-b border-border dark:border-gray-600" value={row.signature} onChange={e => updateRow(idx, "signature", e.target.value)} placeholder="Signature" />
                    ) : (
                      row.signature
                    )}
                  </td>
                  {editMode && (
                    <td className="border border-slate-300 dark:border-gray-600 px-1 py-1.5 text-center">
                      <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 transition-colors" title="Remove row">
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
          <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            <Plus className="w-3 h-3" /> Add Attendee
          </button>
        )}
      </div>

      {/* ── TRAINER'S SIGNATURE (DOCX: single line at bottom) ── */}
      <div className="px-6 pb-6">
        <div className="flex items-end gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">TRAINER'S SIGNATURE:</span>
          {editMode ? (
            <input
              className="flex-1 bg-transparent text-xs outline-none border-b border-slate-300 dark:border-gray-600 pb-0.5"
              value={val(d, "trainer_signature") || val(d, "conducted_by")}
              onChange={e => {
                onChange?.("trainer_signature", e.target.value);
                onChange?.("conducted_by", e.target.value);
              }}
              placeholder="Trainer name"
            />
          ) : (
            <span className="flex-1 border-b border-slate-300 dark:border-gray-600 pb-0.5 text-xs text-slate-800 dark:text-slate-200">
              {val(d, "trainer_signature") || val(d, "conducted_by") || ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default F28Template;
