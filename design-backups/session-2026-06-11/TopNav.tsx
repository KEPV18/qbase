import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FileText, Bell, Moon, Sun,
} from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRecords } from "@/hooks/useRecordStorage";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import { useTheme } from "@/hooks/useTheme";
import defaultLogo from "@/assets/qms-logo.png";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

interface SearchResult {
  serial: string;
  formName: string;
  formCode: string;
  match: string;
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/records": "Records",
  "/forms": "Forms Registry",
  "/audit": "Analytics",
  "/activity": "Audit Trail",
  "/approvals": "Approval Queue",
  "/notifications": "Notifications",
  "/procedures": "Procedures",
  "/iso-manual": "ISO Manual",
  "/projects": "Projects",
  "/kpi": "KPI Dashboard",
  "/kpi/reports": "KPI Reports",
  "/swot-analysis": "SWOT Analysis",
  "/traceability": "Traceability",
  "/integrity": "Data Integrity",
  "/admin/accounts": "Admin Panel",
  "/admin/database": "Database",
  "/admin/approvals": "Approvals",
  "/create": "Create Record",
  "/module": "Module",
};

function getPageLabel(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith("/records/")) return "Record View";
  if (path.startsWith("/project/")) return "Project";
  if (path.startsWith("/module/")) return "Module";
  if (path.startsWith("/traceability/")) return "Traceability";
  return "QBase";
}

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: records } = useRecords();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();

  const { displayName, logoUrl } = useTenantIdentity();
  const brandLogo = logoUrl || defaultLogo;
  const pageLabel = getPageLabel(location.pathname);

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
    setResults(matches.slice(0, 8));
    setShowSearchDropdown(true);
  }, [searchTerm, records]);

  return (
    <>
      {/* TopNav Capsule */}
      <div className="bg-white/90 dark:bg-zinc-900/90 border border-slate-200/50 dark:border-zinc-800/60 rounded-2xl px-6 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between shrink-0">
        {/* Left — Active Page */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <img src={brandLogo} alt="" className="w-4 h-4 object-contain invert" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Active Page</p>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{pageLabel}</p>
          </div>
        </div>

        {/* Center — Global Search */}
        <div className="hidden md:block relative flex-1 max-w-md mx-8" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search records…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowSearchDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchDropdown(false); }}
            className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            ⌘ F
          </kbd>
          {showSearchDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-lg py-1 max-h-80 overflow-y-auto z-50">
              {results.map(r => (
                <button
                  key={r.serial}
                  onClick={() => { navigate(`/records/${encodeURIComponent(r.serial)}`); setShowSearchDropdown(false); setSearchTerm(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex items-center gap-3 transition-colors"
                >
                  <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.serial}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.formName}</p>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 font-mono bg-slate-50 dark:bg-zinc-800 rounded px-1.5 py-0.5">{r.formCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Utilities + Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-100 dark:bg-zinc-800 mx-1" />
          <UserDropdown onOpenSettings={() => setIsSettingsOpen(true)} onNavigate={(path) => navigate(path)} />
        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}