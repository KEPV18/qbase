// ============================================================================
// QBase — Temporal Utilities
// Month extraction, missing-month detection, business-month helpers.
// NOW WITH: Compliance Radar Engine — gap analysis for ALL recurring forms
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
  for (let i = 0; i < MONTH_NAMES_FULL.length; i++) {
    if (s.startsWith(MONTH_NAMES_FULL[i])) return s;
  }

  // Try YYYY-MM-DD or YYYY-MM
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const idx = parseInt(m[2], 10) - 1;
    if (idx >= 0 && idx < 12) {
      return `${MONTH_NAMES_FULL[idx]} ${m[1]}`;
    }
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const d = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (d) {
    const idx = parseInt(d[2], 10) - 1;
    if (idx >= 0 && idx < 12) {
      return `${MONTH_NAMES_FULL[idx]} ${d[3]}`;
    }
  }

  return null;
}

/**
 * Resolve the coverage period for a record.
 * Priority:
 *   1. form_data.coverage_period (already a named month)
 *   2. record_month
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

  // 4. Try items array (F/11, F/12, etc.)
  const fd = record.form_data as Record<string, unknown> | undefined;
  const items = fd?.items as Array<Record<string, unknown>> | undefined;
  if (items && items.length > 0) {
    for (const item of items) {
      for (const key of ['date', 'month', 'plan_date', 'actual_date']) {
        const iv = item[key] as string | undefined;
        if (iv) {
          const parsed = dateToMonthLabel(iv);
          if (parsed) return parsed;
        }
      }
    }
  }

  return 'Continuous / Open-Ended';
}

// ---------------------------------------------------------------------------
// Extract effective month from a record
// NOTE: parseRowToRecord() spreads form_data into the top-level RecordData.
// So record_month and coverage_period are at the top level, NOT under form_data.
// Returns YYYY-MM format (normalized).
// ---------------------------------------------------------------------------
export function getRecordMonth(record: RecordData): string | null {
  // 1. Try record_month — normalize MM/YYYY → YYYY-MM
  const rm = record.record_month as string | undefined;
  if (rm) {
    const trimmed = rm.trim();
    // Already YYYY-MM?
    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
    // MM/YYYY → YYYY-MM
    const mm = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (mm) return `${mm[2]}-${String(parseInt(mm[1], 10)).padStart(2, '0')}`;
    // Try dateToMonthLabel and convert back
    const parsed = dateToMonthLabel(trimmed);
    if (parsed) {
      const parts = parsed.split(' ');
      const monthIdx = MONTH_NAMES_FULL.indexOf(parts[0]);
      if (monthIdx >= 0 && parts[1]) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
    return trimmed; // return as-is if we can't parse
  }

  // 2. Try coverage_period — normalize "January 2026" → "2026-01"
  const cp = record.coverage_period as string | undefined;
  if (cp) {
    const trimmed = cp.trim();
    // Already YYYY-MM?
    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
    // "Month YYYY" → YYYY-MM
    const parsed = dateToMonthLabel(trimmed);
    if (parsed) {
      const parts = parsed.split(' ');
      const monthIdx = MONTH_NAMES_FULL.indexOf(parts[0]);
      if (monthIdx >= 0 && parts[1]) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
  }

  // 3. Try date field
  const dateVal = record.date as string | undefined;
  if (dateVal) {
    const parsed = dateToMonthLabel(dateVal);
    if (parsed) {
      const parts = parsed.split(' ');
      const monthIdx = MONTH_NAMES_FULL.indexOf(parts[0]);
      if (monthIdx >= 0 && parts[1]) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
  }

  // 4. Fallback: derive from _createdAt (YYYY-MM-DDTHH:mm:ssZ)
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

// ============================================================================
// COMPLIANCE
// ============================================================================
//
// The gap analysis that used to live here — a hand-written registry of
// recurring forms and a fixed Jan–Jun 2026 window — is now the period
// coverage engine in ./compliancePeriods, driven by each form's own frequency
// from the schema. The dashboard radar and the audit page both read it, so
// they can no longer disagree about the same records.

export type BusinessMonth = string;

/**
 * The months of the current year up to the current one.
 *
 * This used to be a hard-coded Jan–Jun 2026 list, so every timeline built on
 * it stopped at June while the data ran to September. The window now follows
 * the clock.
 */
export function getAllBusinessMonths(asOf: Date = new Date()): string[] {
  const year = asOf.getFullYear();
  const months: string[] = [];
  for (let m = 1; m <= asOf.getMonth() + 1; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

/** Current business month as YYYY-MM */
export function currentBusinessMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

