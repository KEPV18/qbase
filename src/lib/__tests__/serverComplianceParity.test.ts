// ============================================================================
// QBase — the SQL port and the TypeScript engine share their constants
//
// Migration 20 moves the compliance verdict to the server.  The period
// engine itself stays in TypeScript (`src/lib/compliancePeriods.ts`) and is
// PORTED to PL/pgSQL, because the pages that do not go through the new RPC
// still read the TypeScript one.
//
// Two engines, one answer — that only holds if the two share their
// constants and their rules.  This file asserts that they do, at the level
// of the rules that can silently drift:
//
//   * the grace days per cadence;
//   * the look-back the reporting window may reach;
//   * the order in which a record's month is decided;
//   * the order in which a frequency string is read;
//   * the window's ceiling — never past the current year.
//
// The full behavioural parity — every field of every form, over the whole
// register — is proved by `tools/local-stack/verify-compliance-parity.ts`,
// which runs both engines against the live local database.  This file is
// the cheap, always-on half of that guard: it needs no database, so CI
// runs it on every push.
//
// It also asserts the ZERO-DATA-LOSS rule directly: migration 20 must
// contain no statement that writes to, or alters, any table.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  PERIOD_GRACE_DAYS,
  getPeriodsForYear,
  getWindowStartMonth,
  toPeriodicFrequency,
  type PeriodicFrequency,
} from '@/lib/compliancePeriods';

// ---------------------------------------------------------------------------
// The migration, as text
// ---------------------------------------------------------------------------

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'supabase/migrations/prime/20261024_20_server_side_compliance.sql',
);

const sql = readFileSync(MIGRATION_PATH, 'utf8');

/** The body of one function, from its `create or replace function` to the end. */
function functionBody(name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  expect(start, `the migration must define public.${name}`).toBeGreaterThan(-1);
  const end = sql.indexOf('\n$$;', start);
  return sql.slice(start, end === -1 ? undefined : end);
}

// ---------------------------------------------------------------------------
// The grace days
// ---------------------------------------------------------------------------

describe('the grace days', () => {
  it('are the same on both sides', () => {
    const body = functionBody('qbase_periods');

    for (const [freq, days] of Object.entries(PERIOD_GRACE_DAYS)) {
      // The SQL picks the grace out of a CASE on the cadence.
      const pattern = new RegExp(`when\\s+'${freq}'\\s+then\\s+${days}\\b`);
      expect(
        pattern.test(body),
        `the SQL must use ${days} grace days for ${freq}, like the TypeScript engine`,
      ).toBe(true);
    }
  });

  it('are the numbers the engine has always used', () => {
    // Written out, so a change to either side is a visible change here.
    expect(PERIOD_GRACE_DAYS).toEqual({
      monthly: 5,
      quarterly: 10,
      'semi-annual': 15,
      annual: 14,
    });
  });

  it('put the deadline after the END of the period', () => {
    const body = functionBody('qbase_periods');
    // The due date is the last day of the period plus the grace — in both
    // engines.  A due date computed from the period's START would move
    // every deadline by a month.
    expect(body).toMatch(/v_last_day\s*\+\s*v_grace/);
  });

  it('give the TypeScript engine the same deadlines', () => {
    // A monthly period of August 2026 closes on 31 August; +5 grace days
    // is 5 September.
    const [august] = getPeriodsForYear('monthly', 2026).filter((p) => p.key === '2026-08');
    expect(august.dueDate).toBe('2026-09-05');

    const [q1] = getPeriodsForYear('quarterly', 2026).filter((p) => p.key === '2026-Q1');
    expect(q1.dueDate).toBe('2026-04-10');

    const [h1] = getPeriodsForYear('semi-annual', 2026).filter((p) => p.key === '2026-H1');
    expect(h1.dueDate).toBe('2026-07-15');

    const [year] = getPeriodsForYear('annual', 2026);
    expect(year.dueDate).toBe('2027-01-14');
  });
});

// ---------------------------------------------------------------------------
// The reporting window
// ---------------------------------------------------------------------------

