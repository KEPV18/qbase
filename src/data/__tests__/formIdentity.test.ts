// ============================================================================
// QBase — Form identity / alias layer tests
//
// The layer exists because three catalogues disagree about the NAME of 16 of
// the 36 forms, and because the production records carry 52 distinct
// (form_code, form_name) pairs that no renaming may disturb.
//
// These tests pin the four properties the layer must keep:
//
//   1. it agrees with the ISO catalogue (the names the records are filed
//      under) and with the document facsimiles and the unified schema, so
//      the three tables can never drift apart;
//   2. every name the app has ever used for a form still resolves back to
//      that form — a record, a link or a saved filter carrying an old name
//      keeps working;
//   3. the reverse lookup is deterministic, and a name that two forms both
//      claim always resolves to the same code;
//   4. nothing here touches the database: the stored name of an existing
//      record is never rewritten.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORM_IDENTITIES,
  findFormCodeByName,
  findFormCodesByName,
  getFormIdentity,
  isKnownFormCode,
  isKnownFormName,
  normalizeFormName,
  resolveDocumentTitle,
  resolveFormAliases,
  resolveFormName,
} from '../formIdentity';
import { FORMS_REGISTRY } from '../formsRegistry';
import { FORM_SCHEMAS } from '../formSchemas';
import { UNIFIED_SCHEMAS } from '@/schemas/unifiedSchema';

const TEMPLATE_DIR = join(process.cwd(), 'src/components/forms/templates');

/** The title each facsimile prints, read straight off the template files. */
function readDocumentTitles(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of readdirSync(TEMPLATE_DIR).filter(f => /^F\d+Template\.tsx$/.test(f))) {
    const code = `F/${file.match(/^F(\d+)/)![1].padStart(2, '0')}`;
    const match = readFileSync(join(TEMPLATE_DIR, file), 'utf8').match(/formName="([^"]+)"/);
    if (match) out[code] = match[1];
  }
  return out;
}

