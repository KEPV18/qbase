// ============================================================================
// F/32 — R&D Request Form
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 17C x 25R — Multi-section: request info, product details,
//   feasibility review, priority, approvals
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export interface F32Props {
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

export function F32Template({ data, isTemplate = true, editMode = false, onChange, className }: F32Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[60px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border border-dashed border-foreground/40 rounded resize-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap text-sm", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  const labelRow = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[200px_1fr] border-b border-border text-xs">
      <div className="p-2 border-r border-border font-semibold bg-muted/30">{label}</div>
      <div className="p-2">{value}</div>
    </div>
  );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header: Ref No + Date ── */}
      <div className="grid grid-cols-[1fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Research And Development Request Report
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/32 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Ref No + Date ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-2 border-r border-border">
          <span className="font-semibold">Ref. No. 🡪</span> {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
        <div className="p-2">
          <span className="font-semibold">Date 🡪</span> {inp("date", "DD/MM/YYYY", "w-28")}
        </div>
      </div>

      {/* ── From / To ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-2 border-r border-border">
          <span className="font-semibold">From 🡪</span> {inp("from_department", "Department", "w-40")}
        </div>
        <div className="p-2">
          <span className="font-semibold">To 🡪</span> {inp("to_department", "Department", "w-40")}
        </div>
      </div>

      {/* ── Request Type ── */}
      <div className="border-x border-b border-border text-xs p-2">
        <span className="font-semibold">Request for:</span> {inp("request_type", "Modification / New / Other", "w-64")}
      </div>

      {/* ── Product Details Section ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-muted/50 text-xs font-semibold border-b border-border">Product Details</div>
        {labelRow("Name of customer", inp("customer_name", "Customer Name", "w-48"))}
        {labelRow("Name of product", inp("product_name", "Product Name", "w-48"))}
        {labelRow("Specification / standard", inp("specification", "Specification", "w-64"))}
        {labelRow("Product code no.", inp("product_code", "N/A", "w-36"))}
        {labelRow("Sample / standard enclosed", inp("sample_enclosed", "Yes / No", "w-24"))}
        {labelRow("Name of present manufacturer", inp("manufacturer", "Manufacturer", "w-48"))}
        {labelRow("Present market", inp("present_market", "Market", "w-48"))}
      </div>

      {/* ── Reason for Development ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-muted/50 text-xs font-semibold border-b border-border">Reason for Development</div>
        <div className="p-2">{textArea("reason_for_development", "Reason for development", "min-h-[60px]")}</div>
      </div>

      {/* ── Design Input Details ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-muted/50 text-xs font-semibold border-b border-border">Design Input Details</div>
        <div className="p-2">{textArea("design_input_details", "Design input details", "min-h-[60px]")}</div>
      </div>

      {/* ── Target Completion + Remarks ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-2 border-r border-border">
          <span className="font-semibold">Target completion:</span> {inp("target_completion", "DD/MM/YYYY", "w-28")}
        </div>
        <div className="p-2">
          <span className="font-semibold">Remarks:</span> {inp("remarks", "Remarks", "w-48")}
        </div>
      </div>

      {/* ── Requested By ── */}
      <div className="border-x border-b border-border text-xs p-2">
        <span className="font-semibold">Requested by:</span> {inp("requested_by", "Name", "w-40")}
      </div>

      {/* ── Feasibility Review ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 text-xs font-semibold border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Feasibility Review by Research and Development Head
        </div>
        <div className="p-2 text-xs">
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-1">
              {editMode ? (
                <input type="radio" name="feasibility" checked={val(d, "feasibility") === "approved"} onChange={() => onChange?.("feasibility", "approved")} />
              ) : (
                <span className="inline-flex items-center gap-1">
                  {val(d, "feasibility") === "approved" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <span className="w-4 h-4 border border-foreground/30 rounded-full inline-block" />}
                </span>
              )}
              <span className={val(d, "feasibility") === "approved" ? "text-green-700 dark:text-green-400 font-semibold" : ""}>Approved to process further</span>
            </label>
            <label className="flex items-center gap-1">
              {editMode ? (
                <input type="radio" name="feasibility" checked={val(d, "feasibility") === "rejected"} onChange={() => onChange?.("feasibility", "rejected")} />
              ) : (
                <span className="inline-flex items-center gap-1">
                  {val(d, "feasibility") === "rejected" ? <XCircle className="w-4 h-4 text-red-600" /> : <span className="w-4 h-4 border border-foreground/30 rounded-full inline-block" />}
                </span>
              )}
              <span className={val(d, "feasibility") === "rejected" ? "text-red-700 dark:text-red-400 font-semibold" : ""}>Rejected and verbally intimated to requestor</span>
            </label>
          </div>
          <div className="mt-2">
            <span className="font-semibold">Reason for rejection of request, if any:</span>
            <div className="mt-1">{textArea("rejection_reason", "N/A", "min-h-[40px]")}</div>
          </div>
        </div>
      </div>

      {/* ── Project No. + Priority ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-2 border-r border-border">
          <span className="font-semibold">Project no. allotted:</span> {inp("project_no", "RD-XXX-001", "w-36")}
        </div>
        <div className="p-2">
          <span className="font-semibold">Priority:</span>
          <div className="flex items-center gap-3 mt-1">
            <label className="flex items-center gap-1">
              {editMode ? (
                <input type="radio" name="priority" checked={val(d, "priority") === "high"} onChange={() => onChange?.("priority", "high")} />
              ) : (
                <span className="inline-block w-3 h-3 border border-foreground/30 rounded-full text-[8px] text-center">{val(d, "priority") === "high" ? "●" : ""}</span>
              )}
              <span className={val(d, "priority") === "high" ? "text-red-600 font-semibold" : ""}>High</span>
            </label>
            <label className="flex items-center gap-1">
              {editMode ? (
                <input type="radio" name="priority" checked={val(d, "priority") === "normal"} onChange={() => onChange?.("priority", "normal")} />
              ) : (
                <span className="inline-block w-3 h-3 border border-foreground/30 rounded-full text-[8px] text-center">{val(d, "priority") === "normal" ? "●" : ""}</span>
              )}
              <span>Normal</span>
            </label>
            <label className="flex items-center gap-1">
              {editMode ? (
                <input type="radio" name="priority" checked={val(d, "priority") === "routine"} onChange={() => onChange?.("priority", "routine")} />
              ) : (
                <span className="inline-block w-3 h-3 border border-foreground/30 rounded-full text-[8px] text-center">{val(d, "priority") === "routine" ? "●" : ""}</span>
              )}
              <span>Routine</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── R&D Execution Section ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-green-50 dark:bg-green-950/20 text-xs font-semibold border-b border-border flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          R&D Execution
        </div>
        <div className="grid grid-cols-[1fr_1fr] border-b border-border text-xs">
          <div className="p-2 border-r border-border">
            <span className="font-semibold">Target completion by R&D:</span> {inp("rd_target_completion", "DD/MM/YYYY", "w-28")}
          </div>
          <div className="p-2">
            <span className="font-semibold">Job assigned to:</span> {inp("assigned_to", "Team / Person", "w-40")}
          </div>
        </div>
        <div className="p-2 text-xs">
          <span className="font-semibold">Remarks:</span>
          <div className="mt-1">{textArea("rd_remarks", "R&D remarks", "min-h-[40px]")}</div>
        </div>
      </div>

      {/* ── Approved By ── */}
      <div className="border-x border-b border-border rounded-b-sm text-xs p-2">
        <span className="font-semibold">Approved by:</span> {inp("approved_by", "Name", "w-40")}
      </div>
    </div>
  );
}
