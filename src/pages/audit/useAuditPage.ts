// ============================================================================
// QBase — Audit Page Hook (Supabase-connected)
// Replaces useQMSData with useRecords from useRecordStorage.
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useComplianceMap, useRecordPage } from "@/hooks/useCompliance";
import { CANONICAL_FORMS, getCanonicalSectionLabel } from "@/data/formCatalog";
import type { FormCompliance } from "@/lib/compliance";
import type { RecordPageFilter } from "@/services/complianceApi";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";

/**
 * The client-side mirror of `public.prime_is_manager_or_admin()`.
 *
 * The two must agree.  If the client claims organisation scope the
 * database does not grant, the audit page makes an organisation-wide
 * claim from a partial view; if the client denies it, a manager or a
 * department head loses the view their policy entitles them to.
 *
 * SQL side: `supabase/migrations/prime/20260929_01_authz_spine.sql`
 *   where ur.role in ('admin', 'dept_head', 'manager')
 */
const ORG_WIDE_ROLES = new Set(["admin", "dept_head", "manager"]);

export type AuditTab = "pending" | "compliant" | "issues" | "overdue" | "never-filled";

export interface AuditStats {
  /**
   * The RECORDS that are waiting for a review (`records.status =
   * 'pending_review'`).  It is a record count, not a form count: the other
   * figures in this struct count forms, because a form is what owes a
   * filing.
   */
  pendingReview: number;
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

/**
 * One row of a FORM tab.
 *
 * Two of the five tabs list FORMS, not records: a form is what owes a
 * filing, so "which forms are behind?" is a question about forms.  The
 * record tabs list records.
 */
export interface AuditFormRow {
  code: string;
  name: string;
  section: string;
  frequency: string;
  recordCount: number;
  missingCount: number;
  missingCountLabel: string;
  overdueDays: number;
  /** The labels of the missed periods — "March 2026, April 2026". */
  missingPeriods: string[];
  status: "overdue" | "never-filled";
}

/** How many rows a page of the register holds. */
const PAGE_SIZE = 25;

export function useAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── The compliance model, computed by the server ────────────────────
  //
  // The model used to be computed HERE, in the browser, from a snapshot of
  // every record the viewer could see — 318 rows and 379 kB of `form_data`
  // on every visit, so that four pages could each count the same forms.
  // The server now computes it, over the rows the row-level policy
  // actually lets this viewer see.
  const {
    data: complianceResult,
    isLoading: complianceLoading,
    error: complianceError,
    refetch: refetchCompliance,
  } = useComplianceMap();

  const compliance: Map<string, FormCompliance> = useMemo(
    () => complianceResult?.map ?? new Map<string, FormCompliance>(),
    [complianceResult],
  );

  // ── The scope of what this viewer can see ─────────────────────────────
  //
  // Every compliance figure on this page is computed against the form
  // catalogue using ONLY the records the viewer can see — and what a
  // viewer can see is decided by the RLS policy, not by the client:
  //
  //   records_read_dept_or_owner  (migration 15)
  //     prime_is_manager_or_admin()               → the whole organisation
  //     created_by = you                          → the records you filed
  //     prime_record_department(...) = your dept  → your department's forms
  //
  // A plain user therefore sees a slice, and a slice cannot support an
  // organisation-wide verdict.  Before this was in place, a user whose
  // slice was empty was shown a green "All forms compliant" banner and
  // "36 forms never filled — these forms need at least one record for
  // compliance": both numbers described the empty view, not the
  // organisation, and the page stated them as facts about the company.
  const scopeIsOrgWide = ORG_WIDE_ROLES.has(String(user?.role || "").toLowerCase());

  const [activeTab, setActiveTab] = useState<AuditTab>("pending");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [page, setPage] = useState(0);

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

  // A new tab or a new search starts at the first page — page 3 of the
  // previous filter is not a page of the new one.
  useEffect(() => {
    setPage(0);
  }, [activeTab, search]);

  // ── The record list behind the table ────────────────────────────────
  //
  // The three RECORD tabs ask the server for one page at a time, filtered
  // on the server.  The two FORM tabs need no list of records: they are
  // built from the compliance model below.
  const isRecordTab = activeTab === "pending" || activeTab === "compliant" || activeTab === "issues";

  const recordFilter: RecordPageFilter = useMemo(() => {
    const filter: RecordPageFilter = {};
    if (activeTab === "pending") filter.workflow_status = "pending_review";
    if (activeTab === "compliant") filter.business = "ok";
    if (activeTab === "issues") filter.business = "issue";
    if (search.trim()) filter.search = search.trim();
    return filter;
  }, [activeTab, search]);

