// ============================================================================
// F/20 — Management Review Meeting Agenda
// DOCX: structured agenda with date/time/place + bullet agenda items
// Redesigned with accent-themed card layout for visual distinction
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Clock, FileText, CheckSquare } from "lucide-react";
import { FormDocument, val, InfoCard, FieldRow, SectionDivider, TwoColumnBlock } from "../FormKit";

export interface F20Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

const FC = "F/20";

export function F20Template({ data, isTemplate = true, editMode = false, onChange, className }: F20Props) {
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

  const AGENDA_ITEMS = [
    "The status of actions from previous management reviews;",
    "Changes in external and internal issues relevant to QMS;",
    "Information on the performance and effectiveness of QMS, including trends in:",
  ];

  const SUB_ITEMS = [
    "Customer satisfaction and feedback from relevant interested parties and customer complaints;",
    "The extent to which quality objectives have been met;",
    "Process performance and conformity of products and services;",
    "Nonconformities and corrective actions;",
    "Monitoring and measurement results and Review effectiveness of system in achieving Quality objectives;",
  ];

  const EXTRA_ITEMS = [
    "Audit results;",
    "The performance of external providers;",
    "The adequacy of resources;",
    "Effectiveness of actions to address risks and opportunities",
    "Opportunities for improvement",
  ];

  return (
    <FormDocument formCode={FC} formName="Review Agenda" serial={val(d, "serial")} sectionName="Management & Documentation" className={className}>
      <div className="p-6 space-y-4">
        {/* ── Meeting Details Card ── */}
        <InfoCard formCode={FC} variant="tinted" icon={<Calendar size={14} />} title="Meeting Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Date</span>
                {inp("date", "DD/MM/YYYY", "w-32")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Time</span>
                {inp("time", "Time", "w-28")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Place</span>
                {inp("place", "Place", "w-32")}
              </div>
            </div>
          </div>
        </InfoCard>

        {/* ── Notice ── */}
        <div className="px-4 py-3 rounded-md bg-muted/30 border border-border">
          <p className="text-[13px] font-semibold text-foreground">
            Please be advised that there will be Management Review Meeting.
          </p>
        </div>

        {/* ── Agenda Items ── */}
        <SectionDivider formCode={FC} title="Agenda Items" icon={<FileText size={14} />} />

        <div className="px-2 space-y-2">
          <ul className="space-y-2">
            {AGENDA_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-foreground">
                <span className="text-violet-600 dark:text-violet-400 font-bold mt-0.5">▸</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          {/* Sub-items */}
          <ul className="ml-8 space-y-1.5 border-l-2 border-violet-200 dark:border-violet-800 pl-4">
            {SUB_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-muted-foreground">
                <span className="text-violet-500 dark:text-violet-400">•</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 mt-2">
            {EXTRA_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-foreground">
                <span className="text-violet-600 dark:text-violet-400 font-bold mt-0.5">▸</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Approval ── */}
        <SectionDivider formCode={FC} title="Approval" icon={<CheckSquare size={14} />} />
        <div className="px-2 flex justify-end items-center gap-2">
          <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Approved By</span>
          {inp("approved_by", "Approved By", "w-48")}
        </div>
      </div>
    </FormDocument>
  );
}