// ============================================================================
// QBase — Pre-Write Validation Layer
// NO write operation without validation. This is the gatekeeper.
// Even if the UI passed validation, this layer re-validates before writing.
// ============================================================================
import { log } from "@/services/logger";

import { FORM_SCHEMAS, FORM_ZOD_SCHEMAS, FORM_ZOD_SCHEMAS_LENIENT } from '@/schemas/unifiedSchema';
import { validateFormData } from '@/schemas/formValidation';
import { z } from 'zod';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: 'required' | 'format' | 'enum' | 'range' | 'type' | 'custom';
}

export interface PreWriteResult {
  valid: boolean;
  errors: ValidationError[];
  sanitizedData: RecordData | null;
}

// ============================================================================
// Validation Log — for debugging rejected writes
// ============================================================================

const VALIDATION_LOG: Array<{
  timestamp: string;
  formCode: string;
  serial?: string;
  operation: 'create' | 'update';
  errors: ValidationError[];
  rawPayload: RecordData;
}> = [];

/**
 * The window is 200 entries.
 *
 * It was 1000, and every entry holds the RAW PAYLOAD of the write — so the
 * log was a place where form content sat in a module-level global, in every
 * tab, for the life of the session.
 */
const MAX_VALIDATION_LOG = 200;

/**
 * Is the rejected-write log on?
 *
 * It is off in a production build unless it is asked for, and on in a
 * development build.  `setValidationLogEnabled(true)` turns it on for a
 * support session; turning it off drops what it holds, so the form content
 * does not stay in the tab after the session that wanted it.
 */
let validationLogEnabled =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

/** Turn the rejected-write log on or off. */
export function setValidationLogEnabled(enabled: boolean): void {
  validationLogEnabled = enabled;
  if (!enabled) VALIDATION_LOG.length = 0;
}

/** Is the rejected-write log on? */
export function isValidationLogEnabled(): boolean {
  return validationLogEnabled;
}

function pushValidationLog(entry: typeof VALIDATION_LOG[0]) {
  // Off means off: the payload is not retained, so the form content never
  // sits in the global.
  if (!validationLogEnabled) return;
  VALIDATION_LOG.push(entry);
  if (VALIDATION_LOG.length > MAX_VALIDATION_LOG) {
    VALIDATION_LOG.splice(0, VALIDATION_LOG.length - MAX_VALIDATION_LOG);
  }
}

export function getValidationLog(): typeof VALIDATION_LOG {
  return [...VALIDATION_LOG];
}

// ============================================================================
// Date helpers
// ============================================================================

/**
 * Is this a real date on the calendar?
 *
 * The day and the month are checked against the calendar, not only
 * against a pattern: "2026-13-45" and "2026-02-30" both match a date
 * SHAPE and neither is a date.
 */
function isCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Is this string a real date, in either accepted format?
 *
 * `YYYY-MM-DD` and `DD/MM/YYYY` are the two shapes the app writes.  A
 * value that matches the shape but is not a date on the calendar is
 * refused, rather than stored as a date that means nothing.
 */
function isRealDateValue(value: string): boolean {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return isCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (display) return isCalendarDate(Number(display[3]), Number(display[2]), Number(display[1]));

  return false;
}

/**
 * Does this key say that it holds a date?
 *
 * The key IS `date`, STARTS with `date_`, or ENDS with `_date`.  The
 * underscore matters: the old rule was "the key CONTAINS the word 'date'",
 * which is true for `updated_based_on_progress` (upDATEd) — a plain text
 * field on F/11 — and would have refused every F/11 save.
 */
function isDateKey(key: string): boolean {
  return key === 'date' || key.startsWith('date_') || key.endsWith('_date');
}

/**
 * The (form, key) pairs that hold FREE TEXT instead of a date.
 *
 * Measured on the local production copy (318 live records): these ten
 * pairs carry values like "Continuous Delivery", "April 2026", "01/2026",
 * "Not Recorded", "N/A (Platform Based Delivery)", "21/06/2026 - 04/07/2026"
 * and — in F/43 — a serial number ("F/43-002") in the `date` field.  49
 * records are affected.
 *
 * A checker that refuses them would be refusing REAL data, so they are
 * listed here and left alone.  Every other date key must hold a real date.
 */
