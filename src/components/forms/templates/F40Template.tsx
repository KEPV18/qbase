// ============================================================================
// F/40 — Competence Matrix (COMPLETE DOCX-Faithful Rebuild)
// Header: Competence Matrix / Reviewed By / Reviewed On / Rev No.
// Main table: Sr.No | Designation(3) | Qual Req/Avail(2) | Exp Req/Avail(2) | Skill Req/Avail(2) | Training(15)
// Bottom: Training Status legend + Type of Training Given (3× Sr.No|TopicNo)
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FormDocument, val } from "../FormKit";
import { Plus, Trash2 } from "lucide-react";

export interface F40Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

// 28 cols: Sr(1) + Designation(3) + QualReq(1) + QualAvail(1) + ExpReq(1) + ExpAvail(1) + SkillReq(1) + SkillAvail(1) + Training(15) + Note(3)
// Simplified: Sr(1) + Designation(3) + Qual(2) + Exp(2) + Skill(2) + Training(15) = 26
interface RowData {
  srNo: string;
  designation: string;
  qualReq: string;
  qualAvail: string;
  expReq: string;
  expAvail: string;
  skillReq: string;
  skillAvail: string;
  training: string[]; // length 15
}

function emptyRow(i: number): RowData {
  return {
    srNo: String(i + 1), designation: "",
    qualReq: "", qualAvail: "",
    expReq: "", expAvail: "",
    skillReq: "", skillAvail: "",
    training: Array.from({ length: 15 }, () => ""),
  };
}

function parseRows(d: Record<string, unknown>, count: number = 8): RowData[] {
  const raw = d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw.map((r: Record<string, unknown>, i: number) => ({
      srNo: String(r.srNo || i + 1),
      designation: String(r.designation || ""),
      qualReq: String(r.qualReq || ""),
      qualAvail: String(r.qualAvail || ""),
      expReq: String(r.expReq || ""),
      expAvail: String(r.expAvail || ""),
      skillReq: String(r.skillReq || ""),
      skillAvail: String(r.skillAvail || ""),
      training: Array.from({ length: 15 }, (_, j) => String(r[`training${j + 1}`] || "")),
    }));
  }
  return Array.from({ length: count }, (_, i) => emptyRow(i));
}

// Training topics
interface TopicEntry { srNo: string; topicNo: string; }
function parseTopics(d: Record<string, unknown>): TopicEntry[] {
  const raw = d.training_given || [];
  if (Array.isArray(raw) && raw.length > 0) return raw as TopicEntry[];
  return Array.from({ length: 9 }, (_, i) => ({ srNo: "", topicNo: "" }));
}

// Topic definitions
interface TopicDef { code: string; name: string; }
function parseTopicDefs(d: Record<string, unknown>): TopicDef[] {
  const raw = d.training_topics || [];
  if (Array.isArray(raw) && raw.length > 0) return raw as TopicDef[];
  return [];
}

export function F40Template({ data, isTemplate = true, editMode = false, onChange, className }: F40Props) {
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

  const updateTopic = useCallback((idx: number, key: keyof TopicEntry, value: string) => {
    setTopics(prev => { const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next; });
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

  // Split topics into 3 columns for the bottom table
  const colSize = Math.ceil(topics.length / 3);
  const topicCols = [topics.slice(0, colSize), topics.slice(colSize, colSize * 2), topics.slice(colSize * 2)];

  // ── Mobile fallback ──
  const mobileView = (
    <div className="md:hidden space-y-2 text-xs p-2">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-border rounded p-2 space-y-1">
          <div className="font-semibold">#{idx + 1} — {row.designation || "—"}</div>
          <div>Qual: {row.qualReq || "—"} / {row.qualAvail || "—"}</div>
          <div>Exp: {row.expReq || "—"} / {row.expAvail || "—"}</div>
          <div>Skill: {row.skillReq || "—"} / {row.skillAvail || "—"}</div>
          <div className="text-[9px] text-muted-foreground">Training: {row.training.filter(Boolean).length}/15</div>
        </div>
      ))}
    </div>
  );

  return (
    <FormDocument formCode="F/40" formName="Competence Matrix" serial={val(d, "serial")} sectionName="HR & Training">
      {/* ── Header block ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Competence Matrix</td>
              <td className="border border-border p-2 bg-primary/5 text-xs whitespace-nowrap">
                <span className="font-semibold">Reviewed By:</span> {val(d, "reviewed_by") || (ph ? "Operations Manager" : "—")}
              </td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap font-semibold">
                F/40 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 font-bold bg-primary/5 text-sm whitespace-nowrap">Competence Matrix</td>
              <td className="border border-border p-2 bg-primary/5 text-xs whitespace-nowrap">
                <span className="font-semibold">Reviewed On:</span> {val(d, "reviewed_on") || (ph ? "31/01/2026" : "—")}
              </td>
              <td className="border border-border p-2 bg-primary/5 text-right text-xs whitespace-nowrap font-semibold">
                F/40 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile fallback */}
      {mobileView}

      {/* ── Main matrix table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] hidden md:table">
          <thead>
            {/* Main headers */}
            <tr className="bg-muted">
              <th className={th} rowSpan={2}>Sr.<br />No.</th>
              <th className={th} colSpan={3}>Designation</th>
              <th className={th} colSpan={2}>Qualification<br />Required</th>
              <th className={th} colSpan={2}>Experience<br />Required</th>
              <th className={th} colSpan={2}>Skill<br />Required</th>
              <th className={cn(th, "text-center")} colSpan={15}>Type of Training Required</th>
              {editMode && <th className={cn(th, "w-[24px]")} rowSpan={2}></th>}
            </tr>
            {/* Sub-headers for training columns */}
            <tr className="bg-muted">
              <th className={th}></th><th className={th}></th><th className={th}></th>
              <th className={th}>Req.</th><th className={th}>Avail.</th>
              <th className={th}>Req.</th><th className={th}>Avail.</th>
              <th className={th}>Req.</th><th className={th}>Avail.</th>
              {Array.from({ length: 15 }, (_, i) => (
                <th key={i} className={th}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="group hover:bg-muted/50">
                <td className="border border-border p-0.5 text-center text-[10px]">{idx + 1}</td>
                {/* Designation: 3 cols */}
                <td colSpan={3} className="border border-border p-0.5">{cellInp(idx, "designation", "")}</td>
                {/* Qualification: 2 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "qualReq", "")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "qualAvail", "")}</td>
                {/* Experience: 2 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expReq", "")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "expAvail", "")}</td>
                {/* Skill: 2 cols */}
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillReq", "")}</td>
                <td className="border border-border p-0.5 text-center">{cellInp(idx, "skillAvail", "")}</td>
                {/* Training: 15 cols */}
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
        {/* Header bar */}
        <div className="bg-muted px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Type Of Training Given</span>
          <span className="text-[10px] text-muted-foreground">
            Reviewed By : <span className="font-semibold text-foreground">{val(d, "reviewed_by") || (ph ? "Ahmed Khaled" : "—")}</span>
          </span>
        </div>

        {/* Topic definitions */}
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

        {/* 3-column Sr.No | Topic No table */}
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
                        ) : (
                          col[rowIdx]?.srNo || ""
                        )}
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
                        ) : (
                          col[rowIdx]?.topicNo || ""
                        )}
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