// ============================================================================
// F/10 — Customer Feedback Form
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
//
// Layout: 10-column grid matching DOCX proportions.
// Includes a self-rating table with checkboxes + N/A option.
// ============================================================================

import React, { useState } from "react";
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
  { key: "rating_order_processing", label: "Order Processing" },
  { key: "rating_complaint_handling", label: "Complaint Handling" },
  { key: "rating_delivery", label: "Delivery" },
  { key: "rating_price", label: "Price" },
  { key: "comment", label: "Comment" },
] as const;

const RATING_OPTIONS = ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"] as const;

type RatingValue = typeof RATING_OPTIONS[number] | "";

export function F10Template({ data, isTemplate = true, editMode = false, onChange, className }: F10Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // Track selected ratings in edit mode
  const [ratings, setRatings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of RATING_FIELDS) {
      initial[f.key] = val(d, f.key);
    }
    return initial;
  });

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const inputCls = "w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600";

  // ── Cell helpers ────────────────────────────────────────────────────
  const Cell = ({ field, colSpan, className, placeholder }: {
    field: string; colSpan?: number; className?: string; placeholder?: string;
  }) => {
    const value = val(d, field);
    if (readonly) {
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
    field: string; colSpan?: number; className?: string; placeholder?: string; rows?: number;
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

  const LabelCell = ({ text, colSpan, className }: { text: string; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={cn(labelCls, className)}>{text}</td>
  );

  // ── Rating handler ─────────────────────────────────────────────────
  const handleRatingChange = (fieldKey: string, rating: string) => {
    const current = ratings[fieldKey];
    const newRating = current === rating ? "" : rating; // toggle off if same clicked
    setRatings(prev => ({ ...prev, [fieldKey]: newRating }));
    onChange?.(fieldKey, newRating);
  };

  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <colgroup>
          <col className="w-[15%]" /> {/* Comment/row label — 2 cols */}
          <col className="w-[7%]" />  {/* Excellent */}
          <col className="w-[7%]" />  {/* Good */}
          <col className="w-[7%]" />  {/* Satisfactory */}
          <col className="w-[7%]" />  {/* Average */}
          <col className="w-[7%]" />  {/* Poor */}
          <col className="w-[7%]" />  {/* N/A */}
          <col className="w-[2%]" />  {/* spacer */}
          <col className="w-[2%]" />  {/* spacer */}
          <col className="w-[39%]" /> {/* Comment text area */}
        </colgroup>
        <tbody>
          {/* ── Row 0: Title + Serial ─────────────────────── */}
          <tr>
            <td colSpan={7} className={cn(titleCls, "text-center text-lg")}>
              Customers Feedback Form
              {editMode && !isTemplate ? (
                <span className="ml-2">
                  : Project:{" "}
                  <input
                    className="inline w-32 bg-transparent outline-none border-b border-slate-400 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    value={val(d, "project_name")}
                    onChange={e => onChange?.("project_name", e.target.value)}
                    placeholder="Project name"
                  />
                </span>
              ) : val(d, "project_name") ? (
                <span className="ml-2">: Project: {val(d, "project_name")}</span>
              ) : null}
            </td>
            <td colSpan={3} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
              F/10
              {editMode && !isTemplate ? (
                <>
                  <br />
                  <input
                    className="w-full text-xs bg-transparent outline-none text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    value={serialValue}
                    onChange={e => onChange?.("serial", e.target.value)}
                    placeholder="Rev No.00"
                  />
                </>
              ) : (
                <><br />Rev {serialValue || "No.00"}</>
              )}
            </td>
          </tr>

          {/* ── Row 1: Date | Year ──────────────────────── */}
          <tr>
            <LabelCell text="Date" colSpan={5} />
            <LabelCell text="Year" colSpan={5} />
          </tr>
          <tr>
            <Cell field="date" colSpan={5} placeholder="DD/MM/YYYY" />
            <Cell field="year" colSpan={5} placeholder="2026" />
          </tr>

          {/* ── Row 2: Name ──────────────────────────────── */}
          <tr>
            <LabelCell text="Name" colSpan={10} />
          </tr>
          <tr>
            <Cell field="client_name" colSpan={10} placeholder="Customer / Distributor name" />
          </tr>

          {/* ── Row 3: Address ───────────────────────────── */}
          <tr>
            <LabelCell text="Address" colSpan={10} />
          </tr>
          <tr>
            <Cell field="address" colSpan={10} placeholder="Full address" />
          </tr>

          {/* ── Self Rating table ────────────────────────────── */}
          <tr>
            <td colSpan={10} className="bg-slate-100 dark:bg-slate-800 font-bold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-center">
              Self Rating
            </td>
          </tr>

          {/* Header: Comment | Excellent | Good | Satisfactory | Average | Poor | N/A | (spacer) | (spacer) | Comment text */}
          <tr>
            <td className={cn(labelCls, "text-center")}>Comment</td>
            <td className={cn(labelCls, "text-center text-xs")}>Excellent</td>
            <td className={cn(labelCls, "text-center text-xs")}>Good</td>
            <td className={cn(labelCls, "text-center text-xs")}>Satisfactory</td>
            <td className={cn(labelCls, "text-center text-xs")}>Average</td>
            <td className={cn(labelCls, "text-center text-xs")}>Poor</td>
            <td className={cn(labelCls, "text-center text-xs")}>N/A</td>
            <td colSpan={2} className="border border-slate-300 dark:border-slate-600" />
            <td className={cn(labelCls, "text-center text-xs")}>Comment</td>
          </tr>

          {/* Rating rows — one per criterion */}
          {RATING_FIELDS.map((field) => {
            // "Comment" is special — it only has a text field, no radio buttons
            const isCommentRow = field.key === "comment";
            const currentRating = ratings[field.key] || val(d, field.key);

            return (
              <tr key={field.key}>
                {/* Row label */}
                <td className={cn(labelCls, "text-sm")}>{field.label}</td>

                {/* Rating checkboxes: Excellent, Good, Satisfactory, Average, Poor, N/A */}
                {isCommentRow ? (
                  // For Comment row — all 6 checkbox cells are empty (no radio)
                  <td colSpan={6} className={valueCls}>
                    {/* No radio buttons for Comment row — but allow N/A toggle */}
                  </td>
                ) : (
                  <>
                    {RATING_OPTIONS.map((option) => {
                      // Only show first 5 for rating rows (not N/A)
                      if (option === "N/A") {
                        // N/A checkbox for rating rows
                        const isNA = currentRating === "N/A";
                        return (
                          <td key={option} className="bg-white dark:bg-slate-900 text-center py-2 border border-slate-300 dark:border-slate-600 min-h-[2rem]">
                            {editMode && !isTemplate ? (
                              <input
                                type="radio"
                                name={`${field.key}_na`}
                                checked={isNA}
                                onChange={() => handleRatingChange(field.key, "N/A")}
                                className="accent-indigo-500 w-4 h-4"
                              />
                            ) : (
                              isNA ? "✓" : ""
                            )}
                          </td>
                        );
                      }
                      const isChecked = currentRating === option;
                      return (
                        <td key={option} className="bg-white dark:bg-slate-900 text-center py-2 border border-slate-300 dark:border-slate-600 min-h-[2rem]">
                          {editMode && !isTemplate ? (
                            <input
                              type="radio"
                              name={field.key}
                              checked={isChecked}
                              onChange={() => handleRatingChange(field.key, option)}
                              className="accent-indigo-500 w-4 h-4"
                            />
                          ) : (
                            isChecked ? "✓" : ""
                          )}
                        </td>
                      );
                    })}
                  </>
                )}

                {/* Spacer cols */}
                <td colSpan={2} className="border border-slate-300 dark:border-slate-600" />

                {/* Comment text column */}
                <td className={valueCls}>
                  {readonly ? (
                    <span className={!currentRating && "text-slate-300 dark:text-slate-600"}>
                      {currentRating || ""}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={isCommentRow ? val(d, "comment_text") || "" : currentRating}
                      onChange={e => {
                        if (isCommentRow) {
                          onChange?.("comment_text", e.target.value);
                        } else {
                          // Allow free-text comment alongside rating
                          onChange?.(`${field.key}_comment`, e.target.value);
                        }
                      }}
                      placeholder={isCommentRow ? "Customer comment..." : "Notes..."}
                      className={inputCls}
                    />
                  )}
                </td>
              </tr>
            );
          })}

          {/* ── Suggestions ──────────────────────────────── */}
          <tr>
            <LabelCell text="Any other suggestions for improvement" colSpan={10} />
          </tr>
          <tr>
            <TextAreaCell field="suggestions" colSpan={10} placeholder="Please note that this is just for improving ourselves. So, please feel free and write your suggestions..." rows={3} />
          </tr>

          {/* ── Signature rows ─────────────────────────────── */}
          {/* DOCX: R13 — Signature of Distributors | Reviewed by */}
          <tr>
            <LabelCell text="Signature of Distributors with rubber stamp" colSpan={5} />
            <LabelCell text="Reviewed by — Sales Person / Authorised person" colSpan={5} />
          </tr>
          <tr>
            {/* Signature + stamp area */}
            <td colSpan={5} className={cn(valueCls, "min-h-[3.5rem]")}>
              {readonly ? (
                <span className={!val(d, "distributor_signature") && "text-slate-300 dark:text-slate-600"}>
                  {val(d, "distributor_signature") || ""}
                </span>
              ) : (
                <input
                  type="text"
                  value={val(d, "distributor_signature")}
                  onChange={e => onChange?.("distributor_signature", e.target.value)}
                  placeholder="Signature & stamp"
                  className={inputCls}
                />
              )}
            </td>
            {/* Reviewed by area */}
            <td colSpan={5} className={cn(valueCls, "min-h-[3.5rem]")}>
              {readonly ? (
                <span className={!val(d, "reviewed_by") && "text-slate-300 dark:text-slate-600"}>
                  {val(d, "reviewed_by") || ""}
                </span>
              ) : (
                <input
                  type="text"
                  value={val(d, "reviewed_by")}
                  onChange={e => onChange?.("reviewed_by", e.target.value)}
                  placeholder="Name & signature"
                  className={inputCls}
                />
              )}
            </td>
          </tr>

          {/* ── Office Use Only ──────────────────────────── */}
          <tr>
            <td colSpan={10} className="bg-slate-100 dark:bg-slate-800 font-bold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-center">
              For Office Use Only
            </td>
          </tr>

          <tr>
            <LabelCell text="Action proposed for future" colSpan={10} />
          </tr>
          <tr>
            <Cell field="action_proposed" colSpan={10} placeholder="Action proposed for future..." />
          </tr>

          <tr>
            <LabelCell text="Corrective action reference" colSpan={10} />
          </tr>
          <tr>
            <Cell field="corrective_action_ref" colSpan={10} placeholder="Reference number..." />
          </tr>

          <tr>
            <LabelCell text="Remarks" colSpan={10} />
          </tr>
          <tr>
            <Cell field="remarks" colSpan={10} placeholder="Office remarks..." />
          </tr>

          {/* ── VEZLOO footer ────────────────────────────── */}
          <tr>
            <td colSpan={10} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}