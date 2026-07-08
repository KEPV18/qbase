// ============================================================================
// F/19 — Product Description Form
// DOCX: Sr. No | Parameters | Description — 14 product attributes
// Redesigned with alternating accent-tinted rows and icon indicators
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Package, FlaskConical, Shield, Boxes, Truck, FileText, AlertCircle, Scale, MapPin, BookOpen, Target, HeartPulse, ClipboardList, ScrollText } from "lucide-react";
import { FormDocument } from "../FormKit";

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
  { key: "product_name", label: "Product Name", icon: Package },
  { key: "process_name", label: "Process Name", icon: FlaskConical },
  { key: "composition", label: "Composition", icon: Boxes },
  { key: "end_product_characteristics", label: "End Product Characteristics", icon: Shield },
  { key: "method_of_prevention", label: "Method of Prevention", icon: AlertCircle },
  { key: "storage_condition", label: "Storage Condition", icon: Truck },
  { key: "distribution_method", label: "Distribution Method", icon: MapPin },
  { key: "support_update_period", label: "Support & Update Period", icon: FileText },
  { key: "licensing_legal", label: "Licensing & Legal Notices", icon: Scale },
  { key: "customer_use_guide", label: "Customer Use & Setup Guide", icon: BookOpen },
  { key: "where_sold", label: "Where It Is To Be Sold", icon: Target },
  { key: "sensitive_consumer", label: "Sensitive Consumer", icon: HeartPulse },
  { key: "intended_use", label: "Intended Use", icon: ClipboardList },
  { key: "regulatory_requirements", label: "Regulatory Requirements", icon: ScrollText },
];

const FC = "F/19";

export function F19Template({ data, isTemplate = true, editMode = false, onChange, className }: F19Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  return (
    <FormDocument formCode={FC} formName="Product Description" serial={val(d, "serial")} sectionName="Operations & Production" className={className}>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FIELDS.map((field, idx) => {
            const Icon = field.icon;
            const isEven = idx % 2 === 0;
            return (
              <div
                key={field.key}
                className={cn(
                  "flex gap-3 rounded-md border p-3 transition-colors",
                  isEven
                    ? "border-lime-200 dark:border-lime-800 bg-lime-50/40 dark:bg-lime-950/20"
                    : "border-border bg-muted/10",
                )}
              >
                {/* Sr No + Icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center",
                    isEven ? "bg-lime-100 dark:bg-lime-900/50 text-lime-700 dark:text-lime-300" : "bg-muted/40 text-muted-foreground",
                  )}>
                    <Icon size={14} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">{idx + 1}</span>
                </div>
                {/* Label + Value */}
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-wide block mb-1",
                    isEven ? "text-lime-700 dark:text-lime-300" : "text-muted-foreground",
                  )}>
                    {field.label}
                  </span>
                  {editMode ? (
                    <input
                      className="w-full bg-transparent text-[12px] font-semibold outline-none border-b border-dashed border-border pb-0.5 text-foreground"
                      value={val(d, field.key)}
                      onChange={e => onChange?.(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  ) : (
                    <p className="text-[12px] font-semibold text-foreground leading-relaxed">
                      {val(d, field.key) || (ph ? "___" : "")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FormDocument>
  );
}