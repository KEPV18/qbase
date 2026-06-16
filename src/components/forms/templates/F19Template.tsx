// ============================================================================
// F/19 — Product Description Form
// DOCX: 1 table, 15 rows, 3 cols: Sr. No | Parameters | Description
// Simple key-value form listing product attributes.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F19Props {
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
  return typeof v === "string" ? v : String(v);
}

const FIELDS = [
  { key: "product_name", label: "Product Name" },
  { key: "process_name", label: "Process Name" },
  { key: "composition", label: "Composition" },
  { key: "end_product_characteristics", label: "End Product Characteristics" },
  { key: "method_of_prevention", label: "Method of Prevention" },
  { key: "storage_condition", label: "Storage Condition" },
  { key: "distribution_method", label: "Distribution Method" },
  { key: "support_update_period", label: "Support & Update Period" },
  { key: "licensing_legal", label: "Licensing & Legal Notices" },
  { key: "customer_use_guide", label: "Customer Use and Installation/Setup Guide" },
  { key: "where_sold", label: "Where It Is To Be Sold" },
  { key: "sensitive_consumer", label: "Sensitive Consumer" },
  { key: "intended_use", label: "Intended Use" },
  { key: "regulatory_requirements", label: "Regulatory Requirements" },
];

export function F19Template({ data, isTemplate = true, editMode = false, onChange, className }: F19Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="text-center font-bold text-base border-b border-black pb-2 mb-4 flex justify-between items-end">
        <div className="text-left text-xs text-muted-foreground">F/19</div>
        <div>Product Description Form</div>
        <div className="text-right text-xs">
          Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1.5 text-center w-12">Sr. No.</th>
            <th className="border border-black p-1.5 text-left w-1/3">Parameters</th>
            <th className="border border-black p-1.5 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map((field, idx) => (
            <tr key={field.key} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="border border-black p-1.5 text-center">{idx + 1}</td>
              <td className="border border-black p-1.5 font-medium">{field.label}</td>
              <td className="border border-black p-1.5">
                {editMode ? (
                  <input
                    className="w-full bg-transparent text-xs px-1 border-none outline-none"
                    value={val(d, field.key)}
                    onChange={e => onChange?.(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                ) : (
                  val(d, field.key) || (ph ? "___" : "")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}