import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FileText, Bell, Moon, Sun,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRecordPage } from "@/hooks/useCompliance";
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

/**
 * Which field of a row the search term hit.
 *
 * The badge beside a result says WHERE the hit was, so the same three
 * checks run here as the server's filter runs there — serial, then the
 * form name, then the form code.
 */
function classifyMatch(row: RecordData, q: string): string {
  const serial = String(row.serial ?? '').toLowerCase();
  const formName = String(row.formName ?? '').toLowerCase();
  const formCode = String(row.formCode ?? '').toLowerCase();
  if (serial.includes(q)) return 'serial';
  if (formName.includes(q)) return 'name';
  if (formCode.includes(q)) return 'code';
  return 'data';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();

  // The search is asked of the SERVER, and only while the user is typing.
  //
  // This bar used to hold the whole register — every row, every form_data
  // blob — on EVERY page, because the top bar is on every page.  The
  // search itself now costs one filtered page, and nothing at all until
  // a term is typed.
  const { data: searchPage } = useRecordPage(
    useMemo(() => (searchTerm.trim() ? { search: searchTerm.trim() } : {}), [searchTerm]),
    { page: 0, pageSize: 10, sort: 'form_code', enabled: searchTerm.trim().length > 0 },
  );

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
    if (!searchPage) return;
    const q = searchTerm.toLowerCase();
    // The server matched on the serial, the form name and the form code —
    // the same three fields, in the same order, as the old client-side
    // scan.  (The old scan also walked `form_data`, a field the record
    // parser never populates — the business fields are FLATTENED onto the
    // record — so that fourth check never matched anything.)
    setResults(searchPage.rows.slice(0, 10).map(r => ({
      serial: String(r.serial ?? ''),
      formName: String(r.formName ?? ''),
      formCode: String(r.formCode ?? ''),
      match: classifyMatch(r, q),
    })));
    setShowSearchDropdown(true);
  }, [searchTerm, searchPage]);

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