// ============================================================================
// QBase — The detailed compliance report
//
// The report is the big page behind the Compliance Radar.  The one thing it
// must never do is disagree with the radar, so most of these tests are
// AGREEMENT tests: the report's counts, its missed periods and its
// lateness are read back out of the same engine the radar reads.
//
// The fixture is the restored production dataset (as of 2026-10-22), the
// same one `compliancePeriods.test.ts` uses — five forms are behind.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { buildComplianceMap } from '../compliance';
import {
  buildComplianceReport, formatDueDate, reportAnchorId,
} from '../complianceReport';

const AS_OF = new Date('2026-10-22T12:00:00');

/** Build the filing list from a compact "code: months" map. */
const filingsFor = (spec: Record<string, string[]>): { code: string; month: string }[] =>
  Object.entries(spec).flatMap(([code, months]) =>
    months.map(month => ({ code, month })),
  );

const FILINGS = filingsFor({
  'F/10': ['2026-01', '2026-07', '2026-08'],
  'F/11': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
  'F/15': ['2026-01'],
  'F/16': ['2026-01'],
  'F/18': ['2026-01'],
  'F/24': ['2026-03', '2026-04', '2026-05', '2026-06', '2026-08'],
  'F/25': ['2026-01', '2026-07'],
  'F/35': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
  'F/40': ['2026-01', '2026-07'],
  'F/42': ['2026-01'],
  'F/48': ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'],
  // F/49 has no record at all.
});

const FORMS = [
  { code: 'F/10', name: 'Customer Feedback', frequency: 'Monthly', section: 'Sales & Customer Service' },
  { code: 'F/11', name: 'Production Plan', frequency: 'Monthly', section: 'Operations & Production' },
  { code: 'F/15', name: 'Approved Vendor List', frequency: 'Annual', section: 'Procurement & Vendors' },
  { code: 'F/16', name: 'Supplier Registration Form', frequency: 'Annual', section: 'Procurement & Vendors' },
  { code: 'F/18', name: 'Product Re-Call', frequency: 'On event', section: 'Quality & Audit' },
  { code: 'F/24', name: 'Objectives & Targets', frequency: 'Quarterly', section: 'Management & Documentation' },
  { code: 'F/25', name: 'Audit Plan', frequency: 'Semi-annual', section: 'Quality & Audit' },
  { code: 'F/35', name: 'Design Monitoring', frequency: 'Monthly during dev', section: 'R&D & Design' },
  { code: 'F/40', name: 'Competence Matrix', frequency: 'Semi-annual', section: 'HR & Training' },
  { code: 'F/42', name: 'Annual Training Plan', frequency: 'Annual', section: 'HR & Training' },
  { code: 'F/48', name: 'Internal Audit Report', frequency: 'Monthly', section: 'Quality & Audit' },
  { code: 'F/49', name: 'Document Master List', frequency: 'Monthly', section: 'Management & Documentation' },
];

const records = FILINGS.map(f => ({
  formCode: f.code,
  createdAt: `${f.month}-15T09:00:00.000Z`,
  month: f.month,
}));

const map = buildComplianceMap(
  records,
  FORMS.map(f => ({ code: f.code, name: f.name, frequency: f.frequency })),
  AS_OF,
);

const report = buildComplianceReport(
  map,
  FORMS.map(f => ({ code: f.code, section: f.section })),
  AS_OF,
);

const formFor = (code: string) => report.forms.find(f => f.code === code)!;

describe('buildComplianceReport — which forms it reports', () => {
  it('reports exactly the five forms that are actually late', () => {
    expect(report.formCount).toBe(5);
    expect(report.forms.map(f => f.code).sort()).toEqual(['F/10', 'F/11', 'F/35', 'F/48', 'F/49']);
  });

  it('leaves a form with no gap out — a form that owes nothing is not a finding', () => {
    expect(report.forms.find(f => f.code === 'F/24')).toBeUndefined();
    expect(report.forms.find(f => f.code === 'F/18')).toBeUndefined();
  });

  it('puts the worst form first', () => {
    expect(report.forms.map(f => f.code)).toEqual(['F/49', 'F/10', 'F/48', 'F/11', 'F/35']);
    expect(report.worstFormCode).toBe('F/49');
    expect(report.worstOverdueDays).toBe(259);
  });

  it('totals the missed filings and the never-filed forms', () => {
    // 6 + 1 + 1 + 2 + 9
    expect(report.missingCount).toBe(19);
    expect(report.neverFiledCount).toBe(1);
    expect(formFor('F/49').neverFiled).toBe(true);
    expect(formFor('F/10').neverFiled).toBe(false);
  });

  it('carries the section each form belongs to', () => {
    expect(formFor('F/49').section).toBe('Management & Documentation');
    expect(formFor('F/48').section).toBe('Quality & Audit');
  });
});

