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
    <div className="min-h-screen bg-[#e8e8e8] dark:bg-[#1a1a18] flex justify-center py-8 px-4">
      <div
        className={cn(
          "w-full bg-white dark:bg-[#232220] shadow-[0_1px_4px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
          "min-h-[500px]",
          maxWidth,
          className
        )}
      >
        {/* Page header with document info line */}
        {subtitle && (
          <div className="px-12 pt-8 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.05em]">
                {subtitle}
              </span>
            </div>
          </div>
        )}

        {/* Content area with Google Docs margins */}
        <div className="px-12 py-8 space-y-6">
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
}

export function DocHeader({ serial, formName, formCode, sectionName }: DocHeaderProps) {
  return (
    <div className="mb-8">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase mb-1">
        {sectionName || "Record"}
      </p>
      <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 leading-snug mb-2">
        {formName}
      </h1>
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-mono text-[13px]">{serial}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-[13px]">{formCode}</span>
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
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
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
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
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
  if (rows.length === 0) return <p className="text-sm text-gray-400 italic">No entries</p>;

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">#</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
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
              className="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5 text-gray-900 dark:text-gray-100">
                  {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ""
                    ? String(row[col.key])
                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}