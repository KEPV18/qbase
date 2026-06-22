// ============================================================================
// QBase — Data Integrity & Sanitizer
// Admin-only page for detecting and purging ghost (empty) records.
// Live scanner via RPC: get_empty_records(), get_record_count()
// Actions: individual purge + global purge-all.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, Trash2, RefreshCw, Loader2, AlertTriangle,
  Database, Ghost, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { isoToDisplay } from "@/schemas";

// ============================================================================
// Types
// ============================================================================

interface GhostRecord {
  id: string;
  form_code: string;
  serial: string;
  form_name: string;
  department: string | null;
  section: number | null;
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
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [purging, setPurging] = useState<string | null>(null);
  const [purgingAll, setPurgingAll] = useState(false);
  const [ghosts, setGhosts] = useState<GhostRecord[]>([]);
  const [summary, setSummary] = useState<ScanSummary>({ totalRecords: 0, ghostCount: 0 });
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Scan: fetch ghost records + total count ──────────────────────────────
  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const [ghostResult, countResult] = await Promise.all([
        supabase.rpc("get_empty_records"),
        supabase.rpc("get_record_count"),
      ]);

      if (ghostResult.error) throw ghostResult.error;
      if (countResult.error) throw countResult.error;

      const ghostData = (ghostResult.data || []) as GhostRecord[];
      const total = (countResult.data as number) || 0;

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
  useEffect(() => {
    scan();
  }, [scan]);

  // ── Purge single record ──────────────────────────────────────────────────
  const purgeRecord = async (id: string, serial: string) => {
    setPurging(id);
    try {
      const { data, error: rpcError } = await supabase.rpc("purge_empty_record", {
        p_record_id: id,
      });

      if (rpcError) throw rpcError;

      const result = data as { deleted_serial: string }[] | null;
      const deletedSerial = result?.[0]?.deleted_serial || serial;

      toast.success(`Purged ghost record ${deletedSerial}`);
      setGhosts((prev) => prev.filter((g) => g.id !== id));
      setSummary((prev) => ({
        ...prev,
        ghostCount: Math.max(0, prev.ghostCount - 1),
        totalRecords: Math.max(0, prev.totalRecords - 1),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purge failed";
      toast.error(`Failed to purge ${serial}: ${msg}`);
    } finally {
      setPurging(null);
    }
  };

  // ── Purge all ghost records ──────────────────────────────────────────────
  const purgeAll = async () => {
    setPurgingAll(true);
    setConfirmPurgeAll(false);
    try {
      const { data, error: rpcError } = await supabase.rpc("purge_all_empty_records");

      if (rpcError) throw rpcError;

      const result = data as { deleted_count: number; serials: string[] }[] | null;
      const count = result?.[0]?.deleted_count || 0;

      toast.success(`Purged ${count} ghost record${count !== 1 ? "s" : ""}`);
      setGhosts([]);
      setSummary((prev) => ({
        totalRecords: Math.max(0, prev.totalRecords - count),
        ghostCount: 0,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purge all failed";
      toast.error(`Purge all failed: ${msg}`);
    } finally {
      setPurgingAll(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Integrity" }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  const healthScore = summary.totalRecords > 0
    ? Math.round(((summary.totalRecords - summary.ghostCount) / summary.totalRecords) * 100)
    : 100;

  return (
    <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Integrity" }]}>
      <div className="space-y-6 max-w-[1200px]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary" />
              Data Integrity &amp; Sanitizer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detect and purge ghost records with empty or null form data payloads.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={scan}
            disabled={scanning}
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {scanning ? "Scanning..." : "Rescan"}
          </Button>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
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

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Records */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total System Records</CardDescription>
              <Database className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {summary.totalRecords.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active records in database</p>
            </CardContent>
          </Card>

          {/* Ghost Records */}
          <Card className={cn(
            "border-border",
            summary.ghostCount > 0 && "border-destructive/30 bg-destructive/5"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Flagged Ghost Records</CardDescription>
              {summary.ghostCount > 0 ? (
                <Ghost className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-bold",
                summary.ghostCount > 0 ? "text-destructive" : "text-success"
              )}>
                {summary.ghostCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.ghostCount > 0 ? "Empty or null payloads" : "No ghosts detected"}
              </p>
            </CardContent>
          </Card>

          {/* Health Score */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Data Integrity Score</CardDescription>
              <ShieldCheck className={cn(
                "w-5 h-5",
                healthScore >= 95 ? "text-success" : healthScore >= 80 ? "text-warning" : "text-destructive"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-bold",
                healthScore >= 95 ? "text-success" : healthScore >= 80 ? "text-warning" : "text-destructive"
              )}>
                {healthScore}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {healthScore >= 95 ? "Excellent" : healthScore >= 80 ? "Good" : "Needs attention"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── All Clear State ── */}
        {!error && ghosts.length === 0 && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-success mb-3" />
              <h3 className="text-lg font-semibold text-foreground">All Records Clean</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                No ghost records detected. All {summary.totalRecords.toLocaleString()} active records have valid form data payloads.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Ghost Records Table ── */}
        {!error && ghosts.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ghost className="w-5 h-5 text-destructive" />
                    Ghost Records Audit Grid
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {ghosts.length} record{ghosts.length !== 1 ? "s" : ""} flagged with empty or null form data.
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmPurgeAll(true)}
                  disabled={purgingAll || scanning}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Purge All Ghost Records
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-3 font-medium text-muted-foreground">Serial</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Form Code</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Form Name</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Created By</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Department</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Date</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghosts.map((ghost) => (
                      <tr
                        key={ghost.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {ghost.serial}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ghost.form_code}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-foreground">
                            {ghost.form_name || <span className="text-muted-foreground italic">—</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs text-muted-foreground">
                            {ghost.created_by || <span className="italic">Unknown</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {ghost.department ? (
                            <Badge variant="secondary" className="text-xs">
                              {ghost.department}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs text-muted-foreground">
                            {ghost.created_at ? isoToDisplay(ghost.created_at) : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => purgeRecord(ghost.id, ghost.serial)}
                            disabled={purging === ghost.id || purgingAll}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {purging === ghost.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-1" />
                                Purge
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Confirm Purge All Modal ── */}
        {confirmPurgeAll && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !purgingAll && setConfirmPurgeAll(false)}>
            <Card className="w-full max-w-md border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Confirm Global Purge
                </CardTitle>
                <CardDescription>
                  This will permanently delete {summary.ghostCount} ghost record{summary.ghostCount !== 1 ? "s" : ""}.
                  This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmPurgeAll(false)} disabled={purgingAll}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={purgeAll} disabled={purgingAll}>
                  {purgingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {purgingAll ? "Purging..." : "Purge All"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}