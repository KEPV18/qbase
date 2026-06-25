// ============================================================================
// F/20 — Management Review Meeting Agenda
// Canonical rewrite matching DOCX structure exactly.
// DOCX: Single-cell table with full meeting notice text including:
//   Date, Time, Place, full agenda with bullet points, Approved By
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export interface F20Props {
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

export function F20Template({ data, isTemplate = true, editMode = false, onChange, className }: F20Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width: string = "w-48") =>
    editMode ? (
      <input
        className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={label}
      />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 min-w-[6rem] inline-block", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[120px]") =>
    editMode ? (
      <textarea
        className={cn("w-full bg-transparent text-sm p-2 border border-dashed border-foreground/40 rounded resize-none", minH)}
        value={val(d, key) || ""}
        onChange={e => onChange?.(key, e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", minH)}>
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm leading-relaxed print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[3fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Management Review Meeting Agenda
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/20 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Sr. No. + Date ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Sr. No. 🡪</span> {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Date 🡪</span> {inp("date", "DD/MM/YYYY", "w-28")}
        </div>
      </div>

      {/* ── Meeting Info ── */}
      <div className="grid grid-cols-3 border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Time 🡪</span> {inp("time", "Time", "w-24")}
        </div>
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Place 🡪</span> {inp("place", "Place", "w-32")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Chairperson 🡪</span> {inp("chairperson", "Chairperson", "w-36")}
        </div>
      </div>

      {/* ── Full Agenda Text ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-muted/50 text-xs font-semibold border-b border-border">Agenda</div>
        <div className="p-2">{textArea("agenda", "Full meeting agenda...", "min-h-[200px]")}</div>
      </div>

      {/* ── Footer Signatures ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border rounded-b-sm text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Prepared By 🡪</span> {inp("prepared_by", "Name", "w-36")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Approved By 🡪</span> {inp("approved_by", "Name", "w-36")}
        </div>
      </div>
    </div>
  );
}
