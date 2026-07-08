// ============================================================================
// F/50 — Customer Property Monitoring Register
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
//
// Layout: 13-column table. This is a register/log form with repeating rows
// for property entries. In edit mode, starts with 1 row and supports
// "Add Row" for additional entries.
// ============================================================================

import React, { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

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

function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// Default empty property entry row
function emptyEntry(): Record<string, string> {
  return {
    received_date: "",
    name_of_property: "",
    purpose_for: "",
    received_qty: "",
    name_of_customer: "",
    inward_inspection: "",
    received_by: "",
    outward_date: "",
    outward_qty: "",
    balance_qty: "",
    damage_summary: "",
    outward_by: "",
  };
}

export function F50Template({ data, isTemplate = true, editMode = false, onChange, className }: F50Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // ── Property entries (dynamic rows) ────────────────────────────
  const entries: Array<Record<string, string>> = useMemo(() => {
    const raw = d.entries;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((item: Record<string, unknown>) => ({
          received_date: String(item.received_date ?? ""),
          name_of_property: String(item.name_of_property ?? ""),
          purpose_for: String(item.purpose_for ?? ""),
          received_qty: String(item.received_qty ?? ""),
          name_of_customer: String(item.name_of_customer ?? ""),
          inward_inspection: String(item.inward_inspection ?? ""),
          received_by: String(item.received_by ?? ""),
          outward_date: String(item.outward_date ?? ""),
          outward_qty: String(item.outward_qty ?? ""),
          balance_qty: String(item.balance_qty ?? ""),
          damage_summary: String(item.damage_summary ?? ""),
          outward_by: String(item.outward_by ?? ""),
        }));
      } catch { /* fall through */ }
    }
    if (Array.isArray(raw)) {
      return raw.map((item: Record<string, unknown>) => ({
        received_date: String(item.received_date ?? ""),
        name_of_property: String(item.name_of_property ?? ""),
        purpose_for: String(item.purpose_for ?? ""),
        received_qty: String(item.received_qty ?? ""),
        name_of_customer: String(item.name_of_customer ?? ""),
        inward_inspection: String(item.inward_inspection ?? ""),
        received_by: String(item.received_by ?? ""),
        outward_date: String(item.outward_date ?? ""),
        outward_qty: String(item.outward_qty ?? ""),
        balance_qty: String(item.balance_qty ?? ""),
        damage_summary: String(item.damage_summary ?? ""),
        outward_by: String(item.outward_by ?? ""),
      }));
    }
    return [emptyEntry()];
  }, [d.entries]);

  const updateEntries = useCallback((newEntries: Array<Record<string, string>>) => {
    onChange?.("entries", JSON.stringify(newEntries));
  }, [onChange]);

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-muted/50 font-semibold text-sm px-2 py-1.5 border border-border text-muted-foreground";
  const valueCls = "px-1.5 py-1.5 border border-border text-sm text-foreground min-h-[2rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-muted-foreground" : "");
  const titleCls = "bg-muted/50 font-bold text-base px-3 py-2 border border-border text-foreground";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-1.5 py-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
  const inputCls = "w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground";

  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black overflow-x-auto", className)}>
      <table className="w-full table-auto border-collapse border border-border">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[5%]" />
        </colgroup>
        <tbody>
          {/* ── Row 0: Title + Serial ─────────────────────── */}
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

          {/* ── Row 1: Column headers ────────────────────── */}
          <tr>
            <td className={headerCls}>Received Date</td>
            <td className={headerCls}>Name Of Property</td>
            <td className={headerCls}>Purpose For</td>
            <td className={headerCls}>Received Qty.</td>
            <td className={headerCls}>Name of Customer</td>
            <td className={headerCls}>Inward Inspection</td>
            <td className={headerCls}>Received By</td>
            <td className={headerCls}>Outward Date</td>
            <td className={headerCls}>Outward Qty</td>
            <td className={headerCls}>Balance Qty</td>
            <td className={headerCls}>Summary of damage/rejection</td>
            <td className={headerCls}>Outward By Sign.</td>
            <td className={headerCls}>Sr. No.</td>
          </tr>

          {/* ── Data rows (dynamic entries) ─────────────── */}
          {entries.map((entry, idx) => (
            <tr key={idx}>
              {readonly ? (
                <>
                  <td className={cn(emptyValueCls, "text-center")}>{entry.received_date || (isTemplate ? "DD/MM" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.name_of_property || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.purpose_for || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls, "text-center")}>{entry.received_qty || (isTemplate ? "" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.name_of_customer || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.inward_inspection || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.received_by || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls, "text-center")}>{entry.outward_date || (isTemplate ? "" : "")}</td>
                  <td className={cn(emptyValueCls, "text-center")}>{entry.outward_qty || (isTemplate ? "" : "")}</td>
                  <td className={cn(emptyValueCls, "text-center")}>{entry.balance_qty || (isTemplate ? "" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.damage_summary || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls)}>{entry.outward_by || (isTemplate ? "—" : "")}</td>
                  <td className={cn(emptyValueCls, "text-center")}>{idx + 1}</td>
                </>
              ) : (
                <>
                  <td className={valueCls}>
                    <input type="text" value={entry.received_date} placeholder="DD/MM" className={cn(inputCls, "text-center")}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], received_date: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.name_of_property} placeholder="Property name" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], name_of_property: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.purpose_for} placeholder="Purpose" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], purpose_for: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.received_qty} placeholder="Qty" className={cn(inputCls, "text-center")}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], received_qty: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.name_of_customer} placeholder="Customer" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], name_of_customer: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.inward_inspection} placeholder="Status" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], inward_inspection: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.received_by} placeholder="Name" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], received_by: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.outward_date} placeholder="DD/MM" className={cn(inputCls, "text-center")}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], outward_date: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.outward_qty} placeholder="Qty" className={cn(inputCls, "text-center")}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], outward_qty: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.balance_qty} placeholder="Qty" className={cn(inputCls, "text-center")}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], balance_qty: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.damage_summary} placeholder="—" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], damage_summary: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={valueCls}>
                    <input type="text" value={entry.outward_by} placeholder="Name" className={inputCls}
                      onChange={e => {
                        const newEntries = [...entries];
                        newEntries[idx] = { ...newEntries[idx], outward_by: e.target.value };
                        updateEntries(newEntries);
                      }} />
                  </td>
                  <td className={cn(valueCls, "text-center font-mono text-xs")}>{idx + 1}</td>
                </>
              )}
            </tr>
          ))}

          {/* ── Add Row button (edit mode only) ───────────── */}
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

          {/* ── Delete row button (edit mode, >1 row) ──── */}
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

          {/* ── VEZLOO footer ────────────────────────────── */}
          <tr>
            <td colSpan={13} className="text-center text-xs font-bold text-muted-foreground py-1 border border-border bg-background">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}