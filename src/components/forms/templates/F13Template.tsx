// ============================================================================
// F/13 — Purchase Order (Commercial Slip Layout)
// Canonical rewrite matching DOCX structure exactly.
// Pillar 1: Horizontal Matrix — 5-column items table
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 3: Nested State Mutation — logistics_grid deep spread
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileText, Shield } from "lucide-react";

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

function numVal(data: Record<string, unknown> | undefined, key: string): number {
  const v = data[key];
  if (v == null || v === "") return 0;
  return typeof v === "number" ? v : Number(v);
}

interface ItemRow {
  sr_no: number;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

function parseItems(d: Record<string, unknown>): ItemRow[] {
  const raw = d.items_table;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as ItemRow[];
  }
  return [{ sr_no: 1, description: "Not Applicable – Service Based Operations", qty: 0, rate: 0, amount: 0 }];
}

function parseLogistics(d: Record<string, unknown>): Record<string, string> {
  const grid = d.logistics_grid;
  if (grid && typeof grid === "object" && !Array.isArray(grid)) {
    return grid as Record<string, string>;
  }
  return {};
}

function parseDisclaimers(d: Record<string, unknown>): string[] {
  const raw = d.disclaimers;
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

export function F13Template({ data, isTemplate = true, editMode = false, onChange, className }: F13Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);
  const logistics = parseLogistics(d);
  const disclaimers = parseDisclaimers(d);

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

  const gridInp = (gridKey: string, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent border-b border-dashed border-foreground/40 text-xs px-1"
        value={logistics[gridKey] || ""}
        onChange={e => {
          const updated = { ...logistics, [gridKey]: e.target.value };
          onChange?.("logistics_grid", updated);
        }}
        placeholder={label}
      />
    ) : (
      <span className="text-xs">{logistics[gridKey] || (ph ? "___" : "")}</span>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header Block ── */}
      <div className="border border-border rounded-t-sm">
        <div className="grid grid-cols-[3fr_1fr]">
          <div className="p-3 font-bold text-lg bg-primary/5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Purchase Order
          </div>
          <div className="p-3 border-l border-border bg-primary/5 text-right text-xs font-mono">
            F/13 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
          </div>
        </div>

        {/* PO No + Date row */}
        <div className="grid grid-cols-[1fr_1fr] border-t border-border text-xs">
          <div className="p-2 border-r border-border font-semibold">
            Purchase Order No. 🡪 <span className="font-mono">{val(d, "po_no") || val(d, "serial") || (ph ? "___" : "—")}</span>
          </div>
          <div className="p-2 font-semibold">
            Date 🡪 {inp("date", "DD/MM/YYYY", "w-28")}
          </div>
        </div>

        {/* Vendor / To */}
        <div className="border-t border-border text-xs p-2">
          <span className="font-semibold">To,</span> {inp("vendor_name", "Vendor Name / Address")}
        </div>

        {/* Intro Statement */}
        <div className="border-t border-border text-xs p-2 bg-muted/30 italic">
          {val(d, "intro_statement") || (ph ? "We Are Pleased To Place An Order For The Below Mentioned Items ;" : "")}
        </div>
      </div>

      {/* ── Items Matrix Table (5-column horizontal) ── */}
      <div className="border-x border-b border-border">
        {/* Header */}
        <div className="grid grid-cols-[50px_2fr_80px_80px_80px] text-[10px] font-bold bg-muted border-b border-border">
          <div className="p-1.5 border-r border-border text-center">Sr. No.</div>
          <div className="p-1.5 border-r border-border">Description</div>
          <div className="p-1.5 border-r border-border text-right">Qty.</div>
          <div className="p-1.5 border-r border-border text-right">Rate</div>
          <div className="p-1.5 text-right">Amount</div>
        </div>

        {/* Data rows */}
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[50px_2fr_80px_80px_80px] border-b border-border text-xs last:border-b-0">
            <div className="p-1.5 border-r border-border text-center">{item.sr_no || idx + 1}</div>
            <div className="p-1.5 border-r border-border">{item.description}</div>
            <div className="p-1.5 border-r border-border text-right">{item.qty}</div>
            <div className="p-1.5 border-r border-border text-right">{item.rate}</div>
            <div className="p-1.5 text-right">{item.amount}</div>
          </div>
        ))}

        {/* Total Amount row */}
        <div className="grid grid-cols-[50px_2fr_80px_80px_80px] border-t-2 border-border text-xs font-bold bg-muted/20">
          <div className="p-1.5 border-r border-border" />
          <div className="p-1.5 border-r border-border text-right">Total Amount In Rs. 🡪</div>
          <div className="p-1.5 border-r border-border" />
          <div className="p-1.5 border-r border-border" />
          <div className="p-1.5 text-right">{numVal(d, "total_amount_rs")}</div>
        </div>
      </div>

      {/* ── Specifications & As Per Clause ── */}
      <div className="border-x border-b border-border text-xs">
        <div className="p-2 border-b border-border">
          <span className="font-semibold">Specifications:</span> {txt("specifications", "Specifications text")}
        </div>
        <div className="p-2">
          <span className="font-semibold">As Per:</span> {inp("as_per_clause", "Issue No. F/13-001 /", "w-48")}
        </div>
      </div>

      {/* ── Supplies Notice ── */}
      <div className="border-x border-b border-border text-xs p-2 bg-amber-50 dark:bg-amber-950/20 border-l-2 border-l-amber-400">
        <span className="font-semibold text-amber-700 dark:text-amber-400">📋 Supplies Notice:</span>
        <div className="mt-1">{txt("supplies_notice", "Supplies notice text")}</div>
      </div>

      {/* ── Logistics & Terms Grid (2-column) ── */}
      <div className="border-x border-b border-border text-xs">
        <div className="grid grid-cols-2">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Delivery Period:</span> {gridInp("delivery_period", "N/A")}
          </div>
          <div className="p-2">
            <span className="font-semibold">Payment Terms:</span> {gridInp("payment_terms", "N/A")}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Mode of Despatch:</span> {gridInp("mode_of_despatch", "N/A")}
          </div>
          <div className="p-2">
            <span className="font-semibold">Despatch Arrangement:</span> {gridInp("despatch_arrangement", "By US / You")}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Method of Product Approval:</span>
            <div className="mt-0.5">{gridInp("product_approval_method", "Inspection method")}</div>
          </div>
          <div className="p-2">
            <span className="font-semibold">Test Certificate Required:</span> {gridInp("test_certificate_required", "Yes / No")}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Insurance:</span> {gridInp("insurance", "By US / You / N/A")}
          </div>
          <div className="p-2">
            <span className="font-semibold">Despatch Destination:</span> {gridInp("despatch_destination", "Destination")}
          </div>
        </div>
      </div>

      {/* ── ISO Compliance Callout Card (Disclaimers) ── */}
      <div className="border-x border-b border-border p-3 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs">ISO 9001:2015 — Terms &amp; Conditions</span>
            <ul className="mt-1.5 space-y-1">
              {disclaimers.length > 0 ? disclaimers.map((d, i) => (
                <li key={i} className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{d}</span>
                </li>
              )) : (
                <li className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{ph ? "Terms and conditions text" : "—"}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Footer Signatures ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border rounded-b-sm text-xs">
        <div className="p-3 border-r border-border">
          <span className="font-semibold">Prepared By:</span>
          <div className="mt-1">{inp("prepared_by", "Management Representative", "w-40")}</div>
        </div>
        <div className="p-3">
          <span className="font-semibold">Reviewed And Approved By:</span>
          <div className="mt-1">{inp("reviewed_and_approved_by", "Top Management", "w-40")}</div>
        </div>
      </div>
    </div>
  );
}
