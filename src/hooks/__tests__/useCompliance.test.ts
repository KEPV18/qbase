// ============================================================================
// QBase — the client-side filter (the fallback's twin of the server's rules)
//
// `applyClientFilter` is the browser's answer to the same question the SQL
// answers.  It is reached only on a server that has NOT been migrated — the
// RPC is missing, so the client falls back to the old download and filters
// it here.
//
// That makes it a parity surface, not a convenience: the two answers have to
// agree, or the same page would show one list before the migration and
// another after it.  These tests pin the rules; the engine parity itself is
// proved over the whole register by
// `tools/local-stack/verify-compliance-parity.ts`.
//
// The rules, in the order they are applied:
//
//   1. the workflow status      (`_status`)
//   2. the business status      (`status` — the state the FORM carries)
//   3. the form code, one or many
//   4. the department
//   5. the project
//   6. the month the record covers
//   7. the free text
//   8. "mine" and "my drafts"
// ============================================================================

import { describe, it, expect, vi } from 'vitest';

// The module pulls in the Supabase client and the auth hook through the
// code path it shares with the two queries.  Neither is used by the filter,
// and neither should reach the network from a unit test.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

import { applyClientFilter } from '@/hooks/useCompliance';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

/** A record with the fields the filter reads, and nothing else. */
function rec(fields: Partial<RecordData> & { serial: string }): RecordData {
  return {
    formCode: 'F/35',
    formName: 'Design Review Record',
    _status: 'approved',
    _createdBy: 'owner@example.test',
    _department: 'RD',
    project_id: 'project-1',
    _createdAt: '2026-08-03T09:00:00.000Z',
    ...fields,
  } as unknown as RecordData;
}

const SET: RecordData[] = [
  rec({ serial: 'F/35-001', formCode: 'F/35', formName: 'Design Review Record', _status: 'approved', status: 'closed', record_month: '2026-08' }),
  rec({ serial: 'F/35-002', formCode: 'F/35', formName: 'Design Review Record', _status: 'pending_review', status: 'open', record_month: '2026-09' }),
  rec({ serial: 'F/49-001', formCode: 'F/49', formName: 'Tool Calibration Log', _status: 'draft', _createdBy: 'other@example.test', _department: 'QA', project_id: 'project-2', record_month: '2026-07' }),
  rec({ serial: 'F/10-001', formCode: 'F/10', formName: 'Annual Maintenance Plan', _status: 'rejected', status: 'rejected', _department: 'Operations', project_id: 'project-1', record_month: '2026-06' }),
  rec({ serial: 'F/10-002', formCode: 'F/10', formName: 'Annual Maintenance Plan', _status: 'approved', status: 'open', _department: 'Operations', project_id: 'project-3', record_month: '2026-09' }),
];

const serials = (rows: RecordData[]) => rows.map((r) => String(r.serial)).sort();

describe('applyClientFilter', () => {
  it('returns everything when there is no filter', () => {
    expect(applyClientFilter(SET, {})).toHaveLength(SET.length);
  });

  it('filters on the workflow status', () => {
    expect(serials(applyClientFilter(SET, { workflow_status: 'pending_review' }))).toEqual(['F/35-002']);
    expect(serials(applyClientFilter(SET, { workflow_status: 'draft' }))).toEqual(['F/49-001']);
  });

  it('filters on the business status, and keeps it apart from the workflow one', () => {
    // "open" and "rejected" are business states; the workflow status of the
    // same rows is "approved", "pending_review" and "rejected".
    expect(serials(applyClientFilter(SET, { business: 'issue' }))).toEqual(['F/10-001', 'F/10-002', 'F/35-002']);
    expect(serials(applyClientFilter(SET, { business: 'ok' }))).toEqual(['F/35-001', 'F/49-001']);
  });

  it('filters on one form code', () => {
    expect(serials(applyClientFilter(SET, { form_code: 'F/10' }))).toEqual(['F/10-001', 'F/10-002']);
  });

  it('filters on a set of form codes', () => {
    expect(serials(applyClientFilter(SET, { form_codes: ['F/35', 'F/49'] }))).toEqual(['F/35-001', 'F/35-002', 'F/49-001']);
  });

  it('ignores an empty set of form codes rather than matching nothing', () => {
    expect(applyClientFilter(SET, { form_codes: [] })).toHaveLength(SET.length);
  });

  it('filters on the department', () => {
    expect(serials(applyClientFilter(SET, { department: 'Operations' }))).toEqual(['F/10-001', 'F/10-002']);
  });

  it('filters on the project', () => {
    expect(serials(applyClientFilter(SET, { project_id: 'project-2' }))).toEqual(['F/49-001']);
  });

  it('filters on the month the record covers', () => {
    expect(serials(applyClientFilter(SET, { month: '2026-09' }))).toEqual(['F/10-002', 'F/35-002']);
  });

  it('searches the serial, the form name and the form code', () => {
    expect(serials(applyClientFilter(SET, { search: 'F/35' }))).toEqual(['F/35-001', 'F/35-002']);
    expect(serials(applyClientFilter(SET, { search: '001' }))).toEqual(['F/10-001', 'F/35-001', 'F/49-001']);
    expect(serials(applyClientFilter(SET, { search: 'design review' }))).toEqual(['F/35-001', 'F/35-002']);
  });

  it('is case-insensitive about the search term', () => {
    expect(applyClientFilter(SET, { search: 'DESIGN review' })).toHaveLength(2);
  });

  it('filters to the records of one owner', () => {
    expect(serials(applyClientFilter(SET, { mine: true }, 'owner@example.test'))).toEqual([
      'F/10-001', 'F/10-002', 'F/35-001', 'F/35-002',
    ]);
  });

  it('filters to the owner\'s own drafts', () => {
    expect(serials(applyClientFilter(SET, { mine_drafts: true }, 'other@example.test'))).toEqual(['F/49-001']);
    // Nobody's drafts for the owner of the other rows — a draft is a draft
    // of ITS author, not of the company.
    expect(applyClientFilter(SET, { mine_drafts: true }, 'owner@example.test')).toHaveLength(0);
  });

  it('applies the rules together, not one at a time', () => {
    expect(serials(applyClientFilter(SET, { business: 'issue', form_code: 'F/10' }))).toEqual(['F/10-001', 'F/10-002']);
    expect(serials(applyClientFilter(SET, { business: 'issue', form_code: 'F/10', month: '2026-06' }))).toEqual(['F/10-001']);
    expect(applyClientFilter(SET, { business: 'issue', form_code: 'F/35', month: '2026-06' })).toHaveLength(0);
  });

  it('reads the month from the record, not from the creation date', () => {
    // A record filed in September for an August period is an AUGUST record.
    const late = [rec({ serial: 'F/35-LATE', record_month: '2026-08', _createdAt: '2026-09-30T23:00:00.000Z' })];
    expect(applyClientFilter(late, { month: '2026-08' })).toHaveLength(1);
    expect(applyClientFilter(late, { month: '2026-09' })).toHaveLength(0);
  });
});
