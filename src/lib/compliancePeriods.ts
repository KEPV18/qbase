// ============================================================================
// QBase — Period Coverage Engine
// One model for the question "is this recurring form late, and by how much?".
//
// The dashboard used to answer that question twice, two different ways:
//   • the header counter   — cycle length counted from the last filing date
//   • the Compliance Radar — a hard-coded Jan–Jun 2026 window
// The two could contradict each other on the same screen ("All Recurring Forms
// Are Up to Date" next to "8 overdue forms"). Both now read this engine.
//
// Model: a periodic form (monthly / quarterly / semi-annual / annual) owes one
// filing per calendar period. A period becomes a GAP when it has begun, its due
// date (end of the period + grace) has passed, and no record covers it. A
// period that has not closed yet is never a gap — it is still open.
// ============================================================================

export type PeriodicFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

/**
 * What ONE missed period is called, in the cadence's own unit.
 *
 * The dashboard used to say "5 periods overdue" for every cadence, which
 * asks the reader to do the arithmetic: is that five months, five
 * quarters, or five years? A monthly form that has gone five months
 * unfilled owes five MONTHS — so that is what it says.
 */
export const PERIOD_UNITS: Record<PeriodicFrequency, { one: string; many: string }> = {
  monthly: { one: 'month', many: 'months' },
  quarterly: { one: 'quarter', many: 'quarters' },
  'semi-annual': { one: 'half-year', many: 'half-years' },
  annual: { one: 'year', many: 'years' },
};

/** The unit word for one missed period of this cadence. */
export function periodUnit(freq: PeriodicFrequency): string {
  return PERIOD_UNITS[freq].one;
}

/** '5 months', '1 quarter' — the count in the cadence's own unit. */
export function formatPeriodCount(freq: PeriodicFrequency, count: number): string {
  const unit = PERIOD_UNITS[freq];
  return `${count} ${count === 1 ? unit.one : unit.many}`;
}


export interface Period {
  key: string;         // '2026-08' | '2026-Q3' | '2026-H2' | '2026'
  label: string;       // 'Aug 2026' | 'Q3 2026' | 'H2 2026' | '2026'
  startMonth: string;  // '2026-08' — inclusive
  endMonth: string;    // '2026-08' — inclusive
  dueDate: string;     // 'YYYY-MM-DD' — end of the period + grace
}

/** Days after a period closes before the filing counts as late. */
export const PERIOD_GRACE_DAYS: Record<PeriodicFrequency, number> = {
  monthly: 5,
  quarterly: 10,
  'semi-annual': 15,
  annual: 14,
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Schema frequency string → periodic frequency.
 * Returns null for forms that owe no fixed cadence ("On event", "Daily",
 * "Per project", "Per person", "Before meeting", …) — those are never late.
 */
export function toPeriodicFrequency(raw: string | null | undefined): PeriodicFrequency | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('monthly')) return 'monthly';
  if (s.startsWith('quarterly')) return 'quarterly';
  // 'semi-annual' also contains 'annual' — it has to be tested first.
  if (s.includes('semi-annual') || s.includes('semi annual')) return 'semi-annual';
  if (s.includes('annual') || s.includes('yearly')) return 'annual';
  return null;
}

