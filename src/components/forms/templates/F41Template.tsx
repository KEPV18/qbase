// ============================================================================
// F/41 — Competence Gap Analyses Form (COMPLETE DOCX-Faithful Rebuild)
// Same structure as F/40 but shows AVAILABLE qualifications/experience/skill
// and TRAINING GOT (not required)
// Header: Competence Gap Analyses / Reviewed By / Reviewed On / Rev No.
// Main table: Sr.No | Name&Designation(3) | Qual Avail(2) | Exp Avail(2) | Skill Avail(2) | Training Got(15)
// Bottom: Training Status legend + Type of Training Given (3× Sr.No|TopicNo)
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";
import { Plus, Trash2 } from "lucide-react";

export interface F41Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

interface RowData {
  srNo: string;
  name: string;
  designation: string;
  qualAvail: string;
  expAvail: string;
  skillAvail: string;
  training: string[]; // length 15
}

function emptyRow(i: number): RowData {
  return {
    srNo: String(i + 1), name: "", designation: "",
    qualAvail: "", expAvail: "", skillAvail: "",
    training: Array.from({ length: 15 }, () => ""),
  };
}

function parseRows(d: Record<string, unknown>, count: number = 8): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw.map((r: Record<string, unknown>, i: number) => ({
      srNo: String(r.srNo || i + 1),
      name: String(r.name || ""),
      designation: String(r.designation || ""),
      qualAvail: String(r.qualAvail || r.qualification || ""),
      expAvail: String(r.expAvail || r.experience || ""),
      skillAvail: String(r.skillAvail || r.skill || ""),
      training: Array.from({ length: 15 }, (_, j) => String(r[`training${j + 1}`] || "")),
    }));
  }
  return Array.from({ length: count }, (_, i) => emptyRow(i));
}

interface TopicEntry { srNo: string; topicNo: string; }
function parseTopics(d: Record<string, unknown>): TopicEntry[] {
  const raw = d.training_given || [];
  if (Array.isArray(raw) && raw.length > 0) return raw as TopicEntry[];
  return Array.from({ length: 9 }, (_, i) => ({ srNo: "", topicNo: "" }));
}

interface TopicDef { code: string; name: string; }
function parseTopicDefs(d: Record<string, unknown>): TopicDef[] {
  const raw = d.training_topics || [];
  if (Array.isArray(raw) && raw.length > 0) return raw as TopicDef[];
  return [];
}

