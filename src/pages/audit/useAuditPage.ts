import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQMSData } from "@/hooks/useQMSData";
import { useAuth } from "@/hooks/useAuth";
import { normalizeCategory, updateSheetCell, QMSRecord } from "@/lib/googleSheets";
import { toast } from "sonner";

export type AuditTab = "pending" | "compliant" | "issues" | "overdue" | "never-filled";

export interface AuditStats {
  pending: number;
  compliant: number;
  issues: number;
  overdue: number;
  neverFilled: number;
  totalTemplates: number;
  filledTemplatesCount: number;
}

export interface CategoryBreakdown {
  category: string;
  compliant: number;
  pending: number;
  issues: number;
}

export function useAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: records, isLoading, error, dataUpdatedAt, refetch } = useQMSData();

  const [activeTab, setActiveTab] = useState<AuditTab>("pending");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const projectParam = params.get("project");
    const yearParam = params.get("year");
    const searchParam = params.get("search");

    if (tabParam && ["pending", "compliant", "issues", "overdue", "never-filled"].includes(tabParam)) {
      setActiveTab(tabParam as AuditTab);
    }
    if (projectParam) setProjectFilter(projectParam);
    if (yearParam) setYearFilter(yearParam);
    if (searchParam) setSearch(searchParam);
  }, [location.search]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    refetch();
  }, [queryClient, refetch]);

  // Bulk status change
  const handleBulkStatusChange = useCallback(async (items: QMSRecord[], newStatus: string) => {
    if (items.length === 0) return;
    setBulkLoading(true);
    const reviewerName = user?.name || user?.email || "System";

    try {
      const grouped = new Map<number, { record: QMSRecord; fileIds: string[] }>();
      items.forEach(item => {
        if (!grouped.has(item.rowIndex)) {
          grouped.set(item.rowIndex, { record: item, fileIds: [] });
        }
        grouped.get(item.rowIndex)!.fileIds.push(item.fileId);
      });

      let successCount = 0;
      for (const [rowIndex, { record, fileIds }] of grouped) {
        const updatedReviews = { ...(record.fileReviews || {}) };
        fileIds.forEach(fileId => {
          updatedReviews[fileId] = {
            ...(updatedReviews[fileId] || {}),
            status: newStatus,
            reviewedBy: reviewerName,
            date: new Date().toISOString(),
          };
        });
        const success = await updateSheetCell(rowIndex, 'P', JSON.stringify(updatedReviews));
        if (success) successCount += fileIds.length;
      }

      toast.success("Bulk Update Complete", { description: `${successCount} files changed to "${newStatus}"` });
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    } catch (err: unknown) {
      toast.error("Bulk Update Failed", { description: (err as Error).message });
    } finally {
      setBulkLoading(false);
    }
  }, [user, queryClient]);

  // Approve single record
  const handleApproveRecord = useCallback(async (item: QMSRecord) => {
    const reviewerName = user?.name || user?.email || "System";
    const today = new Date().toISOString().split('T')[0];

    let targetFileId = item.fileId;
    if (!item?.isAtomic || !targetFileId) {
      const reviews = (item.fileReviews || {}) as Record<string, { status?: string }>;
      const metaKeys = new Set(['recordstatus', 'lastupdated']);
      const found = Object.entries(reviews).find(([key, review]) => {
        if (metaKeys.has(key.toLowerCase())) return false;
        const s = (review.status || '').toLowerCase();
        return s === 'pending_review' || s === 'rejected' || s === 'draft' || s === 'unknown' || !review.status;
      });
      if (found) targetFileId = found[0];
    }

    if (!targetFileId) return;

    const auditLog = `Approved individually by ${reviewerName} on ${today}`;
    const currentComment = item.fileReviews?.[targetFileId]?.comment || "";
    const newComment = currentComment ? `${currentComment}\n\n[Audit Log]: ${auditLog}` : auditLog;

    const updatedReviews = {
      ...(item.fileReviews || {}),
      recordStatus: 'approved',
      lastUpdated: new Date().toISOString(),
      [targetFileId]: {
        ...(item.fileReviews?.[targetFileId] || {}),
        status: 'approved',
        reviewedBy: reviewerName,
        date: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        comment: newComment,
      },
    };

    try {
      const success = await updateSheetCell(item.rowIndex, 'P', JSON.stringify(updatedReviews));
      if (success) {
        await updateSheetCell(item.rowIndex, 'R', 'TRUE');
        await updateSheetCell(item.rowIndex, 'N', reviewerName);
        await updateSheetCell(item.rowIndex, 'O', today);
        toast.success("Record Approved", { description: `"${item.fileName || item.recordName}" has been approved and audit trail recorded.` });
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } else {
        throw new Error("Update returned false");
      }
    } catch (err: unknown) {
      toast.error("Approval Failed", { description: (err as Error)?.message || "Could not update the record status." });
    }
  }, [user, queryClient]);

  // Export metadata to JSON
  const handleExportMetadata = useCallback(() => {
    if (!records) return;
    const metadata = records
      .filter(r => r.fileReviews && Object.keys(r.fileReviews).length > 0)
      .map(r => ({ code: r.code, recordName: r.recordName, category: r.category, rowIndex: r.rowIndex, fileReviews: r.fileReviews }));

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qms-metadata-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Metadata Exported", description: `${metadata.length} records exported` });
  }, [records]);

  // Import metadata from JSON
  const handleImportMetadata = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setBulkLoading(true);
      try {
        const text = await file.text();
        const metadata = JSON.parse(text);
        if (!Array.isArray(metadata)) throw new Error("Invalid file format");

        let successCount = 0;
        for (const item of metadata) {
          if (!item.rowIndex || !item.fileReviews) continue;
          const success = await updateSheetCell(item.rowIndex, 'P', JSON.stringify(item.fileReviews));
          if (success) successCount++;
        }

        toast.success("Metadata Imported", { description: `${successCount} records restored successfully` });
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } catch (err: unknown) {
        toast.error("Import Failed", { description: (err as Error).message });
      } finally {
        setBulkLoading(false);
      }
    };
    input.click();
  }, [queryClient]);

  // Derived filter options
  const { categories, projects, years } = useMemo(() => {
    if (!records) return { categories: [] as string[], projects: [] as string[], years: [] as string[] };
    const cats = new Set<string>();
    const projs = new Set<string>();
    const yrs = new Set<string>();

    records.forEach(r => {
      if (r.category) cats.add(r.category);
      if (r.fileReviews) {
        Object.values(r.fileReviews).forEach((review: unknown) => {
          if ((review as { project?: string }).project) projs.add((review as { project: string }).project);
          if ((review as { targetYear?: number }).targetYear) yrs.add((review as { targetYear: number }).targetYear.toString());
        });
      }
    });
    return {
      categories: Array.from(cats).sort(),
      projects: Array.from(projs).sort(),
      years: Array.from(yrs).sort().reverse(),
    };
  }, [records]);

  // Main filtering logic
  const {
    pendingRecords, compliantRecords, issueRecords,
    overdueRecords, neverFilledRecords, stats, categoryBreakdown,
  } = useMemo(() => {
    if (!records) return {
      pendingRecords: [] as QMSRecord[], compliantRecords: [] as QMSRecord[], issueRecords: [] as QMSRecord[],
      overdueRecords: [] as QMSRecord[], neverFilledRecords: [] as QMSRecord[],
      stats: { pending: 0, compliant: 0, issues: 0, overdue: 0, neverFilled: 0, totalTemplates: 0, filledTemplatesCount: 0 },
      categoryBreakdown: [] as CategoryBreakdown[],
    };

    const searchLower = search.toLowerCase();
    const matchesSearch = (r: QMSRecord) => {
      if (!search) return true;
      return r.code?.toLowerCase().includes(searchLower) ||
        r.recordName?.toLowerCase().includes(searchLower) ||
        r.category?.toLowerCase().includes(searchLower) ||
        r.fileName?.toLowerCase().includes(searchLower);
    };
    const matchesCategory = (r: QMSRecord) => categoryFilter === "all" || r.category === categoryFilter;

    const pending: QMSRecord[] = [];
    const compliant: QMSRecord[] = [];
    const issuesList: QMSRecord[] = [];

    const metaKeys = new Set(['recordstatus', 'lastupdated', 'lastauditdate', 'auditissues']);

    records.forEach(record => {
      const files = record.files || [];
      const reviews = record.fileReviews || {};

      if (files.length > 0) {
        // Drive files available — process each file
        files.forEach(file => {
          const review = reviews[file.id] || { status: 'pending_review', comment: '' };
          const effectiveStatus: string = review.status;

          const auditItem: QMSRecord = {
            ...record, fileId: file.id, fileName: file.name, fileLink: file.webViewLink,
            fileStatus: effectiveStatus,
            fileComment: review.comment || (record.fileReviews?.recordStatus === 'rejected' ? "Automated Audit detected issues in this form." : ""),
            fileReviewedBy: review.reviewedBy || record.reviewedBy || "",
            fileTargetYear: review.targetYear ? review.targetYear.toString() : "2026",
            fileProject: review.project || "General", isAtomic: true,
          };

          const normalizedProject = (auditItem.fileProject === "General / All Company") ? "General" : auditItem.fileProject;
          const matchesProject = projectFilter === "all" || normalizedProject === projectFilter;
          const matchesYear = yearFilter === "all" || auditItem.fileTargetYear === yearFilter;
          const itemReviewDate = auditItem.reviewDate || review.reviewDate || "";
          const matchesDate = !dateFilter || itemReviewDate.startsWith(dateFilter) || itemReviewDate.includes(dateFilter);

          if (!matchesSearch(auditItem) || !matchesCategory(auditItem) || !matchesProject || !matchesYear || !matchesDate) return;

          if (effectiveStatus === 'approved') compliant.push(auditItem);
          else if (effectiveStatus === 'rejected') issuesList.push(auditItem);
          else pending.push(auditItem);
        });
      } else if (Object.keys(reviews).length > 0) {
        // No Drive files attached, but we have review data from Column P — count from there
        const recordLevelStatus = ((reviews as Record<string, unknown>)?.recordStatus as string || record.auditStatus || 'pending').toLowerCase();

        for (const [fileId, reviewData] of Object.entries(reviews)) {
          // Skip metadata keys like recordStatus, lastUpdated, etc.
          if (metaKeys.has(fileId.toLowerCase())) continue;

          const review = reviewData as { status?: string; comment?: string; reviewedBy?: string; targetYear?: string | number; project?: string };
          const effectiveStatus = (review?.status || recordLevelStatus).toLowerCase();

          const auditItem: QMSRecord = {
            ...record, fileId, fileName: record.recordName, fileLink: record.templateLink,
            fileStatus: effectiveStatus,
            fileComment: review?.comment || (recordLevelStatus === 'rejected' ? "Automated Audit detected issues in this form." : ""),
            fileReviewedBy: review?.reviewedBy || record.reviewedBy || "",
            fileTargetYear: review?.targetYear ? review.targetYear.toString() : "2026",
            fileProject: review?.project || "General", isAtomic: true,
          };

          const normalizedProject = (auditItem.fileProject === "General / All Company") ? "General" : auditItem.fileProject;
          const matchesProject = projectFilter === "all" || normalizedProject === projectFilter;
          const matchesYear = yearFilter === "all" || auditItem.fileTargetYear === yearFilter;
          const itemReviewDate = auditItem.reviewDate || "";
          const matchesDate = !dateFilter || itemReviewDate.startsWith(dateFilter) || itemReviewDate.includes(dateFilter);

          if (!matchesSearch(auditItem) || !matchesCategory(auditItem) || !matchesProject || !matchesYear || !matchesDate) return;

          if (effectiveStatus === 'approved') compliant.push(auditItem);
          else if (effectiveStatus === 'rejected') issuesList.push(auditItem);
          else pending.push(auditItem);
        }
      } else {
        // No files and no reviews — count record by its status
        const recordStatus = (record.auditStatus || 'pending').toLowerCase();
        const auditItem: QMSRecord = {
          ...record, fileId: '', fileName: record.recordName, fileLink: record.templateLink,
          fileStatus: recordStatus, fileComment: "",
          fileReviewedBy: record.reviewedBy || "", fileTargetYear: "2026",
          fileProject: "General", isAtomic: true,
        };

        if (!matchesSearch(auditItem) || !matchesCategory(auditItem)) return;

        if (recordStatus === 'approved') compliant.push(auditItem);
        else if (recordStatus === 'rejected') issuesList.push(auditItem);
        else pending.push(auditItem);
      }
    });

    const overdue: QMSRecord[] = [];
    const neverFilled: QMSRecord[] = [];
    records.forEach(record => {
      if (!matchesSearch(record) || !matchesCategory(record)) return;
      const files = record.files || [];
      const reviews = record.fileReviews || {};

      if (record.isOverdue) {
        if (files.length > 0) {
          files.forEach(file => {
            const review = reviews[file.id] || { status: 'pending_review', comment: '' };
            overdue.push({
              ...record, fileId: file.id, fileName: file.name, fileLink: file.webViewLink,
              fileStatus: review.status || 'pending_review', fileComment: review.comment || "",
              fileReviewedBy: review.reviewedBy || record.reviewedBy || "",
              fileTargetYear: review.targetYear ? review.targetYear.toString() : "2026",
              fileProject: review.project || "General", isAtomic: true,
            });
          });
        } else {
          overdue.push({ ...record, fileStatus: 'pending_review', isAtomic: true, fileName: record.recordName, fileId: '', fileProject: "General", fileTargetYear: "2026", fileReviewedBy: record.reviewedBy || "", fileComment: "" });
        }
      }
      if ((record.actualRecordCount || 0) === 0) {
        neverFilled.push({ ...record, fileStatus: 'pending_review', isAtomic: true, fileName: record.recordName, fileId: '', fileProject: "General", fileTargetYear: "2026", fileReviewedBy: record.reviewedBy || "", fileComment: "" });
      }
    });

    const catMap = new Map<string, { compliant: number; pending: number; issues: number }>();
    records.forEach(record => {
      const cat = record.category || "Unknown";
      if (!catMap.has(cat)) catMap.set(cat, { compliant: 0, pending: 0, issues: 0 });
      const entry = catMap.get(cat)!;
      const files = record.files || [];
      const reviews = record.fileReviews || {};
      const recordLevelStatus = ((reviews as Record<string, unknown>)?.recordStatus as string || record.auditStatus || 'pending').toLowerCase();

      if (files.length > 0) {
        files.forEach(file => {
          const review = reviews[file.id] || { status: 'pending_review' };
          let effectiveStatus = (review.status || recordLevelStatus).toLowerCase();
          if (recordLevelStatus === 'rejected' && review.status === 'pending_review') effectiveStatus = 'rejected';
          if (effectiveStatus === 'approved') entry.compliant++;
          else if (effectiveStatus === 'rejected') entry.issues++;
          else entry.pending++;
        });
      } else if (Object.keys(reviews).length > 0) {
        // No Drive files but we have review data from Column P
        for (const [fileId, reviewData] of Object.entries(reviews)) {
          if (metaKeys.has(fileId.toLowerCase())) continue;
          const review = reviewData as { status?: string };
          const effectiveStatus = (review?.status || recordLevelStatus).toLowerCase();
          if (effectiveStatus === 'approved') entry.compliant++;
          else if (effectiveStatus === 'rejected') entry.issues++;
          else entry.pending++;
        }
      } else {
        // No files and no reviews — use record-level status
        if (recordLevelStatus === 'approved') entry.compliant++;
        else if (recordLevelStatus === 'rejected') entry.issues++;
        else entry.pending++;
      }
    });
    const breakdown: CategoryBreakdown[] = Array.from(catMap.entries())
      .map(([category, data]) => ({ category: category.length > 12 ? category.slice(0, 12) + "…" : category, ...data }))
      .sort((a, b) => (b.compliant + b.pending + b.issues) - (a.compliant + a.pending + a.issues))
      .slice(0, 8);

    return {
      pendingRecords: pending, compliantRecords: compliant, issueRecords: issuesList,
      overdueRecords: overdue, neverFilledRecords: neverFilled,
      stats: {
        pending: pending.length, compliant: compliant.length, issues: issuesList.length,
        overdue: overdue.length, neverFilled: neverFilled.length,
        totalTemplates: records.length,
        filledTemplatesCount: records.filter(r => (r.actualRecordCount || 0) > 0).length,
      },
      categoryBreakdown: breakdown,
    };
  }, [records, search, categoryFilter, projectFilter, yearFilter, dateFilter]);

  // Current tab data
  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case "pending": return pendingRecords;
      case "compliant": return compliantRecords;
      case "issues": return issueRecords;
      case "overdue": return overdueRecords;
      case "never-filled": return neverFilledRecords;
      default: return [];
    }
  }, [activeTab, pendingRecords, compliantRecords, issueRecords, overdueRecords, neverFilledRecords]);

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (currentTabData.length === 0) return;
    const isAtomic = currentTabData[0]?.isAtomic;
    const headers = isAtomic
      ? ["Code", "Record Name", "Category", "File Name", "Status", "Reviewed By"]
      : ["Code", "Record Name", "Category", "Description", "Last Filed", "Frequency"];
    const rows = currentTabData.map((r: QMSRecord) =>
      isAtomic
        ? [r.code, r.recordName, r.category, r.fileName || "", r.fileStatus || "", r.fileReviewedBy || ""]
        : [r.code, r.recordName, r.category, r.description || "", r.lastFileDate || "", r.fillFrequency || ""]
    );

    const csvContent = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentTabData, activeTab]);

  const totalFilteredCount = pendingRecords.length + compliantRecords.length + issueRecords.length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  const complianceRate = stats.totalTemplates > 0
    ? Math.round((stats.filledTemplatesCount / stats.totalTemplates) * 100)
    : 0;

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as AuditTab);
    navigate(`/audit?tab=${value}`, { replace: true });
  }, [navigate]);

  return {
    activeTab, setActiveTab: handleTabChange,
    viewMode, setViewMode, search, setSearch,
    categoryFilter, setCategoryFilter, projectFilter, setProjectFilter,
    yearFilter, setYearFilter, dateFilter, setDateFilter,
    bulkLoading, setBulkLoading, isAuditModalOpen, setIsAuditModalOpen,
    records, isLoading, error,
    pendingRecords, compliantRecords, issueRecords,
    overdueRecords, neverFilledRecords,
    stats, categoryBreakdown,
    categories, projects, years,
    totalFilteredCount, complianceRate, lastUpdated,
    currentTabData,
    handleRefresh, handleBulkStatusChange, handleApproveRecord,
    handleExportMetadata, handleImportMetadata, handleExportCSV,
    handleTabChange,
  };
}