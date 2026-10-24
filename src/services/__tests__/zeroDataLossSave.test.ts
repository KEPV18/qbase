/**
 * A save must not change a record the user did not change.
 *
 * "Zero Data Loss" (عدم فقدان أو تعديل أي سطر أو سجل موجود حالياً): the
 * payload the client sends is what the server stores — `update_record_versioned`
 * REPLACES `records.form_data` WHOLESALE — so anything the write path drops
 * is DELETED from the record, and anything it rewrites is MODIFIED.
 *
 * Measured on the local copy of the production database (316 live records),
 * a no-op save (open a record, press Save) used to:
 *
 *   * rewrite the date strings of 252 records from DD/MM/YYYY to YYYY-MM-DD;
 *   * refuse 25 records outright on the serial-format rule;
 *   * delete `form_data.serial` from all 316 records, `form_data.department`
 *     from 215, `form_data.frequency` from 8, `form_data.created_by` from 5
 *     and `form_data.approval_status` from 1.
 *
 * These tests pin the repairs.  The write-path tests drive the real
 * `updateRecord` against a mocked Supabase client, so they cover the
 * extraction of the business data as well as the validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

// --- the Supabase client is mocked: the write path is exercised end to end,
//     and the payload it sends to the RPC is captured.
const h = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: async () => ({ data: h.row, error: null }),
          }),
        }),
      }),
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      h.rpcCalls.push({ name, args });
      if (name === 'update_record_versioned') return { data: [{ id: 'row-1' }], error: null };
      return { data: null, error: null };
    },
    auth: {
      getUser: async () => ({
        data: { user: { email: 'admin@qbase.local', id: 'admin-1' } },
        error: null,
      }),
    },
  },
}));

const { preWriteValidation } = await import('@/services/preWriteValidation');
const { updateRecord, setCurrentUserSnapshot } = await import('@/services/recordStorage');
const { FORM_SCHEMAS } = await import('@/schemas/unifiedSchema');

type FieldValue = RecordData[string];

/** The payload `update_record_versioned` was given. */
function writtenFormData(): RecordData {
  const call = h.rpcCalls.find(c => c.name === 'update_record_versioned');
  if (!call) throw new Error('update_record_versioned was not called');
  return (call.args.p_form_data ?? {}) as RecordData;
}

/** A row as the database holds it. */
function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    form_code: 'CAPA REGISTER',
    serial: 'CAPA-25-001',
    form_name: 'CAPA Register',
    project_id: null,
    status: 'approved',
    form_data: {},
    section: null,
    section_name: '',
    frequency: '',
    created_by: 'someone@example.com',
    last_modified_by: 'someone@example.com',
    edit_count: 3,
    modification_reason: '',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * A value the schema accepts for a field.
 *
 * A key that says it holds a date must hold a REAL date — that is the
 * pre-write date rule, and it is the rule under test elsewhere here.
 */
function valueFor(field: { key: string; type?: string }): FieldValue {
  if (field.type === 'table' || field.type === 'array') return [];
  if (field.type === 'date') return '01/01/2026';
  const key = field.key;
  if (key === 'date' || key.startsWith('date_') || key.endsWith('_date')) return '01/01/2026';
  return 'x';
}

/** A payload every declared field of a form is happy with. */
function payloadFor(code: string, skip: string[] = []): RecordData {
  const schema = FORM_SCHEMAS.find(s => s.code === code);
  const payload: RecordData = { serial: 'F/11-001' };
  for (const field of schema?.fields ?? []) {
    if (field.key === 'serial' || skip.includes(field.key)) continue;
    payload[field.key] = valueFor(field);
  }
  return payload;
}

beforeEach(() => {
  h.rpcCalls.length = 0;
  h.row = null;
  setCurrentUserSnapshot({
    email: 'admin@qbase.local',
    id: 'admin-1',
    role: 'admin',
  } as never);
});

// ---------------------------------------------------------------------------
// The gate: a legacy record, an undeclared key, an absent field
// ---------------------------------------------------------------------------

