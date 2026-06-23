// ============================================================================
// QBase — Temporal Utilities
// Month extraction, missing-month detection, business-month helpers.
// ============================================================================

import type { RecordData } from '@/components/forms/DynamicFormRenderer';

// ---------------------------------------------------------------------------
// Monthly form codes that require one record per calendar month
// ---------------------------------------------------------------------------
export const MONTHLY_FORM_CODES = new Set(['F/11', 'F/35', 'F/48']);

export function isMonthlyForm(code: string): boolean {
  return MONTHLY_FORM_CODES.has(code);
}

// ---------------------------------------------------------------------------
// Business-month helpers  (Jan 2026 … current month)
// ---------------------------------------------------------------------------
const BUSINESS_MONTHS = [
  '2026-01', '2026-02', '2026-03', '2026-04',
  '2026-05', '2026-06',
] as const;

export type BusinessMonth = (typeof BUSINESS_MONTHS)[number];

export function getAllBusinessMonths(): string[] {
  return [...BUSINESS_MONTHS];
}

/** Current business month as YYYY-MM */
export function currentBusinessMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Extract effective month from a record
// Checks: form_data.record_month  →  form_data.coverage_period  →  _createdAt
// ---------------------------------------------------------------------------
export function getRecordMonth(record: RecordData): string | null {
  const fd = record.form_data as Record<string, unknown> | undefined;
  if (fd?.record_month && typeof fd.record_month === 'string') return fd.record_month;
  if (fd?.coverage_period && typeof fd.coverage_period === 'string') return fd.coverage_period;
  // Fallback: derive from _createdAt (YYYY-MM-DDTHH:mm:ssZ)
  const created = String(record._createdAt || record.createdAt || '');
  if (created) {
    const m = created.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  return null;
}

/** Human-friendly label: "Jan 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1] || '??'} ${y}`;
}

/** Short label: "01/2026" */
export function monthShortLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${m}/${y}`;
}

/** Sorted unique months from records */
export function getMonthsFromRecords(
  records: RecordData[],
  formCode?: string,
): string[] {
  const set = new Set<string>();
  for (const r of records) {
    if (formCode && String(r.formCode) !== formCode) continue;
    const m = getRecordMonth(r);
    if (m) set.add(m);
  }
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// Missing-month detection for a given form
// ---------------------------------------------------------------------------
export function getMissingMonths(
  records: RecordData[],
  formCode: string,
): string[] {
  if (!isMonthlyForm(formCode)) return [];
  const existing = new Set<string>();
  for (const r of records) {
    if (String(r.formCode) !== formCode) continue;
    const m = getRecordMonth(r);
    if (m) existing.add(m);
  }
  return BUSINESS_MONTHS.filter(m => !existing.has(m));
}

/** All missing months grouped by form code for monthly forms */
export function getAllMissingMonths(
  records: RecordData[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const code of MONTHLY_FORM_CODES) {
    const missing = getMissingMonths(records, code);
    if (missing.length > 0) map.set(code, missing);
  }
  return map;
}
