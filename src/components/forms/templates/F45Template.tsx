// ============================================================================
// F/45 — Master List of Documents
// DOCX: 1 table, 19 rows, 28 cols. Complex grid layout.
// R0: Title (gs=24) + Rev No (gs=4)
// R1: Last Updated by (gs=2) + Ahmed Khaled (gs=26)
// R2: Update Date (gs=2) + 01/02/2026 (gs=26)
// R3-R4: Column headers: Sr. | Title of Document | Document Number (gs=3) |
//        Current Revision | Revision Date | Revision Details (gs=4) |
//        Copy of the Control Documents Distributed To (gs=16)
// R5-R12: Data rows (8 documents)
// R13: Disclaimer row
// R14-R18: Distribution list
// Canonical: 6-column documents table + distribution list
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export interface F45Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

interface DocRow {
  sr: string;
  title: string;
  doc_number: string;
  current_revision: string;
  revision_date: string;
  revision_details: string;
}

interface DistRow {
  sr: string;
  name: string;
  copy_no: string;
}

function parseDocs(d: Record<string, unknown>): DocRow[] {
  const raw = d.documents || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as DocRow[];
  }
  return [];
}

function parseDist(d: Record<string, unknown>): DistRow[] {
  const raw = d.distribution || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as DistRow[];
  }
  return [];
}

const DOC_COL_HEADERS = [
  "Sr.", "Title of Document", "Document Number",
  "Current Revision", "Revision Date", "Revision Details",
];

const DOC_COL_KEYS: (keyof DocRow)[] = [
  "sr", "title", "doc_number", "current_revision", "revision_date", "revision_details",
];

const DIST_COL_HEADERS = ["Sr.", "Name", "Copy No."];
const DIST_COL_KEYS: (keyof DistRow)[] = ["sr", "name", "copy_no"];

export function F45Template({ data, isTemplate = true, editMode = false, onChange, className }: F45Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [docRows, setDocRows] = useState<DocRow[]>(() => parseDocs(d));
  const [distRows, setDistRows] = useState<DistRow[]>(() => parseDist(d));

  const updateDocRow = useCallback((idx: number, key: keyof DocRow, value: string) => {
    setDocRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...docRows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("documents", updated);
  }, [docRows, onChange]);

  const addDocRow = useCallback(() => {
    setDocRows(prev => [...prev, {
      sr: "", title: "", doc_number: "", current_revision: "", revision_date: "", revision_details: "",
    }]);
  }, []);

  const removeDocRow = useCallback((idx: number) => {
    setDocRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateDistRow = useCallback((idx: number, key: keyof DistRow, value: string) => {
    setDistRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...distRows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("distribution", updated);
  }, [distRows, onChange]);

  const addDistRow = useCallback(() => {
    setDistRows(prev => [...prev, { sr: "", name: "", copy_no: "" }]);
  }, []);

  const removeDistRow = useCallback((idx: number) => {
    setDistRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-xs px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="border-b pb-2 mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Master List of Documents
        </h3>
        <div className="text-xs text-foreground/50">F/45</div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-foreground/50">Serial: </span>
          <span className="font-medium">{val(d, "serial") || (ph ? "F/45-001" : "")}</span>
        </div>
        <div>
          <span className="text-foreground/50">Date: </span>
          <span className="font-medium">{val(d, "date") || (ph ? "01/01/2026" : "")}</span>
        </div>
        <div>
          <span className="text-foreground/50">Last Updated By: </span>
          <span className="font-medium">{val(d, "last_updated_by") || (ph ? "Ahmed Khaled" : "")}</span>
        </div>
        <div>
          <span className="text-foreground/50">Update Date: </span>
          <span className="font-medium">{val(d, "update_date") || (ph ? "01/02/2026" : "")}</span>
        </div>
      </div>

      {/* 6-Column Documents Table */}
      <div className="w-full overflow-x-auto border rounded-md">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {DOC_COL_HEADERS.map((h, i) => (
                <th key={i} className="border px-1.5 py-1 text-left font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
              {editMode && <th className="border px-1.5 py-1 w-8">#</th>}
            </tr>
          </thead>
          <tbody>
            {docRows.map((row, idx) => (
              <tr key={idx} className="even:bg-muted/20">
                {DOC_COL_KEYS.map((key) => (
                  <td key={key} className="border px-1.5 py-0.5">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent border-b border-dashed border-foreground/30 outline-none"
                        value={row[key]}
                        onChange={(e) => updateDocRow(idx, key, e.target.value)}
                      />
                    ) : (
                      <span>{row[key]}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td className="border px-1 py-0.5 text-center">
                    <button
                      onClick={() => removeDocRow(idx)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button
          onClick={addDocRow}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-3 w-3" /> Add Document Entry
        </button>
      )}

      {/* Disclaimer */}
      {val(d, "disclaimer") && (
        <div className="text-[10px] italic text-foreground/60 border-l-2 border-foreground/30 pl-2 py-1">
          {val(d, "disclaimer")}
        </div>
      )}

      {/* Distribution List */}
      {distRows.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold mb-1">Copy of the Control Documents Distributed To</h4>
          <div className="w-full overflow-x-auto border rounded-md">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {DIST_COL_HEADERS.map((h, i) => (
                    <th key={i} className="border px-1.5 py-1 text-left font-semibold">{h}</th>
                  ))}
                  {editMode && <th className="border px-1.5 py-1 w-8">#</th>}
                </tr>
              </thead>
              <tbody>
                {distRows.map((row, idx) => (
                  <tr key={idx} className="even:bg-muted/20">
                    {DIST_COL_KEYS.map((key) => (
                      <td key={key} className="border px-1.5 py-0.5">
                        {editMode ? (
                          <input
                            className="w-full bg-transparent border-b border-dashed border-foreground/30 outline-none"
                            value={row[key]}
                            onChange={(e) => updateDistRow(idx, key, e.target.value)}
                          />
                        ) : (
                          <span>{row[key]}</span>
                        )}
                      </td>
                    ))}
                    {editMode && (
                      <td className="border px-1 py-0.5 text-center">
                        <button
                          onClick={() => removeDistRow(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editMode && (
            <button
              onClick={addDistRow}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              <Plus className="h-3 w-3" /> Add Distribution Entry
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t">
        <div>
          <span className="text-foreground/50">Maintained By: </span>
          <span className="font-medium">{val(d, "maintained_by") || (ph ? "Ahmed Khaled" : "")}</span>
        </div>
      </div>
    </div>
  );
}
