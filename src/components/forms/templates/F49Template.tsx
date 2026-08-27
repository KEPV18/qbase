// ============================================================================
// F/49 — Document Master List
// DOCX: Horizontal table with document metadata
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";

export interface F49Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

export function F49Template({ data, isTemplate = true, editMode = false, onChange, className }: F49Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const items = val(d, "items") as Array<Record<string, unknown>> || [];

  return (
    <FormDocument formCode="F/49" formName="Document Master List" serial={val(d, "serial")} sectionName="Document Control & Records">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>DATE: {inp("date", "Date", "w-32")}</div>
        <div>SERIAL: {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}</div>
      </div>

      {/* Documents Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border border-border p-2 font-semibold text-center">Sr. No.</th>
              <th className="border border-border p-2 font-semibold text-center">Doc Code</th>
              <th className="border border-border p-2 font-semibold text-center">Document Name</th>
              <th className="border border-border p-2 font-semibold text-center">Revision</th>
              <th className="border border-border p-2 font-semibold text-center">Effective Date</th>
              <th className="border border-border p-2 font-semibold text-center">Status</th>
              <th className="border border-border p-2 font-semibold text-center">Owner</th>
              <th className="border border-border p-2 font-semibold text-center">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="border border-border p-2 text-center">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none text-center"
                        value={String(item.srNo ?? idx + 1)}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], srNo: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.srNo ?? idx + 1)
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none"
                        value={String(item.doc_code ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], doc_code: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.doc_code ?? "")
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none"
                        value={String(item.doc_name ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], doc_name: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.doc_name ?? "")
                    )}
                  </td>
                  <td className="border border-border p-2 text-center">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none text-center"
                        value={String(item.revision ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], revision: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.revision ?? "")
                    )}
                  </td>
                  <td className="border border-border p-2 text-center">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none text-center"
                        value={String(item.effective_date ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], effective_date: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.effective_date ?? "")
                    )}
                  </td>
                  <td className="border border-border p-2 text-center">
                    {editMode ? (
                      <select
                        className="w-full bg-transparent text-sm"
                        value={String(item.status ?? "Active")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], status: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      >
                        <option value="Active">Active</option>
                        <option value="Obsolete">Obsolete</option>
                        <option value="Under Review">Under Review</option>
                      </select>
                    ) : (
                      String(item.status ?? "Active")
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none"
                        value={String(item.owner ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], owner: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.owner ?? "")
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {editMode ? (
                      <input
                        className="w-full bg-transparent text-sm border-none outline-none"
                        value={String(item.location ?? "")}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], location: e.target.value };
                          onChange?.("items", newItems);
                        }}
                      />
                    ) : (
                      String(item.location ?? "")
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-border p-2" colSpan={8} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Signature footer */}
      <div className="grid grid-cols-2 gap-4 border-t border-border mt-4 pt-4">
        <div>PREPARED BY: {inp("prepared_by", "Prepared By", "w-full")}</div>
        <div>APPROVED BY: {inp("approved_by", "Approved By", "w-full")}</div>
      </div>
    </FormDocument>
  );
}