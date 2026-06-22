// ============================================================================
// QBase — Form Template Preview
// Shows the actual form template when clicking a form in the registry.
// Renders DOCX-accurate template or schema-driven fallback.
// ============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { getFormSchema, type FieldSchema } from "@/data/formSchemas";
import { getFormTemplateComponent } from "@/components/forms/templates";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentView, DocHeader, DocSection, DocField, DocTable } from "@/components/forms/DocumentView";
import { ArrowLeft, FileText, Layers, FilePlus, AlertTriangle, CalendarCheck, User, UserCheck, Clock, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FORMS_REGISTRY } from "@/data/formsRegistry";

// Format ISO date to Arabic-English readable format: "1/1/2026" → "January 1, 2026"
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function FormTemplatePreview() {
  const { "*": wildcard } = useParams();
  const navigate = useNavigate();

  const code = wildcard ? decodeURIComponent(wildcard) : null;
  const schema = code ? getFormSchema(code) : null;
  const registryEntry = code ? FORMS_REGISTRY.find(f => f.code === code) : null;

  if (!code || !schema) {
    return (
      <AppShell breadcrumbs={[{ label: "Forms", path: "/forms" }, { label: "Not Found" }]}>
        <div className="min-h-screen bg-muted/30 dark:bg-[#1a1a18] print:bg-white flex justify-center py-16 px-4">
          <div className="bg-background dark:bg-[#1e1d1a] p-12 max-w-md w-full text-center shadow-sm rounded-lg border border-border print:bg-white print:text-black print:border-black print:shadow-none print:rounded-none">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-lg font-medium text-foreground mb-1">Form Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">No form schema found for code "{code}"</p>
            <button onClick={() => navigate('/forms')} className="text-sm text-blue-600 hover:underline">Back to Forms Registry</button>
          </div>
        </div>
      </AppShell>
    );
  }

  const breadcrumbs = [
    { label: "Forms", path: "/forms" },
    { label: code },
  ];

  const TemplateComponent = getFormTemplateComponent(code);

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="min-h-screen bg-muted/30 dark:bg-[#1a1a18] print:bg-white flex justify-center py-8 px-4">
        <div className="w-full max-w-[800px] bg-background dark:bg-[#1e1d1a] shadow-sm rounded-lg border border-border min-h-[500px] print:bg-white print:text-black print:border-black print:shadow-none print:rounded-none">
          {/* Top bar */}
          <div className="px-12 pt-6 pb-3 border-b border-border flex items-center justify-between">
            <button onClick={() => navigate('/forms')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Registry
            </button>
            <div className="flex items-center gap-2">
              {registryEntry && (
                <Badge variant="outline" className={cn(
                  "text-[9px] px-1.5 py-0 h-4 font-mono",
                  registryEntry.importance === "Critical" ? "border-red-500/30 text-red-400" :
                  registryEntry.importance === "High" ? "border-orange-500/30 text-orange-400" :
                  registryEntry.importance === "Medium" ? "border-yellow-500/30 text-yellow-400" :
                  "border-border text-muted-foreground"
                )}>
                  {registryEntry.importance}
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono border-border text-muted-foreground">
                {schema.frequency}
              </Badge>
              <span className="text-[10px] text-border">S{schema.section}</span>
            </div>
          </div>

          {/* Template Metadata — approval & ownership info */}
          <div className="px-12 py-3 bg-muted/30 border-b border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Approved Date */}
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Approved</span>
                  <span className="text-muted-foreground font-medium truncate">{formatDate(schema.templateApprovedDate)}</span>
                </div>
              </div>
              {/* Last Modified */}
              <div className="flex items-center gap-1.5">
                {schema.templateLastModified ? (
                  <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-border shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Last Change</span>
                  <span className={cn("font-medium truncate", schema.templateLastModified ? "text-amber-500" : "text-border")}>
                    {schema.templateLastModified ? formatDate(schema.templateLastModified) : "No changes"}
                  </span>
                </div>
              </div>
              {/* Created By */}
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Created By</span>
                  <span className="text-muted-foreground font-medium truncate">{schema.templateCreatedBy || "—"}</span>
                </div>
              </div>
              {/* Approved By */}
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Approved By</span>
                  <span className="text-muted-foreground font-medium truncate">{schema.templateApprovedBy || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-12 py-8">
            <DocHeader
              serial={code}
              formName={schema.name}
              formCode={code}
              sectionName={schema.sectionName}
            />

            {/* Quick actions */}
            <div className="flex gap-2 mb-8">
              <Button size="sm" onClick={() => navigate(`/create?formCode=${code}`)} className="gap-1.5">
                <FilePlus className="w-3.5 h-3.5" /> Create Record
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/records?formCode=${code}`)} className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> View Records
              </Button>
            </div>

            {/* Template or schema-driven field list */}
            {TemplateComponent ? (
              <div className="border border-border rounded-sm">
                <TemplateComponent isTemplate={true} />
              </div>
            ) : (
              <div className="space-y-6">
                {schema.fields.map((field, i) => {
                  if (field.type === 'heading') {
                    return <DocSection key={i} title={field.label} />;
                  }

                  if (field.type === 'table') {
                    const columns = field.columns || [];
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm text-border italic">
                          Table with {columns.length} column{columns.length !== 1 ? 's' : ''}: {columns.map(c => c.label).join(', ')}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      <div className="h-9 border-b border-border flex items-center px-1">
                        <span className="text-sm text-border italic">{field.type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-12 py-4 border-t border-border flex items-center justify-between text-[10px] text-border">
            <span>{schema.sectionName}</span>
            <span className="font-mono">{schema.fields.length} fields</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}