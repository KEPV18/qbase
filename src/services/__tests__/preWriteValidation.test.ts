// ============================================================================
// QBase — Pre-Write Validation: which fields are treated as dates
//
// The date check used to ask "does the key CONTAIN the word 'date'".
// That is true for `updated_based_on_progress` — a plain free-text field
// on F/11 — so filling that field in made the whole record fail with
// "Invalid date format" and F/11 could not be saved at all.
//
// The rule is now exact: a key is a date when it IS `date`, STARTS with
// `date_`, or ENDS with `date`.  Every real date key in the schema
// matches; no text field does.
//
// The check also looks at the CALENDAR now, not only at the shape:
// "2026-13-45" matched the ISO pattern and was stored as a date.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { preWriteValidation } from '../preWriteValidation';

/** A complete, valid F/11 payload — the date check is only reached once
 *  Zod is happy, so every required field has to be here. */
const VALID_F11 = {
  serial: 'F/11-001',
  month: '2026-10',
  date: '2026-10-23',
  prepared_by: 'A. Auditor',
  signature: 'A. Auditor',
};

/** The format errors a validation produced. */
const formatErrors = (result: ReturnType<typeof preWriteValidation>) =>
  result.errors.filter(e => e.code === 'format');

describe('preWriteValidation — the date-format check', () => {
  it('does not treat a free-text field that merely contains "date" as a date', () => {
    const result = preWriteValidation(
      'F/11',
      { ...VALID_F11, updated_based_on_progress: 'Based on the last inspection' },
      'create',
    );
    // The record itself must be accepted...
    expect(formatErrors(result)).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('still refuses a real date field that is not a date', () => {
    const result = preWriteValidation('F/11', { ...VALID_F11, date: 'not a date' }, 'create');
    const err = result.errors.find(e => e.field === 'date');
    expect(err?.code).toBe('format');
  });

  it('accepts a real date field written as YYYY-MM-DD', () => {
    const result = preWriteValidation('F/11', { ...VALID_F11, date: '2026-10-23' }, 'create');
    expect(formatErrors(result)).toEqual([]);
  });

  it('accepts a real date field written as DD/MM/YYYY', () => {
    // The display format is normalised to ISO before the check runs, so a
    // DD/MM/YYYY value must not be reported as invalid.
    const result = preWriteValidation('F/11', { ...VALID_F11, date: '23/10/2026' }, 'create');
    expect(formatErrors(result)).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('refuses a date that only has the shape of one', () => {
    // 31 is not a month, and 2026 has no 30 February.
    for (const bad of ['31/31/2026', '2026-13-45', '2026-02-30', '30/02/2026']) {
      const result = preWriteValidation('F/11', { ...VALID_F11, date: bad }, 'create');
      expect(
        result.errors.some(e => e.field === 'date' && e.code === 'format'),
        `${bad} should be refused`,
      ).toBe(true);
    }
  });
});

describe('preWriteValidation — the project link survives validation', () => {
  // Neither `project_id` nor `scope` is declared in the Zod form schemas, so
  // `safeParse` stripped them.  The record then lost its project on its first
  // edit, because `update_record_versioned` replaces form_data wholesale with
  // the validated business fields.  The project id is lifted from form_data
  // into the `records.project_id` column by the `records_sync_project`
  // trigger (migration 14), so it has to arrive there in the first place.

  it('keeps the project id and the scope in the validated payload', () => {
    const result = preWriteValidation(
      'F/11',
      {
        ...VALID_F11,
        project_id: 'a887a95e-a35b-4c50-927d-cf9c7bcaa882',
        scope: 'project-specific',
      },
      'create',
    );
    expect(result.valid).toBe(true);
    expect(result.sanitizedData?.project_id).toBe('a887a95e-a35b-4c50-927d-cf9c7bcaa882');
    expect(result.sanitizedData?.scope).toBe('project-specific');
  });

  it('keeps the scope of a record that is not project-specific', () => {
    const result = preWriteValidation(
      'F/11',
      { ...VALID_F11, scope: 'company-wide' },
      'create',
    );
    expect(result.valid).toBe(true);
    expect(result.sanitizedData?.scope).toBe('company-wide');
  });
});
