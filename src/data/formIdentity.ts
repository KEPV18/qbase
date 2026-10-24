// ============================================================================
// QBase — Form Identity Layer (the alias / mapping layer)
//
// WHY THIS EXISTS
// ---------------
// Three catalogues describe the same 36 forms, and they disagree about the
// NAME of sixteen of them:
//
//   1. FORMS_REGISTRY (src/data/formsRegistry.ts) — the ISO handbook
//      catalogue.  This is the identity source: the production records are
//      filed under these names and these section numbers.
//
//   2. FORM_SCHEMAS (src/schemas/unifiedSchema.ts) — the field definitions.
//      16 of its 36 `name` values belong to a DIFFERENT form: F/12 is
//      called "Purchase Requisition", F/23 "Corrective Action", F/50
//      "Record Retention Schedule".  That file was renumbered and renamed
//      and the change was never carried back into the registry.
//
//   3. The 36 document facsimiles (src/components/forms/templates/
//      F*Template.tsx) — each prints its own title on the document, which
//      is again a third spelling ("Disposal of Non-Conforming Products",
//      "Employee Training & Competence Record Sheet").
//
// Renaming the records so that they agree would be a destructive migration:
// the production copy holds 52 distinct (form_code, form_name) pairs across
// 318 rows, and a record's name is part of its history.  So NOTHING is
// renamed in the data.  No migration touches `records`; no id and no
// relationship is touched.
//
// This module is the single place that answers "what is this form called?".
// For every code it holds the catalogue name, the title the document prints,
// and every alias the form has ever been filed under — plus the reverse
// lookup that turns an old name back into its code.
//
// THE RULES
// ---------
//   * The catalogue name is the answer.  It is the name the records were
//     filed under, and the one the compliance reports group by.
//   * Every other spelling is an ALIAS.  It still resolves — a search for
//     "Goods Receipt Note" still finds F/14, a record filed under the old
//     name still reads back correctly.
//   * When two codes claim one name, the catalogue name wins; among
//     aliases the lowest code wins, so the answer is deterministic.
//     See `findFormCodeByName`.
//
// ZERO DATA LOSS
// --------------
// This module is read-only.  It holds no database handle and writes nothing.
// The stored `form_name` of every existing record is left exactly as it is;
// the layer only decides what the app DISPLAYS for a code and how an old
// name is resolved back to a code.
// ============================================================================

import { FORMS_REGISTRY, FORMS_SECTIONS } from './formsRegistry';

export interface FormIdentity {
  /** The form code: "F/12", or a legacy code such as "CAPA REGISTER". */
  code: string;
  /** The catalogue name — the one the records are filed under. */
  name: string;
  /** The title printed on the document itself.  '' when there is no facsimile. */
  documentTitle: string;
  /** Every other name this form is known by, in any catalogue. */
  aliases: string[];
  /** The department number the records are filed under. */
  section: number;
  /** The department name the records are filed under. */
  sectionName: string;
  /** How often the form must be filed. */
  frequency: string;
  /** How critical the form is. */
  importance: string;
  /** True for the codes that predate the F/xx numbering. */
  legacy: boolean;
}

// ============================================================================
// The three name tables
// ============================================================================

/**
 * The title each document facsimile prints on itself.
 *
 * Source: the `formName="…"` prop of the 36 templates under
 * src/components/forms/templates/.  src/data/__tests__/formIdentity.test.ts
 * reads those files and fails if this table drifts from them.
 */
