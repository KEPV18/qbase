// ============================================================================
// QBase — Temporal utilities tests
//
// temporalUtils decides which month a record is filed under and which period
// it covers.  Those two answers drive the compliance engine, the dashboard
// radar, the audit page and the forms registry, so a mistake here does not
// show up as a wrong number on one screen — it shows up as a form that is
// reported overdue when it is not (or the reverse).
//
// The fixtures below are taken from the restored production dataset
// (project hkkdbxvmvvcxpgfqlrnp, 2026-10-22):
//   * 236 rows carry `record_month` in the "MM/YYYY" spelling.
//   * 240 rows carry a slashed `date`, and every one of them that
//     disambiguates itself is DD/MM (15/07, 31/07, 26/03) — the forms are
//     filled in by hand in the house order.
//   * 8 rows carry `coverage_period: "Continuous / Open-Ended"` and no
//     `record_month`.
//   * Two forms (F/11, F/35) have no `record_month` at all, and their most
//     recent filing is only `date: "31/08/2026"` — a naive created_at
//     fallback files them as September.  They are August.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  resolveSlashDate,
  resolveCoveragePeriod,
  getRecordMonth,
  monthLabel,
  monthShortLabel,
  getMonthsFromRecords,
  getAllBusinessMonths,
  currentBusinessMonth,
} from '../temporalUtils';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

const rec = (r: Partial<RecordData>): RecordData => r as RecordData;

describe('resolveSlashDate', () => {
  it('reads a first part above 12 as a day (DD/MM)', () => {
    expect(resolveSlashDate('15/07/2026')).toEqual({
      year: 2026, month: 7, day: 15, order: 'DD/MM',
    });
    expect(resolveSlashDate('31/12/2025')).toEqual({
      year: 2025, month: 12, day: 31, order: 'DD/MM',
    });
  });

  it('reads a second part above 12 as a day (MM/DD)', () => {
    expect(resolveSlashDate('03/15/2026')).toEqual({
      year: 2026, month: 3, day: 15, order: 'MM/DD',
    });
  });

  it('reads an ambiguous value as the house order, DD/MM', () => {
    expect(resolveSlashDate('01/07/2026')).toEqual({
      year: 2026, month: 7, day: 1, order: 'DD/MM',
    });
  });

  it('refuses a value where neither part can be a month', () => {
    expect(resolveSlashDate('13/14/2026')).toBeNull();
  });

  it('refuses a month outside 1–12 and a day outside 1–31', () => {
    expect(resolveSlashDate('00/07/2026')).toBeNull();
    expect(resolveSlashDate('32/07/2026')).toBeNull();
  });

  it('refuses anything that is not d/d/yyyy', () => {
    expect(resolveSlashDate('2026-07-15')).toBeNull();
    expect(resolveSlashDate('15/07/26')).toBeNull();
    expect(resolveSlashDate('')).toBeNull();
    expect(resolveSlashDate('not a date')).toBeNull();
  });
});

