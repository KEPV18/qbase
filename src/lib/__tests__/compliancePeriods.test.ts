// ============================================================================
// QBase — Period coverage engine tests
//
// These are not synthetic shapes: the fixture below is the restored production
// dataset (project hkkdbxvmvvcxpgfqlrnp) as of 2026-10-22 — the exact data that
// made the dashboard print "8 overdue forms" and "All Recurring Forms Are Up
// to Date" on the same screen. The expectations below are the single truth
// every surface (dashboard header, Compliance Radar, Audit page, Forms
// Registry) must now agree on.
//
// Coverage months were extracted from the restored `records` table with the
// same resolution order getRecordMonth() uses:
//   record_month → coverage_period → date fields → created_at
// Two of them (F/11, F/35) carry no record_month at all — their most recent
// filing has only `date: "31/08/2026"` — so a naive created_at fallback reads
// them as September filings. They are August filings.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  toPeriodicFrequency,
  getPeriodsForYear,
  getMissingPeriods,
  getNextDueDate,
  isPeriodDue,
  PERIOD_GRACE_DAYS,
} from '../compliancePeriods';
import { parseFrequency, buildComplianceMap, computeDeptHealth } from '../compliance';

// The reference moment the live pages were measured at.
const AS_OF = new Date('2026-10-22T12:00:00');

/** Build the filing list from a compact "code: months" map. */
const filingsFor = (spec: Record<string, string[]>): { code: string; month: string }[] =>
  Object.entries(spec).flatMap(([code, months]) =>
    months.map(month => ({ code, month })),
  );

// ── The restored dataset, reduced to what the engine reads ──────────────────
const FILINGS = filingsFor({
  // F/10 — monthly, filed Jan, Jul, Aug → Feb–Jun and Sep are missing.
  'F/10': ['2026-01', '2026-07', '2026-08'],
  // F/11 — monthly, filed Jan–Aug → Sep is missing.
  'F/11': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
  // F/15 / F/16 / F/42 — annual, 2026 covered.
  'F/15': ['2026-01'],
  'F/16': ['2026-01'],
  'F/42': ['2026-01'],
  // F/18 — daily; no fixed cadence.
  'F/18': ['2026-01'],
  // F/24 — quarterly, Q1–Q3 covered.
  'F/24': ['2026-03', '2026-04', '2026-05', '2026-06', '2026-08'],
  // F/25 / F/40 — semi-annual, H1 covered.
  'F/25': ['2026-01', '2026-07'],
  'F/40': ['2026-01', '2026-07'],
  // F/35 — monthly, filed Jan–Aug → Sep is missing.
  'F/35': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
  // F/48 — monthly, filed Jan–Jul → Aug and Sep are missing.
  'F/48': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'],
  // F/49 has no record at all — the never-filed case.
});

// The forms the compliance surfaces score, with their canonical identity
// (src/data/formCatalog.ts — the registry names, which are the names the
// production records carry).
const FORMS = [
  { code: 'F/10', name: 'Customer Feedback', frequency: 'Monthly' },
  { code: 'F/11', name: 'Production Plan', frequency: 'Monthly' },
  { code: 'F/15', name: 'Approved Vendor List', frequency: 'Annual' },
  { code: 'F/16', name: 'Supplier Registration Form', frequency: 'Annual' },
  { code: 'F/18', name: 'Product Re-Call', frequency: 'On event' },
  { code: 'F/24', name: 'Objectives & Targets', frequency: 'Quarterly' },
  { code: 'F/25', name: 'Audit Plan', frequency: 'Semi-annual' },
  { code: 'F/35', name: 'Design Monitoring', frequency: 'Monthly during dev' },
  { code: 'F/40', name: 'Competence Matrix', frequency: 'Semi-annual' },
  { code: 'F/42', name: 'Annual Training Plan', frequency: 'Annual' },
  { code: 'F/48', name: 'Internal Audit Report', frequency: 'Monthly' },
  { code: 'F/49', name: 'Document Master List', frequency: 'Monthly' },
];

const records = FILINGS.map(f => ({
  formCode: f.code,
  createdAt: `${f.month}-15T09:00:00.000Z`,
  month: f.month,
}));

const map = buildComplianceMap(records, FORMS, AS_OF);
const overdueCodes = [...map.values()].filter(c => c.isOverdue).map(c => c.formCode).sort();

