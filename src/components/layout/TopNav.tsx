import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ChevronDown,
  Search, FileText, Loader2,
  Menu, X, Layers, Wrench, Briefcase, Shield, Activity,
} from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRecords } from "@/hooks/useRecordStorage";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { MODULE_NAV_ITEMS, DOCS_NAV_ITEMS, TOOL_NAV_ITEMS, type NavItem } from "@/config/modules";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import defaultLogo from "@/assets/qms-logo.png";

const moduleItems = MODULE_NAV_ITEMS;
const docsItems = DOCS_NAV_ITEMS;
const toolItems = TOOL_NAV_ITEMS;

// Search result from Supabase records
interface SearchResult {
  serial: string;
  formName: string;
  formCode: string;
  match: string;  // what matched
}

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: records } = useRecords();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search state — searches Supabase records
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Extract unique project names from record formData
  const projects = useMemo(() => {
    if (!records) return [];
    const projs = new Set<string>();
    records.forEach(r => {
      const name = (r.formData as Record<string, unknown>)?.project_name || (r.formData as Record<string, unknown>)?.client_name;
      if (name && typeof name === 'string') projs.add(name);
    });
    return Array.from(projs).sort();
  }, [records]);

  const { displayName, logoUrl } = useTenantIdentity();
  const brandLogo = logoUrl || defaultLogo;

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // Search logic — filters records by serial, formName, formCode, and key formData fields
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
    const timer = setTimeout(() => {
      if (!records) { setResults([]); return; }
      const lower = searchTerm.toLowerCase();
      const matches: SearchResult[] = [];
      records.forEach(r => {
        const fd = (r.formData as Record<string, unknown>) || {};
        // Check serial
        if ((r.serial as string)?.toLowerCase().includes(lower)) {
          matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: r.serial as string });
        }
        // Check form name
        else if ((r.formName as string)?.toLowerCase().includes(lower)) {
          matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: r.formName as string });
        }
        // Check key formData fields
        else {
          for (const [key, val] of Object.entries(fd)) {
            if (typeof val === 'string' && val.toLowerCase().includes(lower)) {
              matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: `${key}: ${val.substring(0, 50)}` });
              break;
            }
          }
        }
      });
      setResults(matches.slice(0, 20));
      setShowSearchDropdown(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, records]);

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
    if (item.path && item.path.startsWith("/module/") && location.pathname.startsWith(item.path)) return true;
    if (item.id === "dashboard" && location.pathname === "/") return true;
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-black/5">
        <div className="flex items-center h-14 px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto gap-2">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-3">
             <button
               onClick={() => navigate("/")}
               className="flex items-center gap-2 hover:opacity-80 transition-opacity"
             >
               <div className="w-7 h-7 rounded-sm overflow-hidden border border-primary/20 ring-1 ring-primary/5">
                 <img src={brandLogo} alt={displayName} className="w-full h-full object-contain" />
               </div>
               <span className="hidden sm:inline text-sm font-bold tracking-tight">{displayName}</span>
             </button>

            <nav className="hidden lg:flex items-center gap-0.5 ml-2">
              <DropdownMenu id="modules" label="Modules" icon={Layers} items={moduleItems} />
              <DropdownMenu id="docs" label="Manual" icon={FileText} items={docsItems} />
              <DropdownMenu id="tools" label="Tools" icon={Wrench} items={toolItems} />

              {user?.role === "admin" && (
                <button
                  onClick={() => navigate("/admin/accounts")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                    location.pathname.startsWith("/admin") 
                      ? "bg-accent/20 text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden lg:inline">Admin</span>
                </button>
              )}

              {projects.length > 0 && (
                <button
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

          {/* Center: Search — searches Supabase records */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
              <Input
                placeholder="Search records by serial, form, or field..."
                className="pl-9 pr-4 bg-muted/30 border-border/50 rounded-sm h-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/30 transition-all placeholder:text-muted-foreground/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowSearchDropdown(true)}
              />
              {showSearchDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-sm shadow-lg overflow-hidden animate-fade-in z-50">
                  <div className="max-h-[320px] overflow-y-auto">
                    {results.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-muted-foreground bg-muted/30 border-b border-border/50 uppercase tracking-wider">
                          {results.length} records
                        </div>
                        {results.map((result) => (
                          <div
                            key={result.serial}
                            onClick={() => { navigate(`/records/${encodeURIComponent(result.serial)}`); setShowSearchDropdown(false); setSearchTerm(''); }}
                            className="px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-sm bg-background/60 flex items-center justify-center border border-border/50 flex-shrink-0">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[13px] font-medium text-foreground truncate">{result.serial}</p>
                                  <span className="text-[8px] px-1 py-0.5 rounded-sm font-bold border uppercase shrink-0 bg-primary/20 text-primary border-primary/20">
                                    {result.formCode}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{result.formName} — {result.match}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : searchTerm.length >= 2 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">No records found</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-2">
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
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm overflow-hidden border border-neon-cyan/20">
              <img src={brandLogo} alt={displayName} className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold">{displayName}</span>
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
              placeholder="Search records..."
              className="pl-9 pr-4 bg-muted/30 border-border rounded-sm h-9 text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <MobileNavItem icon={LayoutDashboard} label="Dashboard" active={location.pathname === "/"} onClick={() => { navigate("/"); setIsMobileOpen(false); }} />

          <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Modules</div>
          {moduleItems.map(item => (
            <MobileNavItem key={item.id} icon={item.icon} label={item.label} active={isActive(item)} onClick={() => { handleNavClick(item); setIsMobileOpen(false); }} />
          ))}

          <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Manual & Procedures</div>
          {docsItems.filter(item => item.id === "iso-manual" || item.id === "procedures").map(item => (
            <MobileNavItem key={item.id} icon={item.icon} label={item.label} active={isActive(item)} onClick={() => { handleNavClick(item); setIsMobileOpen(false); }} />
          ))}

          <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Tools</div>
          {toolItems.map(item => (
            <MobileNavItem key={item.id} icon={item.icon} label={item.label} active={isActive(item)} onClick={() => { handleNavClick(item); setIsMobileOpen(false); }} />
          ))}

          <MobileNavItem icon={Briefcase} label="Projects" active={location.pathname.startsWith("/project")} onClick={() => { navigate("/projects"); setIsMobileOpen(false); }} />

          {user?.role === "admin" && (
            <>
              <div className="px-3 pt-4 pb-2 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Admin</div>
              <MobileNavItem icon={Shield} label="Admin Panel" active={location.pathname.startsWith("/admin")} onClick={() => { navigate("/admin/accounts"); setIsMobileOpen(false); }} />
              <MobileNavItem icon={Activity} label="Activity Log" active={location.pathname === "/activity"} onClick={() => { navigate("/activity"); setIsMobileOpen(false); }} />
            </>
          )}
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