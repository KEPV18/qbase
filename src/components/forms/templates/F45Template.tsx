// ============================================================================
// F/45 — Master List of Documents
// Nearly identical to F/23 (Master List of Records) but for documents.
// Columns: Doc No | Title | Format No | Issue No | Issue Date | Department | Access | Storage | Retention | Person Responsible
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F45Props {
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
  docNo: string; title: string; formatNo: string; issueNo: string;
  issueDate: string; department: string; access: string;
  storagePlace: string; retentionPeriod: string; personResponsible: string;
}

function parseRows(d: Record<string, unknown>, count: number = 8): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as RowData[];
  return Array.from({ length: count }, () => ({
    docNo: "", title: "", formatNo: "", issueNo: "", issueDate: "",
    department: "", access: "", storagePlace: "", retentionPeriod: "", personResponsible: "",
  }));
}

export function F45Template({ data, isTemplate = true, editMode = false, onChange, className }: F45Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
    const updated = [...rows]; updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("items", JSON.stringify(updated));
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { docNo: "", title: "", formatNo: "", issueNo: "", issueDate: "", department: "", access: "", storagePlace: "", retentionPeriod: "", personResponsible: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const cellInp = (idx: number, key: keyof RowData, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={rows[idx]?.[key] || ""} onChange={e => updateRow(idx, key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-xs">{rows[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Master List of Documents</div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/45 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* Department / Date */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-black text-xs">
        <div className="p-1.5 border-r border-black">Department 🡪 {inp("department", "Department")}</div>
        <div className="p-1.5">Date 🡪 {inp("date", "Date")}</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[50px_1.5fr_60px_50px_70px_70px_50px_70px_60px_80px] border-x border-b border-black text-[9px] font-semibold bg-gray-100">
        <div className="p-1 border-r border-black text-center">Doc No.</div>
        <div className="p-1 border-r border-black">Title</div>
        <div className="p-1 border-r border-black">Format</div>
        <div className="p-1 border-r border-black">Issue</div>
        <div className="p-1 border-r border-black">Issue Date</div>
        <div className="p-1 border-r border-black">Department</div>
        <div className="p-1 border-r border-black">Access</div>
        <div className="p-1 border-r border-black">Storage</div>
        <div className="p-1 border-r border-black">Retention</div>
        <div className="p-1">Person Resp.</div>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[50px_1.5fr_60px_50px_70px_70px_50px_70px_60px_80px] border-x border-b border-black text-xs relative group min-h-[28px]">
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "docNo", "F/XX")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "title", "Title")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "formatNo", "")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "issueNo", "")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "issueDate", "")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "department", "")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "access", "")}</div>
          <div className="p-1 border-r border-black">{cellInp(idx, "storagePlace", "")}</div>
          <div className="p-1 border-r border-black text-center">{cellInp(idx, "retentionPeriod", "")}</div>
          <div className="p-1">{cellInp(idx, "personResponsible", "")}</div>
          {editMode && rows.length > 1 && (
            <button onClick={() => removeRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {editMode && (
        <button onClick={addRow} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* Authorised Signature */}
      <div className="mt-4 pt-2 border-t border-foreground/20 flex justify-end text-xs">
        <div>Authorised Signature - Functional Head: {inp("authorised_signature", "Sign")}</div>
      </div>
    </div>
  );
}