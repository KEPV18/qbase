// ============================================================================
// F/15 — Approved Vendor List
// DOCX: 1 table, 8 rows, 6 cols. Simple tabular form:
// R0: Title (gs=4) + Rev No (gs=2)
// R1: Date of Approval | Name of Supplier | Scope of Supply | Approval Criteria (gs=2) | Remarks
// R2-6: Data rows
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F15Props {
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
  dateApproval: string; supplierName: string; scopeOfSupply: string;
  approvalCriteria: string; remarks: string;
}

function parseRows(d: Record<string, unknown>, count: number = 5): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    dateApproval: "", supplierName: "", scopeOfSupply: "", approvalCriteria: "", remarks: "",
  }));
}

export function F15Template({ data, isTemplate = true, editMode = false, onChange, className }: F15Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => {
      const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next;
    });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { dateApproval: "", supplierName: "", scopeOfSupply: "", approvalCriteria: "", remarks: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[4fr_2fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Approved Vendor List</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/15, Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[100px_1.5fr_1.5fr_1.2fr_1fr] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Date of Approval</div>
        <div className="p-1 border-r border-black">Name of Supplier</div>
        <div className="p-1 border-r border-black">Scope of Supply</div>
        <div className="p-1 border-r border-black">Approval Criteria</div>
        <div className="p-1">Remarks</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[100px_1.5fr_1.5fr_1.2fr_1fr] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black">{cellInp(idx, "dateApproval", "Date")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "supplierName", "Supplier")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "scopeOfSupply", "Scope")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "approvalCriteria", "Criteria")}</div>
          <div className="p-1">{cellInp(idx, "remarks", "Remarks")}</div>
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
    </div>
  );
}