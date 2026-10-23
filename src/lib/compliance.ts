// ============================================================================
// QBase — ISO Compliance & SLA Engine
// Frequency rules, due-date calculation, and health scoring.
//
// "Is this recurring form late, and by how much?" is answered by the period
// coverage engine in ./compliancePeriods. This module turns that answer into
// the snapshots the dashboard and the audit page render, so both read the
// same model and can never contradict each other.
// ============================================================================

import {
  formatPeriodCount,
  getMissingPeriods,
  getNextDueDate,
  getPeriodStates,
  periodUnit,
  toPeriodicFrequency,
  type PeriodicFrequency,
  type Period,
  type PeriodStateRow,
} from './compliancePeriods';

export type FrequencyType =
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-annual'
  | 'Yearly'
  | 'Per-Project'
  | 'Event-Driven';

export interface FrequencyRule {
  type: FrequencyType;
  label: string;
  graceDays: number;        // days after due before marked overdue
  intervalDays: number;     // expected cycle length (0 for non-cyclic)
}

export const FREQUENCY_RULES: Record<FrequencyType, FrequencyRule> = {
  Monthly:       { type: 'Monthly',       label: 'Monthly',       graceDays: 5,  intervalDays: 30 },
  Quarterly:     { type: 'Quarterly',     label: 'Quarterly',     graceDays: 10, intervalDays: 91 },
  'Semi-annual': { type: 'Semi-annual',   label: 'Semi-annual',   graceDays: 15, intervalDays: 182 },
  Yearly:        { type: 'Yearly',        label: 'Yearly',        graceDays: 14, intervalDays: 365 },
  'Per-Project': { type: 'Per-Project',   label: 'Per Project',   graceDays: 0,  intervalDays: 0 },
  'Event-Driven': { type: 'Event-Driven', label: 'Event-Driven',  graceDays: 0,  intervalDays: 0 },
};

/**
 * Map a schema frequency string into the strict FrequencyType enum.
 *
 * Quarterly and semi-annual used to collapse into 'Monthly' here, which gave
 * them a 30-day cycle and flagged them overdue a month after they were filed.
 * They are distinct cadences and now stay distinct.
 */
export function parseFrequency(raw: string): FrequencyType {
  const periodic = toPeriodicFrequency(raw);
  if (periodic) {
    switch (periodic) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi-annual': return 'Semi-annual';
      case 'annual': return 'Yearly';
    }
  }
  const lower = String(raw ?? '').toLowerCase();
  if (lower.includes('per project')) return 'Per-Project';
  return 'Event-Driven';
}

/**
 * Compute the number of days between two ISO dates.
 */
export function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Compliance status for a single form.
 */
export interface FormCompliance {
  formCode: string;
  formName: string;
  frequencyType: FrequencyType;
  frequencyLabel: string;   // the cadence word for a periodic form ("Monthly"),
                            // otherwise the schema's own wording ("On event")
  isPeriodic: boolean;
  lastRecordDate: string | null;
  nextDueDate: string | null;
  daysSinceLast: number | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  overdueDays: number;
  recordCount: number;
  missingPeriods: Period[]; // the periods that were due and were not filed
  missingCount: number;
  /** What one missed period of this cadence is called ('month', 'quarter'…). */
  periodUnit: string;
  /** The missed count in the cadence's own unit: '5 months', '1 quarter'. */
  missingCountLabel: string;
  /**
   * EVERY period of the current year with its state — filed, missed, still
   * open, or not yet begun.  This is the whole-year coverage table the
   * detailed report draws; the `missing` rows in it are exactly
   * `missingPeriods`, so the table can never contradict the count.
   */
  periodStates: PeriodStateRow[];
  /** How many of this year's periods are filed. */
  coveredCount: number;
}

/** A filing, reduced to what the engine needs. */
export interface ComplianceRecord {
  formCode: string;
  createdAt: string;    // when the filing was made
  month: string | null; // 'YYYY-MM' the filing covers
}

/** A form definition, reduced to what the engine needs. */
export interface ComplianceForm {
  code: string;
  name: string;
  frequency: string;
}

/**
 * The cadence word to show for a form that owes a periodic filing.
 *
 * The catalogue carries the wording each form's own documentation uses
 * ("Monthly during dev" for F/35), which is right in the form register and
 * wrong in a compliance sentence — the radar read "Monthly during dev form
 * — 1 period overdue". A form that owes a filing shows its cadence; a form
 * that owes none keeps the catalogue's own wording ("On event", "Daily").
 */
const PERIODIC_LABELS: Record<PeriodicFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'semi-annual': 'Semi-annual',
  annual: 'Annual',
};

/**
 * Build the compliance snapshot for every form.
 *
 * A form is late when it owes a filing for a period that has closed and that
 * no record covers. The same gaps drive the dashboard counter, the department
 * health card and the compliance radar — one model, one number.
 */
