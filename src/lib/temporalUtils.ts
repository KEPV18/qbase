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

// ============================================================================
// COMPLIANCE RADAR ENGINE — Gap Analysis for ALL Recurring Forms
// ============================================================================

/**
 * Recurring form definitions with their expected frequency and period coverage.
 * The radar engine uses this to detect missing records.
 */
export interface RecurringFormDef {
  code: string;
  name: string;
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  /** Expected periods in YYYY-MM format (monthly) or YYYY-Q[1-4] (quarterly) or YYYY-H[1-2] (semi-annual) or YYYY (annual) */
  expectedPeriods: string[];
}

/** All recurring forms with their expected periods up to June 2026 */
export const RECURRING_FORMS: RecurringFormDef[] = [
  // ── Monthly ──
  { code: 'F/11', name: 'Production Plan', frequency: 'monthly', expectedPeriods: ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'] },
  { code: 'F/35', name: 'Design Monitoring', frequency: 'monthly', expectedPeriods: ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'] },
  { code: 'F/48', name: 'Internal Audit Report', frequency: 'monthly', expectedPeriods: ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'] },
  // ── Quarterly ──
  { code: 'F/24', name: 'Objectives & Targets', frequency: 'quarterly', expectedPeriods: ['2026-Q1','2026-Q2'] },
  // ── Semi-annual ──
  { code: 'F/25', name: 'Audit Plan', frequency: 'semi-annual', expectedPeriods: ['2026-H1'] },
  { code: 'F/40', name: 'Competence Matrix', frequency: 'semi-annual', expectedPeriods: ['2026-H1'] },
  // ── Annual ──
  { code: 'F/15', name: 'Approved Vendor List', frequency: 'annual', expectedPeriods: ['2026'] },
  { code: 'F/16', name: 'Supplier Registration Form', frequency: 'annual', expectedPeriods: ['2026'] },
  { code: 'F/42', name: 'Annual Training Plan', frequency: 'annual', expectedPeriods: ['2026'] },
];

/** Legacy set for backward compatibility */
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
// Returns YYYY-MM format (normalized)
// ---------------------------------------------------------------------------
export function getRecordMonth(record: RecordData): string | null {
  const fd = record.form_data as Record<string, unknown> | undefined;
  
  // 1. Try record_month — normalize MM/YYYY → YYYY-MM
  if (fd?.record_month && typeof fd.record_month === 'string') {
    const rm = fd.record_month.trim();
    // Already YYYY-MM?
    if (/^\d{4}-\d{2}$/.test(rm)) return rm;
    // MM/YYYY → YYYY-MM
    const mm = rm.match(/^(\d{1,2})\/(\d{4})$/);
    if (mm) return `${mm[2]}-${String(parseInt(mm[1], 10)).padStart(2, '0')}`;
    // Try dateToMonthLabel and convert back
    const parsed = dateToMonthLabel(rm);
    if (parsed) {
      const parts = parsed.split(' ');
      const monthIdx = MONTH_NAMES_FULL.indexOf(parts[0]);
      if (monthIdx >= 0 && parts[1]) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
    return rm; // return as-is if we can't parse
  }

  // 2. Try coverage_period — normalize "January 2026" → "2026-01"
  if (fd?.coverage_period && typeof fd.coverage_period === 'string') {
    const cp = fd.coverage_period.trim();
    // Already YYYY-MM?
    if (/^\d{4}-\d{2}$/.test(cp)) return cp;
    // "Month YYYY" → YYYY-MM
    const parsed = dateToMonthLabel(cp);
    if (parsed) {
      const parts = parsed.split(' ');
      const monthIdx = MONTH_NAMES_FULL.indexOf(parts[0]);
      if (monthIdx >= 0 && parts[1]) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
  }

  // 3. Fallback: derive from _createdAt (YYYY-MM-DDTHH:mm:ssZ)
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
// COMPLIANCE RADAR — Gap Detection for ALL Recurring Forms
// ---------------------------------------------------------------------------

/**
 * Get the period identifier from a record based on its form code and data.
 * Returns YYYY-MM for monthly, YYYY-Q[1-4] for quarterly, YYYY-H[1-2] for semi-annual, YYYY for annual.
 */
function getRecordPeriod(record: RecordData, def: RecurringFormDef): string | null {
  const month = getRecordMonth(record);
  if (!month) return null;

  const [year, mm] = month.split('-');
  const monthNum = parseInt(mm, 10);

  switch (def.frequency) {
    case 'monthly':
      return month; // YYYY-MM
    case 'quarterly': {
      const q = Math.ceil(monthNum / 3);
      return `${year}-Q${q}`;
    }
    case 'semi-annual': {
      const h = monthNum <= 6 ? 1 : 2;
      return `${year}-H${h}`;
    }
    case 'annual':
      return year;
    default:
      return null;
  }
}

/**
 * Detect missing periods for a specific recurring form.
 * Returns an array of period labels that are missing (e.g. ["2026-05", "2026-06"]).
 */
export function getMissingPeriods(
  records: RecordData[],
  def: RecurringFormDef,
): string[] {
  const existing = new Set<string>();
  for (const r of records) {
    if (String(r.formCode) !== def.code) continue;
    const period = getRecordPeriod(r, def);
    if (period) existing.add(period);
  }
  return def.expectedPeriods.filter(p => !existing.has(p));
}

/**
 * Get ALL missing periods across all recurring forms.
 * Returns a Map<formCode, { def: RecurringFormDef, missing: string[] }>
 */
export function getAllMissingPeriods(
  records: RecordData[],
): Map<string, { def: RecurringFormDef; missing: string[] }> {
  const map = new Map<string, { def: RecurringFormDef; missing: string[] }>();
  for (const def of RECURRING_FORMS) {
    const missing = getMissingPeriods(records, def);
    if (missing.length > 0) {
      map.set(def.code, { def, missing });
    }
  }
  return map;
}

/**
 * Format a period label for display.
 * "2026-05" → "May 2026"
 * "2026-Q1" → "Q1 2026"
 * "2026-H1" → "H1 2026"
 * "2026" → "2026"
 */
export function formatPeriodLabel(period: string): string {
  // Monthly: YYYY-MM
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const monthIdx = parseInt(monthMatch[2], 10) - 1;
    return `${MONTH_NAMES_FULL[monthIdx]} ${monthMatch[1]}`;
  }
  // Quarterly: YYYY-Q[1-4]
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) return `Q${qMatch[2]} ${qMatch[1]}`;
  // Semi-annual: YYYY-H[1-2]
  const hMatch = period.match(/^(\d{4})-H([1-2])$/);
  if (hMatch) return `H${hMatch[2]} ${hMatch[1]}`;
  // Annual: YYYY
  if (/^\d{4}$/.test(period)) return period;
  return period;
}

/** Legacy: get missing months for a specific monthly form */
export function getMissingMonths(
  records: RecordData[],
  formCode: string,
): string[] {
  if (!isMonthlyForm(formCode)) return [];
  const def = RECURRING_FORMS.find(d => d.code === formCode);
  if (!def) return [];
  return getMissingPeriods(records, def);
}

/** Legacy: missing months grouped by form code for monthly forms */
export function getAllMissingMonths(
  records: RecordData[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const code of MONTHLY_FORM_CODES) {
    const def = RECURRING_FORMS.find(d => d.code === code);
    if (!def) continue;
    const missing = getMissingPeriods(records, def);
    if (missing.length > 0) map.set(code, missing);
  }
  return map;
}