/** Last day of a 1-based month, plus `grace` days → 'YYYY-MM-DD'. */
function dueDateFor(year: number, month: number, grace: number): string {
  const d = new Date(year, month, 0); // day 0 of the next month = last day of this one
  d.setDate(d.getDate() + grace);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Every period of the given frequency inside one calendar year. */
export function getPeriodsForYear(freq: PeriodicFrequency, year: number): Period[] {
  const grace = PERIOD_GRACE_DAYS[freq];
  const periods: Period[] = [];

  if (freq === 'monthly') {
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${pad2(m)}`;
      periods.push({
        key,
        label: `${MONTH_LABELS[m - 1]} ${year}`,
        startMonth: key,
        endMonth: key,
        dueDate: dueDateFor(year, m, grace),
      });
    }
    return periods;
  }

  if (freq === 'quarterly') {
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      periods.push({
        key: `${year}-Q${q}`,
        label: `Q${q} ${year}`,
        startMonth: `${year}-${pad2(startMonth)}`,
        endMonth: `${year}-${pad2(endMonth)}`,
        dueDate: dueDateFor(year, endMonth, grace),
      });
    }
    return periods;
  }

  if (freq === 'semi-annual') {
    for (let h = 1; h <= 2; h++) {
      const startMonth = (h - 1) * 6 + 1;
      const endMonth = h * 6;
      periods.push({
        key: `${year}-H${h}`,
        label: `H${h} ${year}`,
        startMonth: `${year}-${pad2(startMonth)}`,
        endMonth: `${year}-${pad2(endMonth)}`,
        dueDate: dueDateFor(year, endMonth, grace),
      });
    }
    return periods;
  }

  periods.push({
    key: `${year}`,
    label: `${year}`,
    startMonth: `${year}-01`,
    endMonth: `${year}-12`,
    dueDate: dueDateFor(year, 12, grace),
  });
  return periods;
}

/** The month a date falls in, as 'YYYY-MM'. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Periods of the frequency that have already begun. */
export function getExpectedPeriods(freq: PeriodicFrequency, asOf: Date = new Date()): Period[] {
  const year = asOf.getFullYear();
  const current = monthKey(asOf);
  return getPeriodsForYear(freq, year).filter(p => p.startMonth <= current);
}

/** The first period that has not begun yet. */
export function getUpcomingPeriods(freq: PeriodicFrequency, asOf: Date = new Date(), count = 1): Period[] {
  const year = asOf.getFullYear();
  const current = monthKey(asOf);
  const all = [...getPeriodsForYear(freq, year), ...getPeriodsForYear(freq, year + 1)];
  return all.filter(p => p.startMonth > current).slice(0, count);
}

/** Does any covered month fall inside the period? */
export function isPeriodCovered(period: Period, coveredMonths: Iterable<string>): boolean {
  for (const m of coveredMonths) {
    if (m >= period.startMonth && m <= period.endMonth) return true;
  }
  return false;
}

/** Has the period's due date passed? The period is still open until it does. */
export function isPeriodDue(period: Period, asOf: Date = new Date()): boolean {
  return new Date(`${period.dueDate}T23:59:59`).getTime() < asOf.getTime();
}

/**
 * The periods a form should have filed and has not — the gaps.
 * Only periods whose due date has passed count; the open period is not a gap.
 */
export function getMissingPeriods(
  coveredMonths: Iterable<string>,
  freq: PeriodicFrequency,
  asOf: Date = new Date(),
): Period[] {
  const covered = new Set(coveredMonths);
  return getExpectedPeriods(freq, asOf).filter(
    p => isPeriodDue(p, asOf) && !isPeriodCovered(p, covered),
  );
}

/**
 * The state of ONE period of a year, for the coverage table.
 *
 * `covered`  — a record covers it.
 * `missing`  — the deadline has passed and nothing covers it: a GAP.
 * `open`     — the period has begun and is still inside its grace window.
 * `upcoming` — the period has not begun yet.
 */
export type PeriodState = 'covered' | 'missing' | 'open' | 'upcoming';

export interface PeriodStateRow {
  period: Period;
  state: PeriodState;
  /**
   * Days between the period's deadline and `asOf` — 0 unless it is missing.
   *
   * Measured from the deadline at local midnight, exactly the way the
   * compliance snapshot measures a form's lateness, so the per-period
   * figure and the form's own "N days overdue" can never disagree by a day.
   */
  daysLate: number;
}

function daysLateAs(period: Period, asOf: Date): number {
  const due = new Date(`${period.dueDate}T00:00:00`).getTime();
  return Math.floor((asOf.getTime() - due) / (1000 * 60 * 60 * 24));
}

/**
 * Every period of the current year, each with its state.
 *
 * This is the row-by-row version of the gap list: it says what a form DID
 * file, what it MISSED and what is not yet due, so a report can show the
 * whole year instead of only the holes.  The set of `missing` rows here is
 * exactly `getMissingPeriods()` — the same engine, read twice.
 */
export function getPeriodStates(
  coveredMonths: Iterable<string>,
  freq: PeriodicFrequency,
  asOf: Date = new Date(),
): PeriodStateRow[] {
  const covered = new Set(coveredMonths);
  const current = monthKey(asOf);
  return getPeriodsForYear(freq, asOf.getFullYear()).map(period => {
    if (isPeriodCovered(period, covered)) {
      return { period, state: 'covered', daysLate: 0 };
    }
    if (isPeriodDue(period, asOf)) {
      return { period, state: 'missing', daysLate: daysLateAs(period, asOf) };
    }
    return {
      period,
      state: period.startMonth <= current ? 'open' : 'upcoming',
      daysLate: 0,
    };
  });
}

/** The next deadline for a form, whether it is already late or still ahead. */
export function getNextDueDate(
  coveredMonths: Iterable<string>,
  freq: PeriodicFrequency,
  asOf: Date = new Date(),
): Period | null {
  const covered = new Set(coveredMonths);
  const uncovered = getExpectedPeriods(freq, asOf).filter(p => !isPeriodCovered(p, covered));
  if (uncovered.length > 0) return uncovered[0];
  return getUpcomingPeriods(freq, asOf, 1)[0] ?? null;
}
