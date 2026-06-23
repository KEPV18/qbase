// ============================================================================
// F/22 — Corrective Action Report (CAR)
// Professional structured layout with 4 distinct blocks:
//   1. Header (Serial, Date, Department)
//   2. Non-Conformity Source (7 checkboxes)
//   3. Lifecycle Blocks: Defect → Action Plan → Execution → Documentation
//   4. Verification
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F22Props {
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

function arrVal(data: Record<string, unknown> | undefined, key: string): string[] {
  if (!data) return [];
  const v = data[key];
  if (!Array.isArray(v)) return [];
  return v.map(item => String(item));
}

function nestedBool(data: Record<string, unknown> | undefined, parent: string, child: string): boolean {
  if (!data) return false;
  const parentObj = data[parent];
  if (!parentObj || typeof parentObj !== "object") return false;
  const v = (parentObj as Record<string, unknown>)[child];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "on";
  return false;
}

const NC_SOURCE_KEYS: { key: string; label: string }[] = [
  { key: "raw_material_inspection", label: "Raw-Material Inspection and Testing" },
  { key: "inprocess_inspection", label: "Inprocess Inspection & Testing" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "final_inspection", label: "Final Inspection and Testing" },
  { key: "customer_complaints", label: "Handling of Customer Complaints" },
  { key: "internal_quality_audit", label: "Internal Quality Audit" },
  { key: "others", label: "Others" },
];

export function F22Template({ data, isTemplate = true, editMode = false, onChange, className }: F22Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

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
        className="w-full border border-border/50 bg-transparent text-sm px-3 py-2 rounded min-h-[4rem]"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-relaxed px-1">
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  const chk = (parent: string, child: string) => {
    const checked = nestedBool(d, parent, child);
    return editMode ? (
      <input
        type="checkbox"
        className="mx-1"
        checked={checked}
        onChange={e => {
          const current = (d[parent] as Record<string, unknown>) || {};
          const updated = { ...current, [child]: e.target.checked };
          onChange?.(parent, JSON.stringify(updated));
        }}
      />
    ) : (
      <span className="inline-flex items-center justify-center w-4 h-4 border border-foreground/30 align-middle mx-1 text-[10px] leading-none">
        {checked ? "✓" : ""}
      </span>
    );
  };

  const renderBulletList = (key: string) => {
    const items = arrVal(d, key);
    if (items.length > 0) {
      return (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    return <span className="text-muted-foreground italic">—</span>;
  };

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black", className)}>
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: HEADER — Serial, Department, Identified Date/By
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="border border-border rounded-t-lg overflow-hidden">
        <div className="bg-primary/10 px-4 py-2.5 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Corrective Action Report</h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              F/22 Rev No. {val(d, "sr_no") || (ph ? "{{SERIAL}}" : "—")} | Page 1 of 1
            </span>
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border bg-muted/10">
          <div className="px-4 py-2 border-r border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Serial</span>
            <span className="font-mono text-sm">{val(d, "sr_no") || (ph ? "{{SERIAL}}" : "—")}</span>
          </div>
          <div className="px-4 py-2 border-r border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Department</span>
            <span className="text-sm">{val(d, "department") || (ph ? "___" : "—")}</span>
          </div>
          <div className="px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Identified Date</span>
            <span className="text-sm">{val(d, "identified_date") || (ph ? "___" : "—")}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: NON-CONFORMITY SOURCE — 7 Checkboxes
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Non-Conformity Source
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
            {NC_SOURCE_KEYS.map(src => (
              <label key={src.key} className="flex items-center gap-2 cursor-pointer text-sm">
                {chk("non_conformity_source", src.key)}
                <span className={cn(
                  "text-xs",
                  nestedBool(d, "non_conformity_source", src.key)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}>
                  {src.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: LIFECYCLE BLOCKS
            ═══════════════════════════════════════════════════════════════════ */}

        {/* ── Block A: Defect Block — Description & Root Cause ── */}
        <div className="border-b border-border">
          <div className="bg-destructive/5 px-4 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive/80">
              🔴 Defect Block — Description & Root Cause
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-4 border-r border-border/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Description of Non-Conformity
              </span>
              <div className="text-sm leading-relaxed">
                {val(d, "description_of_non_conformity") || (ph ? "___" : "—")}
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Root Cause Analysis
              </span>
              <div className="text-sm leading-relaxed">
                {val(d, "root_cause_analysis") || (ph ? "___" : "—")}
              </div>
            </div>
          </div>
        </div>

        {/* ── Block B: Action Plan Block — Recommendations + Responsibility ── */}
        <div className="border-b border-border">
          <div className="bg-amber-500/5 px-4 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">
              🟡 Action Plan Block — Recommendations & Responsibility
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-4 border-r border-border/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Actions Recommended
              </span>
              {renderBulletList("actions_recommended")}
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Responsibility
              </span>
              <div className="text-sm font-medium">
                {val(d, "responsibility") || (ph ? "___" : "—")}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Identified By: <span className="font-medium text-foreground">{val(d, "identified_by") || (ph ? "___" : "—")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Block C: Execution Block — Actions Taken + Date/By ── */}
        <div className="border-b border-border">
          <div className="bg-emerald-500/5 px-4 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80">
              🟢 Execution Block — Actions Taken
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-4 border-r border-border/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Actions Taken
              </span>
              {renderBulletList("actions_taken")}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Action Date
                  </span>
                  <span className="text-sm">{val(d, "action_taken_date") || (ph ? "___" : "—")}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Taken By
                  </span>
                  <span className="text-sm">{val(d, "action_taken_by") || (ph ? "___" : "—")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Block D: Documentation Box ── */}
        <div className="border-b border-border">
          <div className="bg-blue-500/5 px-4 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600/80">
              🔵 Documentation — Change Summary
            </h3>
          </div>
          <div className="p-4">
            <div className="bg-muted/20 border border-border/50 rounded-md p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Document Change Summary
              </span>
              <div className="text-sm leading-relaxed">
                {val(d, "document_change_summary") || (ph ? "___" : "—")}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: VERIFICATION
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Verification of Effectiveness
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Planned Review Date
              </span>
              <span className="text-sm">{val(d, "planned_review_date") || (ph ? "___" : "—")}</span>
            </div>
          </div>
          <div className="bg-muted/10 border border-border/50 rounded-md p-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {val(d, "verification_status") || (ph ? "___" : "—")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
