// ============================================================================
// QBase — FormKit: Unified Template Components
// Single source of truth for ALL 35 form templates.
// Enforces consistent VEZLOO header, form title bar, content area, and footer.
// Theme-aware: uses CSS variables that adapt to light/dark mode.
// Each form gets a unique accent color for visual variety and readability.
// ============================================================================

import React from "react";
import { Check } from "lucide-react";
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
// DOCUMENT PALETTE
//
// A QMS record is paper, not a dashboard.  Giving each of the 35 forms its
// own hue put 35 competing colours into a product that allows exactly one
// accent per view — and the colour carried no information, because a hue
// is not a wayfinding signal a reader can act on.
//
// The document palette is therefore grayscale plus a single accent:
//   · masthead  — the deep blue→indigo gradient.  The document's ONE
//                 coloured surface; it carries the brand mark and the
//                 form code, and nothing else in the record competes
//                 with it.
//   · values    — near-black.  The answer the reader came for.
//   · labels    — muted gray, small, uppercase, tracked.
//   · rules     — hairline gray.  Never a coloured left-bar.
//
// Every colour below is a token, and every pairing is measured:
//   text-foreground on card       16.83:1  light / 15.63:1  dark
//   text-ink-2      on card        5.07:1  light /  6.61:1  dark
//   text-ink-2      on bg-muted/40 4.82:1  light /  6.47:1  dark
//   white on the masthead ramp    5.56:1 (white/70) … 9.50:1 (white/100)
// ════════════════════════════════════════════════════════════════════════

export interface FormAccent {
  /** Primary text — the answer, the title, the heading. */
  text: string;
  /** Primary text, dark mode. */
  textDark: string;
  /** Neutral band ground (title bar, section band). */
  bg: string;
  /** Neutral band ground, dark mode. */
  bgDark: string;
  /** Hairline rule. */
  border: string;
  /** Hairline rule, dark mode. */
  borderDark: string;
  /** Masthead gradient stops. */
  gradient: string;
  /** Masthead gradient stops, dark mode. */
  gradientDark: string;
  /** Small chip ground. */
  chip: string;
  /** Small chip ground, dark mode. */
  chipDark: string;
  /** Field label colour — muted gray, never the accent. */
  label: string;
  /** Field label colour, dark mode. */
  labelDark: string;
  /** Answer value colour. */
  value: string;
  /** Answer value colour, dark mode. */
  valueDark: string;
}

const DOC_PALETTE: FormAccent = {
  text: "text-foreground",
  textDark: "dark:text-foreground",
  bg: "bg-muted/40",
  bgDark: "dark:bg-muted/30",
  border: "border-border",
  borderDark: "dark:border-border",
  gradient: "from-masthead-from to-masthead-to",
  gradientDark: "dark:from-masthead-from dark:to-masthead-to",
  chip: "bg-track",
  chipDark: "dark:bg-track",
  label: "text-ink-2",
  labelDark: "dark:text-ink-2",
  value: "text-foreground",
  valueDark: "dark:text-foreground",
};

/**
 * Get the document palette for a form code.
 *
 * Every form shares one palette by design — see the note above.  The
 * `formCode` argument is kept so callers do not have to change and so a
 * future per-section accent has a single place to live.
 */
export function getAccent(formCode: string): FormAccent {
  void formCode;
  return DOC_PALETTE;
}

/** Get the full accent style object */
export function useAccent(formCode: string): FormAccent {
  return getAccent(formCode);
}

/**
 * Get the full accent style object for a form code, as a plain function.
 * `useAccent` cannot be called from inside a loop or a callback, so renderers
 * that resolve an accent per form inside a `.map()` need this form.
 */
