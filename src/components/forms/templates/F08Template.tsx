// ============================================================================
// F/08 — Order Form / Order Confirmation
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
//
// Edit mode features:
//   - Product table: starts with 1 row, "Add Row" button to add more
//   - Sr. No.: auto-generated, editable
//   - Date / Despatch Date: default to today, editable
//   - Bill No.: auto-generated from serial, editable
//   - Rev No.: shows actual serial (e.g. F/08-001), editable
//   - Delivery Schedule: date picker, not text
// ============================================================================

import React, { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F08Props {
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

/** Get today in DD/MM/YYYY display format */
function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/* 14-column grid matching DOCX proportions ──────────────────────────── */

export function F08Template({ data, isTemplate = true, editMode = false, onChange, className }: F08Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // ── Product items (dynamic rows) ────────────────────────────────────
  // Parse items from data. In edit mode, manage as local state via onChange.
  const items: Array<Record<string, string>> = useMemo(() => {
    const raw = d.items;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((item: Record<string, unknown>) => ({
          product_name: String(item.product_name ?? ""),
          specifications: String(item.specifications ?? ""),
          qty: String(item.qty ?? ""),
        }));
      } catch { /* fall through */ }
    }
    if (Array.isArray(raw)) {
      return raw.map((item: Record<string, unknown>) => ({
        product_name: String(item.product_name ?? ""),
        specifications: String(item.specifications ?? ""),
        qty: String(item.qty ?? ""),
      }));
    }
    // Default: 1 empty row for edit, 3 placeholder rows for template
    if (editMode && !isTemplate) return [{ product_name: "", specifications: "", qty: "" }];
    if (isTemplate) return [
      { product_name: "", specifications: "", qty: "" },
      { product_name: "", specifications: "", qty: "" },
      { product_name: "", specifications: "", qty: "" },
    ];
    return [{ product_name: "", specifications: "", qty: "" }];
  }, [d.items, editMode, isTemplate]);

  // Helper: update items array
  const updateItems = useCallback((newItems: Array<Record<string, string>>) => {
    onChange?.("items", JSON.stringify(newItems));
  }, [onChange]);

  const addItem = useCallback(() => {
    updateItems([...items, { product_name: "", specifications: "", qty: "" }]);
  }, [items, updateItems]);

  const removeItem = useCallback((index: number) => {
    if (items.length <= 1) return; // Keep at least 1 row
    updateItems(items.filter((_, i) => i !== index));
  }, [items, updateItems]);

  const updateItem = useCallback((index: number, field: string, value: string) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    updateItems(newItems);
  }, [items, updateItems]);

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-3 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
  const inputCls = "w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600";

  // ── Cell helpers ────────────────────────────────────────────────────
  const Cell = ({ field, colSpan, className, placeholder, readonly: forceReadonly }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
    readonly?: boolean;
  }) => {
    const value = val(d, field);
    const isReadonly = forceReadonly ?? readonly;
    if (isReadonly) {
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

  // Date-or-text cell — shows a date picker with a text toggle, or plain text in readonly
  const DateOrTextCell = ({ field, colSpan, className, defaultToday, placeholder }: {
    field: string;
    colSpan?: number;
    className?: string;
    defaultToday?: boolean;
    placeholder?: string;
  }) => {
    const rawValue = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !rawValue && "text-slate-300 dark:text-slate-600")}>
          {rawValue || (isTemplate ? (placeholder || "DD/MM/YYYY") : "")}
        </td>
      );
    }
    // In edit mode: text input with today's date as default, user can type anything
    const displayValue = rawValue || (defaultToday ? todayDDMMYYYY() : "");
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="text"
          value={displayValue}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || "DD/MM/YYYY or text"}
          className={inputCls}
        />
      </td>
    );
  };

  // Label-only cell (never editable)
  const LabelCell = ({ text, colSpan, className }: { text: string; colSpan: number; className?: string }) => (
    <td colSpan={colSpan} className={className || labelCls}>{text}</td>
  );

  // ── Computed defaults for edit mode ─────────────────────────────────
  // Serial: show in Rev No. and Sr. No.
  const serialValue = val(d, "serial");
  // Bill No: auto from serial if not set
  const billNoValue = val(d, "bill_no") || serialValue || "";

  return (
    <div className={cn("max-w-4xl mx-auto font-[Arial,Helvetica,sans-serif]", className)}>
      {/* ── VEZLOO Company Header ───────────────────────────── */}
      <div className="text-center py-3">
        <span className="text-2xl font-bold tracking-widest text-slate-800 dark:text-slate-200">VEZLOO</span>
      </div>

      {/* ── Main Form Table ─────────────────────────────────── */}
      <div className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <tbody>
            {/* ── Row 0: Title + Serial/Rev ─────────────────────── */}
            <tr>
              <td colSpan={13} className={cn(titleCls, "text-center text-lg")}>
                Order Form / Order Confirmation
              </td>
              <td colSpan={1} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
                F/08<br />
                {editMode && !isTemplate ? (
                  <input
                    className="w-full text-xs bg-transparent outline-none text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    value={serialValue}
                    onChange={e => onChange?.("serial", e.target.value)}
                    placeholder="F/08-001"
                  />
                ) : (
                  `Rev ${serialValue || "No.00"}`
                )}
              </td>
            </tr>

            {/* ── Row 1: Sr. No. + Date labels ───────────── */}
            <tr>
              <LabelCell text="Sr. No." colSpan={8} />
              <LabelCell text="Date" colSpan={6} />
            </tr>
            <tr>
              <Cell field="serial" colSpan={8} placeholder="Auto-generated" />
              <DateOrTextCell field="date" colSpan={6} defaultToday={editMode && !isTemplate} />
            </tr>

            {/* ── Row 2: Customer ──────────────────────────── */}
            <tr>
              <LabelCell text="Customer" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="client_name" colSpan={11} placeholder="Customer name" />
            </tr>

            {/* ── Row 3: Mode Of Receipt ────────────────────── */}
            <tr>
              <LabelCell text="Mode Of Receipt" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="mode_of_receipt" colSpan={11} placeholder="Email / Phone / Walk-in" />
            </tr>

            {/* ── Row 4: Product table header ───────────────── */}
            <tr>
              <td colSpan={1} className={headerCls}>Sr. No.</td>
              <td colSpan={3} className={headerCls}>Product Name</td>
              <td colSpan={7} className={headerCls}>Specifications</td>
              <td colSpan={3} className={headerCls}>Qty.</td>
            </tr>

            {/* ── Product rows (dynamic) ──────────────────────── */}
            {items.map((item, i) => (
              <tr key={i}>
                <td colSpan={1} className={cn(valueCls, "text-center font-medium text-slate-500")}>
                  {i + 1}
                </td>
                {editMode && !isTemplate ? (
                  <>
                    <td colSpan={3} className={valueCls}>
                      <input className={inputCls} value={item.product_name} placeholder="Product name"
                        onChange={e => updateItem(i, "product_name", e.target.value)} />
                    </td>
                    <td colSpan={7} className={valueCls}>
                      <input className={inputCls} value={item.specifications} placeholder="Specifications"
                        onChange={e => updateItem(i, "specifications", e.target.value)} />
                    </td>
                    <td colSpan={3} className={valueCls}>
                      <div className="flex items-center gap-1">
                        <input className={inputCls} value={item.qty} placeholder="Qty"
                          onChange={e => updateItem(i, "qty", e.target.value)} />
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)}
                            className="shrink-0 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                            title="Remove row">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td colSpan={3} className={cn(emptyValueCls)}>{item.product_name}</td>
                    <td colSpan={7} className={cn(emptyValueCls)}>{item.specifications}</td>
                    <td colSpan={3} className={cn(emptyValueCls)}>{item.qty}</td>
                  </>
                )}
              </tr>
            ))}

            {/* ── Add Row button (edit mode only) ──────────────── */}
            {editMode && !isTemplate && (
              <tr>
                <td colSpan={14} className="border border-slate-300 dark:border-slate-600">
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors w-full justify-center">
                    <Plus className="w-3.5 h-3.5" />
                    Add Product Row
                  </button>
                </td>
              </tr>
            )}

            {/* ── Row: Requirement Of Test Certificate ──── */}
            <tr>
              <LabelCell text="Requirement Of Test Certificate" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "test_certificate_required")}
                    onChange={e => onChange?.("test_certificate_required", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "test_certificate_required") || (isTemplate ? "Yes / No" : "")}
                </td>
              )}
            </tr>

            {/* ── Row: Delivery Schedule (date picker) ──── */}
            <tr>
              <LabelCell text="Delivery Schedule" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <DateOrTextCell field="delivery_schedule" colSpan={7} defaultToday={editMode && !isTemplate} placeholder="Date or text" />
            </tr>

            {/* ── Row: Statutory And Regulatory ──────────── */}
            <tr>
              <LabelCell text="Statutory And Regulatory Requirements, If Any" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "complies")}
                    onChange={e => onChange?.("complies", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Complies">Complies</option>
                    <option value="Does Not Comply">Does Not Comply</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "complies") || (isTemplate ? "Complies / Does Not Complies" : "")}
                </td>
              )}
            </tr>

            {/* ── Row: Order decision ──────────────────────── */}
            <tr>
              <LabelCell text="Order" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "order_status")}
                    onChange={e => onChange?.("order_status", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "order_status") || (isTemplate ? "–  Accepted  –  Rejected" : "")}
                </td>
              )}
            </tr>

            {/* ── Row: Remarks + Reviewed By ───────────────── */}
            <tr>
              <LabelCell text="Remarks" colSpan={8} />
              <LabelCell text="Reviewed By / Authorised Person" colSpan={6} />
            </tr>
            <tr>
              {editMode && !isTemplate ? (
                <td colSpan={8} className={cn(valueCls, "min-h-[3rem]")}>
                  <textarea className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 resize-none"
                    value={val(d, "remarks")} placeholder="Remarks"
                    rows={2} onChange={e => onChange?.("remarks", e.target.value)} />
                </td>
              ) : (
                <td colSpan={8} className={cn(emptyValueCls, "min-h-[3rem]")}>
                  {val(d, "remarks")}
                </td>
              )}
              <Cell field="reviewed_by" colSpan={6} placeholder="Authorised person name" />
            </tr>

            {/* ── Row: Bill No. (auto from serial, editable) ──── */}
            <tr>
              <LabelCell text="Bill No." colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="bill_no" colSpan={3} placeholder={serialValue || "Auto-generated"} />
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>

            {/* ── Row: Despatch Date (default today, editable) ── */}
            <tr>
              <LabelCell text="Despatch Date" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <DateOrTextCell field="despatch_date" colSpan={3} defaultToday={editMode && !isTemplate} placeholder="DD/MM/YYYY or text" />
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      {!isTemplate && serialValue && (
        <div className="text-center text-xs text-slate-400 mt-4">
          QMS Forge · {serialValue}
        </div>
      )}
    </div>
  );
}

export default F08Template;