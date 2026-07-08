// ============================================================================
// F/09 — Customer Complaint Report
// EXACT MATCH of the original DOCX template — 16 rows × 12 columns
// Labels on the left, radio buttons for Nature of Complaints
// ============================================================================

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
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
  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  const natureChecks = useMemo(() => ({
    serious: val(d, "complaint_nature") === "SERIOUS",
    major: val(d, "complaint_nature") === "MAJOR",
    minor: val(d, "complaint_nature") === "MINOR",
  }), [val(d, "complaint_nature")]);

  const inp = (key: string, placeholder?: string, width?: string) => {
    if (ph) return <span className="px-1 text-sm text-foreground">{val(d, key) || ""}</span>;
    return (
      <input className={`w-full bg-transparent text-sm outline-none border-0 border-b border-border px-1 py-0.5 ${width || ""}`}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder || ""} />
    );
  };

  const textarea = (key: string, placeholder?: string, rows = 3) => {
    if (ph) return <div className="px-1 text-sm text-foreground whitespace-pre-wrap min-h-[3rem]">{val(d, key) || ""}</div>;
    return (
      <textarea className="w-full bg-transparent text-sm outline-none border border-border rounded-sm px-1 py-0.5 resize-y"
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder || ""} rows={rows} />
    );
  };

  return (
    <FormDocument formCode="F/09" formName="Customer Complaint" serial={val(d, "serial")} sectionName="Sales & Customer Service">
      <table className="w-full border-collapse border border-border">
        <colgroup>
          <col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" />
          <col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[8%]" />
          <col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[8%]" />
          <col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[8%]" />
        </colgroup>
        <tbody>
          {/* ROW 0: Title + Form Code */}
          <tr>
            <td colSpan={11} className="border border-border px-3 py-2 text-center font-bold text-sm text-foreground">
              Customer Complaint Report
            </td>
            <td className="border border-border px-2 py-1 text-[10px] text-muted-foreground text-center leading-tight">
              F/09<br />Rev No.{serialValue}
            </td>
          </tr>

          {/* ROW 1: Complaint Sr. No. + Date */}
          <tr>
            <td colSpan={7} className="border border-border px-3 py-1.5 text-sm text-foreground">
              <strong>Complaint Sr. No.</strong> 🡪&nbsp;&nbsp;{serialValue}
            </td>
            <td colSpan={5} className="border border-border px-3 py-1.5 text-sm text-foreground">
              <strong>Date</strong> 🡪&nbsp;&nbsp;{inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* ROW 2: Receipt of Complaint — Date + Received By */}
          <tr>
            <td rowSpan={2} className="border border-border px-2 py-2 text-sm font-semibold text-foreground align-middle">
              Receipt of Complaint
            </td>
            <td colSpan={3} className="border border-border px-2 py-1.5 text-sm font-semibold text-foreground">
              Date
            </td>
            <td colSpan={3} className="border border-border px-2 py-1.5 text-sm">
              {inp("receipt_date", "DD/MM/YYYY")}
            </td>
            <td rowSpan={2} colSpan={2} className="border border-border px-2 py-2 text-sm font-semibold text-foreground align-middle">
              Received By 🡪
            </td>
            <td rowSpan={2} colSpan={3} className="border border-border px-2 py-2 text-sm">
              {inp("received_by", "Name")}
            </td>
          </tr>

          {/* ROW 3: (Receipt cont.) — Time */}
          <tr>
            <td colSpan={3} className="border border-border px-2 py-1.5 text-sm font-semibold text-foreground">
              Time
            </td>
            <td colSpan={3} className="border border-border px-2 py-1.5 text-sm">
              {inp("receipt_time", "HH:MM")}
            </td>
          </tr>

          {/* ROW 4: Mode of Receipt */}
          <tr>
            <td colSpan={7} className="border border-border px-3 py-1.5 text-sm text-foreground">
              <strong>Mode of Receipt</strong> 🡪&nbsp;&nbsp;{inp("mode_of_receipt", "Email / Phone / Letter / In-person")}
            </td>
            <td colSpan={5} className="border border-border px-3 py-1.5 text-sm">
            </td>
          </tr>

          {/* ROW 5: Customer Name */}
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1.5 text-sm text-foreground">
              <strong>Customer Name</strong> 🡪&nbsp;&nbsp;{inp("client_name", "Customer name")}
            </td>
          </tr>

          {/* ROW 6: Details of Product */}
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Details of Product
            </td>
          </tr>

          {/* ROW 7: Type Of Product */}
          <tr>
            <td colSpan={2} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Type Of Product 🡪
            </td>
            <td colSpan={10} className="border border-border px-3 py-1.5 text-sm">
              {inp("product_type", "Product / service type")}
            </td>
          </tr>

          {/* ROW 8: Description Of Complaints */}
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Description Of Complaints 🡪
            </td>
          </tr>
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1">
              {textarea("description", "Describe the complaint...", 4)}
            </td>
          </tr>

          {/* ROW 9: Nature Of Complaints */}
          <tr>
            <td colSpan={3} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Nature Of Complaints 🡪
            </td>
            <td colSpan={3} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground text-center">
              SERIOUS
            </td>
            <td colSpan={3} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground text-center">
              MAJOR
            </td>
            <td colSpan={3} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground text-center">
              MINOR
            </td>
          </tr>

          {/* ROW 10: Radio buttons — empty label cell first, then SERIOUS | MAJOR | MINOR */}
          <tr>
            <td colSpan={3} className="border border-border"></td>
            <td colSpan={3} className="border border-border text-center py-2">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature" value="SERIOUS"
                  checked={natureChecks.serious}
                  onChange={() => onChange?.("complaint_nature", "SERIOUS")}
                  className="accent-blue-600 w-4 h-4" />
              ) : val(d, "complaint_nature") === "SERIOUS" ? <span className="text-lg">✓</span> : ""}
            </td>
            <td colSpan={3} className="border border-border text-center py-2">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature" value="MAJOR"
                  checked={natureChecks.major}
                  onChange={() => onChange?.("complaint_nature", "MAJOR")}
                  className="accent-blue-600 w-4 h-4" />
              ) : val(d, "complaint_nature") === "MAJOR" ? <span className="text-lg">✓</span> : ""}
            </td>
            <td colSpan={3} className="border border-border text-center py-2">
              {editMode && !isTemplate ? (
                <input type="radio" name="complaint_nature" value="MINOR"
                  checked={natureChecks.minor}
                  onChange={() => onChange?.("complaint_nature", "MINOR")}
                  className="accent-blue-600 w-4 h-4" />
              ) : val(d, "complaint_nature") === "MINOR" ? <span className="text-lg">✓</span> : ""}
            </td>
          </tr>

          {/* ROW 11: Corrective Action Taken */}
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Corrective Action Taken
            </td>
          </tr>
          <tr>
            <td colSpan={12} className="border border-border px-3 py-1">
              {textarea("corrective_action", "Describe corrective actions...", 3)}
            </td>
          </tr>

          {/* ROW 12: Result + Actions Proposed */}
          <tr>
            <td colSpan={5} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Result Of Action Taken
            </td>
            <td colSpan={7} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Actions Proposed For Future
            </td>
          </tr>
          <tr>
            <td colSpan={5} className="border border-border px-2 py-1 min-h-[4rem]">
              {textarea("result_of_action", "", 2)}
            </td>
            <td colSpan={7} className="border border-border px-2 py-1 min-h-[4rem]">
              {textarea("actions_proposed", "", 2)}
            </td>
          </tr>

          {/* ROW 13: Customer Informed + ClientPlatform */}
          <tr>
            <td colSpan={5} className="border border-border"></td>
            <td colSpan={2} className="border border-border px-2 py-1.5 text-sm font-semibold text-foreground">
              Customer Informed Vide
            </td>
            <td colSpan={5} className="border border-border px-2 py-1.5 text-sm">
              {inp("customer_informed_vide", "Reference / Memo no.")}
            </td>
          </tr>

          {/* ROW 14: ClientPlatform Confirmation */}
          <tr>
            <td colSpan={5} className="border border-border"></td>
            <td colSpan={7} className="border border-border px-2 py-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={val(d, "clientplatform_confirmation") === "Yes"}
                  onChange={e => onChange?.("clientplatform_confirmation", e.target.checked ? "Yes" : "No")}
                  disabled={ph} className="accent-blue-600" />
                <span className="font-semibold text-foreground">ClientPlatform Confirmation</span>
              </label>
            </td>
          </tr>

          {/* ROW 14b: Confirmation Date */}
          <tr>
            <td colSpan={5} className="border border-border"></td>
            <td colSpan={2} className="border border-border px-2 py-1.5 text-sm font-semibold text-foreground">
              Confirmation Date
            </td>
            <td colSpan={5} className="border border-border px-2 py-1.5 text-sm">
              {inp("clientplatform_confirmation_date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* ROW 15: Analysed By + Closed By */}
          <tr>
            <td colSpan={5} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Analysed By:
            </td>
            <td colSpan={7} className="border border-border px-3 py-1.5 text-sm font-semibold text-foreground">
              Closed By — Authorised Person
            </td>
          </tr>
          <tr>
            <td colSpan={5} className="border border-border px-3 py-1.5 text-sm">
              {inp("analysed_by", "Name & Signature")}
            </td>
            <td colSpan={7} className="border border-border px-3 py-1.5 text-sm">
              {inp("closed_by", "Name & Signature")}
            </td>
          </tr>

          {/* VEZLOO footer */}
          <tr>
            <td colSpan={12} className="text-center text-[10px] font-bold text-gray-400 py-1 border border-border">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>

    );
}