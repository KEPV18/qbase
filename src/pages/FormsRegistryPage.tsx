// ============================================================================
// QBase — Forms Registry (Redesigned)
// Section-grouped, documentation-style layout with search & filters.
// ============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import {
  FORMS_REGISTRY,
  FORMS_SECTIONS,
  getImportanceColor,
  getImportanceDotColor,
  getFrequencyBadgeColor,
  getSectionColor,
  type FormEntry,
  type FormFrequency,
  type FormImportance,
} from "@/data/formsRegistry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Database,
  ChevronRight,
  ArrowRight,
  Filter,
  X,
  AlertTriangle,
  LayoutGrid,
  List,
} from "lucide-react";
import { getFormSchema } from "@/data/formSchemas";
import { useRecords } from "@/hooks/useRecordStorage";
import { getMissingMonths, isMonthlyForm, monthLabel } from "@/lib/temporalUtils";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

// ============================================================================
// Types
// ============================================================================

type ViewMode = "grid" | "list";

// ============================================================================
// Component
// ============================================================================

export default function FormsRegistryPage() {
  const navigate = useNavigate();
  const { data: records } = useRecords();

  // ── State ──
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<number | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<FormImportance | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // ── Missing months per form ──
  const missingMonthsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!records) return map;
    for (const code of [...new Set(records.map(r => String(r.formCode)))]) {
      if (isMonthlyForm(code)) {
        const missing = getMissingMonths(records as RecordData[], code);
        if (missing.length > 0) map.set(code, missing);
      }
    }
    return map;
  }, [records]);

  // ── Filtered forms ──
  const filteredForms = useMemo(() => {
    let result = FORMS_REGISTRY;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.sectionName.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q)
      );
    }
    if (sectionFilter !== null) result = result.filter(f => f.section === sectionFilter);
    if (importanceFilter !== null) result = result.filter(f => f.importance === importanceFilter);
    return result;
  }, [searchTerm, sectionFilter, importanceFilter]);

  // ── Group by section ──
  const groupedForms = useMemo(() => {
    const groups: { section: number; sectionName: string; forms: FormEntry[] }[] = [];
    for (const sec of FORMS_SECTIONS) {
      const forms = filteredForms.filter(f => f.section === sec.id);
      if (forms.length > 0) {
        groups.push({ section: sec.id, sectionName: sec.name, forms });
      }
    }
    return groups;
  }, [filteredForms]);

  const hasActiveFilters = sectionFilter !== null || importanceFilter !== null || searchTerm.trim();
  const importanceOptions: FormImportance[] = ["Critical", "High", "Medium", "Low"];

  // ── Total records count ──
  const totalRecords = FORMS_REGISTRY.reduce((sum, f) => sum + (f.lastRecordCount ?? 0), 0);

  return (
    <AppShell>
      <div className="min-h-screen bg-background animate-fade-in">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Header ── */}
          <div className="flex flex-col gap-1 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Forms Registry
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  {FORMS_REGISTRY.length} forms · {totalRecords} records · 7 sections · ISO 9001:2015
                </p>
              </div>
            </div>
          </div>

          {/* ── Search & Filters ── */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Search forms by code, name, section, or notes…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-11 text-sm bg-muted/20 border-border/60 rounded-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter chips row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Section filters */}
              <button
                onClick={() => setSectionFilter(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border",
                  sectionFilter === null
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                )}
              >
                All Sections
              </button>
              {FORMS_SECTIONS.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setSectionFilter(sectionFilter === sec.id ? null : sec.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border",
                    sectionFilter === sec.id
                      ? getSectionColor(sec.id)
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  )}
                >
                  S{sec.id} · {sec.name.split("&")[0].trim()}
                </button>
              ))}

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1" />

              {/* Importance filters */}
              {importanceOptions.map(imp => (
                <button
                  key={imp}
                  onClick={() => setImportanceFilter(importanceFilter === imp ? null : imp)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all border",
                    importanceFilter === imp
                      ? getImportanceColor(imp)
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", getImportanceDotColor(imp))} />
                  {imp}
                </button>
              ))}

              {/* View toggle */}
              <div className="ml-auto flex items-center gap-1 bg-muted/20 border border-border/50 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results count + clear */}
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-mono text-muted-foreground">
                {filteredForms.length} of {FORMS_REGISTRY.length} forms
                {hasActiveFilters && <span className="text-primary ml-1">· filtered</span>}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSectionFilter(null);
                    setImportanceFilter(null);
                    setSearchTerm("");
                  }}
                  className="flex items-center gap-1 text-[12px] text-primary hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ── Forms grouped by section ── */}
          {filteredForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Filter className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No forms match your filters.</p>
              <button
                onClick={() => {
                  setSectionFilter(null);
                  setImportanceFilter(null);
                  setSearchTerm("");
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedForms.map(group => (
                <div key={group.section}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/60">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold border",
                      getSectionColor(group.section)
                    )}>
                      S{group.section}
                    </div>
                    <h2 className="text-[14px] font-bold text-foreground">
                      {group.sectionName}
                    </h2>
                    <span className="text-[12px] text-muted-foreground font-mono">
                      {group.forms.length} {group.forms.length === 1 ? "form" : "forms"}
                    </span>
                  </div>

                  {/* Forms grid or list */}
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {group.forms.map(form => (
                        <FormCardGrid
                          key={form.code}
                          form={form}
                          missingMonths={missingMonthsMap.get(form.code)}
                          onClick={() => navigate(`/form/${form.code}`)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {group.forms.map(form => (
                        <FormCardList
                          key={form.code}
                          form={form}
                          missingMonths={missingMonthsMap.get(form.code)}
                          onClick={() => navigate(`/form/${form.code}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ============================================================================
// Grid Card
// ============================================================================

function FormCardGrid({
  form,
  missingMonths,
  onClick,
}: {
  form: FormEntry;
  missingMonths?: string[];
  onClick: () => void;
}) {
  const schema = getFormSchema(form.code);
  const fieldCount = schema?.fields?.length ?? 0;
  const hasRecords = (form.lastRecordCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-card border border-border/60 rounded-xl p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
    >
      {/* Top row: code + importance */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold bg-muted/30 text-foreground border border-border/50 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
            {form.code}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {form.name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {form.isoClause} · {fieldCount} fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", getImportanceDotColor(form.importance))} />
          <span className="text-[10px] font-semibold text-muted-foreground">{form.importance}</span>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", getFrequencyBadgeColor(form.frequency))}>
          {form.frequency}
        </Badge>
        {hasRecords && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono bg-success/10 text-success border-success/20">
            <Database className="w-2.5 h-2.5 mr-0.5" />
            {form.lastRecordCount}
          </Badge>
        )}
        {missingMonths && missingMonths.length > 0 && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            {missingMonths.length} missing
          </Badge>
        )}
      </div>

      {/* Notes */}
      <p className="text-[11px] text-muted-foreground/70 mt-2 line-clamp-1">
        {form.notes}
      </p>

      {/* Bottom row: last record date + arrow */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground font-mono">
          Last: {form.lastRecordDate || "—"}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
          Open
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// List Row
// ============================================================================

function FormCardList({
  form,
  missingMonths,
  onClick,
}: {
  form: FormEntry;
  missingMonths?: string[];
  onClick: () => void;
}) {
  const schema = getFormSchema(form.code);
  const fieldCount = schema?.fields?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 text-left bg-card border border-border/50 rounded-lg px-4 py-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
    >
      {/* Code badge */}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold bg-muted/30 text-foreground border border-border/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        {form.code}
      </div>

      {/* Name + notes */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {form.name}
          </p>
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getImportanceDotColor(form.importance))} />
        </div>
        <p className="text-[11px] text-muted-foreground/70 truncate">
          {form.isoClause} · {fieldCount} fields · {form.frequency}
          {form.lastRecordDate && ` · Last: ${form.lastRecordDate}`}
        </p>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {missingMonths && missingMonths.length > 0 && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            {missingMonths.length} missing
          </Badge>
        )}
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono bg-muted/20 text-muted-foreground border-border/50">
          {form.lastRecordCount ?? 0} rec
        </Badge>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
    </button>
  );
}