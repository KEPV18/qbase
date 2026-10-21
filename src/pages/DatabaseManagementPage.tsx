// ============================================================================
// QBase — Database Management Page
// Admin-only. Backup, Restore, and Bulk Import with encryption & validation.
// ============================================================================

import { useState, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useBackup } from "@/hooks/useBackup";
import { importFromJson, importFromCsv, previewImport, type ImportResult, type ImportRow } from "@/services/importService";
import { useRefreshData } from "@/hooks/useRefreshData";
import { listErrorReports, resolveErrorReport } from "@/services/errorReportService";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Database, Download, Upload, Lock, FileJson, FileSpreadsheet,
  AlertTriangle, CheckCircle, Loader2, Eye, Trash2, RefreshCw,
  ChevronDown, ChevronUp, X, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ActiveTab = "backup" | "restore" | "import" | "errors";

interface ImportPreviewRow {
  serial: string;
  form_type: string;
  status: string;
}

// ============================================================================
// Main Page
// ============================================================================

export default function DatabaseManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("backup");

  return (
    <AppShell>
      <div className="space-y-6 p-6 max-w-[1200px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary-tint" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Database Management</h1>
            <p className="text-sm text-muted-foreground">Backup, restore, and bulk import QMS records</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-border/50 pb-0">
          {[
            { id: "backup" as const, label: "Export Backup", icon: Download },
            { id: "restore" as const, label: "Restore Backup", icon: Upload },
            { id: "import" as const, label: "Bulk Import", icon: FileSpreadsheet },
            { id: "errors" as const, label: "Error Reports", icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary-tint"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "backup" && <BackupTab />}
        {activeTab === "restore" && <RestoreTab />}
        {activeTab === "import" && <ImportTab />}
        {activeTab === "errors" && <ErrorReportsTab />}
      </div>
    </AppShell>
  );
}

// ============================================================================
// Tab 4: Error Reports — resolve client-reported errors (Prime §D7)
// The read rides the table's manager-or-admin RLS policy; a non-manager
// sees an honest refusal, never an empty list. Resolution rides the audited
// error_report_resolve RPC (migration 20260929_06).
// ============================================================================

function ErrorReportsTab() {
  const [reports, setReports] = useState<Awaited<ReturnType<typeof listErrorReports>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReports(await listErrorReports());
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveErrorReport(id, resolutionDraft[id] ?? '');
      toast.success('Error report resolved (audited).');
      await load();
    } catch (err) {
      // Honest failure — a refused resolution is never silent (§20).
      toast.error((err as Error).message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Error Reports</CardTitle>
            <CardDescription>
              Client-reported errors; resolution is audited server-side.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          onRetry={() => void load()}
          isEmpty={!isLoading && !error && reports.length === 0}
          emptyTitle="No error reports"
          emptyMessage="Client-side errors reported through the app will appear here."
        >
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="border border-border rounded-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground break-words">{r.error_message}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                      <span className="font-mono">{r.version || '—'}</span>
                      <span>{r.user_email || 'unknown user'}</span>
                      <span className="font-mono truncate max-w-[240px]">{r.page_url || '—'}</span>
                      <span>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</span>
                    </p>
                  </div>
                  {r.resolved ? (
                    <Badge variant="outline" className="text-[10px] bg-success/10">
                      <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-warning/10">
                      Open
                    </Badge>
                  )}
                </div>
                {r.resolved ? (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {r.resolution_notes || '— resolved without notes —'}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={resolutionDraft[r.id] ?? ''}
                      onChange={e => setResolutionDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder='Resolution notes (optional, audited)…'
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      className="text-xs bg-success hover:bg-success-hover text-success-foreground shrink-0"
                      onClick={() => void handleResolve(r.id)}
                      disabled={resolvingId === r.id}
                    >
                      {resolvingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3 h-3" />} Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab 1: Export Backup
// ============================================================================

function BackupTab() {
  const { isExporting, exportBackup } = useBackup();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleExport = async () => {
    if (!password) { toast.error("Password required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    try {
      await exportBackup(password);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Export failed: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-tint" />
            <CardTitle>Export Encrypted Backup</CardTitle>
          </div>
          <CardDescription>
            Downloads a complete AES-256 encrypted snapshot of all QMS records.
            ISO 9001 compliant — keep this file in a secure offline location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-warning/10 dark:bg-warning/20 border border-warning/25 dark:border-warning/45 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-tint shrink-0 mt-0.5" />
            <div className="text-sm text-warning-tint">
              <p className="font-medium">Security Notice</p>
              <p className="mt-1">
                Your backup will be encrypted with AES-GCM-256 using the password you set below.
                There is no password recovery — if you lose it, the backup is permanently unreadable.
              </p>
            </div>
          </div>

          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="backup-pw">Encryption Password</Label>
              <Input
                id="backup-pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-pw-confirm">Confirm Password</Label>
              <Input
                id="backup-pw-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting || !password || !confirmPassword}
              className="gap-2 w-fit"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {isExporting ? "Encrypting & Exporting…" : "Export Encrypted Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab 2: Restore Backup
// ============================================================================

function RestoreTab() {
  const { isImporting, importBackup, lastRestore } = useBackup();
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleRestore = async () => {
    if (!file) { toast.error("Select a backup file"); return; }
    if (!password) { toast.error("Enter decryption password"); return; }

    try {
      await importBackup(file, password);
      setFile(null);
      setPassword("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error("Restore failed: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-tint" />
            <CardTitle>Restore from Backup</CardTitle>
          </div>
          <CardDescription>
            Upload a previously exported QMS backup file and decrypt it with the original password.
            Existing records with matching serials will be updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 dark:bg-destructive/20 border border-destructive/25 dark:border-destructive/45 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive-tint shrink-0 mt-0.5" />
            <div className="text-sm text-destructive-tint">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                Restoring will overwrite existing records with the same serial numbers.
                Consider exporting a backup first before performing a restore operation.
              </p>
            </div>
          </div>

          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Backup File (.json)</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
              />
              {file && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileJson className="w-3 h-3" /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restore-pw">Decryption Password</Label>
              <Input
                id="restore-pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter the original backup password"
              />
            </div>
            <Button
              onClick={handleRestore}
              disabled={isImporting || !file || !password}
              variant="destructive"
              className="gap-2 w-fit"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? "Decrypting & Restoring…" : "Restore Backup"}
            </Button>
          </div>

          {/* Last Restore Result */}
          {lastRestore && (
            <div className={cn(
              "rounded-lg border p-4 mt-4",
              lastRestore.success
                ? "bg-success/10 dark:bg-success/20 border-success/25 dark:border-success/45"
                : "bg-warning/10 dark:bg-warning/20 border-warning/25 dark:border-warning/45"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {lastRestore.success ? (
                  <CheckCircle className="w-5 h-5 text-success-tint" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning-tint" />
                )}
                <span className="font-medium">{lastRestore.success ? "Restore Successful" : "Restore Completed with Issues"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Imported</span>
                  <p className="text-lg font-semibold text-success-tint">{lastRestore.imported}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Skipped</span>
                  <p className="text-lg font-semibold text-warning-tint">{lastRestore.skipped}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors</span>
                  <p className="text-lg font-semibold text-destructive-tint">{lastRestore.errors.length}</p>
                </div>
              </div>
              {lastRestore.errors.length > 0 && (
                <div className="mt-3 p-2 bg-background rounded border text-xs font-mono max-h-40 overflow-auto">
                  {lastRestore.errors.map((e, i) => (
                    <div key={i} className="text-destructive-tint py-0.5">{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab 3: Bulk Import
// ============================================================================

function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ type: "json" | "csv"; rows: number; sample: ImportRow[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const { refreshRecords } = useRefreshData();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    try {
      const previewData = await previewImport(selected);
      setPreview(previewData);
    } catch (err) {
      toast.error("Preview failed: " + (err as Error).message);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file) { toast.error("Select a file"); return; }

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      const opts = { skipInvalidRows: skipInvalid, dryRun, onProgress: (p: number, t: number) => {
        if (p % 10 === 0) toast.info(`Processing ${p}/${t}…`);
      }};

      const res = ext === "csv"
        ? await importFromCsv(text, opts)
        : await importFromJson(text, opts);

      setResult(res);
      if (!dryRun && res.success) await refreshRecords();
    } catch (err) {
      toast.error("Import failed: " + (err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary-tint" />
            <CardTitle>Bulk Import Records</CardTitle>
          </div>
          <CardDescription>
            Upload a JSON or CSV file containing QMS records. All records are validated against
            their form schemas before insertion. Invalid rows can be skipped or will stop the import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-4">
            <Input
              ref={fileRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileSelect}
              className="max-w-md"
            />
            {file && (
              <button onClick={clearFile} className="text-sm text-destructive-tint hover:text-destructive-tint flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Preview</span>
                  <Badge variant="secondary">{preview.type.toUpperCase()}</Badge>
                  <Badge variant="outline">{preview.rows} rows</Badge>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Serial</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Form Type</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.serial || "(auto)"}</td>
                        <td className="py-2 px-3">{row.form_type}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs">{row.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">+ {preview.rows - 5} more rows</p>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Dry run (validate only, don't insert)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={e => setSkipInvalid(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Skip invalid rows</span>
            </label>
          </div>

          {/* Action */}
          <Button
            onClick={handleImport}
            disabled={importing || !file}
            className="gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? "Importing…" : dryRun ? "Validate Import" : "Import Records"}
          </Button>

          {/* Result */}
          {result && (
            <div className={cn(
              "rounded-lg border p-4",
              result.success
                ? "bg-success/10 dark:bg-success/15 border-success/30 dark:border-success/40"
                : "bg-warning/10 dark:bg-warning/15 border-warning/30 dark:border-warning/40"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-success-tint" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning-tint" />
                )}
                <span className="font-medium">
                  {dryRun ? "Validation Result" : "Import Result"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{dryRun ? "Valid" : "Imported"}</span>
                  <p className="text-lg font-semibold text-success-tint">{result.imported}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed</span>
                  <p className="text-lg font-semibold text-destructive-tint">{result.failed}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="text-lg font-semibold">{result.imported + result.failed}</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 p-2 bg-background rounded border text-xs font-mono max-h-40 overflow-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-destructive-tint py-0.5">
                      Row {e.row} ({e.serial}): {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