describe('getRecordMonth', () => {
  it('normalizes the MM/YYYY spelling the dataset uses', () => {
    expect(getRecordMonth(rec({ record_month: '03/2026' }))).toBe('2026-03');
  });

  it('normalizes YYYY-M to a zero-padded YYYY-MM', () => {
    // '2026-1' is not a shorter spelling of January: the engine compares the
    // key as a string, so it has to be padded or it matches nothing.
    expect(getRecordMonth(rec({ record_month: '2026-1' }))).toBe('2026-01');
  });

  it('normalizes "Month YYYY" in the coverage period', () => {
    expect(getRecordMonth(rec({ coverage_period: 'January 2026' }))).toBe('2026-01');
  });

  it('falls through to the date field when there is no record_month', () => {
    // F/11 and F/35: no record_month, filed as "31/08/2026".
    expect(getRecordMonth(rec({ date: '31/08/2026' }))).toBe('2026-08');
  });

  it('reads a slashed date in the house order', () => {
    expect(getRecordMonth(rec({ date: '15/07/2026' }))).toBe('2026-07');
  });

  it('reads an ISO date', () => {
    expect(getRecordMonth(rec({ date: '2026-07-15' }))).toBe('2026-07');
  });

  it('falls back to the creation date only when nothing else resolves', () => {
    expect(getRecordMonth(rec({ _createdAt: '2026-09-03T10:00:00Z' }))).toBe('2026-09');
  });

  it('returns null when there is nothing to go on', () => {
    expect(getRecordMonth(rec({}))).toBeNull();
  });

  it('keeps an unparseable record_month rather than inventing a month', () => {
    // "Continuous / Open-Ended" is not a month; returning it verbatim is
    // better than filing the record under a month it does not belong to.
    expect(getRecordMonth(rec({ record_month: 'Continuous / Open-Ended' })))
      .toBe('Continuous / Open-Ended');
  });

  it('does not let the creation date override a real record_month', () => {
    expect(getRecordMonth(rec({ record_month: '03/2026', _createdAt: '2026-09-03T10:00:00Z' })))
      .toBe('2026-03');
  });
});

describe('resolveCoveragePeriod', () => {
  it('returns a named month for a named coverage period', () => {
    expect(resolveCoveragePeriod(rec({ coverage_period: 'March 2026' }))).toBe('March 2026');
  });

  it('passes a non-month coverage period through unchanged', () => {
    expect(resolveCoveragePeriod(rec({ coverage_period: 'Continuous / Open-Ended' })))
      .toBe('Continuous / Open-Ended');
  });

  it('resolves from the record_month when there is no coverage period', () => {
    expect(resolveCoveragePeriod(rec({ record_month: '03/2026' }))).toBe('March 2026');
  });

  it('resolves from a date field', () => {
    expect(resolveCoveragePeriod(rec({ date: '31/08/2026' }))).toBe('August 2026');
  });

  it('resolves from an item-level date (F/11 items array)', () => {
    expect(resolveCoveragePeriod(rec({
      form_data: { items: [{ date: '15/07/2026' }] },
    }))).toBe('July 2026');
  });

  it('falls back to "Continuous / Open-Ended"', () => {
    expect(resolveCoveragePeriod(rec({}))).toBe('Continuous / Open-Ended');
  });
});

describe('month labels', () => {
  it('renders a long label', () => {
    expect(monthLabel('2026-03')).toBe('Mar 2026');
  });

  it('renders a short label', () => {
    expect(monthShortLabel('2026-03')).toBe('03/2026');
  });
});

describe('getMonthsFromRecords', () => {
  const records = [
    rec({ formCode: 'F/11', record_month: '03/2026' }),
    rec({ formCode: 'F/11', date: '31/08/2026' }),
    rec({ formCode: 'F/28', record_month: '01/2026' }),
    rec({ formCode: 'F/28', record_month: '01/2026' }),
  ];

  it('collects the distinct months in order', () => {
    expect(getMonthsFromRecords(records)).toEqual(['2026-01', '2026-03', '2026-08']);
  });

  it('filters by form code', () => {
    expect(getMonthsFromRecords(records, 'F/28')).toEqual(['2026-01']);
  });
});

describe('getAllBusinessMonths', () => {
  it('runs from January to the given month', () => {
    expect(getAllBusinessMonths(new Date('2026-03-15T00:00:00')))
      .toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('follows the clock instead of a hard-coded window', () => {
    // The list used to stop at June 2026 while the data ran to September.
    const months = getAllBusinessMonths(new Date('2026-09-30T00:00:00'));
    expect(months).toHaveLength(9);
    expect(months[8]).toBe('2026-09');
  });
});

describe('currentBusinessMonth', () => {
  it('is a zero-padded YYYY-MM', () => {
    expect(currentBusinessMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});
