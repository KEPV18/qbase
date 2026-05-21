// ============================================================================
// QMS Forge — Forms Page (Supabase-connected)
// Shows all 35 ISO forms grouped by section, with record counts from Supabase.
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { MODULE_CONFIG } from "@/config/modules";
import { PageHeader } from "@/components/ui/PageHeader";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { cn } from "@/lib/utils";
import {
  FileText, Search, Clock, FolderOpen, Calendar, PlusCircle,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FormEntry {
  code: string;
  name: string;
  sectionName: string;
  section: number;
  frequency: string;
  description: string;
  recordCount: number;
  lastRecordDate: string | null;
}

export default function FormsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading } = useRecords();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Build form entries from FORM_SCHEMAS + record counts
  const formEntries = useMemo((): FormEntry[] => {
    const recordByForm = new Map<string, { count: number; lastDate: string | null }>();
    records?.forEach(r => {
      const code = r.formCode as string;
      const existing = recordByForm.get(code) || { count: 0, lastDate: null as string | null };
      existing.count++;
      const created = r._createdAt as string;
      if (created && (!existing.lastDate || created > existing.lastDate)) {
        existing.lastDate = created;
      }
      recordByForm.set(code, existing);
    });

    return FORM_SCHEMAS.map(s => {
      const info = recordByForm.get(s.code);
      return {
        code: s.code,
        name: s.name,
        sectionName: s.sectionName,
        section: s.section,
        frequency: s.frequency,
        description: s.description || '',
        recordCount: info?.count || 0,
        lastRecordDate: info?.lastDate || null,
      };
    });
  }, [records]);

  // Group by section name
  const groupedForms = useMemo(() => {
    const groups: Record<string, FormEntry[]> = {};
    formEntries.forEach(f => {
      const sec = f.sectionName || `Section ${f.section}`;
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(f);
    });
    // Sort groups by section number
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => {
        const sa = formEntries.find(f => f.sectionName === a)?.section ?? 99;
        const sb = formEntries.find(f => f.sectionName === b)?.section ?? 99;
        return sa - sb;
      })
    );
  }, [formEntries]);

  // Filtered
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedForms;
    const q = searchQuery.toLowerCase();
    const result: Record<string, FormEntry[]> = {};
    Object.entries(groupedForms).forEach(([sec, forms]) => {
      const filtered = forms.filter(f =>
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.frequency.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[sec] = filtered;
    });
    return result;
  }, [groupedForms, searchQuery]);

  const totalForms = formEntries.length;
  const filledCount = formEntries.filter(f => f.recordCount > 0).length;
  const emptyCount = totalForms - filledCount;

  // Check overdue forms
  const overdueForms = useMemo(() => {
    return formEntries.filter(f => f.recordCount > 0 && isOverdue(f));
  }, [formEntries]);

  const overdueCount = overdueForms.length;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Forms Registry" }]}>
      <div className="space-y-5">
        <PageHeader
          icon={FileText}
          iconClassName="text-primary"
          title="Forms Registry"
          description={`${totalForms} QMS forms organized by section`}
        />

        {/* Decision Banner */}
        {overdueCount > 0 ? (
          <DecisionBanner
            priority="critical"
            title={`${overdueCount} Overdue Form${overdueCount > 1 ? "s" : ""}`}
            description="These forms missed their filing deadline. Address them immediately."
            action={{
              label: `View ${overdueCount} Overdue`,
              onClick: () => {
                if (overdueForms.length > 0) {
                  setExpandedGroup(overdueForms[0].sectionName);
                }
              }
            }}
          />
        ) : emptyCount > 0 ? (
          <DecisionBanner
            priority="info"
            title={`${emptyCount} Form${emptyCount > 1 ? "s" : ""} Without Records`}
            description="These templates have never been filled. Create the first record to populate them."
          />
        ) : null}

        {/* Summary bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-bold text-foreground">{totalForms}</span> Total
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span className="font-bold text-foreground">{filledCount}</span> Have Records
          </span>
          {emptyCount > 0 && (
            <span className="flex items-center gap-1.5 text-primary">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="font-bold">{emptyCount}</span> Empty
            </span>
          )}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold">{overdueCount}</span> Overdue
            </span>
          )}
          <div className="flex-1" />
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              className="pl-9 h-9 text-xs bg-card border-border/50 rounded-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Overdue section */}
        {overdueCount > 0 && (
          <div className="border border-destructive/30 rounded-sm overflow-hidden bg-destructive/[0.02]">
            <div className="px-5 py-3 bg-destructive/[0.05] border-b border-destructive/20 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs font-bold text-destructive uppercase tracking-wider">Overdue Forms</span>
              <Badge variant="outline" className="text-[9px] h-4 bg-destructive/10 text-destructive border-destructive/20 font-mono">{overdueCount}</Badge>
            </div>
            <div className="divide-y divide-destructive/10">
              {overdueForms.map(form => (
                <div
                  key={form.code}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-destructive/[0.03] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/records?formCode=${encodeURIComponent(form.code)}`)}
                >
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                    {form.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{form.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{form.frequency}</p>
                  </div>
                  <span className="text-[10px] font-bold text-destructive shrink-0">Overdue</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/create?formCode=${encodeURIComponent(form.code)}`);
                    }}
                  >
                    <PlusCircle className="w-3 h-3" />
                    Create Record
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forms by Section */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(filteredGroups).length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{searchQuery ? "No forms match your search." : "No forms defined."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredGroups).map(([sectionName, forms]) => {
              const isExpanded = expandedGroup === sectionName || Object.keys(filteredGroups).length <= 5;
              const sectionOverdue = forms.filter(f => f.recordCount > 0 && isOverdue(f)).length;
              const sectionEmpty = forms.filter(f => f.recordCount === 0).length;
              return (
                <div key={sectionName} className="border border-border/50 rounded-sm overflow-hidden bg-card">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : sectionName)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">{sectionName}</span>
                      <Badge variant="outline" className="text-[9px] h-5 font-mono">{forms.length} form{forms.length !== 1 ? "s" : ""}</Badge>
                      {sectionOverdue > 0 && (
                        <Badge variant="outline" className="text-[9px] h-5 font-mono bg-destructive/10 text-destructive border-destructive/20">{sectionOverdue} overdue</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{forms.filter(f => f.recordCount > 0).length}/{forms.length} completed</span>
                      {sectionEmpty > 0 && <span className="text-primary font-semibold">{sectionEmpty} empty</span>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 divide-y divide-border/30">
                      {forms.map(form => {
                        const hasRecords = form.recordCount > 0;
                        const overdue = hasRecords && isOverdue(form);
                        return (
                          <div
                            key={form.code}
                            className={cn(
                              "flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors cursor-pointer group",
                              overdue && "bg-destructive/[0.02] hover:bg-destructive/[0.04]"
                            )}
                            onClick={() => navigate(`/records?formCode=${encodeURIComponent(form.code)}`)}
                          >
                            <span className={cn(
                              "text-[10px] font-mono font-black px-2 py-0.5 rounded-sm shrink-0 border",
                              hasRecords
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted/50 text-muted-foreground border-border/50"
                            )}>
                              {form.code}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{form.name}</p>
                              {form.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{form.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                              {form.frequency && form.frequency !== "On event" && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {form.frequency}
                                </span>
                              )}
                              {hasRecords ? (
                                <span className="text-success font-bold">
                                  {form.recordCount} record{form.recordCount !== 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-primary font-bold">Empty</span>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/create?formCode=${encodeURIComponent(form.code)}`);
                              }}
                            >
                              <PlusCircle className="w-3 h-3" />
                              Create Record
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function isOverdue(form: FormEntry): boolean {
  if (!form.lastRecordDate) return false;
  const now = new Date();
  const last = new Date(form.lastRecordDate);
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const freq = form.frequency.toLowerCase();
  if (freq.includes('monthly')) return daysSince > 35;
  if (freq.includes('quarterly')) return daysSince > 95;
  if (freq.includes('semi')) return daysSince > 190;
  if (freq.includes('annual')) return daysSince > 380;
  return false; // on-event, per-project etc. — never overdue
}