const FORM_DOCUMENT_TITLES: Record<string, string> = {
  'F/08': 'Order Form',
  'F/09': 'Customer Complaint Report',
  'F/10': 'Customer Feedback',
  'F/11': 'Production Plan',
  'F/12': 'Disposal of Non-Conforming Products',
  'F/13': 'Purchase Order',
  'F/14': 'Indent and Incoming Inspection Record',
  'F/15': 'Approved Vendor List',
  'F/16': 'Supplier Registration',
  'F/17': 'QA Test Request',
  'F/18': 'Product Re-Call',
  'F/19': 'Product Description',
  'F/20': 'Review Agenda',
  'F/21': 'Review Minutes',
  'F/22': 'Corrective Action',
  'F/23': 'Master List of Records',
  'F/24': 'Objectives & Targets',
  'F/25': 'Audit Plan',
  'F/28': 'Training Attendance Sheet',
  'F/29': 'Employee Training & Competence Record Sheet',
  'F/30': 'Performance Appraisal',
  'F/32': 'R&D Request',
  'F/34': 'Design Verification',
  'F/35': 'Design Monitoring',
  'F/37': 'Experiment Data',
  'F/40': 'Competence Matrix',
  'F/41': 'Competence Gap Analyses Form',
  'F/42': 'Annual Training Program',
  'F/43': 'Induction Training Form',
  'F/44': 'Job Description',
  'F/45': 'Master List of Documents',
  'F/46': 'Management of Change Plan',
  'F/47': 'Internal Audit Checklist',
  'F/48': 'Internal Audit Report',
  'F/49': 'Document Master List',
  'F/50': 'Customer Property Monitoring Register',
};

/**
 * The name each form carried in the UNIFIED SCHEMA before this layer existed.
 *
 * These are the stale names: for 16 of the 36 they name a different form
 * altogether.  They are kept here — as aliases, never as the answer — so
 * that a record, a link or a saved filter that still carries one of them
 * keeps resolving to the code it was filed under.
 */
const FORM_SCHEMA_NAMES: Record<string, string> = {
  'F/08': 'Order Form',
  'F/09': 'Customer Complaint',
  'F/10': 'Customer Feedback',
  'F/11': 'Production Plan',
  'F/12': 'Purchase Requisition',
  'F/13': 'Purchase Order',
  'F/14': 'Goods Receipt Note',
  'F/15': 'Vendor Registration',
  'F/16': 'Vendor Re-evaluation',
  'F/17': 'Production Order',
  'F/18': 'Daily Production Report',
  'F/19': 'Product Description',
  'F/20': 'Review Agenda',
  'F/21': 'Review Minutes',
  'F/22': 'Non-Conformity Report',
  'F/23': 'Corrective Action',
  'F/24': 'Internal Audit Schedule',
  'F/25': 'Management Review',
  'F/28': 'Training Attendance',
  'F/29': 'Training Record',
  'F/30': 'Performance Appraisal',
  'F/32': 'R&D Request',
  'F/34': 'Design Verification',
  'F/35': 'Design Monitoring',
  'F/37': 'Experiment Data',
  'F/40': 'Competence Matrix',
  'F/41': 'Competence Gap Analyses Form',
  'F/42': 'Annual Training Program',
  'F/43': 'Induction Training',
  'F/44': 'Job Description / Responsibilities',
  'F/45': 'Exit Interview',
  'F/46': 'Employee Suggestion',
  'F/47': 'Competency Assessment',
  'F/48': 'Internal Audit Report',
  'F/49': 'Document Master List',
  'F/50': 'Record Retention Schedule',
};

/**
 * The `form_name` values the production records actually carry, per code.
 *
 * Measured on the local copy of the production database (318 records,
 * 2026-10-23).  These rows are NOT changed by this layer — the list exists
 * so that a name read out of an old record resolves back to its code, and
 * so that a search over the old spelling finds the record.
 *
 * A name that appears under two codes ("Training Record" is filed under
 * both F/28 and F/29) is a genuine ambiguity in the data; it is kept in
 * both alias lists and `findFormCodeByName` resolves it by the documented
 * tie-break.
 */