describe('the pre-write gate accepts what the database really holds', () => {
  it('saves a record whose form code has no schema, with every key intact', () => {
    // The production copy holds five records under "CAPA REGISTER" and one
    // under "TEST" — neither is a form code in the catalogue.
    const stored = {
      serial: 'CAPA-25-001',
      finding: 'a real finding',
      root_cause: 'a real cause',
      an_undeclared_key: 'the stored value',
    };
    const result = preWriteValidation('CAPA REGISTER', { ...stored }, 'update', 'CAPA-25-001', 'a@b.c');
    expect(result.errors.map(e => `${e.field}: ${e.message}`)).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.sanitizedData).toEqual(stored);
  });

  it('carries a key the schema does not declare through untouched', () => {
    const code = 'F/11';
    const payload = payloadFor(code);
    payload.a_field_the_schema_never_heard_of = { nested: ['value', 1] };
    const result = preWriteValidation(code, payload, 'update', 'F/11-001', 'a@b.c');
    expect(result.errors.map(e => `${e.field}: ${e.message}`)).toEqual([]);
    expect((result.sanitizedData as RecordData).a_field_the_schema_never_heard_of)
      .toEqual({ nested: ['value', 1] });
  });

  it('leaves an absent field absent — it does not fabricate one', () => {
    // F/29's `result` used to carry a `.default({})`, so every record that
    // did not have one gained an empty object on its first save.
    const code = 'F/29';
    const payload = payloadFor(code, ['result']);
    const result = preWriteValidation(code, payload, 'update', 'F/29-001', 'a@b.c');
    expect(result.errors.map(e => `${e.field}: ${e.message}`)).toEqual([]);
    expect('result' in (result.sanitizedData as RecordData)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The gate: a stored value is never rewritten
// ---------------------------------------------------------------------------

describe('a stored value is carried through, never rewritten', () => {
  const cases: { label: string; code: string; key: string; value: string }[] = [
    { label: 'DD/MM/YYYY', code: 'F/11', key: 'date', value: '23/10/2026' },
    { label: 'YYYY-MM-DD', code: 'F/11', key: 'date', value: '2026-10-23' },
  ];

  for (const { label, code, key, value } of cases) {
    it(`keeps a stored date written as ${label}`, () => {
      const payload = payloadFor(code);
      payload[key] = value;
      const result = preWriteValidation(code, payload, 'update', 'F/11-001', 'a@b.c');
      expect(result.errors.map(e => `${e.field}: ${e.message}`)).toEqual([]);
      expect((result.sanitizedData as RecordData)[key]).toBe(value);
    });
  }

  it('still refuses a date that is not a date', () => {
    const payload = payloadFor('F/11');
    payload.date = '31/31/2026';
    const result = preWriteValidation('F/11', payload, 'update', 'F/11-001', 'a@b.c');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'date')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The gate: the serial rule
// ---------------------------------------------------------------------------

describe('the serial-format rule only judges a serial this edit introduces', () => {
  it('does not block a save on a serial the record already carries', () => {
    // 17 of the live F/44 rows carry a name-bearing serial such as
    // "F/99-<a person's name>", and 8 F/19 rows carry the legacy sentence
    // "Not Applicable - Legacy Field" in form_data.serial.  Neither can
    // ever match F/XX-NNN, and refusing them made those records
    // impossible to save.
    const stored = { serial: 'F/99-A Person', department: 'Quality', a_field: 'the stored value' };
    const result = preWriteValidation('F/44', { ...stored }, 'update', 'F/99-A Person', 'a@b.c', { ...stored });
    expect(result.errors.map(e => `${e.field}: ${e.message}`)).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('still refuses a malformed serial on a create', () => {
    const payload = payloadFor('F/11');
    payload.serial = 'not a serial';
    const result = preWriteValidation('F/11', payload, 'create', undefined, 'a@b.c');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'serial' && e.code === 'format')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The write path: nothing is deleted
// ---------------------------------------------------------------------------

describe('the write path deletes nothing', () => {
  it('writes back the stored form_data unchanged on a no-op save', async () => {
    const stored = {
      serial: 'CAPA-25-001',
      department: 'Quality Assurance',
      frequency: 'Monthly',
      created_by: 'someone@example.com',
      finding: 'a real finding',
    };
    h.row = dbRow({ form_data: { ...stored } });

    const result = await updateRecord('CAPA-25-001', {});
    expect(result.success).toBe(true);
    expect(writtenFormData()).toEqual(stored);
  });

  it('keeps a value the user typed, and does not restore the stored one', async () => {
    h.row = dbRow({
      form_data: {
        serial: 'CAPA-25-001',
        department: 'Quality Assurance',
        finding: 'a real finding',
      },
    });

    const result = await updateRecord('CAPA-25-001', { department: 'Operations' });
    expect(result.success).toBe(true);
    expect(writtenFormData().department).toBe('Operations');
  });

  it('keeps every business key of a record that has a schema', async () => {
    const formData = payloadFor('F/11');
    formData.an_undeclared_business_key = 'the stored value';
    h.row = dbRow({
      form_code: 'F/11',
      serial: 'F/11-001',
      form_name: 'Internal Audit',
      form_data: { ...formData },
    });

    const result = await updateRecord('F/11-001', {});
    expect(result.success).toBe(true);
    const written = writtenFormData();
    for (const [key, value] of Object.entries(formData)) {
      expect(written[key], `F/11 lost ${key}`).toEqual(value);
    }
  });
});