  const {
    data: recordPage,
    isLoading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useRecordPage(recordFilter, {
    page,
    pageSize: PAGE_SIZE,
    sort: "form_code",
    enabled: isRecordTab,
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['compliance-map'] });
    queryClient.invalidateQueries({ queryKey: ['records-page'] });
    refetchCompliance();
    if (isRecordTab) refetchRecords();
  }, [queryClient, refetchCompliance, refetchRecords, isRecordTab]);

  // ── The counts ─────────────────────────────────────────────────────
  //
  // One model, shared with the dashboard: a form is overdue when it owes a
  // filing for a period that has closed and that no record covers. The audit
  // page used to apply its own thresholds (35/95/190/380 days plus a 60-day
  // catch-all), which is why it said "5 overdue forms" while the dashboard
  // said "8" about the very same records.
  const stats = useMemo((): AuditStats => {
    const totalForms = CANONICAL_FORMS.length;

    let filledForms = 0;
    let neverFilled = 0;
    let compliant = 0;
    let issues = 0;
    let overdue = 0;

    for (const form of CANONICAL_FORMS) {
      const c = compliance.get(form.code);
      const recordCount = c?.recordCount ?? 0;
      const issueCount = c?.issueCount ?? 0;

      if (recordCount > 0) filledForms++;
      else neverFilled++;

      if (c?.isOverdue) overdue++;

      if (recordCount === 0) continue; // counted in neverFilled

      if (!c?.isOverdue) compliant++;

      // A form with a record that carries an issue state (a non-conformity
      // that is open, rejected, or mentions "nc") is a form with issues.
      // The server counts the records; the page counts the FORMS.
      if (issueCount > 0) issues++;
    }

    // The records waiting for a review — the WORKFLOW status, which is not
    // the business status a form carries.
    const pendingReview = complianceResult?.statusCounts?.pending_review ?? 0;
    const totalRecords = complianceResult?.totalRecords ?? 0;

    return { pendingReview, compliant, issues, overdue, neverFilled, totalForms, filledForms, totalRecords };
  }, [compliance, complianceResult]);

  // Section breakdowns
  const sectionBreakdowns = useMemo((): CategoryBreakdown[] => {
    const sections = new Map<number, { compliant: number; pending: number; issues: number }>();

    CANONICAL_FORMS.forEach(form => {
      if (!sections.has(form.section)) {
        sections.set(form.section, { compliant: 0, pending: 0, issues: 0 });
      }
      const sec = sections.get(form.section)!;
      const c = compliance.get(form.code);
      const recordCount = c?.recordCount ?? 0;

      if (recordCount === 0) {
        sec.pending++;
      } else if ((c?.issueCount ?? 0) > 0) {
        sec.issues++;
      } else {
        sec.compliant++;
      }
    });

    return Array.from(sections.entries()).map(([section, counts]) => ({
      category: getCanonicalSectionLabel(section),
      ...counts,
    }));
  }, [compliance]);

  // ── The two FORM tabs ──────────────────────────────────────────────
  //
  // "Overdue" and "Never Filled" are questions about FORMS: a form is what
  // owes a filing, and a record is never "overdue" — it is filed or it is
  // not.  The rows come from the compliance model, so they carry the
  // detail the table shows: which periods are missing, and how late.
  const formRows = useMemo((): AuditFormRow[] => {
    const needle = search.trim().toLowerCase();

    const matches = (form: (typeof CANONICAL_FORMS)[number]) =>
      !needle ||
      form.code.toLowerCase().includes(needle) ||
      form.name.toLowerCase().includes(needle);

    const rows: AuditFormRow[] = [];

    if (activeTab === "overdue") {
      CANONICAL_FORMS.forEach(form => {
        const c = compliance.get(form.code);
        if (!c?.isOverdue) return;
        if (!matches(form)) return;
        rows.push({
          code: form.code,
          name: form.name,
          section: form.sectionName,
          frequency: form.frequency,
          recordCount: c.recordCount,
          missingCount: c.missingCount,
          missingCountLabel: c.missingCountLabel,
          overdueDays: c.overdueDays,
          missingPeriods: c.missingPeriods.map((p) => p.label),
          status: "overdue",
        });
      });
    } else if (activeTab === "never-filled") {
      CANONICAL_FORMS.forEach(form => {
        const c = compliance.get(form.code);
        if ((c?.recordCount ?? 0) > 0) return;
        if (!matches(form)) return;
        rows.push({
          code: form.code,
          name: form.name,
          section: form.sectionName,
          frequency: form.frequency,
          recordCount: 0,
          missingCount: c?.missingCount ?? 0,
          missingCountLabel: c?.missingCountLabel ?? "",
          overdueDays: c?.overdueDays ?? 0,
          missingPeriods: (c?.missingPeriods ?? []).map((p) => p.label),
          status: "never-filled",
        });
      });
    }

    return rows;
  }, [activeTab, compliance, search]);

  const isLoading = complianceLoading || (isRecordTab && recordsLoading);
  const error = (complianceError ?? recordsError) as Error | null;

  return {
    // The record tabs: the rows of the current page.
    records: isRecordTab ? (recordPage?.rows ?? []) : [],
    // The form tabs: the rows of the current view.
    formRows,
    // The paging.
    page: isRecordTab ? page : 0,
    pageCount: recordPage?.pageCount ?? 1,
    totalRows: isRecordTab ? (recordPage?.total ?? 0) : formRows.length,
    setPage,
    stats,
    sectionBreakdowns,
    // Whether the compliance figures on this page describe the whole
    // organisation or only the slice the viewer can see.
    scopeIsOrgWide,
    // Where the model came from — 'client' means the server has not been
    // migrated and the answer was computed in the browser.
    source: complianceResult?.source ?? 'server',
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
