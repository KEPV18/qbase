// ============================================================================
// QBase — Word-Style FormTemplateKit
// Complete redesign: Google Docs / Microsoft Word look for ALL 35 templates
// Clean label-above-value layout, elegant typography, dark mode aware.
// Maintains FULL backward compatibility with all existing 35 templates.
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FormTemplateBaseProps {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export interface DynamicRowItem {
  [key: string]: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Value Helpers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export function valAny(data: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!data) return "";
  for (const key of keys) {
    const v = data[key];
    if (v == null) continue;
    if (typeof v === "string") return v;
    if (String(v)) return String(v);
  }
  return "";
}

export function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

export function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Word-Style Design Tokens — refined for Google Docs look inside tables
// ─────────────────────────────────────────────────────────────────────────────

/** Label — small, muted, uppercase (Word style) */
export const labelCls =
  "text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-transparent px-3 py-2 align-top w-[180px]";

/** Value — clean dark text */
export const valueCls =
  "text-sm text-gray-900 dark:text-gray-100 px-3 py-2 leading-relaxed";

/** Empty value — dimmed italic */
export const emptyValueCls =
  "text-sm text-gray-300 dark:text-gray-600 italic px-3 py-2";

/** Title row — centered, bold */
export const titleCls =
  "text-lg font-bold text-gray-900 dark:text-gray-100 text-center py-3";

/** Header row — section header inside table */
export const headerCls =
  "text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-transparent";

/** Input field — clean underline style (Word-like) */
export const inputCls =
  "w-full text-sm px-2 py-1 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-300 focus:outline-none transition-colors";

/** Table cell with bottom border only (Word-like) */
export const tableCellCls =
  "px-3 py-2 text-sm text-left border-b border-gray-100 dark:border-gray-800";

/** Word-style cell wrapper */
export const cellCls =
  "border-b border-gray-100 dark:border-gray-800 align-top";

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPATIBLE Components
// Same signatures as before — but rendered in Word style
// All 35 existing templates continue to work unchanged
// ─────────────────────────────────────────────────────────────────────────────

/** Generic cell — uses div layout inside for Word style */
export const Cell: React.FC<{ children?: React.ReactNode; className?: string; colSpan?: number }> =
  ({ children, className, colSpan }) => (
    <td className={cn(cellCls, className)} colSpan={colSpan}>
      <div className="px-3 py-2">{children || <span className={emptyValueCls}>—</span>}</div>
    </td>
  );

/** Label cell — Word-style: small, uppercase, muted text */
export const LabelCell: React.FC<{ label: string; className?: string; colSpan?: number }> =
  ({ label, className, colSpan }) => (
    <td className={cn(cellCls, "w-[180px]", className)} colSpan={colSpan}>
      <div className="px-3 py-2">
        <span className={labelCls}>{label}</span>
      </div>
    </td>
  );

/** Value cell — date or text, editable in edit mode */
export const DateOrTextCell: React.FC<{
  data?: Record<string, unknown>;
  field: string;
  altFields?: string[];
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  defaultValue?: string;
  type?: "date" | "text";
}> = ({ data, field, altFields, editMode, onChange, defaultValue, type = "text" }) => {
  const display = altFields?.length
    ? valAny(data, field, ...altFields)
    : val(data, field);
  const value = display || defaultValue || "";

  if (editMode && onChange) {
    return (
      <td className={cellCls}>
        <div className="px-3 py-2">
          <input
            type={type}
            className={cn(inputCls, "max-w-full")}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={`Enter ${field}`}
          />
        </div>
      </td>
    );
  }
  return (
    <td className={cellCls}>
      <div className={cn(valueCls, !display && emptyValueCls)}>
        {display || "—"}
      </div>
    </td>
  );
};

/** Multi-line textarea cell, editable in edit mode */
export const TextAreaCell: React.FC<{
  data?: Record<string, unknown>;
  field: string;
  altFields?: string[];
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  rows?: number;
  placeholder?: string;
}> = ({ data, field, altFields, editMode, onChange, rows = 3, placeholder }) => {
  const display = altFields?.length
    ? valAny(data, field, ...altFields)
    : val(data, field);
  const value = display || "";

  if (editMode && onChange) {
    return (
      <td className={cellCls} colSpan={99}>
        <div className="px-3 py-2">
          <textarea
            className="w-full text-sm px-2 py-1 bg-transparent border border-gray-200 dark:border-gray-700 rounded-sm focus:border-gray-400 focus:outline-none resize-y min-h-[60px]"
            rows={rows}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={placeholder || `Enter ${field}`}
          />
        </div>
      </td>
    );
  }
  return (
    <td className={cellCls} colSpan={99}>
      <div className={cn(valueCls, !display && emptyValueCls, "whitespace-pre-wrap")}>
        {display || "—"}
      </div>
    </td>
  );
};

/** Label + Input row convenience component */
export const LabelInputRow: React.FC<{
  label: string;
  data?: Record<string, unknown>;
  field: string;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  type?: "date" | "text";
  defaultValue?: string;
}> = ({ label, data, field, editMode, onChange, type = "text", defaultValue }) => (
  <>
    <LabelCell label={label} />
    <DateOrTextCell data={data} field={field} editMode={editMode} onChange={onChange} defaultValue={defaultValue} type={type} />
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Word-Style Title Row — centered heading with metadata
// ─────────────────────────────────────────────────────────────────────────────

export const TitleRow: React.FC<{
  title: string;
  serial?: string;
  revision?: string;
  date?: string;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
}> = ({ title, serial, revision, date, editMode, onChange }) => (
  <tr>
    <td colSpan={99} className="border-b border-gray-200 dark:border-gray-700">
      <div className="text-center py-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {(serial || revision || date) && (
          <div className="flex justify-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {serial && <span className="font-mono">Serial: {serial}</span>}
            {revision && <span>Rev: {revision}</span>}
            {date && <span>Date: {date}</span>}
          </div>
        )}
      </div>
    </td>
  </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// Footer — Signatures
// ─────────────────────────────────────────────────────────────────────────────

export const FooterRow: React.FC<{
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
}> = ({ preparedBy, reviewedBy, approvedBy, editMode, onChange }) => (
  <tr>
    <td colSpan={99} className="border-t border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-3 py-3">
        <div>
          <span className={labelCls}>Prepared By</span>
          {editMode && onChange ? (
            <input className={inputCls} value={preparedBy || ""} onChange={(e) => onChange("prepared_by", e.target.value)} placeholder="Name" />
          ) : (
            <div className={cn(valueCls, !preparedBy && emptyValueCls)}>{preparedBy || "—"}</div>
          )}
        </div>
        <div>
          <span className={labelCls}>Reviewed By</span>
          {editMode && onChange ? (
            <input className={inputCls} value={reviewedBy || ""} onChange={(e) => onChange("reviewed_by", e.target.value)} placeholder="Name" />
          ) : (
            <div className={cn(valueCls, !reviewedBy && emptyValueCls)}>{reviewedBy || "—"}</div>
          )}
        </div>
        <div>
          <span className={labelCls}>Approved By</span>
          {editMode && onChange ? (
            <input className={inputCls} value={approvedBy || ""} onChange={(e) => onChange("approved_by", e.target.value)} placeholder="Name" />
          ) : (
            <div className={cn(valueCls, !approvedBy && emptyValueCls)}>{approvedBy || "—"}</div>
          )}
        </div>
      </div>
    </td>
  </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// Responsive Wrapper — Card Stack for Mobile
// ─────────────────────────────────────────────────────────────────────────────

export const ResponsiveTemplate: React.FC<{
  children: React.ReactNode;
  cardData?: Array<{ label: string; value: string; type?: "text" | "date" | "textarea" }>;
  className?: string;
}> = ({ children, cardData, className }) => (
  <div className={cn("w-full", className)}>
    <div className="hidden md:block">{children}</div>
    <div className="block md:hidden space-y-2">
      {cardData?.map((card, idx) => (
        <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{card.label}</p>
          <p className={cn("text-sm", card.value ? "text-gray-900 dark:text-gray-100" : "text-gray-300 dark:text-gray-600 italic")}>
            {card.value || "—"}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Row Manager Hook (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDynamicRowsOptions<T extends DynamicRowItem> {
  data: Record<string, unknown>;
  field: string;
  defaultItem: T;
  editMode: boolean;
  onChange?: (field: string, value: string) => void;
}

export function useDynamicRows<T extends DynamicRowItem>(options: UseDynamicRowsOptions<T>) {
  const { data, field, defaultItem, editMode, onChange } = options;

  const rows: T[] = React.useMemo(() => {
    const raw = data[field];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch { /* non-JSON string, ignore parse error */ }
    }
    if (Array.isArray(raw)) return raw as T[];
    return [defaultItem] as T[];
  }, [data, field, defaultItem]);

  const updateRows = useCallback((next: T[]) => {
    if (onChange) onChange(field, JSON.stringify(next));
  }, [field, onChange]);

  const addRow = useCallback(() => {
    updateRows([...rows, { ...defaultItem }]);
  }, [rows, defaultItem, updateRows]);

  const removeRow = useCallback((index: number) => {
    const next = rows.filter((_, i) => i !== index);
    updateRows(next.length ? next : [{ ...defaultItem }]);
  }, [rows, defaultItem, updateRows]);

  const updateRowField = useCallback((index: number, key: string, value: string) => {
    const next = rows.map((row, i) => i === index ? { ...row, [key]: value } : row);
    updateRows(next);
  }, [rows, updateRows]);

  return { rows, addRow, removeRow, updateRowField };
}

export { Plus, Trash2 };