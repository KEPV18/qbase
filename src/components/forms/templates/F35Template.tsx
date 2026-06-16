// ============================================================================
// F/35 — Design and Development Monitoring Register
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F35Props {
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
  productName: string; specification: string; newSpecification: string; customerName: string; reasonOfDevelopment: string; startDate: string; targetDate: string; progress: string; remarks: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    productName: "", specification: "", newSpecification: "", customerName: "", reasonOfDevelopment: "", startDate: "", targetDate: "", progress: "", remarks: "",
  }));
}

export function F35Template({ data, isTemplate = true, editMode = false, onChange, className }: F35Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { productName: "", specification: "", newSpecification: "", customerName: "", reasonOfDevelopment: "", startDate: "", targetDate: "", progress: "", remarks: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      <div className="grid grid-cols-[3fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Design and Development Monitoring Register</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/35 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_70px_70px_60px_80px] border-x border-b border-black text-[9px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black">Product Name</div>
        <div className="p-1 border-r border-black">Specification</div>
        <div className="p-1 border-r border-black">New Specification</div>
        <div className="p-1 border-r border-black">Customer</div>
        <div className="p-1 border-r border-black">Reason for Development</div>
        <div className="p-1 border-r border-black">Start Date</div>
        <div className="p-1 border-r border-black">Target Date</div>
        <div className="p-1 border-r border-black">Progress</div>
        <div className="p-1">Remarks</div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_70px_70px_60px_80px] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black">{cellInp(idx, "productName", "Product")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "specification", "Spec")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "newSpecification", "New Spec")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "customerName", "Customer")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "reasonOfDevelopment", "Reason")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "startDate", "Date")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "targetDate", "Date")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "progress", "%")}</div>
          <div className="p-1">{cellInp(idx, "remarks", "Notes")}</div>
          {editMode && rows.length > 1 && (
            <button onClick={() => removeRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {editMode && (
        <button onClick={addRow} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Authorised By: {inp("authorised_by", "Name")}</div>
      </div>
    </div>
  );
}