const FREE_TEXT_DATE_FIELDS = new Set([
  'F/08.despatch_date',
  'F/12.date',
  'F/16.registration_date',
  'F/17.challan_no_date',
  'F/25.last_audit_plan_date',
  'F/28.training_date',
  'F/29.training_date',
  'F/43.date',
  'F/48.followup_date',
  'F/48.follow_up_date',
]);

/**
 * Is this value "empty" — absent, blank, or an empty list?
 *
 * Used to tell "the user cleared a required value" (an error) from "the
 * value was never there" (not an error this edit introduced).
 */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// ============================================================================
// History-aware re-validation
// ============================================================================

/**
 * Does the catalogue accept this value for this field, on its own?
 *
 * The probe carries the single field and nothing else, so a failure can
 * only be about that field.  The LENIENT schema is used on purpose: it
 * checks the TYPE of a value without insisting that the form's other
 * required fields are present.
 */
function fieldAcceptsValue(formCode: string, key: string, value: unknown): boolean {
  const schema = FORM_ZOD_SCHEMAS_LENIENT[formCode];
  if (!schema) return false;
  const result = schema.safeParse({ [key]: value });
  if (result.success) return true;
  // The probe failed on some OTHER field?  It cannot — the object holds
  // one key — but a field whose path is deeper (a table cell) reports the
  // cell path, so accept the failure only when it is about this key.
  return !result.error.issues.some(issue => {
    const path = issue.path.map(String);
    return path[0] === key || path.length === 0;
  });
}

/**
 * Was this violation already there before the edit?
 *
 * A field fails the schema now.  The question that decides whether the
 * edit may go through is not "is the payload valid?" but "did the edit
 * break this, or was it already broken?".
 *
 *   * the stored record does not carry the field → the edit introduced it;
 *   * the stored value is of a different type than the payload's → the
 *     type was already wrong (an object where the catalogue says text);
 *   * the stored value is off-schema too → the catalogue never accepted
 *     this value, so refusing it now refuses the record as it was.
 */
function violationPredatesEdit(formCode: string, key: string, payload: RecordData, stored: RecordData): boolean {
  if (!(key in stored)) return false;
  if (!(key in payload)) return false;
  const storedValue = stored[key];
  const payloadValue = payload[key];
  if (storedValue === null || payloadValue === null) {
    if (storedValue === payloadValue) return true;
    return false;
  }
  if (typeof storedValue !== typeof payloadValue) return true;
  if (Array.isArray(storedValue) !== Array.isArray(payloadValue)) return true;
  return !fieldAcceptsValue(formCode, key, storedValue);
}

/**
 * Validate the payload again, carrying through the fields whose violation
 * the edit did not introduce.
 *
 * The failing fields are taken out of the probe, the rest is validated
 * normally, and the fields are put back afterwards — with the value the
 * PAYLOAD carried, not the value the schema wanted.  Nothing is dropped
 * and nothing is rewritten: the record leaves the gate exactly as it
 * entered it, apart from the metadata the gate is there to manage.
 *
 * Returns null when the payload is genuinely invalid — when a failure
 * survives that the edit did introduce it.
 */
function revalidateAgainstHistory(
  formCode: string,
  payload: RecordData,
  stored: RecordData,
): { data: RecordData; tolerated: string[] } | null {
  const schema = FORM_ZOD_SCHEMAS_LENIENT[formCode];
  if (!schema) return null;

  const probe: Record<string, unknown> = { ...payload };
  const carried = new Map<string, unknown>();

  // A handful of rounds is plenty — one round per failing field, and a
  // record has a few dozen fields at most.
  for (let round = 0; round < 25; round++) {
    const result = schema.safeParse(probe);
    if (result.success) {
      const out: RecordData = { ...(result.data as RecordData) };
      for (const [key, value] of carried) out[key] = value as RecordData[string];
      return { data: out, tolerated: [...carried.keys()] };
    }

    const failing = new Set<string>();
    for (const issue of result.error.issues) {
      const root = String(issue.path[0] ?? '');
      if (root) failing.add(root);
    }

    const removable = [...failing].filter(key => violationPredatesEdit(formCode, key, payload, stored));
    if (!removable.length) return null;

    for (const key of removable) {
      carried.set(key, probe[key]);
      delete probe[key];
    }
  }

  return null;
}

