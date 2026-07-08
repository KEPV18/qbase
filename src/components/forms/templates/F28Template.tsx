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
import { FormDocument, FormHeader, FormMetaGrid, FormTable, FormTableRow, FormTableCell, val } from "../FormKit";

export interface F28Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
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

  const displayRows = useMemo(() => {
    const minRows = 20;
    if (rows.length >= minRows) return rows;
    const padded = [...rows];
    while (padded.length < minRows) {
      padded.push({ sl_no: padded.length + 1, name: "", department: "", id_no: "", date: "", signature: "" });
    }
    return padded;
  }, [rows]);

  return (
    <FormDocument formCode="F/28" formName="Training Attendance Sheet" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      {/* Metadata Grid — canonical keys matching DB form_data */}
      <FormMetaGrid
        data={d}
        editMode={editMode}
        onChange={onChange}
        formCode="F/28"
        fields={[
          { label: "Topic", key: "topic" },
          { label: "Department", key: "department" },
          { label: "Conducted By", key: "conducted_by" },
          { label: "Designation", key: "designation" },
          { label: "Signature", key: "trainer_signature" },
          { label: "Date of Training", key: "training_date", isDate: true },
        ]}
      />

      {/* 6-Column Attendance Table */}
      <div className="px-6 py-4">
        <FormTable
          formCode="F/28"
          columns={[
            { key: "sl_no", label: "Sl No", width: "w-12", align: "center" },
            { key: "name", label: "Name Of The Participant" },
            { key: "department", label: "Department" },
            { key: "id_no", label: "ID NO.", width: "w-20", align: "center" },
            { key: "date", label: "Training Date", width: "w-28", align: "center" },
            { key: "signature", label: "Signature" },
          ]}
        >
          {displayRows.map((row, idx) => (
            <FormTableRow key={idx} index={idx}>
              <FormTableCell align="center">
                {editMode ? (
                  <input className="w-10 bg-transparent text-xs text-center outline-none" type="number" min={1} value={row.sl_no} onChange={e => updateRow(idx, "sl_no", parseInt(e.target.value) || idx + 1)} />
                ) : row.sl_no}
              </FormTableCell>
              <FormTableCell>
                {editMode ? (
                  <input className="w-full bg-transparent text-xs outline-none border-b border-dashed border-foreground/40" value={row.name} onChange={e => updateRow(idx, "name", e.target.value)} placeholder="Name" />
                ) : row.name}
              </FormTableCell>
              <FormTableCell>
                {editMode ? (
                  <input className="w-full bg-transparent text-xs outline-none border-b border-dashed border-foreground/40" value={row.department} onChange={e => updateRow(idx, "department", e.target.value)} placeholder="Department" />
                ) : row.department}
              </FormTableCell>
              <FormTableCell align="center">
                {editMode ? (
                  <input className="w-16 bg-transparent text-xs text-center outline-none border-b border-dashed border-foreground/40" value={row.id_no} onChange={e => updateRow(idx, "id_no", e.target.value)} placeholder="ID" />
                ) : row.id_no}
              </FormTableCell>
              <FormTableCell align="center">
                {editMode ? (
                  <input className="w-24 bg-transparent text-xs text-center outline-none border-b border-dashed border-foreground/40" value={row.date} onChange={e => updateRow(idx, "date", e.target.value)} placeholder="DD/MM/YYYY" />
                ) : row.date}
              </FormTableCell>
              <FormTableCell>
                {editMode ? (
                  <input className="w-full bg-transparent text-xs outline-none border-b border-dashed border-foreground/40" value={row.signature} onChange={e => updateRow(idx, "signature", e.target.value)} placeholder="Signature" />
                ) : row.signature}
              </FormTableCell>
            </FormTableRow>
          ))}
        </FormTable>

        {editMode && (
          <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            <Plus className="w-3 h-3" /> Add Attendee
          </button>
        )}
      </div>

      {/* TRAINER'S SIGNATURE */}
      <div className="px-6 pb-6">
        <div className="flex items-end gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">TRAINER'S SIGNATURE:</span>
          {editMode ? (
            <input
              className="flex-1 bg-transparent text-xs outline-none border-b border-dashed border-foreground/40 pb-0.5"
              value={val(d, "trainer_signature") || val(d, "conducted_by")}
              onChange={e => {
                onChange?.("trainer_signature", e.target.value);
                onChange?.("conducted_by", e.target.value);
              }}
              placeholder="Trainer name"
            />
          ) : (
            <span className="flex-1 border-b border-dashed border-foreground/30 pb-0.5 text-xs text-foreground">
              {val(d, "trainer_signature") || val(d, "conducted_by") || ""}
            </span>
          )}
        </div>
      </div>
    </FormDocument>
  );
}

export default F28Template;
