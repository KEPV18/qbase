import { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { listAllArchivedFiles, restoreFileFromArchive, permanentlyDeleteDriveFile, checkAndCleanupExpiredArchives } from "@/lib/driveService";
import type { DriveFile } from "@/lib/driveService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2, RotateCcw, FileText, FileCode, Table, LayoutDashboard, Folder,
  Image as ImageIcon, ExternalLink, Loader2, Archive,
  Search, X, Download, AlertTriangle, Clock, Files, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/googleSheets";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";

export default function ArchivePage() {
  const [archivedFiles, setArchivedFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const queryClient = useQueryClient();

  const loadArchivedFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const files = await listAllArchivedFiles();
      setArchivedFiles(files);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error", { description: "Failed to load archived files" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadArchivedFiles();
    checkAndCleanupExpiredArchives().then(count => {
      if (count > 0) {
        toast.success("Auto-Cleanup", { description: `Removed ${count} expired files from archive.` });
        loadArchivedFiles();
      }
    });
  }, [loadArchivedFiles, toast]);

  // Expiring soon count
  const expiringSoonCount = useMemo(() => {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);
    return archivedFiles.filter(f => new Date(f.modifiedTime) <= sevenDaysFromNow).length;
  }, [archivedFiles]);

  // Filtered & sorted files
  const filteredFiles = useMemo(() => {
    let result = archivedFiles;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
        case "oldest": return new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
    return result;
  }, [archivedFiles, searchTerm, sortBy]);

  // Selection helpers
  const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedIds.has(f.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleRestore = async (file: DriveFile) => {
    let originalParentId: string | null = null;
    if (file.description?.includes("originalParentId:")) {
      originalParentId = file.description.split("originalParentId:")[1];
    }
    if (!originalParentId) {
      toast.error("Restore Limited", { description: "Could not find original folder metadata." });
      return;
    }
    setIsLoading(true);
    try {
      await restoreFileFromArchive(file.id, originalParentId);
      toast.success("Restored", { description: `${file.name} restored to its original folder.` });
      await loadArchivedFiles();
      queryClient.invalidateQueries();
    } catch {
      toast.error("Error", { description: "Failed to restore file" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!window.confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;
    setIsLoading(true);
    try {
      await permanentlyDeleteDriveFile(file.id);
      toast.success("Deleted", { description: "File permanently removed." });
      await loadArchivedFiles();
      queryClient.invalidateQueries();
    } catch {
      toast.error("Delete Failed", { description: "Failed to permanently delete the file." });
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk actions
  const handleBulkRestore = async () => {
    const selectedFiles = archivedFiles.filter(f => selectedIds.has(f.id));
    const restorable = selectedFiles.filter(f => f.description?.includes("originalParentId:"));
    if (restorable.length === 0) {
      toast.error("No restorable files", { description: "Selected files lack original folder metadata." });
      return;
    }
    setBulkLoading(true);
    let restored = 0;
    for (const file of restorable) {
      try {
        const parentId = file.description!.split("originalParentId:")[1];
        await restoreFileFromArchive(file.id, parentId);
        restored++;
      } catch (err) {
        console.warn("Failed to restore file:", file.name, err);
      }
    }
    toast.success("Bulk Restore", { description: `${restored} of ${restorable.length} files restored.` });
    setBulkLoading(false);
    await loadArchivedFiles();
    queryClient.invalidateQueries();
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedIds.size} files? This cannot be undone.`)) return;
    setBulkLoading(true);
    let deleted = 0;
    for (const id of selectedIds) {
      try {
        await permanentlyDeleteDriveFile(id);
        deleted++;
      } catch (err) {
        console.warn("Failed to delete file:", id, err);
      }
    }
    toast.success("Bulk Delete", { description: `${deleted} files permanently removed.` });
    setBulkLoading(false);
    await loadArchivedFiles();
    queryClient.invalidateQueries();
  };

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (filteredFiles.length === 0) return;
    const headers = ["File Name", "Archived Date", "Size"];
    const rows = filteredFiles.map(f => [
      f.name,
      new Date(f.modifiedTime).toLocaleDateString(),
      f.size ? `${Math.round(Number(f.size) / 1024)} KB` : "N/A",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredFiles]);

  const getFileIcon = (mimeType: string): JSX.Element => {
    if (mimeType.includes("spreadsheet")) return <Table className="w-4 h-4 text-success" />;
    if (mimeType.includes("presentation")) return <LayoutDashboard className="w-4 h-4 text-warning" />;
    if (mimeType.includes("document") || mimeType.includes("word")) return <FileText className="w-4 h-4 text-primary" />;
    if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
    if (mimeType.includes("image")) return <ImageIcon className="w-4 h-4 text-info" />;
    if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-muted-foreground" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Archive" }]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Record Archive</h1>
            <p className="text-xs text-muted-foreground">Manage files moved to archive — restore or permanently delete.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadArchivedFiles} disabled={isLoading} className="h-8 gap-2 shrink-0">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Archived", value: archivedFiles.length, icon: Archive, color: "text-warning", bg: "bg-warning/10" },
            { label: "Total Size", value: archivedFiles.reduce((s, f) => s + (Number(f.size) || 0), 0) > 0 ? `${(archivedFiles.reduce((s, f) => s + (Number(f.size) || 0), 0) / 1024 / 1024).toFixed(1)} MB` : "N/A", icon: Files, color: "text-primary", bg: "bg-primary/10" },
            { label: "Selected", value: selectedIds.size, icon: CheckSquare, color: "text-info", bg: "bg-info/10" },
            { label: "Retention", value: "30 Days", icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-sm border border-border p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div>
                <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Bulk Actions */}
        <div className="bg-card rounded-sm border border-border p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by file name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-background border-border/50"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" disabled={filteredFiles.length === 0}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>

          {/* Bulk bar */}
          {someSelected && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground">{selectedIds.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkRestore} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  Restore All
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete All
                </Button>
                <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-primary font-semibold hover:underline ml-1">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* File List */}
        <div className="ds-card rounded-sm overflow-hidden">
          {isLoading && archivedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Scanning for archived records...</p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <>
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="w-4 h-4" />
                <span className="flex-1">File Name</span>
                <span className="w-24 text-center hidden sm:block">Size</span>
                <span className="w-32 text-center hidden md:block">Archived</span>
                <span className="w-28 text-right">Actions</span>
              </div>
              <div className="divide-y divide-border/50">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group",
                      selectedIds.has(file.id) && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(file.id)}
                      onCheckedChange={() => toggleSelect(file.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span>{getFileIcon(file.mimeType)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">
                          {formatTimeAgo(file.modifiedTime)}
                        </p>
                      </div>
                    </div>
                    <span className="w-24 text-center text-xs text-muted-foreground hidden sm:block">
                      {file.size ? `${Math.round(Number(file.size) / 1024)} KB` : "—"}
                    </span>
                    <span className="w-32 text-center text-xs text-muted-foreground hidden md:block">
                      {formatTimeAgo(file.modifiedTime)}
                    </span>
                    <div className="w-28 flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden lg:inline">Open</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => handleRestore(file)} disabled={isLoading}>
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden lg:inline">Restore</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(file)} disabled={isLoading}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-[10px] text-muted-foreground font-medium">
                {searchTerm ? `${filteredFiles.length} of ${archivedFiles.length} files` : `${archivedFiles.length} files total`}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-sm bg-muted flex items-center justify-center mb-3">
                <Archive className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-bold mb-1">No archived files</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                {searchTerm ? `No files matching "${searchTerm}"` : "Files moved to archive will appear here."}
              </p>
            </div>
          )}
        </div>

        
      </div>
    </AppShell>
  );
}