import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F15Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface RowData {
  date_of_approval: string;
  supplier_name: string;
  scope_of_supply: string;
  approval_criteria: string;
  remarks: string;
}

const EMPTY_ROW: RowData = { date_of_approval: "", supplier_name: "", scope_of_supply: "", approval_criteria: "", remarks: "" };

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: 6 }, () => ({ ...EMPTY_ROW }));
}

export function F15Template({ data, isTemplate = true, editMode = false, onChange, className }: F15Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => { setRows(prev => [...prev, { ...EMPTY_ROW }]); }, []);
  const removeRow = useCallback((idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); }, []);

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  const metaInp = (key: string, label: string) =>
    editMode ? (
      <input className="border-b border-dashed border-foreground/40 bg-transparent text-xs px-1 w-full" value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="border-b border-dashed border-foreground/30 px-1 inline-block">{val(d, key) || (ph ? "___" : "")}</span>
    );

  return (
    <FormDocument formCode="F/15" formName="Approved Vendor List" serial={val(d, "serial")} sectionName="Procurement & Vendors">
      {/* ── Desktop: 6-column table (Word: 8 rows × 6 cols) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <tbody>
            {/* Row 0: Title merged cols 0-3, Rev merged cols 4-5 */}
            <tr>
              <td colSpan={4} className="border border-border p-2 font-bold bg-primary/5 text-base">
                Approved Vendor List
              </td>
              <td colSpan={2} className="border border-border p-2 border-l border-border bg-primary/5 text-right text-xs whitespace-nowrap">
                F/15, Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: Approval Criteria spans cols 3-4 */}
            <tr className="bg-muted text-[10px] font-semibold">
              <td className="border border-border p-1">Date of Approval</td>
              <td className="border border-border p-1">Name of Supplier</td>
              <td className="border border-border p-1">Scope of Supply</td>
              <td colSpan={2} className="border border-border p-1 text-center">Approval Criteria</td>
              <td className="border border-border p-1">Remarks</td>
            </tr>

            {/* Rows 2-7: 6 data rows */}
            {rows.map((row, idx) => (
              <tr key={idx} className="min-h-[28px] group">
                <td className="border border-border p-1">{cellInp(idx, "date_of_approval", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "supplier_name", "Supplier")}</td>
                <td className="border border-border p-1">{cellInp(idx, "scope_of_supply", "Scope")}</td>
                <td colSpan={2} className="border border-border p-1 relative">
                  {cellInp(idx, "approval_criteria", "Criteria")}
                  {editMode && rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
                <td className="border border-border p-1">{cellInp(idx, "remarks", "Remarks")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked fallback ── */}
      <div className="md:hidden p-2 border border-border text-xs space-y-3">
        <div className="font-bold text-base">Approved Vendor List</div>
        <div className="text-muted-foreground text-[10px]">F/15, Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        {rows.map((row, idx) => (
          <div key={idx} className="border border-border p-2 space-y-1 relative group">
            <div className="font-semibold text-muted-foreground text-[10px]">Vendor {idx + 1}</div>
            <div className="grid grid-cols-2 gap-1">
              <div><span className="text-muted-foreground">Date:</span> {cellInp(idx, "date_of_approval", "Date")}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {cellInp(idx, "supplier_name", "Supplier")}</div>
              <div><span className="text-muted-foreground">Scope:</span> {cellInp(idx, "scope_of_supply", "Scope")}</div>
              <div><span className="text-muted-foreground">Criteria:</span> {cellInp(idx, "approval_criteria", "Criteria")}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span> {cellInp(idx, "remarks", "Remarks")}</div>
            </div>
            {editMode && rows.length > 1 && (
              <button onClick={() => removeRow(idx)} className="absolute top-1 right-1 text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* ── Footer Signatures ── */}
      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs px-2">
        <div>Prepared By: {metaInp("prepared_by", "Name")}</div>
        <div>Approved By: {metaInp("approved_by", "Name")}</div>
      </div>
    </FormDocument>
  );
}
