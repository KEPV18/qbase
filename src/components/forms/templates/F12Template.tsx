// ============================================================================
// F/12 — Disposal of Non-Conforming Products
// 13-column table matching Word document structure exactly.
// Keys: serial | date | month | items[]
//   items: sr_no | date | stage | product_name | id_no | reason | qty
//        | disposal_action | re_inspection | qty_ok | authorised_sign
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument } from "../FormKit";

export interface F12Props {
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

interface RowData {
  sr_no: string;
  date: string;
  stage: string;
  product_name: string;
  id_no: string;
  reason: string;
  qty: string;
  disposal_action: string;
  re_inspection: string;
  qty_ok: string;
  authorised_sign: string;
}

const EMPTY_ROW: RowData = {
  sr_no: "1",
  date: "",
  stage: "",
  product_name: "",
  id_no: "",
  reason: "",
  qty: "",
  disposal_action: "",
  re_inspection: "",
  qty_ok: "",
  authorised_sign: "",
};

function parseRows(d: Record<string, unknown>): RowData[] {
  const raw = d.items || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as RowData[];
  }
  return [{ ...EMPTY_ROW }];
}

export function F12Template({
  data,
  isTemplate = true,
  editMode = false,
  onChange,
  className,
}: F12Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback(
    (idx: number, key: keyof RowData, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: value };
        return next;
      });
      const updated = [...rows];
      updated[idx] = { ...updated[idx], [key]: value };
      onChange?.("items", JSON.stringify(updated));
    },
    [rows, onChange]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { ...EMPTY_ROW, sr_no: String(prev.length + 1) },
    ]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((r, i) => ({ ...r, sr_no: String(i + 1) }))
    );
  }, []);

  const inp = (key: string, label: string, width: string = "w-36") =>
    editMode ? (
      <input
        className={cn(
          "border-b border-dashed border-foreground/40 bg-transparent text-xs px-1",
          width
        )}
        value={val(d, key)}
        onChange={(e) => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span
        className={cn(
          "border-b border-dashed border-foreground/30 px-1 inline-block",
          width
        )}
      >
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-xs px-1 border-none outline-none"
        value={rows[idx]?.[key] || ""}
        onChange={(e) => updateRow(idx, key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  const serial = val(d, "serial") || (ph ? "{{SERIAL}}" : "—");

  return (
    <FormDocument
      formCode="F/12"
      formName="Disposal of Non-Conforming Products"
      serial={serial}
      sectionName="Quality & Audit"
    >
      {/* 13-column table: exact Word document structure */}
      <table className="w-full border-collapse border border-border text-xs">
        <thead>
          {/* Row 0: Title | Sr. No → serial | F/12 Rev No. */}
          <tr className="bg-primary/5">
            <th
              colSpan={6}
              className="border border-border p-2 font-bold text-left text-sm"
            >
              Disposal of Non-Conforming Products
            </th>
            <th
              colSpan={4}
              className="border border-border p-2 text-left"
            >
              Sr. No. 🡪 {serial}
            </th>
            <th
              colSpan={3}
              className="border border-border p-2 text-center whitespace-pre-line"
            >
              {"F/12\nRev No."}{serial}
            </th>
          </tr>
          {/* Row 1: Title repeated | Month → | F/12 Rev No. */}
          <tr className="bg-primary/5">
            <th
              colSpan={6}
              className="border border-border p-2 font-bold text-left text-sm"
            >
              Disposal of Non-Conforming Products
            </th>
            <th
              colSpan={4}
              className="border border-border p-2 text-left"
            >
              Month 🡪 {inp("month", "Month")}
            </th>
            <th
              colSpan={3}
              className="border border-border p-2 text-center whitespace-pre-line"
            >
              {"F/12\nRev No."}{serial}
            </th>
          </tr>
          {/* Row 2: Column headers */}
          <tr className="bg-muted font-semibold text-[10px]">
            <th className="border border-border p-1 text-center w-[30px]">
              Sr. No
            </th>
            <th className="border border-border p-1 text-center w-[65px]">
              Date
            </th>
            <th className="border border-border p-1 text-center w-[60px]">
              Stage
            </th>
            <th className="border border-border p-1 text-left">
              Name of Product
            </th>
            <th className="border border-border p-1 text-center w-[60px]">
              Id. No.
            </th>
            <th
              colSpan={2}
              className="border border-border p-1 text-left"
            >
              Reason for Nonconformity
            </th>
            <th className="border border-border p-1 text-center w-[45px]">
              Qty.
            </th>
            <th className="border border-border p-1 text-left">
              Disposal Action Taken
            </th>
            <th
              colSpan={2}
              className="border border-border p-1 text-center"
            >
              Re-Inspection, If Any
            </th>
            <th className="border border-border p-1 text-center w-[45px]">
              Qty. OK
            </th>
            <th className="border border-border p-1 text-center w-[70px]">
              Sign. Of Authorised Person.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={
                idx % 2 === 0
                  ? "bg-background dark:bg-[#1e1d1a]"
                  : "bg-muted/30"
              }
            >
              <td className="border border-border p-1 text-center text-muted-foreground">
                {idx + 1}
              </td>
              <td className="border border-border p-1">
                {cellInp(idx, "date", "Date")}
              </td>
              <td className="border border-border p-1">
                {cellInp(idx, "stage", "Stage")}
              </td>
              <td className="border border-border p-1">
                {cellInp(idx, "product_name", "Product")}
              </td>
              <td className="border border-border p-1 text-center">
                {cellInp(idx, "id_no", "ID No")}
              </td>
              <td
                colSpan={2}
                className="border border-border p-1"
              >
                {cellInp(idx, "reason", "Reason")}
              </td>
              <td className="border border-border p-1 text-center">
                {cellInp(idx, "qty", "Qty")}
              </td>
              <td className="border border-border p-1">
                {cellInp(idx, "disposal_action", "Action")}
              </td>
              <td
                colSpan={2}
                className="border border-border p-1 text-center"
              >
                {cellInp(idx, "re_inspection", "Re-Insp")}
              </td>
              <td className="border border-border p-1 text-center">
                {cellInp(idx, "qty_ok", "OK")}
              </td>
              <td className="border border-border p-1 text-center">
                {editMode ? (
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-destructive hover:text-destructive/80"
                    title="Remove row"
                  >
                    <Trash2 className="w-3 h-3 inline" />
                  </button>
                ) : (
                  cellInp(idx, "authorised_sign", "Sign")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editMode && (
        <button
          onClick={addRow}
          className="w-full border-x border-b border-border py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Authorised Signature footer */}
      <div className="border-x border-b border-border p-2 text-xs flex justify-end">
        <span className="font-semibold mr-2">
          Authorised Signature - Functional Head:
        </span>
        <span className="border-b border-dashed border-foreground/30 px-2">
          {val(d, "authorised_signature") || (ph ? "_____________" : "")}
        </span>
      </div>
    </FormDocument>
  );
}
