// ============================================================================
// QBase — Global Command Palette (Prime §D7)
// ---------------------------------------------------------------------------
// "command palette (cmdk) with global search across records+modules+actions,
//  keyboard nav in lists" — one ⌘K surface that searches the three things
// the app actually has: navigation routes (modules), real records,
// and user-facing actions. The records are searched through the SERVER
// (one filtered page, not the whole table), and the browser never writes
// anything: every item is pure navigation §5.
//
// Open triggers: ⌘K / Ctrl+K anywhere, or the TopNav search-chip button
// (dispatches the OPEN_EVENT below). cmdk provides keyboard navigation
// (arrows + Enter) for every list rendered here.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  FileText, ClipboardList, FolderKanban, Gauge, Target, ScrollText,
  ShieldCheck, Bell, BookOpen, Settings, PlusCircle, Database,
  SunMoon, Workflow, Search, ArrowRight, Radar,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRecordPage } from "@/hooks/useCompliance";
import { useTheme } from "@/hooks/useTheme";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

const OPEN_EVENT = "qbase:open-command-palette";

/** Fire-and-forget opener for other shell components (TopNav search chip). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

interface PaletteItem {
  label: string;
  path: string;
  keywords?: string;
}

const MODULE_ROUTES: PaletteItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Forms Registry", path: "/forms" },
  { label: "Compliance Report", path: "/compliance", keywords: "overdue missing filings gap radar" },
  { label: "Procedures", path: "/procedures" },
  { label: "Projects", path: "/projects" },
  { label: "KPI Dashboard", path: "/kpi" },
  { label: "KPI Reports", path: "/kpi/reports" },
  { label: "SWOT Analysis", path: "/swot-analysis" },
  { label: "Audit Trail", path: "/activity" },
  { label: "Analytics", path: "/audit" },
  { label: "Traceability", path: "/traceability" },
  { label: "Data Integrity", path: "/integrity" },
  { label: "Notifications", path: "/notifications" },
  { label: "ISO Manual", path: "/iso-manual" },
  { label: "Records List", path: "/records" },
  { label: "Settings", path: "/settings" },
];

const ACTION_ITEMS: PaletteItem[] = [
  { label: "Create Record", path: "/create", keywords: "new record form draft submit" },
  { label: "Open Approval Queue", path: "/approvals", keywords: "approve pending review" },
  { label: "Open Approvals (Admin)", path: "/admin/approvals", keywords: "admin approve" },
  { label: "Database & Error Reports", path: "/admin/database", keywords: "backup restore error reports admin" },
  { label: "Admin Accounts", path: "/admin/accounts", keywords: "admin users profiles" },
];

const MODULE_ICONS: Record<string, React.ElementType> = {
  "/": FileText,
  "/forms": ClipboardList,
  "/compliance": Radar,
  "/procedures": BookOpen,
  "/projects": FolderKanban,
  "/kpi": Gauge,
  "/kpi/reports": Gauge,
  "/swot-analysis": Target,
  "/activity": ScrollText,
  "/audit": ScrollText,
  "/traceability": Workflow,
  "/integrity": ShieldCheck,
  "/notifications": Bell,
  "/iso-manual": BookOpen,
  "/records": FileText,
  "/settings": Settings,
  "/create": PlusCircle,
  "/approvals": ShieldCheck,
  "/admin/approvals": ShieldCheck,
  "/admin/database": Database,
  "/admin/accounts": Settings,
};

/** Same match semantics as the TopNav inline search (serial → name → code). */
function matchRecord(r: RecordData, q: string): boolean {
  const serial = String(r.serial ?? "").toLowerCase();
  const formName = String(r.formName ?? "").toLowerCase();
  const formCode = String(r.formCode ?? "").toLowerCase();
  return serial.includes(q) || formName.includes(q) || formCode.includes(q);
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The term the palette filters on.  It is declared BEFORE the query that
  // uses it: a `const` read above its own declaration is a temporal-dead-zone
  // `ReferenceError`, and the palette is mounted on every page.
  const q = search.trim().toLowerCase();
  // The palette searches the register through the SERVER, and asks for a
  // PAGE — never the whole table.  The palette is mounted on every page,
  // so a whole-table read here cost every page its register.
  const { data: recordPage } = useRecordPage(
    useMemo(() => (q ? { search: q } : {}), [q]),
    { page: 0, pageSize: q ? 8 : 5, sort: 'created_desc' },
  );
  const { resolvedTheme, setTheme } = useTheme();

  // Global open triggers: ⌘K / Ctrl+K (native browser find stays untouched),
  // plus the explicit OPEN_EVENT from the TopNav search chip.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  const moduleItems = useMemo(() => {
    if (!q) return MODULE_ROUTES;
    return MODULE_ROUTES.filter(
      (m) => m.label.toLowerCase().includes(q) || m.path.toLowerCase().includes(q),
    );
  }, [q]);

  const actionItems = useMemo(() => {
    if (!q) return ACTION_ITEMS;
    return ACTION_ITEMS.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.keywords ?? "").toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q),
    );
  }, [q]);

  const recordHits = useMemo((): RecordData[] => {
    const rows = recordPage?.rows ?? [];
    if (q) return rows;
    // With no term the palette shows the most recent records — the server
    // sorts them by creation date, newest first.
    return rows;
  }, [recordPage, q]);

  const showRecords = q || recordHits.length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
      <DialogContent
        className="top-[18%] translate-y-0 p-0 overflow-hidden rounded-xl max-w-xl gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command shouldFilter={false} loop className="w-full">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Search records, modules, actions…"
              className="w-full bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] font-medium text-muted-foreground shrink-0">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {q ? `No matches for “${search}”.` : "Nothing to show."}
            </Command.Empty>

            {moduleItems.length > 0 && (
              <Command.Group heading="Modules" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {moduleItems.map((m) => (
                  <Item key={m.path} label={m.label} hint={m.path} icon={MODULE_ICONS[m.path] ?? FileText} onSelect={() => go(m.path)} />
                ))}
              </Command.Group>
            )}

            {actionItems.length > 0 && (
              <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {actionItems.map((a) => (
                  <Item key={a.path} label={a.label} hint="action" icon={MODULE_ICONS[a.path] ?? ArrowRight} onSelect={() => go(a.path)} />
                ))}
                <Item
                  label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  hint="action"
                  icon={SunMoon}
                  onSelect={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setOpen(false); }}
                />
              </Command.Group>
            )}

            {showRecords && (
              <Command.Group heading={q ? "Records" : "Recent records"} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {recordHits.map((r) => {
                  const serial = String(r.serial ?? "");
                  return (
                    <Item
                      key={serial}
                      label={serial}
                      hint={`${String(r.formCode ?? "")} · ${String(r.formName ?? "")}`}
                      icon={FileText}
                      onSelect={() => go(`/records/${encodeURIComponent(serial)}`)}
                    />
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  label, hint, icon: Icon, onSelect,
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
    >
      <Icon className="w-4 h-4 text-ink-4 shrink-0" />
      <span className="font-medium text-foreground truncate">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground truncate">{hint}</span>
    </Command.Item>
  );
}