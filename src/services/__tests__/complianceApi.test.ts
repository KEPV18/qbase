// ============================================================================
// QBase — the server compliance client
//
// The compliance model used to be computed in the browser from a download
// of the whole register.  It is computed by the server now, and this file
// pins the boundary between the two:
//
//   * the RPC is called with the RIGHT ARGS — the catalogue goes IN, the
//     caller's clock goes in with it, and the page/offset/sort of the
//     register go in with the list;
//   * a server that has NOT been migrated is recognised as such, and only
//     that is a reason to fall back (a real failure is surfaced);
//   * the server's payload is mapped onto the shapes the pages already
//     read, so a page that reads the server and a page that falls back
//     render the SAME thing.
//
// The engine itself is compared against the SQL by
// `tools/local-stack/verify-compliance-parity.ts`; the constants the two
// implementations share are compared by
// `src/lib/__tests__/serverComplianceParity.test.ts`.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Supabase client is the only thing that touches the network here, so
// it is the only thing that is mocked.
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  ComplianceApiError,
  fetchComplianceMap,
  fetchRecordPage,
  isMissingFunctionError,
  toClientRecord,
  toComplianceMap,
  toFormCompliance,
  type ServerFormCompliance,
  type ServerRecordRow,
} from '@/services/complianceApi';

// ---------------------------------------------------------------------------
// A server answer
// ---------------------------------------------------------------------------

const SERVER_FORM: ServerFormCompliance = {
  code: 'F/35',
  name: 'Design Review Record',
  frequency: 'Monthly during dev',
  periodic: 'monthly',
  recordCount: 4,
  issueCount: 1,
  lastRecordDate: '2026-09-02T10:00:00+00:00',
  months: ['2026-06', '2026-07', '2026-08', '2026-09'],
  daysSinceLast: 12,
  isOverdue: true,
  overdueDays: 9,
  missingCount: 2,
  missingPeriods: [
    { key: '2026-07', label: 'Jul 2026', startMonth: '2026-07', endMonth: '2026-07', dueDate: '2026-08-05' },
    { key: '2026-08', label: 'Aug 2026', startMonth: '2026-08', endMonth: '2026-08', dueDate: '2026-09-05' },
  ],
  periodStates: [
    { key: '2026-06', label: 'Jun 2026', startMonth: '2026-06', endMonth: '2026-06', dueDate: '2026-07-05', state: 'covered', daysLate: 0 },
    { key: '2026-07', label: 'Jul 2026', startMonth: '2026-07', endMonth: '2026-07', dueDate: '2026-08-05', state: 'missing', daysLate: 21 },
    { key: '2026-08', label: 'Aug 2026', startMonth: '2026-08', endMonth: '2026-08', dueDate: '2026-09-05', state: 'missing', daysLate: 5 },
    { key: '2026-09', label: 'Sep 2026', startMonth: '2026-09', endMonth: '2026-09', dueDate: '2026-10-05', state: 'covered', daysLate: 0 },
  ],
  coveredCount: 2,
  nextDueDate: '2026-10-05',
  daysUntilDue: 4,
};

const SERVER_ROW: ServerRecordRow = {
  id: 'row-1',
  serial: 'F/35-014',
  form_code: 'F/35',
  form_name: 'Design Review Record',
  status: 'approved',
  business_status: 'open',
  created_at: '2026-08-03T09:00:00+00:00',
  created_by: 'someone@example.test',
  updated_at: '2026-08-04T09:00:00+00:00',
  last_modified_by: 'someone@example.test',
  edit_count: 2,
  section: 6,
  section_name: 'R&D & Design',
  frequency: 'Monthly during dev',
  project_id: 'project-1',
  month: '2026-08',
  client_name: 'A client',
  project_name: 'A project',
};

beforeEach(() => {
  rpc.mockReset();
});

// ---------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------

describe('fetchComplianceMap', () => {
  it('sends the catalogue, the instant and the caller\'s UTC offset', async () => {
    rpc.mockResolvedValue({
      data: {
        asOf: '2026-10-24T12:00:00.000Z',
        datasetStart: '2026-01',
        totalRecords: 316,
        statusCounts: { approved: 311 },
        months: ['2026-01'],
        forms: {},
      },
      error: null,
    });

    const forms = [{ code: 'F/35', name: 'Design Review Record', frequency: 'Monthly' }];
    const asOf = new Date('2026-10-24T12:00:00.000Z');
    await fetchComplianceMap(forms, asOf);

    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('compliance_map');
    expect(args.p_forms).toEqual(forms);
    expect(args.p_as_of).toBe('2026-10-24T12:00:00.000Z');
    // The offset is the CALLER's — the engine's period arithmetic happens
    // in the caller's calendar, so "overdue by N days" is the same number
    // in Cairo and in Los Angeles.
    expect(args.p_tz_offset_minutes).toBe(-asOf.getTimezoneOffset());
  });

  it('raises a real error rather than pretending the server is missing', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for function compliance_map' } });

    await expect(fetchComplianceMap([], new Date())).rejects.toBeInstanceOf(ComplianceApiError);
  });
});

