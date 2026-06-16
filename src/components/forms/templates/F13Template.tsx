// ============================================================================
// F/13 — Purchase Order
// DOCX: Complex form with order details, items table, terms, and signatures.
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F13Props {
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

interface ItemRow {
  slNo: string; description: string; quantity: string; unitPrice: string; amount: string;
}

function parseItems(d: Record<string, unknown>, count: number = 5): ItemRow[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as ItemRow[];
  return Array.from({ length: count }, (_, i) => ({
    slNo: String(i + 1), description: "", quantity: "", unitPrice: "", amount: "",
  }));
}

export function F13Template({ data, isTemplate = true, editMode = false, onChange, className }: F13Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [items, setItems] = useState<ItemRow[]>(() => parseItems(d));

  const updateItem = useCallback((idx: number, key: keyof ItemRow, value: string) => {
    setItems(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...items]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [items, onChange]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { slNo: String(prev.length + 1), description: "", quantity: "", unitPrice: "", amount: "" }]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, slNo: String(i + 1) })));
  }, []);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, key: keyof ItemRow, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={items[idx]?.[key] || ""} onChange={e => updateItem(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{items[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      <div className="grid grid-cols-[3fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Purchase Order</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/13 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Purchase Order No. 🡪 {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date", "w-28")}</div>
      </div>

      <div className="border-x border-b border-black text-xs p-1.5">
        To, {inp("to", "Supplier Name / Address")}
      </div>

      <div className="border-x border-b border-black text-xs p-1.5 bg-gray-50 font-semibold">
        We are pleased to place an order for the following items subject to the terms and conditions as mentioned below:
      </div>

      {/* Items table */}
      <div className="grid grid-cols-[40px_2fr_80px_80px_80px] border-x border-b border-black text-[10px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Sr.</div>
        <div className="p-1 border-r border-black">Description</div>
        <div className="p-1 border-r border-black text-center">Qty</div>
        <div className="p-1 border-r border-black text-center">Unit Price</div>
        <div className="p-1 text-center">Amount</div>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[40px_2fr_80px_80px_80px] border-x border-b border-black text-xs relative group min-h-[24px]">
          <div className="p-1 border-r border-black text-center">{idx + 1}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "description", "Item")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "quantity", "Qty")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "unitPrice", "Price")}</div>
          <div className="p-1 text-center">{cellInp(idx, "amount", "Amt")}</div>
          {editMode && items.length > 1 && (
            <button onClick={() => removeItem(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {editMode && (
        <button onClick={addItem} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Item
        </button>
      )}

      {/* Total */}
      <div className="grid grid-cols-[40px_2fr_80px_80px_80px] border-x border-b border-black text-xs font-semibold">
        <div className="p-1 border-r border-black"></div>
        <div className="p-1 border-r border-black text-right">Total:</div>
        <div className="p-1 border-r border-black"></div>
        <div className="p-1 border-r border-black"></div>
        <div className="p-1 text-center">{inp("total_amount", "Total", "w-20")}</div>
      </div>

      {/* Terms */}
      <div className="border-x border-b border-black text-xs">
        <div className="p-1.5 font-semibold bg-gray-50">Terms & Conditions:</div>
        <div className="p-1.5 min-h-[40px]">
          {editMode ? (
            <textarea className="w-full min-h-[40px] bg-transparent text-xs" value={val(d, "terms") || ""} onChange={e => onChange?.("terms", e.target.value)} placeholder="Terms and conditions..." />
          ) : (
            <div className="whitespace-pre-wrap">{val(d, "terms") || (ph ? "___" : "")}</div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-foreground/20 flex justify-between text-xs">
        <div>Ordered By: {inp("ordered_by", "Name", "w-36")}</div>
        <div>Authorised By: {inp("authorised_by", "Name", "w-36")}</div>
      </div>
    </div>
  );
}