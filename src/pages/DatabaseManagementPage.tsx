// ============================================================================
// QBase — Database Management Page
// Admin-only. Backup, Restore, and Bulk Import with encryption & validation.
// ============================================================================

import { useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useBackup } from "@/hooks/useBackup";
import { importFromJson, importFromCsv, previewImport, type ImportResult } from "@/services/importService";
import { useRefreshData } from "@/hooks/useRefreshData";
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

type ActiveTab = "backup" | "restore" | "import";

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
            <Database className="w-5 h-5 text-primary" />
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
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary"
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
      </div>
    </AppShell>
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
            <Download className="w-5 h-5 text-primary" />
            <CardTitle>Export Encrypted Backup</CardTitle>
          </div>
          <CardDescription>
            Downloads a complete AES-256 encrypted snapshot of all QMS records.
            ISO 9001 compliant — keep this file in a secure offline location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
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
            <Upload className="w-5 h-5 text-primary" />
            <CardTitle>Restore from Backup</CardTitle>
          </div>
          <CardDescription>
            Upload a previously exported QMS backup file and decrypt it with the original password.
            Existing records with matching serials will be updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
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
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {lastRestore.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <span className="font-medium">{lastRestore.success ? "Restore Successful" : "Restore Completed with Issues"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Imported</span>
                  <p className="text-lg font-semibold text-green-600">{lastRestore.imported}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Skipped</span>
                  <p className="text-lg font-semibold text-amber-600">{lastRestore.skipped}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors</span>
                  <p className="text-lg font-semibold text-red-600">{lastRestore.errors.length}</p>
                </div>
              </div>
              {lastRestore.errors.length > 0 && (
                <div className="mt-3 p-2 bg-background rounded border text-xs font-mono max-h-40 overflow-auto">
                  {lastRestore.errors.map((e, i) => (
                    <div key={i} className="text-red-600 py-0.5">{e}</div>
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
  const [preview, setPreview] = useState<{ type: "json" | "csv"; rows: number; sample: ImportPreviewRow[] } | null>(null);
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
            <FileSpreadsheet className="w-5 h-5 text-primary" />
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
              <button onClick={clearFile} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
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
                className="rounded border-gray-300"
              />
              <span className="text-sm">Dry run (validate only, don't insert)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={e => setSkipInvalid(e.target.checked)}
                className="rounded border-gray-300"
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
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <span className="font-medium">
                  {dryRun ? "Validation Result" : "Import Result"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{dryRun ? "Valid" : "Imported"}</span>
                  <p className="text-lg font-semibold text-green-600">{result.imported}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed</span>
                  <p className="text-lg font-semibold text-red-600">{result.failed}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="text-lg font-semibold">{result.imported + result.failed}</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 p-2 bg-background rounded border text-xs font-mono max-h-40 overflow-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-red-600 py-0.5">
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
