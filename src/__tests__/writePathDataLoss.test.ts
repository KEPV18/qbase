/**
 * The write path must never lose data.
 *
 * `update_record_versioned` replaces `records.form_data` WHOLESALE with the
 * payload the client sends, and the payload the client sends is the payload
 * Zod produced (`preWriteValidation` → `validateFormData` →
 * `FORM_ZOD_SCHEMAS[formCode].safeParse`).
 *
 * Zod's default object strips every key the schema does not declare, so a
 * schema that did not declare a real business field DELETED that field from
 * the record on the first edit — silently, with `valid: true` and the write
 * reported as successful.  Measured on the local production copy: 33 of the
 * 37 forms carry business fields the schema does not declare, between 2 and
 * 45 of them per form.
 *
 * These tests pin the properties that fix it:
 *   1. an undeclared key survives the validation round trip, for EVERY form;
 *   2. a table row keeps a column the schema does not declare;
 *   3. the metadata keys the write path depends on survive;
 *   4. the real stored shapes of the forms whose schema used to disagree
 *      with their document facsimile validate instead of blocking the save.
 */
import { describe, it, expect } from 'vitest';
import { FORM_SCHEMAS, FORM_ZOD_SCHEMAS } from '@/schemas/unifiedSchema';
import { preWriteValidation } from '@/services/preWriteValidation';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

interface FieldLike {
  key: string;
  type?: string;
  options?: string[];
  required?: boolean;
  columns?: { key: string }[];
  defaultValue?: unknown;
}

/** A value that satisfies the declared type of a schema field. */
function sentinelFor(field: FieldLike | undefined, key: string): unknown {
  switch (field?.type) {
    case 'date': return '01/01/2026';
    case 'number': return 1;
    case 'checkbox': return true;
    case 'multiselect': return [field.options?.[0] ?? 'x'];
    case 'select':
    case 'radio': return field.options?.[0] ?? 'x';
    case 'table': return [];
    case 'object': return {};
    case 'array': return [];
    default: break;
  }
  // A key that says it holds a date must hold one, or the pre-write date
  // check refuses the payload (which is the point of that check).
  if (key === 'date' || key.startsWith('date_') || key.endsWith('_date')) return '01/01/2026';
  return 'x';
}

/** The arrays whose schema declares a minimum length. */
const MIN_LENGTH_ARRAYS: Record<string, { key: string; min: number }[]> = {
  // The evaluation matrix is 20 rows in every stored F/30 record.
  'F/30': [{ key: 'evaluation_matrix', min: 20 }],
  'F/47': [{ key: 'checklist_items', min: 1 }],
};

/** A payload that every form's schema accepts. */
function validPayload(code: string, extra: Record<string, unknown> = {}): RecordData {
  const schema = FORM_SCHEMAS.find(s => s.code === code);
  const byKey = new Map((schema?.fields ?? []).map(f => [f.key, f as FieldLike]));
  const payload: Record<string, unknown> = {
    serial: 'F/00-001',
    ...extra,
  };
  for (const [key, field] of byKey) {
    if (key === 'serial') continue;
    if (key in payload) continue;
    if (field.type === 'table') {
      const row: Record<string, unknown> = {};
      for (const col of field.columns ?? []) row[col.key] = 'x';
      payload[key] = [row];
    } else {
      payload[key] = sentinelFor(field, key);
    }
  }
  for (const { key, min } of MIN_LENGTH_ARRAYS[code] ?? []) {
    if (key in payload) continue;
    payload[key] = Array.from({ length: min }, (_, i) => ({ id: String(i) }));
  }
  return payload as RecordData;
}

// ---------------------------------------------------------------------------
// 1 + 3 — nothing is stripped
// ---------------------------------------------------------------------------

describe('the write path never strips a key', () => {
  it('covers every form in the catalogue', () => {
    expect(FORM_SCHEMAS.length).toBeGreaterThan(30);
  });

  for (const schema of FORM_SCHEMAS) {
    it(`${schema.code} keeps an undeclared business key`, () => {
      const payload = validPayload(schema.code, {
        a_field_the_schema_does_not_declare: 'the stored value',
      });
      const result = preWriteValidation(schema.code, payload, 'update', 'F/00-001', 'a@b.c');
      expect(
        result.errors.map(e => `${e.field}: ${e.message}`),
        `${schema.code} must validate`,
      ).toEqual([]);
      expect(result.valid).toBe(true);
      const sanitized = (result.sanitizedData ?? {}) as Record<string, unknown>;
      expect(
        sanitized.a_field_the_schema_does_not_declare,
        `${schema.code} DESTROYED an undeclared key during validation`,
      ).toBe('the stored value');
    });
  }

  for (const schema of FORM_SCHEMAS) {
    const tables = (schema.fields ?? []).filter(f => f.type === 'table');
    for (const table of tables) {
      it(`${schema.code}.${table.key} keeps an undeclared column`, () => {
        const payload = validPayload(schema.code);
        const row = { ...(payload[table.key] as Record<string, unknown>[])[0] };
        row.an_undeclared_column = 'the stored value';
        payload[table.key] = [row];
        const result = preWriteValidation(schema.code, payload, 'update', 'F/00-001', 'a@b.c');
        expect(
          result.errors.map(e => `${e.field}: ${e.message}`),
          `${schema.code}.${table.key} must validate`,
        ).toEqual([]);
        const sanitized = (result.sanitizedData ?? {}) as Record<string, unknown>;
        const rows = sanitized[table.key] as Record<string, unknown>[] | undefined;
        expect(rows?.[0]?.an_undeclared_column,
          `${schema.code}.${table.key} DESTROYED an undeclared column`).toBe('the stored value');
      });
    }
  }

  it('keeps the metadata keys the write path depends on', () => {
    const code = 'F/11';
    const payload = validPayload(code, {
      project_id: 'a-project-id',
      _createdAt: '2026-01-01T00:00:00.000Z',
      _createdBy: 'someone@example.com',
      _editCount: 3,
      _section: 2,
      _sectionName: 'Operations & Production',
      _frequency: 'Monthly',
    });
    const result = preWriteValidation(code, payload, 'update', 'F/00-001', 'a@b.c');
    expect(result.valid).toBe(true);
    const sanitized = (result.sanitizedData ?? {}) as Record<string, unknown>;
    expect(sanitized.project_id).toBe('a-project-id');
    expect(sanitized._createdBy).toBe('someone@example.com');
    expect(sanitized._editCount).toBe(3);
    expect(sanitized._section).toBe(2);
    expect(sanitized._frequency).toBe('Monthly');
  });
});

