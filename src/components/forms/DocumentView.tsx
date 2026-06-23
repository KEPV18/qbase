// ============================================================================
// QBase — Google Docs–Style Document View Wrapper
// White "page" centered on a gray background, generous margins,
// clean typography, subtle shadow. Exact match to Google Docs layout.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

interface DocumentViewProps {
  children: React.ReactNode;
  className?: string;
  /** Optional metadata line below the header */
  subtitle?: string;
  /** A4 width by default */
  maxWidth?: string;
}

export function DocumentView({
  children,
  className,
  subtitle,
  maxWidth = "max-w-[800px]",
}: DocumentViewProps) {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-[#1a1a18] flex justify-center py-8 px-4 print:bg-white">
      <div
        className={cn(
          "w-full bg-background dark:bg-[#1e1d1a] shadow-sm rounded-lg border border-border",
          "min-h-[500px] print:bg-white print:text-black print:border-black print:shadow-none print:rounded-none",
          maxWidth,
          className
        )}
      >
        {/* Page header with document info line */}
        {subtitle && (
          <div className="px-12 pt-8 pb-3 border-b border-border print:border-black">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.05em]">
                {subtitle}
              </span>
            </div>
          </div>
        )}

        {/* Content area with Google Docs margins */}
        <div className="px-12 py-8 space-y-6 print:text-black">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Document Header — record title like Google Docs document name
// ============================================================================

interface DocHeaderProps {
  serial: string;
  formName: string;
  formCode: string;
  sectionName?: string;
  projectScope?: string;
  coveragePeriod?: string;
}

export function DocHeader({ serial, formName, formCode, sectionName, projectScope, coveragePeriod }: DocHeaderProps) {
  return (
    <div className="mb-8 print:text-black">
      <p className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase mb-1">
        {sectionName || "Record"}
      </p>
      <h1 className="text-2xl font-normal text-foreground leading-snug mb-2">
        {formName}
      </h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-mono text-[13px]">{serial}</span>
        <span className="text-border">·</span>
        <span className="text-[13px]">{formCode}</span>
      </div>
      {/* Project Scope & Coverage Period badges */}
      <div className="flex items-center gap-2 mt-2">
        <span className="px-2 py-0.5 rounded-sm bg-primary/5 text-primary border border-primary/10 text-[10px] font-semibold tracking-wider">
          📋 {projectScope || 'Company-Wide'}
        </span>
        <span className="px-2 py-0.5 rounded-sm bg-secondary/50 text-secondary-foreground border border-border/50 text-[10px] font-semibold tracking-wider">
          🗓 {coveragePeriod || 'Continuous / Open-Ended'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// DocField — Individual field in document style (label above value)
// ============================================================================

interface DocFieldProps {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

export function DocField({ label, value, fullWidth }: DocFieldProps) {
  return (
    <div className={cn("space-y-1.5", fullWidth ? "" : "")}>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="text-sm text-foreground leading-relaxed">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// DocSection — Section heading like Google Docs heading
// ============================================================================

interface DocSectionProps {
  title: string;
}

export function DocSection({ title }: DocSectionProps) {
  return (
    <div className="pt-4">
      <h2 className="text-base font-medium text-foreground border-b border-border pb-2">
        {title}
      </h2>
    </div>
  );
}

// ============================================================================
// DocTable — Clean table like Google Docs inserted table
// ============================================================================

interface DocTableProps {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
}

export function DocTable({ columns, rows }: DocTableProps) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground italic">No entries</p>;

  return (
    <div className="overflow-x-auto border border-border rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">#</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5 text-foreground">
                  {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ""
                    ? String(row[col.key])
                    : <span className="text-border">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}