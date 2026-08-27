// ============================================================================
// F/45 — Master List of Documents
// DOCX: 1 table, 19 rows × 28 columns
// R0: Title merged 0-22, cols 23-27 = "F/45 Rev No. {serial}"
// R1: "Last Updated by" merged 0-27
// R2: "Update Date" merged 0-27
// R3: Headers: Sr. | Title of Document | Document Number (3) | Current Revision |
//        Revision Date | Revision Details (4) | Distributed To (17 persons)
// R4: Sub-headers for Distribution cols
// R5-R18: 14 data rows
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F45Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface DocRow {
  sr: string;
  title: string;
  doc_number: string;
  doc_number2: string;
  doc_number3: string;
  current_revision: string;
  revision_date: string;
  revision_details: string;
  revision_details2: string;
  revision_details3: string;
  revision_details4: string;
  dist_1: string;
  dist_2: string;
  dist_3: string;
  dist_4: string;
  dist_5: string;
  dist_6: string;
  dist_7: string;
  dist_8: string;
  dist_9: string;
  dist_10: string;
  dist_11: string;
  dist_12: string;
  dist_13: string;
  dist_14: string;
  dist_15: string;
  dist_16: string;
  dist_17: string;
}

const TOTAL_COLS = 28;

const DOC_COL_HEADERS: string[] = [
  "Sr.", "Title of Document", "Document Number", "", "",
  "Current Revision", "Revision Date", "Revision Details", "", "", "",
];

const DIST_PERSON_HEADERS = Array.from({ length: 17 }, (_, i) => `Person ${i + 1}`);

function parseDocs(d: Record<string, unknown>): DocRow[] {
  const raw = d.documents || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw as DocRow[];
  }
  return Array.from({ length: 14 }, () => ({
    sr: "", title: "", doc_number: "", doc_number2: "", doc_number3: "",
    current_revision: "", revision_date: "",
    revision_details: "", revision_details2: "", revision_details3: "", revision_details4: "",
    dist_1: "", dist_2: "", dist_3: "", dist_4: "", dist_5: "", dist_6: "", dist_7: "",
    dist_8: "", dist_9: "", dist_10: "", dist_11: "", dist_12: "", dist_13: "", dist_14: "",
    dist_15: "", dist_16: "", dist_17: "",
  }));
}

function makeEmptyRow(): DocRow {
  return {
    sr: "", title: "", doc_number: "", doc_number2: "", doc_number3: "",
    current_revision: "", revision_date: "",
    revision_details: "", revision_details2: "", revision_details3: "", revision_details4: "",
    dist_1: "", dist_2: "", dist_3: "", dist_4: "", dist_5: "", dist_6: "", dist_7: "",
    dist_8: "", dist_9: "", dist_10: "", dist_11: "", dist_12: "", dist_13: "", dist_14: "",
    dist_15: "", dist_16: "", dist_17: "",
  };
}

const DOC_COL_KEYS: (keyof DocRow)[] = [
  "sr", "title", "doc_number", "doc_number2", "doc_number3",
  "current_revision", "revision_date",
  "revision_details", "revision_details2", "revision_details3", "revision_details4",
  "dist_1", "dist_2", "dist_3", "dist_4", "dist_5", "dist_6", "dist_7",
  "dist_8", "dist_9", "dist_10", "dist_11", "dist_12", "dist_13", "dist_14",
  "dist_15", "dist_16", "dist_17",
];

