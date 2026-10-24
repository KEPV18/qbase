// ============================================================================
// QBase — the compliance model and the register, read from the SERVER
// ---------------------------------------------------------------------------
// Two hooks, and both of them have the same shape:
//
//   useComplianceMap()          the whole compliance model, for the pages
//                               that count forms (the dashboard, the audit
//                               page, the forms registry, the report).
//
//   useRecordPage(filter, …)    ONE page of the register, filtered and
//                               sorted on the server.
//
// WHY THIS EXISTS
// ---------------
// The register used to be downloaded whole — every row, every `form_data`
// blob — by four different pages, and the compliance verdict was then
// computed in the browser from that snapshot.  The pages paid for the whole
// table on every visit, and the number they showed was the browser's
// answer, not the server's.
//
// THE FALLBACK
// ------------
// A server that has not been migrated yet answers `PGRST202` — the function
// does not exist.  That is the ONE case in which the old path is still
// used: the client engine over the old download.  It is loud, it is
// reported (`source: 'client'`), and it happens only on a server that is
// missing the function — never on a migrated one.
//
// The two engines are compared against each other over the whole register
// by `tools/local-stack/verify-compliance-parity.ts`, which fails loudly
// when they disagree.
// ============================================================================

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { CANONICAL_FORMS } from '@/data/formCatalog';
import { buildComplianceMap, isIssueStatus, type FormCompliance } from '@/lib/compliance';
import { getRecordMonth } from '@/lib/temporalUtils';
import { getRecords } from '@/services/recordStorage';
import {
  fetchComplianceMap,
  fetchRecordPage,
  isMissingFunctionError,
  toClientRecord,
  toComplianceMap,
  type CatalogueForm,
  type RecordPageFilter,
  type RecordPageSort,
} from '@/services/complianceApi';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';
import { useAuth } from './useAuth';

/**
 * The catalogue, in the shape the server needs.
 *
 * The form definitions stay owned by the TypeScript catalogue — they are
 * passed IN with every call rather than duplicated in a database table
 * that could drift away from the code.
 */
export const CATALOGUE_FORMS: CatalogueForm[] = CANONICAL_FORMS.map((f) => ({
  code: f.code,
  name: f.name,
  frequency: f.frequency,
}));

/** Where an answer came from. */
export type ComplianceSource = 'server' | 'client';

// ============================================================================
// The compliance map
// ============================================================================

export interface ComplianceMapResult {
  /** The model, one entry per form. */
  map: Map<string, FormCompliance>;
  /** 'server' normally; 'client' only on a server with no migration 20. */
  source: ComplianceSource;
  /** The instant the answer was computed against. */
  asOf: string;
  /** How many records the answer covers. */
  totalRecords: number;
  /** The workflow status counts, as the server counted them. */
  statusCounts: Record<string, number>;
  /** Every month any record covers. */
  months: string[];
  /** The earliest month any record covers. */
  datasetStart: string | null;
}

/**
 * The compliance model for every form.
 *
 * The server computes it, over the rows the caller may see — the
 * row-level policy decides the scope, exactly as it does for a table read.
 */
