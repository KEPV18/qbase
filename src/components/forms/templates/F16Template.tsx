import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F16Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F16Template({ data, isTemplate = true, editMode = false, onChange, className }: F16Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string) =>
    editMode ? (
      <input className="border-b border-dashed border-foreground/40 bg-transparent text-sm px-1 w-full" value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]">{val(d, key) || (ph ? "___" : "")}</span>
    );

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-1 text-xs">
      {editMode ? (
        <input type="checkbox" className="mx-1" checked={val(d, key) === "true"} onChange={e => onChange?.(key, e.target.checked ? "true" : "false")} />
      ) : (
        <span className="inline-block w-4 h-4 border border-foreground/30 align-middle text-center text-[10px]">{val(d, key) === "true" ? "✓" : ""}</span>
      )}
      {label}
    </label>
  );

  const textArea = (key: string, placeholder: string) =>
    editMode ? (
      <textarea className="w-full bg-transparent text-sm p-2 border-none outline-none min-h-[60px]" value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className="whitespace-pre-wrap min-h-[60px]">{val(d, key) || (ph ? "___" : "")}</div>
    );

  return (
    <FormDocument formCode="F/16" formName="Supplier Registration" serial={val(d, "serial")} sectionName="Procurement & Vendors">
      {/* ── Desktop: 16-column table (Word: 21 rows × 16 cols) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <tbody>
            {/* Row 0: Title merged 0-13, Rev merged 14-15 */}
            <tr>
              <td colSpan={14} className="border border-border p-2 font-bold bg-primary/5 text-base">Supplier Registration Form</td>
              <td colSpan={2} className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap">F/16 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</td>
            </tr>

            {/* Row 1: Name */}
            <tr>
              <td className="border border-border p-1.5 bg-muted/50 font-semibold">Name</td>
              <td colSpan={15} className="border border-border p-1.5">{inp("name", "Supplier Name")}</td>
            </tr>

            {/* Row 2: Address */}
            <tr>
              <td className="border border-border p-1.5 bg-muted/50 font-semibold">Address</td>
              <td colSpan={15} className="border border-border p-1.5">{inp("address", "Full Address")}</td>
            </tr>

            {/* Row 3: Tel / Fax No. */}
            <tr>
              <td className="border border-border p-1.5 bg-muted/50 font-semibold">Tel / Fax No.</td>
              <td colSpan={15} className="border border-border p-1.5">{inp("tel_fax", "Phone / Fax")}</td>
            </tr>

            {/* Row 4: Contact Person */}
            <tr>
              <td className="border border-border p-1.5 bg-muted/50 font-semibold">Contact Person</td>
              <td colSpan={15} className="border border-border p-1.5">{inp("contact_person", "Contact Name")}</td>
            </tr>

            {/* Row 5: Mobile + Residence (4+4+4+4) */}
            <tr>
              <td colSpan={4} className="border border-border p-1.5 bg-muted/50 font-semibold">Mobile No.</td>
              <td colSpan={4} className="border border-border p-1.5">{inp("mobile_no", "Mobile")}</td>
              <td colSpan={4} className="border border-border p-1.5 bg-muted/50 font-semibold">Residence No.</td>
              <td colSpan={4} className="border border-border p-1.5">{inp("residence_no", "Residence Phone")}</td>
            </tr>

            {/* Row 6: Sister Concerns (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Sister Concerns, If Any</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("sister_concerns", "Details")}</td>
            </tr>

            {/* Row 7: Reference (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Reference (If Any)</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("reference", "Reference")}</td>
            </tr>

            {/* Row 8: Products/Services label */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5 bg-muted/50 font-semibold">Briefly explain about your products, services and experience:</td>
            </tr>

            {/* Row 9: Products/Services textarea */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5">{textArea("products_services", "Products, services, experience...")}</td>
            </tr>

            {/* Row 10: Employee Strength (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Employee Strength</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("employee_strength", "Number")}</td>
            </tr>

            {/* Row 11: Sites/Branches (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Nos. Of Site / Branch</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("sites_branches", "Number")}</td>
            </tr>

            {/* Row 12: Association (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Are you associated with our firm? Since How Long?</td>
              <td colSpan={8} className="border border-border p-1.5">
                <div className="flex gap-4 items-center">
                  {chk("associated_yes", "Yes")}
                  {chk("associated_no", "No")}
                  <span className="ml-4">{inp("association_years", "Years")}</span>
                </div>
              </td>
            </tr>

            {/* Row 13: Speciality label */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5 bg-muted/50 font-semibold">Give Details of your Speciality:</td>
            </tr>

            {/* Row 14: Speciality textarea */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5">{textArea("speciality", "Speciality details...")}</td>
            </tr>

            {/* Row 15: Objections */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5">
                <div className="font-semibold mb-1">Do you have any objections to our representative or our client visiting your premises?</div>
                <div className="flex gap-4 items-center">{chk("objections_no", "No")} {chk("objections_yes", "Yes")}</div>
              </td>
            </tr>

            {/* Row 16: Vendor Auth Name (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Name of authorised person of vendor</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("vendor_auth_name", "Name")}</td>
            </tr>

            {/* Row 17: Designation (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Designation</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("vendor_auth_designation", "Designation")}</td>
            </tr>

            {/* Row 18: Date (8+8) */}
            <tr>
              <td colSpan={8} className="border border-border p-1.5 bg-muted/50 font-semibold">Date</td>
              <td colSpan={8} className="border border-border p-1.5">{inp("vendor_date", "Date")}</td>
            </tr>

            {/* Row 19: Company header */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5 bg-muted font-bold text-center">To Be Filled By Company</td>
            </tr>

            {/* Row 20: Company fields (checkboxes + inputs) */}
            <tr>
              <td colSpan={16} className="border border-border p-1.5">
                <div className="space-y-2">
                  <div className="flex gap-6">{chk("recommended", "Recommended As Approved Supplier")} {chk("not_recommended", "Not Recommended As Approved Supplier")}</div>
                  <div><span className="font-semibold">Reason For Approval / Rejection: </span>{inp("approval_reason", "Reason")}</div>
                  <div><span className="font-semibold">Past Experience / Market Reputation / Trial Order / Sample Approval: </span>{inp("past_experience", "Details")}</div>
                  <div className="flex gap-6">
                    <span>Authorised By: {inp("authorised_by", "Name")}</span>
                    <span>Date: {inp("authorised_date", "Date")}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked fallback ── */}
      <div className="md:hidden p-2 border border-border text-xs space-y-3">
        <div className="font-bold text-base">Supplier Registration Form</div>
        <div className="text-muted-foreground text-[10px]">F/16 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>

        <div className="space-y-2">
          <div><span className="font-semibold">Name:</span> {inp("name", "Supplier Name")}</div>
          <div><span className="font-semibold">Address:</span> {inp("address", "Full Address")}</div>
          <div><span className="font-semibold">Tel / Fax No.:</span> {inp("tel_fax", "Phone / Fax")}</div>
          <div><span className="font-semibold">Contact Person:</span> {inp("contact_person", "Contact Name")}</div>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-semibold">Mobile No.:</span> {inp("mobile_no", "Mobile")}</div>
            <div><span className="font-semibold">Residence No.:</span> {inp("residence_no", "Residence")}</div>
          </div>
          <div><span className="font-semibold">Sister Concerns:</span> {inp("sister_concerns", "Details")}</div>
          <div><span className="font-semibold">Reference:</span> {inp("reference", "Reference")}</div>

          <div className="border-t border-border pt-2">
            <div className="font-semibold mb-1">Products, Services & Experience:</div>
            {textArea("products_services", "Products, services, experience...")}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-semibold">Employee Strength:</span> {inp("employee_strength", "Number")}</div>
            <div><span className="font-semibold">Sites / Branches:</span> {inp("sites_branches", "Number")}</div>
          </div>

          <div>
            <span className="font-semibold">Associated with firm?</span>
            <div className="flex gap-3 mt-1">{chk("associated_yes", "Yes")} {chk("associated_no", "No")} <span>{inp("association_years", "Years")}</span></div>
          </div>

          <div className="border-t border-border pt-2">
            <div className="font-semibold mb-1">Speciality:</div>
            {textArea("speciality", "Speciality details...")}
          </div>

          <div>
            <span className="font-semibold">Objections to visit?</span>
            <div className="flex gap-3 mt-1">{chk("objections_no", "No")} {chk("objections_yes", "Yes")}</div>
          </div>

          <div className="border-t border-border pt-2 space-y-1">
            <div><span className="font-semibold">Authorised Person:</span> {inp("vendor_auth_name", "Name")}</div>
            <div><span className="font-semibold">Designation:</span> {inp("vendor_auth_designation", "Designation")}</div>
            <div><span className="font-semibold">Date:</span> {inp("vendor_date", "Date")}</div>
          </div>

          <div className="border-t border-border pt-2">
            <div className="font-bold text-center mb-2">To Be Filled By Company</div>
            <div className="flex gap-4">{chk("recommended", "Recommended")} {chk("not_recommended", "Not Recommended")}</div>
            <div className="mt-1"><span className="font-semibold">Reason:</span> {inp("approval_reason", "Reason")}</div>
            <div><span className="font-semibold">Past Experience:</span> {inp("past_experience", "Details")}</div>
            <div className="flex gap-4">
              <span>Authorised By: {inp("authorised_by", "Name")}</span>
              <span>Date: {inp("authorised_date", "Date")}</span>
            </div>
          </div>
        </div>
      </div>
    </FormDocument>
  );
}
