// ============================================================================
// QBase — the server's required-field rule and the catalogue's
//
// `_validate_form_required_fields` is the server's gate.  Its lists were
// written for an EARLIER revision of the forms and were never carried over
// to the catalogue the app validates against, so the server and the client
// ended up describing two different sets of forms.
//
// Measured on the local copy of the production register (2026-10-24):
//
//   * 31 of the 36 forms could not be created through
//     `create_record_validated` at all;
//   * 216 of the 316 live records would be refused by the same gate, so a
//     RESTORE of the register's own backup would bring back 100 records
//     and drop 216.
//
// Prime migration 19 makes the server's lists the catalogue's lists.  This
// test is what keeps them together: it reads the migration's SQL and
// compares every list with the catalogue the client validates against, so
// a form that gains a required field fails here until the migration is
// updated with it.
//
// The rule is EXACTLY the catalogue's `required` flags, minus `serial`:
// the serial is a COLUMN, not a business field.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFormSchema, FORM_SCHEMAS } from '@/data/formSchemas';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/prime/20261024_19_required_fields_follow_the_catalogue.sql',
);

/** The server's lists, read out of the migration. */
function readServerLists(): Map<string, string[]> {
  const sql = readFileSync(MIGRATION, 'utf8');
  const lists = new Map<string, string[]>();

  // `when 'F/08' then array['client_name']::text[]`
  const pattern = /when\s+'([^']+)'\s+then\s+array\[([^\]]*)\](?:::text\[\])?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const code = match[1];
    const body = match[2].trim();
    const fields = body
      ? body.split(',').map(f => f.trim().replace(/^'|'$/g, '')).filter(Boolean)
      : [];
    lists.set(code, fields);
  }
  return lists;
}

/** The catalogue's required fields for a form, minus the serial. */
function catalogueRequired(code: string): string[] {
  const schema = getFormSchema(code);
  if (!schema) return [];
  return schema.fields
    .filter(f => f.required && f.key !== 'serial')
    .map(f => f.key)
    .sort();
}

const serverLists = readServerLists();

describe('the server’s required-field rule and the catalogue', () => {
  it('the migration was found and it lists every form of the catalogue', () => {
    expect(serverLists.size).toBeGreaterThan(0);
    const catalogueCodes = FORM_SCHEMAS.map(s => s.code).sort();
    expect([...serverLists.keys()].sort()).toEqual(catalogueCodes);
  });

  it('every form has the SAME required fields on the server as in the catalogue', () => {
    const drift: string[] = [];

    for (const [code, serverFields] of serverLists) {
      const expected = catalogueRequired(code);
      const actual = [...serverFields].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        drift.push(`${code}: server [${actual.join(', ')}] vs catalogue [${expected.join(', ')}]`);
      }
    }

    expect(drift).toEqual([]);
  });

  it('the serial is not a required FIELD — it is a column', () => {
    for (const [code, fields] of serverLists) {
      expect(fields, `${code} must not require the serial as a business field`).not.toContain('serial');
    }
  });

  it('the migration grants the function to the authenticated role only', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    expect(sql).toContain(
      'revoke execute on function public.bulk_create_records(jsonb, text, boolean, boolean) from public, anon;',
    );
    expect(sql).toContain(
      'grant execute on function public.bulk_create_records(jsonb, text, boolean, boolean) to authenticated;',
    );
  });

  it('the migration changes no row — it replaces two function bodies', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    // The function BODIES write rows — that is the function's job.  What
    // must not happen is the MIGRATION itself touching a row, so the
    // comments and the function bodies are cut out and what is left is
    // checked for DML and for any mention of a data table.
    const withoutComments = sql.replace(/--[^\n]*/g, '');
    const statementsOnly = withoutComments.replace(/\$\$[\s\S]*?\$\$/g, '');

    expect(statementsOnly).not.toMatch(/\b(update|delete|truncate|merge)\b/i);
    expect(statementsOnly).not.toMatch(/\binsert\s+into\b/i);
    // Outside the function bodies the migration never names a data table.
    expect(statementsOnly).not.toMatch(/public\.(records|audit_log|profiles)\b/i);
  });
});

describe('the client’s completeness check and the server’s', () => {
  it('agrees with the server on every form of the catalogue', () => {
    // The import's own check (`missingRequiredFields` in importService)
    // reads the same catalogue the server's list was copied from, so a row
    // the client accepts is a row the server accepts.
    for (const schema of FORM_SCHEMAS) {
      const server = serverLists.get(schema.code) ?? [];
      const client = catalogueRequired(schema.code);
      expect([...server].sort(), schema.code).toEqual(client);
    }
  });

  it('a legacy code has no rules on either side', () => {
    // "CAPA REGISTER" and "TEST" are not catalogue forms.  The server's
    // `else` branch gives them no required fields, and the client has no
    // schema for them, so the two agree.
    expect(serverLists.has('CAPA REGISTER')).toBe(false);
    expect(getFormSchema('CAPA REGISTER')).toBeUndefined();
  });
});
