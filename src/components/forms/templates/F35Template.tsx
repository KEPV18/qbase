// ============================================================================
// F/35 — Design & Development Monitoring Register
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 11C x 16R — Header (title + Rev No.), 11-column monitoring table
//   (Product Name | Specification | New Specification | Name of the customer |
//    Reason of Development | Development Completion Date | Actual Completion
//    Date | Reason for Rejection | Action Taken | Status | Design Head Sign)
// Pillar 1: Horizontal Matrix — 11-column table rendered as HTML table
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export interface F35Props {
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

interface MonitorItem {
  product_name: string;
  specification: string;
  new_specification: string;
  customer: string;
  reason: string;
  dev_completion_date: string;
  actual_completion_date: string;
  rejection_reason: string;
  action_taken: string;
  status: string;
  design_head_sign: string;
}

function parseItems(d: Record<string, unknown>): MonitorItem[] {
  const raw = d.items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as MonitorItem[];
  return [];
}

export function F35Template({ data, isTemplate = true, editMode = false, onChange, className }: F35Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, subKey: string, label: string) => {
    const item = items[idx] || {} as MonitorItem;
    return editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none" value={(item as any)[subKey] || ""} onChange={e => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], [subKey]: e.target.value };
        onChange?.("items", updated);
      }} placeholder={label} />
    ) : (
      <span className="text-[10px] leading-tight block">{(item as any)[subKey] || ""}</span>
    );
  };

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[5fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Design & Development Monitoring Register
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/35 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Month + Year ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Month 🡪</span> {inp("month", "Month", "w-32")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Year 🡪</span> {inp("year", "2026", "w-20")}
        </div>
      </div>

      {/* ── 11-Column Monitoring Table ── */}
      <div className="border-x border-b border-border overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-muted/70">
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[100px]">Product Name</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[90px]">Specification</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[110px]">New Specification</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[100px]">Name of the Customer</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[100px]">Reason of Development</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[80px]">Dev Completion Date</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[80px]">Actual Completion Date</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[90px]">Reason for Rejection</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[100px]">Action Taken</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[70px]">Status</th>
              <th className="border border-border p-1 font-semibold whitespace-nowrap min-w-[80px]">Design Head Sign</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, idx) => (
              <tr key={idx} className="even:bg-muted/20">
                <td className="border border-border p-1">{cellInp(idx, "product_name", "Product")}</td>
                <td className="border border-border p-1">{cellInp(idx, "specification", "Spec")}</td>
                <td className="border border-border p-1">{cellInp(idx, "new_specification", "New Spec")}</td>
                <td className="border border-border p-1">{cellInp(idx, "customer", "Customer")}</td>
                <td className="border border-border p-1">{cellInp(idx, "reason", "Reason")}</td>
                <td className="border border-border p-1">{cellInp(idx, "dev_completion_date", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "actual_completion_date", "Date")}</td>
                <td className="border border-border p-1">{cellInp(idx, "rejection_reason", "Reason")}</td>
                <td className="border border-border p-1">{cellInp(idx, "action_taken", "Action")}</td>
                <td className="border border-border p-1">{cellInp(idx, "status", "Status")}</td>
                <td className="border border-border p-1">{cellInp(idx, "design_head_sign", "Sign")}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} className="p-2 text-xs text-muted-foreground italic text-center">No monitoring items recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
