// ============================================================================
// F/13 — Purchase Order
// 24 rows × 10 columns. Matches Word document structure exactly.
// Database field names (from DOCX backfill): items_table, vendor_name, logistics_grid, etc.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument } from "../FormKit";

export interface F13Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

interface Item {
  description: string;
  qty: string | number;
  rate: string | number;
  amount: string | number;
}

function parseItems(d: Record<string, unknown>): Item[] {
  // Database uses 'items_table' not 'items'
  const raw = d.items_table;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r: Record<string, unknown>) => ({
      description: String(r.description ?? ""),
      qty: String(r.qty ?? ""),
      rate: String(r.rate ?? ""),
      amount: String(r.amount ?? ""),
    }));
  }
  return Array.from({ length: 14 }, () => ({
    description: "",
    qty: "",
    rate: "",
    amount: "",
  }));
}

function parseLogisticsGrid(d: Record<string, unknown>): Record<string, string> {
  const grid = d.logistics_grid;
  if (grid && typeof grid === 'object') {
    return grid as Record<string, string>;
  }
  return {};
}

// ── Shared CSS constants ───────────────────────────────────────────────────

const TBL = "border border-border print:border-black";
const TBL_IN = "border border-border print:border-black";

const inpStyle =
  "w-full bg-transparent border-b border-dashed border-foreground/40 text-xs px-0.5 outline-none focus:border-foreground/70";

// ── Component ──────────────────────────────────────────────────────────────

