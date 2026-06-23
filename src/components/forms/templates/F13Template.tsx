// ============================================================================
// F/13 — Purchase Order
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 24-row table with header, items (3-col), terms & conditions, signatures.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F13Props {
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

interface ItemRow {
  sr_no: string;
  description: string;
  quantity: string;
}

function parseItems(d: Record<string, unknown>): ItemRow[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as ItemRow[];
  }
  return [
    { sr_no: "1", description: "Not Applicable – Service Based Operations", quantity: "0" },
  ];
}

export function F13Template({ data, isTemplate = true, editMode = false, onChange, className }: F13Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const txt = (key: string, label: string) =>
    editMode ? (
      <textarea
        className="w-full bg-transparent border border-dashed border-foreground/40 text-xs p-1 rounded resize-none"
        rows={3}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className="text-xs whitespace-pre-wrap">{val(d, key) || (ph ? "___" : "")}</span>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* Header: Title + Rev No */}
      <div className="grid grid-cols-[3fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Purchase Order</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/13 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Purchase Order No + Date */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          Purchase Order No. 🡪 {val(d, "purchase_order_no") || val(d, "serial") || (ph ? "___" : "—")}
        </div>
        <div className="p-1.5">Date 🡪 {inp("date", "DD/MM/YYYY", "w-28")}</div>
      </div>

      {/* To (Supplier) */}
      <div className="border-x border-b border-border text-xs p-1.5">
        To, {inp("to", "Supplier Name / Address")}
      </div>

      {/* Order intro */}
      <div className="border-x border-b border-border text-xs p-1.5 bg-muted/50 font-semibold">
        We are pleased to place an order for the following items subject to the terms and conditions as mentioned below:
      </div>

      {/* Items table header — 3 columns matching DOCX */}
      <div className="grid grid-cols-[40px_2fr_80px] border-x border-b border-border text-[10px] font-semibold bg-muted">
        <div className="p-1 border-r border-border text-center">Sr.</div>
        <div className="p-1 border-r border-border">Description</div>
        <div className="p-1 text-center">Qty.</div>
      </div>

      {/* Items data rows */}
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[40px_2fr_80px] border-x border-b border-border text-xs min-h-[24px]">
          <div className="p-1 border-r border-border text-center">{item.sr_no || idx + 1}</div>
          <div className="p-1 border-r border-border">{item.description}</div>
          <div className="p-1 text-center">{item.quantity}</div>
        </div>
      ))}

      {/* Total Amount */}
      <div className="grid grid-cols-[40px_2fr_80px] border-x border-b border-border text-xs font-semibold bg-muted/30">
        <div className="p-1 border-r border-border text-center" />
        <div className="p-1 border-r border-border">Total Amount In Rs. 🡪</div>
        <div className="p-1 text-center">{val(d, "total_amount") || "0"}</div>
      </div>

      {/* Specifications */}
      <div className="border-x border-b border-border text-xs p-1.5">
        <span className="font-semibold">Specifications:</span> {txt("specifications", "Specifications text")}
      </div>

      {/* Note */}
      <div className="border-x border-b border-border text-xs p-1.5">
        <span className="font-semibold">Note:</span> {txt("note", "Note text")}
      </div>

      {/* Terms & Conditions Grid */}
      <div className="border-x border-b border-border text-xs">
        <div className="grid grid-cols-[1fr_1fr]">
          <div className="p-1.5 border-r border-border">
            <span className="font-semibold">Delivery Period:</span> {inp("delivery_period", "N/A", "w-20")}
          </div>
          <div className="p-1.5">
            <span className="font-semibold">Payment Terms:</span> {inp("payment_terms", "N/A", "w-20")}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] border-t border-border">
          <div className="p-1.5 border-r border-border">
            <span className="font-semibold">Mode of Despatch:</span> {inp("mode_of_despatch", "N/A", "w-20")}
          </div>
          <div className="p-1.5">
            <span className="font-semibold">Despatch Arrangement:</span> {inp("despatch_arrangement", "By US / You", "w-32")}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] border-t border-border">
          <div className="p-1.5 border-r border-border">
            <span className="font-semibold">Method of Product Approval:</span> {txt("method_of_product_approval", "Inspection method")}
          </div>
          <div className="p-1.5">
            <span className="font-semibold">Requirement of Test Certificate:</span> {inp("requirement_of_test_certificate", "Yes / No", "w-20")}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] border-t border-border">
          <div className="p-1.5 border-r border-border">
            <span className="font-semibold">Insurance:</span> {inp("insurance", "By US / You / N/A", "w-32")}
          </div>
          <div className="p-1.5">
            <span className="font-semibold">Despatch Destination:</span> {inp("despatch_destination", "Destination", "w-32")}
          </div>
        </div>
      </div>

      {/* Terms & Conditions full text */}
      <div className="border-x border-b border-border text-xs p-1.5">
        <span className="font-semibold">Terms &amp; Conditions:</span>
        <div className="mt-1 whitespace-pre-wrap">{txt("terms_and_conditions", "Terms and conditions text")}</div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Prepared By:</span> {inp("prepared_by", "Management Representative", "w-32")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Reviewed And Approved By:</span> {inp("approved_by", "Top Management", "w-32")}
        </div>
      </div>
    </div>
  );
}
