import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ChevronDown, Search, FileText, Loader2,
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

interface SearchResult {
  serial: string;
  formName: string;
  formCode: string;
  match: string;
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

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) { setResults([]); setShowSearchDropdown(false); return; }
    if (!records) return;
    const q = searchTerm.toLowerCase();
    const matches: SearchResult[] = [];
    records.forEach(r => {
      const serial = (r.serial as string)?.toLowerCase() || '';
      const formName = (r.formName as string)?.toLowerCase() || '';
      const formCode = (r.formCode as string)?.toLowerCase() || '';
      if (serial.includes(q)) matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'serial' });
      else if (formName.includes(q)) matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'name' });
      else if (formCode.includes(q)) matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'code' });
    });
    setResults(matches.slice(0, 12));
    setShowSearchDropdown(true);
  }, [searchTerm, records]);

  const handleDropdownEnter = (id: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(id);
  };
  const handleDropdownLeave = () => {
    dropdownTimerRef.current = setTimeout(() => setActiveDropdown(null), 200);
  };

  const navSections = [
    { label: "Modules", items: moduleItems },
    { label: "Documents", items: docsItems },
    { label: "Tools", items: toolItems },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4">
            {/* Logo */}
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <img src={brandLogo} alt="" className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">{displayName || "QBase"}</span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
              {navSections.map(section => (
                <div
                  key={section.label}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(section.label)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}>
                    {section.label} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  {activeDropdown === section.label && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 animate-fade-up z-50">
                      {section.items.map((item: NavItem) => (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setActiveDropdown(null); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => navigate('/audit')} className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}>
                Audit
              </button>
            </nav>

            {/* Search */}
            <div className="hidden md:block relative flex-1 max-w-xs ml-auto" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search records…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowSearchDropdown(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchDropdown(false); }}
                className="pl-9 h-9 text-sm bg-secondary/50 border-border/50"
              />
              {showSearchDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 max-h-80 overflow-y-auto z-50">
                  {results.map(r => (
                    <button
                      key={r.serial}
                      onClick={() => { navigate(`/records/${encodeURIComponent(r.serial)}`); setShowSearchDropdown(false); setSearchTerm(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-secondary flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.serial}</p>
                        <p className="text-xs text-muted-foreground">{r.formName}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{r.formCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-2">
              <UserDropdown />
              <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden p-2 rounded-md hover:bg-secondary">
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-72 bg-background border-l border-border shadow-xl overflow-y-auto animate-slide-in-right">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Menu</span>
                <button onClick={() => setIsMobileOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              {navSections.map(section => (
                <div key={section.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.label}</p>
                  <div className="space-y-1">
                    {section.items.map((item: NavItem) => (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setIsMobileOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary flex items-center gap-2"
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => { navigate('/audit'); setIsMobileOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary"
              >
                Audit
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}