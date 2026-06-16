import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS, type FieldSchema } from "@/data/formSchemas";
import { MODULE_CONFIG, type ModuleConfig } from "@/config/modules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, FilePlus, Database, AlertTriangle, CheckCircle,
  ChevronRight, ArrowRight, BarChart3, Shield, Clock,
  FolderOpen, Inbox, ListChecks, LayoutList, Layers,
} from "lucide-react";
import { getFormTemplateComponent } from "@/components/forms/templates";
import { StateScreen } from "@/components/ui/StateScreen";

function getModuleById(id: string): ModuleConfig | undefined {
  return Object.values(MODULE_CONFIG).find(m => m.id === id);
}

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { data: records, isLoading: recordsLoading } = useRecords();
  const mod = moduleId ? getModuleById(moduleId) : undefined;

  // ─── Selected form in left panel ──────────────────────
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"template" | "records">("records");

  const sectionForms = useMemo(() => {
    if (!mod) return [];
    return FORM_SCHEMAS.filter(f => f.section === mod.section);
  }, [mod]);

  const sectionRecords = useMemo(() => {
    if (!records || !mod) return [];
    const formCodes = new Set(sectionForms.map(f => f.code));
    return records.filter(r => formCodes.has(r.formCode as string));
  }, [records, mod, sectionForms]);

  // Records for the currently selected form
  const selectedFormRecords = useMemo(() => {
    const form = selectedForm ?? (sectionForms[0]?.code ?? null);
    if (!form) return [];
    return sectionRecords
      .filter(r => r.formCode === form)
      .sort((a, b) => ((b._createdAt as string) || '').localeCompare((a._createdAt as string) || ''));
  }, [selectedForm, sectionForms, sectionRecords]);

  const formCodesWithRecords = useMemo(() => {
    const codes = new Set(sectionRecords.map(r => r.formCode as string));
    return codes;
  }, [sectionRecords]);

  const gapForms = sectionForms.filter(f => !formCodesWithRecords.has(f.code));
  const completeness = sectionForms.length > 0
    ? Math.round(((sectionForms.length - gapForms.length) / sectionForms.length) * 100)
    : 0;

  // Auto-select first form on load
  const effectiveSelectedForm = selectedForm ?? (sectionForms[0]?.code ?? null);

  if (!mod) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Module Not Found" }]}>
        <StateScreen state="error" icon={AlertTriangle} title="Module Not Found" message={`No module with ID "${moduleId}"`} action={{ label: "Back to Dashboard", onClick: () => navigate("/") }} />
      </AppShell>
    );
  }

  const breadcrumbs = [
    { label: "Dashboard", path: "/" },
    { label: mod.name },
  ];

  const selectedFormSchema = effectiveSelectedForm
    ? FORM_SCHEMAS.find(f => f.code === effectiveSelectedForm)
    : undefined;

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* ─── Header ───────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center border", mod.moduleClass, "bg-primary/10 border-primary/20")}>
            <mod.icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{mod.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>
            <Badge variant="outline" className="mt-2 text-[10px] font-mono">{mod.isoClause}</Badge>
          </div>
          <Button onClick={() => navigate(`/create?section=${mod.section}`)} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
        </div>

        {/* ─── Stats ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sectionRecords.length}</p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/15 bg-indigo-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-2xl font-bold">{sectionForms.length}</p>
                <p className="text-xs text-muted-foreground">Forms</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border", gapForms.length > 0 ? "border-amber-500/15 bg-amber-500/5" : "border-emerald-500/15 bg-emerald-500/5")}>
            <CardContent className="p-4 flex items-center gap-3">
              {gapForms.length > 0
                ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                : <CheckCircle className="w-5 h-5 text-emerald-400" />}
              <div>
                <p className="text-2xl font-bold">{gapForms.length}</p>
                <p className="text-xs text-muted-foreground">Empty Forms</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border", completeness >= 80 ? "border-emerald-500/15 bg-emerald-500/5" : completeness >= 50 ? "border-amber-500/15 bg-amber-500/5" : "border-red-500/15 bg-red-500/5")}>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className={cn("w-5 h-5", completeness >= 80 ? "text-emerald-400" : completeness >= 50 ? "text-amber-400" : "text-red-400")} />
              <div>
                <p className="text-2xl font-bold">{completeness}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Gap Warning ──────────────────────────────── */}
        {gapForms.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{gapForms.length} forms have zero records</p>
                <p className="text-xs text-amber-300/70">Required for ISO 9001 compliance under {mod.isoClause}.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => navigate(`/create?section=${mod.section}`)}>
                <FilePlus className="w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════
            Split Layout: Forms (Left) | Records (Right)
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 min-h-[400px]">

          {/* ─── LEFT: Form List ─────────────────────────── */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1 mb-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Forms</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">{sectionForms.length} total</span>
            </div>

            {sectionForms.map(form => {
              const formRecordCount = sectionRecords.filter(r => r.formCode === form.code).length;
              const hasRecords = formRecordCount > 0;
              const isActive = effectiveSelectedForm === form.code;

              return (
                <button
                  key={form.code}
                  onClick={() => { setSelectedForm(form.code); setRightTab("records"); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-sm transition-all group flex items-start gap-3",
                    "border border-transparent",
                    isActive
                      ? "bg-primary/10 border-primary/25 text-foreground"
                      : "hover:bg-muted/40 text-foreground/80 hover:text-foreground",
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 mt-0.5",
                    isActive ? "bg-primary/20" : "bg-muted/30"
                  )}>
                    <FileText className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono text-[11px] font-bold", isActive ? "text-primary" : "text-primary/60")}>{form.code}</span>
                      <Badge variant="outline" className={cn(
                        "text-[9px] px-1 py-0",
                        form.importance === "Critical" ? "border-red-500/30 text-red-400" :
                        form.importance === "High" ? "border-amber-500/30 text-amber-400" :
                        "border-border text-muted-foreground"
                      )}>
                        {form.importance}
                      </Badge>
                    </div>
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-foreground" : "text-foreground/80"
                    )}>
                      {form.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground/60">{form.frequency}</span>
                      <span className="text-muted-foreground/30">·</span>
                      {hasRecords ? (
                        <span className="text-[10px] text-muted-foreground">{formRecordCount} record{formRecordCount !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Empty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={cn(
                    "w-4 h-4 mt-2 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/60"
                  )} />
                </button>
              );
            })}
          </div>

          {/* ─── RIGHT: Selected Form — Tabbed Panel ────────── */}
          <div className="border border-border/40 rounded-sm bg-card/50 overflow-hidden">
            {selectedFormSchema ? (
              <div className="flex flex-col h-full">
                {/* Right panel header */}
                <div className="px-5 py-4 border-b border-border/30 bg-muted/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-primary/10 shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{selectedFormSchema.code}</span>
                      <Badge variant="outline" className="text-[9px]">{selectedFormSchema.importance}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{selectedFormSchema.name}</h3>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/create?formCode=${selectedFormSchema.code}`)}
                    className="gap-1.5 shrink-0"
                  >
                    <FilePlus className="w-3.5 h-3.5" /> New
                  </Button>
                </div>

                {/* ─── Tabs: Template | Records ──────────── */}
                <div className="flex border-b border-border/30 bg-muted/5">
                  <button
                    onClick={() => setRightTab("template")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                      rightTab === "template"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Template
                  </button>
                  <button
                    onClick={() => setRightTab("records")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                      rightTab === "records"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Records
                    {selectedFormRecords.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-0.5">{selectedFormRecords.length}</Badge>
                    )}
                  </button>
                </div>

                {/* ─── Tab Content ─────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                  {rightTab === "template" ? (
                    /* ===== TEMPLATE TAB — DOCX-accurate form layout ===== */
                    <div className="p-4 space-y-4">
                      {/* Meta badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Clock className="w-2.5 h-2.5" /> {selectedFormSchema.frequency}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{selectedFormSchema.fields.length} fields</Badge>
                        <Badge variant="outline" className="text-[10px]">{selectedFormSchema.sectionName}</Badge>
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          selectedFormSchema.importance === "Critical" ? "border-red-500/30 text-red-400" :
                          selectedFormSchema.importance === "High" ? "border-amber-500/30 text-amber-400" : ""
                        )}>
                          {selectedFormSchema.importance}
                        </Badge>
                      </div>

                      {/* DOCX-accurate template or schema fallback */}
                      {(() => {
                        const TemplateComponent = getFormTemplateComponent(effectiveSelectedForm ?? "");
                        if (TemplateComponent) {
                          return <TemplateComponent isTemplate={true} />;
                        }
                        // Fallback: schema-driven field list for forms without a dedicated template
                        return (
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-foreground mb-2">Fields ({selectedFormSchema.fields.length})</h4>
                            {selectedFormSchema.fields.map((field: FieldSchema, idx: number) => {
                              if (field.type === "heading") {
                                return (
                                  <div key={field.key} className="pt-3 pb-1">
                                    <span className="text-xs font-semibold text-foreground/80">{field.label}</span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={field.key}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs",
                                    idx % 2 === 0 ? "bg-muted/20" : ""
                                  )}
                                >
                                  <span className="font-medium text-foreground/80">{field.label}</span>
                                  <span className="text-muted-foreground/40 font-mono">{field.key}</span>
                                  {field.required && <span className="text-red-400 text-[10px] ml-0.5">*</span>}
                                  <Badge variant="outline" className="text-[9px] ml-auto py-0">{field.type}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Quick actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button size="sm" onClick={() => navigate(`/create?formCode=${selectedFormSchema.code}`)} className="gap-1.5">
                          <FilePlus className="w-3.5 h-3.5" /> Create Record
                        </Button>
                        {selectedFormRecords.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setRightTab("records")} className="gap-1.5">
                            <Database className="w-3.5 h-3.5" /> View {selectedFormRecords.length} Records
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ===== RECORDS TAB ===== */
                    recordsLoading ? (
                      <div className="p-5">
                        <StateScreen state="loading" icon={ListChecks} title="Loading records…" />
                      </div>
                    ) : selectedFormRecords.length === 0 ? (
                      <div className="p-5">
                        <StateScreen
                          state="empty"
                          icon={Inbox}
                          title="No records yet"
                          message={`No ${selectedFormSchema.code} records found. Create the first one.`}
                          action={{
                            label: "Create First Record",
                            onClick: () => navigate(`/create?formCode=${selectedFormSchema.code}`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="divide-y divide-border/20">
                        {selectedFormRecords.map(r => (
                          <button
                            key={r.serial as string}
                            onClick={() => navigate(`/records/${encodeURIComponent(r.serial as string)}`)}
                            className="w-full text-left px-5 py-3 hover:bg-muted/20 transition-colors flex items-center gap-3 group"
                          >
                            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-muted/30 shrink-0">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                                {r.serial as string}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground/60">
                                  {r._createdAt ? new Date(r._createdAt as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                                {r._createdBy && (
                                  <>
                                    <span className="text-muted-foreground/20">·</span>
                                    <span className="text-[10px] text-muted-foreground/60">{r._createdBy as string}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] shrink-0">{(r.formName as string) || selectedFormSchema.code}</Badge>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Footer with count */}
                {rightTab === "records" && selectedFormRecords.length > 0 && (
                  <div className="px-5 py-2.5 border-t border-border/20 bg-muted/5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedFormRecords.length} record{selectedFormRecords.length !== 1 ? 's' : ''} for {selectedFormSchema.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] gap-1 h-6"
                      onClick={() => navigate(`/records?formCode=${selectedFormSchema.code}`)}
                    >
                      View All <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <StateScreen
                  state="empty"
                  icon={FolderOpen}
                  title="Select a form"
                  message="Choose a form from the list to view its records."
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Bottom Actions ────────────────────────────── */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(`/records?section=${mod.section}`)} className="gap-2">
            <Database className="w-4 h-4" /> All Records
          </Button>
          <Button variant="outline" onClick={() => navigate(`/create?section=${mod.section}`)} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
          <Button variant="outline" onClick={() => navigate("/audit")} className="gap-2">
            <Shield className="w-4 h-4" /> Audit Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/integrity")} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Integrity
          </Button>
        </div>
      </div>
    </AppShell>
  );
}