// ---------------------------------------------------------------------------
// 4 — the real stored shapes validate
// ---------------------------------------------------------------------------

describe('the real stored shapes of the repaired forms validate', () => {
  const cases: { code: string; field: string; value: unknown }[] = [
    { code: 'F/08', field: 'items', value: [{ product_name: 'Widget', specifications: '12mm', qty: '10' }] },
    { code: 'F/11', field: 'items', value: [{ product: 'Widget', batch_no: 'B1', plan_size: '100' }] },
    { code: 'F/20', field: 'action_items', value: [{ action: 'Do it', deadline: '01/01/2026', responsible: 'A' }] },
    { code: 'F/21', field: 'attendees', value: [{ name: 'A', role: 'Chair' }] },
    { code: 'F/21', field: 'action_items', value: [{ action: 'Do it', deadline: '01/01/2026', responsible: 'A', status: 'Open' }] },
    { code: 'F/22', field: 'non_conformity_source', value: { source: 'Internal Audit', internal_audit: true } },
    { code: 'F/29', field: 'result', value: { score: 4 } },
    { code: 'F/30', field: 'evaluation_matrix', value: Array.from({ length: 20 }, (_, i) => ({ id: String(i), category: 'c', criteria: 'x', score: 0 })) },
    { code: 'F/40', field: 'training_given', value: [{ srNo: '1', topicNo: '2' }] },
    { code: 'F/41', field: 'training_given', value: [{ srNo: '1', topicNo: '2' }] },
    { code: 'F/40', field: 'training_topics', value: [{ code: '1', name: 'Safety' }] },
    { code: 'F/47', field: 'checklist_items', value: [{ clause: '1.1', subclause: '1.1.1', question: 'Q?', status: 'Yes' }] },
  ];

  for (const { code, field, value } of cases) {
    it(`${code}.${field} accepts the stored shape`, () => {
      const payload = validPayload(code, { [field]: value });
      const result = preWriteValidation(code, payload, 'update', 'F/00-001', 'a@b.c');
      expect(
        result.errors.map(e => `${e.field}: ${e.message}`),
        `${code}.${field} REFUSED the stored shape`,
      ).toEqual([]);
      const sanitized = (result.sanitizedData ?? {}) as Record<string, unknown>;
      expect(sanitized[field]).toEqual(value);
    });
  }
});

// ---------------------------------------------------------------------------
// The other half of the data-loss class: a key the payload does NOT carry
// ---------------------------------------------------------------------------

describe('an update does not block on a required field the record never had', () => {
  it('skips a required field that is absent from the payload', () => {
    // F/43 stores the inductee's signature as `inductee_sign`, while the
    // schema requires `inductee_signature` — all 69 stored F/43 records
    // lack the schema's key, so every one of them was un-saveable.
    const code = 'F/43';
    const schema = FORM_SCHEMAS.find(s => s.code === code);
    const required = (schema?.fields ?? []).filter(f => f.required).map(f => f.key);
    expect(required.length).toBeGreaterThan(0);

    const payload = validPayload(code);
    for (const key of required) delete payload[key];

    const result = preWriteValidation(code, payload, 'update', 'F/00-001', 'a@b.c');
    expect(result.valid).toBe(true);
  });

  it('still refuses a required field that is present but empty', () => {
    const code = 'F/43';
    const schema = FORM_SCHEMAS.find(s => s.code === code);
    const required = (schema?.fields ?? []).filter(f => f.required).map(f => f.key);
    const payload = validPayload(code);
    for (const key of required) payload[key] = '';

    const result = preWriteValidation(code, payload, 'update', 'F/00-001', 'a@b.c');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'required')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The schema itself is the contract
// ---------------------------------------------------------------------------

describe('every form schema is loose', () => {
  for (const schema of FORM_SCHEMAS) {
    it(`${schema.code} does not strip undeclared keys`, () => {
      const parsed = FORM_ZOD_SCHEMAS[schema.code].safeParse({
        ...validPayload(schema.code),
        stray: 'kept',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect((parsed.data as Record<string, unknown>).stray).toBe('kept');
      }
    });
  }
});