// ============================================================================
// Pre-Write Validation — the gatekeeper
// ============================================================================

/**
 * Validate data against its Zod schema BEFORE any write operation.
 * This runs REGARDLESS of whether the UI already validated — defense in depth.
 *
 * @param formCode - e.g. "F/12"
 * @param data - the record data to validate
 * @param operation - 'create' or 'update'
 * @param serial - for updates, the existing serial
 * @param actorEmail - the authenticated actor, used to attribute a new record
 * @param existingData - for updates, the STORED record.  A required field
 *   that the stored record does not carry is not an error this edit
 *   introduced, so it must not block the save.
 * @returns PreWriteResult with validity, errors, and sanitized data
 */
export function preWriteValidation(
  formCode: string,
  data: RecordData,
  operation: 'create' | 'update',
  serial?: string,
  actorEmail?: string,
  existingData?: RecordData | null
): PreWriteResult {
  const errors: ValidationError[] = [];

  // 1. Extract metadata keys before Zod validation (Zod strips unknown keys)
  // Zod form schemas only define form fields — metadata keys would be lost after safeParse
  const METADATA_KEYS = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
    '_creationReason', '_businessEvent',
    // The project link and the scope.  Neither is declared in the Zod form
    // schemas, so `safeParse` stripped them — and the record lost its
    // project on its first edit, because `update_record_versioned` replaces
    // form_data wholesale with the validated business fields.  The project
    // id is lifted from form_data into the `records.project_id` column by
    // the `records_sync_project` trigger (migration 14).
    'project_id', 'scope',
  ]);
  const savedMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key)) {
      savedMetadata[key] = value;
    }
  }

  // 1b. The payload is carried through EXACTLY as it was written.
  //
  // This used to rewrite every DD/MM/YYYY value into YYYY-MM-DD before
  // validation.  The Zod result is what the server writes back
  // (`update_record_versioned` replaces `form_data` wholesale), so a
  // no-op save rewrote the dates of 252 of the 316 live records — a
  // MODIFICATION of existing records, which the "Zero Data Loss" rule
  // forbids.
  //
  // The rewrite bought nothing:
  //
  //   * no field in the catalogue has `type: "date"` — the Zod
  //     `case "date"` branch has never run, and it asked for DD/MM/YYYY
  //     anyway, so the two halves of that code contradicted each other;
  //   * every consumer reads both shapes already:
  //     `temporalUtils.resolveSlashDate`, `dateToMonthLabel`,
  //     `getRecordMonth` and `resolveCoveragePeriod` all accept
  //     DD/MM/YYYY, and `compliance.ts` derives its dates from the
  //     record's `_createdAt` and from generated ISO due dates.
  //
  // The date FORMAT check (3b) still applies, and `isRealDateValue`
  // accepts both shapes, so "31/13/2026" is still refused.
  const payloadData: RecordData = { ...data };

  // 1c. A form code with NO schema — a record from before the F/xx
  // catalogue — is accepted AS IT IS.
  //
  // The production copy holds six such records: five under "CAPA REGISTER"
  // and one under "TEST".  They are real records, and the old code refused
  // them outright ("No Zod schema found for form X. Cannot validate data."),
  // which made every one of them impossible to open, edit or save.
  //
  // There is no schema for them, so there is nothing to validate against
  // and no field rule worth guessing: the payload is carried through
  // unchanged, with every key it arrived with.  Only the rules that do not
  // depend on the shape of the form are applied — an update must name the
  // record it updates, and a create must be attributed to its author.
  //
  // Two checks are deliberately NOT applied here:
  //
  //   * the serial FORMAT check — a legacy record's serial is its own
  //     ("CAPA-25-001", "TEST-999"), and the F/XX-NNN pattern is a rule
  //     about the catalogue's numbering, not about these records;
  //   * the date FORMAT check — the shape of a record with no schema is
  //     unknown, so a value sitting in a date-shaped key is not necessarily
  //     a date, and refusing it would refuse a real record.
  if (!(formCode in FORM_ZOD_SCHEMAS)) {
    const permissiveData: RecordData = { ...payloadData };
    for (const [key, value] of Object.entries(savedMetadata)) {
      if (!(key in permissiveData)) permissiveData[key] = value as RecordData[string];
    }
    if (operation === 'create') {
      if (!permissiveData._createdAt) permissiveData._createdAt = new Date().toISOString();
      if (!permissiveData._createdBy) permissiveData._createdBy = actorEmail || '';
    }
    if (operation === 'update' && !serial) {
      errors.push({
        field: 'serial',
        message: 'Update operation requires a serial number.',
        code: 'required',
      });
    }
    if (errors.length > 0) {
      pushValidationLog({
        timestamp: new Date().toISOString(),
        formCode,
        serial,
        operation,
        errors,
        rawPayload: data,
      });
      return { valid: false, errors, sanitizedData: null };
    }
    log.validation.passed(formCode, serial);
    return { valid: true, errors: [], sanitizedData: permissiveData };
  }

  // 2. Run Zod validation via the same function the UI uses
  //
  // An UPDATE is validated against the LENIENT schema, a CREATE against the
  // strict one.  The lenient schema checks the TYPE of every value but lets
  // a required field be absent or empty — because the production records
  // predate the catalogue's `required` flag (130 record/field pairs across
  // 25 forms), and the strict schema made every one of those records
  // un-saveable.  The "must not be empty" rule is applied further down,
  // where the STORED record is known.
  const zodResult = validateFormData(formCode, payloadData, { lenient: operation === 'update' });

  // 2a. A violation the EDIT did not introduce is not an error.
  //
  // Measured on the local copy of the production database: 36 of the 316
  // records fail the lenient schema — 20 F/29 records whose
  // `training_status` is an object where the catalogue says text, 10 F/48
  // records whose `audit_type` is a value the catalogue's option list
  // never had, and a handful more.  Those records were saved by the people
  // who made them; refusing to save them again is refusing to correct
  // them, which is the opposite of what the audit trail is for.
  //
  // The rule: a failing field whose STORED value is itself off-schema (or
  // is of a different type than the payload's) was already wrong before
  // this edit.  The payload is re-validated with that field carried
  // through untouched, and the stored value is put back afterwards, so the
  // field survives the save exactly as it was.
  let toleratedFields: string[] = [];
  let zodData: RecordData | null = null;
  if (zodResult.valid) {
    zodData = zodResult.sanitizedData as RecordData;
  } else if (operation === 'update' && existingData) {
    const relaxed = revalidateAgainstHistory(formCode, payloadData, existingData);
    if (relaxed) {
      zodData = relaxed.data;
      toleratedFields = relaxed.tolerated;
      // The fields that were already wrong before this edit are carried
      // through untouched.  They are named in the log so the audit trail
      // shows that the gate let a legacy value through on purpose.
      if (toleratedFields.length > 0) {
        log.system.warn('preWriteValidation:legacy_field_carried', JSON.stringify({
          formCode, serial, fields: toleratedFields,
        }));
      }
    }
  }

  if (!zodData) {
    // validateFormData already returns { field, message, code }; it reports every
    // Zod failure as 'custom', so derive the more specific code from the message.
    for (const zodError of zodResult.errors) {
      const field = String(zodError.field ?? '');
      let message = String(zodError.message ?? '');
      const lower = message.toLowerCase();

      let code: ValidationError['code'] = 'custom';
      if (lower.includes('required') || lower.includes('cannot be empty')) {
        code = 'required';
      } else if (lower.includes('format') || lower.includes('invalid date') || lower.includes('dd/mm/yyyy')) {
        code = 'format';
      } else if (lower.includes('must be one of') || lower.includes('enum')) {
        code = 'enum';
      } else if (lower.includes('must be') || lower.includes('minimum') || lower.includes('maximum')) {
        code = 'range';
      } else if (lower.includes('must be a') || lower.includes('expected')) {
        code = 'type';
      }

      // The root key of the failing field, and whether the payload carries
      // it at all.
      const rootKey = field.split('.')[0];
      const keyAbsent = !!rootKey && !(rootKey in payloadData);

      if (keyAbsent) {
        // A key the payload does not carry is not something this edit
        // introduced.  On a create it is a missing required field, and it
        // is reported as that — "date is required" — instead of the Zod
        // type error "expected string, received undefined", which named
        // the wrong problem.
        if (operation === 'update') continue;
        code = 'required';
        message = `${field} is required`;
      }

      errors.push({ field, message, code });
    }

    const result: PreWriteResult = { valid: false, errors, sanitizedData: null };
    pushValidationLog({
      timestamp: new Date().toISOString(),
      formCode,
      serial,
      operation,
      errors,
      rawPayload: data,
    });
    return result;
  }

  // 3. Additional pre-write checks beyond Zod
  // `zodData` is the validated payload — the Zod result, or the relaxed
  // result when every failure was a violation the edit did not introduce.
  const validatedData = zodData as RecordData;

  // 3a. Re-merge metadata that Zod stripped during safeParse
  // Zod form schemas only validate form fields — metadata keys are stripped from result.data
  // We must restore them so serializeRecordToRow can write them to the correct columns
  for (const [key, value] of Object.entries(savedMetadata)) {
    if (!(key in validatedData)) {
      validatedData[key] = value as RecordData[string];
    }
  }

  // 3a-bis. The "required" rule, applied with the STORED record in hand.
  //
  // On an update the lenient schema lets a required field be empty; this is
  // where that rule is applied — and only where it is fair:
  //
  //  * the payload does not carry the field at all → this edit did not
  //    touch it, so it cannot be a mistake the edit introduced;
  //  * the payload carries it, empty, and the STORED record had a value →
  //    the user has just cleared a required value, and that must be
  //    refused;
  //  * the payload carries it, empty, and the STORED record had no value
  //    either → nothing was cleared, the field was never filled in, and
  //    the edit must not be blocked.
  //
  // All 69 stored F/43 records lack the `inductee_signature` the schema
  // requires (the document stores it as `inductee_sign`), and 20 F/29
  // records have no `date`: under the strict schema every one of them was
  // un-saveable, and the user could not even correct the field, because
  // the key the form renders is not the key the schema wants.
  if (operation === 'update') {
    const formSchema = FORM_SCHEMAS.find(s => s.code === formCode);
    for (const field of formSchema?.fields ?? []) {
      if (!field.required) continue;
      // A field the payload does not carry at all: this edit did not touch
      // it, so it cannot be a mistake the edit introduced.
      if (!(field.key in payloadData)) continue;
      if (!isEmptyValue(validatedData[field.key])) continue;
      // The STORED record had no value either → nothing was cleared, the
      // field was never filled in.
      if (existingData && isEmptyValue(existingData[field.key])) continue;
      errors.push({
        field: field.key,
        message: `${field.label || field.key} is required`,
        code: 'required',
      });
    }
  }

  // 3b. Serial format check — only for real serials (not 'auto' placeholder)
  //
  // The pattern is a rule about the CATALOGUE's numbering, so it is applied
  // to a serial this edit INTRODUCES.  A serial the record already carries
  // is left alone: the production copy holds 17 F/44 rows whose serial is
  // "F/99-<a person's name>" and 8 F/19 rows whose `form_data.serial` is a
  // legacy sentence — none of them can ever match F/XX-NNN, and refusing
  // them made those records impossible to open, edit or save.  The people
  // who entered them are not going to renumber 25 historical records to
  // satisfy a format rule that arrived after the fact.
  //
  // On an UPDATE the serial cannot change at all — `updateRecord` always
  // takes the serial from the stored row — so the check bites on the
  // CREATE path, where the serial really is the user's own.
  const serialValue = String(validatedData.serial ?? '');
  if (serialValue && serialValue !== 'auto') {
    const serialPattern = /^F\/\d{1,2}-\d{3,4}$/;
    if (!serialPattern.test(serialValue)) {
      // Is this serial the one the record ALREADY has?
      const carriedByRecord = existingData !== undefined && existingData !== null
        && String(existingData.serial ?? '') === serialValue;
      const carriedByTarget = serial !== undefined && serial === serialValue;
      if (!carriedByRecord && !carriedByTarget) {
        errors.push({
          field: 'serial',
          message: `Invalid serial format: "${serialValue}". Expected F/XX-NNN format.`,
          code: 'format',
        });
      }
    }
  }

  // 3b. Date format check — a field that says it holds a date must hold a
  // real date.
  //
  // The KEY is the signal, with the rule the data supports: a key is a date
  // when it IS `date`, STARTS with `date_`, or ENDS with `_date`.  The old
  // rule was "the key CONTAINS 'date'", which matched
  // `updated_based_on_progress` (upDATEd) — a plain text field on F/11 —
  // and made every F/11 save fail with "Invalid date format".
  //
  // The ten (form, key) pairs that hold FREE TEXT in the production data
  // are exempt (see FREE_TEXT_DATE_FIELDS): refusing them would be
  // refusing real records, not catching a mistake.  Every other date key
  // must hold a real calendar date, so "31/13/2026" and "2026-02-30" are
  // still refused.
  for (const [key, value] of Object.entries(validatedData)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!isDateKey(key)) continue;
    if (FREE_TEXT_DATE_FIELDS.has(`${formCode}.${key}`)) continue;
    if (!isRealDateValue(trimmed)) {
      errors.push({
        field: key,
        message: `Invalid date format: "${trimmed}". Expected DD/MM/YYYY or YYYY-MM-DD.`,
        code: 'format',
      });
    }
  }

  // 3c. Metadata checks for updates
  if (operation === 'update') {
    if (!serial) {
      errors.push({
        field: 'serial',
        message: 'Update operation requires a serial number.',
        code: 'required',
      });
    }
  }

  // 3d. For creates, auto-fill metadata if missing.
  // The creator is the authenticated actor the caller passes in. This used to be a
  // hardcoded personal address, which attributed every created record in the audit
  // trail to one person no matter who actually created it.
  if (operation === 'create') {
    if (!validatedData._createdAt) {
      validatedData._createdAt = new Date().toISOString();
    }
    if (!validatedData._createdBy) {
      validatedData._createdBy = actorEmail || '';
    }
  }

  // 3e. Field-level completeness assertion — catches stale-zero/empty-on-submit pattern
  // This prevents the "empty radio / missing comment" bug where external PATCH
  // scripts wrote data but React state hadn't initialized from it.
  const schema = FORM_ZOD_SCHEMAS[formCode];
  if (schema && operation === 'update') {
    // Check for suspiciously empty rating/checkbox fields that should have data
    const checkboxFields = Object.keys(validatedData).filter(k =>
      k.startsWith('rating_') || k.includes('_confirmation') || k === 'complaint_nature'
    );
    for (const field of checkboxFields) {
      const val = String(validatedData[field] ?? '');
      if (!val) {
        // Don't block — just warn. The actual data might genuinely be empty.
        // But log it so we can detect patterns.
        log.validation.rejected(formCode || '', [field], serial);
      }
    }
  }

  if (errors.length > 0) {
    const result: PreWriteResult = { valid: false, errors, sanitizedData: null };
    pushValidationLog({
      timestamp: new Date().toISOString(),
      formCode,
      serial,
      operation,
      errors,
      rawPayload: data,
    });
    return result;
  }

  return { valid: true, errors: [], sanitizedData: validatedData };
}