describe('toPeriodicFrequency', () => {
  it('maps each periodic cadence', () => {
    expect(toPeriodicFrequency('Monthly')).toBe('monthly');
    expect(toPeriodicFrequency('Quarterly')).toBe('quarterly');
    expect(toPeriodicFrequency('Semi-annual')).toBe('semi-annual');
    expect(toPeriodicFrequency('Annual')).toBe('annual');
  });

  it('does not read "Semi-annual" as annual', () => {
    expect(toPeriodicFrequency('Semi-annual')).not.toBe('annual');
  });

  it('returns null for cadences that owe no fixed deadline', () => {
    for (const f of ['Daily', 'On event', 'Per project', 'Per person', 'Per session', '']) {
      expect(toPeriodicFrequency(f)).toBeNull();
    }
  });
});

describe('parseFrequency', () => {
  it('keeps quarterly and semi-annual distinct from monthly', () => {
    // These two used to collapse into 'Monthly' (a 30-day cycle), which is
    // what made correctly-filed quarterly forms look overdue.
    expect(parseFrequency('Quarterly')).toBe('Quarterly');
    expect(parseFrequency('Semi-annual')).toBe('Semi-annual');
    expect(parseFrequency('Monthly')).toBe('Monthly');
    expect(parseFrequency('Annual')).toBe('Yearly');
  });

  it('maps non-periodic cadences to the non-periodic types', () => {
    expect(parseFrequency('Daily')).toBe('Event-Driven');
    expect(parseFrequency('On event')).toBe('Event-Driven');
    expect(parseFrequency('Per project')).toBe('Per-Project');
  });
});

describe('getPeriodsForYear', () => {
  it('builds 12 monthly, 4 quarterly, 2 semi-annual and 1 annual period', () => {
    expect(getPeriodsForYear('monthly', 2026)).toHaveLength(12);
    expect(getPeriodsForYear('quarterly', 2026)).toHaveLength(4);
    expect(getPeriodsForYear('semi-annual', 2026)).toHaveLength(2);
    expect(getPeriodsForYear('annual', 2026)).toHaveLength(1);
  });

  it('applies the grace period to each cadence', () => {
    const monthly = getPeriodsForYear('monthly', 2026)[0]; // January
    expect(monthly.dueDate).toBe('2026-02-05'); // Jan 31 + 5 days
    const quarterly = getPeriodsForYear('quarterly', 2026)[0]; // Q1
    expect(quarterly.dueDate).toBe('2026-04-10'); // Mar 31 + 10 days
    const semi = getPeriodsForYear('semi-annual', 2026)[0]; // H1
    expect(semi.dueDate).toBe('2026-07-15'); // Jun 30 + 15 days
    const annual = getPeriodsForYear('annual', 2026)[0];
    expect(annual.dueDate).toBe('2027-01-14'); // Dec 31 + 14 days
  });

  it('exposes the grace days it used', () => {
    expect(PERIOD_GRACE_DAYS).toEqual({ monthly: 5, quarterly: 10, 'semi-annual': 15, annual: 14 });
  });
});

describe('isPeriodDue', () => {
  it('keeps a period open until its grace period has passed', () => {
    const january = getPeriodsForYear('monthly', 2026)[0];
    expect(isPeriodDue(january, new Date('2026-02-05T12:00:00'))).toBe(false);
    expect(isPeriodDue(january, new Date('2026-02-06T12:00:00'))).toBe(true);
  });
});

describe('getMissingPeriods', () => {
  it('never reports the open period as a gap', () => {
    // October 2026 closes on Oct 31 and is due Nov 5 — still open on Oct 22.
    const gaps = getMissingPeriods([], 'monthly', AS_OF);
    expect(gaps.map(p => p.key)).not.toContain('2026-10');
    expect(gaps.map(p => p.key)).toContain('2026-09');
  });

  it('does not report a covered period', () => {
    const gaps = getMissingPeriods(['2026-08', '2026-09'], 'monthly', AS_OF);
    expect(gaps.map(p => p.key)).not.toContain('2026-08');
    expect(gaps.map(p => p.key)).not.toContain('2026-09');
  });
});

