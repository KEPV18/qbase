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

// ============================================================================
// COMPLIANCE RADAR ENGINE — Gap Analysis for ALL Recurring Forms
// ============================================================================

/**
 * All recurring forms with their frequencies.
 * Monthly: expected every month
 * Quarterly: expected every 3 months
 * Semi-annual: expected every 6 months
 * Annual: expected once per year
 */
export const RECURRING_FORMS: Record<string, { code: string; name: string; frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' }> = {
  'F/11': { code: 'F/11', name: 'Production Plan', frequency: 'monthly' },
  'F/35': { code: 'F/35', name: 'Design Monitoring', frequency: 'monthly' },
  'F/48': { code: 'F/48', name: 'Internal Audit Report', frequency: 'monthly' },
  'F/24': { code: 'F/24', name: 'Objectives & Targets', frequency: 'quarterly' },
  'F/25': { code: 'F/25', name: 'Audit Plan', frequency: 'semi-annual' },
  'F/40': { code: 'F/40', name: 'Competence Matrix', frequency: 'semi-annual' },
  'F/15': { code: 'F/15', name: 'Approved Vendor List', frequency: 'annual' },
  'F/16': { code: 'F/16', name: 'Supplier Registration', frequency: 'annual' },
  'F/42': { code: 'F/42', name: 'Annual Training Plan', frequency: 'annual' },
};

/** Get all recurring form codes */
export function getAllRecurringFormCodes(): string[] {
  return Object.keys(RECURRING_FORMS);
}

/** Check if a form code is recurring */
export function isRecurringForm(code: string): boolean {
  return code in RECURRING_FORMS;
}

/** Get the frequency label for a form code */
export function getFormFrequency(code: string): string {
  return RECURRING_FORMS[code]?.frequency || 'unknown';
}

/** Get the display name for a form code */
export function getFormDisplayName(code: string): string {
  return RECURRING_FORMS[code]?.name || code;
}

/**
 * Business months (Jan 2026 … Jun 2026)
 * This is the timeline we check against.
 */
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

/**
 * Get the expected periods for a recurring form based on its frequency.
 * Returns YYYY-MM strings that the form SHOULD have records for.
 */
export function getExpectedPeriods(formCode: string): string[] {
  const info = RECURRING_FORMS[formCode];
  if (!info) return [];

  const allMonths = [...BUSINESS_MONTHS];

  switch (info.frequency) {
    case 'monthly':
      return allMonths; // Every month Jan-Jun

    case 'quarterly': {
      // Q1: Jan-Mar, Q2: Apr-Jun
      // Return the LAST month of each quarter as the expected period
      const quarters = ['2026-03', '2026-06'];
      return quarters;
    }

    case 'semi-annual': {
      // H1: Jan-Jun → return June
      return ['2026-06'];
    }

    case 'annual': {
      // Annual → return June (mid-year check)
      return ['2026-06'];
    }

    default:
      return [];
  }
}

/**
 * Get missing periods for a specific recurring form.
 * Returns the YYYY-MM periods that are missing (no active record found).
 */
export function getMissingPeriods(
  records: RecordData[],
  formCode: string,
): string[] {
  const info = RECURRING_FORMS[formCode];
  if (!info) return [];

  const expected = getExpectedPeriods(formCode);
  if (expected.length === 0) return [];

  // Collect existing months for this form
  const existing = new Set<string>();
  for (const r of records) {
    if (String(r.formCode) !== formCode) continue;
    const m = getRecordMonth(r);
    if (m) existing.add(m);
  }

  // For quarterly/semi-annual/annual, check if ANY record exists in the period range
  if (info.frequency !== 'monthly') {
    // For non-monthly, we check if there's at least one record in the expected range
    const missing: string[] = [];
    for (const period of expected) {
      const [year, month] = period.split('-').map(Number);
      // Check if any existing record falls within this period's range
      let found = false;
      for (const exMonth of existing) {
        const [ey, em] = exMonth.split('-').map(Number);
        if (ey !== year) continue;
        switch (info.frequency) {
          case 'quarterly': {
            // Q1: months 1-3, Q2: months 4-6
            const q = Math.ceil(month / 3); // 1 or 2
            const eq = Math.ceil(em / 3);
            if (eq === q) found = true;
            break;
          }
          case 'semi-annual': {
            // H1: months 1-6
            if (em >= 1 && em <= 6) found = true;
            break;
          }
          case 'annual': {
            // Any month in the year
            if (ey === year) found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) missing.push(period);
    }
    return missing;
  }

  // Monthly: simple missing check
  return expected.filter(m => !existing.has(m));
}

/**
 * Get ALL missing periods across all recurring forms.
 * Returns Map<form_code, missing_periods[]>
 */
export function getAllMissingPeriods(
  records: RecordData[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const code of getAllRecurringFormCodes()) {
    const missing = getMissingPeriods(records, code);
    if (missing.length > 0) {
      map.set(code, missing);
    }
  }
  return map;
}

/**
 * Format a period label for display.
 * For monthly: "June 2026"
 * For quarterly: "Q1 2026" or "Q2 2026"
 * For semi-annual: "H1 2026"
 * For annual: "2026"
 */
export function formatPeriodLabel(ym: string, frequency?: string): string {
  const [y, m] = ym.split('-');
  const year = y;
  const monthNum = parseInt(m, 10);

  if (frequency === 'quarterly') {
    const q = Math.ceil(monthNum / 3);
    return `Q${q} ${year}`;
  }
  if (frequency === 'semi-annual') {
    return `H1 ${year}`;
  }
  if (frequency === 'annual') {
    return year;
  }

  // Default: monthly
  return monthLabel(ym);
}

// ============================================================================
// Legacy exports — kept for backward compatibility
// ============================================================================

/** @deprecated Use getAllMissingPeriods instead */
export const MONTHLY_FORM_CODES = new Set(['F/11', 'F/35', 'F/48']);

/** @deprecated Use isRecurringForm instead */
export function isMonthlyForm(code: string): boolean {
  return MONTHLY_FORM_CODES.has(code);
}

/** @deprecated Use getMissingPeriods instead */
export function getMissingMonths(
  records: RecordData[],
  formCode: string,
): string[] {
  return getMissingPeriods(records, formCode);
}

/** @deprecated Use getAllMissingPeriods instead */
export function getAllMissingMonths(
  records: RecordData[],
): Map<string, string[]> {
  return getAllMissingPeriods(records);
}