describe('form identity layer', () => {
  it('knows every catalogue form, and the two legacy codes', () => {
    for (const entry of FORMS_REGISTRY) {
      const identity = getFormIdentity(entry.code);
      expect(identity, `${entry.code} has no identity`).toBeDefined();
      expect(identity!.name).toBe(entry.name);
      expect(identity!.legacy).toBe(false);
    }
    expect(isKnownFormCode('CAPA REGISTER')).toBe(true);
    expect(isKnownFormCode('TEST')).toBe(true);
    expect(isKnownFormCode('F/99')).toBe(false);
  });

  it('agrees with the document facsimiles about every title', () => {
    const titles = readDocumentTitles();
    expect(Object.keys(titles).length).toBe(36);
    for (const [code, title] of Object.entries(titles)) {
      expect(resolveDocumentTitle(code), `${code} title drifted`).toBe(title);
    }
  });

  it("keeps the schema's old names as aliases, so old references still resolve", () => {
    // The unified schema re-named 16 forms; those names are how older links,
    // filters and rows spell them, and they must not become dead ends.
    for (const schema of UNIFIED_SCHEMAS) {
      const identity = getFormIdentity(schema.code);
      expect(identity).toBeDefined();
      // Every schema name is either the catalogue name or one of its aliases.
      const known = identity!.aliases.includes(schema.name) || identity!.name === schema.name;
      expect(known, `${schema.code}: "${schema.name}" is neither the catalogue name nor an alias`).toBe(true);
    }
  });

  it('resolves every alias back to the form it belongs to', () => {
    // The exceptions are the names TWO forms claim.  The catalogue name
    // always wins, so the loser is listed explicitly rather than hidden.
    const ambiguousAliases: Record<string, string> = {
      'Training Record': 'F/29',     // F/29's catalogue name beats F/28's historical one
      'Corrective Action': 'F/22',   // F/22's catalogue name beats F/23's old schema name
    };
    for (const identity of FORM_IDENTITIES) {
      for (const alias of identity.aliases) {
        const code = findFormCodeByName(alias);
        expect(code, `"${alias}" does not resolve`).toBeDefined();
        const expected = ambiguousAliases[alias] ?? identity.code;
        expect(code, `"${alias}" resolved to ${code}, not ${expected}`).toBe(expected);
      }
    }
  });

  it('prefers the catalogue name when two forms claim one name', () => {
    // "Corrective Action" is F/22's catalogue name and F/23's old schema
    // name.  The catalogue name is the one the records were filed under.
    expect(findFormCodeByName('Corrective Action')).toBe('F/22');
    expect(findFormCodeByName('Corrective Action')).not.toBe('F/23');
    // "Purchase Order" is F/13's catalogue name; F/08's document used to
    // print the same words.
    expect(findFormCodeByName('Purchase Order')).toBe('F/13');
  });

  it('finds a form by the name the records actually carry', () => {
    expect(findFormCodeByName('Monthly Production Plan')).toBe('F/11');
    expect(findFormCodeByName('Management Review Agenda')).toBe('F/20');
    expect(findFormCodeByName('Non-Conformity / Corrective Action')).toBe('F/22');
    expect(findFormCodeByName('Master List of Docs')).toBe('F/45');
    expect(findFormCodeByName('Corrective and Preventive Action Register')).toBe('CAPA REGISTER');
  });

  it('ignores case, punctuation and a leading form code', () => {
    expect(findFormCodeByName('purchase order')).toBe('F/13');
    expect(findFormCodeByName('PURCHASE   ORDER')).toBe('F/13');
    expect(findFormCodeByName('F/12 Purchase Requisition')).toBe('F/12');
    expect(findFormCodeByName('Objectives and Targets')).toBe('F/24');
    expect(findFormCodeByName('Objectives & Targets')).toBe('F/24');
    expect(normalizeFormName(' Job Description / Responsibilities ')).toBe('jobdescriptionresponsibilities');
  });

  it('never resolves an unknown name', () => {
    expect(findFormCodeByName('A form that never existed')).toBeUndefined();
    expect(findFormCodesByName('A form that never existed')).toEqual([]);
    expect(isKnownFormName('A form that never existed')).toBe(false);
    expect(isKnownFormName('Non-Conforming')).toBe(true);
  });

  it('falls back to the code for a form the catalogue does not carry', () => {
    // An unknown code must still produce a usable label — the UI has no
    // empty-string case to guard against.
    expect(resolveFormName('F/99')).toBe('F/99');
    expect(resolveFormName('')).toBe('');
    expect(resolveFormAliases('F/99')).toEqual([]);
  });

  it("gives the catalogue name to the generated schemas, so the stale ones are gone", () => {
    // The create page, the preview, the register and a new record's
    // form_name all read FORM_SCHEMAS[].name.  It must be the catalogue
    // name — never the stale schema name.
    for (const schema of FORM_SCHEMAS) {
      expect(schema.name, `${schema.code} still shows a stale name`).toBe(
        FORMS_REGISTRY.find(e => e.code === schema.code)!.name,
      );
    }
    expect(FORM_SCHEMAS.find(s => s.code === 'F/12')!.name).toBe('Non-Conforming');
    expect(FORM_SCHEMAS.find(s => s.code === 'F/23')!.name).toBe('Master List of Records');
    expect(FORM_SCHEMAS.find(s => s.code === 'F/50')!.name).toBe('Customer Property Register');
  });

  it('sections the forms the way the production records do', () => {
    expect(FORM_SCHEMAS.find(s => s.code === 'F/11')!.section).toBe(2);
    expect(FORM_SCHEMAS.find(s => s.code === 'F/13')!.section).toBe(4);
    expect(FORM_SCHEMAS.find(s => s.code === 'F/48')!.section).toBe(3);
    expect(FORM_SCHEMAS.find(s => s.code === 'F/49')!.section).toBe(7);
  });
});
