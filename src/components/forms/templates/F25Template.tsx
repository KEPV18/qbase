// ============================================================================
// F/25 — Audit Plan (Canonical Rewrite)
// DOCX ground truth: 4-column audit matrix, corporate mandate, closure footer.
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface F25Props {
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

interface AuditMatrixRow {
  department: string;
  activity_scope: string;
  date_time: string;
  auditor: string;
}

function parseMatrix(d: Record<string, unknown>): AuditMatrixRow[] {
  const raw = d.audit_matrix || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as AuditMatrixRow[];
  return [
    { department: "Top Management / Management Representative", activity_scope: "Management review & coordination", date_time: "Week 4 – Jan 2026", auditor: "Ahmed Khaled" },
    { department: "Marketing", activity_scope: "Not in scope – January", date_time: "N/A", auditor: "N/A" },
    { department: "Purchase", activity_scope: "Not in scope – January", date_time: "N/A", auditor: "N/A" },
    { department: "Production", activity_scope: "Production activities for all active projects", date_time: "Week 4 – Jan 2026", auditor: "Ahmed Khaled" },
    { department: "Quality Control", activity_scope: "Quality checks, non-conforming handling, corrective actions", date_time: "Week 4 – Jan 2026", auditor: "Ahmed Khaled" },
    { department: "Engineering and Utility Services", activity_scope: "Not in scope – January", date_time: "N/A", auditor: "N/A" },
    { department: "Training", activity_scope: "Training plans, attendance, and training records", date_time: "Week 4 – Jan 2026", auditor: "Ahmed Khaled" },
  ];
}

export function F25Template({ data, isTemplate = true, editMode = false, onChange, className }: F25Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const [matrix, setMatrix] = useState<AuditMatrixRow[]>(() => parseMatrix(d));

  const updateMatrix = useCallback((idx: number, key: keyof AuditMatrixRow, value: string) => {
    setMatrix(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      onChange?.("audit_matrix", next as unknown as Record<string, unknown>);
      return next;
    });
  }, [onChange]);

  const addRow = useCallback(() => {
    setMatrix(prev => [...prev, { department: "", activity_scope: "", date_time: "", auditor: "" }]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setMatrix(prev => {
      const next = prev.filter((_, i) => i !== idx);
      onChange?.("audit_matrix", next as unknown as Record<string, unknown>);
      return next;
    });
  }, [onChange]);

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

  const cellInp = (idx: number, key: keyof AuditMatrixRow, label: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-xs px-1 border-none outline-none"
        value={matrix[idx]?.[key] || ""}
        onChange={e => updateMatrix(idx, key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className="text-xs">{matrix[idx]?.[key] || ""}</span>
    );

  return (
    <div className={cn(
      "bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black",
      className
    )}>
      {/* ── Header Banner ── */}
      <div className="grid grid-cols-[8fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base">Audit Plan</div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs whitespace-nowrap">
          F/25 Rev No. {val(d, "audit_plan_no") || val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Audit Plan No. / Date ── */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          Audit Plan No. 🡪 {inp("audit_plan_no", "F/25-001", "w-28")}
        </div>
        <div className="p-1.5">Date 🡪 {inp("date", "01/01/2026", "w-28")}</div>
      </div>

      {/* ── From / To ── */}
      <div className="grid grid-cols-[3fr_2fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          From 🡪 {inp("from_role", "Management Representative", "w-64")}
        </div>
        <div className="p-1.5">
          To 🡪 {inp("to_role", "Auditors / Auditee", "w-48")}
        </div>
      </div>

      {/* ── Metadata Cards: Last Audit + Next Audit ── */}
      <div className="grid grid-cols-2 border-x border-b border-border text-xs">
        {/* Last Audit */}
        <div className="p-2 border-r border-border bg-muted/30">
          <div className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Audit</div>
          <div className="grid grid-cols-[1fr_1fr] gap-x-2 gap-y-0.5">
            <span className="text-muted-foreground">Month:</span>
            <span>{inp("last_audit_month", "N/A", "w-20")}</span>
            <span className="text-muted-foreground">Plan No.:</span>
            <span>{inp("last_audit_plan_no", "N/A", "w-20")}</span>
            <span className="text-muted-foreground">Plan Date:</span>
            <span>{inp("last_audit_plan_date", "N/A", "w-20")}</span>
          </div>
        </div>
        {/* Next Audit */}
        <div className="p-2 bg-muted/30">
          <div className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Next Audit</div>
          <div className="grid grid-cols-[1fr_1fr] gap-x-2 gap-y-0.5">
            <span className="text-muted-foreground">Due:</span>
            <span>{inp("next_audit_due_month", "01/02/2026", "w-20")}</span>
            <span className="text-muted-foreground">Plan No.:</span>
            <span>{inp("next_audit_plan_no", "F/25-002", "w-20")}</span>
          </div>
        </div>
      </div>

      {/* ── Corporate Mandate Alert ── */}
      <div className="border-x border-b border-border p-2 bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500">
        <div className="flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
              Corporate Mandate
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              {val(d, "intro_corporate_note") || (
                ph
                  ? "Please note that internal quality audit in our Organization is planned as per the details given below; so, please make yourself available as per the time schedule for your departmental audit and co-operate auditors during the course of audit and they are given access to all facilities, documents as required."
                  : ""
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Audit Matrix: 4-Column Table ── */}
      <div className="border-x border-border">
        {/* Table Header */}
        <div className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1.5fr] text-[10px] font-semibold bg-muted border-b border-border">
          <div className="p-1.5 border-r border-border">Department</div>
          <div className="p-1.5 border-r border-border">Audit All Activity / Part</div>
          <div className="p-1.5 border-r border-border">Date And Time</div>
          <div className="p-1.5">Auditor</div>
        </div>

        {/* Table Rows */}
        {matrix.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1.5fr] border-b border-border text-xs relative group min-h-[28px]"
          >
            <div className="p-1 border-r border-border">{cellInp(idx, "department", "Department")}</div>
            <div className="p-1 border-r border-border">{cellInp(idx, "activity_scope", "Scope of audit")}</div>
            <div className="p-1 border-r border-border">{cellInp(idx, "date_time", "Date / Time")}</div>
            <div className="p-1 flex items-center gap-1">
              {cellInp(idx, "auditor", "Auditor name")}
              {editMode && matrix.length > 1 && (
                <button
                  onClick={() => removeRow(idx)}
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Row Button */}
        {editMode && (
          <button
            onClick={addRow}
            className="w-full py-1 flex items-center justify-center gap-1 text-xs text-primary hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Department Row
          </button>
        )}
      </div>

      {/* ── Closure Footer ── */}
      <div className="border-x border-b border-border p-2 space-y-2">
        {/* Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status Of Actual Audit:</span>
          {editMode ? (
            <input
              className="border-b border-dashed border-foreground/40 bg-transparent text-xs px-1 w-28"
              value={val(d, "status_of_actual_audit")}
              onChange={e => onChange?.("status_of_actual_audit", e.target.value)}
              placeholder="Completed"
            />
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle2 className="w-3 h-3" />
              {val(d, "status_of_actual_audit") || "Completed"}
            </span>
          )}
        </div>

        {/* Remarks */}
        <div className="text-xs">
          <span className="text-muted-foreground block mb-0.5">Remarks:</span>
          {editMode ? (
            <textarea
              className="w-full border border-border bg-transparent text-xs p-1 rounded"
              value={val(d, "remarks")}
              onChange={e => onChange?.("remarks", e.target.value)}
              placeholder="Audit schedule was verbally communicated..."
              rows={2}
            />
          ) : (
            <p className="text-xs leading-relaxed">{val(d, "remarks") || (ph ? "___" : "")}</p>
          )}
        </div>

        {/* Reviewed & Approved By */}
        <div className="flex justify-between text-xs pt-1 border-t border-foreground/10">
          <div>
            Reviewed & Approved By:{" "}
            {inp("reviewed_and_approved_by", "Management Representative", "w-40")}
          </div>
        </div>
      </div>
    </div>
  );
}