export function getAccentStyles(formCode: string): FormAccent {
  return getAccent(formCode);
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
      "w-full bg-card text-foreground font-sans text-[11px]",
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
  const a = useAccent(formCode || 'F/00');
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
// 3. FORM META GRID — metadata fields with label vs answer contrast
//    Labels = muted gray, small, uppercase.  Answers = near-black.
//
//    A field used to be tinted amber whenever its name contained
//    "date", "expiry" or "approved".  That spent a colour on a
//    distinction the reader cannot act on — the label already says
//    what the field is — and it made a document look like a warning
//    board.  The date is a value, not a status, so it is now printed
//    like every other value.
// ════════════════════════════════════════════════════════════════════════

interface MetaField {
  label: string;
  key: string;
  /** Retained for call-site compatibility; the palette no longer varies by field type. */
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

export function FormMetaGrid({ fields, data, editMode, onChange, columns = 2, className, formCode }: FormMetaGridProps) {
  const d = data ?? {};
  const a = useAccent(formCode || 'F/00');
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={cn("px-6 py-4 border-b border-border", className)}>
      <div className={cn("grid gap-x-6 gap-y-3", colClass)}>
        {fields.map(f => {
          const labelColor = cn(a.label, a.labelDark);
          const valueColor = a.value;
          const underlineColor = cn(a.border, a.borderDark);

          return (
            <div key={f.key} className="flex flex-col gap-0.5">
              {/* LABEL — muted gray, small, uppercase */}
              <span className={cn("text-[9px] font-bold uppercase tracking-wide", labelColor)}>
                {f.label}
              </span>
              {/* ANSWER — prominent, near-black, with a hairline underline */}
              {editMode ? (
                <input
                  className={cn(
                    "w-full bg-transparent text-[12px] font-semibold outline-none border-b border-dashed pb-1 font-sans",
                    "text-foreground", underlineColor,
                  )}
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                />
              ) : (
                <span className={cn(
                  "text-[12px] font-semibold pb-1 border-b border-dashed min-h-[18px] font-sans",
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
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[11px] font-sans">
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
  void isDate;
  return (
    <td
      className={cn(
        "border border-border px-2 py-1.5 text-[11px] font-sans",
        "text-foreground",
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
  const a = useAccent(formCode || 'F/00');
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : columns === 1 ? "flex justify-end" : "grid-cols-2";
  return (
    <div className={cn("px-6 py-5 border-t border-border", className)}>
      <div className={cn("gap-6", colClass)}>
        {fields.map(f => (
          <div key={f.key} className="flex flex-col">
            <div className="min-h-[28px] border-b border-border pb-1 mb-1">
              {editMode ? (
                <input
                  className="w-full bg-transparent text-[12px] font-semibold outline-none font-sans text-foreground"
                  value={val(d, f.key)}
                  onChange={e => onChange?.(f.key, e.target.value)}
                  placeholder={f.label}
                />
              ) : (
                <span className="text-[12px] font-semibold text-foreground font-sans">{val(d, f.key)}</span>
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
  const a = useAccent(formCode || 'F/00');
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
    info: "bg-primary/10 border-primary/20 text-primary-tint",
    success: "bg-success/10 border-success/20 text-success-tint",
    warning: "bg-warning/10 border-warning/20 text-warning-tint",
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
    <span className="border-b border-dashed border-border px-1 inline-block min-w-[4rem] text-[11px] font-sans text-foreground">
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
      className={cn("border-b border-dashed border-border bg-transparent text-[11px] px-1 outline-none font-sans text-foreground", className)}
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
      "w-full bg-card text-foreground text-[11px] font-sans",
      "border border-border rounded-sm shadow-sm overflow-hidden",
      "print:bg-white print:text-black print:shadow-none print:rounded-none print:border-black",
      className,
    )}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 10. INFO CARD — boxed field group with accent border + icon
//     Use for non-table forms to give visual structure (not just stacked lines)
// ════════════════════════════════════════════════════════════════════════

interface InfoCardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  formCode?: string;
  /** Visual style: default bordered card, or accent-tinted */
  variant?: "default" | "accent" | "tinted";
}

export function InfoCard({ title, icon, children, className, formCode, variant = "default" }: InfoCardProps) {
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn(
      "rounded-md border overflow-hidden",
      variant === "accent" ? cn(a.border, a.borderDark) : "border-border",
      variant === "tinted" && cn(a.bg, a.bgDark),
      className,
    )}>
      {title && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b",
          variant === "tinted" || variant === "accent"
            ? cn(a.text, a.textDark, "border-border")
            : cn("bg-muted/30 text-muted-foreground border-border"),
        )}>
          {icon && <span className="opacity-70">{icon}</span>}
          {title}
        </div>
      )}
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 11. FIELD ROW — label + answer on same line, with visual distinction
//     label is accent-colored, answer is foreground-colored
// ════════════════════════════════════════════════════════════════════════

interface FieldRowProps {
  label: string;
  data: Record<string, unknown>;
  fieldKey: string;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  formCode?: string;
  /** Full-width answer (spans remaining space) */
  fullWidth?: boolean;
  /** Is this a date field? */
  isDate?: boolean;
  className?: string;
}

export function FieldRow({ label, data, fieldKey, editMode, onChange, formCode, fullWidth, isDate, className }: FieldRowProps) {
  const a = useAccent(formCode || 'F/00');
  void isDate;
  const labelCls = cn(a.label, a.labelDark);
  const underline = cn(a.border, a.borderDark);

  return (
    <div className={cn("flex items-baseline gap-3 py-1.5", className)}>
      <span className={cn("text-[10px] font-bold uppercase tracking-wide shrink-0 min-w-[120px] max-w-[200px]", labelCls)}>
        {label}
      </span>
      {editMode ? (
        <input
          className={cn("flex-1 bg-transparent text-[12px] font-semibold outline-none border-b border-dashed pb-0.5 text-foreground", underline)}
          value={val(data, fieldKey)}
          onChange={e => onChange?.(fieldKey, e.target.value)}
        />
      ) : (
        <span className={cn(
          "text-[12px] font-semibold pb-0.5 border-b border-dashed min-h-[18px]",
          "text-foreground",
          underline,
          fullWidth ? "flex-1" : "inline-block min-w-[4rem]",
        )}>
          {val(data, fieldKey) || "\u00A0"}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 12. TEXT BLOCK — large text area with accent border (for descriptions, findings, etc.)
// ════════════════════════════════════════════════════════════════════════

interface TextBlockProps {
  label: string;
  data: Record<string, unknown>;
  fieldKey: string;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  formCode?: string;
  minHeight?: string;
  className?: string;
}

export function TextBlock({ label, data, fieldKey, editMode, onChange, formCode, minHeight = "min-h-[80px]", className }: TextBlockProps) {
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn("space-y-1", className)}>
      <span className={cn("text-[10px] font-bold uppercase tracking-wide", a.label, a.labelDark)}>{label}</span>
      <div className={cn("border rounded-md p-3", a.border, a.borderDark, "bg-muted/10")}>
        {editMode ? (
          <textarea
            className={cn("w-full bg-transparent text-[12px] leading-relaxed outline-none resize-y text-foreground", minHeight)}
            value={val(data, fieldKey)}
            onChange={e => onChange?.(fieldKey, e.target.value)}
          />
        ) : (
          <div className={cn("text-[12px] leading-relaxed whitespace-pre-wrap text-foreground", minHeight)}>
            {val(data, fieldKey) || "\u00A0"}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 13. CHECKBOX GROUP — visual checkbox group with accent label
// ════════════════════════════════════════════════════════════════════════

interface CheckboxItem {
  key: string;
  label: string;
  checked: boolean;
}

interface CheckboxGroupProps {
  title?: string;
  items: CheckboxItem[];
  formCode?: string;
  onToggle?: (key: string, checked: boolean) => void;
  editMode?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function CheckboxGroup({ title, items, formCode, onToggle, editMode, className, columns = 3 }: CheckboxGroupProps) {
  const a = useAccent(formCode || 'F/00');
  const colClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <span className={cn("text-[10px] font-bold uppercase tracking-wide", a.label, a.labelDark)}>{title}</span>
      )}
      <div className={cn("grid gap-2", colClass)}>
        {items.map(item => (
          <div key={item.key} className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded border text-[11px]",
            item.checked ? cn(a.bg, a.bgDark, a.border, a.borderDark, a.text, a.textDark) : "border-border text-muted-foreground",
          )}>
            {editMode ? (
              <input
                type="checkbox"
                className="w-3.5 h-3.5"
                checked={item.checked}
                onChange={e => onToggle?.(item.key, e.target.checked)}
              />
            ) : (
              <span className={cn(
                "inline-flex items-center justify-center w-3.5 h-3.5 border rounded",
                item.checked ? cn(a.text, a.textDark, "border-current") : "border-border",
              )}>
                {item.checked && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
              </span>
            )}
            <span className={cn("font-medium", item.checked ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 14. STAT BADGE — compact metric display (for counts, scores, ratings)
// ════════════════════════════════════════════════════════════════════════

interface StatBadgeProps {
  label: string;
  value: string | number;
  formCode?: string;
  className?: string;
}

export function StatBadge({ label, value, formCode, className }: StatBadgeProps) {
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn(
      "inline-flex flex-col items-center justify-center px-4 py-2 rounded-md border",
      a.border, a.borderDark, a.bg, a.bgDark,
      className,
    )}>
      <span className={cn("text-[18px] font-black", a.text, a.textDark)}>{value}</span>
      <span className={cn("text-[8px] font-bold uppercase tracking-wider", a.label, a.labelDark)}>{label}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 15. TWO-COLUMN BLOCK — left/right layout for forms with paired data
// ════════════════════════════════════════════════════════════════════════

interface TwoColumnBlockProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  /** Ratio: 50/50 or 60/40 */
  ratio?: "50/50" | "60/40" | "40/60";
}

export function TwoColumnBlock({ left, right, className, ratio = "50/50" }: TwoColumnBlockProps) {
  const ratioCls = ratio === "60/40" ? "lg:grid-cols-[3fr_2fr]" : ratio === "40/60" ? "lg:grid-cols-[2fr_3fr]" : "lg:grid-cols-2";
  return (
    <div className={cn("grid gap-4", ratioCls, className)}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 16. SECTION DIVIDER — visual separator between form sections
// ════════════════════════════════════════════════════════════════════════

interface SectionDividerProps {
  title: string;
  formCode?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionDivider({ title, formCode, icon, className }: SectionDividerProps) {
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn("flex items-center gap-2 py-2 mt-2", className)}>
      <div className={cn("h-7 w-7 rounded flex items-center justify-center", a.bg, a.bgDark)}>
        {icon || <span className={cn("text-[12px] font-black", a.text, a.textDark)}>§</span>}
      </div>
      <span className={cn("text-[11px] font-bold uppercase tracking-wider", a.text, a.textDark)}>{title}</span>
      <div className={cn("flex-1 h-px", a.border, a.borderDark)} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 17. TIMELINE ITEM — for forms with chronological entries
// ════════════════════════════════════════════════════════════════════════

interface TimelineItemProps {
  date?: string;
  title: string;
  description?: string;
  formCode?: string;
  isLast?: boolean;
  className?: string;
}

export function TimelineItem({ date, title, description, formCode, isLast, className }: TimelineItemProps) {
  const a = useAccent(formCode || 'F/00');
  return (
    <div className={cn("flex gap-3", className)}>
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-2.5 h-2.5 rounded-full mt-1", a.bg, a.bgDark, "border", a.border, a.borderDark)} />
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      {/* Content */}
      <div className="flex-1 pb-3">
        {date && (
          <span className={cn("text-[9px] font-bold uppercase tracking-wide", a.label, a.labelDark)}>{date}</span>
        )}
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}