const FORM_HISTORICAL_NAMES: Record<string, string[]> = {
  'F/11': ['Monthly Production Plan'],
  'F/19': ['Product Description Form'],
  'F/20': ['Management Review Agenda'],
  'F/21': ['Management Review Minutes'],
  'F/22': ['Non-Conformity / Corrective Action'],
  'F/24': ['Quality Objectives'],
  'F/28': ['Training Attendance Sheet', 'Training Record'],
  'F/29': ['Employee Training & Competence Record Sheet', 'Training & Competence Record', 'Training Record'],
  'F/43': ['Induction Training Form'],
  'F/45': ['Master List of Docs'],
  'F/48': ['Monthly Quality Report'],
  'F/50': ['Customer Property', 'Project Plan'],
};

/**
 * The codes that predate the F/xx numbering.
 *
 * The production copy holds 6 records under them: 5 under "CAPA REGISTER"
 * and 1 under "TEST".  They are real records and they must stay editable,
 * so they are identities in their own right — NOT aliases of a catalogue
 * form, and never renamed.
 *
 * The department is the one their own rows already carry: the five live
 * "CAPA REGISTER" records are filed in section 3, "Quality & Audit" — which
 * is where a corrective and preventive action register belongs.  Without it
 * the identity held section 0, and a record created or imported under this
 * code would land in "General" while the five that are already there sit in
 * "Quality & Audit".
 */
const LEGACY_FORMS: Array<{
  code: string;
  name: string;
  aliases: string[];
  section: number;
  sectionName: string;
  frequency: string;
}> = [
  {
    code: 'CAPA REGISTER',
    name: 'Corrective and Preventive Action Register',
    aliases: [],
    section: 3,
    sectionName: 'Quality & Audit',
    frequency: 'On event',
  },
  { code: 'TEST', name: 'Test', aliases: [], section: 3, sectionName: 'Quality & Audit', frequency: 'On event' },
];

// ============================================================================
// The identity table
// ============================================================================

function buildIdentities(): FormIdentity[] {
  const out: FormIdentity[] = [];
  const departmentName = new Map(FORMS_SECTIONS.map(s => [s.id, s.name]));

  for (const entry of FORMS_REGISTRY) {
    const aliases: string[] = [];
    const push = (name: string | undefined) => {
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      if (trimmed === entry.name) return;      // the catalogue name is not an alias of itself
      if (aliases.includes(trimmed)) return;
      aliases.push(trimmed);
    };

    push(FORM_SCHEMA_NAMES[entry.code]);
    push(FORM_DOCUMENT_TITLES[entry.code]);
    for (const historic of FORM_HISTORICAL_NAMES[entry.code] ?? []) push(historic);

    out.push({
      code: entry.code,
      name: entry.name,
      documentTitle: FORM_DOCUMENT_TITLES[entry.code] ?? '',
      aliases,
      section: entry.section,
      sectionName: departmentName.get(entry.section) ?? entry.sectionName,
      frequency: entry.frequency,
      importance: entry.importance,
      legacy: false,
    });
  }

  for (const legacy of LEGACY_FORMS) {
    out.push({
      code: legacy.code,
      name: legacy.name,
      documentTitle: '',
      aliases: legacy.aliases.filter(a => a !== legacy.name),
      section: legacy.section,
      sectionName: legacy.sectionName,
      frequency: legacy.frequency,
      importance: 'Medium',
      legacy: true,
    });
  }

  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/** Every form this app knows about — the 36 catalogue forms plus the legacy codes. */
export const FORM_IDENTITIES: readonly FormIdentity[] = buildIdentities();

const BY_CODE = new Map(FORM_IDENTITIES.map(f => [f.code, f]));

// ============================================================================
// Normalisation — the one way two spellings are compared
// ============================================================================

/**
 * Reduce a name to its comparable form.
 *
 * The rules, and why each one is there:
 *
 *   * case is ignored              — "purchase order" == "Purchase Order"
 *   * "&" reads as "and"           — "Objectives & Targets" ==
 *                                    "Objectives and Targets"
 *   * punctuation and spaces go    — "Indent and Incoming Inspection Record"
 *                                    == "Indent & Incoming Inspection Record"
 *   * a leading form code is go   — "F/12 Purchase Requisition" ==
 *                                    "Purchase Requisition"
 *
 * The result is only ever used for COMPARISON, never for display: the app
 * still shows the name exactly as it was written.
 */
export function normalizeFormName(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^f\s*[/-]?\s*\d{1,2}\b[\s.\-:/]*/, '')
    .replace(/[^a-z0-9]+/g, '');
}

