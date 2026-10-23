import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FileText, Bell, Moon, Sun,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRecords } from "@/hooks/useRecordStorage";
import { cn } from "@/lib/utils";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import { useTheme } from "@/hooks/useTheme";
import { openCommandPalette } from "./CommandPalette";
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
  "/forms": "Forms Registry",
  "/compliance": "Compliance Report",
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
  "/settings": "Settings",
  "/create": "Create Record",
  "/module": "Module",
};

function getPageLabel(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith("/records/")) return "Record View";
  if (path.startsWith("/project/")) return "Project";
  if (path.startsWith("/traceability/")) return "Traceability";
  return "QBase";
}

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: records } = useRecords();
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
        const fd = r.form_data as unknown as Record<string, unknown>;
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
      {/* TopNav bar.
          This bar is a solid surface, not glass: it does not overlay
          anything — it sits above the page in normal flow, with the
          scrolling content starting below it.  The previous
          `bg-background/80 backdrop-blur-xl` blurred nothing, because
          there was no layer beneath it to refract; the skill reserves
          `backdrop-filter` for surfaces that genuinely overlap content
          (the sticky page headers, the mobile sidebar drawer, the mobile
          tab bar).  The desktop sidebar is solid for the same reason: it
          sits beside the content, not over it. */}
      <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center justify-between grow shrink-0">
        {/* Left — Active Page */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground dark:bg-card flex items-center justify-center">
            <img src={brandLogo} alt="" className="w-4 h-4 object-contain invert" />
          </div>
          <div>
            <p className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Active Page</p>
            <p className="text-sm font-semibold text-foreground">{pageLabel}</p>
          </div>
        </div>

        {/* Center — Global Search */}
        <div className="hidden md:block relative flex-1 mx-8 min-w-0" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
          <input
            type="text"
            placeholder="Search records…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowSearchDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchDropdown(false); }}
            className="w-full h-11 pl-9 pr-10 rounded-lg bg-background border border-border text-sm text-foreground dark:text-foreground dark:bg-card dark:border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-all"
          />
            {/*
              The ⌘K chip paints at 33x21px, so its 44px target comes
              from the shared `::before` extension, and that extension has
              to be centred on the chip.  The chip is absolutely
              positioned, so it takes `ds-hit-44-anchored` — the shape
              the design system documents for a control that is already
              absolute or fixed (`src/index.css`), and the class every
              other absolutely positioned control in the app already
              carries (Login, Register, ResetPassword, Settings,
              FormsRegistryPage, DataSanitizer).  The centred shape
              measures a 45x44 hit band on the built page, and a click
              10px above the painted chip opens the command palette.
            */}
            <button
              type="button"
              onClick={() => openCommandPalette()}
              title="Open command palette (⌘K)"
              aria-label="Open command palette"
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted dark:bg-muted border border-border dark:border-border text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer ds-hit-44-anchored"
            >
            ⌘ K
          </button>
          {showSearchDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg py-1 max-h-80 overflow-y-auto z-50">
              {results.map(r => (
                <button
                  key={r.serial}
                  onClick={() => { navigate(`/records/${encodeURIComponent(r.serial)}`); setShowSearchDropdown(false); setSearchTerm(''); }}
                  className="w-full min-h-11 text-left px-4 py-2.5 hover:bg-background dark:hover:bg-muted flex items-center gap-3 transition-colors"
                >
                  <FileText className="w-4 h-4 text-ink-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground dark:text-ink-3 truncate">{r.serial}</p>
                    <p className="text-xs text-muted-foreground">{r.formName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono bg-background dark:bg-card rounded-sm px-1.5 py-0.5">{r.formCode}</span>
                  <span className={cn(
                    "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium",
                    r.match === 'serial' && "text-primary-tint bg-primary/10 dark:bg-primary/20",
                    r.match === 'name' && "text-success-tint bg-success/10 dark:bg-success/20",
                    r.match === 'code' && "text-primary-tint bg-primary/10 dark:bg-primary/20",
                    r.match === 'data' && "text-warning-tint bg-warning/10 dark:bg-warning/20",
                  )}>{r.match}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Utilities + Avatar.
            The two icon controls are painted 32px, so each reaches 6px
            past its own edge for the 44px target.  `gap-3` (12px) is
            exactly 6 + 6, so the two targets meet without ever
            overlapping — the earlier control keeps its full 44px. */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-card transition-colors ds-hit-44"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-card transition-colors relative ds-hit-44"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border dark:bg-border mx-1" />
        </div>
      </div>
    </>
  );
}