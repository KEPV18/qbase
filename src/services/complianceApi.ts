// ============================================================================
// QBase — the compliance model and the register, read from the SERVER
// ---------------------------------------------------------------------------
// The register used to be downloaded whole — every row, every `form_data`
// blob — and the compliance verdict was then computed in the browser from
// that snapshot.  Two pages paid for it on every visit (the audit page and
// the dashboard), and the number they showed was the browser's answer, not
// the server's.
//
// The server now answers both questions:
//
//   * `compliance_map(p_forms, p_as_of, p_tz_offset_minutes)` — the whole
//     compliance model, over the rows the caller may see (the row-level
//     policy decides the scope).  The catalogue is sent IN, so the form
//     definitions stay owned by the TypeScript catalogue and there is no
//     second copy of them in the database.
//
//   * `records_page(p_filter, p_offset, p_limit, p_sort)` — one PAGE of the
//     register, filtered and sorted on the server, with the total count.
//
// THE CATALOGUE IS THE CLIENT'S
// ------------------------------
// `p_forms` carries the code, the name and the cadence of every form.  The
// server needs them to answer, and the client is the only place they are
// defined — so they are passed on every call rather than duplicated in a
// database table that could drift.
//
// THE CLOCK IS THE CLIENT'S TOO
// -----------------------------
// A form due on the 5th is due on the 5th where the caller is, so the
// caller sends its own instant and its own UTC offset.  That is what keeps
// "overdue by N days" the same number in Cairo and in Los Angeles.
//
// THE FALLBACK
// ------------
// A server that has not been migrated yet has no `compliance_map`.  The
// callers fall back to the TypeScript engine and the old download — loudly,
// and only on a server that is missing the function.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import {
  parseFrequency,
  PERIODIC_LABELS,
  type FormCompliance,
} from '@/lib/compliance';
import {
  formatPeriodCount,
  periodUnit,
  type PeriodicFrequency,
  type Period,
  type PeriodState,
  type PeriodStateRow,
} from '@/lib/compliancePeriods';
import { resolveDepartment, statusToApprovalLabel } from './recordStorage';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

// ── the shapes the server sends ──────────────────────────────────────────────

/** A form definition, as the server needs it. */
export interface CatalogueForm {
  code: string;
  name: string;
  frequency: string;
}

/** One period of a form's cadence. */
export interface ServerPeriod {
  key: string;
  label: string;
  startMonth: string;
  endMonth: string;
  dueDate: string;
}

/** One period, with its state. */
export interface ServerPeriodState extends ServerPeriod {
  state: PeriodState;
  daysLate: number;
}

/** The server's answer for ONE form. */
export interface ServerFormCompliance {
  code: string;
  name: string;
  frequency: string;
  periodic: PeriodicFrequency | null;
  recordCount: number;
  issueCount: number;
  lastRecordDate: string | null;
  /** The months this form's records cover, ascending. */
  months: string[];
  daysSinceLast: number | null;
  isOverdue: boolean;
  overdueDays: number;
  missingCount: number;
  missingPeriods: ServerPeriod[];
  periodStates: ServerPeriodState[];
  coveredCount: number;
  nextDueDate: string | null;
  daysUntilDue: number | null;
}

/** The server's whole answer. */
export interface ServerComplianceMap {
  asOf: string;
  datasetStart: string | null;
  totalRecords: number;
  statusCounts: Record<string, number>;
  months: string[];
  forms: Record<string, ServerFormCompliance>;
}

/** One row of the register, as the page RPC sends it. */
export interface ServerRecordRow {
  id: string;
  serial: string;
  form_code: string;
  form_name: string;
  status: string;
  business_status: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  last_modified_by: string;
  edit_count: number;
  section: number | null;
  section_name: string | null;
  frequency: string | null;
  project_id: string | null;
  month: string | null;
  client_name: string | null;
  project_name: string | null;
}