describe('fetchRecordPage', () => {
  it('sends the filter, the offset, the limit and the sort', async () => {
    rpc.mockResolvedValue({ data: { total: 316, offset: 50, limit: 25, statusCounts: { approved: 20 }, rows: [] }, error: null });

    await fetchRecordPage({ business: 'issue', form_code: 'F/35' }, 50, 25, 'created_desc');

    const [name, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('records_page');
    expect(args.p_filter).toEqual({ business: 'issue', form_code: 'F/35' });
    expect(args.p_offset).toBe(50);
    expect(args.p_limit).toBe(25);
    expect(args.p_sort).toBe('created_desc');
  });

  it('returns the total, the rows and the status counts of the FILTERED set', async () => {
    rpc.mockResolvedValue({ data: { total: 7, offset: 0, limit: 25, statusCounts: { approved: 5, draft: 2 }, rows: [SERVER_ROW] }, error: null });

    const page = await fetchRecordPage({}, 0, 25);

    expect(page.total).toBe(7);
    expect(page.rows).toHaveLength(1);
    // The counts describe the rows the filter matched — the dashboard's
    // header shows "N records · M approved", and that M has to be the M of
    // the list on screen.
    expect(page.statusCounts).toEqual({ approved: 5, draft: 2 });
  });
});

// ---------------------------------------------------------------------------
// The missing-function signal
// ---------------------------------------------------------------------------

describe('isMissingFunctionError', () => {
  it('recognises the PostgREST code', () => {
    expect(isMissingFunctionError({ code: 'PGRST202', message: 'Could not find the function' })).toBe(true);
  });

  it('recognises the message', () => {
    expect(isMissingFunctionError({ message: 'Could not find the function public.compliance_map without parameters in the schema cache.' })).toBe(true);
  });

  it('looks through the cause chain', () => {
    const wrapped = new ComplianceApiError('compliance_map failed', { code: 'PGRST202', message: 'nope' });
    expect(isMissingFunctionError(wrapped)).toBe(true);
  });

  it('does NOT swallow a real failure', () => {
    expect(isMissingFunctionError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingFunctionError(new Error('network down'))).toBe(false);
    expect(isMissingFunctionError(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The mapping
// ---------------------------------------------------------------------------

describe('toFormCompliance', () => {
  it('maps the server answer onto the shape the pages read', () => {
    const c = toFormCompliance(SERVER_FORM);

    expect(c.formCode).toBe('F/35');
    expect(c.formName).toBe('Design Review Record');
    expect(c.isPeriodic).toBe(true);
    expect(c.frequencyType).toBe('Monthly');
    // The cadence WORD, not the catalogue's own wording — "Monthly during
    // dev" is right in the form register and wrong in a compliance
    // sentence.
    expect(c.frequencyLabel).toBe('Monthly');
    expect(c.recordCount).toBe(4);
    expect(c.months).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
    expect(c.missingCount).toBe(2);
    expect(c.missingCountLabel).toBe('2 months');
    expect(c.periodUnit).toBe('month');
    expect(c.isOverdue).toBe(true);
    expect(c.overdueDays).toBe(9);
    expect(c.coveredCount).toBe(2);
    expect(c.nextDueDate).toBe('2026-10-05');
    expect(c.daysUntilDue).toBe(4);
    expect(c.daysSinceLast).toBe(12);
  });

  it('keeps the missed periods and their states', () => {
    const c = toFormCompliance(SERVER_FORM);

    expect(c.missingPeriods.map((p) => p.key)).toEqual(['2026-07', '2026-08']);
    expect(c.periodStates.map((s) => `${s.period.key}:${s.state}:${s.daysLate}`)).toEqual([
      '2026-06:covered:0',
      '2026-07:missing:21',
      '2026-08:missing:5',
      '2026-09:covered:0',
    ]);
  });

  it('carries a form with no cadence through unchanged', () => {
    const c = toFormCompliance({
      ...SERVER_FORM,
      frequency: 'On event',
      periodic: null,
      isOverdue: false,
      missingCount: 0,
      missingPeriods: [],
      periodStates: [],
      coveredCount: 0,
      nextDueDate: null,
      daysUntilDue: null,
    });

    expect(c.isPeriodic).toBe(false);
    expect(c.frequencyType).toBe('Event-Driven');
    expect(c.frequencyLabel).toBe('On event');
    expect(c.periodUnit).toBe('');
  });
});

describe('toComplianceMap', () => {
  it('keys the model by the form code', () => {
    const map = toComplianceMap({ 'F/35': SERVER_FORM, 'F/49': { ...SERVER_FORM, code: 'F/49' } });
    expect([...map.keys()].sort()).toEqual(['F/35', 'F/49']);
    expect(map.get('F/35')?.missingCount).toBe(2);
  });
});

describe('toClientRecord', () => {
  it('keeps the business status apart from the workflow status', () => {
    const record = toClientRecord(SERVER_ROW) as unknown as Record<string, unknown>;

    // The workflow status — `records.status`.
    expect(record._status).toBe('approved');
    expect(record._approvalStatus).toBe('Approved');
    // The business status — the state the FORM carries, in its own field.
    expect(record.status).toBe('open');
  });

  it('carries the metadata the list shows', () => {
    const record = toClientRecord(SERVER_ROW) as unknown as Record<string, unknown>;

    expect(record.id).toBe('row-1');
    expect(record.serial).toBe('F/35-014');
    expect(record.formCode).toBe('F/35');
    expect(record.formName).toBe('Design Review Record');
    expect(record._editCount).toBe(2);
    expect(record._section).toBe(6);
    expect(record._sectionName).toBe('R&D & Design');
    expect(record._frequency).toBe('Monthly during dev');
    expect(record.project_id).toBe('project-1');
    expect(record.client_name).toBe('A client');
    expect(record.project_name).toBe('A project');
  });

  it('derives the department from the form code', () => {
    const record = toClientRecord(SERVER_ROW) as unknown as Record<string, unknown>;
    // F/35 is an R&D form.
    expect(record._department).toBe('RD');
  });

  it('leaves an absent business status undefined rather than inventing one', () => {
    const record = toClientRecord({ ...SERVER_ROW, business_status: null }) as unknown as Record<string, unknown>;
    expect(record.status).toBeUndefined();
  });
});
