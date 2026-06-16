// ============================================================================
// F/08 — Order Form / Order Confirmation (Company Ongoing Services)
// EXACT MATCH of the original DOCX template — 17 rows × 14 columns
// Labels on the left, values filling merged cells to the right
// As it appears in: 01- Sales Records/F-08 - Order Form/F_08-001.docx
// ============================================================================

import React, { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import {
  valAny, val, todayDDMMYYYY,
  labelCls, valueCls, emptyValueCls,
  Cell, LabelCell, DateOrTextCell, TextAreaCell,
  TitleRow, FooterRow,
  useDynamicRows,
  type FormTemplateBaseProps,
  type DynamicRowItem,
} from "./FormTemplateKit";

export interface F08Props extends FormTemplateBaseProps {}

export function F08Template({ data, isTemplate = true, editMode = false, onChange, className }: F08Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // ── Product items via shared dynamic row hook ──────────────────────
  const { rows: items, addRow: addItem, removeRow: removeItem, updateRowField: updateItem } = useDynamicRows<{
    product_name: string; specifications: string; qty: string;
  }>({
    data: d,
    field: "items",
    defaultItem: { product_name: "", specifications: "", qty: "" },
    editMode,
    onChange,
  });

  const serialValue = val(d, "serial");

  return (
    <div className={cn("w-full", className)}>
      {/* ====== DESKTOP: Full DOCX-replica table ====== */}
      <div className="hidden md:block">
        {/* Company header */}
        <div className="text-center py-3">
          <span className="text-3xl font-bold tracking-widest text-gray-900 dark:text-gray-100">VEZLOO</span>
        </div>

        <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
          <colgroup>
            <col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" />
            <col className="w-[8%]" /><col className="w-[7%]" /><col className="w-[7%]" />
            <col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[7%]" />
            <col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[8%]" />
            <col className="w-[8%]" /><col className="w-[4%]" />
          </colgroup>

          <tbody>
            {/* ROW 0: Title + Form Code */}
            <tr>
              <td colSpan={13} className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center">
                <strong className="text-sm uppercase text-gray-900 dark:text-gray-100">
                  Order Form / Order Confirmation (Company Ongoing Services)
                </strong>
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">
                F/08<br />Rev No. {serialValue}
              </td>
            </tr>

            {/* ROW 1: Sr. No. + Date */}
            <tr>
              <td colSpan={8} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                <strong>Sr. No.</strong> 🡪&nbsp;&nbsp;{serialValue}
              </td>
              <td colSpan={6} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                <strong>Date</strong> 🡪&nbsp;&nbsp;{val(d, "date") || todayDDMMYYYY()}
              </td>
            </tr>

            {/* ROW 2: Customer */}
            <tr>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Customer
              </td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={11} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {val(d, "client_name") || "--"}
              </td>
            </tr>

            {/* ROW 3: Mode Of Receipt */}
            <tr>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Mode Of Receipt
              </td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={11} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {val(d, "mode_of_receipt") || "--"}
              </td>
            </tr>

            {/* ROW 4: Product Table Header */}
            <tr>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Sr. No.
              </td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Product Name
              </td>
              <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Specifications
              </td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Qty.
              </td>
            </tr>

            {/* ROWS 5-9: Product Items */}
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 text-center">
                  {editMode ? (
                    <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none text-center"
                      value={idx + 1} disabled />
                  ) : (
                    idx + 1
                  )}
                </td>
                <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm">
                  {editMode ? (
                    <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                      value={item.product_name}
                      onChange={(e) => updateItem(idx, "product_name", e.target.value)}
                      placeholder="Product name" />
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100">{item.product_name || "--"}</span>
                  )}
                </td>
                <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm">
                  {editMode ? (
                    <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                      value={item.specifications}
                      onChange={(e) => updateItem(idx, "specifications", e.target.value)}
                      placeholder="Specifications" />
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100">{item.specifications || "--"}</span>
                  )}
                </td>
                <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm">
                  {editMode ? (
                    <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, "qty", e.target.value)}
                      placeholder="Qty" />
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100">{item.qty || "--"}</span>
                  )}
                  {editMode && (
                    <button onClick={() => removeItem(idx)} className="ml-1 text-red-500 hover:text-red-700">
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {editMode && (
              <tr>
                <td colSpan={14} className="border border-gray-300 dark:border-gray-700 px-2 py-1">
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Plus size={14} /> Add Product
                  </button>
                </td>
              </tr>
            )}

            {/* ROW 10: Test Certificate */}
            <tr>
              <td colSpan={5} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Requirement Of Test Certificate
              </td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {editMode ? (
                  <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                    value={val(d, "test_certificate_required")}
                    onChange={(e) => onChange && onChange("test_certificate_required", e.target.value)}
                    placeholder="Yes / No" />
                ) : (
                  val(d, "test_certificate_required") || "Yes / No"
                )}
              </td>
            </tr>

            {/* ROW 11: Delivery Schedule */}
            <tr>
              <td colSpan={5} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Delivery Schedule
              </td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {editMode ? (
                  <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                    value={val(d, "delivery_schedule")}
                    onChange={(e) => onChange && onChange("delivery_schedule", e.target.value)}
                    placeholder="Delivery schedule" />
                ) : (
                  val(d, "delivery_schedule") || "--"
                )}
              </td>
            </tr>

            {/* ROW 12: Statutory */}
            <tr>
              <td colSpan={5} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Statutory And Regulatory Requirements, If Any
              </td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {editMode ? (
                  <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                    value={val(d, "complies")}
                    onChange={(e) => onChange && onChange("complies", e.target.value)}
                    placeholder="Complies / Does Not Comply" />
                ) : (
                  val(d, "complies") || "Complies / Does Not Comply"
                )}
              </td>
            </tr>

            {/* ROW 13: Order Status */}
            <tr>
              <td colSpan={5} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Order
              </td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={7} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {editMode ? (
                  <input className="w-full text-xs px-1 py-0.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                    value={val(d, "order_status")}
                    onChange={(e) => onChange && onChange("order_status", e.target.value)}
                    placeholder="— Accepted / Rejected" />
                ) : (
                  val(d, "order_status") || "— Accepted / Rejected"
                )}
              </td>
            </tr>

            {/* ROW 14: Remarks + Reviewed By */}
            <tr>
              <td colSpan={8} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                <strong>Remarks :</strong> {val(d, "remarks") || "--"}
              </td>
              <td colSpan={6} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                <strong>Reviewed By :</strong> {val(d, "reviewed_by") || "--"}
              </td>
            </tr>

            {/* ROW 15: Bill No. */}
            <tr>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Bill No.
              </td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {val(d, "bill_no") || "N/A"}
              </td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                (Service Contract Based)
              </td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
            </tr>

            {/* ROW 16: Despatch Date */}
            <tr>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Despatch Date
              </td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                {val(d, "despatch_date") || "--"}
              </td>
              <td colSpan={3} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={1} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
              <td colSpan={2} className="border border-gray-300 dark:border-gray-700"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== MOBILE: Card stack ====== */}
      <div className="block md:hidden space-y-2">
        <div className="border border-gray-300 dark:border-gray-700 rounded-sm p-3 text-center">
          <span className="text-2xl font-bold tracking-widest">VEZLOO</span>
        </div>
        <div className="border border-gray-300 dark:border-gray-700 rounded-sm p-3 text-center text-sm">
          <strong>Order Form / Order Confirmation</strong>
          <div className="text-xs text-gray-500 mt-1">{serialValue}</div>
        </div>
        <div className="border border-gray-300 dark:border-gray-700 rounded-sm p-3 space-y-2">
          <div><span className="text-xs font-semibold">Date:</span> {val(d, "date") || todayDDMMYYYY()}</div>
          <div><span className="text-xs font-semibold">Customer:</span> {val(d, "client_name") || "--"}</div>
          <div><span className="text-xs font-semibold">Mode Of Receipt:</span> {val(d, "mode_of_receipt") || "--"}</div>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-300 dark:border-gray-700 rounded-sm p-3 space-y-1">
            <div className="text-xs font-semibold">Item {idx + 1}</div>
            <div className="text-xs"><span className="font-semibold">Product:</span> {item.product_name || "--"}</div>
            <div className="text-xs"><span className="font-semibold">Specs:</span> {item.specifications || "--"}</div>
            <div className="text-xs"><span className="font-semibold">Qty:</span> {item.qty || "--"}</div>
          </div>
        ))}
        <div className="border border-gray-300 dark:border-gray-700 rounded-sm p-3 space-y-1 text-xs">
          <div><span className="font-semibold">Test Cert:</span> {val(d, "test_certificate_required") || "Yes / No"}</div>
          <div><span className="font-semibold">Delivery:</span> {val(d, "delivery_schedule") || "--"}</div>
          <div><span className="font-semibold">Statutory:</span> {val(d, "complies") || "Complies / Does Not Comply"}</div>
          <div><span className="font-semibold">Order:</span> {val(d, "order_status") || "— Accepted / Rejected"}</div>
          <div><span className="font-semibold">Remarks:</span> {val(d, "remarks") || "--"}</div>
          <div><span className="font-semibold">Reviewed By:</span> {val(d, "reviewed_by") || "--"}</div>
          <div><span className="font-semibold">Bill No.:</span> {val(d, "bill_no") || "N/A"}</div>
          <div><span className="font-semibold">Despatch Date:</span> {val(d, "despatch_date") || "--"}</div>
        </div>
      </div>
    </div>
  );
}