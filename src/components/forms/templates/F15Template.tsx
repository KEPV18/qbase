// ============================================================================
// F/15 — Approved Vendor List
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 1 table, 8 rows, 6 cols.
// R0: Title (gs=4) + Rev No (gs=2)
// R1: Date of Approval | Name of Supplier | Scope of Supply | Approval Criteria (gs=2) | Remarks
// R2-7: Data rows (6 vendors)
// Pillar 1: Horizontal Matrix — 5-column table preserved
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F15Props {
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
  dateApproval: string; supplierName: string; scopeOfSupply: string;
  approvalCriteria: string; remarks: string;
}

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return [{ dateApproval: "", supplierName: "", scopeOfSupply: "", approvalCriteria: "", remarks: "" }];
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
    onChange?.("items", updated);
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
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[4fr_2fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Approved Vendor List</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/15, Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Year ── */}
      <div className="border-x border-b border-border text-xs p-1.5">
        Year: {val(d, "year") || (ph ? "2026" : "—")}
      </div>

      {/* ── 5-Column Table Header ── */}
      <div className="grid grid-cols-[90px_1fr_1fr_1fr_1fr] border-x border-b border-border text-[10px] font-semibold bg-muted">
        <div className="p-1 border-r border-border">Date of Approval</div>
        <div className="p-1 border-r border-border">Name of Supplier</div>
        <div className="p-1 border-r border-border">Scope of Supply</div>
        <div className="p-1 border-r border-border">Approval Criteria</div>
        <div className="p-1">Remarks</div>
      </div>

      {/* ── Data Rows ── */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[90px_1fr_1fr_1fr_1fr] border-x border-b border-border text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-border">{cellInp(idx, "dateApproval", "Date")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "supplierName", "Supplier")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "scopeOfSupply", "Scope")}</div>
          <div className="p-1 border-r border-border">{cellInp(idx, "approvalCriteria", "Criteria")}</div>
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

      {/* ── Footer Signatures ── */}
      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Prepared By: {val(d, "prepared_by") || (ph ? "___" : "")}</div>
        <div>Approved By: {val(d, "approved_by") || (ph ? "___" : "")}</div>
      </div>
    </div>
  );
}
