// ============================================================================
// QBase — Archive Page
// Soft-deleted records live here for 30 days before permanent purge.
// Restore or let nature take its course.
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, Search, RefreshCw, Loader2, AlertTriangle,
  RotateCcw, Trash2, Clock,
} from 'lucide-react';
import { isoToDisplay } from '../schemas';
import { useArchivedRecords, useRestoreRecord } from '../hooks/useRecordStorage';
import { AppShell } from '@/components/layout/AppShell';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

export default function ArchivePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: records, isLoading, error, refetch } = useArchivedRecords();
  const restoreMutation = useRestoreRecord();

  const filtered = useMemo(() => {
    if (!records) return [];
    let list = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.serial as string).toLowerCase().includes(q) ||
        (r.formCode as string).toLowerCase().includes(q) ||
        (r.formName as string).toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await restoreMutation.mutateAsync(id);
      refetch();
    } catch { /* toast handled by hook */ }
  };

  // ─── Loading ──────────────────────────────────────────────
  const breadcrumbs = [{ label: "Dashboard", path: "/" }, { label: "Archive" }];

  if (isLoading) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
        <div className="max-w-5xl mx-auto">
          <div className="ds-skeleton h-10 w-36 mb-6" />
          <div className="ds-skeleton h-10 w-full mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`ds-skeleton h-16 rounded-sm stagger-${Math.min(i + 1, 10)}`} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 ds-fade-enter">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl text-foreground mb-2">Failed to Load Archive</h2>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="max-w-5xl mx-auto page-transition">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="w-6 h-6 text-muted-foreground" />
              Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {records?.length || 0} archived record{(records?.length || 0) !== 1 ? 's' : ''}
              — auto-purged after 30 days
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="ds-press ds-focus-ring px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by serial, form code, or name..."
            className="input-modern w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>

        {/* List */}
        {paged.length === 0 ? (
          <div className="flex flex-col items-center py-16 ds-fade-enter">
            <Archive className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg text-foreground mb-2">Archive Empty</h3>
            <p className="text-sm text-muted-foreground">
              {search ? 'No archived records match your search.' : 'No deleted records yet. Deleted records appear here for 30 days.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {paged.map((record, idx) => (
                <div
                  key={record.id as string}
                  onClick={() => navigate(`/records/${encodeURIComponent(record.serial as string)}`)}
                  className="flex items-center gap-4 p-3 rounded-sm transition-all cursor-pointer group ds-press hover:bg-card hover:border-border/50 border border-transparent"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Serial + Form Code */}
                  <div className="w-28 shrink-0">
                    <span className="font-mono text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      {record.serial as string}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{record.formCode as string}</p>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-primary/90 transition-colors">
                      {record.formName as string}
                    </p>
                  </div>

                  {/* Deleted At */}
                  <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {(record as Record<string, unknown>)._deletedAt
                      ? isoToDisplay((record as Record<string, unknown>)._deletedAt as string)
                      : 'Unknown'}
                  </div>

                  {/* Restore */}
                  <button
                    onClick={(e) => handleRestore(record.id as string, e)}
                    disabled={restoreMutation.isPending}
                    className="ds-press ds-focus-ring shrink-0 px-3 py-1.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 rounded-sm flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    title="Restore record"
                  >
                    {restoreMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RotateCcw className="w-3.5 h-3.5" />
                    }
                    Restore
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} archived record{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="ds-press ds-focus-ring px-3 py-1.5 text-sm bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground px-3">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="ds-press ds-focus-ring px-3 py-1.5 text-sm bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
