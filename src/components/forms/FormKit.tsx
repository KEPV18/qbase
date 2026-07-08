// ============================================================================
// QBase — FormKit: Unified Template Components
// Single source of truth for ALL 35 form templates.
// Enforces consistent VEZLOO header, form title bar, content area, and footer.
// Theme-aware: uses CSS variables that adapt to light/dark mode.
// Each form gets a unique accent color for visual variety and readability.
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
// ACCENT COLOR SYSTEM — Each form gets a unique color theme
// ════════════════════════════════════════════════════════════════════════

export type FormAccent =
  | "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan"
  | "indigo" | "orange" | "teal" | "pink" | "purple" | "lime"
  | "sky" | "fuchsia" | "red" | "green";

const ACCENT_MAP: Record<FormAccent, {
  text: string;       // colored text
  textDark: string;   // dark mode text
  bg: string;         // light bg tint
  bgDark: string;      // dark bg tint
  border: string;     // border color
  borderDark: string; // dark border
  gradient: string;   // gradient for header
  gradientDark: string;
  chip: string;       // small chip bg
  chipDark: string;
  label: string;      // label text color
  labelDark: string;
  value: string;      // answer value color
  valueDark: string;  // dark answer value
}> = {
  blue: {
    text: "text-blue-600", textDark: "dark:text-blue-400",
    bg: "bg-blue-50", bgDark: "dark:bg-blue-950/40",
    border: "border-blue-200", borderDark: "dark:border-blue-800",
    gradient: "from-blue-600 to-blue-800", gradientDark: "dark:from-blue-500 dark:to-blue-700",
    chip: "bg-blue-100", chipDark: "dark:bg-blue-900/50",
    label: "text-blue-700", labelDark: "dark:text-blue-300",
    value: "text-blue-900", valueDark: "dark:text-blue-100",
  },
  emerald: {
    text: "text-emerald-600", textDark: "dark:text-emerald-400",
    bg: "bg-emerald-50", bgDark: "dark:bg-emerald-950/40",
    border: "border-emerald-200", borderDark: "dark:border-emerald-800",
    gradient: "from-emerald-600 to-emerald-800", gradientDark: "dark:from-emerald-500 dark:to-emerald-700",
    chip: "bg-emerald-100", chipDark: "dark:bg-emerald-900/50",
    label: "text-emerald-700", labelDark: "dark:text-emerald-300",
    value: "text-emerald-900", valueDark: "dark:text-emerald-100",
  },
  violet: {
    text: "text-violet-600", textDark: "dark:text-violet-400",
    bg: "bg-violet-50", bgDark: "dark:bg-violet-950/40",
    border: "border-violet-200", borderDark: "dark:border-violet-800",
    gradient: "from-violet-600 to-violet-800", gradientDark: "dark:from-violet-500 dark:to-violet-700",
    chip: "bg-violet-100", chipDark: "dark:bg-violet-900/50",
    label: "text-violet-700", labelDark: "dark:text-violet-300",
    value: "text-violet-900", valueDark: "dark:text-violet-100",
  },
  amber: {
    text: "text-amber-600", textDark: "dark:text-amber-400",
    bg: "bg-amber-50", bgDark: "dark:bg-amber-950/40",
    border: "border-amber-200", borderDark: "dark:border-amber-800",
    gradient: "from-amber-600 to-amber-800", gradientDark: "dark:from-amber-500 dark:to-amber-700",
    chip: "bg-amber-100", chipDark: "dark:bg-amber-900/50",
    label: "text-amber-700", labelDark: "dark:text-amber-300",
    value: "text-amber-900", valueDark: "dark:text-amber-100",
  },
  rose: {
    text: "text-rose-600", textDark: "dark:text-rose-400",
    bg: "bg-rose-50", bgDark: "dark:bg-rose-950/40",
    border: "border-rose-200", borderDark: "dark:border-rose-800",
    gradient: "from-rose-600 to-rose-800", gradientDark: "dark:from-rose-500 dark:to-rose-700",
    chip: "bg-rose-100", chipDark: "dark:bg-rose-900/50",
    label: "text-rose-700", labelDark: "dark:text-rose-300",
    value: "text-rose-900", valueDark: "dark:text-rose-100",
  },
  cyan: {
    text: "text-cyan-600", textDark: "dark:text-cyan-400",
    bg: "bg-cyan-50", bgDark: "dark:bg-cyan-950/40",
    border: "border-cyan-200", borderDark: "dark:border-cyan-800",
    gradient: "from-cyan-600 to-cyan-800", gradientDark: "dark:from-cyan-500 dark:to-cyan-700",
    chip: "bg-cyan-100", chipDark: "dark:bg-cyan-900/50",
    label: "text-cyan-700", labelDark: "dark:text-cyan-300",
    value: "text-cyan-900", valueDark: "dark:text-cyan-100",
  },
  indigo: {
    text: "text-indigo-600", textDark: "dark:text-indigo-400",
    bg: "bg-indigo-50", bgDark: "dark:bg-indigo-950/40",
    border: "border-indigo-200", borderDark: "dark:border-indigo-800",
    gradient: "from-indigo-600 to-indigo-800", gradientDark: "dark:from-indigo-500 dark:to-indigo-700",
    chip: "bg-indigo-100", chipDark: "dark:bg-indigo-900/50",
    label: "text-indigo-700", labelDark: "dark:text-indigo-300",
    value: "text-indigo-900", valueDark: "dark:text-indigo-100",
  },
  orange: {
    text: "text-orange-600", textDark: "dark:text-orange-400",
    bg: "bg-orange-50", bgDark: "dark:bg-orange-950/40",
    border: "border-orange-200", borderDark: "dark:border-orange-800",
    gradient: "from-orange-600 to-orange-800", gradientDark: "dark:from-orange-500 dark:to-orange-700",
    chip: "bg-orange-100", chipDark: "dark:bg-orange-900/50",
    label: "text-orange-700", labelDark: "dark:text-orange-300",
    value: "text-orange-900", valueDark: "dark:text-orange-100",
  },
  teal: {
    text: "text-teal-600", textDark: "dark:text-teal-400",
    bg: "bg-teal-50", bgDark: "dark:bg-teal-950/40",
    border: "border-teal-200", borderDark: "dark:border-teal-800",
    gradient: "from-teal-600 to-teal-800", gradientDark: "dark:from-teal-500 dark:to-teal-700",
    chip: "bg-teal-100", chipDark: "dark:bg-teal-900/50",
    label: "text-teal-700", labelDark: "dark:text-teal-300",
    value: "text-teal-900", valueDark: "dark:text-teal-100",
  },
  pink: {
    text: "text-pink-600", textDark: "dark:text-pink-400",
    bg: "bg-pink-50", bgDark: "dark:bg-pink-950/40",
    border: "border-pink-200", borderDark: "dark:border-pink-800",
    gradient: "from-pink-600 to-pink-800", gradientDark: "dark:from-pink-500 dark:to-pink-700",
    chip: "bg-pink-100", chipDark: "dark:bg-pink-900/50",
    label: "text-pink-700", labelDark: "dark:text-pink-300",
    value: "text-pink-900", valueDark: "dark:text-pink-100",
  },
  purple: {
    text: "text-purple-600", textDark: "dark:text-purple-400",
    bg: "bg-purple-50", bgDark: "dark:bg-purple-950/40",
    border: "border-purple-200", borderDark: "dark:border-purple-800",
    gradient: "from-purple-600 to-purple-800", gradientDark: "dark:from-purple-500 dark:to-purple-700",
    chip: "bg-purple-100", chipDark: "dark:bg-purple-900/50",
    label: "text-purple-700", labelDark: "dark:text-purple-300",
    value: "text-purple-900", valueDark: "dark:text-purple-100",
  },
  lime: {
    text: "text-lime-600", textDark: "dark:text-lime-400",
    bg: "bg-lime-50", bgDark: "dark:bg-lime-950/40",
    border: "border-lime-200", borderDark: "dark:border-lime-800",
    gradient: "from-lime-600 to-lime-800", gradientDark: "dark:from-lime-500 dark:to-lime-700",
    chip: "bg-lime-100", chipDark: "dark:bg-lime-900/50",
    label: "text-lime-700", labelDark: "dark:text-lime-300",
    value: "text-lime-900", valueDark: "dark:text-lime-100",
  },
  sky: {
    text: "text-sky-600", textDark: "dark:text-sky-400",
    bg: "bg-sky-50", bgDark: "dark:bg-sky-950/40",
    border: "border-sky-200", borderDark: "dark:border-sky-800",
    gradient: "from-sky-600 to-sky-800", gradientDark: "dark:from-sky-500 dark:to-sky-700",
    chip: "bg-sky-100", chipDark: "dark:bg-sky-900/50",
    label: "text-sky-700", labelDark: "dark:text-sky-300",
    value: "text-sky-900", valueDark: "dark:text-sky-100",
  },
  fuchsia: {
    text: "text-fuchsia-600", textDark: "dark:text-fuchsia-400",
    bg: "bg-fuchsia-50", bgDark: "dark:bg-fuchsia-950/40",
    border: "border-fuchsia-200", borderDark: "dark:border-fuchsia-800",
    gradient: "from-fuchsia-600 to-fuchsia-800", gradientDark: "dark:from-fuchsia-500 dark:to-fuchsia-700",
    chip: "bg-fuchsia-100", chipDark: "dark:bg-fuchsia-900/50",
    label: "text-fuchsia-700", labelDark: "dark:text-fuchsia-300",
    value: "text-fuchsia-900", valueDark: "dark:text-fuchsia-100",
  },
  red: {
    text: "text-red-600", textDark: "dark:text-red-400",
    bg: "bg-red-50", bgDark: "dark:bg-red-950/40",
    border: "border-red-200", borderDark: "dark:border-red-800",
    gradient: "from-red-600 to-red-800", gradientDark: "dark:from-red-500 dark:to-red-700",
    chip: "bg-red-100", chipDark: "dark:bg-red-900/50",
    label: "text-red-700", labelDark: "dark:text-red-300",
    value: "text-red-900", valueDark: "dark:text-red-100",
  },
  green: {
    text: "text-green-600", textDark: "dark:text-green-400",
    bg: "bg-green-50", bgDark: "dark:bg-green-950/40",
    border: "border-green-200", borderDark: "dark:border-green-800",
    gradient: "from-green-600 to-green-800", gradientDark: "dark:from-green-500 dark:to-green-700",
    chip: "bg-green-100", chipDark: "dark:bg-green-900/50",
    label: "text-green-700", labelDark: "dark:text-green-300",
    value: "text-green-900", valueDark: "dark:text-green-100",
  },
};

