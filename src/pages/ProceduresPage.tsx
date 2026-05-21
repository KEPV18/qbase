import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  BookOpen, Search, ChevronDown, ChevronRight, Printer, ArrowUp,
} from "lucide-react";
import { PROCEDURES_METADATA, PROCEDURES_CONTENT, type ProcedureSection } from "@/lib/ProceduresContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ProceduresPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(PROCEDURES_CONTENT.map(s => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  const filteredContent = useMemo(() => {
    if (!searchQuery) return PROCEDURES_CONTENT;
    const q = searchQuery.toLowerCase();
    return PROCEDURES_CONTENT.filter(section =>
      section.title.toLowerCase().includes(q) ||
      section.purpose.toLowerCase().includes(q) ||
      section.scope.toLowerCase().includes(q) ||
      section.procedureText.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Scroll to top handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300);
  };

  const scrollToTop = () => {
    document.getElementById("procedures-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Procedures" }]} className="!p-0 !max-w-none">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 lg:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{PROCEDURES_METADATA.company} Procedures</h1>
            <p className="text-xs text-muted-foreground">
              {PROCEDURES_METADATA.documentPrefix} · Rev {PROCEDURES_METADATA.revisionNo} · Approved {PROCEDURES_METADATA.approvalDate}
            </p>
          </div>

          {/* Search */}
          <div className="hidden md:flex relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search procedures…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-secondary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden md:flex">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        id="procedures-scroll"
        className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 overflow-y-auto"
        onScroll={handleScroll}
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        {/* Metadata bar */}
        <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/30 rounded-lg border border-border text-xs text-muted-foreground">
          <span><strong className="text-foreground">Prepared by:</strong> {PROCEDURES_METADATA.preparedBy}</span>
          <span><strong className="text-foreground">Approved by:</strong> {PROCEDURES_METADATA.approvedBy}</span>
          <span><strong className="text-foreground">Date:</strong> {PROCEDURES_METADATA.approvalDate}</span>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {filteredContent.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div key={section.id} className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{section.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.purpose}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                  )}
                </button>

                {/* Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 space-y-4 animate-fade-up">
                    {/* Purpose */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Purpose</h4>
                      <p className="text-sm whitespace-pre-line">{section.purpose}</p>
                    </div>
                    {/* Scope */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope</h4>
                      <p className="text-sm whitespace-pre-line">{section.scope}</p>
                    </div>
                    {/* Responsibilities */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Responsibilities</h4>
                      <p className="text-sm">{section.responsibilities}</p>
                    </div>
                    {/* Procedure Text */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Procedure</h4>
                      <div className="text-sm whitespace-pre-line bg-secondary/20 rounded-lg p-4 border border-border/50">
                        {section.procedureText}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No procedures match your search.</p>
          </div>
        )}
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </AppShell>
  );
}