export function F45Template({ data, isTemplate = true, editMode = false, onChange, className }: F45Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [docRows, setDocRows] = useState<DocRow[]>(() => parseDocs(d));

  const updateRow = useCallback((idx: number, key: keyof DocRow, value: string) => {
    setDocRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    const updated = [...docRows];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange?.("documents", updated);
  }, [docRows, onChange]);

  const addRow = useCallback(() => {
    setDocRows(prev => [...prev, makeEmptyRow()]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setDocRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-[10px] px-0.5", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-0.5 inline-block min-w-[3rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  return (
    <FormDocument formCode="F/45" formName="Master List of Documents" serial={val(d, "serial")} sectionName="Management & Documentation">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-[9px] border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {Array.from({ length: TOTAL_COLS }, (_, i) => (
              <col key={i} style={{ width: i < 6 ? undefined : `${100 / TOTAL_COLS}%` }} />
            ))}
          </colgroup>
          <tbody>
            {/* Row 0: Title merged 0-22, F/45 Rev No in 23-27 */}
            <tr>
              <td
                className="border border-border p-1.5 font-bold text-center text-sm"
                colSpan={23}
              >
                Master List of Documents
              </td>
              <td
                className="border border-border p-1.5 text-center font-semibold text-xs"
                colSpan={5}
              >
                F/45 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>

            {/* Row 1: Last Updated by */}
            <tr>
              <td className="border border-border p-1.5 font-semibold" colSpan={28}>
                Last Updated by: {inp("last_updated_by", "Name", "w-40")}
              </td>
            </tr>

            {/* Row 2: Update Date */}
            <tr>
              <td className="border border-border p-1.5 font-semibold" colSpan={28}>
                Update Date: {inp("update_date", "Date", "w-28")}
              </td>
            </tr>

            {/* Row 3: Main Headers */}
            <tr className="bg-muted/50">
              <td className="border border-border p-1 font-semibold text-center" rowSpan={2}>Sr.</td>
              <td className="border border-border p-1 font-semibold text-center" rowSpan={2}>Title of Document</td>
              <td className="border border-border p-1 font-semibold text-center" colSpan={3}>Document Number</td>
              <td className="border border-border p-1 font-semibold text-center" rowSpan={2}>Current Revision</td>
              <td className="border border-border p-1 font-semibold text-center" rowSpan={2}>Revision Date</td>
              <td className="border border-border p-1 font-semibold text-center" colSpan={4}>Revision Details</td>
              <td className="border border-border p-1 font-semibold text-center" colSpan={17}>Copy of the Control Documents Distributed to:</td>
            </tr>

            {/* Row 4: Sub-headers for Document Number (3 cols), Revision Details (4 cols), Distribution (17 cols) */}
            <tr className="bg-muted/50">
              {Array.from({ length: 3 }, (_, i) => (
                <td key={`dn-${i}`} className="border border-border p-0.5 text-center text-[8px]">
                  {i === 0 ? "Doc#" : ""}
                </td>
              ))}
              {Array.from({ length: 4 }, (_, i) => (
                <td key={`rd-${i}`} className="border border-border p-0.5 text-center text-[8px]">
                  {i === 0 ? "Details" : ""}
                </td>
              ))}
              {DIST_PERSON_HEADERS.map((h, i) => (
                <td key={`dp-${i}`} className="border border-border p-0.5 text-center text-[7px] font-semibold">
                  {h}
                </td>
              ))}
            </tr>

            {/* Rows 5-18: 14 data rows */}
            {docRows.map((row, idx) => (
              <tr key={idx} className="even:bg-muted/20">
                {DOC_COL_KEYS.map((key) => (
                  <td key={key} className="border border-border px-0.5 py-0.5">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent border-b border-dashed border-foreground/30 outline-none text-[9px]"
                        value={row[key] || ""}
                        onChange={(e) => updateRow(idx, key, e.target.value)}
                      />
                    ) : (
                      <span className="text-[9px]">{row[key] || ""}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td className="border border-border px-0.5 py-0.5 text-center" colSpan={0}>
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove row"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
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
          onClick={addRow}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
        >
          <Plus className="h-3 w-3" /> Add Document Entry
        </button>
      )}

      {/* Disclaimer */}
      {val(d, "disclaimer") && (
        <div className="text-[10px] italic text-foreground/60 border-l-2 border-foreground/30 pl-2 py-1 mt-2">
          {val(d, "disclaimer")}
        </div>
      )}

      {/* Footer */}
      <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t mt-2">
        <div>
          <span className="text-foreground/50">Maintained By: </span>
          <span className="font-medium">{val(d, "maintained_by") || (ph ? "Ahmed Khaled" : "")}</span>
        </div>
      </div>
    </FormDocument>
  );
}
