/**
 * A form must be creatable.
 *
 * The CREATE path validates against the STRICT schema, and the payload it
 * validates is the one the document facsimile wrote — the facsimile is the
 * form, and it is what the create page renders.  So a schema field that the
 * facsimile never produces can never be in the payload, and a REQUIRED one
 * of those makes the form impossible to create: the save is refused with
 * "X is required" for a field that the document does not have.
 *
 * Measured on the catalogue before this was repaired: 27 of the 36 forms
 * could not be created at all — F/12 demanded a `department` the document
 * ("Disposal of Non-Conforming Products") does not have, F/43 demanded an
 * `inductee_signature` it signs under `manager_signature`, F/45 an
 * `employee_name` the "Master List of Documents" has no field for, and so
 * on for 27 forms and 56 fields.
 *
 * This test builds the create payload the way the app builds it — from the
 * keys the facsimile mentions — and asserts that the write is accepted.  It
 * reads the templates, so a facsimile that grows a new key is covered
 * automatically, and a facsimile that LOSES a key that the schema still
 * demands fails here instead of in a user's browser.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FORM_SCHEMAS } from '@/schemas/unifiedSchema';
import { preWriteValidation } from '@/services/preWriteValidation';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

const TEMPLATE_DIR = join(process.cwd(), 'src/components/forms/templates');

/** The JavaScript words that are not field keys. */
const NOT_A_KEY = new Set([
  'react', 'true', 'false', 'string', 'object', 'boolean', 'number',
  'array', 'undefined', 'null', 'key', 'value', 'type', 'label', 'className',
]);

interface FieldLike {
  key: string;
  type?: string;
  options?: string[];
  required?: boolean;
  columns?: { key: string }[];
}

/**
 * The keys a template mentions.  A template binds a key in a string
 * literal — `val(d, "date")`, `inp("vendor_name")`, `onChange?.("qty", …)` —
 * and a key that is only ever a dynamic expression (`topic_${n}_trainer`)
 * cannot be a schema key, so it is not needed here.
 */
function templateKeys(file: string): Set<string> {
  const src = readFileSync(join(TEMPLATE_DIR, file), 'utf8');
  const found = new Set<string>();
  const re = /['"]([a-z][a-z0-9_]{2,60})['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!NOT_A_KEY.has(m[1])) found.add(m[1]);
  }
  return found;
}

/** A value the strict schema accepts for a key. */
function valueFor(key: string, field: FieldLike | undefined): unknown {
  if (key === 'serial') return 'F/00-001';
  if (field) {
    switch (field.type) {
      case 'date': return '01/01/2026';
      case 'number': return 1;
      case 'checkbox': return true;
      case 'select':
      case 'radio': return field.options?.[0] ?? 'x';
      case 'multiselect': return [field.options?.[0] ?? 'x'];
      case 'table': return [];
      case 'array': return [];
      default: break;
    }
  }
  // A key that says it holds a date must hold one, or the pre-write date
  // check refuses the payload.
  if (key === 'date' || key.startsWith('date_') || key.endsWith('_date')) {
    return '01/01/2026';
  }
  return 'x';
}

const templateFiles = readdirSync(TEMPLATE_DIR)
  .filter(f => /^F\d+Template\.tsx$/.test(f))
  .sort();

describe('every form can be created from its own document', () => {
  it('finds every facsimile', () => {
    expect(templateFiles.length).toBeGreaterThan(30);
  });

  for (const file of templateFiles) {
    const code = 'F/' + file.match(/^F(\d+)/)![1].padStart(2, '0');

    it(`${code} — a create built from the ${file} facsimile is accepted`, () => {
      const schema = FORM_SCHEMAS.find(s => s.code === code);
      expect(schema, `${code} has no schema`).toBeTruthy();
      const byKey = new Map((schema?.fields ?? []).map(f => [f.key, f as FieldLike]));

      const payload: Record<string, unknown> = { serial: 'F/00-001' };
      for (const key of templateKeys(file)) {
        payload[key] = valueFor(key, byKey.get(key));
      }
      // A table the schema declares but the facsimile does not write still
      // has to be a valid (empty) table.
      for (const field of schema?.fields ?? []) {
        if ((field.type === 'table' || field.type === 'array') && !(field.key in payload)) {
          payload[field.key] = [];
        }
      }

      const result = preWriteValidation(code, payload as RecordData, 'create', undefined, 'a@b.c');
      expect(
        result.errors.map(e => `${e.field}: ${e.message}`),
        `${code} cannot be created`,
      ).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});
