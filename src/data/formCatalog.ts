// ============================================================================
// QBase — Canonical Form Catalogue
//
// One answer to three questions about every form: what is it called, which
// department owns it, and how often must it be filed.
//
// The app carried two catalogues that disagreed:
//
//   • FORMS_REGISTRY (src/data/formsRegistry.ts) — the hand-written
//     documentation catalogue: 35 forms, names and sections as the ISO
//     handbook lays them out.
//   • FORM_SCHEMAS (src/schemas/unifiedSchema.ts) — the unified form
//     templates: 36 forms, but 15 of them re-named and 9 re-sectioned, and
//     the section names had drifted (section 3 was "Production & Operations"
//     for seven forms and "Quality & Audit" for one).
//
// The restored production records settle which one is real. Every record's
// form_name and section column follows the REGISTRY (F/11 is "Production
// Plan" in section 2; F/24 is "Objectives & Targets" in section 7; F/48 is
// "Internal Audit Report" in section 3), and the schema's version of those
// forms matches none of them.
//
// So: the registry is the identity source, the schema supplies the form
// templates and fills in the one form the registry used to omit (F/49, the
// Document Master List — the only form in the catalogue with no filing at
// all). This module merges them once so that the dashboard, the compliance
// radar, the audit page, the records list and the forms registry can never
// name or schedule a form differently from one another.
// ============================================================================

import { FORMS_REGISTRY, FORMS_SECTIONS } from './formsRegistry';
import { FORM_SCHEMAS } from './formSchemas';

export interface CanonicalForm {
  code: string;
  name: string;
  section: number;
  sectionName: string;
  frequency: string;
  importance: string;
}

/** The seven departments, in ISO handbook order. */
export const CANONICAL_SECTIONS = FORMS_SECTIONS.map(s => ({ id: s.id, name: s.name }));

const SECTION_NAME_BY_ID = new Map(CANONICAL_SECTIONS.map(s => [s.id, s.name]));

function buildCatalogue(): CanonicalForm[] {
  const out: CanonicalForm[] = [];
  const seen = new Set<string>();

  // 1. The registry: identity, department, cadence and importance.
  for (const entry of FORMS_REGISTRY) {
    seen.add(entry.code);
    out.push({
      code: entry.code,
      name: entry.name,
      section: entry.section,
      sectionName: SECTION_NAME_BY_ID.get(entry.section) ?? entry.sectionName,
      frequency: entry.frequency,
      importance: entry.importance,
    });
  }

  // 2. Anything the schema knows and the registry does not (F/49).
  for (const schema of FORM_SCHEMAS) {
    if (seen.has(schema.code)) continue;
    out.push({
      code: schema.code,
      name: schema.name,
      section: schema.section,
      sectionName: SECTION_NAME_BY_ID.get(schema.section) ?? schema.sectionName,
      frequency: schema.frequency,
      importance: schema.importance,
    });
  }

  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/** Every QBase form, with its canonical identity and cadence. */
export const CANONICAL_FORMS: CanonicalForm[] = buildCatalogue();

const BY_CODE = new Map(CANONICAL_FORMS.map(f => [f.code, f]));

/** The canonical entry for a form code, if the form exists. */
export function getCanonicalForm(code: string): CanonicalForm | undefined {
  return BY_CODE.get(String(code));
}

/** The canonical name for a form code; falls back to the code itself. */
export function getCanonicalFormName(code: string): string {
  return BY_CODE.get(String(code))?.name ?? String(code);
}

/** The canonical cadence for a form code; '' when the form is unknown. */
export function getCanonicalFrequency(code: string): string {
  return BY_CODE.get(String(code))?.frequency ?? '';
}

/** The canonical department name for a form code. */
export function getCanonicalSectionName(code: string): string {
  return BY_CODE.get(String(code))?.sectionName ?? '';
}

/** The canonical department name for a section number. */
export function getCanonicalSectionLabel(section: number): string {
  return SECTION_NAME_BY_ID.get(section) ?? `Section ${section}`;
}
