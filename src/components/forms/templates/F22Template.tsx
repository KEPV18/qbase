// ============================================================================
// F/22 — Corrective Action Report
// Canonical 15-field schema matching the DOCX template exactly.
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

function boolVal(data: Record<string, unknown> | undefined, key: string): boolean {
  if (!data) return false;
  const v = data[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "on";
  return false;
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
        className="w-full border border-border/50 bg-transparent text-sm px-2 py-1 rounded min-h-[3rem]"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
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

  const listItems = (key: string) => {
    const items = arrVal(d, key);
    if (items.length > 0) {
      return (
        <ul className="list-disc list-inside space-y-0.5 text-sm">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    return <span className="text-muted-foreground italic">—</span>;
  };

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[2fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Corrective Action Report</div>
        <div className="p-2 border-l border-border bg-primary/5 text-center text-xs">
          F/22 Rev No. {val(d, "sr_no") || (ph ? "{{SERIAL}}" : "—")}<br />Page 1 of 1
        </div>
      </div>

      {/* ── Sr No / Department ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">Sr. No. 🡪 {val(d, "sr_no") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Department 🡪 {inp("department", "Department", "w-36")}</div>
      </div>

      {/* ── Non-Conformity Source (Checkboxes) ── */}
      <div className="border-x border-b border-border p-2 text-xs">
        <div className="font-semibold mb-1.5">Non-Conformity Source:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {NC_SOURCE_KEYS.map(src => (
            <label key={src.key} className="flex items-center gap-1 cursor-pointer">
              {chk("non_conformity_source", src.key)}
              <span>{src.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Description of Non-Conformity ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Description of Non-Conformity:</div>
        {txt("description_of_non_conformity", "Describe the non-conformity")}
      </div>

      {/* ── Root Cause Analysis ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Root Cause Analysis:</div>
        {txt("root_cause_analysis", "Root cause analysis")}
      </div>

      {/* ── Identified Date / Identified By ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          Identified Date 🡪 {inp("identified_date", "DD/MM/YYYY", "w-28")}
        </div>
        <div className="p-1.5">
          Identified By 🡪 {inp("identified_by", "Identified by", "w-36")}
        </div>
      </div>

      {/* ── Actions Recommended ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Actions Recommended:</div>
        {txt("actions_recommended", "Recommended corrective actions")}
      </div>

      {/* ── Responsibility ── */}
      <div className="border-x border-b border-border p-1.5 text-xs">
        Responsibility 🡪 {inp("responsibility", "Responsible person", "w-48")}
      </div>

      {/* ── Actions Taken ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Actions Taken:</div>
        {txt("actions_taken", "Actions taken")}
      </div>

      {/* ── Action Taken Date / Action Taken By ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          Action Taken Date 🡪 {inp("action_taken_date", "DD/MM/YYYY", "w-28")}
        </div>
        <div className="p-1.5">
          Action Taken By 🡪 {inp("action_taken_by", "Action taken by", "w-36")}
        </div>
      </div>

      {/* ── Document Change Summary ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Document Change Summary:</div>
        {txt("document_change_summary", "Summary of document changes")}
      </div>

      {/* ── Planned Review Date ── */}
      <div className="border-x border-b border-border p-1.5 text-xs">
        Planned Review Date 🡪 {inp("planned_review_date", "DD/MM/YYYY", "w-28")}
      </div>

      {/* ── Verification Status ── */}
      <div className="border-x border-b border-border p-2">
        <div className="text-xs font-semibold mb-1">Verification of Effectiveness:</div>
        {txt("verification_status", "Verification status — to be filled after one month review")}
      </div>
    </div>
  );
}
