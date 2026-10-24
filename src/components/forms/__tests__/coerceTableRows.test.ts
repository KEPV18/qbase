// ============================================================================
// QBase — coerceTableRows: the table, whatever shape the record stored it in
//
// A table's value in `form_data` is a JSONB array of row objects — but a
// LEGACY row (written by the pre-wave-6 templates, or by an import or an
// external script) can hold the same array as a JSON STRING.  The old
// `parseRows` in every template accepted only an array, so a table stored as
// a string fell through to the "no rows" branch and rendered 25 BLANK rows:
// the data was in the record, the form refused to show it, and saving the
// form then wrote those 25 blank rows over it.
//
// The rule is one line: an array is used as it is; a string is parsed when it
// parses to an array; anything else means "there is genuinely nothing to
// show" and the caller falls back to its empty rows.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { coerceTableRows } from '@/components/forms/FormKit';

describe('coerceTableRows', () => {
  it('returns an array as it is', () => {
    const rows = [{ a: 1 }, { a: 2 }];
    expect(coerceTableRows(rows)).toBe(rows);
  });

  it('parses a JSON string that holds an array', () => {
    expect(coerceTableRows('[{"a":1}]')).toEqual([{ a: 1 }]);
    expect(coerceTableRows('[]')).toEqual([]);
  });

  it('parses a JSON string even when it is padded with whitespace', () => {
    expect(coerceTableRows('  [{"a":1}]  ')).toEqual([{ a: 1 }]);
  });

  it('refuses a JSON string that does not hold an array', () => {
    expect(coerceTableRows('{"a":1}')).toBeNull();
    expect(coerceTableRows('"a string"')).toBeNull();
    expect(coerceTableRows('42')).toBeNull();
  });

  it('refuses a string that is not JSON at all', () => {
    expect(coerceTableRows('not json')).toBeNull();
    expect(coerceTableRows('[{"a":1}')).toBeNull();   // truncated
    expect(coerceTableRows('[unquoted]')).toBeNull();
  });

  it('refuses anything that is not an array or a string', () => {
    expect(coerceTableRows(undefined)).toBeNull();
    expect(coerceTableRows(null)).toBeNull();
    expect(coerceTableRows(42)).toBeNull();
    expect(coerceTableRows({ a: 1 })).toBeNull();
    expect(coerceTableRows(true)).toBeNull();
  });
});
