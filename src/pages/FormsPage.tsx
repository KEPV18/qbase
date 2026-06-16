// ============================================================================
// QBase — Forms Registry (Ultra-Minimalist)
// Digital Filing Cabinet: clean rows, generous whitespace, zero clutter.
// Inspired by Linear/Vercel record listings.
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import {
  FileText, Search, Folder, Clock, ChevronDown, ChevronRight,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface FormEntry {
  code: string;
  name: string;
  sectionName: string;
  section: number;
  frequency: string;
  description: string;
  recordCount: number;
  lastRecordDate: string | null;
  _overdue: boolean;
}

function parseFormEntries(records: any[]): FormEntry[] {
  const recordByForm = new Map<string, { count: number; lastDate: string | null }>();
  records?.forEach(r => {
    const code = r.formCode as string;
    const ex = recordByForm.get(code) || { count: 0, lastDate: null };
    ex.count++;
    const created = r._createdAt as string;
    if (created && (!ex.lastDate || created > ex.lastDate)) ex.lastDate = created;
    recordByForm.set(code, ex);
  });

  return FORM_SCHEMAS.map(s => {
    const info = recordByForm.get(s.code);
    const entry: FormEntry = {
      code: s.code, name: s.name, sectionName: s.sectionName, section: s.section,
      frequency: s.frequency, description: s.description || '',
      recordCount: info?.count || 0, lastRecordDate: info?.lastDate || null,
      _overdue: false,
    };
    entry._overdue = entry.recordCount > 0 && isOverdue(entry);
    return entry;
  });
}

function isOverdue(form: FormEntry): boolean {
  if (!form.lastRecordDate) return false;
  const daysSince = (Date.now() - new Date(form.lastRecordDate).getTime()) / (1000 * 60 * 60 * 24);
  const f = form.frequency.toLowerCase();
  if (f.includes('monthly')) return daysSince > 35;
  if (f.includes('quarterly')) return daysSince > 95;
  if (f.includes('semi')) return daysSince > 190;
  if (f.includes('annual')) return daysSince > 380;
  return false;
}

/* ─── Minimal Status Pill — text only, zero heavy background ─────── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; class: string }> = {
    approved: { text: "Approved", class: "text-emerald-600" },
    pending:  { text: "Pending",  class: "text-amber-600" },
    draft:    { text: "Draft",    class: "text-zinc-400" },
    empty:    { text: "Empty",    class: "text-zinc-400" },
    overdue:  { text: "Overdue",  class: "text-red-500" },
  };
  const s = map[status] || map.draft;
  return <span className={cn("text-xs font-medium", s.class)}>{s.text}</span>;
}

/* ─── Serial Badge — muted monospace chip ─────────────────────────── */
function SerialBadge({ code }: { code: string }) {
  return (
    <span className="font-mono text-[11px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded-md shrink-0">
      {code}
    </span>
  );
}

export default function FormsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading } = useRecords();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const forms = useMemo(() => parseFormEntries(records || []), [records]);

  // Group by section
  const groups = useMemo(() => {
    const g: Record<string, FormEntry[]> = {};
    forms.forEach(f => {
      const sec = f.sectionName || `Section ${f.section}`;
      if (!g[sec]) g[sec] = [];
      g[sec].push(f);
    });
    // Sort by section number
    return Object.fromEntries(Object.entries(g).sort(([,a],[,b]) => {
      const sa = a[0]?.section ?? 99;
      const sb = b[0]?.section ?? 99;
      return sa - sb;
    }));
  }, [forms]);

  // Filter
  const filtered = useMemo(() => {
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    const res: Record<string, FormEntry[]> = {};
    Object.entries(groups).forEach(([sec, fs]) => {
      const ok = fs.filter(f => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
      if (ok.length) res[sec] = ok;
    });
    return res;
  }, [groups, searchQuery]);

  const filled = forms.filter(f => f.recordCount > 0).length;
  const empty = forms.length - filled;
  const overdue = forms.filter(f => f._overdue).length;

  const toggle = (sec: string) => {
    const n = new Set(expanded);
    if (n.has(sec)) n.delete(sec);
    else n.add(sec);
    setExpanded(n);
  };

  const expandAll = () => setExpanded(new Set(Object.keys(groups)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="Forms Registry"
        description={`${forms.length} QMS forms · ${filled} have records · ${empty} empty · ${overdue} overdue`}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search forms by code or name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-transparent border-zinc-200 dark:border-zinc-800 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-zinc-500 hover:text-foreground transition-colors">Expand all</button>
          <span className="text-zinc-300">·</span>
          <button onClick={collapseAll} className="text-xs text-zinc-500 hover:text-foreground transition-colors">Collapse all</button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Clock className="w-4 h-4 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Empty search */}
      {!isLoading && Object.keys(filtered).length === 0 && (
        <div className="py-20 text-center">
          <Folder className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No forms match your search.</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {Object.entries(filtered).map(([sectionName, sectionForms]) => {
          const isOpen = expanded.has(sectionName) || !!searchQuery;
          const secOverdue = sectionForms.filter(f => f._overdue).length;
          const secFilled = sectionForms.filter(f => f.recordCount > 0).length;

          return (
            <div key={sectionName} className="space-y-1">
              {/* Section header — flat text, no box */}
              <button
                onClick={() => toggle(sectionName)}
                className="flex items-center gap-2 w-full group py-1"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                <span className="text-sm font-semibold text-foreground">{sectionName}</span>
                <span className="text-xs text-zinc-400 font-mono">{sectionForms.length}</span>
                {secOverdue > 0 && <span className="text-xs text-red-500 ml-1">{secOverdue} overdue</span>}
                <span className="ml-auto text-xs text-zinc-400">{secFilled}/{sectionForms.length} filled</span>
              </button>

              {/* Rows */}
              {isOpen && (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {sectionForms.map(form => (
                    <div
                      key={form.code}
                      onClick={() => navigate(`/records?formCode=${encodeURIComponent(form.code)}`)}
                      className={cn(
                        "flex items-center gap-4 py-4 px-1 cursor-pointer transition-colors",
                        "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                      )}
                    >
                      {/* Left icon */}
                      <div className="shrink-0">
                        {form.recordCount > 0 ? (
                          <FileText className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <Folder className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>

                      {/* Center — title + badge */}
                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{form.name}</span>
                        <SerialBadge code={form.code} />
                        {form._overdue && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                      </div>

                      {/* Right — status */}
                      <div className="shrink-0 flex items-center gap-3">
                        <span className="text-xs text-zinc-400">
                          {form.recordCount > 0 ? `${form.recordCount} records` : "—"}
                        </span>
                        <StatusPill
                          status={form._overdue ? "overdue" : form.recordCount > 0 ? "approved" : "empty"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
