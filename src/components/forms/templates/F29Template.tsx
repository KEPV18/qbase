// ============================================================================
// F/29 — Employee Training & Competence Record Sheet
// DOCX: 34C x 22R — Wide matrix: Name/Qualification/Experience/Skill/Training topics
// Strategy: Horizontal scroll for training topic columns (simplified to 5 topic slots)
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F29Props {
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
  srNo: string; name: string; designation: string;
  qualReq: string; qualAvail: string;
  expReq: string; expAvail: string;
  skillAvail: string;
  training1: string; training2: string; training3: string; training4: string; training5: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, (_, i) => ({
    srNo: String(i + 1), name: "", designation: "", qualReq: "", qualAvail: "", expReq: "", expAvail: "", skillAvail: "", training1: "", training2: "", training3: "", training4: "", training5: "",
  }));
}

export function F29Template({ data, isTemplate = true, editMode = false, onChange, className }: F29Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { srNo: String(prev.length + 1), name: "", designation: "", qualReq: "", qualAvail: "", expReq: "", expAvail: "", skillAvail: "", training1: "", training2: "", training3: "", training4: "", training5: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const cellInp = (idx: number, key: keyof RowData, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("bg-transparent text-xs px-0.5 border-none outline-none", width)} value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[3fr_2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Employee Training &amp; Competence Record Sheet</div>
        <div className="p-2 border-l border-black bg-primary/5 text-xs">
          <div>Annual Assessment Done By: {val(d, "assessed_by") || (ph ? "___" : "")}</div>
          <div className="mt-1">Annual Assessment Done On: {val(d, "assessed_on") || (ph ? "___" : "")}</div>
        </div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/29 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Table with horizontal scroll for training columns */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 w-[30px]" rowSpan={2}>Sr.</th>
              <th className="border border-black p-1" colSpan={3}>Name &amp; Designation</th>
              <th className="border border-black p-1" colSpan={2}>Qualification</th>
              <th className="border border-black p-1" colSpan={2}>Experience</th>
              <th className="border border-black p-1" rowSpan={2}>Skill Available</th>
              <th className="border border-black p-1" colSpan={5}>Type of Training (Topic No.)</th>
              {editMode && <th className="border border-black p-1 w-[24px]" rowSpan={2}></th>}
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-black p-1">Name</th>
              <th className="border border-black p-1">Designation</th>
              <th className="border border-black p-1">Req.</th>
              <th className="border border-black p-1">Avail.</th>
              <th className="border border-black p-1">Req.</th>
              <th className="border border-black p-1">Avail.</th>
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
                <td className="border border-black p-0.5">{cellInp(idx, "name", "Name")}</td>
                <td className="border border-black p-0.5">{cellInp(idx, "designation", "Desig")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "qualReq", "R")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "qualAvail", "A")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "expReq", "R")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "expAvail", "A")}</td>
                <td className="border border-black p-0.5 text-center">{cellInp(idx, "skillAvail", "•")}</td>
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

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_1fr] border border-t-2 border-black text-xs mt-1">
        <div className="p-1.5 border-r border-black">Prepared By: {val(d, "prepared_by") || (ph ? "___" : "")}</div>
        <div className="p-1.5">Authorised Person: {val(d, "authorised_by") || (ph ? "___" : "")}</div>
      </div>
    </div>
  );
}