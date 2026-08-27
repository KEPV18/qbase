// ============================================================================
// F/32 — R&D Request Form
// DOCX: 17C x 25R — Request info, product details, feasibility, approvals
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F32Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F32Template({ data, isTemplate = true, editMode = false, onChange, className }: F32Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, placeholder: string, className?: string) =>
    editMode ? (
      <input
        className={cn("w-full bg-transparent text-xs px-1 border-none outline-none", className)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className={cn("text-xs", className)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH = "min-h-[40px]") =>
    editMode ? (
      <textarea
        className={cn("w-full bg-transparent text-xs p-1 border border-dashed border-foreground/30 rounded resize-none", minH)}
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className={cn("whitespace-pre-wrap text-xs", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  const td = (children: React.ReactNode, colSpan = 1, className?: string) => (
    <td colSpan={colSpan} className={cn("border border-border p-1.5 text-xs", className)}>
      {children}
    </td>
  );

  return (
    <FormDocument formCode="F/32" formName="R&D Request" serial={val(d, "serial")} sectionName="R&D & Design">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {/* Row 0: Ref No + Date */}
            <tr>
              {td(<>{inp("serial", "Serial")} 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</>, 9)}
              {td(<>Date 🡪 {inp("date", "DD/MM/YYYY")}</>, 8)}
            </tr>

            {/* Row 1: From / To */}
            <tr>
              {td(<>From 🡪 {inp("from_department", "Department")}</>, 9)}
              {td(<>To 🡪 R&D Head</>, 8)}
            </tr>

            {/* Row 2: Request type checkboxes */}
            <tr>
              {td("Request for", 3, "font-semibold bg-muted/30")}
              {td(
                <label className="flex items-center gap-1">
                  {editMode ? (
                    <input type="checkbox" checked={val(d, "request_type") === "new"} onChange={() => onChange?.("request_type", "new")} />
                  ) : (
                    <span className="w-3 h-3 border border-foreground/30 inline-block text-center text-[8px]">{val(d, "request_type") === "new" ? "✓" : ""}</span>
                  )}
                  New product development
                </label>,
                10
              )}
              {td(
                <label className="flex items-center gap-1">
                  {editMode ? (
                    <input type="checkbox" checked={val(d, "request_type") === "modification"} onChange={() => onChange?.("request_type", "modification")} />
                  ) : (
                    <span className="w-3 h-3 border border-foreground/30 inline-block text-center text-[8px]">{val(d, "request_type") === "modification" ? "✓" : ""}</span>
                  )}
                  Modification in existing product
                </label>,
                4
              )}
            </tr>

            {/* Row 3: Name of customer */}
            <tr>
              {td(<><span className="font-semibold">Name of customer:</span> {inp("customer_name", "Customer Name")}</>, 17)}
            </tr>

            {/* Row 4: Name of product */}
            <tr>
              {td(<><span className="font-semibold">Name of product:</span> {inp("product_name", "Product Name")}</>, 17)}
            </tr>

            {/* Row 5: Description of product / modification */}
            <tr>
              {td(
                <div>
                  <div className="font-semibold mb-1">Description of product / modification:</div>
                  {textArea("product_description", "Description")}
                </div>,
                17,
                "min-h-[60px]"
              )}
            </tr>

            {/* Row 6: Specification / standard */}
            <tr>
              {td(<><span className="font-semibold">Specification / standard:</span> {inp("specification", "Specification")}</>, 17)}
            </tr>

            {/* Row 7: Product code / Sample enclosed */}
            <tr>
              {td(<><span className="font-semibold">Product code no.:</span> {inp("product_code", "N/A")}</>, 9)}
              {td(<><span className="font-semibold">Sample / standard enclosed:</span> {inp("sample_enclosed", "Yes / No")}</>, 8)}
            </tr>

            {/* Row 8: Expected date / Priority / Estimated cost */}
            <tr>
              {td(<><span className="font-semibold">Expected date of completion:</span> {inp("target_completion", "DD/MM/YYYY")}</>, 6)}
              {td(
                <div>
                  <span className="font-semibold">Priority:</span>
                  <div className="flex gap-2 mt-0.5">
                    {(["high", "normal", "routine"] as const).map(p => (
                      <label key={p} className="flex items-center gap-0.5">
                        {editMode ? (
                          <input type="radio" name="priority" checked={val(d, "priority") === p} onChange={() => onChange?.("priority", p)} />
                        ) : (
                          <span className="w-2.5 h-2.5 border border-foreground/30 rounded-full text-[7px] text-center inline-block">{val(d, "priority") === p ? "●" : ""}</span>
                        )}
                        <span className="capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>,
                5
              )}
              {td(<><span className="font-semibold">Estimated cost:</span> {inp("estimated_cost", "₹")}</>, 6)}
            </tr>

            {/* Row 9: Name of present manufacturer */}
            <tr>
              {td(<><span className="font-semibold">Name of present manufacturer:</span> {inp("manufacturer", "Manufacturer")}</>, 17)}
            </tr>

            {/* Row 10: Present market */}
            <tr>
              {td(<><span className="font-semibold">Present market:</span> {inp("present_market", "Market")}</>, 17)}
            </tr>

            {/* Row 11: Reason for Development */}
            <tr>
              {td(
                <div>
                  <div className="font-semibold mb-1">Reason for Development:</div>
                  {textArea("reason_for_development", "Reason")}
                </div>,
                17,
                "min-h-[60px]"
              )}
            </tr>

            {/* Row 12: Design Input Details */}
            <tr>
              {td(
                <div>
                  <div className="font-semibold mb-1">Design Input Details:</div>
                  {textArea("design_input_details", "Design inputs")}
                </div>,
                17,
                "min-h-[60px]"
              )}
            </tr>

            {/* Row 13: Target completion by R&D / Job assigned to */}
            <tr>
              {td(<><span className="font-semibold">Target completion by R&D:</span> {inp("rd_target_completion", "DD/MM/YYYY")}</>, 9)}
              {td(<><span className="font-semibold">Job assigned to:</span> {inp("assigned_to", "Team / Person")}</>, 8)}
            </tr>

            {/* Row 14: R&D Remarks */}
            <tr>
              {td(
                <div>
                  <div className="font-semibold mb-1">R&D Remarks:</div>
                  {textArea("rd_remarks", "Remarks")}
                </div>,
                17,
                "min-h-[40px]"
              )}
            </tr>

            {/* Row 15: Feasibility Review label */}
            <tr>
              {td(<span className="font-semibold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">Feasibility Review by Research and Development Head</span>, 17)}
            </tr>

            {/* Row 16: Approved / Rejected */}
            <tr>
              {td(
                <div className="flex gap-4">
                  <label className="flex items-center gap-1">
                    {editMode ? (
                      <input type="radio" name="feasibility" checked={val(d, "feasibility") === "approved"} onChange={() => onChange?.("feasibility", "approved")} />
                    ) : (
                      <span className="w-3 h-3 border border-foreground/30 rounded-full inline-block text-center text-[8px]">{val(d, "feasibility") === "approved" ? "✓" : ""}</span>
                    )}
                    Approved to process further
                  </label>
                  <label className="flex items-center gap-1">
                    {editMode ? (
                      <input type="radio" name="feasibility" checked={val(d, "feasibility") === "rejected"} onChange={() => onChange?.("feasibility", "rejected")} />
                    ) : (
                      <span className="w-3 h-3 border border-foreground/30 rounded-full inline-block text-center text-[8px]">{val(d, "feasibility") === "rejected" ? "✗" : ""}</span>
                    )}
                    Rejected and verbally intimated to requestor
                  </label>
                </div>,
                17
              )}
            </tr>

            {/* Row 17: Rejection reason */}
            <tr>
              {td(
                <div>
                  <span className="font-semibold">Reason for rejection of request, if any:</span>
                  <div className="mt-0.5">{textArea("rejection_reason", "N/A", "min-h-[30px]")}</div>
                </div>,
                17
              )}
            </tr>

            {/* Row 18: Project no. allotted */}
            <tr>
              {td(<><span className="font-semibold">Project no. allotted:</span> {inp("project_no", "RD-XXX-001")}</>, 17)}
            </tr>

            {/* Row 19: Approved by */}
            <tr>
              {td(<><span className="font-semibold">Approved by:</span> {inp("approved_by", "Name")}</>, 17)}
            </tr>

            {/* Rows 20-24: Empty spacer rows for signature/print alignment */}
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {td(<>&nbsp;</>, 17, "h-4")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormDocument>
  );
}
