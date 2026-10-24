// ============================================================================
// QBase — the compliance engine's own snapshot
//
// `buildComplianceMap` is the engine the client falls back to when the
// server has not been migrated, and the engine the server's own PL/pgSQL
// port was written from.  Two things about it are easy to get wrong and
// expensive to get wrong:
//
//   * the MONTH a record covers (a filing made in April for March covers
//     March — the engine works in covered months, not in filing dates);
//   * the ISSUE count — how many of a form's records carry an open issue.
//
// The issue count is the business status of a record, not its workflow
// status: a record can be APPROVED and still carry an open non-conformity.
// The rule is the server's rule — 'open', 'rejected', or a status that
// mentions 'nc' — because the audit page counts the forms that have one,
// and the two engines have to count the same forms.
// ============================================================================

import { describe, it, expect } from 'vitest';

import {
  buildComplianceMap,
  isIssueStatus,
  type ComplianceRecord,
} from '@/lib/compliance';

const FORMS = [
  { code: 'F/35', name: 'Design Review Record', frequency: 'Monthly during dev' },
  { code: 'F/49', name: 'Tool Calibration Log', frequency: 'Quarterly' },
  { code: 'F/20', name: 'Meeting Minutes', frequency: 'On event' },
];

function rec(
  formCode: string,
  month: string | null,
  businessStatus: string | null = null,
  createdAt = `${month ?? '2026-08'}-03T09:00:00.000Z`,
): ComplianceRecord {
  return { formCode, month, createdAt, businessStatus };
}

describe('isIssueStatus', () => {
  it('counts an open or a rejected record as an issue', () => {
    expect(isIssueStatus('open')).toBe(true);
    expect(isIssueStatus('rejected')).toBe(true);
    expect(isIssueStatus('OPEN')).toBe(true);
  });

  it('counts a non-conformity as an issue', () => {
    expect(isIssueStatus('NC raised')).toBe(true);
    expect(isIssueStatus('nc')).toBe(true);
  });

  it('does not count a closed or a blank record as an issue', () => {
    expect(isIssueStatus('closed')).toBe(false);
    expect(isIssueStatus('ok')).toBe(false);
    expect(isIssueStatus('')).toBe(false);
    expect(isIssueStatus(null)).toBe(false);
    expect(isIssueStatus(undefined)).toBe(false);
  });
});

describe('buildComplianceMap', () => {
  const asOf = new Date('2026-10-24T12:00:00.000Z');

  it('counts the records that carry an issue', () => {
    const map = buildComplianceMap(
      [
        rec('F/35', '2026-08', 'closed'),
        rec('F/35', '2026-09', 'open'),
        rec('F/35', '2026-09', 'NC raised'),
        rec('F/35', '2026-10', 'closed'),
      ],
      FORMS,
      asOf,
    );

    const form = map.get('F/35')!;
    expect(form.recordCount).toBe(4);
    expect(form.issueCount).toBe(2);
  });

  it('counts no issue for a form with none', () => {
    const map = buildComplianceMap(
      [rec('F/49', '2026-07', 'closed'), rec('F/49', '2026-08')],
      FORMS,
      asOf,
    );

    expect(map.get('F/49')!.issueCount).toBe(0);
    expect(map.get('F/49')!.recordCount).toBe(2);
  });

  it('counts no issue for a form with no record at all', () => {
    const map = buildComplianceMap([], FORMS, asOf);
    expect(map.get('F/20')!.issueCount).toBe(0);
    expect(map.get('F/20')!.recordCount).toBe(0);
  });

  it('keeps the covered months, ascending', () => {
    const map = buildComplianceMap(
      [rec('F/35', '2026-09'), rec('F/35', '2026-07'), rec('F/35', '2026-08')],
      FORMS,
      asOf,
    );

    expect(map.get('F/35')!.months).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('is not confused by a record whose form code is blank', () => {
    const map = buildComplianceMap(
      [rec('', '2026-08'), rec('F/35', '2026-08')],
      FORMS,
      asOf,
    );

    expect(map.get('F/35')!.recordCount).toBe(1);
    expect(map.size).toBe(FORMS.length);
  });
});
