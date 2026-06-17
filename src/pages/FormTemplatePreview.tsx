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
        <div className="min-h-screen bg-[#e8e8e8] dark:bg-[#1a1a18] flex justify-center py-16 px-4">
          <div className="bg-white dark:bg-[#232220] p-12 max-w-md w-full text-center shadow">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Form Not Found</h2>
            <p className="text-sm text-gray-500 mb-4">No form schema found for code "{code}"</p>
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
      <div className="min-h-screen bg-[#e8e8e8] dark:bg-[#1a1a18] flex justify-center py-8 px-4">
        <div className="w-full max-w-[800px] bg-white dark:bg-[#232220] shadow-[0_1px_4px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] min-h-[500px]">
          {/* Top bar */}
          <div className="px-12 pt-6 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <button onClick={() => navigate('/forms')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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
                  "border-gray-300 dark:border-gray-600 text-gray-400"
                )}>
                  {registryEntry.importance}
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono border-gray-300 dark:border-gray-600 text-gray-400">
                {schema.frequency}
              </Badge>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">S{schema.section}</span>
            </div>
          </div>

          {/* Template Metadata — approval & ownership info */}
          <div className="px-12 py-3 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Approved Date */}
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase tracking-wider">Approved</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{formatDate(schema.templateApprovedDate)}</span>
                </div>
              </div>
              {/* Last Modified */}
              <div className="flex items-center gap-1.5">
                {schema.templateLastModified ? (
                  <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase tracking-wider">Last Change</span>
                  <span className={cn("font-medium truncate", schema.templateLastModified ? "text-amber-600 dark:text-amber-400" : "text-gray-300 dark:text-gray-600")}>
                    {schema.templateLastModified ? formatDate(schema.templateLastModified) : "No changes"}
                  </span>
                </div>
              </div>
              {/* Created By */}
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase tracking-wider">Created By</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{schema.templateCreatedBy || "—"}</span>
                </div>
              </div>
              {/* Approved By */}
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase tracking-wider">Approved By</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{schema.templateApprovedBy || "—"}</span>
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
              <div className="border border-gray-100 dark:border-gray-800 rounded-sm">
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
                        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm text-gray-300 dark:text-gray-600 italic">
                          Table with {columns.length} column{columns.length !== 1 ? 's' : ''}: {columns.map(c => c.label).join(', ')}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-1">
                      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      <div className="h-9 border-b border-gray-200 dark:border-gray-700 flex items-center px-1">
                        <span className="text-sm text-gray-300 dark:text-gray-600 italic">{field.type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-12 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-300 dark:text-gray-600">
            <span>{schema.sectionName}</span>
            <span className="font-mono">{schema.fields.length} fields</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}