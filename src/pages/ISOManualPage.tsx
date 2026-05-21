import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import {
  Search, BookOpen, History, User,
  ChevronUp, Pencil, X, RotateCcw, Printer, ArrowUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MANNUAL_METADATA, type ManualSection } from "@/lib/ManualContent";
import { useManualData } from "@/hooks/useManualData";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ISOManualPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, updateSection, updateSubsection, resetToDefault, isLoaded } = useManualData();

  // Scroll-to-top visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => setShowScrollTop(container.scrollTop > 300);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    if (!isLoaded || data.length === 0) return;
    const sectionEls = data.map(s => document.getElementById(`section-${s.id}`)).filter(Boolean);
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveSectionId(visible.target.id.replace('section-', ''));
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sectionEls.forEach(el => observer.observe(el!));
    return () => observer.disconnect();
  }, [isLoaded, data]);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query) ||
      section.subsections?.some(sub => sub.title.toLowerCase().includes(query) || sub.content.toLowerCase().includes(query))
    );
  }, [searchQuery, data]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!isLoaded) return null;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "ISO 9001 Manual" }]} className="!p-0 !max-w-none">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 md:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/15">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">ISO 9001:2015 Quality Manual</h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 bg-primary/5 text-primary border-primary/15 font-mono">
                {MANNUAL_METADATA.documentNo}
              </Badge>
              <span>Rev {MANNUAL_METADATA.revisionNo}</span>
              <span>·</span>
              <span>{MANNUAL_METADATA.updateDate}</span>
              <span>·</span>
              <span>Approved {MANNUAL_METADATA.approvalDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 w-48 text-xs bg-muted/30 border-border/40 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={isEditMode ? "destructive" : "outline"}
            size="sm"
            className={cn("gap-1.5 h-8 text-xs rounded-lg", isEditMode && "animate-pulse shadow-md")}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {isEditMode ? "Exit Edit" : "Edit"}
          </Button>
          {isEditMode && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => { if (confirm("Reset manual to original text?")) { resetToDefault(); toast.info("Manual reset"); } }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
          {!isEditMode && (
            <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5 h-8 text-xs rounded-lg" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-52px)] overflow-hidden">
        {/* Floating TOC sidebar */}
        <div className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border/30 bg-muted/5 overflow-y-auto">
          <div className="px-3 pt-4 pb-2">
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Contents</span>
          </div>
          <nav className="flex-1 px-2 pb-4 space-y-0.5">
            {data.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md transition-all text-left",
                  activeSectionId === section.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0",
                  activeSectionId === section.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground/50"
                )}>
                  {idx + 1}
                </span>
                <span className="truncate leading-tight">{section.title.replace(/^\d+\.\s*/, '')}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-border/20 bg-muted/10 space-y-1.5 text-[10px]">
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Prepared</span>
              <span className="font-semibold text-foreground text-[9px]">{MANNUAL_METADATA.preparedBy}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approved</span>
              <span className="font-semibold text-foreground text-[9px]">{MANNUAL_METADATA.approvedBy}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approval Date</span>
              <span className="font-semibold text-foreground text-[9px]">{MANNUAL_METADATA.approvalDate}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Document */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-0">
            {filteredContent.map((section, sectionIdx) => (
              <SectionBlock
                key={section.id}
                section={section}
                sectionIdx={sectionIdx}
                isEditMode={isEditMode}
                updateSection={updateSection}
                updateSubsection={updateSubsection}
                isLast={sectionIdx === filteredContent.length - 1}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="max-w-3xl mx-auto px-5 md:px-8 pb-8 pt-6 border-t border-border/30 mt-8">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="font-mono">{MANNUAL_METADATA.documentNo}</span>
                <span>Rev {MANNUAL_METADATA.revisionNo}</span>
                <span>{MANNUAL_METADATA.updateDate}</span>
              </div>
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-success/10 text-success border-success/20">ACTIVE</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </AppShell>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────
function SectionBlock({
  section,
  sectionIdx,
  isEditMode,
  updateSection,
  updateSubsection,
  isLast,
}: {
  section: ManualSection;
  sectionIdx: number;
  isEditMode: boolean;
  updateSection: (id: string, updates: Partial<ManualSection>) => void;
  updateSubsection: (sectionId: string, subId: string, content: string) => void;
  isLast: boolean;
}) {
  return (
    <div id={`section-${section.id}`} className={cn("scroll-mt-20", !isLast && "pb-8 mb-8 border-b border-border/20")}>
      {/* Section Header */}
      <div className="mb-5 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">
          <div className="w-8 h-px bg-primary/20" />
          <span>Clause {sectionIdx + 1}</span>
        </div>
        {isEditMode ? (
          <Input
            value={section.title}
            onChange={(e) => updateSection(section.id, { title: e.target.value })}
            className="text-xl font-bold h-10 border-primary/20 rounded-lg"
          />
        ) : (
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
            {section.title}
          </h2>
        )}
        <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
      </div>

      {/* Section Content */}
      <div className={cn(
        "p-5 rounded-xl border transition-all mb-6",
        isEditMode ? "ring-2 ring-primary/15 bg-primary/[0.02] border-primary/10" : "bg-card/60 border-border/30"
      )}>
        {isEditMode ? (
          <div className="space-y-2">
            <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Description</Label>
            <Textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, { content: e.target.value })}
              className="min-h-[120px] text-sm bg-background border-primary/10 rounded-lg"
            />
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground/75 space-y-2">
            {section.content.split('\n').map((line, i) => (
              <p key={i}>
                {line.startsWith('- ') ? (
                  <span className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary/50 mt-2 shrink-0" />
                    <span>{line.substring(2)}</span>
                  </span>
                ) : <span>{line}</span>}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Subsections — inline, no click-to-expand */}
      {section.subsections && section.subsections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-1 rounded-full bg-primary/30" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Sub-Clauses</span>
            <div className="flex-1 h-px bg-border/20" />
          </div>
          {section.subsections.map((sub, subIdx) => (
            <div
              key={sub.id}
              className={cn(
                "rounded-xl border overflow-hidden transition-all",
                isEditMode ? "ring-1 ring-primary/15 border-primary/10" : "border-border/25 hover:border-border/40"
              )}
            >
              <div className={cn(
                "h-0.5",
                isEditMode ? "bg-primary" : "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent"
              )} />
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-mono bg-muted/40 text-muted-foreground border-border/30">
                    {sectionIdx + 1}.{subIdx + 1}
                  </Badge>
                  {isEditMode ? (
                    <Input
                      value={sub.title}
                      onChange={(e) => updateSubsection(section.id, sub.id, sub.content)}
                      className="text-sm font-bold h-7 border-primary/10 rounded-lg flex-1"
                    />
                  ) : (
                    <h4 className="text-sm font-bold text-foreground">{sub.title}</h4>
                  )}
                </div>
                {isEditMode ? (
                  <Textarea
                    value={sub.content}
                    onChange={(e) => updateSubsection(section.id, sub.id, e.target.value)}
                    className="min-h-[100px] text-sm bg-background border-primary/10 rounded-lg"
                  />
                ) : (
                  <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{sub.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}