/** Get accent config for a form code */
export function getAccent(formCode: string): FormAccent {
  // Map each form to a unique accent color
  const FORM_ACCENTS: Record<string, FormAccent> = {
    "F/08": "blue", "F/09": "emerald", "F/10": "violet",
    "F/11": "amber", "F/12": "rose", "F/13": "cyan",
    "F/14": "indigo", "F/15": "orange", "F/16": "teal",
    "F/17": "pink", "F/18": "purple", "F/19": "lime",
    "F/20": "sky", "F/21": "fuchsia", "F/22": "red",
    "F/23": "green", "F/24": "blue", "F/25": "emerald",
    "F/28": "violet", "F/29": "amber", "F/30": "rose",
    "F/32": "cyan", "F/34": "indigo", "F/35": "orange",
    "F/37": "teal", "F/40": "pink", "F/41": "purple",
    "F/42": "lime", "F/43": "sky", "F/44": "fuchsia",
    "F/45": "red", "F/47": "green", "F/48": "blue",
    "F/50": "emerald",
  };
  return FORM_ACCENTS[formCode] || "blue";
}

/** Get the full accent style object */
export function useAccent(formCode: string) {
  const accentName = getAccent(formCode);
  return ACCENT_MAP[accentName];
}

// ════════════════════════════════════════════════════════════════════════
// 1. FORM DOCUMENT — the main page wrapper (unified for all 35 templates)
//    Full-width page with VEZLOO header (big, gradient), title bar, content, footer.
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
  const a = useAccent(formCode);

  return (
    <div className={cn(
      "w-full bg-card text-foreground font-[Arial,sans-serif] text-[11px]",
      "border border-border rounded-sm shadow-sm overflow-hidden",
      "print:bg-white print:text-black print:shadow-none print:rounded-none print:border-black",
      className,
    )}>
      {/* ── VEZLOO HEADER — big, gradient, prominent ── */}
      <div className={cn(
        "bg-gradient-to-r px-6 py-4 flex items-center justify-between",
        a.gradient, a.gradientDark,
      )}>
        <div className="flex items-center gap-4">
          {/* VEZLOO brand — bigger, white, with tracking */}
          <span className="text-[28px] font-black tracking-[0.15em] text-white drop-shadow-sm leading-none">
            VEZLOO
          </span>
          {/* Form code chip */}
          <span className={cn(
            "text-[11px] font-bold text-white/90 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm",
          )}>
            {formCode}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {sectionName && (
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{sectionName}</span>
          )}
          {serial && (
            <span className="text-[10px] font-mono text-white/80">Rev: {serial}</span>
          )}
          <span className="text-[10px] font-mono text-white/60">P.{pageNumber}</span>
        </div>
      </div>

      {/* ── FORM TITLE BAR ── */}
      <div className={cn(
        "flex items-center justify-between px-6 py-2.5 border-b border-border",
        a.bg, a.bgDark,
      )}>
        <span className={cn("text-[14px] font-bold uppercase tracking-wide", a.text, a.textDark)}>
          {formName}
        </span>
        {/* Date badge */}
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded",
          a.chip, a.chipDark, a.text, a.textDark,
        )}>
          Quality Management System
        </span>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="min-h-[300px]">
        {children}
      </div>

      {/* ── FOOTER ── */}
      <div className={cn(
        "flex items-center justify-between px-6 py-2 border-t border-border",
        a.bg, a.bgDark,
      )}>
        <span className={cn("text-[9px] font-mono", a.text, a.textDark)}>
          VEZLOO — QMS
        </span>
        <span className={cn("text-[9px] font-mono", a.text, a.textDark)}>
          {formCode} · Page {pageNumber}
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 2. FORM HEADER — in-page section header (accent colored)
// ════════════════════════════════════════════════════════════════════════

