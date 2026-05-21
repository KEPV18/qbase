// ============================================================================
// QMS Forge — Audit Page Hook (Supabase-connected)
// Replaces useQMSData with useRecords from useRecordStorage.
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { getModuleForSection } from "@/config/modules";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import { toast } from "sonner";

export type AuditTab = "pending" | "compliant" | "issues" | "overdue" | "never-filled";

export interface AuditStats {
  pending: number;
  compliant: number;
  issues: number;
  overdue: number;
  neverFilled: number;
  totalForms: number;
  filledForms: number;
  totalRecords: number;
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
  const { data: records, isLoading, error, refetch } = useRecords();

  const [activeTab, setActiveTab] = useState<AuditTab>("pending");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const sectionParam = params.get("section");
    const searchParam = params.get("search");

    if (tabParam && ["pending", "compliant", "issues", "overdue", "never-filled"].includes(tabParam)) {
      setActiveTab(tabParam as AuditTab);
    }
    if (sectionParam) setSectionFilter(sectionParam);
    if (searchParam) setSearch(searchParam);
  }, [location.search]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['forge-records'] });
    refetch();
  }, [queryClient, refetch]);

  // Compute audit stats from real Supabase data
  const stats = useMemo((): AuditStats => {
    const recordByForm = new Map<string, RecordData[]>();
    records?.forEach(r => {
      const existing = recordByForm.get(r.formCode as string) || [];
      existing.push(r);
      recordByForm.set(r.formCode as string, existing);
    });

    const totalForms = FORM_SCHEMAS.length;
    const filledForms = FORM_SCHEMAS.filter(s => (recordByForm.get(s.code)?.length || 0) > 0).length;
    const neverFilled = totalForms - filledForms;
    const totalRecords = records?.length ?? 0;

    // Classify filled forms by their frequency/overdue status
    let compliant = 0;
    let pending = 0;
    let issues = 0;
    let overdue = 0;

    FORM_SCHEMAS.forEach(form => {
      const formRecords = recordByForm.get(form.code) || [];
      if (formRecords.length === 0) return; // counted in neverFilled

      // Check if form has overdue records based on frequency
      const isOverdue = checkOverdue(form, formRecords);
      if (isOverdue) {
        overdue++;
      } else {
        // Simple heuristic: if records exist and not overdue, it's compliant
        compliant++;
      }

      // Check for issues — records with status fields indicating problems
      const hasIssues = formRecords.some(r => {
        const fd = (r.formData as Record<string, unknown>) || {};
        const status = (fd.status as string || '').toLowerCase();
        return status === 'open' || status === 'rejected' || status.includes('nc');
      });
      if (hasIssues) issues++;
    });

    pending = filledForms - compliant - overdue;

    return { pending: Math.max(0, pending), compliant, issues, overdue, neverFilled, totalForms, filledForms, totalRecords };
  }, [records]);

  // Section breakdowns
  const sectionBreakdowns = useMemo((): CategoryBreakdown[] => {
    const sections = new Map<number, { compliant: number; pending: number; issues: number }>();
    const recordByForm = new Map<string, RecordData[]>();
    records?.forEach(r => {
      const existing = recordByForm.get(r.formCode as string) || [];
      existing.push(r);
      recordByForm.set(r.formCode as string, existing);
    });

    FORM_SCHEMAS.forEach(form => {
      if (!sections.has(form.section)) {
        sections.set(form.section, { compliant: 0, pending: 0, issues: 0 });
      }
      const sec = sections.get(form.section)!;
      const formRecords = recordByForm.get(form.code) || [];
      if (formRecords.length === 0) {
        sec.pending++;
      } else {
        const hasIssues = formRecords.some(r => {
          const fd = (r.formData as Record<string, unknown>) || {};
          const status = (fd.status as string || '').toLowerCase();
          return status === 'open' || status === 'rejected' || status.includes('nc');
        });
        if (hasIssues) sec.issues++;
        else sec.compliant++;
      }
    });

    return Array.from(sections.entries()).map(([section, counts]) => ({
      category: getModuleForSection(section)?.name || `Section ${section}`,
      ...counts,
    }));
  }, [records]);

  // Filtered records for the current tab
  const filteredRecords = useMemo((): RecordData[] => {
    if (!records) return [];
    const recordByForm = new Map<string, RecordData[]>();
    records.forEach(r => {
      const existing = recordByForm.get(r.formCode as string) || [];
      existing.push(r);
      recordByForm.set(r.formCode as string, existing);
    });

    const result: RecordData[] = [];

    switch (activeTab) {
      case "pending":
        // Forms with no records
        FORM_SCHEMAS.filter(s => !recordByForm.has(s.code)).forEach(s => {
          result.push({
            serial: '',
            formCode: s.code,
            formName: s.name,
            _createdAt: '',
            _createdBy: '',
            _editCount: 0,
            _lastModifiedAt: null,
            _lastModifiedBy: null,
            _modificationReason: null,
            formData: { _auditStatus: 'never-filled', _section: s.sectionName, _frequency: s.frequency },
          } as RecordData);
        });
        break;

      case "compliant":
        // Records without issue status
        records.forEach(r => {
          const fd = (r.formData as Record<string, unknown>) || {};
          const status = (fd.status as string || '').toLowerCase();
          if (status !== 'open' && status !== 'rejected' && !status.includes('nc')) {
            result.push(r);
          }
        });
        break;

      case "issues":
        // Records with issue status
        records.forEach(r => {
          const fd = (r.formData as Record<string, unknown>) || {};
          const status = (fd.status as string || '').toLowerCase();
          if (status === 'open' || status === 'rejected' || status.includes('nc')) {
            result.push(r);
          }
        });
        break;

      case "overdue":
        // Forms that are overdue based on frequency
        FORM_SCHEMAS.forEach(form => {
          const formRecords = recordByForm.get(form.code) || [];
          if (checkOverdue(form, formRecords)) {
            result.push(...(formRecords.length > 0 ? formRecords : [{
              serial: '',
              formCode: form.code,
              formName: form.name,
              _createdAt: '',
              _createdBy: '',
              _editCount: 0,
              _lastModifiedAt: null,
              _lastModifiedBy: null,
              _modificationReason: null,
              formData: { _auditStatus: 'overdue', _section: form.sectionName, _frequency: form.frequency },
            } as RecordData]));
          }
        });
        break;

      case "never-filled":
        FORM_SCHEMAS.filter(s => !recordByForm.has(s.code)).forEach(s => {
          result.push({
            serial: '',
            formCode: s.code,
            formName: s.name,
            _createdAt: '',
            _createdBy: '',
            _editCount: 0,
            _lastModifiedAt: null,
            _lastModifiedBy: null,
            _modificationReason: null,
            formData: { _auditStatus: 'never-filled', _section: s.sectionName, _frequency: s.frequency },
          } as RecordData);
        });
        break;
    }

    // Apply search
    if (search) {
      const lower = search.toLowerCase();
      return result.filter(r =>
        (r.serial as string || '').toLowerCase().includes(lower) ||
        (r.formName as string || '').toLowerCase().includes(lower) ||
        (r.formCode as string || '').toLowerCase().includes(lower)
      );
    }

    return result;
  }, [records, activeTab, search]);

  return {
    records: filteredRecords,
    allRecords: records || [],
    stats,
    sectionBreakdowns,
    isLoading,
    error,
    refetch: handleRefresh,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    sectionFilter,
    setSectionFilter,
    navigate,
  };
}

// Check if a form is overdue based on its frequency and latest record date
function checkOverdue(form: { frequency: string; code: string }, formRecords: RecordData[]): boolean {
  if (formRecords.length === 0) return form.frequency !== 'On event';

  const latestDate = formRecords
    .map(r => r._createdAt as string || '')
    .filter(d => d)
    .sort()
    .pop();

  if (!latestDate) return true;

  const now = new Date();
  const lastDate = new Date(latestDate);
  const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

  const freq = form.frequency.toLowerCase();
  if (freq.includes('monthly')) return daysSince > 35;
  if (freq.includes('quarterly')) return daysSince > 95;
  if (freq.includes('semi')) return daysSince > 190;
  if (freq.includes('annual')) return daysSince > 380;
  if (freq.includes('on event') || freq.includes('per project') || freq.includes('per person')) return false;

  return daysSince > 60; // default threshold
}