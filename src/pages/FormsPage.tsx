import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import { getProcedureForRecord } from "@/lib/procedureRecordMapping";
import { PROCEDURES_CONTENT } from "@/lib/ProceduresContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { StateScreen } from "@/components/ui/StateScreen";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  FileText, Search, Clock, FolderOpen, Calendar, PlusCircle,
  ChevronDown, ChevronRight, ExternalLink, AlertTriangle, CheckCircle, BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/googleSheets";
import { MODULE_CONFIG } from "@/config/modules";

export default function FormsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading } = useQMSData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const groupedForms = useMemo(() => {
    if (!records) return {};
    const groups: Record<string, typeof records> = {};
    records.forEach(r => {
      const cat = r.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    );
  }, [records]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedForms;
    const q = searchQuery.toLowerCase();
    const result: Record<string, typeof records> = {};
    Object.entries(groupedForms).forEach(([cat, recs]) => {
      const filtered = recs.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.recordName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[cat] = filtered;
    });
    return result;
  }, [groupedForms, searchQuery]);

  const totalForms = records?.length || 0;
  const filledCount = records?.filter(r => (r.actualRecordCount || 0) > 0).length || 0;
  const emptyCount = totalForms - filledCount;
  const overdueCount = records?.filter(r => r.isOverdue).length || 0;

  // Find most critical overdue forms for decision banner
  const overdueForms = useMemo(() => {
    if (!records) return [];
    return records
      .filter(r => r.isOverdue)
      .sort((a, b) => {
        const aDays = a.daysUntilNextFill ?? 999;
        const bDays = b.daysUntilNextFill ?? 999;
        return aDays - bDays;
      })
      .slice(0, 5);
  }, [records]);

  // Find empty forms that need first record (high-priority gaps)
  const emptyForms = useMemo(() => {
    if (!records) return [];
    return records.filter(r => (r.actualRecordCount || 0) === 0);
  }, [records]);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Forms Registry" }]}>
      <div className="space-y-5">
        <PageHeader
          icon={FileText}
          iconClassName="text-primary"
          title="Forms Registry"
          description={`${totalForms} QMS forms organized by category`}
        />

        {/* Decision Banner — most critical action */}
        {overdueCount > 0 ? (
          <DecisionBanner
            priority="critical"
            title={`${overdueCount} Overdue Form${overdueCount > 1 ? "s" : ""}`}
            description="These forms missed their filing deadline. Address them immediately to close compliance gaps."
            action={{
              label: `View ${overdueCount} Overdue`,
              onClick: () => {
                // Expand the first overdue category
                if (overdueForms.length > 0) {
                  setExpandedGroup(overdueForms[0].category);
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

        {/* Overdue section — always visible if any */}
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
                  onClick={() => navigate(`/record/${encodeURIComponent(form.code)}`)}
                >
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                    {form.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{form.recordName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{form.whenToFill || "As needed"}</p>
                  </div>
                  <span className="text-[10px] font-bold text-destructive shrink-0">
                    {form.daysUntilNextFill !== undefined ? `${Math.abs(form.daysUntilNextFill)}d overdue` : "Overdue"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/module/${form.category.toLowerCase().replace(/\s+/g, '-')}`);
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

        {/* Forms by Category */}
        {isLoading ? (
          <StateScreen state="loading" title="Loading forms" />
        ) : Object.keys(filteredGroups).length === 0 ? (
          <StateScreen state="empty" title="No forms found" message={searchQuery ? "No forms match your search." : "No forms defined yet."} />
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredGroups).map(([category, forms]) => {
              const isExpanded = expandedGroup === category || Object.keys(filteredGroups).length <= 5;
              const categoryOverdue = forms.filter(f => f.isOverdue).length;
              const categoryEmpty = forms.filter(f => (f.actualRecordCount || 0) === 0).length;
              return (
                <div key={category} className="border border-border/50 rounded-sm overflow-hidden bg-card">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : category)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">{category}</span>
                      <Badge variant="outline" className="text-[9px] h-5 font-mono">{forms.length} form{forms.length !== 1 ? "s" : ""}</Badge>
                      {categoryOverdue > 0 && (
                        <Badge variant="outline" className="text-[9px] h-5 font-mono bg-destructive/10 text-destructive border-destructive/20">{categoryOverdue} overdue</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{forms.filter(f => (f.actualRecordCount || 0) > 0).length}/{forms.length} completed</span>
                      {categoryEmpty > 0 && <span className="text-primary font-semibold">{categoryEmpty} empty</span>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 divide-y divide-border/30">
                      {forms.map(form => {
                        const hasRecords = (form.actualRecordCount || 0) > 0;
                        const isOverdue = form.isOverdue;
                        return (
                          <div
                            key={form.code}
                            className={cn(
                              "flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors cursor-pointer group",
                              isOverdue && "bg-destructive/[0.02] hover:bg-destructive/[0.04]"
                            )}
                            onClick={() => navigate(`/record/${encodeURIComponent(form.code)}`)}
                          >
                            <span className={cn(
                              "text-[10px] font-mono font-black px-2 py-0.5 rounded-sm shrink-0 border",
                              hasRecords
                                ? "bg-success/10 text-success border-success/20"
                                : isOverdue
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-muted/50 text-muted-foreground border-border/50"
                            )}>
                              {form.code}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{form.recordName}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{form.description}</p>
                              {/* Procedure Reference */}
                              {(() => {
                                const linkedProc = getProcedureForRecord(form);
                                if (!linkedProc) return null;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate("/procedures");
                                    }}
                                    className="inline-flex items-center gap-1 mt-1 text-[9px] text-primary/60 hover:text-primary transition-colors"
                                  >
                                    <BookOpen className="w-2.5 h-2.5" />
                                    Referenced by: {linkedProc.title.replace(/^\d+\.\s*/, "")}
                                  </button>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                              {(() => {
                                // Show frequency from the linked procedure's recordFrequency
                                const linkedProc = getProcedureForRecord(form);
                                const linkedProcData = linkedProc
                                  ? PROCEDURES_CONTENT.find(p => p.id === linkedProc.id)
                                  : null;
                                const frequency = linkedProcData?.recordFrequency || form.whenToFill || "";
                                if (!frequency || frequency === "As needed") return null;
                                return (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {frequency}
                                  </span>
                                );
                              })()}
                              {hasRecords && (
                                <span className="text-success font-bold">
                                  {form.actualRecordCount} record{form.actualRecordCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              {!hasRecords && !isOverdue && (
                                <span className="text-primary font-bold">Empty</span>
                              )}
                              {form.lastFileDate && (
                                <span className="font-mono">{formatTimeAgo(form.lastFileDate)}</span>
                              )}
                            </div>

                            {/* Create Record CTA */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/module/${form.category.toLowerCase().replace(/\s+/g, '-')}`);
                              }}
                            >
                              <PlusCircle className="w-3 h-3" />
                              Create Record
                            </Button>

                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
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
