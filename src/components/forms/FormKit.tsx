// ============================================================================
// QBase — FormKit: Unified Template Components
// Single source of truth for ALL 35 form templates.
// Enforces consistent VEZLOO header, form title bar, content area, and footer.
// Theme-aware: uses CSS variables that adapt to light/dark mode.
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
// 1. FORM DOCUMENT — the main page wrapper (unified for all 35 templates)
//    Full-width page with VEZLOO header, title bar, content, footer.
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
      "w-full bg-card text-foreground font-[Arial,sans-serif] text-[11px]",
      "border border-border rounded-sm shadow-sm overflow-hidden",
      "print:bg-white print:text-black print:shadow-none print:rounded-none print:border-black",
      className,
    )}>
      {/* ── VEZLOO HEADER ── */}
      <div className="text-center py-2.5 border-b border-border bg-card">
        <span className="text-[15px] font-bold tracking-[0.2em] text-foreground">VEZLOO</span>
      </div>

      {/* ── FORM TITLE BAR ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-bold text-foreground uppercase truncate">{formName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-muted-foreground">
          {sectionName && <span className="hidden sm:inline">{sectionName}</span>}
          {sectionName && <span className="text-border">|</span>}
          <span className="font-bold text-foreground/80">{formCode}</span>
          {serial && <><span className="text-border">|</span><span className="text-foreground/80">Rev: {serial}</span></>}
          <span className="text-border">|</span>
          <span>P.{pageNumber}</span>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="min-h-[300px]">
        {children}
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/40 text-[9px] text-muted-foreground font-mono">
        <span>VEZLOO — Quality Management System</span>
        <span>{formCode} · Page {pageNumber}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 2. FORM HEADER — in-page section header
// ════════════════════════════════════════════════════════════════════════

interface FormHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function FormHeader({ children, className }: FormHeaderProps) {
  return (
    <div className={cn("px-4 py-2.5 border-b border-border bg-muted/30", className)}>
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
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FormMetaGrid({ fields, data, editMode, onChange, columns = 2, className }: FormMetaGridProps) {
  const d = data ?? {};
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={cn("px-4 py-3 border-b border-border", className)}>
      <div className={cn("grid gap-x-6 gap-y-3", colClass)}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{f.label}</span>
            {editMode ? (
              <input
                className="w-full bg-transparent text-[11px] outline-none border-b border-dashed border-border pb-0.5 font-[Arial,sans-serif] text-foreground"
                value={val(d, f.key)}
                onChange={e => onChange?.(f.key, e.target.value)}
              />
            ) : (
              <span className="text-[11px] text-foreground pb-0.5 border-b border-dashed border-border min-h-[16px] font-[Arial,sans-serif]">
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
// 4. FORM TABLE — consistent HTML table with theme-aware borders
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
      <table className="w-full border-collapse text-[11px] font-[Arial,sans-serif]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  "border border-border px-2 py-1.5 text-[10px] font-bold text-foreground bg-muted/50 uppercase tracking-wide",
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
        "border border-border px-2 py-1.5 text-[11px] font-[Arial,sans-serif] text-foreground",
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
// 5. FORM SIGNATURE — signature section at bottom of form
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
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormSignature({ fields, data, editMode, onChange, columns = 2, className }: FormSignatureProps) {
  const d = data ?? {};
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : columns === 1 ? "flex justify-end" : "grid-cols-2";
  return (
    <div className={cn("px-4 py-4 border-t border-border", className)}>
      <div className={cn("gap-6", colClass)}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col">
            <div className="min-h-[24px] border-b border-border pb-1 mb-1">
              {editMode ? (
                <input
                  className="w-full bg-transparent text-[11px] outline-none font-[Arial,sans-serif] text-foreground"
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                  placeholder={f.label}
                />
              ) : (
                <span className="text-[11px] text-foreground font-[Arial,sans-serif]">{val(d, f.key)}</span>
              )}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{f.label}</p>
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
    <div className={cn("px-4 py-2 bg-muted/40 border-x border-t border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider", className)}>
      {title}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 7. INFO CALLOUT — colored info box
// ════════════════════════════════════════════════════════════════════════

interface FormCalloutProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning";
  className?: string;
}

export function FormCallout({ children, variant = "info", className }: FormCalloutProps) {
  const styles = {
    info: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={cn("border rounded-sm px-4 py-3 text-[11px]", styles[variant], className)}>
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
    <span className="border-b border-dashed border-border px-1 inline-block min-w-[4rem] text-[11px] font-[Arial,sans-serif] text-foreground">
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
      className={cn("border-b border-dashed border-border bg-transparent text-[11px] px-1 outline-none font-[Arial,sans-serif] text-foreground", className)}
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
      "w-full bg-card text-foreground text-[11px] font-[Arial,sans-serif]",
      "border border-border rounded-sm shadow-sm overflow-hidden",
      "print:bg-white print:text-black print:shadow-none print:rounded-none print:border-black",
      className,
    )}>
      {children}
    </div>
  );
}