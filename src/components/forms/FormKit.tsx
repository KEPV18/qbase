// ============================================================================
// QBase — FormKit: Shared Template Components
// Consistent styling for all form templates.
// Every template should import from here instead of reimplementing wrappers.
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
// 1. FORM WRAPPER — outermost container
// ════════════════════════════════════════════════════════════════════════

interface FormWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Hide the VEZLOO corporate header (e.g., for forms that don't have one) */
  noHeader?: boolean;
}

export function FormWrapper({ children, className, noHeader = false }: FormWrapperProps) {
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

// ════════════════════════════════════════════════════════════════════════
// 2. FORM HEADER — VEZLOO corporate branding
// ════════════════════════════════════════════════════════════════════════

interface FormHeaderProps {
  formCode: string;
  formName: string;
  serial?: string;
  pageNumber?: number;
}

export function FormHeader({ formCode, formName, serial, pageNumber = 1 }: FormHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-950 dark:to-blue-800 text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">VEZLOO</h2>
          <p className="text-xs text-blue-200">{formName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formCode}</p>
          <p className="text-[10px] text-blue-200">
            Rev No. {serial || `${formCode}-001`} &nbsp;|&nbsp; Page No. {pageNumber}
          </p>
        </div>
      </div>
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
        "gap-x-8 gap-y-2.5",
        columns === 3 ? "grid grid-cols-3" : "grid grid-cols-2",
      )}>
        {fields.map(f => (
          <div key={f.key} className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{f.label}:</span>
            {editMode ? (
              <input
                className="flex-1 bg-transparent text-[11px] outline-none border-b border-dashed border-foreground/40 pb-0.5 min-w-0"
                value={val(d, f.key)}
                onChange={e => onChange?.(f.key, e.target.value)}
              />
            ) : (
              <span className="text-[11px] text-foreground truncate">{val(d, f.key)}</span>
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
  /** Show alternating row backgrounds */
  striped?: boolean;
  className?: string;
}

export function FormTable({ columns, children, striped = true, className }: FormTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-border print:border-black text-xs">
        <thead>
          <tr className="bg-muted/50 dark:bg-muted/30 font-semibold">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  "border border-border print:border-black px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground",
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
  className?: string;
}

export function FormTableCell({ children, align, className }: FormTableCellProps) {
  return (
    <td className={cn(
      "border border-border print:border-black px-2 py-1.5 text-xs",
      align === "center" && "text-center",
      align === "right" && "text-right",
      className,
    )}>
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
    <div className={cn("px-6 py-4 border-t-2 border-border print:border-black", className)}>
      <div className={cn(
        "gap-8",
        columns === 3 && "grid grid-cols-3",
        columns === 2 && "grid grid-cols-2",
        columns === 1 && "flex justify-end",
      )}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col">
            <div className="border-b border-border dark:border-gray-600 pb-1 mb-1 min-h-[24px]">
              {editMode ? (
                <input
                  className="w-full bg-transparent text-xs outline-none"
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                  placeholder={f.label}
                />
              ) : (
                <span className="text-xs text-foreground">{val(d, f.key)}</span>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 6. FORM FOOTER — VEZLOO branding at bottom
// ════════════════════════════════════════════════════════════════════════

interface FormFooterProps {
  formCode: string;
  className?: string;
}

export function FormFooter({ formCode, className }: FormFooterProps) {
  return (
    <div className={cn("px-6 py-3 border-t border-border print:border-black flex justify-between items-center text-[10px] text-muted-foreground", className)}>
      <span className="font-semibold">VEZLOO</span>
      <span>{formCode}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 7. SECTION HEADING — for sub-sections within a form
// ════════════════════════════════════════════════════════════════════════

interface FormSectionProps {
  title: string;
  className?: string;
}

export function FormSection({ title, className }: FormSectionProps) {
  return (
    <div className={cn("px-6 py-2 bg-muted/50 dark:bg-muted/30 border-x border-b border-border print:border-black text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>
      {title}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 8. INFO CALLOUT — blue/green/amber info box
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
    <div className={cn("border rounded-sm px-3 py-2 text-xs", styles[variant], className)}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 9. INPUT HELPERS
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
