import { Search, FileText, Folder, Layout, FileCode, CheckCircle, ExternalLink, Table, Loader2, Menu, AlertTriangle } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchProjectDrive, DriveSearchResult } from "@/lib/driveService";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

export function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<DriveSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const token = await getAccessToken();
      setDriveConnected(!!token);
    }
    checkStatus();
    
    // Check periodically
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const driveResults = await searchProjectDrive(searchTerm);
        setResults(driveResults);
      } catch (error) {
        toast.error("Search failed", { description: "Could not search Drive files. Please try again." });
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getFileTypeInfo = (file: DriveSearchResult) => {
    const name = file.name;
    const mime = file.mimeType;
    if (name.match(/[A-Z]+\/\d+-\d+/i)) return { label: "Record", color: "bg-success/20 text-success border-success/20" };
    if (name.match(/[A-Z]+\/\d+/i) || name.toLowerCase().includes("template")) return { label: "Form Template", color: "bg-accent/20 text-accent border-accent/20" };
    if (mime.includes("folder")) return { label: "Folder", color: "bg-muted text-muted-foreground border-border" };
    if (mime.includes("spreadsheet")) return { label: "Spreadsheet", color: "bg-success/20 text-success border-success/20" };
    if (mime.includes("document")) return { label: "Document", color: "bg-primary/20 text-primary border-primary/20" };
    if (mime.includes("pdf")) return { label: "PDF", color: "bg-destructive/20 text-destructive border-destructive/20" };
    return { label: "Drive File", color: "bg-muted text-muted-foreground border-border" };
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-accent" />;
    if (mimeType.includes("spreadsheet")) return <Table className="w-4 h-4 text-success" />;
    if (mimeType.includes("document")) return <FileText className="w-4 h-4 text-primary" />;
    if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const searchBar = (
    <div className="relative w-full group" ref={dropdownRef}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
      <Input
        placeholder="Search files and folders..."
        className="pl-11 pr-4 bg-background border border-border rounded-md shadow-sm focus-visible:ring-1 focus-visible:ring-ring transition-all h-10 font-medium"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
      />
      {isSearching && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-md shadow-lg overflow-hidden animate-fade-in z-50">
          <div className="max-h-[400px] overflow-y-auto">
            {results.length > 0 ? (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
                  {results.length} results found
                </div>
                {results.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}
                    className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-background/60 flex items-center justify-center border border-border/50">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          {(() => {
                            const typeInfo = getFileTypeInfo(file);
                            return (
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-sm font-bold border uppercase shrink-0", typeInfo.color)}>
                                {typeInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {file.mimeType.split('.').pop()?.replace('spreadsheet', 'sheet').replace('document', 'doc')}
                          </span>
                          {file.path && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              in <Folder className="w-3 h-3" /> <span className="font-semibold text-foreground/70">{file.path}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  </div>
                ))}
              </>
            ) : searchTerm.length >= 2 && !isSearching ? (
              <div className="p-8 text-center bg-muted/10">
                <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try a more specific file name</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="header h-14 md:h-16 bg-card border-b border-border border-x-0 border-t-0 rounded-none z-40 sticky top-0">
      <div className="flex items-center h-full px-4 md:px-6 gap-3">
        {/* Spacer for mobile hamburger */}
        <div className="w-10 md:hidden" />

        {/* Desktop search */}
        <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl relative group">
          {searchBar}
        </div>

        {/* Global Branding Center */}
        <div className="hidden lg:flex items-center gap-4 px-8 h-full border-x border-border/10">
          <div className="w-12 h-12 rounded-sm bg-white p-2 border border-border/50 shadow-lg shadow-black/5 transition-all hover:scale-105 hover:rotate-3 duration-500 flex-shrink-0">
            <img src={logoImg} alt="Vezloo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-black text-primary/60 uppercase tracking-[0.3em] leading-none mb-1.5 animate-pulse">Official Platform</span>
            <span className="text-xl md:text-2xl font-black text-foreground tracking-tighter leading-none bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Vezloo Group</span>
          </div>
        </div>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-2">
          {driveConnected === false && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="h-8 text-[10px] gap-1.5 px-3 rounded-sm animate-pulse shadow-lg shadow-destructive/20 border-white/20"
              onClick={() => window.open('/api/auth', '_blank', 'noopener,noreferrer')}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold uppercase tracking-wider">Connect Drive</span>
            </Button>
          )}

          {driveConnected === true && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-sm bg-success/10 border border-success/20 text-success mr-2">
               <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Drive Active</span>
            </div>
          )}

          <NotificationBell />
          {/* Mobile search toggle */}
          <button
            aria-label="Search"
            className="md:hidden p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <Search className="w-5 h-5" />
          </button>
          {/* User avatar */}
          <div className="hidden md:flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/15">
              <span className="text-[10px] font-bold text-primary">{userInitials}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search expanded */}
      {showMobileSearch && (
        <div className="md:hidden px-4 pb-3 border-b border-border/30 bg-card">
          {searchBar}
        </div>
      )}
    </header>
  );
}
