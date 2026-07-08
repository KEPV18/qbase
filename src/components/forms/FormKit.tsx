// ============================================================================
// QBase — FormKit: Unified Template Components
// Fixed VEZLOO header + footer, consistent table/signature styling.
// Every template imports from here for consistent rendering.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

// ── Props shared by all templates ──────────────────────────────────────
export interface BaseTemplateProps {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

/** Safe value extractor — returns "" for null/undefined */
export function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

// ════════════════════════════════════════════════════════════════════════
// 1. FORM DOCUMENT — the main page wrapper (fixed header + footer)
// ════════════════════════════════════════════════════════════════════════

interface FormDocumentProps {
  children: React.ReactNode;
  className?: string;
  /** Form code e.g. "F/28" */
  formCode: string;
  /** Form name e.g. "Training Attendance Sheet" */
  formName: string;
  /** Record serial e.g. "F/28-001" */
  serial?: string;
  /** Section name e.g. "HR & Training" */
  sectionName?: string;
  /** Page number (default 1) */
  pageNumber?: number;
}

export function FormDocument({
  children, className, formCode, formName, serial, sectionName, pageNumber = 1,
}: FormDocumentProps) {
  return (
    <div className={cn(
      "w-full bg-background text-foreground text-sm",
      "print:bg-white print:text-black print:border-black print:shadow-none print:rounded-none",
      className,
    )}>
      {/* ── FIXED HEADER ── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-950 dark:to-blue-800 text-white px-6 py-4 print:bg-white print:text-black print:border-b-2 print:border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center print:bg-black print:text-white">
              <span className="text-sm font-black tracking-tight">V</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">VEZLOO</h1>
              <p className="text-[11px] text-blue-200 print:text-gray-500">{formName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold font-mono">{formCode}</p>
            <p className="text-[10px] text-blue-200 print:text-gray-500">
              Rev No. {serial || `${formCode}-001`} &nbsp;·&nbsp; Page {pageNumber}
            </p>
            {sectionName && (
              <p className="text-[9px] text-blue-300 print:text-gray-400 mt-0.5">{sectionName}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="min-h-[400px]">
        {children}
      </div>

      {/* ── FIXED FOOTER ── */}
      <div className="bg-slate-50 dark:bg-[#151515] border-t border-border px-6 py-3 print:bg-white print:border-t-2 print:border-black flex items-center justify-between text-[10px] text-muted-foreground print:text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-black text-foreground dark:text-white print:text-black">VEZLOO</span>
          <span className="text-border">·</span>
          <span>{sectionName || "Quality Management System"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">{formCode}</span>
          <span className="text-border">·</span>
          <span>Page {pageNumber}</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 2. FORM HEADER — in-page section header (for forms with metadata grids)
// ════════════════════════════════════════════════════════════════════════

interface FormHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function FormHeader({ children, className }: FormHeaderProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-border print:border-black", className)}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 3. FORM META GRID — metadata fields (Topic, Department, etc.)
// ════════════════════════════════════════════════════════════════════════

interface MetaField {
  label: string;
  key: string;
}

interface FormMetaGridProps {
  fields: MetaField[];
  data: Record<string, unknown>;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  columns?: 2 | 3;
  className?: string;
}

export function FormMetaGrid({ fields, data, editMode, onChange, columns = 2, className }: FormMetaGridProps) {
  const d = data ?? {};
  return (
    <div className={cn("px-6 py-4 border-b border-border print:border-black", className)}>
      <div className={cn(
        "gap-x-8 gap-y-3",
        columns === 3 ? "grid grid-cols-3" : "grid grid-cols-2",
      )}>
        {fields.map(f => (
          <div key={f.key} className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">{f.label}:</span>
            {editMode ? (
              <input
                className="flex-1 bg-transparent text-sm outline-none border-b border-dashed border-foreground/40 pb-0.5 min-w-0"
                value={val(d, f.key)}
                onChange={e => onChange?.(f.key, e.target.value)}
              />
            ) : (
              <span className="text-sm text-foreground flex-1 border-b border-dashed border-foreground/20 pb-0.5 min-w-0">
                {val(d, f.key) || "\u00A0"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 4. FORM TABLE — consistent HTML table
// ════════════════════════════════════════════════════════════════════════

interface FormTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
}

interface FormTableProps {
  columns: FormTableColumn[];
  children: React.ReactNode;
  striped?: boolean;
  className?: string;
}

export function FormTable({ columns, children, striped = true, className }: FormTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-border print:border-black text-xs">
        <thead>
          <tr className="bg-muted/50 dark:bg-muted/30">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  "border border-border print:border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right",
                  !col.align && "text-left",
                  col.width,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface FormTableRowProps {
  children: React.ReactNode;
  index?: number;
  striped?: boolean;
  className?: string;
}

export function FormTableRow({ children, index = 0, striped = true, className }: FormTableRowProps) {
  return (
    <tr className={cn(
      striped && index % 2 === 1 && "bg-muted/20",
      className,
    )}>
      {children}
    </tr>
  );
}

interface FormTableCellProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}

export function FormTableCell({ children, align, colSpan, rowSpan, className }: FormTableCellProps) {
  return (
    <td
      className={cn(
        "border border-border print:border-black px-3 py-2 text-xs",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 5. FORM SIGNATURE — signature section
// ════════════════════════════════════════════════════════════════════════

interface SignatureField {
  label: string;
  key: string;
}

interface FormSignatureProps {
  fields: SignatureField[];
  data: Record<string, unknown>;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FormSignature({ fields, data, editMode, onChange, columns = 2, className }: FormSignatureProps) {
  const d = data ?? {};
  return (
    <div className={cn("px-6 py-5 border-t-2 border-border print:border-black", className)}>
      <div className={cn(
        "gap-10",
        columns === 3 && "grid grid-cols-3",
        columns === 2 && "grid grid-cols-2",
        columns === 1 && "flex justify-end",
      )}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col">
            <div className="min-h-[32px] border-b border-foreground/30 dark:border-foreground/20 pb-2 mb-2">
              {editMode ? (
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                  placeholder={f.label}
                />
              ) : (
                <span className="text-sm text-foreground">{val(d, f.key)}</span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 6. SECTION HEADING — for sub-sections within a form
// ════════════════════════════════════════════════════════════════════════

interface FormSectionProps {
  title: string;
  className?: string;
}

export function FormSection({ title, className }: FormSectionProps) {
  return (
    <div className={cn("px-6 py-2.5 bg-muted/50 dark:bg-muted/30 border-x border-b border-border print:border-black text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>
      {title}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 7. INFO CALLOUT — blue/green/amber info box
// ════════════════════════════════════════════════════════════════════════

interface FormCalloutProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning";
  className?: string;
}

export function FormCallout({ children, variant = "info", className }: FormCalloutProps) {
  const styles = {
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
    success: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  };
  return (
    <div className={cn("border rounded-sm px-4 py-3 text-xs", styles[variant], className)}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 8. INPUT HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Read-only field with dashed underline (template mode) */
export function FieldValue({ value, placeholder = "___" }: { value: string; placeholder?: string }) {
  return (
    <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]">
      {value || placeholder}
    </span>
  );
}

/** Editable input with dashed underline */
export function FieldInput({
  value, onChange, placeholder, className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1 outline-none", className)}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════
// 9. FORM WRAPPER (legacy alias — prefer FormDocument)
// ════════════════════════════════════════════════════════════════════════

export function FormWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "w-full bg-background dark:bg-[#1e1d1a] text-foreground text-sm",
      "print:bg-white print:text-black print:border-black print:shadow-none print:rounded-none",
      className,
    )}>
      {children}
    </div>
  );
}