export function F13Template({
  data,
  isTemplate = true,
  editMode = false,
  onChange,
  className,
}: F13Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);
  const logistics = parseLogisticsGrid(d);

  const placeholder = (v: string) => v || (ph ? "—" : "");

  // Inline editable cell
  const ec = (
    field: string,
    value: string,
    opts?: { className?: string; label?: string }
  ) =>
    editMode ? (
      <input
        className={cn(inpStyle, opts?.className)}
        value={value}
        placeholder={opts?.label}
        onChange={(e) => onChange?.(field, e.target.value)}
      />
    ) : (
      <span className={cn("text-xs", opts?.className)}>{placeholder(value)}</span>
    );

  // Item editable cell (scoped to items array)
  const ic = (idx: number, key: keyof Item, value: string) =>
    editMode ? (
      <input
        className={inpStyle}
        value={value}
        placeholder={key}
        onChange={(e) => {
          const next = [...items];
          next[idx] = { ...next[idx], [key]: e.target.value };
          onChange?.("items_table", next as unknown as Record<string, unknown>);
        }}
      />
    ) : (
      <span className="text-xs">{placeholder(value)}</span>
    );

  return (
    <FormDocument
      formCode="F/13"
      formName="Purchase Order"
      serial={val(d, "serial")}
      sectionName="Procurement & Vendors"
    >
      {/* ── 10-Column Table ──────────────────────────────────────────── */}
      <div className={cn("w-full overflow-x-auto", className)}>
        <table className="w-full border-collapse text-[11px] leading-tight min-w-[700px] print:min-w-0">
          <tbody>
            {/* ── Row 0: Title ── */}
            <tr>
              <td colSpan={9} className={cn(TBL, "p-2 font-bold text-base text-center")}>
                Purchase Order
              </td>
              <td
                className={cn(TBL, "p-2 text-center text-[10px] font-mono whitespace-pre-line")}
              >
                {"F/13\nRev No."}
                {val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
              </td>
            </tr>

            {/* ── Row 1: To / PO No ── */}
            <tr>
              <td colSpan={5} className={cn(TBL, "p-2 font-semibold")}>
                To,
              </td>
              <td colSpan={5} className={cn(TBL, "p-2")}>
                <span className="font-semibold">Purchase Order No. 🡪 </span>
                {ec("serial", val(d, "serial"), { label: "PO No." })}
              </td>
            </tr>

            {/* ── Row 2: To / Date ── */}
            <tr>
              <td colSpan={5} className={cn(TBL, "p-2")}>
                {ec("vendor_name", val(d, "vendor_name"), { label: "Supplier Name" })}
                <br />
                <span className="text-[10px]">
                  {ec("vendor_address", val(d, "vendor_address"), {
                    label: "Supplier Address",
                    className: "text-[10px]",
                  })}
                </span>
              </td>
              <td colSpan={5} className={cn(TBL, "p-2")}>
                <span className="font-semibold">Date 🡪 </span>
                {ec("date", val(d, "date"), { label: "DD/MM/YYYY" })}
              </td>
            </tr>

            {/* ── Row 3: Statement ── */}
            <tr>
              <td colSpan={10} className={cn(TBL, "p-2 italic bg-muted/20")}>
                {val(d, "intro_statement") || "We Are Pleased To Place An Order For The Following:"}
              </td>
            </tr>

            {/* ── Row 4: Column Headers ── */}
            <tr className="bg-muted/30 font-semibold">
              <td className={cn(TBL, "p-1 text-center")}>Sr. No.</td>
              <td colSpan={2} className={cn(TBL, "p-1")}>
                Description
              </td>
              <td colSpan={3} className={cn(TBL, "p-1 text-right")}>
                Qty.
              </td>
              <td className={cn(TBL, "p-1 text-right")}>Rate</td>
              <td colSpan={3} className={cn(TBL, "p-1 text-right")}>
                Amount
              </td>
            </tr>

            {/* ── Rows 5-18: 14 Data Rows ── */}
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className={cn(TBL, "p-1 text-center")}>{idx + 1}</td>
                <td colSpan={2} className={cn(TBL, "p-1")}>
                  {ic(idx, "description", item.description)}
                </td>
                <td colSpan={3} className={cn(TBL, "p-1 text-right")}>
                  {ic(idx, "qty", item.qty as string)}
                </td>
                <td className={cn(TBL, "p-1 text-right")}>
                  {ic(idx, "rate", item.rate as string)}
                </td>
                <td colSpan={3} className={cn(TBL, "p-1 text-right")}>
                  {ic(idx, "amount", item.amount as string)}
                </td>
              </tr>
            ))}

            {/* ── Row 19: Total ── */}
            <tr className="font-bold bg-muted/20">
              <td colSpan={5} className={cn(TBL, "p-1")} />
              <td colSpan={2} className={cn(TBL, "p-1 text-right")}>
                Total
              </td>
              <td colSpan={3} className={cn(TBL, "p-1 text-right")}>
                {ec("total_amount_rs", val(d, "total_amount_rs"), { label: "Total" })}
              </td>
            </tr>

            {/* ── Row 20: Delivery Schedule ── */}
            <tr>
              <td colSpan={3} className={cn(TBL, "p-1.5 font-semibold")}>
                Delivery Schedule
              </td>
              <td colSpan={7} className={cn(TBL, "p-1.5")}>
                {ec("delivery_period", val(d, "delivery_period") || logistics.delivery_period || "", {
                  label: "Delivery Period",
                })}
              </td>
            </tr>

            {/* ── Row 21: Payment Terms ── */}
            <tr>
              <td colSpan={3} className={cn(TBL, "p-1.5 font-semibold")}>
                Payment Terms
              </td>
              <td colSpan={7} className={cn(TBL, "p-1.5")}>
                {ec("payment_terms", val(d, "payment_terms") || logistics.payment_terms || "", {
                  label: "Payment Terms",
                })}
              </td>
            </tr>

            {/* ── Row 22: Remarks ── */}
            <tr>
              <td colSpan={3} className={cn(TBL, "p-1.5 font-semibold")}>
                Remarks
              </td>
              <td colSpan={7} className={cn(TBL, "p-1.5")}>
                {ec("remarks", val(d, "remarks") || "", { label: "Remarks" })}
              </td>
            </tr>

            {/* ── Row 23: Authorised Signatory ── */}
            <tr>
              <td colSpan={3} className={cn(TBL, "p-1.5 font-semibold")}>
                Authorised Signatory
              </td>
              <td colSpan={7} className={cn(TBL, "p-1.5")}>
                {ec("reviewed_and_approved_by", val(d, "reviewed_and_approved_by"), {
                  label: "Authorised Signatory",
                })}
              </td>
            </tr>

            {/* ── Disclaimers ── */}
            {(() => {
              const disclaimers = d.disclaimers;
              if (Array.isArray(disclaimers) && disclaimers.length > 0) {
                return (
                  <tr>
                    <td colSpan={10} className={cn(TBL, "p-2 text-[10px]")}>
                      <strong>Disclaimers:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {disclaimers.map((disc: string, i: number) => (
                          <li key={i}>{disc}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              }
              return null;
            })()}

            {/* ── Supplies Notice ── */}
            {val(d, "supplies_notice") && (
              <tr>
                <td colSpan={10} className={cn(TBL, "p-2 text-[10px] italic")}>
                  {val(d, "supplies_notice")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Fallback ── */}
      <div className="md:hidden mt-4 space-y-3 text-xs border border-border rounded p-3 print:hidden">
        <p className="font-semibold text-muted-foreground">— Mobile Preview —</p>
        <div>
          <span className="font-semibold">PO No: </span>
          {val(d, "serial") || "—"}
        </div>
        <div>
          <span className="font-semibold">Date: </span>
          {val(d, "date") || "—"}
        </div>
        <div>
          <span className="font-semibold">Supplier: </span>
          {val(d, "vendor_name") || "—"}
        </div>
        <div>
          <span className="font-semibold">Address: </span>
          {val(d, "vendor_address") || "—"}
        </div>
        <div className="mt-2 space-y-2">
          <p className="font-semibold">Items:</p>
          {items.map(
            (item, i) =>
              item.description && (
                <div key={i} className="pl-2 border-l-2 border-border">
                  <div>{item.description}</div>
                  <div className="text-muted-foreground">
                    Qty: {item.qty || "—"} | Rate: {item.rate || "—"} | Amt:{" "}
                    {item.amount || "—"}
                  </div>
                </div>
              )
          )}
        </div>
        <div>
          <span className="font-semibold">Total: </span>
          {val(d, "total_amount_rs") || "—"}
        </div>
        <div>
          <span className="font-semibold">Delivery: </span>
          {val(d, "delivery_period") || logistics.delivery_period || "—"}
        </div>
        <div>
          <span className="font-semibold">Payment: </span>
          {val(d, "payment_terms") || logistics.payment_terms || "—"}
        </div>
        <div>
          <span className="font-semibold">Remarks: </span>
          {val(d, "remarks") || "—"}
        </div>
        <div>
          <span className="font-semibold">Signatory: </span>
          {val(d, "reviewed_and_approved_by") || "—"}
        </div>
      </div>
    </FormDocument>
  );
}