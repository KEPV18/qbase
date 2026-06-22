// ============================================================================
// QBase — Data Retrofitting & Completion Hub
// Admin-only page for detecting empty/ghost records and populating them
// from offline Word documents. NO deletion — records are preserved for
// ISO compliance (sequential serial integrity).
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { StateScreen } from "@/components/ui/StateScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ShieldCheck, RefreshCw, Loader2, AlertTriangle,
  Database, Ghost, CheckCircle, FileEdit, Archive,
  Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { restRpc } from "@/services/userService";
import { isoToDisplay } from "@/schemas";
import { getDeptTheme, deptBorderStyle, deptAccentStyle } from "@/lib/departmentTheme";

// ============================================================================
// Types
// ============================================================================

interface GhostRecord {
  id: string;
  form_code: string;
  serial: string;
  form_name: string;
  section: number | null;
  section_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  form_data: Record<string, unknown> | null;
  is_empty: boolean;
}

interface ScanSummary {
  totalRecords: number;
  ghostCount: number;
}

// ============================================================================
// Component
// ============================================================================

export default function DataSanitizer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [ghosts, setGhosts] = useState<GhostRecord[]>([]);
  const [summary, setSummary] = useState<ScanSummary>({ totalRecords: 0, ghostCount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  // ── Scan: fetch ghost records + total count via raw fetch RPC ────────────
  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const [ghostResult, countResult] = await Promise.all([
        restRpc<GhostRecord[]>("get_empty_records"),
        restRpc<number>("get_record_count"),
      ]);

      if (ghostResult.error) throw new Error(ghostResult.error);
      if (countResult.error) throw new Error(countResult.error);

      const ghostData = ghostResult.data || [];
      const total = countResult.data || 0;

      setGhosts(ghostData);
      setSummary({ totalRecords: total, ghostCount: ghostData.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      setError(msg);
      toast.error(`Scan failed: ${msg}`);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  }, []);

  // ── Initial scan on mount ────────────────────────────────────────────────
  useEffect(() => { scan(); }, [scan]);

  // ── Navigate to record edit page ────────────────────────────────────────
  const populateRecord = (ghost: GhostRecord) => {
    navigate(`/records/${encodeURIComponent(ghost.serial)}?edit=true`);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const deps = [...new Set(ghosts.map(g => g.section_name).filter(Boolean))] as string[];
    return deps.sort();
  }, [ghosts]);

  const filteredGhosts = useMemo(() => {
    let result = ghosts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.serial.toLowerCase().includes(q) ||
        g.form_code.toLowerCase().includes(q) ||
        (g.form_name || "").toLowerCase().includes(q) ||
        (g.section_name || "").toLowerCase().includes(q) ||
        (g.created_by || "").toLowerCase().includes(q)
      );
    }
    if (departmentFilter) {
      result = result.filter(g => g.section_name === departmentFilter);
    }
    return result;
  }, [ghosts, search, departmentFilter]);

  const healthScore = summary.totalRecords > 0
    ? Math.round(((summary.totalRecords - summary.ghostCount) / summary.totalRecords) * 100)
    : 100;

  // ── Loading state (initial mount) ───────────────────────────────────────
  if (loading && !error) {
    return (
      <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Retrofitting" }]}>
        <StateScreen state="loading" title="Scanning records…" />
      </AppShell>
    );
  }

  // ── Error state (initial load failed, no data) ──────────────────────────
  if (error && ghosts.length === 0) {
    return (
      <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Retrofitting" }]}>
        <StateScreen
          state="error"
          title="Scan failed"
          message={error}
          action={{ label: "Retry", onClick: scan }}
        />
      </AppShell>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Retrofitting" }]}>
      <div className="space-y-6 animate-fade-in">

        {/* ── Header ── */}
        <PageHeader
          icon={Archive}
          title="Data Retrofitting & Completion Hub"
          description="Populate empty records from offline Word documents. Serial integrity preserved for ISO compliance."
          action={
            <Button variant="outline" size="sm" onClick={scan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {scanning ? "Scanning..." : "Rescan"}
            </Button>
          }
        />

        {/* ── Error Banner (post-initial-load) ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Scan Error</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Ensure the SQL migration <code className="font-mono text-foreground">20260622_data_integrity.sql</code> has been applied in Supabase Dashboard.
              </p>
            </div>
          </div>
        )}

        {/* ── Summary Stats ── */}
        <StatsRow
          stats={[
            { icon: Database, value: summary.totalRecords.toLocaleString(), label: "Total System Records" },
            { icon: Ghost, value: summary.ghostCount.toLocaleString(), label: "Awaiting Population", variant: summary.ghostCount > 0 ? "warning" : "success" },
            { icon: ShieldCheck, value: `${healthScore}%`, label: "Completion Score", variant: healthScore >= 95 ? "success" : healthScore >= 80 ? "warning" : "destructive" },
          ]}
          columns={3}
        />

        {/* ── All Complete State ── */}
        {!error && ghosts.length === 0 && (
          <StateScreen
            state="success"
            icon={CheckCircle}
            title="All Records Populated"
            message={`All ${summary.totalRecords.toLocaleString()} active records have valid form data payloads. No retrofitting needed.`}
          />
        )}

        {/* ── Records Awaiting Completion ── */}
        {!error && ghosts.length > 0 && (
          <>
            {/* Department Filter Pills */}
            {departments.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDepartmentFilter(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    !departmentFilter
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Departments
                </button>
                {departments.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setDepartmentFilter(departmentFilter === dept ? null : dept)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                      departmentFilter === dept
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}

            {/* Search + Table */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by serial, form code, or name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-background border-border/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Results Table */}
              <div className="rounded-md border border-border/50 bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border/50">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Serial</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Form Code</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Form Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Created By</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Department</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGhosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                          No records match your search.
                        </TableCell>
                      </TableRow>
                    ) : filteredGhosts.map((ghost, i) => {
                      const deptName = ghost.section_name || "Management & Documentation";
                      const rowStyle = deptBorderStyle(deptName);
                      const deptBadge = deptAccentStyle(deptName);
                      return (
                      <TableRow
                        key={ghost.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors animate-fade-in"
                        style={{ ...rowStyle, animationDelay: `${i * 50}ms` }}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-foreground py-3">
                          {ghost.serial}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ghost.form_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground py-3">
                          {ghost.form_name || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">
                          {ghost.created_by || <span className="italic">Unknown</span>}
                        </TableCell>
                        <TableCell className="py-3">
                          {ghost.section_name ? (
                            <span
                              className="backdrop-blur-sm border rounded-md px-2 py-0.5 text-xs font-medium"
                              style={deptBadge}
                            >
                              {ghost.section_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">
                          {ghost.created_at ? isoToDisplay(ghost.created_at) : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => populateRecord(ghost)}
                          >
                            <FileEdit className="w-4 h-4 mr-1.5" />
                            Complete Data
                          </Button>
                        </TableCell>
                      </TableRow>
                      )})}
                    </TableBody>
                </Table>
                {/* Footer count */}
                <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
                  {search || departmentFilter
                    ? `${filteredGhosts.length} of ${ghosts.length} records`
                    : `${ghosts.length} record${ghosts.length !== 1 ? "s" : ""} awaiting population`
                  }
                </div>
              </div>
            </div>

            {/* ── Info Banner ── */}
            <div className="flex items-start gap-3 p-4 bg-card/40 backdrop-blur-xl border border-border/50 rounded-md">
              <Archive className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Retrofitting Workflow</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Click "Complete Data" next to any flagged record.</li>
                  <li>The record opens in edit mode — Form Code, Serial, Created By, and Department remain locked.</li>
                  <li>Copy the data from your offline Word document and paste into the empty form fields.</li>
                  <li>Save — the record is now fully populated and the CHECK constraint will protect it going forward.</li>
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
