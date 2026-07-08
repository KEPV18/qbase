// ============================================================================
// F/50 — Customer Property Monitoring Register
// 18-row × 13-col layout matching Word DOCX template exactly.
// Modes: isTemplate (read-only placeholder), record (filled), editMode (form).
// ============================================================================

import React, { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument } from "../FormKit";

export interface F50Props {
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
  if (typeof v === "string") return v;
  return String(v);
}

function emptyEntry(): Record<string, string> {
  return {
    received_date: "",
    name_of_property: "",
    purpose_for: "",
    received_qty: "",
    name_of_customer: "",
    inspection_status: "",
    received_by_sign: "",
    outward_date: "",
    outward_qty: "",
    balance_qty: "",
    damage_summary: "",
    outward_by_sign: "",
  };
}

// Keys mapping from raw data to normalized entry fields
const ENTRY_KEYS: Array<[string, string]> = [
  ["received_date", "received_date"],
  ["name_of_property", "name_of_property"],
  ["purpose_for", "purpose_for"],
  ["received_qty", "received_qty"],
  ["name_of_customer", "name_of_customer"],
  ["inspection_status", "inspection_status"],
  ["received_by_sign", "received_by_sign"],
  ["outward_date", "outward_date"],
  ["outward_qty", "outward_qty"],
  ["balance_qty", "balance_qty"],
  ["damage_summary", "damage_summary"],
  ["outward_by_sign", "outward_by_sign"],
];

function normalizeEntry(item: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [raw, norm] of ENTRY_KEYS) {
    out[norm] = String(item[raw] ?? item[norm] ?? "");
  }
  return out;
}

