import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ChevronDown,
  Search, FileText, Folder, FileCode, Table, Loader2,
  Menu, X, Layers, Wrench, Briefcase, BookOpen,
  ExternalLink, AlertTriangle,
} from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { searchProjectDrive, DriveSearchResult } from "@/lib/driveService";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useQMSRecords } from "@/hooks/useQMSData";
import type { FileReview } from "@/lib/googleSheets";
import { MODULE_NAV_ITEMS, DOCS_NAV_ITEMS, TOOL_NAV_ITEMS, type NavItem } from "@/config/modules";
import qmsLogo from "@/assets/qms-logo.png";

const moduleItems = MODULE_NAV_ITEMS;
const docsItems = DOCS_NAV_ITEMS;
const toolItems = TOOL_NAV_ITEMS;

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: records } = useQMSRecords();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<DriveSearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  const projects = useMemo(() => {
    if (!records) return [];
    const projs = new Set<string>();
    records.forEach(r => {
      const fileReviews = r.fileReviews as Record<string, FileReview> | undefined;
      const files = r.files;
      if (fileReviews) {
        const existingFileIds = files ? new Set(files.map(f => f.id)) : null;
        Object.entries(fileReviews).forEach(([fileId, review]) => {
          if (existingFileIds && !existingFileIds.has(fileId)) return;
          const name = (review.project === "General / All Company" || !review.project) ? "General" : review.project;
          projs.add(name);
        });
      }
    });
    return Array.from(projs).sort();
  }, [records]);

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    async function checkStatus() {
      const token = await getAccessToken();
      setDriveConnected(!!token);
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // Search logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);
      try {
        const driveResults = await searchProjectDrive(searchTerm);
        setResults(driveResults);
      } catch {
        toast.error("Search failed", { description: "Could not search Drive files." });
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-accent" />;
    if (mimeType.includes("spreadsheet")) return <Table className="w-4 h-4 text-success" />;
    if (mimeType.includes("document")) return <FileText className="w-4 h-4 text-primary" />;
    if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const getFileTypeInfo = (file: DriveSearchResult) => {
    const name = file.name;
    const mime = file.mimeType;
    if (name.match(/[A-Z]+\/\d+-\d+/i)) return { label: "Record", color: "bg-success/20 text-success border-success/20" };
    if (name.match(/[A-Z]+\/\d+/i) || name.toLowerCase().includes("template")) return { label: "Form", color: "bg-accent/20 text-accent border-accent/20" };
    if (mime.includes("folder")) return { label: "Folder", color: "bg-muted text-muted-foreground border-border" };
    if (mime.includes("spreadsheet")) return { label: "Sheet", color: "bg-success/20 text-success border-success/20" };
    if (mime.includes("document")) return { label: "Doc", color: "bg-primary/20 text-primary border-primary/20" };
    if (mime.includes("pdf")) return { label: "PDF", color: "bg-destructive/20 text-destructive border-destructive/20" };
    return { label: "File", color: "bg-muted text-muted-foreground border-border" };
  };

  const handleNavClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
      setActiveDropdown(null);
      setIsMobileOpen(false);
    }
  };

  const handleProjectClick = (projectName: string) => {
    navigate(`/project/${encodeURIComponent(projectName)}`);
    setActiveDropdown(null);
    setIsMobileOpen(false);
  };

  const isActive = (item: NavItem): boolean => {
    if (item.path && location.pathname === item.path) return true;
    if (item.id === "dashboard" && location.pathname === "/") return true;
    if (location.pathname.includes(`/module/${item.id}`)) return true;
    return false;
  };

  const openDropdown = (id: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(id);
  };

  const closeDropdown = () => {
    dropdownTimerRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const DropdownMenu = ({ id, label, icon: Icon, items }: { id: string; label: string; icon: React.ElementType; items: NavItem[] }) => (
    <div
      className="relative"
      onMouseEnter={() => openDropdown(id)}
      onMouseLeave={closeDropdown}
    >
      <button
        aria-label={label}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-sm",
          activeDropdown === id
            ? "text-primary bg-primary/5"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden lg:inline">{label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", activeDropdown === id && "rotate-180")} />
      </button>
      {activeDropdown === id && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-sm shadow-lg z-50 animate-fade-in">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-muted/50",
                isActive(item) ? "text-primary bg-primary/5" : "text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-neon-cyan/8">
        <div className="flex items-center h-14 px-4 gap-2">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-sm overflow-hidden flex-shrink-0 border border-neon-cyan/20 shadow-sm">
                <img src={qmsLogo} alt="QMS" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold text-foreground tracking-tight">QMS Suite</span>
                <span className="ml-2 text-[9px] font-mono font-bold text-primary/50 uppercase tracking-widest">ISO 9001</span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 ml-2">
              <button
                aria-label="Dashboard"
                onClick={() => navigate("/")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-sm",
                  location.pathname === "/"
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden lg:inline">Dashboard</span>
              </button>

              <DropdownMenu id="modules" label="Modules" icon={Layers} items={moduleItems} />

              <DropdownMenu id="docs" label="Manual & Procedures" icon={BookOpen} items={docsItems.filter(item => item.id === "iso-manual" || item.id === "procedures")} />

              <DropdownMenu id="tools" label="Tools" icon={Wrench} items={toolItems} />

              {(projects.length > 0) && (
                <button
                  aria-label="Projects"
                  onClick={() => navigate("/projects")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-sm",
                    location.pathname.startsWith("/project")
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden lg:inline">Projects</span>
                </button>
              )}

            </nav>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
              <Input
                placeholder="Search files..."
                className="pl-9 pr-4 bg-muted/30 border-border/50 rounded-sm h-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/30 transition-all placeholder:text-muted-foreground/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowSearchDropdown(true)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-sm shadow-lg overflow-hidden animate-fade-in z-50">
                  <div className="max-h-[320px] overflow-y-auto">
                    {results.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-muted-foreground bg-muted/30 border-b border-border/50 uppercase tracking-wider">
                          {results.length} results
                        </div>
                        {results.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}
                            className="px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-sm bg-background/60 flex items-center justify-center border border-border/50 flex-shrink-0">
                                {getFileIcon(file.mimeType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[13px] font-medium text-foreground truncate">{file.name}</p>
                                  {(() => {
                                    const typeInfo = getFileTypeInfo(file);
                                    return (
                                      <span className={cn("text-[8px] px-1 py-0.5 rounded-sm font-bold border uppercase shrink-0", typeInfo.color)}>
                                        {typeInfo.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                {file.path && (
                                  <span className="text-[10px] text-muted-foreground font-mono">{file.path}</span>
                                )}
                              </div>
                              <ExternalLink className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : searchTerm.length >= 2 && !isSearching ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">No results found</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-2">
            {driveConnected === false && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-[9px] gap-1 px-2 rounded-sm font-bold uppercase tracking-wider"
                onClick={() => window.open('/api/auth', '_blank', 'noopener,noreferrer')}
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">Connect Drive</span>
              </Button>
            )}

            {driveConnected === true && (
              <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-sm bg-success/10 border border-success/20 text-success">
                <div className="w-1.5 h-1.5 rounded-none bg-success animate-glow-pulse" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Drive</span>
              </div>
            )}

            <UserDropdown
              onOpenSettings={() => setIsSettingsOpen(true)}
              onNavigate={(path: string) => navigate(path)}
            />

            {/* Mobile hamburger */}
            <button
              aria-label="Open menu"
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile Menu Panel */}
      <div className={cn(
        "md:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-card border-l border-border transition-transform duration-300 ease-in-out flex flex-col",
        isMobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm overflow-hidden border border-neon-cyan/20">
              <img src={qmsLogo} alt="QMS" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold">QMS Suite</span>
          </div>
          <button aria-label="Close menu" onClick={() => setIsMobileOpen(false)} className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search files..."
              className="pl-9 pr-4 bg-muted/30 border-border rounded-sm h-9 text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <MobileNavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={location.pathname === "/"}
            onClick={() => { navigate("/"); setIsMobileOpen(false); }}
          />

          <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Modules</div>
          {moduleItems.map(item => (
            <MobileNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={isActive(item)}
              onClick={() => { handleNavClick(item); setIsMobileOpen(false); }}
            />
          ))}

          <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Manual & Procedures</div>
          {docsItems.filter(item => item.id === "iso-manual" || item.id === "procedures").map(item => (
            <MobileNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={isActive(item)}
              onClick={() => { handleNavClick(item); setIsMobileOpen(false); }}
            />
          ))}
                  <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Tools</div>
          {toolItems.map(item => (
            <MobileNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={isActive(item)}
              onClick={() => { handleNavClick(item); setIsMobileOpen(false); }}
            />
          ))}

          <MobileNavItem
            icon={Briefcase}
            label="Projects"
            active={location.pathname.startsWith("/project")}
            onClick={() => { navigate("/projects"); setIsMobileOpen(false); }}
          />

        </nav>

        {/* Mobile footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-mono font-bold text-primary">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate">{user?.name || "Guest"}</p>
              <p className="text-[10px] text-muted-foreground font-mono capitalize">{user?.role || "user"}</p>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}

function MobileNavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-sm transition-colors",
        active
          ? "text-primary bg-primary/5 border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}