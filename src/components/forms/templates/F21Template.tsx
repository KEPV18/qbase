// ============================================================================
// F/21 — Management Review Meeting Minutes
// DOCX: meeting details + discussion points + circulated with + approved by
// Redesigned with accent-themed card layout for visual distinction
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Clock, FileText, Users, CheckSquare, MessageSquare } from "lucide-react";
import { FormDocument, val, InfoCard, FieldRow, SectionDivider, TextBlock } from "../FormKit";

export interface F21Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const FC = "F/21";

export function F21Template({ data, isTemplate = true, editMode = false, onChange, className }: F21Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const inp = (key: string, label: string, width = "w-48") =>
    editMode ? (
      <input className={cn("border-b border-dashed border-foreground/40 bg-transparent text-sm px-1", width)}
        value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder={label} />
    ) : (
      <span className={cn("border-b border-dashed border-foreground/30 px-1 min-w-[6rem] inline-block", width)}>
        {val(d, key) || (ph ? "___" : "")}
      </span>
    );

  const textArea = (key: string, placeholder: string) =>
    editMode ? (
      <textarea className="w-full bg-transparent text-[12px] p-2 border border-dashed border-foreground/40 rounded resize-none min-h-[120px]"
        value={val(d, key) || ""} onChange={e => onChange?.(key, e.target.value)} placeholder={placeholder} />
    ) : (
      <div className="whitespace-pre-wrap text-[12px] leading-relaxed min-h-[120px] text-foreground">
        {val(d, key) || (ph ? "___" : "")}
      </div>
    );

  return (
    <FormDocument formCode={FC} formName="Review Minutes" serial={val(d, "serial")} sectionName="Management & Documentation" className={className}>
      <div className="p-6 space-y-4">
        {/* ── Meeting Details ── */}
        <InfoCard formCode={FC} variant="tinted" icon={<Calendar size={14} />} title="Meeting Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Meeting Date</span>
                {inp("meeting_date", "Date", "w-32")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Time</span>
                {inp("meeting_time", "Time", "w-28")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Place</span>
                {inp("meeting_place", "Place", "w-32")}
              </div>
            </div>
          </div>
        </InfoCard>

        {/* ── Discussion Points ── */}
        <SectionDivider formCode={FC} title="Discussion Points" icon={<MessageSquare size={14} />} />
        <div className="px-2">
          <p className="text-[12px] font-semibold text-foreground mb-2">Following Points have been discussed:</p>
          <div className="border border-violet-200 dark:border-violet-800 rounded-md p-4 bg-violet-50/30 dark:bg-violet-950/20">
            {textArea("discussion_points", "Enter discussion points...")}
          </div>
        </div>

        {/* ── Circulation + Approval ── */}
        <SectionDivider formCode={FC} title="Distribution" icon={<Users size={14} />} />
        <div className="px-2 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide shrink-0 min-w-[140px]">
              Minutes Circulated With
            </span>
            {inp("minutes_circulated_with", "Circulated with...", "w-full")}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide shrink-0 min-w-[140px]">
              Prepared By
            </span>
            {inp("prepared_by", "Prepared By", "w-48")}
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide shrink-0">
              Approved By
            </span>
            {inp("approved_by", "Approved By", "w-48")}
          </div>
        </div>
      </div>
    </FormDocument>
  );
}