// ============================================================================
// F/11 — Production Plan
// 29 rows × 10 columns matching Word document structure exactly.
// ============================================================================

import React, { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F11Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

interface RowData {
  product: string;
  batch_no: string;
  plan_completion: string;
  actual_completion: string;
  yield_percent: string;
}

const EMPTY_ROW: RowData = { product: "", batch_no: "", plan_completion: "", actual_completion: "", yield_percent: "" };

function parseRows(d: Record<string, unknown>, count: number = 20): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({ ...EMPTY_ROW }));
}

export function F11Template({ data, isTemplate = true, editMode = false, onChange, className }: F11Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { ...EMPTY_ROW }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, placeholder: string) =>
    editMode ? (
      <input
        className="border-b border-dashed border-foreground/40 bg-transparent text-sm px-1 outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]">
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const cellInp = (idx: number, key: keyof RowData, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-xs px-1 border-none outline-none"
        value={rows[idx]?.[key] || ""}
        onChange={e => updateRow(idx, key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <FormDocument formCode="F/11" formName="Production Plan" serial={val(d, "serial")} sectionName="Operations & Production">
      {/* ═══ TABLE ═══ */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {/* ── Row 0: Title ── */}
            <tr>
              <td colSpan={8} className="border border-border p-2 font-bold text-base text-center bg-primary/5">
                Production Plan
              </td>
              <td colSpan={2} className="border border-border p-2 text-right text-xs bg-primary/5">
                F/11<br />Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
              </td>
            </tr>

            {/* ── Row 1: Sr. No. + Date ── */}
            <tr>
              <td colSpan={4} className="border border-border p-1.5 text-xs">
                Sr. No. → {val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
              </td>
              <td colSpan={6} className="border border-border p-1.5 text-xs">
                Date → {inp("date", "Date")}
              </td>
            </tr>

            {/* ── Row 2: Month ── */}
            <tr>
              <td colSpan={10} className="border border-border p-1.5 text-xs">
                Month → {inp("month", "Month")}
              </td>
            </tr>

            {/* ── Row 3: Section header ── */}
            <tr>
              <td colSpan={10} className="border border-border p-1.5 text-xs bg-muted/50 font-semibold">
                Planning For Products
              </td>
            </tr>

            {/* ── Row 4: Column headers ── */}
            <tr className="bg-muted font-semibold">
              <th rowSpan={2} className="border border-border p-1 text-center w-[30px]">Sr. No.</th>
              <th rowSpan={2} className="border border-border p-1 text-left">Product</th>
              <th rowSpan={2} className="border border-border p-1 text-left">Batch No.</th>
              <th colSpan={3} className="border border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30">Plan For Completion</th>
              <th colSpan={3} className="border border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Actual Completion</th>
              <th rowSpan={2} className="border border-border p-1 text-center">% Yield</th>
            </tr>
            <tr className="bg-muted/80 font-semibold">
              <th className="border border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30">Date</th>
              <th className="border border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30"># Size</th>
              <th className="border border-border p-1 text-center bg-blue-50 dark:bg-blue-950/30">Status</th>
              <th className="border border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Date</th>
              <th className="border border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Qty.</th>
              <th className="border border-border p-1 text-center bg-green-50 dark:bg-green-950/30">Status</th>
            </tr>

            {/* ── Rows 5-24: 20 data rows ── */}
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-background dark:bg-[#1e1d1a]" : "bg-muted/30"}>
                <td className="border border-border p-1 text-center text-muted-foreground">{idx + 1}</td>
                <td className="border border-border p-1">{cellInp(idx, "product", "Product")}</td>
                <td className="border border-border p-1">{cellInp(idx, "batch_no", "Batch No.")}</td>
                <td className="border border-border p-1" colSpan={3}>{cellInp(idx, "plan_completion", "Plan Completion")}</td>
                <td className="border border-border p-1" colSpan={3}>{cellInp(idx, "actual_completion", "Actual Completion")}</td>
                <td className="border border-border p-1 text-center">{cellInp(idx, "yield_percent", "%")}</td>
                {editMode && (
                  <td className="border border-border p-1 text-center">
                    <button onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-3 h-3 inline" />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* ── Row 25: Remarks ── */}
            <tr>
              <td colSpan={10} className="border border-border p-2 text-xs">
                <span className="font-semibold mr-2">Remarks:</span>
                {editMode ? (
                  <input
                    className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-3/4"
                    value={val(d, "remarks")}
                    onChange={e => onChange?.("remarks", e.target.value)}
                    placeholder="Remarks"
                  />
                ) : (
                  <span>{val(d, "remarks") || (ph ? "___" : "")}</span>
                )}
              </td>
            </tr>

            {/* ── Row 26: Prepared By ── */}
            <tr>
              <td colSpan={5} className="border border-border p-2 text-xs">
                <span className="font-semibold mr-2">Prepared By:</span>
                {editMode ? (
                  <input
                    className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-48"
                    value={val(d, "prepared_by")}
                    onChange={e => onChange?.("prepared_by", e.target.value)}
                    placeholder="Name"
                  />
                ) : (
                  <span className="border-b border-dashed border-foreground/30 px-2">
                    {val(d, "prepared_by") || (ph ? "_____________" : "")}
                  </span>
                )}
              </td>
              <td colSpan={5} className="border border-border p-2 text-xs">
                <span className="font-semibold mr-2">Reviewed By:</span>
                {editMode ? (
                  <input
                    className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-48"
                    value={val(d, "reviewed_by")}
                    onChange={e => onChange?.("reviewed_by", e.target.value)}
                    placeholder="Name"
                  />
                ) : (
                  <span className="border-b border-dashed border-foreground/30 px-2">
                    {val(d, "reviewed_by") || (ph ? "_____________" : "")}
                  </span>
                )}
              </td>
            </tr>

            {/* ── Row 27: Approved By ── */}
            <tr>
              <td colSpan={5} className="border border-border p-2 text-xs">
                <span className="font-semibold mr-2">Approved By:</span>
                {editMode ? (
                  <input
                    className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-48"
                    value={val(d, "approved_by")}
                    onChange={e => onChange?.("approved_by", e.target.value)}
                    placeholder="Name"
                  />
                ) : (
                  <span className="border-b border-dashed border-foreground/30 px-2">
                    {val(d, "approved_by") || (ph ? "_____________" : "")}
                  </span>
                )}
              </td>
              <td colSpan={5} className="border border-border p-2 text-xs">
                <span className="font-semibold mr-2">Updated Based On Progress:</span>
                {editMode ? (
                  <input
                    className="border-b border-dashed border-foreground/40 bg-transparent text-sm w-24"
                    value={val(d, "updated_based_on_progress")}
                    onChange={e => onChange?.("updated_based_on_progress", e.target.value)}
                    placeholder="Yes/No"
                  />
                ) : (
                  <span className="border-b border-dashed border-foreground/30 px-2">
                    {val(d, "updated_based_on_progress") || (ph ? "___" : "")}
                  </span>
                )}
              </td>
            </tr>

            {/* ── Row 28: Signature ── */}
            <tr>
              <td colSpan={5} className="border border-border p-3 text-xs text-center">
                <div className="min-h-[40px]" />
                <span className="text-muted-foreground">Signature / Date</span>
              </td>
              <td colSpan={5} className="border border-border p-3 text-xs text-center">
                <div className="min-h-[40px]" />
                <span className="text-muted-foreground">Signature / Date</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ Add Row Button (edit mode) ═══ */}
      {editMode && (
        <button
          onClick={addRow}
          className="w-full border-x border-b border-border py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}
    </FormDocument>
  );
}
