import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F14Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface RowData {
  date: string;
  item_description: string;
  qty: string;
  supplier: string;
  inspection_status: string;
  inspected_by: string;
}

const EMPTY_ROW: RowData = { date: "", item_description: "", qty: "", supplier: "", inspection_status: "", inspected_by: "" };

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: 9 }, () => ({ ...EMPTY_ROW }));
}

export function F14Template({ data, isTemplate = true, editMode = false, onChange, className }: F14Props) {
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
    <FormDocument formCode="F/14" formName="Indent and Incoming Inspection Record" serial={val(d, "serial")} sectionName="Quality & Audit">
      {/* ── Desktop: 7-column table (Word: 12 rows × 7 cols) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <tbody>
            {/* Row 0: Title merged cols 0-5, col 6 = Rev No */}
            <tr>
              <td colSpan={6} className="border border-border p-2 font-bold bg-primary/5 text-base">
                Indent and Incoming Inspection Record
              </td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap">
                F/14 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: "Details Of Execution / Receipt" spans cols 3-6 */}
            <tr className="bg-muted text-[10px] font-semibold">
              <td className="border border-border p-1">Date</td>
              <td className="border border-border p-1">Item Description</td>
              <td className="border border-border p-1">Qty.</td>
              <td colSpan={4} className="border border-border p-1 text-center">Details Of Execution / Receipt</td>
            </tr>

            {/* Row 2: Inspected By spans cols 5-6 */}
            <tr className="bg-muted text-[10px] font-semibold">
              <td className="border border-border p-1">Date</td>
              <td className="border border-border p-1">Item Description</td>
              <td className="border border-border p-1">Qty.</td>
              <td className="border border-border p-1">Name Of Supplier</td>
              <td className="border border-border p-1">Inspection Status</td>
              <td colSpan={2} className="border border-border p-1">Inspected By</td>
            </tr>

            {/* Rows 3-11: 9 data rows */}
            {rows.map((row, idx) => (
              <tr key={idx} className="min-h-[28px] group">
                <td className="border border-border p-1">{cellInp(idx, "date", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "item_description", "Item")}</td>
                <td className="border border-border p-1 text-center">{cellInp(idx, "qty", "Qty")}</td>
                <td className="border border-border p-1">{cellInp(idx, "supplier", "Supplier")}</td>
                <td className="border border-border p-1">{cellInp(idx, "inspection_status", "Status")}</td>
                <td colSpan={2} className="border border-border p-1 relative">
                  {cellInp(idx, "inspected_by", "By")}
                  {editMode && rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked fallback ── */}
      <div className="md:hidden p-2 border border-border text-xs space-y-3">
        <div className="font-bold text-base">Indent and Incoming Inspection Record</div>
        <div className="text-muted-foreground text-[10px]">F/14 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        {rows.map((row, idx) => (
          <div key={idx} className="border border-border p-2 space-y-1 relative group">
            <div className="font-semibold text-muted-foreground text-[10px]">Row {idx + 1}</div>
            <div className="grid grid-cols-2 gap-1">
              <div><span className="text-muted-foreground">Date:</span> {cellInp(idx, "date", "Date")}</div>
              <div><span className="text-muted-foreground">Item:</span> {cellInp(idx, "item_description", "Item")}</div>
              <div><span className="text-muted-foreground">Qty:</span> {cellInp(idx, "qty", "Qty")}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {cellInp(idx, "supplier", "Supplier")}</div>
              <div><span className="text-muted-foreground">Status:</span> {cellInp(idx, "inspection_status", "Status")}</div>
              <div><span className="text-muted-foreground">By:</span> {cellInp(idx, "inspected_by", "By")}</div>
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
        <div>Checked By: {metaInp("checked_by", "Name")}</div>
      </div>
    </FormDocument>
  );
}
