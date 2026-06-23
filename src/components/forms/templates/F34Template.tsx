// ============================================================================
// F/34 — Design Verification Report
// Canonical rewrite matching DOCX structure exactly.
// DOCX: 22 rows x 3 cols — Header, Project/Date, Product, 6 verification
//   item rows, Remarks, Conclusion, Signatures
// Pillar 2: Deep DOCX Ingestion — full lifecycle text extraction
// Pillar 4: Continuous Validation — schema keys match template exactly
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2 } from "lucide-react";

export interface F34Props {
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

interface VerifItem {
  input: string;
  output: string;
}

function parseItems(d: Record<string, unknown>): VerifItem[] {
  const raw = d.verification_items;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as VerifItem[];
  return [];
}

export function F34Template({ data, isTemplate = true, editMode = false, onChange, className }: F34Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;
  const items = parseItems(d);

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

  const cellInp = (idx: number, subKey: string, label: string) => {
    const item = items[idx] || { input: "", output: "" };
    return editMode ? (
      <input className="w-full bg-transparent text-xs px-1 border-none outline-none" value={item[subKey as keyof VerifItem] || ""} onChange={e => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], [subKey]: e.target.value };
        onChange?.("verification_items", updated);
      }} placeholder={label} />
    ) : (
      <span className="text-xs">{item[subKey as keyof VerifItem] || ""}</span>
    );
  };

  return (
    <div className={cn("bg-background dark:bg-[#1e1d1a] text-foreground text-sm print:bg-white print:text-black print:border-black", className)}>
      {/* ── Header ── */}
      <div className="grid grid-cols-[3fr_1fr] border border-border">
        <div className="p-2 font-bold bg-primary/5 text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Design Verification Report
        </div>
        <div className="p-2 border-l border-border bg-primary/5 text-right text-xs">
          F/34 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      {/* ── Project Number + Date ── */}
      <div className="grid grid-cols-[1fr_1fr] border-x border-b border-border text-xs">
        <div className="p-2 border-r border-border">
          <span className="font-semibold">Project Number 🡪</span> {inp("project_number", "F/34-001", "w-36")}
        </div>
        <div className="p-2">
          <span className="font-semibold">Date 🡪</span> {inp("date", "DD/MM/YYYY", "w-28")}
        </div>
      </div>

      {/* ── Product Name ── */}
      <div className="border-x border-b border-border text-xs p-2">
        <span className="font-semibold">Name Of Product 🡪</span> {inp("product_name", "Product Name", "w-64")}
      </div>

      {/* ── Verification Items Table (2-column: Input | Output) ── */}
      <div className="border-x border-b border-border">
        <div className="grid grid-cols-[1fr_1fr] text-[10px] font-semibold bg-muted border-b border-border">
          <div className="p-1.5 border-r border-border">Input Requirements</div>
          <div className="p-1.5">Output Observed</div>
        </div>
        {items.length > 0 ? items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr] border-b border-border text-xs last:border-b-0 min-h-[28px]">
            <div className="p-1.5 border-r border-border">{cellInp(idx, "input", "Input")}</div>
            <div className="p-1.5">{cellInp(idx, "output", "Output")}</div>
          </div>
        )) : (
          <div className="p-2 text-xs text-muted-foreground italic">No verification items recorded</div>
        )}
      </div>

      {/* ── Remarks ── */}
      <div className="border-x border-b border-border">
        <div className="p-1.5 bg-muted/50 text-xs font-semibold border-b border-border">Remarks</div>
        <div className="p-2">{textArea("remarks", "Remarks...", "min-h-[40px]")}</div>
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
        <div className="p-2 border-r border-border">
          <span className="font-semibold">Checked By:</span> {inp("checked_by", "Name", "w-36")}
        </div>
        <div className="p-2">
          <span className="font-semibold">Reviewed And Approved By:</span> {inp("reviewed_and_approved_by", "Name", "w-36")}
        </div>
      </div>
    </div>
  );
}