/** One page of the register. */
export interface RecordPage {
  total: number;
  offset: number;
  limit: number;
  /** The workflow status breakdown OF THE FILTERED SET. */
  statusCounts: Record<string, number>;
  rows: ServerRecordRow[];
}

/** The filters the page RPC understands. */
export interface RecordPageFilter {
  workflow_status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  business?: 'issue' | 'ok';
  form_code?: string;
  form_codes?: string[];
  department?: string;
  project_id?: string;
  month?: string;
  search?: string;
  mine?: boolean;
  mine_drafts?: boolean;
}

/** The sorts the page RPC understands. */
export type RecordPageSort =
  | 'form_code'
  | 'serial_asc'
  | 'serial_desc'
  | 'created_desc'
  | 'created_asc';

// ── the errors ───────────────────────────────────────────────────────────────

/**
 * The server does not have the function.
 *
 * This is the one error that is NOT a failure of the request: it means the
 * database has not been migrated yet, and the caller falls back to the
 * client-side engine.  Everything else is a real error and is surfaced.
 *
 * The `cause` chain is walked as well, because the wrappers here carry the
 * PostgREST error as their cause — the code and the message that identify
 * the missing function live there, not on the wrapper.
 */
export function isMissingFunctionError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (e.code === 'PGRST202') return true;
    const message = String(e.message ?? '');
    if (
      /does not exist/i.test(message) ||
      /could not find the function/i.test(message) ||
      /no function matches/i.test(message) ||
      /failed to find the function/i.test(message)
    ) {
      return true;
    }
    current = e.cause;
  }
  return false;
}

/** The RPC failed. */
export class ComplianceApiError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ComplianceApiError';
    this.cause = cause;
  }
}

// ── the compliance map ───────────────────────────────────────────────────────

/**
 * Ask the server for the compliance model.
 *
 * The catalogue is sent in; the clock is the caller's.
 */
export async function fetchComplianceMap(
  forms: CatalogueForm[],
  asOf: Date = new Date(),
): Promise<ServerComplianceMap> {
  const { data, error } = await supabase.rpc('compliance_map', {
    p_forms: forms,
    p_as_of: asOf.toISOString(),
    p_tz_offset_minutes: -asOf.getTimezoneOffset(),
  });

  if (error) {
    throw new ComplianceApiError(
      `compliance_map failed: ${error.message ?? 'unknown error'}`,
      error,
    );
  }
  if (!data || typeof data !== 'object') {
    throw new ComplianceApiError('compliance_map returned no payload');
  }

  const payload = data as ServerComplianceMap;
  return {
    asOf: String(payload.asOf ?? asOf.toISOString()),
    datasetStart: payload.datasetStart ?? null,
    totalRecords: Number(payload.totalRecords ?? 0),
    statusCounts: payload.statusCounts ?? {},
    months: Array.isArray(payload.months) ? payload.months : [],
    forms: payload.forms ?? {},
  };
}

/**
 * The server's answer, in the shape the pages already read.
 *
 * The page code speaks `FormCompliance` — the TypeScript engine's own
 * type — so a page that reads the server's answer and a page that falls
 * back to the client engine render the SAME thing.
 */
