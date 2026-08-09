// ============================================================================
// F/11 — Production Plan
// DOCX-faithful: separate Date / # Size / Status / Date / Qty. / Status columns
// Canonical item keys: product, batch_no, plan_date, plan_size, plan_status,
//                      actual_date, actual_qty, actual_status, yield_percent
// Legacy fallback: plan_completion / actual_completion merged strings still render.
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
  plan_date: string;
  plan_size: string;
  plan_status: string;
  actual_date: string;
  actual_qty: string;
  actual_status: string;
  yield_percent: string;
}

const EMPTY_ROW: RowData = {
  product: "",
  batch_no: "",
  plan_date: "",
  plan_size: "",
  plan_status: "",
  actual_date: "",
  actual_qty: "",
  actual_status: "",
  yield_percent: "",
};

/**
 * Shared date-first parser (MUST stay identical to /tmp/normalize_f11.py).
 * Matches the COMPLETE date token first (dd[/.-]mm[/.-]yyyy), then treats the
 * remaining text after the trailing separator as size/qty. Never splits on
 * every "/" — "29/07/2026 / 4" must yield date="29/07/2026", size="4".
 */
const F11_DATE_RE = /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;

function splitMergedDateSize(value: unknown): [string, string] {
  const v = String(value ?? "").trim();
  const m = F11_DATE_RE.exec(v);
  if (m) {
    const date = m[1];
    const rest = v.slice(m[1].length).trim().replace(/^[/\s]+/, "").trim();
    return [date, rest];
  }
  return [v, ""];
}

/**
 * Normalize one raw item row:
 * - If it has split keys already, use them directly.
 * - If it has legacy merged keys (plan_completion / actual_completion),
 *   split "dd/mm/yyyy / size" into plan_date/plan_size and actual_date/actual_qty,
 *   and infer plan_status/actual_status from yield_percent.
 */
function normalizeRow(raw: Record<string, unknown>): RowData {
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const row: RowData = { ...EMPTY_ROW };
  row.product = s(raw.product);
  row.batch_no = s(raw.batch_no);
  row.yield_percent = s(raw.yield_percent);

  if (raw.plan_date !== undefined || raw.plan_size !== undefined) {
    row.plan_date = s(raw.plan_date);
    row.plan_size = s(raw.plan_size);
  } else {
    const [d, sz] = splitMergedDateSize(raw.plan_completion);
    row.plan_date = d.trim();
    row.plan_size = sz;
  }

  if (raw.actual_date !== undefined || raw.actual_qty !== undefined) {
    row.actual_date = s(raw.actual_date);
    row.actual_qty = s(raw.actual_qty);
  } else {
    const [d, q] = splitMergedDateSize(raw.actual_completion);
    row.actual_date = d.trim();
    row.actual_qty = q;
  }

  row.plan_status = s(raw.plan_status);
  row.actual_status = s(raw.actual_status);
  if (!row.plan_status) row.plan_status = inferStatus(row.yield_percent, "plan");
  if (!row.actual_status) row.actual_status = inferStatus(row.yield_percent, "actual");

  // ── Recurrence guard ──────────────────────────────────────────────────
  // A partial date (1-2 digits only) or a date fragment inside size/qty is
  // a data corruption symptom. Normalization must NEVER accept it silently.
  const dateFragRe = /\d{1,2}\/\d{2,4}|\/\d{1,2}\/\d{2,4}|\d{4}\s*\/\s*\d/;
  const partialDateRe = /^\d{1,2}$/;
  if (partialDateRe.test(row.plan_date) || partialDateRe.test(row.actual_date)) {
    console.warn("[F/11] Partial date detected — data corruption suspected:", raw);
  }
  if (dateFragRe.test(row.plan_size) || dateFragRe.test(row.actual_qty)) {
    console.warn("[F/11] Date fragment inside size/qty — data corruption suspected:", raw);
  }

  return row;
}

/** Yield → status mapping consistent with the 2026-08-06 fill logic. */
function inferStatus(yieldPct: string, kind: "plan" | "actual"): string {
  const num = parseFloat(yieldPct);
  if (isNaN(num)) return "";
  if (num >= 95) return kind === "plan" ? "On Schedule" : "Completed";
  if (num >= 40) return kind === "plan" ? "Delayed" : "Partially Completed";
  return kind === "plan" ? "Behind Schedule" : "In Progress";
}

function parseRows(d: Record<string, unknown>, count: number = 25): RowData[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return (raw as Record<string, unknown>[]).map(normalizeRow);
  }
  return Array.from({ length: count }, () => ({ ...EMPTY_ROW }));
}

export function F11Template({ data, isTemplate = true, editMode = false, onChange, className }: F11Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback(
    (idx: number, key: keyof RowData, value: string) => {
      setRows(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: value };
        return next;
      });
      const updated = [...rows];
      updated[idx] = { ...updated[idx], [key]: value };
      onChange?.("items", JSON.stringify(updated));
    },
    [rows, onChange]
  );

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

            {/* ── Row 4: Column headers (DOCX-faithful; no Status col in DOCX row 4) ── */}
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

            {/* ── Data rows: each sub-column renders its own key ── */}
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-background dark:bg-[#1e1d1a]" : "bg-muted/30"}>
                <td className="border border-border p-1 text-center text-muted-foreground">{idx + 1}</td>
                <td className="border border-border p-1">{cellInp(idx, "product", "Product")}</td>
                <td className="border border-border p-1">{cellInp(idx, "batch_no", "Batch No.")}</td>
                <td className="border border-border p-1">{cellInp(idx, "plan_date", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "plan_size", "# Size")}</td>
                <td className="border border-border p-1">{cellInp(idx, "plan_status", "Status")}</td>
                <td className="border border-border p-1">{cellInp(idx, "actual_date", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "actual_qty", "Qty.")}</td>
                <td className="border border-border p-1">{cellInp(idx, "actual_status", "Status")}</td>
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

            {/* ── Row: Remarks ── */}
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

            {/* ── Row: Prepared By / Reviewed By ── */}
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

            {/* ── Row: Approved By / Updated Based On Progress ── */}
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

            {/* ── Row: Signature / Date ── */}
            <tr>
              <td colSpan={5} className="border border-border p-3 text-xs text-center">
                <div className="min-h-[40px]" />
                {val(d, "signature") ? (
                  <span className="font-medium">{val(d, "signature")}</span>
                ) : (
                  <span className="text-muted-foreground">Signature / Date</span>
                )}
              </td>
              <td colSpan={5} className="border border-border p-3 text-xs text-center">
                <div className="min-h-[40px]" />
                {val(d, "signature") ? (
                  <span className="font-medium">{val(d, "signature")}</span>
                ) : (
                  <span className="text-muted-foreground">Signature / Date</span>
                )}
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
          <Plus className="w-3 h-3 inline" /> Add Row
        </button>
      )}
    </FormDocument>
  );
}