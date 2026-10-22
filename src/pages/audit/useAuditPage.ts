// ============================================================================
// QBase — Audit Page Hook (Supabase-connected)
// Replaces useQMSData with useRecords from useRecordStorage.
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRecords } from "@/hooks/useRecordStorage";
import { CANONICAL_FORMS, getCanonicalSectionLabel } from "@/data/formCatalog";
import { buildComplianceMap } from "@/lib/compliance";
import { getRecordMonth } from "@/lib/temporalUtils";
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

  // One model, shared with the dashboard: a form is overdue when it owes a
  // filing for a period that has closed and that no record covers. The audit
  // page used to apply its own thresholds (35/95/190/380 days plus a 60-day
  // catch-all), which is why it said "5 overdue forms" while the dashboard
  // said "8" about the very same records.
  const compliance = useMemo(
    () => buildComplianceMap(
      (records || []).map(r => ({
        formCode: String(r.formCode),
        createdAt: String(r._createdAt || ''),
        month: getRecordMonth(r),
      })),
      CANONICAL_FORMS.map(f => ({ code: f.code, name: f.name, frequency: f.frequency })),
    ),
    [records],
  );

  // Compute audit stats from real Supabase data
  const stats = useMemo((): AuditStats => {
    const recordByForm = new Map<string, RecordData[]>();
    records?.forEach(r => {
      const existing = recordByForm.get(r.formCode as string) || [];
      existing.push(r);
      recordByForm.set(r.formCode as string, existing);
    });

    const totalForms = CANONICAL_FORMS.length;
    const filledForms = CANONICAL_FORMS.filter(s => (recordByForm.get(s.code)?.length || 0) > 0).length;
    const neverFilled = totalForms - filledForms;
    const totalRecords = records?.length ?? 0;

    // Classify filled forms by their frequency/overdue status
    let compliant = 0;
    let pending = 0;
    let issues = 0;
    let overdue = 0;
    let overdueFilled = 0;

    CANONICAL_FORMS.forEach(form => {
      const formRecords = recordByForm.get(form.code) || [];
      const isOverdue = compliance.get(form.code)?.isOverdue ?? false;

      if (isOverdue) {
        overdue++;
        if (formRecords.length > 0) overdueFilled++;
      }

      if (formRecords.length === 0) return; // counted in neverFilled

      if (!isOverdue) {
        // Simple heuristic: if records exist and not overdue, it's compliant
        compliant++;
      }

      // Check for issues — records with status fields indicating problems.
      // form_data is spread onto the top level of the record (see
      // parseRowToRecord), so the business status lives at `r.status` — reading
      // it from `r.formData` always found nothing.
      const hasIssues = formRecords.some(r => {
        const status = (r.status as string || '').toLowerCase();
        return status === 'open' || status === 'rejected' || status.includes('nc');
      });
      if (hasIssues) issues++;
    });

    pending = filledForms - compliant - overdueFilled;

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

    CANONICAL_FORMS.forEach(form => {
      if (!sections.has(form.section)) {
        sections.set(form.section, { compliant: 0, pending: 0, issues: 0 });
      }
      const sec = sections.get(form.section)!;
      const formRecords = recordByForm.get(form.code) || [];
      if (formRecords.length === 0) {
        sec.pending++;
      } else {
        const hasIssues = formRecords.some(r => {
          const status = (r.status as string || '').toLowerCase();
          return status === 'open' || status === 'rejected' || status.includes('nc');
        });
        if (hasIssues) sec.issues++;
        else sec.compliant++;
      }
    });

    return Array.from(sections.entries()).map(([section, counts]) => ({
      category: getCanonicalSectionLabel(section),
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
        CANONICAL_FORMS.filter(s => !recordByForm.has(s.code)).forEach(s => {
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
          const status = (r.status as string || '').toLowerCase();
          if (status !== 'open' && status !== 'rejected' && !status.includes('nc')) {
            result.push(r);
          }
        });
        break;

      case "issues":
        // Records with issue status
        records.forEach(r => {
          const status = (r.status as string || '').toLowerCase();
          if (status === 'open' || status === 'rejected' || status.includes('nc')) {
            result.push(r);
          }
        });
        break;

      case "overdue":
        // Forms that owe a filing for a closed period and have not filed it
        CANONICAL_FORMS.forEach(form => {
          const formRecords = recordByForm.get(form.code) || [];
          if (compliance.get(form.code)?.isOverdue) {
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
        CANONICAL_FORMS.filter(s => !recordByForm.has(s.code)).forEach(s => {
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
  }, [records, activeTab, search, compliance]);

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