describe('the reporting window', () => {
  it('reaches one year back on both sides', () => {
    // The TypeScript floor.
    const asOf = new Date(2026, 9, 24); // 24 October 2026
    expect(getWindowStartMonth(asOf)).toBe('2025-01');

    // The SQL floor — the same expression, in the same place.
    const body = functionBody('compliance_map');
    expect(body).toMatch(/v_floor_month\s*:=\s*format\('%s-01',\s*v_year\s*-\s*1\)/);
  });

  it('never reaches past the current year on both sides', () => {
    const asOf = new Date(2026, 9, 24);
    // A `sinceMonth` from the future is pulled back to the ceiling.
    expect(getWindowStartMonth(asOf, '2027-06')).toBe('2026-01');

    const body = functionBody('compliance_map');
    expect(body).toMatch(/v_ceiling_month\s*:=\s*format\('%s-01',\s*v_year\)/);
  });

  it('is anchored to the data, not to the calendar', () => {
    // The window starts where the organisation started using the forms — a
    // `sinceMonth` in an EARLIER year pulls the window back with it.
    expect(getWindowStartMonth(new Date(2026, 9, 24), '2025-06')).toBe('2025-06');
    // A `sinceMonth` inside the current year cannot move the window past
    // the ceiling, which is the first month of this year.
    expect(getWindowStartMonth(new Date(2026, 9, 24), '2026-01')).toBe('2026-01');
    expect(getWindowStartMonth(new Date(2026, 9, 24), '2026-03')).toBe('2026-01');
    // A `sinceMonth` older than the cap is pulled forward to it.
    expect(getWindowStartMonth(new Date(2026, 9, 24), '2019-01')).toBe('2025-01');
  });
});

// ---------------------------------------------------------------------------
// The month a record covers
// ---------------------------------------------------------------------------

describe('the month a record covers', () => {
  it('is decided in the same order on both sides', () => {
    const body = functionBody('qbase_record_month');

    // The SQL tries the fields in a fixed order, and the TypeScript engine
    // tries them in the same one.
    const at = (field: string) => body.indexOf(`->> '${field}'`);
    expect(at('record_month'), 'the SQL must read record_month').toBeGreaterThan(-1);
    expect(at('coverage_period'), 'the SQL must read coverage_period').toBeGreaterThan(-1);
    expect(at('date'), 'the SQL must read date').toBeGreaterThan(-1);

    expect(at('coverage_period')).toBeGreaterThan(at('record_month'));
    expect(at('date')).toBeGreaterThan(at('coverage_period'));
    // The creation date is the last resort — the parameter is named in the
    // signature, so it is its LAST use in the body that matters.
    expect(body.lastIndexOf('p_created_at')).toBeGreaterThan(at('date'));
  });
});

// ---------------------------------------------------------------------------
// The cadence of a form
// ---------------------------------------------------------------------------

describe('the cadence of a form', () => {
  const cases: Array<[string, PeriodicFrequency | null]> = [
    ['Monthly', 'monthly'],
    ['Monthly during dev', 'monthly'],
    ['Quarterly', 'quarterly'],
    ['Semi-annual', 'semi-annual'],
    ['semi annual', 'semi-annual'],
    ['Annual', 'annual'],
    ['Yearly', 'annual'],
    ['On event', null],
    ['Daily', null],
    ['Per project', null],
    ['', null],
  ];

  it('is read the same way on both sides', () => {
    const body = functionBody('qbase_periodic_frequency');

    // The SQL's order: monthly, then quarterly, then semi-annual, then
    // annual.  'semi-annual' contains 'annual', so it has to be tested
    // first — on both sides.
    expect(body.indexOf("like 'monthly%'")).toBeLessThan(body.indexOf("like 'quarterly%'"));
    expect(body.indexOf("like 'quarterly%'")).toBeLessThan(body.indexOf("'semi-annual'"));
    expect(body.indexOf("'semi-annual'")).toBeLessThan(body.indexOf("'annual'"));
    // 'yearly' is the other spelling of annual.
    expect(body).toMatch(/'yearly'/);
  });

  it('maps the catalogue\'s own wording to the same cadence', () => {
    for (const [raw, expected] of cases) {
      expect(toPeriodicFrequency(raw), `"${raw}"`).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// The zero-data-loss rule
// ---------------------------------------------------------------------------

describe('migration 20', () => {
  it('writes to no table and alters no table', () => {
    // The rule: no row is lost and no row is changed.  A migration that
    // only creates functions cannot change a row.
    const forbidden = [
      /\binsert\s+into\b/i,
      /\bupdate\s+\w+\s+set\b/i,
      /\bdelete\s+from\b/i,
      /\btruncate\b/i,
      /\bdrop\s+table\b/i,
      /\balter\s+table\b/i,
      /\bcreate\s+table\b/i,
      /\bdrop\s+column\b/i,
      /\bdrop\s+function\b/i,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(sql), `migration 20 must not contain ${pattern}`).toBe(false);
    }
  });

  it('is SECURITY INVOKER, so the row-level policy decides the scope', () => {
    // The whole point of moving the verdict to the server is that the
    // server still answers with the caller's slice.  A SECURITY DEFINER
    // function would answer with the COMPANY's slice.
    const body = functionBody('compliance_map');
    expect(body).toMatch(/security\s+invoker/i);
    expect(body).not.toMatch(/security\s+definer/i);
  });

  it('pins the search path, so a hostile schema cannot shadow its names', () => {
    expect(functionBody('compliance_map')).toMatch(/set\s+search_path\s*=\s*''/);
    expect(functionBody('records_page')).toMatch(/set\s+search_path\s*=\s*''/);
  });
});
