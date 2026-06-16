import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FileText, Bell, Moon, Sun,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRecords } from "@/hooks/useRecordStorage";
import { cn } from "@/lib/utils";
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
    const visited = new Set<string>();
    records.forEach(r => {
      const serial = (r.serial as string)?.toLowerCase() || '';
      const formName = (r.formName as string)?.toLowerCase() || '';
      const formCode = (r.formCode as string)?.toLowerCase() || '';

      // Match serial
      if (serial.includes(q) && !visited.has(r.serial as string)) {
        visited.add(r.serial as string);
        matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'serial' });
        return;
      }
      // Match form name
      if (formName.includes(q) && !visited.has(r.serial as string)) {
        visited.add(r.serial as string);
        matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'name' });
        return;
      }
      // Match form code
      if (formCode.includes(q) && !visited.has(r.serial as string)) {
        visited.add(r.serial as string);
        matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'code' });
        return;
      }

      // Deep search: scan form_data JSONB fields for match
      if (r.form_data && typeof r.form_data === 'object') {
        const fd = r.form_data as Record<string, unknown>;
        for (const val of Object.values(fd)) {
          if (typeof val === 'string' && val.toLowerCase().includes(q)) {
            if (!visited.has(r.serial as string)) {
              visited.add(r.serial as string);
              matches.push({ serial: r.serial as string, formName: r.formName as string, formCode: r.formCode as string, match: 'data' });
              return;
            }
          }
        }
      }
    });
    setResults(matches.slice(0, 10));
    setShowSearchDropdown(true);
  }, [searchTerm, records]);

  return (
    <>
      {/* TopNav Capsule */}
      <div className="bg-white dark:bg-[#232220] border border-[#e8e3db] dark:border-[#3a3834] rounded-xl px-5 py-3 flex items-center justify-between shrink-0">
        {/* Left — Active Page */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2d2d2d] flex items-center justify-center">
            <img src={brandLogo} alt="" className="w-4 h-4 object-contain invert" />
          </div>
          <div>
            <p className="text-[11px] font-heading font-semibold text-[#9f9a8f] uppercase tracking-wider">Active Page</p>
            <p className="text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{pageLabel}</p>
          </div>
        </div>

        {/* Center — Global Search */}
        <div className="hidden md:block relative flex-1 max-w-md mx-8" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9f9a8f]" />
          <input
            type="text"
            placeholder="Search records…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowSearchDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchDropdown(false); }}
            className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#f8f6f1] border border-[#e8e3db] text-sm text-[#2d2d2d] dark:text-[#e8e3db] dark:bg-[#1a1a18] dark:border-[#3a3834] placeholder:text-[#9f9a8f] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/10 focus:border-[#2d2d2d]/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#ece8df] dark:bg-[#302e2a] border border-[#e8e3db] dark:border-[#3a3834] text-[10px] font-medium text-[#9f9a8f]">
            ⌘ F
          </kbd>
          {showSearchDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#232220] border border-[#e8e3db] dark:border-[#3a3834] rounded-lg py-1 max-h-80 overflow-y-auto z-50">
              {results.map(r => (
                <button
                  key={r.serial}
                  onClick={() => { navigate(`/records/${encodeURIComponent(r.serial)}`); setShowSearchDropdown(false); setSearchTerm(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f8f6f1] dark:hover:bg-[#1a1a18] flex items-center gap-3 transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#9f9a8f] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3db] truncate">{r.serial}</p>
                    <p className="text-xs text-[#7a756a]">{r.formName}</p>
                  </div>
                  <span className="text-xs text-[#7a756a] shrink-0 font-mono bg-[#f8f6f1] dark:bg-[#1a1a18] rounded px-1.5 py-0.5">{r.formCode}</span>
                  <span className={cn(
                    "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium",
                    r.match === 'serial' && "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
                    r.match === 'name' && "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
                    r.match === 'code' && "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
                    r.match === 'data' && "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
                  )}>{r.match}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Utilities + Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-[#9f9a8f] hover:text-[#2d2d2d] hover:bg-[#f8f6f1] dark:hover:bg-[#1a1a18] transition-colors"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 rounded-lg text-[#9f9a8f] hover:text-[#2d2d2d] hover:bg-[#f8f6f1] dark:hover:bg-[#1a1a18] transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#e8e3db] dark:bg-[#3a3834] mx-1" />
        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}