export function F50Template({ data, isTemplate = true, editMode = false, onChange, className }: F50Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  const entries: Array<Record<string, string>> = useMemo(() => {
    const raw = d.entries;
    let arr: unknown[] = [];
    if (typeof raw === "string") {
      try { arr = JSON.parse(raw); } catch { /* empty */ }
    } else if (Array.isArray(raw)) {
      arr = raw;
    }
    if (arr.length === 0) return [emptyEntry()];
    return arr.map((item) => normalizeEntry(item as Record<string, unknown>));
  }, [d.entries]);

  const updateEntries = useCallback((newEntries: Array<Record<string, string>>) => {
    onChange?.("entries", JSON.stringify(newEntries));
  }, [onChange]);

  const fieldUpdate = useCallback((idx: number, key: string, value: string) => {
    const next = entries.map((e, i) => (i === idx ? { ...e, [key]: value } : e));
    updateEntries(next);
  }, [entries, updateEntries]);

  // ── Styling ──────────────────────────────────────────────────────
  const labelCls = "bg-muted/50 font-semibold text-sm px-2 py-1.5 border border-border text-muted-foreground";
  const valueCls = "px-1.5 py-1.5 border border-border text-sm text-foreground min-h-[2rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-muted-foreground" : "");
  const titleCls = "bg-muted/50 font-bold text-base px-3 py-2 border border-border text-foreground";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-1.5 py-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
  const inputCls = "w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground";

  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  // ── Readonly cell ────────────────────────────────────────────────
  const roCell = (text: string, center = false) => (
    <td className={cn(emptyValueCls, center && "text-center")}>{text}</td>
  );

  // ── Editable cell ────────────────────────────────────────────────
  const rwCell = (idx: number, key: string, placeholder: string, center = false) => (
    <td className={valueCls}>
      <input
        type="text"
        value={entries[idx][key]}
        placeholder={placeholder}
        className={cn(inputCls, center && "text-center")}
        onChange={e => fieldUpdate(idx, key, e.target.value)}
      />
    </td>
  );

  return (
    <FormDocument formCode="F/50" formName="Customer Property Monitoring Register" serial={val(d, "serial")} sectionName="Sales & Customer Service">
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse border border-border">
          <colgroup>
            <col className="w-[7%]" />   {/* 0: Received Date */}
            <col className="w-[9%]" />   {/* 1: Name Of Property */}
            <col className="w-[7%]" />   {/* 2: Purpose For */}
            <col className="w-[5%]" />   {/* 3: Received Qty. */}
            <col className="w-[8%]" />   {/* 4: Name of Customer */}
            <col className="w-[8%]" />   {/* 5: Inward Inspection Status */}
            <col className="w-[7%]" />   {/* 6: Received By sign */}
            <col className="w-[7%]" />   {/* 7: Outward Date */}
            <col className="w-[5%]" />   {/* 8: Outward Qty */}
            <col className="w-[6%]" />   {/* 9: Balance Qty (left) */}
            <col className="w-[6%]" />   {/* 10: Balance Qty (right) */}
            <col className="w-[11%]" />  {/* 11: Summary of damage/rejection */}
            <col className="w-[8%]" />   {/* 12: Outward By Sign. */}
          </colgroup>
          <tbody>
            {/* ── Row 0: Title + Serial ─────────────────────────── */}
            <tr>
              <td colSpan={10} className={cn(titleCls, "text-center text-lg")}>
                Customer Property Monitoring Register
              </td>
              <td colSpan={3} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
                {editMode && !isTemplate ? (
                  <>
                    F 50 Rev{" "}
                    <input
                      className="inline w-16 text-xs bg-transparent outline-none border-b border-border text-center text-foreground placeholder:text-slate-400"
                      value={serialValue}
                      onChange={e => onChange?.("serial", e.target.value)}
                      placeholder="00"
                    />
                  </>
                ) : (
                  `F 50 Rev ${serialValue || "00"}`
                )}
              </td>
            </tr>

            {/* ── Row 1: Column headers (13 cols) ──────────────── */}
            <tr>
              <td className={headerCls}>Received Date</td>
              <td className={headerCls}>Name Of Property</td>
              <td className={headerCls}>Purpose For</td>
              <td className={headerCls}>Received. Qty.</td>
              <td className={headerCls}>Name of Customer</td>
              <td className={headerCls}>Inward Inspection Status</td>
              <td className={headerCls}>Received By sign</td>
              <td className={headerCls}>Outward Date</td>
              <td className={headerCls}>Outward Qty</td>
              <td colSpan={2} className={headerCls}>Balance Qty</td>
              <td className={headerCls}>Summary of damage/rejection</td>
              <td className={headerCls}>Outward By Sign.</td>
            </tr>

            {/* ── Data rows (16 rows, entries) ─────────────────── */}
            {entries.map((entry, idx) => (
              <tr key={idx}>
                {readonly ? (
                  <>
                    {roCell(entry.received_date || (isTemplate ? "DD/MM" : ""), true)}
                    {roCell(entry.name_of_property || (isTemplate ? "—" : ""))}
                    {roCell(entry.purpose_for || (isTemplate ? "—" : ""))}
                    {roCell(entry.received_qty, true)}
                    {roCell(entry.name_of_customer || (isTemplate ? "—" : ""))}
                    {roCell(entry.inspection_status || (isTemplate ? "—" : ""))}
                    {roCell(entry.received_by_sign || (isTemplate ? "—" : ""))}
                    {roCell(entry.outward_date, true)}
                    {roCell(entry.outward_qty, true)}
                    <td colSpan={2} className={cn(emptyValueCls, "text-center")}>
                      {entry.balance_qty || (isTemplate ? "" : "")}
                    </td>
                    {roCell(entry.damage_summary || (isTemplate ? "—" : ""))}
                    {roCell(entry.outward_by_sign || (isTemplate ? "—" : ""))}
                  </>
                ) : (
                  <>
                    {rwCell(idx, "received_date", "DD/MM", true)}
                    {rwCell(idx, "name_of_property", "Property name")}
                    {rwCell(idx, "purpose_for", "Purpose")}
                    {rwCell(idx, "received_qty", "Qty", true)}
                    {rwCell(idx, "name_of_customer", "Customer")}
                    {rwCell(idx, "inspection_status", "Status")}
                    {rwCell(idx, "received_by_sign", "Name")}
                    {rwCell(idx, "outward_date", "DD/MM", true)}
                    {rwCell(idx, "outward_qty", "Qty", true)}
                    <td colSpan={2} className={valueCls}>
                      <input
                        type="text"
                        value={entry.balance_qty}
                        placeholder="Qty"
                        className={cn(inputCls, "text-center")}
                        onChange={e => fieldUpdate(idx, "balance_qty", e.target.value)}
                      />
                    </td>
                    {rwCell(idx, "damage_summary", "—")}
                    {rwCell(idx, "outward_by_sign", "Name")}
                  </>
                )}
              </tr>
            ))}

            {/* ── Add Row button (edit mode only) ──────────────── */}
            {editMode && !isTemplate && (
              <tr>
                <td colSpan={13} className="border border-border px-2 py-1">
                  <button
                    type="button"
                    onClick={() => updateEntries([...entries, emptyEntry()])}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Entry
                  </button>
                </td>
              </tr>
            )}

            {/* ── Remove Last Row (edit mode, >1 row) ─────────── */}
            {editMode && !isTemplate && entries.length > 1 && (
              <tr>
                <td colSpan={13} className="border border-border px-2 py-1">
                  <button
                    type="button"
                    onClick={() => updateEntries(entries.slice(0, -1))}
                    className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Last Entry
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
