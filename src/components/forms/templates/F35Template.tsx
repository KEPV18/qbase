// ============================================================================
// F/35 — Design & Development Monitoring Register
// DOCX: 11C x 19R — Title + Rev, 11-col headers, 17 data rows
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F35Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
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

const HEADERS = [
  "Product Name", "Specification", "New Specification", "Name of the Customer",
  "Reason of Development", "Dev Completion Date", "Actual Completion Date",
  "Reason for Rejection", "Action Taken", "Status", "Design Head Sign",
] as const;

const KEYS: (keyof MonitorItem)[] = [
  "product_name", "specification", "new_specification", "customer",
  "reason", "dev_completion_date", "actual_completion_date",
  "rejection_reason", "action_taken", "status", "design_head_sign",
];

export function F35Template({ data, isTemplate = true, editMode = false, onChange, className }: F35Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);

  const cellInp = (idx: number, subKey: keyof MonitorItem, label: string) => {
    const item = items[idx] || ({} as MonitorItem);
    return editMode ? (
      <input
        className="w-full bg-transparent text-[9px] px-0.5 border-none outline-none"
        value={(item as any)[subKey] || ""}
        onChange={e => {
          const updated = [...items];
          updated[idx] = { ...updated[idx], [subKey]: e.target.value };
          onChange?.("items", updated);
        }}
        placeholder={label}
      />
    ) : (
      <span className="text-[9px] leading-tight block">{(item as any)[subKey] || ""}</span>
    );
  };

  return (
    <FormDocument formCode="F/35" formName="Design Monitoring" serial={val(d, "serial")} sectionName="R&D & Design">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {/* Row 0: Title + Rev No */}
            <tr>
              <td colSpan={9} className="border border-border p-2 font-bold text-sm">Design &amp; Development Monitoring Register</td>
              <td colSpan={2} className="border border-border p-2 text-right bg-muted/30">
                F 35 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: 11-column headers */}
            <tr className="bg-muted/50">
              {HEADERS.map((h, i) => (
                <th key={i} className="border border-border p-1 font-semibold whitespace-nowrap text-[9px]">{h}</th>
              ))}
            </tr>

            {/* Rows 2-18: 17 data rows */}
            {Array.from({ length: 17 }).map((_, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                {KEYS.map((k, ki) => (
                  <td key={ki} className="border border-border p-0.5">{cellInp(idx, k, HEADERS[ki])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