describe('getNextDueDate', () => {
  it('returns the next period that has not begun when everything is filed', () => {
    const all2026 = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const next = getNextDueDate(all2026, 'monthly', AS_OF);
    expect(next?.key).toBe('2026-11');
  });

  it('returns the oldest open period when the form is already late', () => {
    const next = getNextDueDate(['2026-09'], 'monthly', AS_OF);
    expect(next?.key).toBe('2026-01');
  });
});

describe('buildComplianceMap — the restored dataset', () => {
  it('reports exactly the five forms that are actually late', () => {
    // The dashboard said 8, the radar said 0, the audit page said 5.
    // The truth is 5.
    expect(overdueCodes).toEqual(['F/10', 'F/11', 'F/35', 'F/48', 'F/49']);
  });

  it('counts the right number of missing periods per form', () => {
    expect(map.get('F/10')!.missingCount).toBe(6);  // Feb–Jun, Sep
    expect(map.get('F/11')!.missingCount).toBe(1);  // Sep
    expect(map.get('F/35')!.missingCount).toBe(1);  // Sep
    expect(map.get('F/48')!.missingCount).toBe(2);  // Aug, Sep
    expect(map.get('F/49')!.missingCount).toBe(9);  // never filed: Jan–Sep
  });

  it('names the missing periods', () => {
    expect(map.get('F/11')!.missingPeriods.map(p => p.label)).toEqual(['Sep 2026']);
    expect(map.get('F/35')!.missingPeriods.map(p => p.label)).toEqual(['Sep 2026']);
    expect(map.get('F/48')!.missingPeriods.map(p => p.label)).toEqual(['Aug 2026', 'Sep 2026']);
    expect(map.get('F/10')!.missingPeriods.map(p => p.label)).toEqual([
      'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Sep 2026',
    ]);
  });

  it('treats a never-filed periodic form as late for every closed period', () => {
    const c = map.get('F/49')!;
    expect(c.recordCount).toBe(0);
    expect(c.lastRecordDate).toBeNull();
    expect(c.isOverdue).toBe(true);
    expect(c.missingPeriods[0].key).toBe('2026-01');
  });

  it('does not flag forms that are filed and up to date', () => {
    for (const code of ['F/24', 'F/25', 'F/40', 'F/15', 'F/16', 'F/42']) {
      const c = map.get(code)!;
      expect(c.isOverdue, `${code} should be up to date`).toBe(false);
      expect(c.missingCount, `${code} should have no gaps`).toBe(0);
    }
  });

  it('does not flag a form with no fixed cadence', () => {
    // F/18 is Daily: it owes no periodic filing, so it is never "overdue".
    const c = map.get('F/18')!;
    expect(c.isPeriodic).toBe(false);
    expect(c.frequencyLabel).toBe('On event');
    expect(c.isOverdue).toBe(false);
  });

  it('measures lateness from the oldest missed deadline', () => {
    // F/49 never filed: January was due 2026-02-05 → 259 days late.
    expect(map.get('F/49')!.overdueDays).toBe(259);
    // F/10: February was due 2026-03-05 → 231 days late.
    expect(map.get('F/10')!.overdueDays).toBe(231);
    // F/48: August was due 2026-09-05 → 47 days late.
    expect(map.get('F/48')!.overdueDays).toBe(47);
    // F/11 / F/35: September was due 2026-10-05 → 17 days late.
    expect(map.get('F/11')!.overdueDays).toBe(17);
    expect(map.get('F/35')!.overdueDays).toBe(17);
  });

  it('gives every up-to-date periodic form a next deadline', () => {
    for (const code of ['F/24', 'F/25', 'F/40', 'F/15', 'F/16', 'F/42']) {
      expect(map.get(code)!.nextDueDate, `${code} should have a next due date`).toBeTruthy();
    }
  });
});

describe('computeDeptHealth', () => {
  it('counts only the forms with a fixed cadence', () => {
    const health = computeDeptHealth(
      FORMS.map(f => ({ code: f.code, frequencyType: parseFrequency(f.frequency) })),
      map,
    );
    // Periodic forms: 5 monthly + 3 annual + 1 quarterly + 2 semi-annual = 11.
    expect(health.cyclicalForms).toBe(11);
    expect(health.overdueCount).toBe(5);
    expect(health.healthyCyclical).toBe(6);
    expect(health.status).toBe('critical');
  });
});