// ============================================================================
// Lookup — forward
// ============================================================================

/** The identity of a form code, or undefined when the code is unknown. */
export function getFormIdentity(code: string): FormIdentity | undefined {
  return BY_CODE.get(String(code).trim());
}

/** Is this a code the app knows about? */
export function isKnownFormCode(code: string): boolean {
  return BY_CODE.has(String(code).trim());
}

/**
 * The catalogue name of a form code.
 *
 * For a known code this is the name the records are filed under.  For an
 * unknown code (a legacy code the catalogue does not carry, or a typo) it
 * falls back to the code itself, so the UI always has something to show
 * and never has to guard against an empty label.
 */
export function resolveFormName(code: string): string {
  const key = String(code ?? '').trim();
  return BY_CODE.get(key)?.name ?? key;
}

/** The title the document itself prints; '' when there is no facsimile. */
export function resolveDocumentTitle(code: string): string {
  return BY_CODE.get(String(code ?? '').trim())?.documentTitle ?? '';
}

/** The department number a form belongs to; 0 when the code is unknown. */
export function resolveFormSection(code: string): number {
  return BY_CODE.get(String(code ?? '').trim())?.section ?? 0;
}

/** The department name a form belongs to; '' when the code is unknown. */
export function resolveFormSectionName(code: string): string {
  return BY_CODE.get(String(code ?? '').trim())?.sectionName ?? '';
}

/** How often a form must be filed; '' when the code is unknown. */
export function resolveFormFrequency(code: string): string {
  return BY_CODE.get(String(code ?? '').trim())?.frequency ?? '';
}

/** Every alias of a form code (never includes the catalogue name). */
export function resolveFormAliases(code: string): string[] {
  const identity = BY_CODE.get(String(code ?? '').trim());
  return identity ? [...identity.aliases] : [];
}

/**
 * The label to show for a form: the catalogue name.
 *
 * The document's own title is a separate answer (`resolveDocumentTitle`) —
 * a caller that needs to print the document's title asks for it, and every
 * other surface shows the one name the records are filed under.
 */
export function resolveFormLabel(code: string): string {
  return resolveFormName(code);
}

// ============================================================================
// Lookup — reverse (a name back to its code)
// ============================================================================

/**
 * Every code a name could refer to.
 *
 * Order matters and is part of the contract:
 *   1. a code whose CATALOGUE name is the name — the name the records were
 *      filed under always wins;
 *   2. then the codes whose alias list holds it.
 */
export function findFormCodesByName(name: string): string[] {
  const needle = normalizeFormName(name);
  if (!needle) return [];

  const exact: string[] = [];
  const viaAlias: string[] = [];

  for (const identity of FORM_IDENTITIES) {
    if (normalizeFormName(identity.name) === needle) {
      exact.push(identity.code);
      continue;
    }
    if (identity.aliases.some(alias => normalizeFormName(alias) === needle)) {
      viaAlias.push(identity.code);
    }
  }

  return [...exact, ...viaAlias];
}

/**
 * The code a name refers to, or undefined when the name is unknown.
 *
 * The tie-break when several codes claim one name: the catalogue name wins
 * (rule 1 above); among aliases, the lowest code wins, so the answer is
 * deterministic and never depends on object iteration order.
 */
export function findFormCodeByName(name: string): string | undefined {
  return findFormCodesByName(name)[0];
}

/**
 * Is this name one the app knows at all?
 *
 * Used by the import path to tell a name it can map to a code from a name
 * it must carry through untouched.
 */
export function isKnownFormName(name: string): boolean {
  return findFormCodesByName(name).length > 0;
}
