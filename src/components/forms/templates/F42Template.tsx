// ============================================================================
// F/42 — Annual Training Program
// WORD: 11R × 14C — Headers + Mode(2) + Effectiveness(3) + Actual Date + Remarks
// ============================================================================

import React, { useState, useCallback } from "react";
import { FormDocument, val } from "../FormKit";
import { Plus, Trash2 } from "lucide-react";


export interface F42Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

// 14 cols: TopicNo(1) + Title(1) + Participants(1) + IdentifiedBy(1) + Reason(1) + Mode(2) + Faculty(1) + PlannedDate(1) + ActualDate(1) + Effectiveness(3) + Remarks(1)
interface RowData {
  topicNo: string; title: string; participants: string;
  identifiedBy: string; reason: string;
  modeInternal: string; modeExternal: string;
  faculty: string; plannedDate: string; actualDate: string;
  effMethod: string; effBy: string; effNote: string;
  remarks: string;
}

function emptyRow(): RowData {
  return {
    topicNo: "", title: "", participants: "", identifiedBy: "", reason: "",
    modeInternal: "", modeExternal: "", faculty: "", plannedDate: "", actualDate: "",
    effMethod: "", effBy: "", effNote: "", remarks: "",
  };
}

function parseRows(d: Record<string, unknown>, count: number = 7): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw.map((r: Record<string, unknown>) => ({
      topicNo: String(r.topicNo || ""), title: String(r.title || ""),
      participants: String(r.participants || ""), identifiedBy: String(r.identifiedBy || ""),
      reason: String(r.reason || ""),
      modeInternal: String(r.modeInternal || ""), modeExternal: String(r.modeExternal || ""),
      faculty: String(r.faculty || ""), plannedDate: String(r.plannedDate || ""),
      actualDate: String(r.actualDate || ""),
      effMethod: String(r.effMethod || ""), effBy: String(r.effBy || ""),
      effNote: String(r.effNote || ""), remarks: String(r.remarks || ""),
    }));
  }
  return Array.from({ length: count }, () => emptyRow());
}

export function F42Template({ data, isTemplate = true, editMode = false, onChange, className }: F42Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => { setRows(prev => [...prev, emptyRow()]); }, []);
  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const inp = (key: string, label: string, width: string = "w-28") =>
    editMode ? (
      <input className="border-b border-dashed border-foreground/40 bg-transparent text-xs px-1" style={{ width }}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="border-b border-dashed border-foreground/30 px-1 inline-block" style={{ width }}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-[10px]">{rows[idx]?.[key] || ""}</span>
    );

  const th = "border border-border p-1 text-[9px] font-semibold bg-muted";

  // ── Mobile fallback ──
  const mobileView = (
    <div className="md:hidden space-y-2 text-xs p-2">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-border rounded p-2 space-y-1">
          <div className="font-semibold">{row.topicNo || idx + 1}. {row.title || "—"}</div>
          <div>Participants: {row.participants || "—"}</div>
          <div>Mode: {row.modeInternal ? "Int" : ""} {row.modeExternal ? "Ext" : ""}</div>
          <div>Planned: {row.plannedDate || "—"} | Actual: {row.actualDate || "—"}</div>
        </div>
      ))}
    </div>
  );

  return (
    <FormDocument formCode="F/42" formName="Annual Training Program" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Row 0: Title ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <colgroup><col span={14} /></colgroup>
          <tbody>
            <tr>
              <td colSpan={12} className="border border-border p-2 font-bold bg-primary/5 text-sm">Annual Training Program</td>
              <td colSpan={2} className="border border-border p-2 bg-primary/5 text-right text-xs">
                F/42 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
            {/* Row 1: Date/Year */}
            <tr>
              <td colSpan={6} className="border border-border p-1.5 text-xs">Date → {inp("date", "Date")}</td>
              <td colSpan={8} className="border border-border p-1.5 text-xs">Year → {inp("year", "Year")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile fallback */}
      {mobileView}

      {/* ── Row 2-3: Column headers + Sub-headers ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] hidden md:table">
          <thead>
            {/* Row 2: Main headers */}
            <tr className="bg-muted">
              <th className={th}>Topic No.</th>
              <th className={th}>Title Of Training</th>
              <th className={th}>Participants For Training</th>
              <th className={th}>Identified By</th>
              <th className={th}>Reason For Need Identification</th>
              <th className={th} colSpan={2}>Mode Of Training</th>
              <th className={th}>Faculty</th>
              <th className={th}>Planned Date</th>
              <th className={th}>Actual Date</th>
              <th className={th} colSpan={3}>Effectiveness Checks</th>
              <th className={th}>Remarks / Ref. Of Certificate No.</th>
              {editMode && <th className="w-[24px]"></th>}
            </tr>
            {/* Row 3: Sub-headers */}
            <tr className="bg-muted">
              <th className={th}></th><th className={th}></th><th className={th}></th>
              <th className={th}></th><th className={th}></th>
              <th className={th}>Method</th><th className={th}>By</th>
              <th className={th}></th><th className={th}></th><th className={th}></th>
              <th className={th}></th><th className={th}></th><th className={th}></th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="group hover:bg-muted/50">
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "topicNo", "#")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "title", "Title")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "participants", "Who")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "identifiedBy", "By")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "reason", "Reason")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "modeInternal", "Int.")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "modeExternal", "Ext.")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "faculty", "Name")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "plannedDate", "Date")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "actualDate", "Date")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "effMethod", "Method")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "effBy", "By")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "effNote", "")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "remarks", "Remarks")}</td>
                {editMode && (
                  <td className="border border-border p-0.5 text-center">
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="text-destructive hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button onClick={addRow} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Approval */}
      <div className="border border-t-2 border-border text-xs mt-2 p-1.5">
        Reviewed And Approved By: {inp("approved_by", "Authorised Person", "w-48")}
      </div>
    </FormDocument>
  );
}
