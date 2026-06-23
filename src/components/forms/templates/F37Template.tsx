// ============================================================================
// F/37 — Experiment Data Sheet
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 6C x 27R — Header (Sr.No, Date, Product, Exp No, Incharge),
//   Object And Variables, 3-col experiments table (Quantities | Description |
//   Observation / Results), Conclusion, Signatures (Done By | Reviewed By)
// Pillar 1: Horizontal Matrix — 3-column table rendered as HTML grid
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 3: Nested State Mutation Guard — deep object spread, no JSON.stringify
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Beaker, CheckCircle2 } from "lucide-react";

export interface F37Props {
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

interface ExperimentRow {
  quantity: string;
  description: string;
  observation: string;
}

function parseExperiments(d: Record<string, unknown>): ExperimentRow[] {
  const raw = d.experiments;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as ExperimentRow[];
  return [];
}

export function F37Template({ data, isTemplate = true, editMode = false, onChange, className }: F37Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const experiments = parseExperiments(d);

  const inp = (key: string, label: string, width: string = "w-full") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)} value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 inline-block min-w-[4rem]", width)}>{val(d, key) || (ph ? "___" : "")}</span>
    );

  const textArea = (key: string, placeholder: string, minH: string = "min-h-[50px]") =>
    editMode ? (
      <textarea className={cn("w-full bg-transparent text-sm p-2 border border-dashed border-foreground/40 rounded resize-none", minH)} value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className={cn("whitespace-pre-wrap text-sm", minH)}>{val(d, key) || (ph ? "___" : "")}</div>
    );

  const cellInp = (idx: number, subKey: string, label: string) => {
    const item = experiments[idx] || { quantity: "", description: "", observation: "" };
    return editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={item[subKey as keyof ExperimentRow] || ""} onChange={e => {
        const updated = [...experiments];
        updated[idx] = { ...updated[idx], [subKey]: e.target.value };
        onChange?.("experiments", updated);
      }} placeholder={label} />
    ) : (
      <span className="text-xs">{item[subKey as keyof ExperimentRow] || ""}</span>
    );
  };

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[5fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base flex items-center gap-2">
          <Beaker className="w-5 h-5 text-primary" />
          Experiment Data Sheet
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/37 Issue No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
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

      {/* ── Product + Experiment No. ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Product 🡪</span> {inp("product_name", "Product Name", "w-48")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Experiment No. 🡪</span> {inp("experiment_no", "Exp No.", "w-36")}
        </div>
      </div>

      {/* ── Incharge ── */}
      <div className="border-x border-b border-border text-xs p-1.5">
        <span className="font-semibold">Incharge 🡪</span> {inp("incharge", "Incharge Name", "w-64")}
      </div>

      {/* ── Object And Variables ── */}
      <div className="border-x border-b border-border text-xs">
        <div className="p-1.5 bg-muted/50 font-semibold border-b border-border">Object And Variables</div>
        <div className="p-2">{textArea("objective", "Object and variables...", "min-h-[50px]")}</div>
      </div>

      {/* ── Experiments Table (3-column: Quantities | Description | Observation / Results) ── */}
      <div className="border-x border-b border-border">
        <div className="grid grid-cols-[80px_1fr_1fr] text-[10px] font-semibold bg-muted border-b border-border">
          <div className="p-1 border-r border-border">Quantities</div>
          <div className="p-1 border-r border-border">Description</div>
          <div className="p-1">Observation / Results</div>
        </div>
        {experiments.length > 0 ? experiments.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[80px_1fr_1fr] border-b border-border text-xs last:border-b-0 min-h-[26px]">
            <div className="p-1 border-r border-border">{cellInp(idx, "quantity", "Qty")}</div>
            <div className="p-1 border-r border-border">{cellInp(idx, "description", "Description")}</div>
            <div className="p-1">{cellInp(idx, "observation", "Results")}</div>
          </div>
        )) : (
          <div className="p-2 text-xs text-muted-foreground italic">No experiments recorded</div>
        )}
      </div>

      {/* ── Conclusion ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-green-50 dark:bg-green-950/20 text-xs font-semibold border-b border-border flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Conclusion
        </div>
        <div className="p-2">{textArea("conclusion", "Conclusion...", "min-h-[40px]")}</div>
      </div>

      {/* ── Footer Signatures ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border rounded-b-sm text-xs">
        <div className="p-1.5 border-r border-border">
          <span className="font-semibold">Done By 🡪</span> {inp("done_by", "Name", "w-36")}
        </div>
        <div className="p-1.5">
          <span className="font-semibold">Reviewed By 🡪</span> {inp("reviewed_by", "Name", "w-36")}
        </div>
      </div>
    </div>
  );
}