export function buildComplianceMap(
  records: ComplianceRecord[],
  forms: ComplianceForm[],
  asOf: Date = new Date(),
): Map<string, FormCompliance> {
  const byForm = new Map<string, { latest: string; count: number; months: Set<string> }>();
  for (const r of records) {
    const code = String(r.formCode ?? '');
    if (!code) continue;
    let entry = byForm.get(code);
    if (!entry) {
      entry = { latest: r.createdAt, count: 0, months: new Set<string>() };
      byForm.set(code, entry);
    }
    entry.count += 1;
    if (r.createdAt && (!entry.latest || r.createdAt > entry.latest)) {
      entry.latest = r.createdAt;
    }
    if (r.month) entry.months.add(r.month);
  }

  const map = new Map<string, FormCompliance>();
  for (const form of forms) {
    const entry = byForm.get(form.code);
    const frequencyType = parseFrequency(form.frequency);
    const periodic: PeriodicFrequency | null = toPeriodicFrequency(form.frequency);
    const months = entry?.months ?? new Set<string>();
    const lastRecordDate = entry?.latest || null;

    const missingPeriods = periodic ? getMissingPeriods(months, periodic, asOf) : [];
    const periodStates = periodic ? getPeriodStates(months, periodic, asOf) : [];
    const nextPeriod = periodic ? getNextDueDate(months, periodic, asOf) : null;
    const nextDueDate = nextPeriod?.dueDate ?? null;
    const daysUntilDue = nextDueDate ? daysBetween(asOf.toISOString(), nextDueDate) : null;

    // How long the form has been late: measured from the oldest missed deadline.
    const overdueDays = missingPeriods.length > 0
      ? daysBetween(`${missingPeriods[0].dueDate}T00:00:00`, asOf.toISOString())
      : 0;

    map.set(form.code, {
      formCode: form.code,
      formName: form.name,
      frequencyType,
      frequencyLabel: periodic ? PERIODIC_LABELS[periodic] : form.frequency,
      isPeriodic: periodic !== null,
      lastRecordDate,
      nextDueDate,
      daysSinceLast: lastRecordDate ? daysBetween(lastRecordDate, asOf.toISOString()) : null,
      daysUntilDue,
      isOverdue: missingPeriods.length > 0,
      overdueDays,
      recordCount: entry?.count ?? 0,
      missingPeriods,
      missingCount: missingPeriods.length,
      periodUnit: periodic ? periodUnit(periodic) : '',
      missingCountLabel: periodic ? formatPeriodCount(periodic, missingPeriods.length) : '',
      periodStates,
      coveredCount: periodStates.filter(s => s.state === 'covered').length,
    });
  }

  return map;
}

/**
 * Human-readable countdown / urgency text.
 */
export function getUrgencyText(compliance: FormCompliance): string {
  if (!compliance.isPeriodic) return compliance.frequencyLabel;
  if (compliance.isOverdue) {
    return `Overdue by ${compliance.overdueDays} day${compliance.overdueDays === 1 ? '' : 's'}`;
  }
  if (compliance.daysUntilDue === null) return 'No deadline';
  const d = compliance.daysUntilDue;
  if (d <= 0) return 'Due now';
  if (d <= 7) return `Due in ${d} day${d === 1 ? '' : 's'}`;
  if (d <= 30) return `Due in ${Math.ceil(d / 7)} weeks`;
  return `Due in ${Math.ceil(d / 30)} months`;
}

/**
 * Human-readable "last filed" text.
 *
 * `asOf` is a parameter so a report can be rendered against a fixed
 * reference moment (and tested against one) without the text drifting
 * from the rest of the snapshot.
 */
export function getLastFiledText(lastDate: string | null, asOf: Date = new Date()): string {
  if (!lastDate) return 'Never filed';
  const days = daysBetween(lastDate, asOf.toISOString());
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Department-level SLA health summary.
 */
export interface DeptHealth {
  totalForms: number;
  totalSubmissions: number;
  overdueCount: number;
  cyclicalForms: number;   // forms with a fixed cadence
  healthyCyclical: number; // cyclical forms that are NOT overdue
  status: 'healthy' | 'warning' | 'critical';
}

const PERIODIC_TYPES: FrequencyType[] = ['Monthly', 'Quarterly', 'Semi-annual', 'Yearly'];

/**
 * Compute SLA health for a department from compliance data.
 */
export function computeDeptHealth(
  forms: { code: string; frequencyType: FrequencyType }[],
  complianceMap: Map<string, FormCompliance>
): DeptHealth {
  let totalSubmissions = 0;
  let overdueCount = 0;
  let cyclicalForms = 0;
  let healthyCyclical = 0;

  forms.forEach(f => {
    const c = complianceMap.get(f.code);
    if (c) totalSubmissions += c.recordCount;
    if (!PERIODIC_TYPES.includes(f.frequencyType)) return;

    cyclicalForms++;
    // A form with no record at all is late for every period it owes.
    if (c && !c.isOverdue) healthyCyclical++;
    else overdueCount++;
  });

  let status: DeptHealth['status'] = 'healthy';
  if (overdueCount > 0) status = 'warning';
  if (overdueCount >= 3 || (cyclicalForms > 0 && healthyCyclical === 0)) status = 'critical';

  return {
    totalForms: forms.length,
    totalSubmissions,
    overdueCount,
    cyclicalForms,
    healthyCyclical,
    status,
  };
}