interface FormHeaderProps {
  children?: React.ReactNode;
  className?: string;
  formCode?: string;
}

export function FormHeader({ children, className, formCode }: FormHeaderProps) {
  const a = formCode ? useAccent(formCode) : ACCENT_MAP.blue;
  return (
    <div className={cn(
      "px-4 py-2.5 border-b border-border",
      a.bg, a.bgDark,
      className,
    )}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 3. FORM META GRID — metadata fields with label vs answer color contrast
//    Labels = accent-colored muted, Answers = dark/prominent text
//    Date fields automatically get amber accent
// ════════════════════════════════════════════════════════════════════════

interface MetaField {
  label: string;
  key: string;
  /** Mark this field as a date — gets amber/rose accent */
  isDate?: boolean;
}

interface FormMetaGridProps {
  fields: MetaField[];
  data: Record<string, unknown>;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  columns?: 2 | 3 | 4;
  className?: string;
  formCode?: string;
}

// Keywords that hint a field is a date
const DATE_KEYWORDS = ["date", "training_date", "expiry", "validity", "received", "dispatch", "review", "approved", "target"];

function isDateField(key: string, label: string): boolean {
  const lower = (key + " " + label).toLowerCase();
  return DATE_KEYWORDS.some(kw => lower.includes(kw));
}

export function FormMetaGrid({ fields, data, editMode, onChange, columns = 2, className, formCode }: FormMetaGridProps) {
  const d = data ?? {};
  const a = formCode ? useAccent(formCode) : ACCENT_MAP.blue;
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={cn("px-6 py-4 border-b border-border", className)}>
      <div className={cn("grid gap-x-6 gap-y-3", colClass)}>
        {fields.map(f => {
          const isDate = f.isDate || isDateField(f.key, f.label);
          const labelColor = isDate
            ? "text-amber-600 dark:text-amber-400"
            : cn(a.label, a.labelDark);
          const valueColor = isDate
            ? "text-amber-700 dark:text-amber-300"
            : "text-foreground";
          const underlineColor = isDate
            ? "border-amber-300 dark:border-amber-700"
            : cn(a.border, a.borderDark);

          return (
            <div key={f.key} className="flex flex-col gap-0.5">
              {/* LABEL — accent colored, small, uppercase */}
              <span className={cn("text-[9px] font-bold uppercase tracking-wide", labelColor)}>
                {f.label}
              </span>
              {/* ANSWER — prominent, dark/foreground, with accent underline */}
              {editMode ? (
                <input
                  className={cn(
                    "w-full bg-transparent text-[12px] font-semibold outline-none border-b border-dashed pb-1 font-[Arial,sans-serif]",
                    "text-foreground", underlineColor,
                  )}
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                />
              ) : (
                <span className={cn(
                  "text-[12px] font-semibold pb-1 border-b border-dashed min-h-[18px] font-[Arial,sans-serif]",
                  valueColor, underlineColor,
                )}>
                  {val(d, f.key) || "\u00A0"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════

interface FormTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  /** Mark as date column — gets amber accent */
  isDate?: boolean;
}

interface FormTableProps {
  columns: FormTableColumn[];
  children: React.ReactNode;
  striped?: boolean;
  className?: string;
  formCode?: string;
}

export function FormTable({ columns, children, striped = true, className, formCode }: FormTableProps) {
  const a = formCode ? useAccent(formCode) : ACCENT_MAP.blue;
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[11px] font-[Arial,sans-serif]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  "border px-2 py-2 text-[10px] font-bold uppercase tracking-wide",
                  a.text, a.textDark,
                  a.bg, a.bgDark,
                  "border-border",
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
  /** Highlight as date */
  isDate?: boolean;
}

export function FormTableCell({ children, align, colSpan, rowSpan, className, isDate }: FormTableCellProps) {
  return (
    <td
      className={cn(
        "border border-border px-2 py-1.5 text-[11px] font-[Arial,sans-serif]",
        isDate ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-foreground",
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
// 5. FORM SIGNATURE — signature section with accent label
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
  formCode?: string;
}

export function FormSignature({ fields, data, editMode, onChange, columns = 2, className, formCode }: FormSignatureProps) {
  const d = data ?? {};
  const a = formCode ? useAccent(formCode) : ACCENT_MAP.blue;
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : columns === 1 ? "flex justify-end" : "grid-cols-2";
  return (
    <div className={cn("px-6 py-5 border-t border-border", className)}>
      <div className={cn("gap-6", colClass)}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col">
            <div className="min-h-[28px] border-b border-border pb-1 mb-1">
              {editMode ? (
                <input
                  className="w-full bg-transparent text-[12px] font-semibold outline-none font-[Arial,sans-serif] text-foreground"
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                  placeholder={f.label}
                />
              ) : (
                <span className="text-[12px] font-semibold text-foreground font-[Arial,sans-serif]">{val(d, f.key)}</span>
              )}
            </div>
            <p className={cn("text-[9px] font-bold uppercase tracking-wider", a.label, a.labelDark)}>{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════ F/18, F/25, F/50, F/12)
// ════════════════════════════════════════════════════════════════════════

interface FormSectionProps {
  title: string;
  className?: string;
  formCode?: string;
}

export function FormSection({ title, className, formCode }: FormSectionProps) {
  const a = formCode ? useAccent(formCode) : ACCENT_MAP.blue;
  return (
    <div className={cn(
      "px-6 py-2 text-[10px] font-bold uppercase tracking-wider border-x border-t border-border",
      a.bg, a.bgDark, a.text, a.textDark,
      className,
    )}>
      {title}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 7. INFO CALLOUT — colored info box (accent-aware)
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

// ═══════════════════════════════
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