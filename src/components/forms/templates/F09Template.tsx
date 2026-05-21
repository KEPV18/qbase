// ============================================================================
// F/09 — Customer Complaint Report
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
// ============================================================================

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface F09Props {
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
  if (typeof v === "string") return v;
  return String(v);
}

function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/* 12-column grid matching DOCX proportions */

export function F09Template({ data, isTemplate = true, editMode = false, onChange, className }: F09Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;
  const [natureChecks, setNatureChecks] = useState<Record<string, boolean>>({
    serious: val(d, "complaint_nature") === "SERIOUS",
    major: val(d, "complaint_nature") === "MAJOR",
    minor: val(d, "complaint_nature") === "MINOR",
  });

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const inputCls = "w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600";

  // ── Cell helpers ────────────────────────────────────────────────────
  const Cell = ({ field, colSpan, className, placeholder, readonly: forceReadonly }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
    readonly?: boolean;
  }) => {
    const value = val(d, field);
    const isReadonly = forceReadonly ?? readonly;
    if (isReadonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !value && "text-slate-300 dark:text-slate-600")}>
          {value || (isTemplate ? (placeholder || "") : "")}
        </td>
      );
    }
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="text"
          value={value}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || ""}
          className={inputCls}
        />
      </td>
    );
  };

  const TextAreaCell = ({ field, colSpan, className, placeholder, rows = 3 }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
    rows?: number;
  }) => {
    const value = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !value && "text-slate-300 dark:text-slate-600", "whitespace-pre-wrap")}>
          {value || (isTemplate ? (placeholder || "") : "")}
        </td>
      );
    }
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <textarea
          value={value}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || ""}
          rows={rows}
          className={cn(inputCls, "resize-y")}
        />
      </td>
    );
  };

  const DateOrTextCell = ({ field, colSpan, className, defaultToday, placeholder }: {
    field: string;
    colSpan?: number;
    className?: string;
    defaultToday?: boolean;
    placeholder?: string;
  }) => {
    const rawValue = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !rawValue && "text-slate-300 dark:text-slate-600")}>
          {rawValue || (isTemplate ? (placeholder || "DD/MM/YYYY") : "")}
        </td>
      );
    }
    const displayValue = rawValue || (defaultToday ? todayDDMMYYYY() : "");
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="text"
          value={displayValue}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || "DD/MM/YYYY"}
          className={inputCls}
        />
      </td>
    );
  };

  const LabelCell = ({ text, colSpan, className }: { text: string; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={cn(labelCls, className)}>{text}</td>
  );

  // Label on left + input on right, in same row
  const LabelInputRow = ({ label, field, labelSpan, inputSpan, placeholder }: {
    label: string; field: string; labelSpan: number; inputSpan: number; placeholder?: string;
  }) => (
    <tr>
      <LabelCell text={label} colSpan={labelSpan} />
      <Cell field={field} colSpan={inputSpan} placeholder={placeholder} />
    </tr>
  );

  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
        </colgroup>
        <tbody>
          {/* ── Row 0: Title + Serial ─────────────────────── */}
          <tr>
            <td colSpan={11} className={cn(titleCls, "text-center text-lg")}>
              Customer Complaint Report
            </td>
            <td colSpan={1} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
              F/09<br />
              {editMode && !isTemplate ? (
                <input
                  className="w-full text-xs bg-transparent outline-none text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  value={serialValue}
                  onChange={e => onChange?.("serial", e.target.value)}
                  placeholder="F/09-001"
                />
              ) : (
                `Rev ${serialValue || "No.00"}`
              )}
            </td>
          </tr>

          {/* ── Row 1: Complaint Sr. No. label + value | Date label + value ── */}
          <tr>
            <LabelCell text="Complaint Sr. No." colSpan={7} />
            <LabelCell text="Date" colSpan={5} />
          </tr>
          <tr>
            <Cell field="serial" colSpan={7} placeholder="Auto-generated" />
            <DateOrTextCell field="date" colSpan={5} defaultToday={editMode && !isTemplate} />
          </tr>

          {/* ── Row 2-3: Receipt of Complaint section ────── */}
          {/*  DOCX: "Receipt of Complaint" merged vertically over R2-R4
              R2: Receipt of Complaint | Date: [input] | Received By: [input]
              R3: (cont)              | Time: [input] | (cont)
          */}
          <tr>
            <LabelCell text="Receipt of Complaint" rowSpan={2} colSpan={1} className="text-xs align-middle" />
            <LabelCell text="Date" colSpan={3} />
            <DateOrTextCell field="receipt_date" colSpan={3} placeholder="DD/MM/YYYY" />
            <LabelCell text="Received By" rowSpan={2} colSpan={2} className="align-middle" />
            <Cell field="received_by" rowSpan={2} colSpan={3} placeholder="Name" />
          </tr>
          <tr>
            <LabelCell text="Time" colSpan={3} />
            <Cell field="receipt_time" colSpan={3} placeholder="HH:MM" />
          </tr>

          {/* ── Row 4: Mode of Receipt — LABEL on left, INPUT on right ── */}
          <LabelInputRow label="Mode of Receipt" field="mode_of_receipt" labelSpan={7} inputSpan={5} placeholder="Email / Phone / Letter / In-person" />

          {/* ── Row 5: Customer Name — LABEL on left, INPUT on right ── */}
          <LabelInputRow label="Customer Name" field="client_name" labelSpan={7} inputSpan={5} placeholder="Customer name" />

          {/* ── Row 6-7: Details of Product ───────────────────── */}
          {/*  DOCX: R6 is label spanning full row, R7 has "Type Of Product" label + input */}
          <tr>
            <LabelCell text="Details of Product" colSpan={12} />
          </tr>
          <tr>
            <LabelCell text="Type Of Product" colSpan={2} />
            <Cell field="product_type" colSpan={10} placeholder="Product / service type" />
          </tr>
          {/* Extra row for product details text input (the DOCX has space for free-text product details) */}
          <tr>
            <Cell field="product_details" colSpan={12} placeholder="Product name, model, batch no., etc." />
          </tr>

          {/* ── Row 8: Description Of Complaints ─────────────── */}
          <tr>
            <LabelCell text="Description Of Complaints" colSpan={12} />
          </tr>
          <tr>
            <TextAreaCell field="description" colSpan={12} placeholder="Describe the complaint in detail..." />
          </tr>

          {/* ── Row 9-10: Nature Of Complaints ──────────────── */}
          {/*  DOCX: R9 is header row: "Nature Of Complaints" | SERIOUS | MAJOR | MINOR
              R10 is the selection row with checkboxes/radios BELOW each label
              → The labels (SERIOUS/MAJOR/MINOR) are HEADERS, not clickable areas.
              The input row below has the actual radio buttons.
          */}
          <tr>
            <LabelCell text="Nature Of Complaints" colSpan={3} />
            <td colSpan={3} className="bg-slate-100 dark:bg-slate-800 font-semibold text-sm text-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">SERIOUS</td>
            <td colSpan={3} className="bg-slate-100 dark:bg-slate-800 font-semibold text-sm text-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">MAJOR</td>
            <td colSpan={3} className="bg-slate-100 dark:bg-slate-800 font-semibold text-sm text-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">MINOR</td>
          </tr>
          {/* Checkbox row — small checkmark area, NOT full-width radio buttons */}
          <tr>
            <td colSpan={3} className="bg-white dark:bg-slate-900 text-center py-2 border border-slate-300 dark:border-slate-600 min-h-[2rem]">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature_f09" value="SERIOUS"
                  checked={natureChecks.serious}
                  onChange={() => {
                    setNatureChecks({ serious: true, major: false, minor: false });
                    onChange?.("complaint_nature", "SERIOUS");
                  }}
                  className="accent-indigo-500 w-4 h-4" />
              ) : (val(d, "complaint_nature") === "SERIOUS" ? "✓" : "")}
            </td>
            <td colSpan={3} className="bg-white dark:bg-slate-900 text-center py-2 border border-slate-300 dark:border-slate-600 min-h-[2rem]">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature_f09" value="MAJOR"
                  checked={natureChecks.major}
                  onChange={() => {
                    setNatureChecks({ serious: false, major: true, minor: false });
                    onChange?.("complaint_nature", "MAJOR");
                  }}
                  className="accent-indigo-500 w-4 h-4" />
              ) : (val(d, "complaint_nature") === "MAJOR" ? "✓" : "")}
            </td>
            <td colSpan={3} className="bg-white dark:bg-slate-900 text-center py-2 border border-slate-300 dark:border-slate-600 min-h-[2rem]">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature_f09" value="MINOR"
                  checked={natureChecks.minor}
                  onChange={() => {
                    setNatureChecks({ serious: false, major: false, minor: true });
                    onChange?.("complaint_nature", "MINOR");
                  }}
                  className="accent-indigo-500 w-4 h-4" />
              ) : (val(d, "complaint_nature") === "MINOR" ? "✓" : "")}
            </td>
          </tr>

          {/* ── R11: Corrective Action Taken ──────────────── */}
          <tr>
            <LabelCell text="Corrective Action Taken" colSpan={12} />
          </tr>
          <tr>
            <TextAreaCell field="corrective_action" colSpan={12} placeholder="Describe corrective actions taken..." />
          </tr>

          {/* ── R12-14: Result / Actions / Customer Informed ── */}
          <tr>
            <LabelCell text="Result Of Action Taken" colSpan={5} />
            <LabelCell text="Actions Proposed For Future" colSpan={7} />
          </tr>
          <tr>
            <TextAreaCell field="result_of_action" colSpan={5} rows={3} />
            <TextAreaCell field="actions_proposed" colSpan={7} rows={3} />
          </tr>

          {/* Customer Informed section — DOCX has "Customer Informed Vide" as header
              with two sub-rows: Vide [input] and Date [input]  */}
          <tr>
            <td colSpan={5} />
            <LabelCell text="Customer Informed Vide" colSpan={7} />
          </tr>
          {/* Sub-row 1: Vide reference input */}
          <tr>
            <td colSpan={5} />
            <LabelCell text="Vide" colSpan={2} />
            <Cell field="customer_informed_vide" colSpan={5} placeholder="Reference / Memo no." />
          </tr>
          {/* Sub-row 2: Date input */}
          <tr>
            <td colSpan={5} />
            <LabelCell text="Date" colSpan={2} />
            <DateOrTextCell field="customer_informed_date" colSpan={5} placeholder="DD/MM/YYYY" />
          </tr>

          {/* ── R15: Analysed By / Closed By ──────────────── */}
          <tr>
            <LabelCell text="Analysed By:" colSpan={5} />
            <LabelCell text="Closed By — Authorised Person" colSpan={7} />
          </tr>
          <tr>
            <Cell field="analysed_by" colSpan={5} placeholder="Name & Signature" />
            <Cell field="closed_by" colSpan={7} placeholder="Name & Signature" />
          </tr>

          {/* ── VEZLOO footer ────────────────────────────── */}
          <tr>
            <td colSpan={12} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}