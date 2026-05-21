import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSheetData,
  fetchSheetDataWithAllFiles,
  updateSheetCell,
  deleteRecord as deleteRecordFromSheet,
  calculateModuleStats,
  calculateAuditSummary,
  calculateReviewSummary,
  calculateMonthlyComparison,
  getRecentActivity,
  resolveFileStatuses,
  getFileStatusCounts,
  QMSRecord,
  ModuleStats,
  AuditSummary,
  ReviewSummary,
  MonthlyComparison,
  ResolvedFile,
} from "@/lib/googleSheets";
import { toast } from "sonner";

/**
 * Lightweight hook: fetches only sheet data (no Drive files).
 * Use this in layout components (Sidebar, TopNav) and for stats
 * that don't need file listings.
 */
export function useQMSRecords() {
  return useQuery({
    queryKey: ["qms-records"],
    queryFn: fetchSheetData,
    staleTime: 60_000,       // 1 minute
    gcTime: 10 * 60_000,    // 10 minutes
    refetchInterval: 120_000, // 2 minutes
  });
}

/**
 * Heavy hook: fetches Drive file listings for all record folders.
 * Use this only in pages that need to display file details
 * (ModulePage, RecordDetail, AuditPage).
 */
export function useQMSDriveFiles() {
  return useQuery({
    queryKey: ["qms-drive-files"],
    queryFn: fetchSheetDataWithAllFiles,
    staleTime: 120_000,      // 2 minutes
    gcTime: 10 * 60_000,     // 10 minutes
    refetchInterval: 300_000, // 5 minutes
  });
}

/**
 * Backward-compatible hook: returns the same data as the old useQMSData.
 * Internally uses the comprehensive fetcher with Drive files.
 * Prefer useQMSRecords() for lightweight consumers that don't need file listings.
 */
export function useQMSData() {
  return useQuery({
    queryKey: ["qms-data"],
    queryFn: fetchSheetDataWithAllFiles,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 120_000,
  });
}

// Memoized stat hooks — these now use useMemo to avoid recalculating every render

export function useModuleStats(records: QMSRecord[] | undefined): ModuleStats[] {
  return useMemo(() => {
    if (!records) return [];
    return calculateModuleStats(records);
  }, [records]);
}

export function useAuditSummary(records: QMSRecord[] | undefined): AuditSummary {
  return useMemo(() => {
    if (!records) return { total: 0, compliant: 0, pending: 0, issues: 0, complianceRate: 0 };
    return calculateAuditSummary(records);
  }, [records]);
}

export function useReviewSummary(records: QMSRecord[] | undefined): ReviewSummary {
  return useMemo(() => {
    if (!records) return { completed: 0, pending: 0, total: 0, rejected: 0 };
    return calculateReviewSummary(records);
  }, [records]);
}

export function useMonthlyComparison(records: QMSRecord[] | undefined): MonthlyComparison {
  return useMemo(() => {
    if (!records) return { currentMonth: 0, previousMonth: 0, percentageChange: 0, isPositive: true };
    return calculateMonthlyComparison(records);
  }, [records]);
}

export function useRecentActivity(records: QMSRecord[] | undefined, limit: number = 5): QMSRecord[] {
  return useMemo(() => {
    if (!records) return [];
    return getRecentActivity(records, limit);
  }, [records, limit]);
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rowIndex,
      field,
      value
    }: {
      rowIndex: number;
      field: "auditStatus" | "reviewed" | "reviewedBy" | "reviewDate";
      value: string;
    }) => {
      const columnMap: Record<string, string> = {
        auditStatus: "L",
        reviewed: "R",
        reviewedBy: "N",
        reviewDate: "O",
      };

      const column = columnMap[field];
      const success = await updateSheetCell(rowIndex, column, value);

      if (!success) {
        throw new Error("Failed to update record");
      }

      return { rowIndex, field, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      queryClient.invalidateQueries({ queryKey: ["qms-records"] });
      queryClient.invalidateQueries({ queryKey: ["qms-drive-files"] });
      toast.success("Record Updated", { description: "The record has been successfully updated." });
    },
    onError: (error) => {
      toast.error("Update Failed", { description: "Google Sheets rejected the write operation. This may require authentication beyond API key access." });
      console.error("Update error:", error);
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rowIndex: number) => {
      await deleteRecordFromSheet(rowIndex);
      return rowIndex;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      queryClient.invalidateQueries({ queryKey: ["qms-records"] });
      queryClient.invalidateQueries({ queryKey: ["qms-drive-files"] });
      toast.success("Record Deleted", { description: "The record has been successfully deleted." });
    },
    onError: (error) => {
      toast.error("Delete Failed", { description: "An error occurred while deleting the record." });
      console.error("Delete error:", error);
    },
  });
}

// ── File Status Tracking ─────────────────────────────────────────────────────
// Unified tracker: resolves every file across all records with its status.
// Use this as the source of truth for counts and per-file tracking.

export interface FileTrackerResult {
  files: ResolvedFile[];
  counts: {
    approved: number;
    pending: number;
    rejected: number;
    draft: number;
    total: number;
  };
  /** Files grouped by module id */
  byModule: Record<string, ResolvedFile[]>;
  /** Files grouped by status */
  byStatus: Record<string, ResolvedFile[]>;
  /** Per-record breakdown: record code → resolved files */
  byRecord: Record<string, ResolvedFile[]>;
  /** How many files came from Drive vs fileReviews */
  sources: { drive: number; reviews: number };
}

export function useFileTracker(records: QMSRecord[] | undefined): FileTrackerResult {
  return useMemo(() => {
    const empty: FileTrackerResult = {
      files: [],
      counts: { approved: 0, pending: 0, rejected: 0, draft: 0, total: 0 },
      byModule: {},
      byStatus: {},
      byRecord: {},
      sources: { drive: 0, reviews: 0 },
    };

    if (!records) return empty;

    const files = resolveFileStatuses(records);
    const counts = getFileStatusCounts(files);

    const byModule: Record<string, ResolvedFile[]> = {};
    const byStatus: Record<string, ResolvedFile[]> = {};
    const byRecord: Record<string, ResolvedFile[]> = {};
    let drive = 0, reviews = 0;

    for (const f of files) {
      // Group by module
      (byModule[f.recordCategory] ??= []).push(f);
      // Group by status
      (byStatus[f.status] ??= []).push(f);
      // Group by record code
      (byRecord[f.recordCode] ??= []).push(f);
      // Count sources
      if (f.source === 'drive') drive++; else reviews++;
    }

    return { files, counts, byModule, byStatus, byRecord, sources: { drive, reviews } };
  }, [records]);
}