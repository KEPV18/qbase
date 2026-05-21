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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ShieldCheck,
  Clock,
  Hash,
  AlertTriangle,
  Database,
  CalendarDays,
  Info,
  Layers,
} from "lucide-react";

// ============================================================================
// Stats helpers
// ============================================================================

function computeStats(forms: FormEntry[]) {
  const total = forms.length;
  const byImportance: Record<FormImportance, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const byFrequency: Record<string, number> = {};
  let withRecords = 0;
  let totalRecords = 0;

  forms.forEach((f) => {
    byImportance[f.importance]++;
    byFrequency[f.frequency] = (byFrequency[f.frequency] || 0) + 1;
    if (f.lastRecordCount && f.lastRecordCount > 0) {
      withRecords++;
      totalRecords += f.lastRecordCount;
    }
  });

  return { total, byImportance, byFrequency, withRecords, totalRecords };
}

// ============================================================================
// Page Component
// ============================================================================

export default function FormsRegistryPage() {
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<number | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<FormImportance | null>(null);
  const [frequencyFilter, setFrequencyFilter] = useState<FormFrequency | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Filtered forms
  const filteredForms = useMemo(() => {
    let result = FORMS_REGISTRY;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.code.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          f.sectionName.toLowerCase().includes(q) ||
          f.notes.toLowerCase().includes(q)
      );
    }

    if (sectionFilter !== null) {
      result = result.filter((f) => f.section === sectionFilter);
    }

    if (importanceFilter !== null) {
      result = result.filter((f) => f.importance === importanceFilter);
    }

    if (frequencyFilter !== null) {
      result = result.filter((f) => f.frequency === frequencyFilter);
    }

    return result;
  }, [searchTerm, sectionFilter, importanceFilter, frequencyFilter]);

  // Stats — computed on filtered subset
  const stats = useMemo(() => computeStats(filteredForms), [filteredForms]);

  // All unique frequencies for dropdown
  const allFrequencies = useMemo(() => {
    const set = new Set<FormFrequency>();
    FORMS_REGISTRY.forEach((f) => set.add(f.frequency));
    return Array.from(set).sort();
  }, []);

  const toggleExpanded = (code: string) => {
    setExpandedCard((prev) => (prev === code ? null : code));
  };

  // Importance options
  const importanceOptions: FormImportance[] = ["Critical", "High", "Medium", "Low"];

  const importanceBadgeStatic: Record<FormImportance, string> = {
    Critical: "bg-destructive/20 text-destructive border-destructive/30",
    High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low: "bg-muted/30 text-muted-foreground border-border/50",
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-background animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  QMS Forms Registry
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ISO 9001:2015 — Documented Information Control
                </p>
              </div>
              <Badge
                variant="outline"
                className="ml-2 bg-primary/10 text-primary border-primary/20 text-sm font-mono font-bold px-3 py-1"
              >
                {FORMS_REGISTRY.length} Forms
              </Badge>
            </div>
          </div>

          {/* ── Stats Bar ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <StatCard
              icon={FileText}
              label="Total Forms"
              value={stats.total}
              color="text-primary"
              bg="bg-primary/5"
            />
            <StatCard
              icon={AlertTriangle}
              label="Critical"
              value={stats.byImportance.Critical}
              color="text-destructive"
              bg="bg-destructive/5"
            />
            <StatCard
              icon={ShieldCheck}
              label="High"
              value={stats.byImportance.High}
              color="text-orange-400"
              bg="bg-orange-500/5"
            />
            <StatCard
              icon={Database}
              label="With Records"
              value={stats.withRecords}
              color="text-success"
              bg="bg-success/5"
              sub={`${stats.totalRecords} total records`}
            />
            <StatCard
              icon={Hash}
              label="Sections"
              value={7}
              color="text-accent"
              bg="bg-accent/5"
            />
            <StatCard
              icon={Clock}
              label="On Event"
              value={stats.byFrequency["On event"] || 0}
              color="text-primary"
              bg="bg-primary/5"
            />
          </div>

          {/* ── Filters Bar ─────────────────────────────────────────────── */}
          <Card className="mb-6 bg-card/50 border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Search by form code, name, section, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-muted/20 border-border/50 h-10 text-sm"
                  />
                </div>

                {/* Section Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSectionFilter(null)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border",
                      sectionFilter === null
                        ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                        : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                    )}
                  >
                    All
                  </button>
                  {FORMS_SECTIONS.map((sec) => (
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
                      S{sec.id} — {sec.name.replace("& ", "").trim()}
                    </button>
                  ))}
                </div>

                {/* Importance + Frequency Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mr-1">
                    Importance
                  </span>
                  {importanceOptions.map((imp) => (
                    <button
                      key={imp}
                      onClick={() => setImportanceFilter(importanceFilter === imp ? null : imp)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border",
                        importanceFilter === imp
                          ? importanceBadgeStatic[imp]
                          : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          getImportanceDotColor(imp)
                        )}
                      />
                      {imp}
                      <span className="text-[10px] opacity-60 font-mono">
                        ({stats.byImportance[imp]})
                      </span>
                    </button>
                  ))}

                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-4 mr-1">
                    Frequency
                  </span>
                  <select
                    value={frequencyFilter || ""}
                    onChange={(e) =>
                      setFrequencyFilter(
                        e.target.value ? (e.target.value as FormFrequency) : null
                      )
                    }
                    className="bg-muted/20 border border-border/50 rounded-md text-[11px] text-foreground px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="">All Frequencies</option>
                    {allFrequencies.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Results count ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
              Showing {filteredForms.length} of {FORMS_REGISTRY.length} forms
            </p>
            {(sectionFilter !== null || importanceFilter !== null || frequencyFilter !== null || searchTerm.trim()) && (
              <button
                onClick={() => {
                  setSectionFilter(null);
                  setImportanceFilter(null);
                  setFrequencyFilter(null);
                  setSearchTerm("");
                }}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* ── Form Cards Grid ──────────────────────────────────────────── */}
          {filteredForms.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No forms match your current filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredForms.map((form) => (
                <FormCard
                  key={form.code}
                  form={form}
                  isExpanded={expandedCard === form.code}
                  onToggle={() => toggleExpanded(form.code)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ============================================================================
// StatCard
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm", bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-xl font-bold font-mono", color)}>{value}</span>
        {sub && (
          <span className="text-[9px] text-muted-foreground font-mono">{sub}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FormCard
// ============================================================================

function FormCard({
  form,
  isExpanded,
  onToggle,
}: {
  form: FormEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasRecords = form.lastRecordCount !== undefined && form.lastRecordCount > 0;

  return (
    <Card
      className={cn(
        "group bg-card/60 border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        isExpanded && "ring-1 ring-primary/20 shadow-lg"
      )}
      onClick={onToggle}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold border",
                isExpanded
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/30 text-foreground border-border/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
              )}
            >
              {form.code}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                {form.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", getSectionColor(form.section))}
                >
                  S{form.section}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1.5 py-0 h-4 font-semibold", getFrequencyBadgeColor(form.frequency))}
                >
                  {form.frequency}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[9px] px-2 py-0.5 h-5 font-semibold", getImportanceColor(form.importance))}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1", getImportanceDotColor(form.importance))} />
              {form.importance}
            </Badge>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-1">
        {/* Record count summary */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className={cn("text-[11px] font-mono font-semibold", hasRecords ? "text-success" : "text-muted-foreground/60")}>
              {form.lastRecordCount ?? 0} records
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-mono">
              {form.lastRecordDate || "N/A"}
            </span>
          </div>
        </div>

        {/* Mini progress bar showing record density */}
        <div className="h-1 w-full rounded-full bg-muted/30 overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              hasRecords ? "bg-gradient-to-r from-success/60 to-success" : "bg-muted-foreground/20"
            )}
            style={{ width: hasRecords ? `${Math.min(100, (form.lastRecordCount! / 64) * 100)}%` : "0%" }}
          />
        </div>

        {/* Quick note preview */}
        <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed">
          {form.notes}
        </p>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border/30 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <DetailRow icon={Hash} label="Form Code" value={form.code} />
              <DetailRow icon={FileText} label="Form Name" value={form.name} />
              <DetailRow icon={Layers} label="Section" value={`S${form.section} — ${form.sectionName}`} />
              <DetailRow icon={ShieldCheck} label="ISO Clause" value={form.isoClause} />
              <DetailRow icon={Clock} label="Frequency" value={form.frequency} />
              <DetailRow icon={AlertTriangle} label="Importance" value={form.importance}>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-2 py-0.5 font-semibold ml-1", getImportanceColor(form.importance))}
                >
                  {form.importance}
                </Badge>
              </DetailRow>
              <DetailRow icon={Database} label="Record Count" value={String(form.lastRecordCount ?? 0)} />
              <DetailRow icon={CalendarDays} label="Last Record" value={form.lastRecordDate || "N/A"} />
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                  Notes
                </span>
              </div>
              <p className="text-[12px] text-foreground/80 leading-relaxed pl-4 border-l-2 border-primary/20">
                {form.notes}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DetailRow
// ============================================================================

function DetailRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-center pl-4">
        <span className="text-[12px] text-foreground font-medium">{value}</span>
        {children}
      </div>
    </div>
  );
}