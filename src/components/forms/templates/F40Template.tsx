// ============================================================================
// F/40 — Competence Matrix
// DOCX: 32C x 18R — Wide matrix: Designation/Qualification/Experience/Skill/Training
// Strategy: Horizontal scroll table with 5 training topic slots
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F40Props {
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
  srNo: string; designation: string;
  qualReq: string; qualAvail: string;
  expReq: string; expAvail: string;
  skillReq: string; skillAvail: string;
  training1: string; training2: string; training3: string; training4: string; training5: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, (_, i) => ({
    srNo: String(i + 1), designation: "", qualReq: "", qualAvail: "", expReq: "", expAvail: "", skillReq: "", skillAvail: "", training1: "", training2: "", training3: "", training4: "", training5: "",
  }));
}

export function F40Template({ data, isTemplate = true, editMode = false, onChange, className }: F40Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { srNo: String(prev.length + 1), designation: "", qualReq: "", qualAvail: "", expReq: "", expAvail: "", skillReq: "", skillAvail: "", training1: "", training2: "", training3: "", training4: "", training5: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-[10px]">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[3fr_2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Competence Matrix</div>
        <div className="p-2 border-l border-black bg-primary/5 text-xs">
          <div>Reviewed By: {val(d, "reviewed_by") || (ph ? "___" : "")}</div>
          <div className="mt-1">Reviewed On: {val(d, "reviewed_on") || (ph ? "___" : "")}</div>
        </div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/40 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 w-[30px]" rowSpan={2}>Sr.</th>
              <th className="border border-black p-1" rowSpan={2}>Designation</th>
              <th className="border border-black p-1" colSpan={2}>Qualification</th>
              <th className="border border-black p-1" colSpan={2}>Experience</th>
              <th className="border border-black p-1" colSpan={2}>Skill</th>
              <th className="border border-black p-1" colSpan={5}>Type of Training Required</th>
              {editMode && <th className="border border-black p-1 w-[24px]" rowSpan={2}></th>}
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-[9px]">Req.</th>
              <th className="border border-black p-1 text-[9px]">Avail.</th>
              <th className="border border-black p-1 text-[9px]">Req.</th>
              <th className="border border-black p-1 text-[9px]">Avail.</th>
              <th className="border border-black p-1 text-[9px]">Req.</th>
              <th className="border border-black p-1 text-[9px]">Avail.</th>
              <th className="border border-black p-1">1</th>
              <th className="border border-black p-1">2</th>
              <th className="border border-black p-1">3</th>
              <th className="border border-black p-1">4</th>
              <th className="border border-black p-1">5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="group hover:bg-gray-50/50">
                <td className="border border-black p-0.5 text-center">{idx + 1}</td>
                <td className="border border-black p-0.5">{cellInp(idx, "designation", "Desig")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "qualReq", "R")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "qualAvail", "A")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "expReq", "R")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "expAvail", "A")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "skillReq", "R")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "skillAvail", "A")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "training1", "•")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "training2", "•")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "training3", "•")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "training4", "•")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "training5", "•")}</td>
                {editMode && rows.length > 1 && (
                  <td className="border border-black p-0.5 text-center">
                    <button onClick={() => removeRow(idx)} className="text-destructive hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
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
      <div className="border border-t-2 border-black text-xs mt-1 p-1.5">
        Authorised Person: {val(d, "authorised_by") || (ph ? "___" : "")}
      </div>
    </div>
  );
}