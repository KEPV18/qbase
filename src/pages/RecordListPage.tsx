// ============================================================================
// QMS Forge — Record List Page (Phase 9 Refined)
// Consistent design system classes, improved hierarchy, better interactions.
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, AlertTriangle, Eye, ChevronRight, Loader2,
  RefreshCw, Shield, CheckCircle, Download, FileJson, FileSpreadsheet,
  FileText as FileTextIcon, ChevronLeft, ChevronRightIcon,
  CheckSquare, Square, XCircle, XCircle as DeselectAll, ListFilter,
} from 'lucide-react';
import { FORM_SCHEMAS } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { useRecords } from '../hooks/useRecordStorage';
import { evaluateRulesForRecord, getSeverityColor as getIntSeverityColor, type RuleSeverity, type RecordData } from '../services/ruleEngine';
import { getEditRiskLevel } from '../services/recordUtils';
import { exportRecordsToDocx } from '../services/docxExport';
import { exportRecordsToJson, exportRecordsToCsv } from '../services/fileExport';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 12;

const STATUS_STYLES: Record<string, string> = {
  'Open': 'bg-red-500/15 text-red-400 border-red-500/25',
  'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Closed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Verified': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Active': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Completed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'On Hold': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Achieved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'On Track': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Planned': 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

// ============================================================================
// Integrity indicator icons
// ============================================================================

const INTEGRITY_ICON: Record<RuleSeverity, React.ReactNode> = {
  clean: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  critical: <Shield className="w-3.5 h-3.5 text-red-400" />,
};

// ============================================================================
// Record List Page
// ============================================================================

const RecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFormCode = searchParams.get('formCode');
  const urlSection = searchParams.get('section');

  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>(urlFormCode || 'all');
  const [sortBy, setSortBy] = useState<'serial' | 'date' | 'edited'>('serial');
  const [page, setPage] = useState(1);
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: records, isLoading, error, refetch } = useRecords();
  const activeFormCodes = [...new Set(records?.map(r => r.formCode as string) || [])].sort();
  const formNames: Record<string, string> = {};
  FORM_SCHEMAS.forEach(f => { formNames[f.code] = f.name; });

  const sectionFormCodes = useMemo(() => {
    if (!urlSection) return null;
    const sectionNum = parseInt(urlSection, 10);
    return new Set(FORM_SCHEMAS.filter(f => f.section === sectionNum).map(f => f.code));
  }, [urlSection]);

  useEffect(() => {
    if (urlFormCode) {
      setFormFilter(urlFormCode);
      setPage(1);
    }
  }, [urlFormCode]);

  // Integrity cache
  const integrityCache = useMemo(() => {
    const cache = new Map<string, RuleSeverity>();
    if (!records) return cache;
    for (const record of records) {
      const signals = evaluateRulesForRecord(record as unknown as RecordData, records as unknown as RecordData[]);
      const sev: RuleSeverity = signals.length === 0 ? 'clean' : signals.some(s => s.severity === 'critical') ? 'critical' : 'warning';
      cache.set(record.serial as string, sev);
    }
    return cache;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    let list = [...records];
    if (sectionFormCodes) list = list.filter(r => sectionFormCodes.has(r.formCode as string));
    if (formFilter !== 'all') list = list.filter(r => r.formCode === formFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.serial as string).toLowerCase().includes(q) ||
        (r.formName as string).toLowerCase().includes(q) ||
        Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'serial': return (a.serial as string).localeCompare(b.serial as string);
        case 'date': return ((a._createdAt as string) || '').localeCompare((b._createdAt as string) || '');
        case 'edited': return ((b._editCount as number) || 0) - ((a._editCount as number) || 0);
        default: return 0;
      }
    });
    return list;
  }, [records, formFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); setSelectedSerials(new Set()); };
  const handleFilterChange = (val: string) => { setFormFilter(val); setPage(1); setSelectedSerials(new Set()); };

  const toggleSelect = (serial: string) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial); else next.add(serial);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSerials.size === pagedRecords.length) {
      setSelectedSerials(new Set());
    } else {
      setSelectedSerials(new Set(pagedRecords.map(r => r.serial as string)));
    }
  };

  const handleBatchExport = async (format: 'docx' | 'json' | 'csv') => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const selected = selectedSerials.size > 0
        ? records!.filter(r => selectedSerials.has(r.serial as string))
        : filteredRecords;
      if (selected.length === 0) { toast.error('No records to export'); return; }
      switch (format) {
        case 'docx': await exportRecordsToDocx(selected as Record<string, unknown>[]); break;
        case 'json': exportRecordsToJson(selected as Record<string, unknown>[]); break;
        case 'csv': exportRecordsToCsv(selected as Record<string, unknown>[]); break;
      }
      toast.success(`Exported ${selected.length} record(s) as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────
  const breadcrumbs = [{ label: "Dashboard", path: "/" }, { label: "Records" }];

  if (isLoading) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto">
        <div className="ds-skeleton h-10 w-48 mb-6" />
        <div className="ds-skeleton h-10 w-full mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
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
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20 ds-fade-enter">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl text-foreground mb-2">Failed to Load Records</h2>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
      </AppShell>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <AppShell breadcrumbs={breadcrumbs}>
    <div className="max-w-6xl mx-auto page-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {records?.length || 0} records across {activeFormCodes.length} form types
            {selectedSerials.size > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/15 text-primary rounded-full font-medium">
                {selectedSerials.size} selected
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={isExporting}
              className="ds-press ds-focus-ring px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-sm shadow-xl z-50 overflow-hidden ds-fade-enter">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-secondary/50">
                    {selectedSerials.size > 0
                      ? `Export ${selectedSerials.size} selected record(s)`
                      : `Export all ${filteredRecords.length} visible record(s)`}
                  </div>
                  <button onClick={() => handleBatchExport('docx')} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors">
                    <FileTextIcon className="w-5 h-5 text-blue-400" />
                    <div className="text-left"><div className="font-medium">Word Document</div><div className="text-xs text-muted-foreground">.docx — formatted report</div></div>
                  </button>
                  <button onClick={() => handleBatchExport('json')} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors border-t border-border">
                    <FileJson className="w-5 h-5 text-emerald-400" />
                    <div className="text-left"><div className="font-medium">JSON</div><div className="text-xs text-muted-foreground">.json — raw data</div></div>
                  </button>
                  <button onClick={() => handleBatchExport('csv')} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors border-t border-border">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                    <div className="text-left"><div className="font-medium">CSV</div><div className="text-xs text-muted-foreground">.csv — spreadsheet</div></div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={() => refetch()} className="ds-press ds-focus-ring px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 ds-stagger">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by serial, name, or content..."
            className="input-modern w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>

        <select
          value={formFilter}
          onChange={e => handleFilterChange(e.target.value)}
          className="input-modern px-4 py-2 text-sm"
        >
          <option value="all">All Forms</option>
          {activeFormCodes.map(code => (
            <option key={code} value={code}>{code} — {formNames[code] || code}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'serial' | 'date' | 'edited')}
          className="input-modern px-4 py-2 text-sm"
        >
          <option value="serial">Sort by Serial</option>
          <option value="date">Sort by Date</option>
          <option value="edited">Sort by Edits</option>
        </select>

        {selectedSerials.size > 0 && (
          <button onClick={() => setSelectedSerials(new Set())} className="ds-press px-3 py-2 text-sm bg-destructive/15 text-destructive rounded-sm flex items-center gap-1 hover:bg-destructive/25 transition-colors">
            <XCircle className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center py-16 ds-fade-enter">
          <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg text-foreground mb-2">No Records Found</h3>
          <p className="text-sm text-muted-foreground">
            {records?.length === 0 ? 'Create your first record to get started.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Select All + Page info */}
          <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-secondary/30 border border-border/50 rounded-t-sm">
            <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary transition-colors" title={selectedSerials.size === pagedRecords.length ? 'Deselect all' : 'Select all'}>
              {selectedSerials.size === pagedRecords.length && pagedRecords.length > 0
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
            </button>
            <span className="text-xs text-muted-foreground">
              Page {safePage} of {totalPages} · {pagedRecords.length} of {filteredRecords.length} records
            </span>
          </div>

          <div className="space-y-1">
            {pagedRecords.map((record, idx) => {
              const risk = getEditRiskLevel(record);
              const sev = integrityCache.get(record.serial as string) || 'clean';
              const isSelected = selectedSerials.has(record.serial as string);
              const status = (record.status as string) || '';

              return (
                <button
                  key={record.serial as string}
                  onClick={() => navigate(`/records/${encodeURIComponent(record.serial as string)}`)}
                  className={`w-full flex items-center gap-4 p-3 rounded-sm transition-all text-left group ds-press ${
                    isSelected
                      ? 'ds-card border-primary/40 bg-primary/5'
                      : 'hover:bg-card border border-transparent hover:border-border/50'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Checkbox */}
                  <div className="shrink-0" onClick={e => { e.stopPropagation(); toggleSelect(record.serial as string); }}>
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary cursor-pointer" />
                      : <Square className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />}
                  </div>

                  {/* Integrity indicator */}
                  <div className="shrink-0" title={sev === 'clean' ? 'No issues' : sev === 'warning' ? 'Has warnings' : 'Has critical issues'}>
                    {INTEGRITY_ICON[sev]}
                  </div>

                  {/* Serial + Type */}
                  <div className="w-28 shrink-0">
                    <span className="font-mono text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                      {record.serial as string}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{record.formCode as string}</p>
                  </div>

                  {/* Name + Status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-primary/90 transition-colors">
                      {record.formName as string}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {status && (
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${STATUS_STYLES[status] || 'bg-muted text-muted-foreground border-border'}`}>
                          {status}
                        </span>
                      )}
                      {record.date && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {isoToDisplay(record.date as string)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit count */}
                  <div className="shrink-0 text-right">
                    {(record._editCount as number) > 0 && (
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                        risk === 'high' ? 'text-destructive bg-destructive/10' : risk === 'medium' ? 'text-warning bg-warning/10' : 'text-muted-foreground bg-muted'
                      }`}>
                        {(record._editCount as number)} edit{(record._editCount as number) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <ChevronRightIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-muted-foreground">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="ds-press ds-focus-ring px-3 py-1.5 text-sm bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      acc.push(p);
                      if (i < arr.length - 1 && arr[i + 1] !== p + 1) acc.push('…');
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`e${i}`} className="px-2 text-muted-foreground/40">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`ds-press w-8 h-8 text-sm rounded-sm flex items-center justify-center ${
                            p === safePage
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'bg-secondary border border-border text-secondary-foreground hover:bg-accent'
                          }`}
                        >
                          {p}
                        </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="ds-press ds-focus-ring px-3 py-1.5 text-sm bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </AppShell>
  );
};

export default RecordListPage;