// ============================================================================
// useQMSData — Supabase-backed replacement
// Replaces Google Sheets dependency with Supabase records.
// Provides backward-compatible interface so all existing pages work.
// ============================================================================

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types (backward compatible) ─────────────────────────────────────────────

export interface QMSRecord {
  id: string;
  formCode: string;
  formData: Record<string, unknown>;
  status?: string;
  _createdAt?: string;
  _updatedAt?: string;
  [key: string]: unknown;
}

export interface ModuleStats {
  id: string;
  name: string;
  section: number;
  formsCount: number;
  recordsCount: number;
  pendingCount: number;
  issuesCount: number;
  complianceRate: number;
  icon?: string;
  color?: string;
  description?: string;
}

export interface AuditSummary {
  total: number;
  compliant: number;
  pending: number;
  issues: number;
  complianceRate: number;
}

// ── Map Supabase records to QMSRecord shape ──────────────────────────────────

function mapRecords(raw: any[]): QMSRecord[] {
  return (raw || []).map(r => ({
    id: r.id,
    formCode: r.form_code || r.formCode,
    formData: r.form_data || r.formData || {},
    status: r.status || 'draft',
    _createdAt: r.created_at || r._createdAt,
    _updatedAt: r.updated_at || r._updatedAt,
    ...r,
  }));
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Primary data hook: fetches all records from Supabase.
 * Replaces the old Google Sheets fetchSheetDataWithAllFiles.
 */
export function useQMSData() {
  const { data: rawRecords, isLoading, error, refetch, dataUpdatedAt } = useRecords();

  const records = useMemo(() => mapRecords(rawRecords ?? []), [rawRecords]);

  return { data: records, records, isLoading, error, refetch, dataUpdatedAt };
}

/**
 * Lightweight hook: fetches records without Drive file details.
 * Same as useQMSData in Supabase context (no separate Drive fetch).
 */
export function useQMSRecords() {
  const { data: rawRecords, isLoading, error } = useRecords();
  const records = useMemo(() => mapRecords(rawRecords ?? []), [rawRecords]);
  return { data: records, isLoading, error };
}

/**
 * Heavy hook: same as useQMSData — included for backward compatibility.
 */
export function useQMSDriveFiles() {
  return useQMSData();
}

// ── Computed stats ────────────────────────────────────────────────────────────

export function useModuleStats(records: QMSRecord[] | undefined): ModuleStats[] {
  return useMemo(() => {
    if (!records || records.length === 0) return [];

    const moduleMap: Record<number, { forms: Set<string>; records: number; pending: number; issues: number }> = {};
    FORM_SCHEMAS.forEach(s => {
      if (!moduleMap[s.section]) moduleMap[s.section] = { forms: new Set(), records: 0, pending: 0, issues: 0 };
      moduleMap[s.section].forms.add(s.code);
    });

    records.forEach(r => {
      const schema = FORM_SCHEMAS.find(s => s.code === r.formCode);
      if (schema && moduleMap[schema.section]) {
        moduleMap[schema.section].records++;
        if (r.status === 'pending' || r.status === 'draft') moduleMap[schema.section].pending++;
        if (r.status === 'issue' || r.status === 'non_conforming') moduleMap[schema.section].issues++;
      }
    });

    const sectionNames: Record<number, { name: string; icon: string; color: string; description: string }> = {
      1: { name: "Sales & Customer Service", icon: "ShoppingCart", color: "blue", description: "Customer orders, complaints, feedback" },
      2: { name: "Human Resources", icon: "Users", color: "green", description: "Training, competence, evaluations" },
      3: { name: "Project Management", icon: "FolderKanban", color: "purple", description: "Project descriptions, plans" },
      4: { name: "Quality Assurance", icon: "Shield", color: "amber", description: "Audits, inspections, NCs" },
      5: { name: "Document Control", icon: "FileText", color: "slate", description: "Procedures, manuals, work instructions" },
      6: { name: "Management Review", icon: "TrendingUp", color: "emerald", description: "Reviews, objectives, SWOT" },
      7: { name: "Supplier Management", icon: "Truck", color: "orange", description: "Evaluations, purchasing" },
    };

    return Object.entries(moduleMap).map(([section, data]) => {
      const s = Number(section);
      const meta = sectionNames[s] || { name: `Section ${s}`, icon: "File", color: "gray", description: "" };
      const total = data.forms.size;
      const complianceRate = total > 0 ? Math.round(((total - data.pending) / total) * 100) : 100;
      return {
        id: `section-${s}`,
        name: meta.name,
        section: s,
        formsCount: total,
        recordsCount: data.records,
        pendingCount: data.pending,
        issuesCount: data.issues,
        complianceRate,
        icon: meta.icon,
        color: meta.color,
        description: meta.description,
      };
    });
  }, [records]);
}

export function useAuditSummary(records: QMSRecord[] | undefined): AuditSummary {
  return useMemo(() => {
    if (!records || records.length === 0) return { total: 0, compliant: 0, pending: 0, issues: 0, complianceRate: 0 };
    const total = records.length;
    const compliant = records.filter(r => r.status === 'approved' || r.status === 'compliant').length;
    const pending = records.filter(r => r.status === 'pending' || r.status === 'draft').length;
    const issues = records.filter(r => r.status === 'issue' || r.status === 'non_conforming').length;
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { total, compliant, pending, issues, complianceRate };
  }, [records]);
}

export function useReviewSummary(records: QMSRecord[] | undefined) {
  return useMemo(() => {
    if (!records) return { completed: 0, pending: 0, total: 0, rejected: 0 };
    const completed = records.filter(r => r.status === 'approved' || r.status === 'reviewed').length;
    const pending = records.filter(r => r.status === 'pending' || r.status === 'draft').length;
    const rejected = records.filter(r => r.status === 'rejected').length;
    return { completed, pending, total: records.length, rejected };
  }, [records]);
}

export function useMonthlyComparison(records: QMSRecord[] | undefined) {
  return useMemo(() => {
    if (!records || records.length === 0) return { currentMonth: 0, previousMonth: 0, percentageChange: 0, isPositive: true };
    const now = new Date();
    const currentMonth = records.filter(r => {
      const d = new Date(r._createdAt || '');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = records.filter(r => {
      const d = new Date(r._createdAt || '');
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
    }).length;
    const percentageChange = previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;
    return { currentMonth, previousMonth, percentageChange, isPositive: percentageChange >= 0 };
  }, [records]);
}

export function useRecentActivity(records: QMSRecord[] | undefined, limit: number = 5): QMSRecord[] {
  return useMemo(() => {
    if (!records || records.length === 0) return [];
    return [...records].sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || '')).slice(0, limit);
  }, [records, limit]);
}

// ── Mutations (Supabase-backed) ──────────────────────────────────────────────

export function useUpdateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const { error } = await supabase
        .from('records')
        .update({ [field]: value })
        .eq('id', id);
      if (error) throw error;
      return { id, field, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success("Record Updated", { description: "The record has been successfully updated." });
    },
    onError: (error) => {
      toast.error("Update Failed", { description: error.message });
      console.error("Update error:", error);
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('records').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success("Record Deleted", { description: "The record has been successfully deleted." });
    },
    onError: (error) => {
      toast.error("Delete Failed", { description: "An error occurred while deleting the record." });
      console.error("Delete error:", error);
    },
  });
}

