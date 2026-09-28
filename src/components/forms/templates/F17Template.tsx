// ============================================================================
// F/17 — QA Test Request Slip
// WORD: 16 rows × 10 columns
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F17Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F17Template({ data, isTemplate = true, editMode = false, onChange, className }: F17Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[11px] px-1 border-none outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-[11px] leading-tight block min-w-[3rem]">
        {val(d, key) || (ph ? "" : "")}
      </span>
    );

  const cls = "border border-border text-[11px] px-1.5 py-1";
  const clsH = cn(cls, "font-semibold bg-muted/50");

  return (
    <FormDocument formCode="F/17" formName="QA Test Request" serial={val(d, "serial")} sectionName="Quality & Audit">
      {/* Mobile fallback */}
      <div className="md:hidden space-y-2 text-xs p-2 border border-border rounded-lg">
        <div className="font-bold text-sm">QA Test Request Slip for Development / Production Environment</div>
        <div>Request No: {val(d, "request_no")}</div>
        <div>Date: {inp("date", "Date")}</div>
        <div>From: {inp("from_department", "From")}</div>
        <div>To: {inp("to_department", "To")}</div>
        <div>Sample Qty: {inp("sample_qty", "Qty")}</div>
        <div>Product Name: {inp("product_name", "Product")}</div>
        <div>Stage of Test: {inp("stage_of_test", "Stage")}</div>
        <div>Status: {inp("status", "Status")}</div>
        <div>Requested By: {inp("requested_by", "Name")}</div>
        <div>Tested By: {inp("tested_by", "Name")}</div>
        <div>Approved By: {inp("approved_by", "Name")}</div>
      </div>

      {/* Desktop table — 10 columns */}
      <table className="w-full border-collapse border border-border text-[11px] hidden md:table">
        <tbody>
          {/* Row 0: Title merged 0-8, col 9 = rev */}
          <tr>
            <td colSpan={9} className={cn(cls, "font-bold text-center text-sm bg-primary/5")}>
              QA Test Request Slip for Development / Production Environment
            </td>
            <td className={cn(cls, "text-right bg-primary/5 whitespace-nowrap")}>
              F/17 Rev No.{val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
            </td>
          </tr>

          {/* Row 1: Request No cols 0-4, Date cols 5-9 */}
          <tr>
            <td colSpan={5} className={cls}>
              Request No: {val(d, "request_no") || (ph ? "{{SERIAL}}" : "")}
            </td>
            <td colSpan={5} className={cls}>
              Date : {inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* Row 2: From cols 0-2, To Department cols 3-5, Sample Qty cols 6-9 */}
          <tr>
            <td colSpan={3} className={cls}>
              From : {inp("from_department", "Department")}
            </td>
            <td colSpan={3} className={cls}>
              To Department : {inp("to_department", "QA Dept")}
            </td>
            <td colSpan={4} className={cls}>
              Sample Qty. : {inp("sample_qty", "Quantity")}
            </td>
          </tr>

          {/* Row 3: For Incoming Sample cols 0-3, For InProcess / Finished Sample cols 4-9 */}
          <tr>
            <td colSpan={4} className={cn(cls, "bg-muted/30")}>
              For Incoming Sample
            </td>
            <td colSpan={6} className={cn(cls, "bg-muted/30")}>
              For InProcess / Finished Sample
            </td>
          </tr>

          {/* Row 4: Product Name cols 0-3, Stage Of TEST cols 4-9 */}
          <tr>
            <td colSpan={4} className={cls}>
              Product Name : {inp("product_name", "Product Name")}
            </td>
            <td colSpan={6} className={cls}>
              Stage Of TEST : {inp("stage_of_test", "Stage")}
            </td>
          </tr>

          {/* Row 5: Version / Build No. cols 0-3, Qty. Received cols 4-9 */}
          <tr>
            <td colSpan={4} className={cls}>
              Version / Build No. : {inp("version_build_no", "Version")}
            </td>
            <td colSpan={6} className={cls}>
              Qty. Received : {inp("qty_received", "Qty")}
            </td>
          </tr>

          {/* Row 6: Batch No. / Lot No. cols 0-3, Challan No. & Date cols 4-9 */}
          <tr>
            <td colSpan={4} className={cls}>
              Batch No. / Lot No. : {inp("batch_no_lot_no", "Batch No.")}
            </td>
            <td colSpan={6} className={cls}>
              Challan No. &amp; Date : {inp("challan_no_date", "Challan")}
            </td>
          </tr>

          {/* Row 7: Batch Size cols 0-3, empty cols 4-9 */}
          <tr>
            <td colSpan={4} className={cls}>
              Batch Size : {inp("batch_size", "Batch Size")}
            </td>
            <td colSpan={6} className={cls}></td>
          </tr>

          {/* Row 8: Test Required Header */}
          <tr>
            <td colSpan={4} className={cn(clsH, "text-center")}>
              Test Required
            </td>
            <td colSpan={6} className={cn(clsH, "text-center")}>
              Results
            </td>
          </tr>

          {/* Rows 9-14: test parameter rows (6 slots) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const results = Array.isArray(d.test_results) ? (d.test_results as Record<string, unknown>[]) : [];
            const r = results[i] || {};
            const testVal = typeof r.test_required === "string" ? r.test_required : "";
            const resVal = typeof r.results === "string" ? r.results : "";
            return (
              <tr key={i}>
                <td colSpan={4} className={cls}>
                  {testVal || (ph ? "" : "")}
                </td>
                <td colSpan={6} className={cls}>
                  {resVal || (ph ? "" : "")}
                </td>
              </tr>
            );
          })}

          {/* Row 15: Signature row */}
          <tr>
            <td colSpan={2} className={cls}>
              Requested By : {inp("requested_by", "Name")}
            </td>
            <td colSpan={2} className={cls}>
              Received By : {inp("received_by", "Name")}
            </td>
            <td colSpan={3} className={cls}>
              Tested By : {inp("tested_by", "Name")}
            </td>
            <td colSpan={3} className={cls}>
              Approved By : {inp("approved_by", "Name")}
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>
  );
}
