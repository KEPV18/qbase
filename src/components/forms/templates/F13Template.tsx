// ============================================================================
// F/13 — Purchase Order
// Canonical rewrite matching DOCX structure exactly.
// Keys match formSchemas.ts and DB form_data exactly.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, Shield } from "lucide-react";

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

function parseItems(d: Record<string, unknown>): Array<{ sr_no: string; description: string; quantity: string }> {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as Array<{ sr_no: string; description: string; quantity: string }>;
  }
  return [{ sr_no: "1", description: "Not Applicable – Service Based Operations", quantity: "0" }];
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

  const cellInp = (itemIdx: number, fieldKey: string, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent border-b border-dashed border-foreground/40 text-xs px-1"
        value={items[itemIdx]?.[fieldKey as keyof typeof items[0]] || ""}
        onChange={e => {
          const updated = [...items];
          updated[itemIdx] = { ...updated[itemIdx], [fieldKey]: e.target.value };
          onChange?.("items", updated);
        }}
        placeholder={label}
      />
    ) : (
      <span className="text-xs">{items[itemIdx]?.[fieldKey as keyof typeof items[0]] || (ph ? "___" : "")}</span>
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
            Purchase Order No. 🡪 <span className="font-mono">{val(d, "purchase_order_no") || val(d, "serial") || (ph ? "___" : "—")}</span>
          </div>
          <div className="p-2 font-semibold">
            Date 🡪 {inp("date", "DD/MM/YYYY", "w-28")}
          </div>
        </div>

        {/* Vendor / To */}
        <div className="border-t border-border text-xs p-2">
          <span className="font-semibold">To,</span> {inp("to", "Supplier Name / Address")}
        </div>

        {/* Intro Statement */}
        <div className="border-t border-border text-xs p-2 bg-muted/30 italic">
          We Are Pleased To Place An Order For The Below Mentioned Items ;
        </div>
      </div>

      {/* ── Items Table (3-column: Sr.No., Description, Qty.) ── */}
      <div className="border-x border-b border-border">
        <div className="grid grid-cols-[60px_2fr_80px] text-[10px] font-bold bg-muted border-b border-border">
          <div className="p-1.5 border-r border-border text-center">Sr. No.</div>
          <div className="p-1.5 border-r border-border">Description</div>
          <div className="p-1.5 text-right">Qty.</div>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[60px_2fr_80px] border-b border-border text-xs last:border-b-0">
            <div className="p-1.5 border-r border-border text-center">{cellInp(idx, "sr_no", "No.")}</div>
            <div className="p-1.5 border-r border-border">{cellInp(idx, "description", "Description")}</div>
            <div className="p-1.5 text-right">{cellInp(idx, "quantity", "Qty")}</div>
          </div>
        ))}

        {/* Total Amount row */}
        <div className="grid grid-cols-[60px_2fr_80px] border-t-2 border-border text-xs font-bold bg-muted/20">
          <div className="p-1.5 border-r border-border" />
          <div className="p-1.5 border-r border-border text-right">Total Amount In Rs. 🡪</div>
          <div className="p-1.5 text-right">{inp("total_amount", "0", "w-16")}</div>
        </div>
      </div>

      {/* ── Specifications ── */}
      <div className="border-x border-b border-border text-xs">
        <div className="p-2">
          <span className="font-semibold">Specifications:</span>
          <div className="mt-1">{txt("specifications", "Specifications text")}</div>
        </div>
      </div>

      {/* ── Supplies Notice ── */}
      <div className="border-x border-b border-border text-xs p-2 bg-amber-50 dark:bg-amber-950/20 border-l-2 border-l-amber-400">
        <span className="font-semibold text-amber-700 dark:text-amber-400">📋 Supplies Notice:</span>
        <div className="mt-1">{txt("note", "Supplies notice text")}</div>
      </div>

      {/* ── Terms Grid (4×2) ── */}
      <div className="border-x border-b border-border text-xs">
        <div className="grid grid-cols-2">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Delivery Period:</span>
            <div className="mt-0.5">{inp("delivery_period", "N/A", "w-40")}</div>
          </div>
          <div className="p-2">
            <span className="font-semibold">Payment Terms:</span>
            <div className="mt-0.5">{inp("payment_terms", "N/A", "w-40")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Mode of Despatch:</span>
            <div className="mt-0.5">{inp("mode_of_despatch", "N/A", "w-40")}</div>
          </div>
          <div className="p-2">
            <span className="font-semibold">Despatch Arrangement:</span>
            <div className="mt-0.5">{inp("despatch_arrangement", "By US / You", "w-40")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Method of Product Approval:</span>
            <div className="mt-0.5">{inp("method_of_product_approval", "Inspection method", "w-40")}</div>
          </div>
          <div className="p-2">
            <span className="font-semibold">Requirement of Test Certificate:</span>
            <div className="mt-0.5">{inp("requirement_of_test_certificate", "Yes / No", "w-40")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Insurance:</span>
            <div className="mt-0.5">{inp("insurance", "By US / You / N/A", "w-40")}</div>
          </div>
          <div className="p-2">
            <span className="font-semibold">Despatch Destination:</span>
            <div className="mt-0.5">{inp("despatch_destination", "Destination", "w-40")}</div>
          </div>
        </div>
      </div>

      {/* ── Terms & Conditions ── */}
      <div className="border-x border-b border-border p-3 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs">ISO 9001:2015 — Terms &amp; Conditions</span>
            <div className="mt-1.5 text-xs text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
              {txt("terms_and_conditions", "Terms and conditions text")}
            </div>
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
          <div className="mt-1">{inp("approved_by", "Top Management", "w-40")}</div>
        </div>
      </div>
    </div>
  );
}
