// ============================================================================
// F/41 — Competence Gap Analyses Form
// WORD: 18R × 32C — Same structure as F/40 but Available/Got labels
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";
import { Plus, Trash2 } from "lucide-react";


export interface F41Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

// 32 cols: Sr(1) + NameDesignation(3) + QualAvail(2) + ExpAvail(3) + SkillAvail(3) + TrainingGot(20)
interface RowData {
  srNo: string;
  name: string; designation: string;
  qualAvail: string; qualNote: string;
  expAvail: string; expNote: string; expExtra: string;
  skillAvail: string; skillNote: string; skillExtra: string;
  training: string[]; // length 20
}

function emptyRow(i: number): RowData {
  return {
    srNo: String(i + 1), name: "", designation: "",
    qualAvail: "", qualNote: "",
    expAvail: "", expNote: "", expExtra: "",
    skillAvail: "", skillNote: "", skillExtra: "",
    training: Array.from({ length: 20 }, () => ""),
  };
}

function parseRows(d: Record<string, unknown>, count: number = 14): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw.map((r: Record<string, unknown>, i: number) => ({
      srNo: String(i + 1),
      name: String(r.name || ""), designation: String(r.designation || ""),
      qualAvail: String(r.qualAvail || r.qualification || ""), qualNote: String(r.qualNote || ""),
      expAvail: String(r.expAvail || r.experience || ""), expNote: String(r.expNote || ""), expExtra: String(r.expExtra || ""),
      skillAvail: String(r.skillAvail || r.skill || ""), skillNote: String(r.skillNote || ""), skillExtra: String(r.skillExtra || ""),
      training: Array.from({ length: 20 }, (_, j) => String(r[`training${j + 1}`] || "")),
    }));
  }
  return Array.from({ length: count }, (_, i) => emptyRow(i));
}

export function F41Template({ data, isTemplate = true, editMode = false, onChange, className }: F41Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const updateTraining = useCallback((idx: number, tIdx: number, value: string) => {
    setRows(prev => {
      const next = [...prev];
      const training = [...next[idx].training];
      training[tIdx] = value;
      next[idx] = { ...next[idx], training };
      return next;
    });
    const updated = [...rows];
    const training = [...updated[idx].training];
    training[tIdx] = value;
    updated[idx] = { ...updated[idx], training };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, emptyRow(prev.length)]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={String(rows[idx]?.[key] || "")} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-[10px]">{String(rows[idx]?.[key] || "")}</span>
    );

  const tInp = (idx: number, tIdx: number) =>
    editMode ? (
      <input className="w-full bg-transparent text-[9px] px-0 border-none outline-none"
        value={rows[idx]?.training[tIdx] || ""} onChange={e => updateTraining(idx, tIdx, e.target.value)} />
    ) : (
      <span className="text-[9px]">{rows[idx]?.training[tIdx] || ""}</span>
    );

  const th = "border border-border p-1 text-[9px] font-semibold bg-muted";

  // ── Mobile fallback ──
  const mobileView = (
    <div className="md:hidden space-y-2 text-xs p-2">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-border rounded p-2 space-y-1">
          <div className="font-semibold">#{row.srNo || idx + 1} — {row.name || "—"} / {row.designation || "—"}</div>
          <div>Qual Avail: {row.qualAvail || "—"}</div>
          <div>Exp Avail: {row.expAvail || "—"}</div>
          <div>Skill Avail: {row.skillAvail || "—"}</div>
          <div className="text-[9px] text-muted-foreground">Training Got: {row.training.filter(Boolean).length}/20</div>
        </div>
      ))}
    </div>
  );

  return (
    <FormDocument formCode="F/41" formName="Competence Gap Analyses Form" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Row 0-1: Header block (32-col grid) ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <colgroup><col span={32} /></colgroup>
          <tbody>
            {/* Row 0 */}
            <tr>
              <td colSpan={10} className="border border-border p-2 font-bold bg-primary/5 text-sm">Competence Gap Analyses Form</td>
              <td colSpan={11} className="border border-border p-2 bg-primary/5 text-xs">
                Reviewed By: {val(d, "reviewed_by") || (ph ? "___" : "")}
              </td>
              <td colSpan={8} className="border border-border p-2 bg-primary/5"></td>
              <td colSpan={3} className="border border-border p-2 bg-primary/5 text-right text-xs">
                F/41 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
            {/* Row 1 */}
            <tr>
              <td colSpan={10} className="border border-border p-2 font-bold bg-primary/5 text-sm">Competence Gap Analyses Form</td>
              <td colSpan={11} className="border border-border p-2 bg-primary/5 text-xs">
                Reviewed On: {val(d, "reviewed_on") || (ph ? "___" : "")}
              </td>
              <td colSpan={8} className="border border-border p-2 bg-primary/5"></td>
              <td colSpan={3} className="border border-border p-2 bg-primary/5 text-right text-xs">
                F/41 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
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
              <th className={th} rowSpan={2}>Sr. No.</th>
              <th className={th} colSpan={3}>Name &amp; Designation</th>
              <th className={th} colSpan={2}>Qualification Available</th>
              <th className={th} colSpan={3}>Experience Available</th>
              <th className={th} colSpan={3}>Skill Available</th>
              <th className={th} colSpan={20}>Type of Training Got</th>
              {editMode && <th className={cn(th, "w-[24px]")} rowSpan={2}></th>}
            </tr>
            {/* Row 3: Sub-headers */}
            <tr className="bg-muted">
              <th className={th}>Name</th><th className={th}>Designation</th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th><th className={th}></th>
              {Array.from({ length: 20 }, (_, i) => (
                <th key={i} className={th}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="group hover:bg-muted/50">
                <td className="border border-border p-0.5 text-center">{idx + 1}</td>
                {/* Name & Designation: 3 cols */}
                <td className="border border-border p-0.5">{cellInp(idx, "name", "Name")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "designation", "Desig")}</td>
                <td className="border border-border p-0.5"></td>
                {/* Qualification Available: 2 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "qualAvail", "Avail")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "qualNote", "")}</td>
                {/* Experience Available: 3 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expAvail", "Avail")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expNote", "")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expExtra", "")}</td>
                {/* Skill Available: 3 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillAvail", "Avail")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillNote", "")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillExtra", "")}</td>
                {/* Training Got: 20 cols */}
                {Array.from({ length: 20 }, (_, tIdx) => (
                  <td key={tIdx} className="border border-border p-0 text-center">{tInp(idx, tIdx)}</td>
                ))}
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

      {/* Signature */}
      <div className="border border-t-2 border-border text-xs mt-1 p-1.5">
        Authorised Person: {val(d, "authorised_by") || (ph ? "___" : "")}
      </div>
    </FormDocument>
  );
}
