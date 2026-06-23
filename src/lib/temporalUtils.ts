// ============================================================================
// QBase — Temporal Utilities
// Month extraction, missing-month detection, business-month helpers.
// ============================================================================

import type { RecordData } from '@/components/forms/DynamicFormRenderer';

// ---------------------------------------------------------------------------
// Dynamic coverage period resolution
// Checks: form_data.coverage_period  →  record_month  →  date fields  →  Continuous
// ---------------------------------------------------------------------------

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Try to extract a human-readable "Month YYYY" from a date string */
function dateToMonthLabel(dateStr: string): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // Already "Month YYYY" format?
  for (let i = 0; i < 12; i++) {
    if (s.startsWith(MONTH_NAMES_FULL[i])) {
      const rest = s.substring(MONTH_NAMES_FULL[i].length).trim();
      if (/^\d{4}$/.test(rest)) return s; // already clean
    }
  }

  // DD/MM/YYYY
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const monthIdx = parseInt(m[2], 10) - 1;
    return `${MONTH_NAMES_FULL[monthIdx]} ${m[3]}`;
  }

  // D/M/YYYY or DD/M/YYYY etc.
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const monthIdx = parseInt(m[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${MONTH_NAMES_FULL[monthIdx]} ${m[3]}`;
  }

  // DD-Mon-YY (e.g. 05-Jan-26)
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (m) {
    const monthAbbr = m[2].toLowerCase();
    const abbrMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const mi = abbrMap[monthAbbr];
    if (mi !== undefined) {
      const year = parseInt(m[3], 10);
      return `${MONTH_NAMES_FULL[mi]} ${2000 + year}`;
    }
  }

  // MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const monthIdx = parseInt(m[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${MONTH_NAMES_FULL[monthIdx]} ${m[2]}`;
  }

  // YYYY-MM
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const monthIdx = parseInt(m[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${MONTH_NAMES_FULL[monthIdx]} ${m[1]}`;
  }

  return null;
}

/**
 * Resolve a human-readable coverage period from a record.
 * The record has all form_data fields flattened to the top level
 * (via ...formData spread in recordStorage.ts).
 * 
 * Priority:
 *   1. record.coverage_period (already set in DB)
 *   2. record.record_month
 *   3. record.date / training_date / registration_date etc.
 *   4. Item-level dates (for F/11 items array in record)
 *   5. Fallback: "Continuous / Open-Ended"
 */
export function resolveCoveragePeriod(record: RecordData): string {
  if (!record) return 'Continuous / Open-Ended';

  // 1. Already a named month in coverage_period (flattened on record)
  const cp = record.coverage_period as string | undefined;
  if (cp) {
    const parsed = dateToMonthLabel(cp);
    if (parsed) return parsed;
    // Not a month format — return as-is (e.g. "Continuous / Open-Ended")
    return cp;
  }

  // 2. Try record_month
  const rm = record.record_month as string | undefined;
  if (rm) {
    const parsed = dateToMonthLabel(rm);
    if (parsed) return parsed;
  }

  // 3. Try date fields (all flattened to top level)
  for (const key of ['date', 'training_date', 'registration_date', 'assessed_on', 'appraisal_date', 'date_of_joining']) {
    const dv = record[key] as string | undefined;
    if (dv) {
      const parsed = dateToMonthLabel(dv);
      if (parsed) return parsed;
    }
  }

  // 4. For F/11, try item-level planDate (items array flattened on record)
  if (String(record.formCode) === 'F/11') {
    const items = record.items as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(items)) {
      for (const item of items) {
        for (const key of ['planDate', 'actualDate']) {
          const dv = item[key] as string | undefined;
          if (dv) {
            const parsed = dateToMonthLabel(dv);
            if (parsed) return parsed;
          }
        }
      }
    }
  }

  // 5. Fallback
  return 'Continuous / Open-Ended';
}
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
