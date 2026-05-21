import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText, ChevronRight,
  Eye, Pencil,
  Search,
  Library, Save, X, RotateCcw, Layers, Info, Printer, User, History, ArrowUp, Calendar, Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProceduresData } from "@/hooks/useProceduresData";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROCEDURES_METADATA, PROCEDURES_CONTENT } from "@/lib/ProceduresContent";

// Map procedure IDs to related form codes
const PROCEDURE_FORM_MAP: Record<string, string[]> = {
  "p01": ["F/21", "F/22", "F/23", "F/24"],
  "p02": ["F/15", "F/16", "F/24"],
  "p03": ["F/25", "F/40", "F/50"],
  "p04": ["F/11", "F/48"],
  "p05": ["F/47"],
  "p06": ["F/28", "F/30"],
  "p07": ["F/08", "F/18", "F/19", "F/20", "F/29", "F/43"],
  "p08": ["F/08", "F/09", "F/12", "F/13", "F/14", "F/17"],
  "p09": ["F/25", "F/35"],
  "p10": ["F/29"],
  "p11": ["F/37"],
  "p12": ["F/35", "F/37"],
  "p13": ["F/12", "F/13", "F/17", "F/43"],
};

export default function ProceduresPage() {
  const navigate = useNavigate();
  const { data: digitalProcedures, updateProcedure, resetToDefault, isLoaded: digitalLoaded } = useProceduresData();
  const { data: records } = useRecords();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll-to-top visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => setShowScrollTop(container.scrollTop > 300);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for active section
  useEffect(() => {
    if (!digitalLoaded || digitalProcedures.length === 0) return;
    const sectionEls = digitalProcedures.map(s => document.getElementById(`proc-${s.id}`)).filter(Boolean);
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveSectionId(visible.target.id.replace('proc-', ''));
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sectionEls.forEach(el => observer.observe(el!));
    return () => observer.disconnect();
  }, [digitalLoaded, digitalProcedures]);

  const filteredProcedures = useMemo(() => {
    if (!searchQuery) return digitalProcedures;
    const query = searchQuery.toLowerCase();
    return digitalProcedures.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.purpose.toLowerCase().includes(query) ||
      p.procedureText.toLowerCase().includes(query)
    );
  }, [searchQuery, digitalProcedures]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(`proc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!digitalLoaded) return null;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Procedures" }]} className="!p-0 !max-w-none">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 md:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/15">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Quality Procedures</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">Standard Operating Procedures (SOP)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 w-40 text-xs bg-secondary/50 border-border/50 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5 h-8 text-xs rounded-lg", isEditMode && "animate-pulse shadow-md")}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {isEditMode ? "Done" : "Edit"}
          </Button>
          {isEditMode && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => { if (confirm("Reset all procedures to default?")) { resetToDefault(); toast.info("Procedures reset"); } }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
          <Button variant="outline" size="sm" className="hidden md:flex gap-1.5 h-8 text-xs rounded-lg" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-52px)] overflow-hidden">
        {/* TOC sidebar */}
        <div className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border/30 bg-secondary/10 overflow-y-auto">
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Procedures</span>
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-secondary/50 border-border/40">{digitalProcedures.length}</Badge>
          </div>
          <nav className="flex-1 px-2 pb-4 space-y-0.5">
            {digitalProcedures.map((proc, idx) => (
              <button
                key={proc.id}
                onClick={() => scrollToSection(proc.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md transition-all text-left",
                  activeSectionId === proc.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0",
                  activeSectionId === proc.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground/50"
                )}>
                  {idx + 1}
                </span>
                <span className="truncate leading-tight">{proc.title.replace(/^\d+\.\s*/, '')}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-border/20 bg-secondary/5 space-y-1.5 text-[10px]">
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Total</span>
              <span className="font-semibold text-foreground text-[9px]">{digitalProcedures.length} SOPs</span>
            </div>
          </div>
        </div>

        {/* Scrollable Document */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-0">
            {/* Approval Banner */}
            <div className="mb-8 p-5 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-primary/[0.01]">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">Document Approval</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-background/80 border border-border/20">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">Prepared By</span>
                  <span className="text-foreground font-semibold">{PROCEDURES_METADATA.preparedBy}</span>
                </div>
                <div className="p-3 rounded-lg bg-background/80 border border-border/20">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">Approved By</span>
                  <span className="text-foreground font-semibold">{PROCEDURES_METADATA.approvedBy}</span>
                </div>
                <div className="p-3 rounded-lg bg-background/80 border border-border/20">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">Approval Date</span>
                  <span className="text-foreground font-semibold">{PROCEDURES_METADATA.approvalDate}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/50 text-center">
                Top Management — {PROCEDURES_METADATA.preparedBy} &amp; {PROCEDURES_METADATA.approvedBy} — approved this document as the official QMS Procedures
              </div>
            </div>

            {filteredProcedures.map((proc, procIdx) => {
              const relatedCodes = PROCEDURE_FORM_MAP[proc.id] || [];
              return (
                <div
                  key={proc.id}
                  id={`proc-${proc.id}`}
                  className={cn(
                    "scroll-mt-20",
                    procIdx < filteredProcedures.length - 1 && "pb-8 mb-8 border-b border-border/20"
                  )}
                >
                  {/* Title */}
                  <div className="mb-5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">
                      <div className="w-8 h-px bg-primary/20" />
                      <span>SOP {procIdx + 1}</span>
                    </div>
                    {isEditMode ? (
                      <Input
                        value={proc.title}
                        onChange={(e) => updateProcedure(proc.id, { title: e.target.value })}
                        className="text-xl font-bold h-10 border-primary/20 rounded-lg"
                      />
                    ) : (
                      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">{proc.title}</h2>
                    )}
                    <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
                  </div>

                  {/* Purpose & Scope & Responsibilities */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                    <div className={cn("p-4 rounded-xl border transition-all", isEditMode ? "border-primary/10 bg-primary/[0.02]" : "border-border/25 bg-card/60")}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Info className="w-3 h-3 text-primary/40" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Purpose</span>
                      </div>
                      {isEditMode ? (
                        <Input value={proc.purpose} onChange={(e) => updateProcedure(proc.id, { purpose: e.target.value })} className="bg-background text-xs h-7 rounded-lg" />
                      ) : (
                        <p className="text-xs text-foreground/70 leading-relaxed">{proc.purpose}</p>
                      )}
                    </div>
                    <div className={cn("p-4 rounded-xl border transition-all", isEditMode ? "border-primary/10 bg-primary/[0.02]" : "border-border/25 bg-card/60")}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="w-3 h-3 text-primary/40" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Scope</span>
                      </div>
                      {isEditMode ? (
                        <Input value={proc.scope} onChange={(e) => updateProcedure(proc.id, { scope: e.target.value })} className="bg-background text-xs h-7 rounded-lg" />
                      ) : (
                        <p className="text-xs text-foreground/70 leading-relaxed">{proc.scope}</p>
                      )}
                    </div>
                    <div className={cn("p-4 rounded-xl border transition-all", isEditMode ? "border-primary/10 bg-primary/[0.02]" : "border-border/25 bg-card/60")}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <User className="w-3 h-3 text-primary/40" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Responsibilities</span>
                      </div>
                      {isEditMode ? (
                        <Input value={proc.responsibilities} onChange={(e) => updateProcedure(proc.id, { responsibilities: e.target.value })} className="bg-background text-xs h-7 rounded-lg" />
                      ) : (
                        <p className="text-xs text-foreground/70 leading-relaxed">{proc.responsibilities}</p>
                      )}
                    </div>
                  </div>

                  {/* Procedure Text */}
                  <div className={cn(
                    "p-5 rounded-xl border transition-all",
                    isEditMode ? "ring-2 ring-primary/15 bg-primary/[0.02] border-primary/10" : "bg-card/60 border-border/25"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-primary/40" />
                        <h3 className="text-sm font-bold">Step-by-Step Procedure</h3>
                      </div>
                      {isEditMode && <Badge variant="outline" className="bg-primary/5 text-primary text-[9px]">Editing</Badge>}
                    </div>
                    {isEditMode ? (
                      <Textarea
                        value={proc.procedureText}
                        onChange={(e) => updateProcedure(proc.id, { procedureText: e.target.value })}
                        className="min-h-[300px] text-sm leading-relaxed bg-background border-primary/10 rounded-lg"
                      />
                    ) : (
                      <div className="text-sm text-foreground/75 whitespace-pre-wrap leading-relaxed">{proc.procedureText}</div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground/50">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><History className="w-3 h-3" /> Rev: {PROCEDURES_METADATA.revisionNo}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> P-SOP-{proc.id.toUpperCase()}</span>
                    </div>
                    {isEditMode && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-primary/40" />
                        <input
                          type="date"
                          defaultValue={PROCEDURES_METADATA.approvalDate}
                          className="h-6 text-[10px] bg-background border border-primary/20 rounded px-1.5 text-foreground"
                        />
                      </div>
                    )}
                  </div>

                  {/* Related QMS Forms */}
                  {relatedCodes.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-border/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-3.5 h-3.5 text-primary/40" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70">Related QMS Forms</span>
                        <Badge variant="outline" className="text-[9px] h-4 font-mono">{relatedCodes.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {relatedCodes.map((code) => {
                          const schema = FORM_SCHEMAS.find(s => s.code === code);
                          const recordCount = records?.filter(r => r.formCode === code).length ?? 0;
                          return (
                            <button
                              key={code}
                              onClick={() => navigate(`/create?form=${encodeURIComponent(code)}`)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/30 bg-card/40 hover:bg-secondary/40 hover:border-primary/30 transition-all text-left group"
                            >
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                                {code}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{schema?.name || code}</p>
                                <p className="text-[9px] text-muted-foreground truncate">
                                  {recordCount} record{recordCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <FileText className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </AppShell>
  );
}