export function useComplianceMap(): UseQueryResult<ComplianceMapResult, Error> {
  return useQuery({
    queryKey: ['compliance-map'],
    queryFn: async (): Promise<ComplianceMapResult> => {
      // The instant is taken HERE, inside the query, not in the component:
      // a re-render must not move the reference point under the answer.
      const asOf = new Date();

      try {
        const raw = await fetchComplianceMap(CATALOGUE_FORMS, asOf);
        return {
          map: toComplianceMap(raw.forms),
          source: 'server',
          asOf: raw.asOf,
          totalRecords: raw.totalRecords,
          statusCounts: raw.statusCounts,
          months: raw.months,
          datasetStart: raw.datasetStart,
        };
      } catch (error) {
        // Only a server that has NOT been migrated falls back.  Any other
        // failure is a real failure and is surfaced, not papered over.
        if (!isMissingFunctionError(error)) throw error;

        const records = await getRecords();
        const map = buildComplianceMap(
          records.map((r) => ({
            formCode: String(r.formCode),
            createdAt: String(r._createdAt || ''),
            month: getRecordMonth(r),
            // The business status — the state the form carries.  The server
            // counts the issues with the same rule, so the fallback's
            // "forms with issues" is the server's number.
            businessStatus: r.status == null ? null : String(r.status),
          })),
          CATALOGUE_FORMS,
          asOf,
        );
        return {
          map,
          source: 'client',
          asOf: asOf.toISOString(),
          totalRecords: records.length,
          statusCounts: {},
          months: Array.from(
            new Set(records.map((r) => getRecordMonth(r)).filter((m): m is string => !!m)),
          ).sort(),
          datasetStart: null,
        };
      }
    },
    staleTime: 60_000,        // a minute; the model moves with the calendar
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// ============================================================================
// One page of the register
// ============================================================================

export interface RecordPageResult {
  /** The rows of THIS page. */
  rows: RecordData[];
  /** How many rows the filter matched, in total. */
  total: number;
  /** The page asked for. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
  /** The workflow status breakdown OF THE FILTERED SET. */
  statusCounts: Record<string, number>;
  /** 'server' normally; 'client' only on a server with no migration 20. */
  source: ComplianceSource;
}

export interface RecordPageOptions {
  /** Zero-based. */
  page?: number;
  pageSize?: number;
  sort?: RecordPageSort;
  /** Set false to hold the query back (no filter chosen yet). */
  enabled?: boolean;
}

/**
 * One page of the register.
 *
 * The filter is applied on the server, where the row-level policy applies
 * too — so a scoped viewer is scoped here exactly as they are everywhere
 * else, and the count that comes back is the count they are allowed to
 * see.
 */
export function useRecordPage(
  filter: RecordPageFilter,
  options: RecordPageOptions = {},
): UseQueryResult<RecordPageResult, Error> {
  const { page = 0, pageSize = 25, sort = 'form_code', enabled = true } = options;
  const { user } = useAuth();

  return useQuery({
    queryKey: ['records-page', filter, page, pageSize, sort],
    queryFn: async (): Promise<RecordPageResult> => {
      try {
        const result = await fetchRecordPage(filter, page * pageSize, pageSize, sort);
        return {
          rows: result.rows.map(toClientRecord),
          total: result.total,
          page,
          pageSize,
          pageCount: Math.max(1, Math.ceil(result.total / pageSize)),
          statusCounts: result.statusCounts,
          source: 'server',
        };
      } catch (error) {
        if (!isMissingFunctionError(error)) throw error;

        const all = await getRecords();
        const filtered = applyClientFilter(all, filter, user?.email);
        const start = page * pageSize;
        const statusCounts: Record<string, number> = {};
        for (const r of filtered) {
          const status = String(r._status ?? '');
          statusCounts[status] = (statusCounts[status] ?? 0) + 1;
        }
        return {
          rows: filtered.slice(start, start + pageSize),
          total: filtered.length,
          page,
          pageSize,
          pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
          statusCounts,
          source: 'client',
        };
      }
    },
    enabled,
    // The previous page stays on screen while the next one is fetched, so
    // the list does not blink empty on every page change.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// ============================================================================
// The client-side filter — the fallback's twin of the server's rules
// ============================================================================
//
// These are the SAME rules the SQL applies, in the same order, so a server
// without migration 20 answers the same question the migrated server does.
// They are only reached on such a server.

/**
 * The business status of a record — the state a form carries.
 *
 * The rule is the engine's own (`@/lib/compliance`), the same one the
 * server applies, so the fallback's issue count and the server's issue
 * count are the same number.
 */

export function applyClientFilter(
  records: RecordData[],
  filter: RecordPageFilter,
  userEmail?: string,
): RecordData[] {
  return records.filter((r) => {
    if (filter.workflow_status && String(r._status ?? '') !== filter.workflow_status) {
      return false;
    }
    if (filter.business) {
      const isIssue = isIssueStatus(r.status);
      if (filter.business === 'issue' && !isIssue) return false;
      if (filter.business === 'ok' && isIssue) return false;
    }
    if (filter.form_code && String(r.formCode ?? '') !== filter.form_code) {
      return false;
    }
    if (filter.form_codes && filter.form_codes.length > 0) {
      if (!filter.form_codes.includes(String(r.formCode ?? ''))) return false;
    }
    if (filter.department && String(r._department ?? '') !== filter.department) {
      return false;
    }
    if (filter.project_id && String(r.project_id ?? '') !== filter.project_id) {
      return false;
    }
    if (filter.month && getRecordMonth(r) !== filter.month) {
      return false;
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      const haystack = `${r.serial ?? ''} ${r.formName ?? ''} ${r.formCode ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (filter.mine && userEmail && String(r._createdBy ?? '') !== userEmail) {
      return false;
    }
    if (filter.mine_drafts) {
      if (String(r._status ?? '') !== 'draft') return false;
      if (userEmail && String(r._createdBy ?? '') !== userEmail) return false;
    }
    return true;
  });
}
