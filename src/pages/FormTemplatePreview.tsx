// ============================================================================
// QBase — Form Template Preview
// Full-width form view with prev/next navigation between forms.
// ============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { getFormSchema, FORM_SCHEMAS } from "@/data/formSchemas";
import { F28Template } from "@/components/forms/templates/F28Template";
// ── FORCE VITE INCLUSION ──
const _FORCE_VITE_INCLUDE: Record<string, React.ComponentType<any>> = {
  'F/28': F28Template,
};
import { AppShell } from "@/components/layout/AppShell";
import { DocHeader, DocSection } from "@/components/forms/DocumentView";
import { ArrowLeft, ArrowRight, FileText, FilePlus, AlertTriangle, CalendarCheck, User, UserCheck, Clock, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FORMS_REGISTRY } from "@/data/formsRegistry";

// Format ISO date
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// All form codes sorted for navigation
const ALL_FORM_CODES = FORM_SCHEMAS.map(f => f.code).sort();

export default function FormTemplatePreview() {
  const { "*": wildcard } = useParams();
  const navigate = useNavigate();

  const code = wildcard ? decodeURIComponent(wildcard) : null;
  const schema = code ? getFormSchema(code) : null;
  const registryEntry = code ? FORMS_REGISTRY.find(f => f.code === code) : null;

  // Navigation indices
  const currentIndex = code ? ALL_FORM_CODES.indexOf(code) : -1;
  const prevCode = currentIndex > 0 ? ALL_FORM_CODES[currentIndex - 1] : null;
  const nextCode = currentIndex < ALL_FORM_CODES.length - 1 ? ALL_FORM_CODES[currentIndex + 1] : null;

  if (!code || !schema) {
    return (
      <AppShell breadcrumbs={[{ label: "Forms", path: "/forms" }, { label: "Not Found" }]}>
        <div className="flex justify-center py-16 px-4">
          <div className="bg-background p-12 max-w-md w-full text-center">
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

  let TemplateComponent: React.ComponentType<any> | null = _FORCE_VITE_INCLUDE[code] ?? null;

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="w-full">
        <div className="bg-red-600 text-white text-center py-2 font-bold text-lg">TOP NAV TEST</div>
        {/* ── Top Navigation Bar ── */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-background">
          {/* Left: Back + Prev */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/forms')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border"
            >
              <ArrowLeft className="w-4 h-4" />
              Registry
            </button>
            <button
              onClick={() => prevCode && navigate(`/form/${encodeURIComponent(prevCode)}`)}
              disabled={!prevCode}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-md transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              {prevCode || "—"}
            </button>
          </div>

          {/* Center: Form info */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-primary">{code}</span>
            <span className="text-border">·</span>
            <span className="text-sm text-foreground font-medium">{schema.name}</span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-mono">
              {currentIndex + 1} / {ALL_FORM_CODES.length}
            </Badge>
          </div>

          {/* Right: Next + Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => nextCode && navigate(`/form/${encodeURIComponent(nextCode)}`)}
              disabled={!nextCode}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-md transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {nextCode || "—"}
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border" />
            <Button size="sm" onClick={() => navigate(`/create?formCode=${code}`)} className="gap-1.5 h-9 text-sm">
              <FilePlus className="w-4 h-4" /> Create Record
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/records?formCode=${code}`)} className="gap-1.5 h-9 text-sm">
              <FileText className="w-4 h-4" /> View Records
            </Button>
          </div>
        </div>

        {/* ── Metadata Strip ── */}
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-6 text-xs">
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
          <div className="flex items-center gap-1.5">
            <CalendarCheck className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Approved: {formatDate(schema.templateApprovedDate)}</span>
          </div>
          {schema.templateLastModified && (
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-3 h-3 text-amber-500" />
              <span className="text-amber-500">Modified: {formatDate(schema.templateLastModified)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-muted-foreground" />
            <span>{schema.templateCreatedBy || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-emerald-500" />
            <span>{schema.templateApprovedBy || "—"}</span>
          </div>
        </div>

        {/* ── Form Content ── */}
        <div className="w-full">
          {TemplateComponent ? (
            <TemplateComponent isTemplate={true} />
          ) : (
            <div className="px-6 py-8 space-y-6">
              <DocHeader
                serial={code}
                formName={schema.name}
                formCode={code}
                sectionName={schema.sectionName}
              />
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
            </div>
          )}
        </div>

        <div className="bg-blue-600 text-white text-center py-2 font-bold text-lg">BOTTOM NAV TEST</div>
        {/* ── Bottom Navigation ── */}
        <div className="px-4 py-4 border-t border-border flex items-center justify-between bg-background">
          <button
            onClick={() => prevCode && navigate(`/form/${encodeURIComponent(prevCode)}`)}
            disabled={!prevCode}
            className="flex items-center gap-3 px-5 py-3 text-foreground hover:bg-muted rounded-md transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Previous Form</div>
              <div className="font-mono text-sm font-semibold">{prevCode || "—"}</div>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            {ALL_FORM_CODES.map((fc) => (
              <button
                key={fc}
                onClick={() => navigate(`/form/${encodeURIComponent(fc)}`)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  fc === code ? "bg-primary scale-125" : "bg-muted-foreground/20 hover:bg-muted-foreground/50"
                )}
                title={fc}
              />
            ))}
          </div>

          <button
            onClick={() => nextCode && navigate(`/form/${encodeURIComponent(nextCode)}`)}
            disabled={!nextCode}
            className="flex items-center gap-3 px-5 py-3 text-foreground hover:bg-muted rounded-md transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Form</div>
              <div className="font-mono text-sm font-semibold">{nextCode || "—"}</div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