export function toFormCompliance(raw: ServerFormCompliance): FormCompliance {
  const periodic = raw.periodic ?? null;
  const missingPeriods: Period[] = (raw.missingPeriods ?? []).map((p) => ({
    key: p.key,
    label: p.label,
    startMonth: p.startMonth,
    endMonth: p.endMonth,
    dueDate: p.dueDate,
  }));
  const periodStates: PeriodStateRow[] = (raw.periodStates ?? []).map((s) => ({
    period: {
      key: s.key,
      label: s.label,
      startMonth: s.startMonth,
      endMonth: s.endMonth,
      dueDate: s.dueDate,
    },
    state: s.state,
    daysLate: s.daysLate,
  }));

  return {
    formCode: raw.code,
    formName: raw.name,
    frequencyType: parseFrequency(raw.frequency),
    frequencyLabel: periodic ? PERIODIC_LABELS[periodic] : raw.frequency,
    isPeriodic: periodic !== null,
    lastRecordDate: raw.lastRecordDate ?? null,
    nextDueDate: raw.nextDueDate ?? null,
    daysSinceLast: raw.daysSinceLast ?? null,
    daysUntilDue: raw.daysUntilDue ?? null,
    isOverdue: Boolean(raw.isOverdue),
    overdueDays: raw.overdueDays ?? 0,
    recordCount: raw.recordCount ?? 0,
    issueCount: raw.issueCount ?? 0,
    months: raw.months ?? [],
    missingPeriods,
    missingCount: raw.missingCount ?? missingPeriods.length,
    periodUnit: periodic ? periodUnit(periodic) : '',
    missingCountLabel: periodic ? formatPeriodCount(periodic, raw.missingCount ?? 0) : '',
    periodStates,
    coveredCount: raw.coveredCount ?? 0,
  };
}

/** The whole map, in the shape the pages already read. */
export function toComplianceMap(
  raw: Record<string, ServerFormCompliance>,
): Map<string, FormCompliance> {
  const map = new Map<string, FormCompliance>();
  for (const [code, form] of Object.entries(raw ?? {})) {
    map.set(code, toFormCompliance(form));
  }
  return map;
}

// ── the register, one page at a time ────────────────────────────────────────

/**
 * Ask the server for ONE page of the register.
 *
 * The filter is applied on the server, where the row-level policy applies
 * too, so a scoped viewer is scoped here exactly as they are everywhere
 * else.
 */
export async function fetchRecordPage(
  filter: RecordPageFilter = {},
  offset = 0,
  limit = 50,
  sort: RecordPageSort = 'form_code',
): Promise<RecordPage> {
  const { data, error } = await supabase.rpc('records_page', {
    p_filter: filter,
    p_offset: offset,
    p_limit: limit,
    p_sort: sort,
  });

  if (error) {
    throw new ComplianceApiError(
      `records_page failed: ${error.message ?? 'unknown error'}`,
      error,
    );
  }
  if (!data || typeof data !== 'object') {
    throw new ComplianceApiError('records_page returned no payload');
  }

  const payload = data as RecordPage;
  return {
    total: Number(payload.total ?? 0),
    offset: Number(payload.offset ?? offset),
    limit: Number(payload.limit ?? limit),
    statusCounts: payload.statusCounts ?? {},
    rows: Array.isArray(payload.rows) ? payload.rows : [],
  };
}

/**
 * One row of the register, in the shape the pages already read.
 *
 * The row carries the metadata the record list shows; the business fields
 * it does not carry are the ones no list shows.  A row that is opened goes
 * through `getRecord()`, which fetches the whole record.
 */
export function toClientRecord(row: ServerRecordRow): RecordData {
  return {
    id: row.id,
    serial: row.serial,
    formCode: row.form_code,
    formName: row.form_name,
    project_id: row.project_id ?? undefined,
    _createdAt: row.created_at ?? '',
    _createdBy: row.created_by ?? '',
    _lastModifiedAt: row.updated_at ?? '',
    _lastModifiedBy: row.last_modified_by ?? '',
    _editCount: row.edit_count ?? 0,
    _status: row.status,
    _approvalStatus: statusToApprovalLabel(row.status),
    _department: resolveDepartment(row.form_code) || '',
    _section: row.section ?? 0,
    _sectionName: row.section_name ?? '',
    _frequency: row.frequency ?? '',
    // The BUSINESS status — the state a form carries, which is not the
    // workflow status in `records.status`.
    status: row.business_status ?? undefined,
    client_name: row.client_name ?? undefined,
    project_name: row.project_name ?? undefined,
  } as unknown as RecordData;
}
