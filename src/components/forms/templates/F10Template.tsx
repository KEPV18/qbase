// ============================================================================
// F/10 — Customer Feedback Form
// EXACT MATCH of original DOCX: Self Rating table with checkmark display
// Supports three modes: isTemplate (blank), read-only (view), editMode
// ============================================================================

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface F10Props {
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

const RATING_FIELDS = [
  { key: "rating_product_quality", label: "Product Quality" },
  { key: "rating_order_processing", label: "Order processing" },
  { key: "rating_complaint_handling", label: "Complaint Handling" },
  { key: "rating_delivery", label: "Delivery" },
  { key: "rating_price", label: "price" },
] as const;

const RATING_OPTIONS = ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"] as const;

export function F10Template({ data, isTemplate = true, editMode = false, onChange, className }: F10Props) {
  const d = data ?? {};
  const ph = isTemplate || !editMode;
  const serialValue = val(d, "serial") || "";
  const projectName = val(d, "project_name") || "";

  // ── Render helpers ──────────────────────────────────────────────────
  const labelCls = "border border-border dark:border-gray-600 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-muted/50 dark:bg-gray-800";
  const cellCls = "border border-border dark:border-gray-600 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100";

  const inp = (key: string, placeholder?: string) => {
    if (ph) return <span>{val(d, key) || ""}</span>;
    return <input className="w-full bg-transparent text-sm outline-none border-0 border-b border-border dark:border-gray-600 px-1"
      value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />;
  };

  const textarea = (key: string, placeholder?: string, rows = 3) => {
    if (ph) return <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 min-h-[2rem]">{val(d, key) || ""}</div>;
    return <textarea className="w-full bg-transparent text-sm outline-none border border-border dark:border-gray-600 rounded-sm px-1 py-0.5 resize-y"
      value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} rows={rows} />;
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-border dark:border-gray-600">
        <colgroup>
          <col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[10%]" />
          <col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[10%]" />
          <col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[20%]" />
        </colgroup>
        <tbody>
          {/* ROW 0: Title + Form Code */}
          <tr>
            <td colSpan={8} className="border border-border dark:border-gray-600 px-3 py-2 text-center font-bold text-sm text-gray-900 dark:text-gray-100">
              Customers Feedback Form{projectName ? ` : Project: ${projectName}` : ""}
            </td>
            <td className="border border-border dark:border-gray-600 px-2 py-1 text-[10px] text-muted-foreground text-center leading-tight">
              F/10<br />No.{serialValue}
            </td>
          </tr>

          {/* ROW 1: Date + Year */}
          <tr>
            <td colSpan={5} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
              <strong>Date</strong> 🡪 {inp("date", "DD/MM/YYYY")}
            </td>
            <td colSpan={4} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
              <strong>Year</strong> 🡪 {inp("year", "2026")}
            </td>
          </tr>

          {/* ROW 2: Name */}
          <tr>
            <td colSpan={2} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Name
            </td>
            <td colSpan={7} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
              {inp("client_name", "Customer / Distributor name")}
            </td>
          </tr>

          {/* ROW 3: Address */}
          <tr>
            <td colSpan={2} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Address
            </td>
            <td colSpan={7} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm">
              {inp("address", "Full address")}
            </td>
          </tr>

          {/* ROW 4: Self Rating header */}
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-gray-100 text-center bg-muted/50 dark:bg-gray-800">
              Self Rating
            </td>
          </tr>

          {/* ROW 5: Rating column headers */}
          <tr>
            <td colSpan={2} className={labelCls}>Comment 🡪</td>
            <td className={cn(labelCls, "text-center text-xs")}>Excellent</td>
            <td className={cn(labelCls, "text-center text-xs")}>Good</td>
            <td className={cn(labelCls, "text-center text-xs")}>Satisfactory</td>
            <td className={cn(labelCls, "text-center text-xs")}>Average</td>
            <td className={cn(labelCls, "text-center text-xs")}>Poor</td>
            <td className={cn(labelCls, "text-center text-xs")}>N/A</td>
            <td className={cn(labelCls, "text-center text-xs")}>Comment</td>
          </tr>

          {/* ROWS 6-10: Rating criteria rows */}
          {RATING_FIELDS.map((field) => {
            const currentVal = val(d, field.key);
            return (
              <tr key={field.key}>
                <td colSpan={2} className={labelCls}>{field.label}</td>
                {RATING_OPTIONS.map((option) => {
                  const isSelected = currentVal === option;
                  return (
                    <td key={option} className={cn(cellCls, "text-center")}>
                      {editMode && !isTemplate ? (
                        <input type="radio"
                          name={field.key}
                          checked={isSelected}
                          onChange={() => onChange?.(field.key, option)}
                          className="accent-blue-600 w-4 h-4" />
                      ) : (
                        isSelected ? <span className="text-lg font-bold">✓</span> : ""
                      )}
                    </td>
                  );
                })}
                <td className={cellCls}>
                  {editMode && !isTemplate ? (
                    <input className="w-full bg-transparent text-xs outline-none border-0 border-b border-border px-1"
                      value={currentVal}
                      onChange={e => onChange?.(field.key, e.target.value)}
                      placeholder="Notes" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{currentVal || ""}</span>
                  )}
                </td>
              </tr>
            );
          })}

          {/* ROW: Comment text (full width) */}
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Comment:</div>
              {textarea("comment_text", "Customer comment...", 3)}
            </td>
          </tr>

          {/* Suggestions */}
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Any other suggestions for improvement:</div>
              {textarea("suggestions", "", 2)}
            </td>
          </tr>

          {/* Signature + Reviewed By */}
          <tr>
            <td colSpan={5} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Signature of Distributors with rubber stamp:</div>
              {inp("distributor_signature", "Signature & stamp")}
            </td>
            <td colSpan={4} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Reviewed by — Sales Person / Authorised person:</div>
              {inp("reviewed_by", "Name & signature")}
            </td>
          </tr>

          {/* For Office Use Only */}
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1.5 text-sm font-bold text-gray-900 dark:text-gray-100 text-center bg-muted/50 dark:bg-gray-800">
              For Office Use Only
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Action proposed for future</div>
              {textarea("action_proposed", "", 2)}
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Corrective action reference</div>
              {inp("corrective_action_ref", "Reference number")}
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="border border-border dark:border-gray-600 px-2 py-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Remarks</div>
              {textarea("remarks", "", 2)}
            </td>
          </tr>

          {/* VEZLOO footer */}
          <tr>
            <td colSpan={9} className="text-center text-[10px] font-bold text-gray-400 py-1 border border-border dark:border-gray-600">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}