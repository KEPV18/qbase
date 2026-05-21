import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getAccessToken } from "@/lib/auth";
import {
  FileText, Folder, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  ExternalLink, Loader2, RefreshCw, List, Grid, Eye, Pencil,
  ArrowLeft, FileCode, Table as TableIcon, Search,
  Library, Archive, Save, X, RotateCcw, ArrowRight, Layers, Info, Printer, User, History, ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProceduresData } from "@/hooks/useProceduresData";
import { PROCEDURES_METADATA } from "@/lib/ProceduresContent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const PROCEDURES_FOLDER_ID = import.meta.env.VITE_PROCEDURES_FOLDER_ID || "";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  createdTime: string;
  size?: string;
}

function getPreviewUrl(file: DriveItem): string {
  if (file.mimeType.includes("google-apps.document") || file.mimeType.includes("google-apps.spreadsheet") || file.mimeType.includes("google-apps.presentation")) {
    const id = file.id;
    if (file.mimeType.includes("document")) return `https://docs.google.com/document/d/${id}/preview`;
    if (file.mimeType.includes("spreadsheet")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    if (file.mimeType.includes("presentation")) return `https://docs.google.com/presentation/d/${id}/preview`;
  }
  if (file.mimeType.includes("wordprocessing") || file.mimeType.includes("msword")) return `https://docs.google.com/document/d/${file.id}/preview`;
  if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("ms-excel")) return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
  if (file.mimeType.includes("presentation") || file.mimeType.includes("ms-powerpoint")) return `https://docs.google.com/presentation/d/${file.id}/preview`;
  if (file.mimeType.includes("pdf")) return `https://drive.google.com/file/d/${file.id}/preview`;
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

function getEditUrl(file: DriveItem): string {
  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/edit`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-accent" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <TableIcon className="w-4 h-4 text-success" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileText className="w-4 h-4 text-primary" />;
  if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <FileText className="w-4 h-4 text-warning" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function getFileTypeBadge(mimeType: string) {
  if (mimeType.includes("document") || mimeType.includes("word")) return { label: "DOC", color: "bg-primary/10 text-primary border-primary/20" };
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return { label: "SHEET", color: "bg-success/10 text-success border-success/20" };
  if (mimeType.includes("pdf")) return { label: "PDF", color: "bg-destructive/10 text-destructive border-destructive/20" };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return { label: "SLIDES", color: "bg-accent/10 text-accent border-accent/20" };
  if (mimeType.includes("folder")) return { label: "FOLDER", color: "bg-muted text-muted-foreground border-border" };
  return { label: "FILE", color: "bg-muted text-muted-foreground border-border" };
}

async function fetchFolderFiles(folderId: string, searchQuery: string = ""): Promise<DriveItem[]> {
  let queryStr = `'${folderId}' in parents and trashed=false`;
  if (searchQuery.trim()) queryStr += ` and fullText contains '${searchQuery.trim()}'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name,mimeType,webViewLink,modifiedTime,createdTime,size)&orderBy=name&key=${API_KEY}&pageSize=100`;
  const token = await getAccessToken();
  const options: RequestInit = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Failed to fetch folder");
  const data = await res.json();
  return data.files || [];
}

export default function ProceduresPage() {
  const [activeTab, setActiveTab] = useState("digital");

  // Digital Procedures State
  const { data: digitalProcedures, updateProcedure, resetToDefault, isLoaded: digitalLoaded } = useProceduresData();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drive State
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [driveSearch, setDriveSearch] = useState("");
  const [debouncedDriveSearch, setDebouncedDriveSearch] = useState("");
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: PROCEDURES_FOLDER_ID, name: "02. Procedures" }
  ]);

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriveSearch(driveSearch), 500);
    return () => clearTimeout(timer);
  }, [driveSearch]);

  const loadDriveFiles = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchFolderFiles(folderStack[folderStack.length - 1].id, debouncedDriveSearch);
      items.sort((a, b) => {
        const aFolder = a.mimeType.includes("folder") ? 0 : 1;
        const bFolder = b.mimeType.includes("folder") ? 0 : 1;
        if (aFolder !== bFolder) return aFolder - bFolder;
        return a.name.localeCompare(b.name);
      });
      setFiles(items);
    } catch (err) {
      console.error("Error");
    } finally {
      setLoading(false);
    }
  }, [folderStack, debouncedDriveSearch]);

  useEffect(() => {
    if (activeTab === "archive") loadDriveFiles();
  }, [activeTab, loadDriveFiles]);

  const filteredProcedures = useMemo(() => {
    if (!searchQuery) return digitalProcedures;
    const query = searchQuery.toLowerCase();
    return digitalProcedures.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.purpose.toLowerCase().includes(query) ||
      p.procedureText.toLowerCase().includes(query)
    );
  }, [searchQuery, digitalProcedures]);

  const nonFolderFiles = files.filter(f => !f.mimeType.includes("folder"));
  const selectedDriveFile = selectedIndex !== null ? nonFolderFiles[selectedIndex] : null;

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(`proc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Procedures" }]} className="!p-0 !max-w-none">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 md:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/15">
            <FileCode className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Quality Procedures</h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 bg-primary/5 text-primary border-primary/15 font-mono">
                {PROCEDURES_METADATA.documentPrefix}
              </Badge>
              <span>Rev {PROCEDURES_METADATA.revisionNo}</span>
              <span>·</span>
              <span>Approved {PROCEDURES_METADATA.approvalDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="grid grid-cols-2 h-9 p-0.5 bg-muted/30 backdrop-blur-sm rounded-lg">
              <TabsTrigger value="digital" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Library className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Digital</span>
              </TabsTrigger>
              <TabsTrigger value="archive" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Archive className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Drive Archive</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex h-[calc(100vh-52px)] overflow-hidden">
        {activeTab === "digital" ? (
          <>
            {/* TOC sidebar */}
            <div className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border/30 bg-muted/5 overflow-y-auto">
              <div className="px-3 pt-4 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Procedures</span>
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-muted/40 border-border/40">{digitalProcedures.length}</Badge>
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
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0",
                      activeSectionId === proc.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground/50"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="truncate leading-tight">{proc.title.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                ))}
              </nav>
              <div className="p-3 border-t border-border/20 bg-muted/10 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-7 h-7 text-[11px] bg-background/50 border-border/40 rounded-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  className="w-full gap-1.5 h-7 text-[10px] rounded-lg"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                  {isEditMode ? "Exit Edit" : "Edit All"}
                </Button>
                {isEditMode && (
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 h-6 text-[10px] text-destructive"
                    onClick={() => confirm("Reset all procedures?") && resetToDefault()}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset all
                  </Button>
                )}
              </div>
              <div className="p-3 border-t border-border/20 bg-muted/10 space-y-1.5 text-[10px]">
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> Prepared</span>
                  <span className="font-semibold text-foreground text-[9px]">{PROCEDURES_METADATA.preparedBy}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approved</span>
                  <span className="font-semibold text-foreground text-[9px]">{PROCEDURES_METADATA.approvedBy}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approval Date</span>
                  <span className="font-semibold text-foreground text-[9px]">{PROCEDURES_METADATA.approvalDate}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Document */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
              <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-0">
                {filteredProcedures.map((proc, procIdx) => (
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
                        <span className="flex items-center gap-1"><History className="w-3 h-3" /> Rev: 01</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> P-SOP-{proc.id.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ===== GOOGLE DRIVE ARCHIVE VIEW ===== */
          <div className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden">
            {/* Breadcrumbs & Controls */}
            <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {folderStack.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setFolderStack(prev => prev.slice(0, -1))} className="h-7 gap-1 text-xs px-2">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </Button>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {folderStack.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span
                        className={cn(i === folderStack.length - 1 ? "text-foreground font-semibold" : "cursor-pointer hover:text-foreground")}
                        onClick={() => i < folderStack.length - 1 && setFolderStack(prev => prev.slice(0, i + 1))}
                      >
                        {f.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={driveSearch} onChange={(e) => setDriveSearch(e.target.value)} className="pl-8 h-7 text-xs bg-muted/20 border-border/50 rounded-lg" />
                </div>
                <Button variant="ghost" size="icon" onClick={loadDriveFiles} className="h-7 w-7">
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")} className="h-7 w-7">
                  {viewMode === "list" ? <Grid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {selectedDriveFile ? (
              /* File Viewer */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedIndex(null)} className="h-7 gap-1 text-xs rounded-lg px-2">
                      <ArrowLeft className="w-3.5 h-3.5" /> Files
                    </Button>
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(selectedDriveFile.mimeType)}
                      <span className="text-xs font-semibold truncate">{selectedDriveFile.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] h-5 font-mono">
                      {(selectedIndex ?? 0) + 1}/{nonFolderFiles.length}
                    </Badge>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setSelectedIndex(selectedIndex! > 0 ? selectedIndex! - 1 : 0)} disabled={selectedIndex === 0}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setSelectedIndex(selectedIndex! < nonFolderFiles.length - 1 ? selectedIndex! + 1 : selectedIndex!)} disabled={selectedIndex === nonFolderFiles.length - 1}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <div className="h-5 w-px bg-border/50 mx-0.5" />
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => window.open(getEditUrl(selectedDriveFile), '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className={cn(
                  "rounded-lg border border-border/50 overflow-hidden bg-card flex-1 shadow-sm",
                  isFullscreen ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-140px)]"
                )}>
                  <iframe key={selectedDriveFile.id} src={getPreviewUrl(selectedDriveFile)} className="w-full h-full" title={selectedDriveFile.name} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
              </div>
            ) : (
              /* File List */
              loading ? (
                <div className="flex-1 flex items-center justify-center py-16 opacity-60">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === "grid" ? (
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => file.mimeType.includes("folder") ? setFolderStack(prev => [...prev, { id: file.id, name: file.name }]) : setSelectedIndex(nonFolderFiles.findIndex(f => f.id === file.id))}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/30 transition-all text-center group ds-hover-lift"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <span className="text-[11px] font-medium truncate w-full">{file.name}</span>
                        <Badge variant="outline" className={cn("text-[8px] h-4", getFileTypeBadge(file.mimeType).color)}>
                          {getFileTypeBadge(file.mimeType).label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/40 overflow-hidden bg-card flex-1 shadow-sm">
                  <ScrollArea className="h-full">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => file.mimeType.includes("folder") ? setFolderStack(prev => [...prev, { id: file.id, name: file.name }]) : setSelectedIndex(nonFolderFiles.findIndex(f => f.id === file.id))}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 cursor-pointer border-b border-border/20 last:border-0 transition-colors group ds-hover-lift"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getFileIcon(file.mimeType)}
                          <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className={cn("text-[8px] h-4", getFileTypeBadge(file.mimeType).color)}>
                            {getFileTypeBadge(file.mimeType).label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground w-16 text-right">{new Date(file.modifiedTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Scroll to top (digital tab only) */}
      {activeTab === "digital" && showScrollTop && (
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