export function F41Template({ data, isTemplate = true, editMode = false, onChange, className }: F41Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [rows, setRows] = useState<RowData[]>(() => parseRows(d));
  const [topics, setTopics] = useState<TopicEntry[]>(() => parseTopics(d));
  const topicDefs = parseTopicDefs(d);

  const updateRow = useCallback((idx: number, key: keyof RowData, value: string) => {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
  }, []);

  const updateTraining = useCallback((idx: number, tIdx: number, value: string) => {
    setRows(prev => {
      const next = [...prev];
      const training = [...next[idx].training];
      training[tIdx] = value;
      next[idx] = { ...next[idx], training };
      return next;
    });
  }, []);

  const cellInp = (idx: number, key: keyof RowData, _label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none"
        value={String(rows[idx]?.[key] || "")} onChange={e => updateRow(idx, key, e.target.value)} />
    ) : (
      <span className="text-[10px]">{String(rows[idx]?.[key] || "")}</span>
    );

  const tInp = (idx: number, tIdx: number) =>
    editMode ? (
      <input className="w-full bg-transparent text-[9px] px-0.5 border-none outline-none text-center"
        value={rows[idx]?.training[tIdx] || ""} onChange={e => updateTraining(idx, tIdx, e.target.value)} />
    ) : (
      <span className="text-[9px] text-center inline-block w-full">{rows[idx]?.training[tIdx] || ""}</span>
    );

  const th = "border border-border p-1 text-[9px] font-semibold bg-muted text-center";

  const colSize = Math.ceil(topics.length / 3);
  const topicCols = [topics.slice(0, colSize), topics.slice(colSize, colSize * 2), topics.slice(colSize * 2)];

  const mobileView = (
    <div className="md:hidden space-y-2 text-xs p-2">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-border rounded p-2 space-y-1">
          <div className="font-semibold">#{idx + 1} — {row.name || "—"} / {row.designation || "—"}</div>
          <div>Qual Avail: {row.qualAvail || "—"}</div>
          <div>Exp Avail: {row.expAvail || "—"}</div>
          <div>Skill Avail: {row.skillAvail || "—"}</div>
          <div className="text-[9px] text-muted-foreground">Training Got: {row.training.filter(Boolean).length}/15</div>
        </div>
      ))}
    </div>
  );

  return (
    <FormDocument formCode="F/41" formName="Competence Gap Analyses Form" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Header block ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Competence Gap Analyses Form</td>
              <td className="border border-border p-2 bg-primary/5 text-xs whitespace-nowrap">
                <span className="font-semibold">Reviewed By:</span> {val(d, "reviewed_by") || (ph ? "Operations Manager" : "—")}
              </td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap font-semibold">
                F/41 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Competence Gap Analyses Form</td>
              <td className="border border-border p-2 bg-primary/5 text-xs whitespace-nowrap">
                <span className="font-semibold">Reviewed On:</span> {val(d, "reviewed_on") || (ph ? "31/01/2026" : "—")}
              </td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap font-semibold">
                F/41 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {mobileView}

      {/* ── Main matrix table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] hidden md:table">
          <thead>
            <tr className="bg-muted">
              <th className={th} rowSpan={2}>Sr.<br />No.</th>
              <th className={th} colSpan={3}>Name &amp; Designation</th>
              <th className={th} colSpan={2}>Qualification<br />Available</th>
              <th className={th} colSpan={2}>Experience<br />Available</th>
              <th className={th} colSpan={2}>Skill<br />Available</th>
              <th className={cn(th, "text-center")} colSpan={15}>Type of Training Got</th>
              {editMode && <th className={cn(th, "w-[24px]")} rowSpan={2}></th>}
            </tr>
            <tr className="bg-muted">
              <th className={th}>Name</th><th className={th}>Designation</th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th>
              <th className={th}>Avail.</th><th className={th}></th>
              {Array.from({ length: 15 }, (_, i) => (
                <th key={i} className={th}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="group hover:bg-muted/50">
                <td className="border border-border p-0.5 text-center text-[10px]">{idx + 1}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "name", "Name")}</td>
                <td className="border border-border p-0.5">{cellInp(idx, "designation", "Designation")}</td>
                <td className="border border-border p-0.5"></td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "qualAvail", "")}</td>
                <td className="border border-border p-0.5"></td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expAvail", "")}</td>
                <td className="border border-border p-0.5"></td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillAvail", "")}</td>
                <td className="border border-border p-0.5"></td>
                {Array.from({ length: 15 }, (_, tIdx) => (
                  <td key={tIdx} className="border border-border p-0 text-center">{tInp(idx, tIdx)}</td>
                ))}
                {editMode && (
                  <td className="border border-border p-0.5 text-center">
                    {rows.length > 1 && (
                      <button onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button onClick={() => setRows(prev => [...prev, emptyRow(prev.length)])} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline mx-auto">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      )}

      {/* ── Training Status Legend ── */}
      <div className="border border-border mt-1 p-3 bg-muted/30 rounded-sm">
        <div className="text-[10px] font-bold mb-2 text-foreground">Training Status</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 text-center font-bold text-foreground">✔</span>
            <span>Training Is required</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 text-center font-bold text-foreground">✔</span>
            <span>Training Is Given <span className="font-bold text-foreground">✔</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 text-center font-bold text-foreground">✔</span>
            <span>Training Is Effective <span className="font-bold text-foreground">✔</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 text-center border border-border rounded-sm">&nbsp;</span>
            <span>Training Not Required</span>
          </div>
        </div>
      </div>

      {/* ── Type of Training Given ── */}
      <div className="border border-border mt-1 rounded-sm overflow-hidden">
        <div className="bg-muted px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Type Of Training Given</span>
          <span className="text-[10px] text-muted-foreground">
            Reviewed By : <span className="font-semibold text-foreground">{val(d, "reviewed_by") || (ph ? "Ahmed Khaled" : "—")}</span>
          </span>
        </div>

        {topicDefs.length > 0 && (
          <div className="border-t border-border p-2 bg-primary/5">
            <div className="text-[9px] font-semibold mb-1 text-foreground">Training Topics:</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px]">
              {topicDefs.map((t, i) => (
                <span key={i} className="text-muted-foreground">
                  <span className="font-bold text-foreground">{t.code}</span> → {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Sr. No.</th>
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Topic No.</th>
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Sr. No.</th>
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Topic No.</th>
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Sr. No.</th>
                <th className="border border-border p-1 text-[9px] font-semibold text-center w-1/6">Topic No.</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(colSize, 3) }, (_, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/30">
                  {topicCols.map((col, colIdx) => (
                    <React.Fragment key={colIdx}>
                      <td className="border border-border p-1 text-center text-[10px]">
                        {editMode ? (
                          <input className="w-full bg-transparent text-[10px] text-center border-none outline-none"
                            value={col[rowIdx]?.srNo || ""} onChange={e => {
                              const absIdx = colIdx * colSize + rowIdx;
                              setTopics(prev => {
                                const next = [...prev];
                                while (next.length <= absIdx) next.push({ srNo: "", topicNo: "" });
                                next[absIdx] = { ...next[absIdx], srNo: e.target.value };
                                return next;
                              });
                            }} />
                        ) : (col[rowIdx]?.srNo || "")}
                      </td>
                      <td className="border border-border p-1 text-center text-[10px]">
                        {editMode ? (
                          <input className="w-full bg-transparent text-[10px] text-center border-none outline-none"
                            value={col[rowIdx]?.topicNo || ""} onChange={e => {
                              const absIdx = colIdx * colSize + rowIdx;
                              setTopics(prev => {
                                const next = [...prev];
                                while (next.length <= absIdx) next.push({ srNo: "", topicNo: "" });
                                next[absIdx] = { ...next[absIdx], topicNo: e.target.value };
                                return next;
                              });
                            }} />
                        ) : (col[rowIdx]?.topicNo || "")}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature */}
      <div className="border border-t-2 border-border text-xs mt-1 p-2 flex justify-between">
        <span>Authorised By: <strong>{val(d, "authorised_by") || (ph ? "___" : "—")}</strong></span>
        <span>Prepared By: <strong>{val(d, "prepared_by") || (ph ? "___" : "—")}</strong></span>
      </div>
    </FormDocument>
  );
}