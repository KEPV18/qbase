// ============================================================================
// F/44 — Job Description
// DOCX: Position/ReportsTo, Responsibilities, Delegation
// Redesigned with accent-themed card layout for visual distinction
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Briefcase, FileText, Users, Shield, ExternalLink } from "lucide-react";
import { FormDocument, val, InfoCard, SectionDivider, TwoColumnBlock } from "../FormKit";

export interface F44Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const FC = "F/44";

export function F44Template({ data, isTemplate = true, editMode = false, onChange, className }: F44Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-sm px-1 border-b border-dashed border-foreground/40 outline-none"
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className="text-sm px-1 border-b border-dashed border-foreground/30 inline-block min-w-[4rem]">
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, label: string, minH = "min-h-[120px]") =>
    editMode ? (
      <textarea className={cn(`w-full ${minH} bg-transparent text-xs p-1 border border-dashed border-foreground/40 rounded resize-y outline-none`)}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <div className={cn(`whitespace-pre-wrap ${minH} text-xs px-1 leading-relaxed text-foreground`)}>
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  const signedDocUrl = val(d, "signed_document_url");

  return (
    <FormDocument formCode={FC} formName="Job Description" serial={val(d, "serial")} sectionName="HR & Training" className={className}>
      <div className="p-6 space-y-4">
        {/* Signed Document Link */}
        {signedDocUrl && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
            <ExternalLink size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-purple-700 dark:text-purple-300">Signed Document:</span>
            <a href={signedDocUrl} target="_blank" rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline hover:text-purple-800">
              View Signed PDF
            </a>
          </div>
        )}

        {/* Employee Name */}
        {val(d, "employee_name") && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold">Employee:</span> {val(d, "employee_name")}
          </div>
        )}

        {/* ── Position Info Card ── */}
        <InfoCard formCode={FC} variant="tinted" icon={<Briefcase size={14} />} title="Position Information">
          <TwoColumnBlock
            left={
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Position</span>
                {inp("position", "Position")}
              </div>
            }
            right={
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Reports To</span>
                {inp("reports_to", "Reports To")}
              </div>
            }
          />
        </InfoCard>

        {/* ── Responsibilities ── */}
        <SectionDivider formCode={FC} title="Responsibilities" icon={<FileText size={14} />} />
        <div className="px-2">
          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 mb-2">
            Write here Responsibilities of Person:
          </p>
          <div className="border border-purple-200 dark:border-purple-800 rounded-md p-3 bg-purple-50/30 dark:bg-purple-950/20">
            {textArea("responsibilities", "Enter responsibilities...", "min-h-[140px]")}
          </div>
        </div>

        {/* ── Delegation ── */}
        <SectionDivider formCode={FC} title="Delegation Of Duties" icon={<Users size={14} />} />
        <div className="px-2">
          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 mb-1">
            During Absence (Indicate Position Title):
          </p>
          <div className="flex gap-6 mb-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-700 dark:text-purple-300">Authorities –</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-700 dark:text-purple-300">Responsibilities –</span>
            </div>
          </div>
          <div className="border border-purple-200 dark:border-purple-800 rounded-md p-3 bg-purple-50/30 dark:bg-purple-950/20">
            {textArea("delegation", "Enter delegation details...", "min-h-[100px]")}
          </div>
        </div>

        {/* ── Approval ── */}
        <div className="pt-3 border-t border-border flex justify-end items-center gap-2">
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Approved By</span>
          {inp("approved_by", "Name")}
        </div>
      </div>
    </FormDocument>
  );
}