// ============================================================================
// F/16 — Supplier Registration Form
// DOCX: 1 table, 21 rows. Multi-section vendor registration.
// Sections: Basic info, services, employee strength, speciality,
// association, objections, authorised person, company approval.
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

export interface F16Props {
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
  return typeof v === "string" ? v : String(v);
}

export function F16Template({ data, isTemplate = true, editMode = false, onChange, className }: F16Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="checkbox" className="mx-1" checked={val(d, key) === "true"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 align-middle text-center text-[10px]">
          {val(d, key) === "true" ? "✓" : ""}
        </span>
      )}
      {label}
    </label>
  );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[60px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border-none outline-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[3fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Supplier Registration Form</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/16 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Basic Info */}
      <table className="w-full border-collapse border-x border-black text-xs">
        <tbody>
          <tr><td className="border border-black p-1.5 bg-gray-50 w-1/4 font-semibold">Name</td><td className="border border-black p-1.5" colSpan={3}>{inp("name", "Supplier Name")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Address</td><td className="border border-black p-1.5" colSpan={3}>{inp("address", "Full Address")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Tel / Fax No.</td><td className="border border-black p-1.5" colSpan={3}>{inp("tel_fax", "Phone / Fax")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Contact Person</td><td className="border border-black p-1.5" colSpan={3}>{inp("contact_person", "Contact Name")}</td></tr>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Mobile No.</td>
            <td className="border border-black p-1.5">{inp("mobile_no", "Mobile")}</td>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold w-1/4">Residence No.</td>
            <td className="border border-black p-1.5">{inp("residence_no", "Residence Phone")}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Sister Concerns, If Any</td>
            <td className="border border-black p-1.5" colSpan={1}>{inp("sister_concerns", "Details")}</td>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Reference (If Any)</td>
            <td className="border border-black p-1.5">{inp("reference", "Reference")}</td>
          </tr>
        </tbody>
      </table>

      {/* Products/Services */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Briefly explain about your products, services and experience:</div>
        <div className="p-1.5 min-h-[60px]">{textArea("products_services", "Products, services, experience...")}</div>
      </div>

      {/* Employee Strength */}
      <table className="w-full border-collapse border-x border-black text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Employee Strength</td>
            <td className="border border-black p-1.5">{inp("employee_strength", "Number")}</td>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Nos. Of Site / Branch</td>
            <td className="border border-black p-1.5">{inp("sites_branches", "Number")}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold" colSpan={2}>Are you associated with our firm? Since How Long?</td>
            <td className="border border-black p-1.5" colSpan={2}>
              <div className="flex gap-4 items-center">
                {chk("associated_yes", "Yes")} {chk("associated_no", "No")}
                <span className="ml-4">{inp("association_years", "Years", "w-16")}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Speciality */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Give Details of your Speciality:</div>
        <div className="p-1.5 min-h-[40px]">{textArea("speciality", "Speciality details...", "min-h-[40px]")}</div>
      </div>

      {/* Objections */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-50 font-semibold">Do you have any objections to our representative or our client visiting your premises?</div>
        <div className="p-1.5 flex gap-4 items-center">
          {chk("objections_no", "No")} {chk("objections_yes", "Yes")}
        </div>
      </div>

      {/* Vendor Authorised Person */}
      <table className="w-full border-collapse border-x border-black text-xs">
        <tbody>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Name of authorised person of vendor</td><td className="border border-black p-1.5">{inp("vendor_auth_name", "Name")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Designation</td><td className="border border-black p-1.5">{inp("vendor_auth_designation", "Designation")}</td></tr>
          <tr><td className="border border-black p-1.5 bg-gray-50 font-semibold">Date</td><td className="border border-black p-1.5">{inp("vendor_date", "Date")}</td></tr>
        </tbody>
      </table>

      {/* Company Section */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 bg-gray-100 font-bold text-center">To Be Filled By Company</div>
      </div>

      <table className="w-full border-collapse border-x border-b border-black text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">
              {chk("recommended", "Recommended As Approved Supplier")}
            </td>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">
              {chk("not_recommended", "Not Recommended As Approved Supplier")}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Reason For Approval / Rejection</td>
            <td className="border border-black p-1.5">{inp("approval_reason", "Reason")}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 bg-gray-50 font-semibold">Past Experience / Market Reputation / Trial Order / Sample Approval</td>
            <td className="border border-black p-1.5">{inp("past_experience", "Details")}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5">Authorised By: {inp("authorised_by", "Name")}</td>
            <td className="border border-black p-1.5">Date: {inp("authorised_date", "Date")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}