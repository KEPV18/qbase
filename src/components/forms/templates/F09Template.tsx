// ============================================================================
// F/09 — Customer Complaint Report
// EXACT MATCH of the Word document — 16 rows × 12 columns
// Database field names (from DOCX backfill): client_name, project_name, product_type, etc.
// ============================================================================

import React, { useMemo } from "react";
import { FormDocument } from "../FormKit";

export interface F09Props {
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

function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

export function F09Template({ data, isTemplate = true, editMode = false, onChange, className }: F09Props) {
  const d = data ?? {};
  const ph = isTemplate || !editMode;
  // Database uses 'serial' field
  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  const natureChecks = useMemo(() => ({
    serious: val(d, "complaint_nature") === "SERIOUS",
    major: val(d, "complaint_nature") === "MAJOR",
    minor: val(d, "complaint_nature") === "MINOR",
  }), [val(d, "complaint_nature")]);

  const inp = (key: string, placeholder?: string, width?: string) => {
    if (ph) return <span className="px-1 text-sm text-foreground">{val(d, key) || ""}</span>;
    return (
      <input
        className={`w-full bg-transparent text-sm outline-none border-0 border-b border-border px-1 py-0.5 ${width || ""}`}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder || ""}
      />
    );
  };

  const textarea = (key: string, placeholder?: string, rows = 3) => {
    if (ph) return <div className="px-1 text-sm text-foreground whitespace-pre-wrap min-h-[3rem]">{val(d, key) || ""}</div>;
    return (
      <textarea
        className="w-full bg-transparent text-sm outline-none border border-border rounded-sm px-1 py-0.5 resize-y"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder || ""}
        rows={rows}
      />
    );
  };

  const cellClass = "border border-border px-2 py-1.5 text-sm";
  const labelClass = `${cellClass} font-semibold text-foreground`;

  return (
    <FormDocument formCode="F/09" formName="Customer Complaint Report" serial={serialValue} sectionName="Sales & Customer Service">
      <table className="w-full border-collapse border border-border">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
        </colgroup>
        <tbody>

          {/* ROW 0: Title + Form Code */}
          <tr>
            <td colSpan={11} className={`${cellClass} text-center font-bold text-sm`}>
              Customer Complaint Report
            </td>
            <td className={`${cellClass} text-[10px] text-muted-foreground text-center leading-tight`}>
              F/09<br />Rev No.00
            </td>
          </tr>

          {/* ROW 1: Complaint Sr. No. + Date */}
          <tr>
            <td colSpan={7} className={`${cellClass}`}>
              <strong>Complaint Sr. No.</strong> 🡪&nbsp;&nbsp;{serialValue}
            </td>
            <td colSpan={5} className={`${cellClass}`}>
              <strong>Date</strong> 🡪&nbsp;&nbsp;{inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* ROW 2: Receipt of Complaint — Date + Received By */}
          <tr>
            <td rowSpan={2} className={`${labelClass} align-middle`}>
              Receipt of Complaint
            </td>
            <td colSpan={3} className={`${labelClass}`}>
              Date
            </td>
            <td colSpan={3} className={cellClass}>
              {inp("receipt_date", "DD/MM/YYYY")}
            </td>
            <td colSpan={5} rowSpan={2} className={`${labelClass} align-middle`}>
              Received By 🡪&nbsp;&nbsp;{inp("received_by", "Name")}
            </td>
          </tr>

          {/* ROW 3: (Receipt cont.) — Time */}
          <tr>
            <td colSpan={3} className={`${labelClass}`}>
              Time
            </td>
            <td colSpan={3} className={cellClass}>
              {inp("receipt_time", "HH:MM")}
            </td>
          </tr>

          {/* ROW 4: Mode of Receipt + Received By */}
          <tr>
            <td colSpan={7} className={`${cellClass}`}>
              <strong>Mode of Receipt</strong> 🡪&nbsp;&nbsp;
              {inp("mode_of_receipt", "Email / Phone / Letter / In-person")}
            </td>
            <td colSpan={5} className={cellClass}>
            </td>
          </tr>

          {/* ROW 5: Customer Name (DB: client_name) */}
          <tr>
            <td className={`${labelClass}`}>Customer Name</td>
            <td colSpan={11} className={cellClass}>
              {inp("client_name", "Customer name")}
            </td>
          </tr>

          {/* ROW 6: Customer Address (DB: project_name) */}
          <tr>
            <td className={`${labelClass}`}>Customer Address</td>
            <td colSpan={11} className={cellClass}>
              {inp("project_name", "Address")}
            </td>
          </tr>

          {/* ROW 7: Contact Person (DB: product_type) */}
          <tr>
            <td className={`${labelClass}`}>Contact Person</td>
            <td colSpan={11} className={cellClass}>
              {inp("product_type", "Contact person")}
            </td>
          </tr>

          {/* ROW 8: Tel / Fax No. (DB: clientplatform_confirmation) */}
          <tr>
            <td className={`${labelClass}`}>Tel / Fax No.</td>
            <td colSpan={11} className={cellClass}>
              {inp("clientplatform_confirmation", "Phone / Fax")}
            </td>
          </tr>

          {/* ROW 9: Nature of Complaint — checkboxes */}
          <tr>
            <td className={`${labelClass}`}>Nature of Complaint</td>
            <td colSpan={3} className={`${cellClass} text-center`}>
              <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                {editMode && !isTemplate ? (
                  <input
                    type="radio"
                    name="complaint_nature"
                    value="SERIOUS"
                    checked={natureChecks.serious}
                    onChange={() => onChange?.("complaint_nature", "SERIOUS")}
                    className="accent-blue-600"
                  />
                ) : natureChecks.serious ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="w-4 h-4 border border-border rounded-sm inline-block" />
                )}
                <span className="font-semibold">SERIOUS</span>
              </label>
            </td>
            <td colSpan={3} className={`${cellClass} text-center`}>
              <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                {editMode && !isTemplate ? (
                  <input
                    type="radio"
                    name="complaint_nature"
                    value="MAJOR"
                    checked={natureChecks.major}
                    onChange={() => onChange?.("complaint_nature", "MAJOR")}
                    className="accent-amber-600"
                  />
                ) : natureChecks.major ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="w-4 h-4 border border-border rounded-sm inline-block" />
                )}
                <span className="font-semibold">MAJOR</span>
              </label>
            </td>
            <td colSpan={3} className={`${cellClass} text-center`}>
              <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                {editMode && !isTemplate ? (
                  <input
                    type="radio"
                    name="complaint_nature"
                    value="MINOR"
                    checked={natureChecks.minor}
                    onChange={() => onChange?.("complaint_nature", "MINOR")}
                    className="accent-green-600"
                  />
                ) : natureChecks.minor ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="w-4 h-4 border border-border rounded-sm inline-block" />
                )}
                <span className="font-semibold">MINOR</span>
              </label>
            </td>
            <td colSpan={3} className={cellClass}>
              <strong>Complaint Type</strong> 🡪&nbsp;&nbsp;{inp("complaint_type", "Type")}
            </td>
          </tr>

          {/* ROW 10: Details of Product */}
          <tr>
            <td className={`${labelClass}`}>Details of Product</td>
            <td colSpan={11} className={cellClass}>
              {textarea("details_of_product", "Product details", 2)}
            </td>
          </tr>

          {/* ROW 11: Description of Complaint (DB: description) */}
          <tr>
            <td className={`${labelClass}`}>Description of Complaint</td>
            <td colSpan={11} className={cellClass}>
              {textarea("description", "Complaint description", 3)}
            </td>
          </tr>

          {/* ROW 12: Investigation / Analysis (DB: actions_proposed + analysed_by) */}
          <tr>
            <td className={`${labelClass}`}>Investigation / Analysis</td>
            <td colSpan={11} className={cellClass}>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Analysed By: </span>
                  {inp("analysed_by", "Analyst name")}
                </div>
                <div>
                  <span className="font-semibold">Proposed Actions: </span>
                  {textarea("actions_proposed", "Investigation details", 3)}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW 13: Root Cause (DB: corrective_action) */}
          <tr>
            <td className={`${labelClass}`}>Root Cause</td>
            <td colSpan={11} className={cellClass}>
              {textarea("corrective_action", "Root cause analysis", 3)}
            </td>
          </tr>

          {/* ROW 14: Corrective Action (DB: result_of_action) */}
          <tr>
            <td className={`${labelClass}`}>Corrective Action</td>
            <td colSpan={11} className={cellClass}>
              {textarea("result_of_action", "Corrective action taken", 3)}
            </td>
          </tr>

          {/* ROW 15: Preventive Action (DB: customer_informed_date, clientplatform_confirmation_date) */}
          <tr>
            <td className={`${labelClass}`}>Preventive Action</td>
            <td colSpan={11} className={cellClass}>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Customer Informed Date: </span>
                  {inp("customer_informed_date", "DD/MM/YYYY")}
                </div>
                <div>
                  <span className="font-semibold">Confirmation Date: </span>
                  {inp("clientplatform_confirmation_date", "DD/MM/YYYY")}
                </div>
                <div>
                  <span className="font-semibold">Customer Informed Vide: </span>
                  {inp("customer_informed_vide", "Vide reference")}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW 16: Status / Closure */}
          <tr>
            <td className={`${labelClass}`}>Status / Closure</td>
            <td colSpan={11} className={cellClass}>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Closed By: </span>
                  {inp("closed_by", "Name")}
                </div>
                <div>
                  <span className="font-semibold">Closed Date: </span>
                  {inp("closed_date", "DD/MM/YYYY")}
                </div>
              </div>
            </td>
          </tr>

        </tbody>
      </table>
    </FormDocument>
  );
}