// ── File Tracker (simplified — no Drive integration) ─────────────────────────

export interface FileTrackerResult {
  files: any[];
  counts: { approved: number; pending: number; rejected: number; draft: number; total: number };
  byModule: Record<string, any[]>;
  byStatus: Record<string, any[]>;
  byRecord: Record<string, any[]>;
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
    if (!records || records.length === 0) return empty;
    // Simplified: count records by status as "files"
    const files = records.map(r => ({
      ...r,
      recordCode: r.formCode,
      recordCategory: String(FORM_SCHEMAS.find(s => s.code === r.formCode)?.section || 'unknown'),
      status: r.status || 'draft',
      source: 'supabase' as const,
    }));
    const counts = {
      approved: files.filter(f => f.status === 'approved').length,
      pending: files.filter(f => f.status === 'pending' || f.status === 'draft').length,
      rejected: files.filter(f => f.status === 'rejected').length,
      draft: files.filter(f => f.status === 'draft').length,
      total: files.length,
    };
    const byModule: Record<string, any[]> = {};
    const byStatus: Record<string, any[]> = {};
    const byRecord: Record<string, any[]> = {};
    for (const f of files) {
      (byModule[f.recordCategory] ??= []).push(f);
      (byStatus[f.status] ??= []).push(f);
      (byRecord[f.recordCode] ??= []).push(f);
    }
    return { files, counts, byModule, byStatus, byRecord, sources: { drive: files.length, reviews: 0 } };
  }, [records]);
}

// ── Re-exports for backward compatibility ─────────────────────────────────────

export type { QMSRecord as QMSRecordType } from "@/lib/googleSheets";
export { normalizeCategory, formatTimeAgo, getModuleForCategory } from "@/lib/googleSheets";