// ============================================================================
// QBase — The detailed compliance report
//
// The dashboard's Compliance Radar answers "which forms are behind, and by
// how much?" in one line each.  This module answers the question BEHIND
// that one: for every form with a gap, WHICH periods it missed, when each
// of them was due, how many days late each one is, what the form DID file
// this year, and what is still open.
//
// It is a READ-ONLY view over the one engine (`./compliance` →
// `./compliancePeriods`).  Nothing here recomputes a gap: the `missing`
// rows of a form are the `missing` states of its own period table, which
// is the same table the radar's count comes from.  That is the only way the
// big page and the small card can agree forever.
// ============================================================================

import { getLastFiledText, type FormCompliance } from './compliance';
import type { PeriodState } from './compliancePeriods';

/** One period of a form's year, flattened for display. */
export interface ReportPeriod {
  key: string;         // '2026-08' | '2026-Q3' | '2026-H2' | '2026'
  label: string;       // 'Aug 2026' | 'Q3 2026' | 'H2 2026' | '2026'
  dueDate: string;     // 'YYYY-MM-DD'
  state: PeriodState;  // covered | missing | open | upcoming
  daysLate: number;    // days past the deadline (0 unless it is missing)
}

/** Everything the report says about ONE form that owes a filing. */
export interface ReportForm {
  code: string;
  name: string;
  section: string;
  /** The cadence word: 'Monthly', 'Quarterly', 'Semi-annual', 'Annual'. */
  cadence: string;
  /** The missed count in the cadence's own unit: '9 months', '1 quarter'. */
  countLabel: string;
  missingCount: number;
  /** The unit word: 'month', 'quarter', 'half-year', 'year'. */
  unit: string;
  overdueDays: number;
  recordCount: number;
  neverFiled: boolean;
  lastFiledText: string;
  lastRecordDate: string | null;
  nextDueDate: string | null;
  /** EVERY period of the year, with its state. */
  periods: ReportPeriod[];
  /** Only the gaps — the same periods the radar counts. */
  missing: ReportPeriod[];
  coveredCount: number;
  periodCount: number;
  year: number;
}

/** The whole report. */
export interface ComplianceReport {
  year: number;
  forms: ReportForm[];
  formCount: number;
  /** Total missed periods across every form in the report. */
  missingCount: number;
  neverFiledCount: number;
  worstOverdueDays: number;
  worstFormCode: string | null;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-03-05' → '5 Mar 2026'. */
export function formatDueDate(dueDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!m) return dueDate;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return dueDate;
  return `${Number(m[3])} ${MONTH_LABELS[monthIndex]} ${m[1]}`;
}

/**
 * Build the detailed report from the compliance snapshot.
 *
 * `catalog` supplies the section each form belongs to (the compliance
 * snapshot does not carry one).  Only forms with at least one gap are in
 * the report — a form that owes nothing is not a finding.
 */
export function buildComplianceReport(
  complianceMap: Map<string, FormCompliance>,
  catalog: { code: string; section?: string }[],
  asOf: Date = new Date(),
): ComplianceReport {
  const sectionByCode = new Map(catalog.map(c => [c.code, c.section ?? '']));

  const forms: ReportForm[] = [];
  complianceMap.forEach(c => {
    if (!c.isOverdue || c.missingCount === 0) return;

    const periods: ReportPeriod[] = c.periodStates.map(s => ({
      key: s.period.key,
      label: s.period.label,
      dueDate: s.period.dueDate,
      state: s.state,
      daysLate: s.daysLate,
    }));

    forms.push({
      code: c.formCode,
      name: c.formName,
      section: sectionByCode.get(c.formCode) ?? '',
      cadence: c.frequencyLabel,
      countLabel: c.missingCountLabel,
      missingCount: c.missingCount,
      unit: c.periodUnit,
      overdueDays: c.overdueDays,
      recordCount: c.recordCount,
      neverFiled: c.recordCount === 0,
      lastFiledText: getLastFiledText(c.lastRecordDate, asOf),
      lastRecordDate: c.lastRecordDate,
      nextDueDate: c.nextDueDate,
      periods,
      missing: periods.filter(p => p.state === 'missing'),
      coveredCount: c.coveredCount,
      periodCount: periods.length,
      year: asOf.getFullYear(),
    });
  });

  // Worst first: the form that has been late longest is the one that needs
  // the answer today.
  forms.sort((a, b) =>
    b.overdueDays - a.overdueDays ||
    b.missingCount - a.missingCount ||
    a.code.localeCompare(b.code));

  const worst = forms[0] ?? null;

  return {
    year: asOf.getFullYear(),
    forms,
    formCount: forms.length,
    missingCount: forms.reduce((n, f) => n + f.missingCount, 0),
    neverFiledCount: forms.filter(f => f.neverFiled).length,
    worstOverdueDays: worst ? worst.overdueDays : 0,
    worstFormCode: worst ? worst.code : null,
  };
}

/** The anchor id of a form's block in the report page. */
export function reportAnchorId(code: string): string {
  return `compliance-gap-${code.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}`;
}
