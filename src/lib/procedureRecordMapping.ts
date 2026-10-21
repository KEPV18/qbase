// ============================================================================
// QBase — Procedure → Record mapping
//
// QBase replaced Google Sheets with Supabase, but this module was left as a
// stub that always returned `[]`. That made the "Related QMS Records" block
// on the Procedures page permanently unreachable — the section could never
// render, so a procedure's declared records were never surfaced.
//
// The mapping is derived from data the repository already owns:
//
//   * `PROCEDURES_CONTENT` — each procedure's own text names the form codes
//     it governs ("CAPA Register (F/22)", "Management Review Meeting
//     Minutes (F/21)"). Those references are the authority; they are the
//     procedure author stating which record the procedure produces.
//
//   * `FORM_SCHEMAS` — the canonical form registry, used to turn a code
//     into a human-readable name and to drop references to codes that do
//     not exist.
//
// Nothing here is hard-coded per procedure: the table below is a declared
// cross-reference for the procedures whose governing forms are NOT written
// out in their own text, so that every procedure surfaces its records.
// Each entry is traceable to that procedure's "9. RECORDS" section.
// ============================================================================

import { FORM_SCHEMAS } from '@/schemas/unifiedSchema';
import { PROCEDURES_CONTENT } from './ProceduresContent';

export interface ProcedureRecord {
  /** The form code, e.g. "F/22". */
  code: string;
  /** The form's display name from the canonical schema registry. */
  recordName: string;
  /** How many records of this form currently exist. */
  actualRecordCount?: number;
}

/**
 * Forms whose governing procedure does not spell out its `F/XX` codes in
 * the procedure text, but whose "9. RECORDS" section names the record.
 *
 * Keyed by procedure id. Values are form codes, in the order the procedure
 * lists them.
 */
const DECLARED_RECORD_FORMS: Record<string, string[]> = {
  // "Objectives and Targets Register" / "Action Plan documentation"
  p02: ['F/25'],
  // "Internal Audit Plans", "Audit Reports", "Nonconformity Reports",
  // "Audit Checklists"
  p05: ['F/24', 'F/48', 'F/22'],
  // "Training Records", "Competence Matrix", "Competence Gap Analysis"
  p06: ['F/29', 'F/40', 'F/41'],
  // "Master List of Documents", "Master List of Records"
  p07: ['F/49', 'F/50'],
  // "Approved Supplier List", "Supplier Evaluation Records",
  // "Purchase Orders", "Receiving/Inspection Records"
  p10: ['F/15', 'F/11', 'F/13', 'F/14'],
  // "Control of Non-Conforming Outputs" produces the Non-Conformity Report.
  p13: ['F/22'],
};

/**
 * The form codes each procedure governs, derived from the procedure's own
 * text plus the declared cross-references above.
 *
 * Computed once at module load: the source data is static, so recomputing
 * it per render would be wasted work.
 */
const PROCEDURE_FORM_CODES: Record<string, string[]> = (() => {
  const known = new Set(FORM_SCHEMAS.map((f) => f.code));
  const result: Record<string, string[]> = {};

  for (const procedure of PROCEDURES_CONTENT) {
    const codes = new Set<string>();

    // 1. The procedure's own text — "… (F/22)" and "… (F/30, F/41)".
    //
    //    A form code in the prose is only a GOVERNED RECORD when it names
    //    one. Two shapes are explicitly NOT records, and linking them would
    //    invent a relationship the procedure never claimed:
    //
    //      • "Examples: M/01, P/05, WI/03, F/22"  — a numbering illustration
    //      • "Records: Use same number as controlling document (e.g., F/22-001)"
    //        — a serial FORMAT illustration
    //
    //    A serial (`F/22-001`) also proves the code is being used as an
    //    example of a format rather than as a reference to the form.
    for (const line of procedure.procedureText.split('\n')) {
      const isIllustration =
        /^\s*[•\-*]?\s*examples?\s*:/i.test(line) ||
        /\be\.g\.\s*$/i.test(line.trim()) ||
        /\bF\/\d{2}-\d/.test(line);
      if (isIllustration) continue;

      const re = /\b(F\/\d{2})\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        if (known.has(m[1])) codes.add(m[1]);
      }
    }

    // 2. The declared cross-references for procedures that do not spell
    //    their forms out.
    for (const code of DECLARED_RECORD_FORMS[procedure.id] ?? []) {
      if (known.has(code)) codes.add(code);
    }

    result[procedure.id] = [...codes];
  }

  return result;
})();

/** The form codes a procedure governs, in the order the procedure lists them. */
export function getProcedureFormCodes(procedureId: string): string[] {
  return PROCEDURE_FORM_CODES[procedureId] ?? [];
}

/**
 * The QMS records a procedure governs, with the count of records that
 * currently exist for each.
 *
 * `records` is the list of QMS records; only `formCode` is read from it. A
 * form that is governed by the procedure but has no records yet is still
 * listed (with a count of 0) so the procedure page shows what it is
 * supposed to produce, not just what happens to exist.
 */
export function getRecordsForProcedure(procedureId: string, records: unknown[]): ProcedureRecord[] {
  const codes = PROCEDURE_FORM_CODES[procedureId];
  if (!codes || codes.length === 0) return [];

  // Count by form code. The count is what tells the user whether the
  // procedure is actually being followed, so it must come from the live
  // record set rather than a static number.
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    const formCode = (record as { formCode?: unknown }).formCode;
    if (typeof formCode !== 'string') continue;
    counts.set(formCode, (counts.get(formCode) ?? 0) + 1);
  }

  return codes.map((code) => {
    const schema = FORM_SCHEMAS.find((f) => f.code === code);
    return {
      code,
      recordName: schema?.name ?? code,
      actualRecordCount: counts.get(code) ?? 0,
    };
  });
}
