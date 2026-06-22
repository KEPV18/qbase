// ============================================================================
// QBase — Data Retrofitting & Completion Hub
// Admin-only page for detecting empty/ghost records and populating them
// from offline Word documents. NO deletion — records are preserved for
// ISO compliance (sequential serial integrity).
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, RefreshCw, Loader2, AlertTriangle,
  Database, Ghost, CheckCircle, FileEdit, Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { restRpc } from "@/services/userService";
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [ghosts, setGhosts] = useState<GhostRecord[]>([]);
  const [summary, setSummary] = useState<ScanSummary>({ totalRecords: 0, ghostCount: 0 });
  const [error, setError] = useState<string | null>(null);

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
  useEffect(() => {
    scan();
  }, [scan]);

  // ── Navigate to record edit page ────────────────────────────────────────
  const populateRecord = (ghost: GhostRecord) => {
    navigate(`/records/${encodeURIComponent(ghost.serial)}?edit=true`);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Retrofitting" }]}>
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
    <AppShell breadcrumbs={[{ label: "Admin", path: "/admin/accounts" }, { label: "Data Retrofitting" }]}>
      <div className="space-y-6 max-w-[1200px]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="w-7 h-7 text-primary" />
              Data Retrofitting & Completion Hub
              <span className="text-base font-normal text-muted-foreground">(Data Retrofitting Hub)</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Populate empty records from offline Word documents. Serial integrity preserved for ISO compliance.
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

          {/* Records Awaiting Completion */}
          <Card className={cn(
            "border-border",
            summary.ghostCount > 0 && "border-warning/30 bg-warning/5"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Awaiting Population</CardDescription>
              {summary.ghostCount > 0 ? (
                <Ghost className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-bold",
                summary.ghostCount > 0 ? "text-warning" : "text-success"
              )}>
                {summary.ghostCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.ghostCount > 0 ? "Empty records to populate" : "All records complete"}
              </p>
            </CardContent>
          </Card>

          {/* Completion Score */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Completion Score</CardDescription>
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

        {/* ── All Complete State ── */}
        {!error && ghosts.length === 0 && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-success mb-3" />
              <h3 className="text-lg font-semibold text-foreground">All Records Populated</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                All {summary.totalRecords.toLocaleString()} active records have valid form data payloads. No retrofitting needed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Records Awaiting Completion Grid ── */}
        {!error && ghosts.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-warning" />
                    Records Awaiting Data Population
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {ghosts.length} record{ghosts.length !== 1 ? "s" : ""} with empty form data — click "Complete Data" to populate from your offline Word document.
                  </CardDescription>
                </div>
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
                            variant="default"
                            size="sm"
                            onClick={() => populateRecord(ghost)}
                          >
                            <FileEdit className="w-4 h-4 mr-1.5" />
                            Complete Data
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

        {/* ── Info Banner ── */}
        {!error && ghosts.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-lg">
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
        )}
      </div>
    </AppShell>
  );
}