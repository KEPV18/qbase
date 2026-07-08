// ============================================================================
// F/25 — Audit Plan
// WORD: 19 rows × 9 columns
// ============================================================================

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FormDocument, val } from "../FormKit";

export interface F25Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string | Record<string, unknown>) => void;
  className?: string;
}

interface AuditRow {
  department: string;
  activity_scope: string;
  date_time: string;
  auditor: string;
}

function parseMatrix(d: Record<string, unknown>): AuditRow[] {
  const raw = d.audit_matrix || d.items || d.rows || [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as AuditRow[];
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
  const [matrix, setMatrix] = useState<AuditRow[]>(() => parseMatrix(d));

  const updateMatrix = useCallback((idx: number, key: keyof AuditRow, value: string) => {
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

  const inp = (key: string, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[11px] px-1 border-none outline-none"
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-[11px] leading-tight block min-w-[3rem]">
        {val(d, key) || (ph ? "" : "")}
      </span>
    );

  const cellInp = (idx: number, key: keyof AuditRow, placeholder: string) =>
    editMode ? (
      <input
        className="w-full bg-transparent text-[11px] px-0.5 border-none outline-none"
        value={matrix[idx]?.[key] || ""}
        onChange={e => updateMatrix(idx, key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <span className="text-[11px]">{matrix[idx]?.[key] || ""}</span>
    );

  const cls = "border border-border text-[11px] px-1.5 py-1";
  const clsH = cn(cls, "font-semibold bg-muted/50");

  return (
    <FormDocument formCode="F/25" formName="Audit Plan" serial={val(d, "serial")} sectionName="Quality & Audit">
      {/* Mobile fallback */}
      <div className="md:hidden space-y-2 text-xs p-2 border border-border rounded-lg">
        <div className="font-bold text-sm">Audit Plan</div>
        <div>Audit Plan No: {inp("audit_plan_no", "Plan No")}</div>
        <div>Date: {inp("date", "Date")}</div>
        <div>From: {inp("from_role", "From")}</div>
        <div>To: {inp("to_role", "To")}</div>
        {matrix.map((row, i) => (
          <div key={i} className="border-t pt-1">
            <div>{row.department}</div>
            <div className="text-muted-foreground">{row.activity_scope}</div>
          </div>
        ))}
      </div>

      {/* Desktop table — 9 columns */}
      <table className="w-full border-collapse border border-border text-[11px] hidden md:table">
        <tbody>
          {/* Row 0: Title merged 0-7, col 8 = rev */}
          <tr>
            <td colSpan={8} className={cn(cls, "font-bold text-center text-sm bg-primary/5")}>
              Audit Plan
            </td>
            <td className={cn(cls, "text-right bg-primary/5 whitespace-nowrap")}>
              F/25 Rev No.{val(d, "audit_plan_no") || val(d, "serial") || (ph ? "{{SERIAL}}" : "")}
            </td>
          </tr>

          {/* Row 1: Audit Plan No. cols 0-3, Date cols 4-8 */}
          <tr>
            <td colSpan={4} className={cls}>
              Audit Plan No. → {inp("audit_plan_no", "F/25-001")}
            </td>
            <td colSpan={5} className={cls}>
              Date → {inp("date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* Row 2: From cols 0-3, To cols 4-8 */}
          <tr>
            <td colSpan={4} className={cls}>
              From → Management Representative
            </td>
            <td colSpan={5} className={cls}>
              To → Auditors / Audittee
            </td>
          </tr>

          {/* Row 3: Last Audit Done In The Month Of cols 0-3, Last Audit Plan No. cols 4-8 */}
          <tr>
            <td colSpan={4} className={cls}>
              Last Audit Done In The Month Of : {inp("last_audit_month", "Month")}
            </td>
            <td colSpan={5} className={cls}>
              Last Audit Plan No. : {inp("last_audit_plan_no", "Plan No.")}
            </td>
          </tr>

          {/* Row 4: Last Audit Done In The Month Of cols 0-3, Last Audit Plan Date cols 4-8 */}
          <tr>
            <td colSpan={4} className={cls}>
              Last Audit Done In The Month Of : {inp("last_audit_month2", "Month")}
            </td>
            <td colSpan={5} className={cls}>
              Last Audit Plan Date : {inp("last_audit_plan_date", "DD/MM/YYYY")}
            </td>
          </tr>

          {/* Row 5: Audit matrix header */}
          <tr>
            <td colSpan={3} className={cn(clsH, "text-center")}>
              Department
            </td>
            <td colSpan={3} className={cn(clsH, "text-center")}>
              Audit All Activity / Part
            </td>
            <td className={cn(clsH, "text-center")}>
              Date And Time
            </td>
            <td colSpan={2} className={cn(clsH, "text-center")}>
              Auditor
            </td>
          </tr>

          {/* Rows 6-17: audit matrix rows (up to 12) */}
          {matrix.map((row, idx) => (
            <tr key={idx}>
              <td colSpan={3} className={cls}>
                {cellInp(idx, "department", "Department")}
              </td>
              <td colSpan={3} className={cls}>
                {cellInp(idx, "activity_scope", "Scope")}
              </td>
              <td className={cls}>
                {cellInp(idx, "date_time", "Date/Time")}
              </td>
              <td colSpan={2} className={cls}>
                <div className="flex items-center gap-1">
                  {cellInp(idx, "auditor", "Auditor")}
                  {editMode && matrix.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {/* Add row button spans full width */}
          {editMode && (
            <tr>
              <td colSpan={9} className="border border-border">
                <button
                  onClick={addRow}
                  className="w-full py-1 flex items-center justify-center gap-1 text-[11px] text-primary hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </td>
            </tr>
          )}

          {/* Row 18: Signature row */}
          <tr>
            <td colSpan={3} className={cls}>
              Reviewed By : {inp("reviewed_by", "Reviewer Name")}
            </td>
            <td colSpan={3} className={cls}>
              Approved By : {inp("approved_by", "Approver Name")}
            </td>
            <td colSpan={3} className={cls}>
              Management Representative : {inp("management_rep", "Name")}
            </td>
          </tr>
        </tbody>
      </table>
    </FormDocument>
  );
}