describe('buildComplianceReport — it must agree with the radar', () => {
  it('reports the same missed count, in the same unit, for every form', () => {
    for (const form of report.forms) {
      const c = map.get(form.code)!;
      expect(form.missingCount, form.code).toBe(c.missingCount);
      expect(form.countLabel, form.code).toBe(c.missingCountLabel);
      expect(form.overdueDays, form.code).toBe(c.overdueDays);
    }
  });

  it('names the same periods the radar counts', () => {
    for (const form of report.forms) {
      const c = map.get(form.code)!;
      expect(form.missing.map(p => p.label), form.code).toEqual(
        c.missingPeriods.map(p => p.label),
      );
    }
  });
});

describe('buildComplianceReport — the detail the card could not carry', () => {
  it('lists every missed period with its deadline and how late it is', () => {
    const f10 = formFor('F/10');
    expect(f10.missing.map(p => p.label)).toEqual([
      'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Sep 2026',
    ]);
    expect(f10.missing.map(p => p.dueDate)).toEqual([
      '2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05', '2026-10-05',
    ]);
    expect(f10.missing.map(p => p.daysLate)).toEqual([231, 200, 170, 139, 109, 17]);
  });

  it('shows the whole year, not only the holes', () => {
    const f10 = formFor('F/10');
    expect(f10.periodCount).toBe(12);
    expect(f10.periods.map(p => p.key)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`),
    );
    // Filed, missing, and the open period — October closes on the 31st and
    // is due on 5 November, so it is NOT a gap yet.
    const stateOf = (key: string) => f10.periods.find(p => p.key === key)!.state;
    expect(stateOf('2026-01')).toBe('covered');
    expect(stateOf('2026-07')).toBe('covered');
    expect(stateOf('2026-08')).toBe('covered');
    expect(stateOf('2026-02')).toBe('missing');
    expect(stateOf('2026-09')).toBe('missing');
    expect(stateOf('2026-10')).toBe('open');
    expect(stateOf('2026-11')).toBe('upcoming');
  });

  it('says what the form DID file this year', () => {
    expect(formFor('F/10').coveredCount).toBe(3);
    expect(formFor('F/48').coveredCount).toBe(7);
    expect(formFor('F/49').coveredCount).toBe(0);
  });

  it('says when the form was last filed', () => {
    expect(formFor('F/49').lastFiledText).toBe('Never filed');
    expect(formFor('F/49').lastRecordDate).toBeNull();
    // F/10's newest filing covers August 2026 and was made on the 15th.
    expect(formFor('F/10').lastFiledText).toBe('2 months ago');
  });

  it('counts one month as ONE month', () => {
    // "1 months ago" was what the shared helper used to say, and the report
    // puts that sentence in front of the reader.
    const oneMonthAgo = new Date(AS_OF.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const map2 = buildComplianceMap(
      [{ formCode: 'F/10', createdAt: oneMonthAgo, month: '2026-09' }],
      [{ code: 'F/10', name: 'Customer Feedback', frequency: 'Monthly' }],
      AS_OF,
    );
    expect(buildComplianceReport(map2, [], AS_OF).forms[0].lastFiledText).toBe('1 month ago');
  });

  it('gives the never-filed form its whole year of gaps', () => {
    const f49 = formFor('F/49');
    expect(f49.missing.map(p => p.label)).toEqual([
      'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026',
      'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026',
    ]);
    expect(f49.missing[0].daysLate).toBe(259);
    expect(f49.missing[8].daysLate).toBe(17);
  });
});

describe('the report helpers', () => {
  it('formats a deadline the way it is read', () => {
    expect(formatDueDate('2026-03-05')).toBe('5 Mar 2026');
    expect(formatDueDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('anchors each form to a stable id', () => {
    expect(reportAnchorId('F/49')).toBe('compliance-gap-f-49');
    expect(reportAnchorId('F/10')).toBe('compliance-gap-f-10');
  });
});
