// =============================================================================
// QBase — Data Import Service
// Validates batch imports against Zod schemas before insertion.
// Supports JSON (array of records) and structured CSV formats.
// =============================================================================

import { getFormSchema } from "@/data/formSchemas";
import {
  findFormCodeByName,
  isKnownFormCode,
  resolveFormFrequency,
  resolveFormName,
  resolveFormSection,
  resolveFormSectionName,
} from "@/data/formIdentity";
import { validateFormData } from "@/schemas/formValidation";
import {
  getCurrentUserSnapshot,
  resolveApprovalStatus,
  resolveDepartment,
} from "@/services/recordStorage";
import {
  bulkCreateRecords,
  byteSizeOf,
  chunkRows,
  BULK_BATCH_BYTES,
  BULK_BATCH_SIZE,
  type BulkRow,
} from "@/services/bulkRecordOps";
import { toast } from "sonner";

export interface ImportOptions {
  skipInvalidRows?: boolean;   // default true
  dryRun?: boolean;            // validate only, don't insert
  onProgress?: (processed: number, total: number) => void;
}

/**
 * A row as it appears in an import file. `form_type` is the import-file header
 * name (also accepted as `formType`); it is the form code — e.g. "F/08" — and is
 * mapped to the `form_code` column at write time.
 */
export interface ImportRow {
  serial?: string;
  form_type: string;
  form_data: Record<string, unknown>;
  revision_no?: string;
  status?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  /**
   * The rows that were NOT written because a live record already carries
   * their serial.  They are not failures — nothing went wrong — and they
   * are not imports either, because the register still holds the record
   * that was already there.  They are counted on their own so the numbers
   * on the result panel add up.
   */
  skipped: number;
  /** The skipped rows, so the operator can see WHICH ones were not taken. */
  skippedRows: { row: number; serial: string; reason: string }[];
  errors: { row: number; serial: string; error: string }[];
  /**
   * The rows that were written even though the catalogue does not quite
   * describe them.
   *
   * A value the current schema does not accept — a historical enumeration
   * that was retired, a number that is stored as text — is NOT an error:
   * the register's own records are full of them, and refusing them would
   * mean losing a record the people who made it can still read.  The row
   * is written as it is, and it is named here so nobody is surprised.
   */
  warnings: { row: number; serial: string; message: string }[];
}

/* -------------------------------------------------------------------------- */
// JSON Import
/* -------------------------------------------------------------------------- */

export async function importFromJson(
  jsonText: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  let rows: unknown[];
  try {
    const parsed = JSON.parse(jsonText);
    rows = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("Invalid JSON: unable to parse file content");
  }
  return processRows(rows.map(normalizeRow), options);
}

/* -------------------------------------------------------------------------- */
// CSV Import (simple parser for flat CSV with headers)
/* -------------------------------------------------------------------------- */

export async function importFromCsv(
  csvText: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");

  const headers = parseCsvLine(lines[0]);
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ""; });

    // Map flat CSV keys to nested form_data
    const formType = (obj.form_type || obj.formType || "") as string;
    const serial = (obj.serial || obj.Serial || "") as string;
    const formData: Record<string, unknown> = {};

    // All keys except metadata go into form_data
    Object.keys(obj).forEach((k) => {
      if (!["serial", "form_type", "formType", "revision_no", "revisionNo", "status", "created_at", "updated_at"].includes(k)) {
        formData[k] = obj[k];
      }
    });

    // Try to parse JSON strings in form_data (for arrays/objects)
    Object.keys(formData).forEach((k) => {
      const v = formData[k];
      if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
        try { formData[k] = JSON.parse(v); } catch { /* leave as string */ }
      }
    });

    rows.push({ serial, form_type: formType, form_data: formData });
  }

  return processRows(rows, options);
}

/* -------------------------------------------------------------------------- */
// Row processing engine
/* -------------------------------------------------------------------------- */

async function processRows(
  rows: ImportRow[],
  options: ImportOptions
): Promise<ImportResult> {
  const { skipInvalidRows = true, dryRun = false, onProgress } = options;
  const result: ImportResult = {
    success: true,
    imported: 0,
    failed: 0,
    skipped: 0,
    skippedRows: [],
    errors: [],
    warnings: [],
  };

  // The rows are written in BATCHES, through `bulk_create_records`, which
  // runs in ONE transaction: it validates every row first and writes only
  // when every row has passed, so a batch lands WHOLE or NOT AT ALL.  The
  // server allocates the serials (the same `get_next_serial` the single
  // create uses), writes the audit row, and never overwrites a live
  // record — a serial that already exists is skipped and reported.
  //
  // The old loop wrote one row per round trip, through `createRecord`, and
  // every one of those calls FAILED: the client sent an e-mail into the
  // `p_created_by uuid` parameter, so the import wrote nothing at all.
  //
  // The actor is read once: the status a new record starts in is the
  // workflow's decision, exactly as it is for a record created by hand.
  const actor = getCurrentUserSnapshot();

  // ── PASS 1: check every row.  Nothing is written yet. ──────────────────
  const valid: { row: number; payload: BulkRow }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i + 1, rows.length);

    // The form the row belongs to.
    //
    // A file may name the form by its CODE ("F/12") or by its NAME
    // ("Disposal of Non-Conforming Products") — the alias layer resolves
    // both to the code the records are filed under, so an export written
    // with the document's title still lands in the right place.  A name
    // the catalogue does not know is an error: a record filed under a form
    // nobody can open is a record nobody can find.
    const formCode = resolveFormCode(row.form_type);
    if (!formCode) {
      result.errors.push({ row: i + 1, serial: row.serial || "N/A", error: `Unknown form type: ${row.form_type}` });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    // The row's data, exactly as the file carries it.  Nothing is added,
    // nothing is taken away: an import must not drop a field the document
    // facsimile carries, and it must not invent one either.
    const formData = isPlainObject(row.form_data) ? row.form_data : {};
    const serial = resolveRowSerial(row);

    // The completeness rule — the SAME one the server applies, so that the
    // two never disagree about a row.  The server's list is the catalogue's
    // list (migration 19 keeps them identical, and
    // src/__tests__/requiredFieldsAgreeWithCatalogue.test.ts holds them to
    // it), so this check finds the rows the server would refuse — and
    // finding them HERE means the good rows are written in ONE round trip
    // instead of two.
    if (!Object.keys(formData).length) {
      result.errors.push({ row: i + 1, serial: serial || "N/A", error: "The row carries no form data" });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    const missing = missingRequiredFields(formCode, formData);
    if (missing.length) {
      result.errors.push({
        row: i + 1,
        serial: serial || "N/A",
        error: `Missing required fields: ${missing.join(", ")}`,
      });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    // The TYPE check is ADVISORY, and this is the point of the whole
    // exercise.
    //
    // The register's own records hold values the current catalogue does not
    // accept: 10 F/48 records carry an `audit_type` ("Internal Quality
    // Audit") that the option list never had, 20 F/29 records carry a
    // `training_status` that is an object where the catalogue says text.
    // Refusing those would mean losing records the people who entered them
    // can still read — and an import that drops a row is a row that is
    // gone.  So the row is written as it is, and the disagreement is
    // reported in `warnings` instead of being an error.
    if (getFormSchema(formCode)) {
      const validation = validateFormData(formCode, formData, { lenient: true });
      if (!validation.valid) {
        const issues = validation.errors.map(e => `${e.field || "form"}: ${e.message}`).join("; ");
        result.warnings.push({
          row: i + 1,
          serial: serial || "N/A",
          message: `Carried as it is — ${issues}`,
        });
      }
    }

    valid.push({
      row: i + 1,
      payload: {
        form_code: formCode,
        // The catalogue's name — the one the records are filed under.
        form_name: resolveFormName(formCode),
        form_data: formData,
        // The serial the record is filed under.  `undefined` means "the
        // server allocates the next one for this form".
        serial,
        status: initialStatusFor(formCode, actor),
        // The department, from the catalogue — the same one every live
        // record of this form carries.  The server derives one of its own
        // when the client sends none, and its derivation is out of date:
        // it files F/40 under "Measurement & Improvement" while all six
        // live F/40 records sit in "HR & Training".
        section: resolveFormSection(formCode) || null,
        section_name: resolveFormSectionName(formCode) || null,
        frequency: resolveFormFrequency(formCode) || null,
      },
    });
  }

  if (dryRun) {
    // A dry run writes nothing.  The number it reports is the number of
    // rows that WOULD be written — the rows that carry their form's
    // required fields.  A serial that is already in the register would be
    // skipped rather than written, and only the server can know that.
    result.imported = valid.length;
    report(result, skipInvalidRows, true);
    return result;
  }

  // ── PASS 2: write in batches ──────────────────────────────────────────
  //
  // One batch = one transaction = the batch lands whole or not at all.  A
  // file of up to 500 rows is ONE transaction; a bigger file is cut on the
  // row count and on the measured size of the rows (a form with a matrix in
  // it is big), and each part is still whole.
  let processed = 0;
  // The batch is a run of WHOLE envelopes: each one keeps the row's number
  // in the file beside its payload, because that is the number the caller
  // is told when the server refuses a row.  The batch is measured on the
  // payload, which is what actually goes on the wire.
  for (const batch of chunkRows(
    valid,
    BULK_BATCH_SIZE,
    BULK_BATCH_BYTES,
    (e) => byteSizeOf(e.payload),
  )) {
    let entries = batch;
    let outcome = await bulkCreateRecords(entries.map(e => e.payload), { reason: 'import' });

    if (!outcome.committed) {
      if (!skipInvalidRows) {
        // The server refused the batch and wrote NOTHING.  Report the rows
        // it refused and stop: the import is not atomic across batches, so
        // the batches already written stay written.
        reportFailures(outcome, entries, result);
        result.success = false;
        break;
      }
      // "Skip the invalid rows" means exactly that: the bad rows are
      // reported and dropped, and the good ones are sent again.  The retry
      // is atomic too, so it writes ALL of the good rows or none of them.
      const bad = new Set(outcome.failures.map(f => f.index));
      reportFailures(outcome, entries, result);
      const rest = entries.filter((_, i) => !bad.has(i + 1));
      if (!rest.length) {
        processed += entries.length;
        onProgress?.(processed, rows.length);
        continue;
      }
      entries = rest;
      outcome = await bulkCreateRecords(entries.map(e => e.payload), { reason: 'import' });
      if (!outcome.committed) {
        reportFailures(outcome, entries, result);
        result.success = false;
        break;
      }
    }

    result.imported += outcome.created;
    for (const row of outcome.rows) {
      if (row.status !== 'skipped') continue;
      const entry = entries[row.index - 1];
      result.skipped++;
      result.skippedRows.push({
        row: entry?.row ?? row.index,
        serial: row.serial || entry?.payload.serial || "N/A",
        reason: row.detail || 'a live record already carries this serial',
      });
    }

    processed += batch.length;
    onProgress?.(processed, rows.length);
  }

  report(result, skipInvalidRows, false);
  return result;
}

/**
 * The status a new record starts in.
 *
 * The workflow decides, not the import file: an admin's record is created
 * approved, everyone else's waits for review — exactly as it is for a
 * record created through the form.
 */
function initialStatusFor(formCode: string, actor: ReturnType<typeof getCurrentUserSnapshot>): string {
  if (!actor) return 'pending_review';
  return resolveApprovalStatus(actor, resolveDepartment(formCode));
}

/** Report the rows the server refused, in the caller's own row numbering. */
function reportFailures(
  outcome: Awaited<ReturnType<typeof bulkCreateRecords>>,
  entries: { row: number; payload: BulkRow }[],
  result: ImportResult,
): void {
  for (const failure of outcome.failures) {
    const entry = entries[failure.index - 1];
    result.errors.push({
      row: entry?.row ?? failure.index,
      serial: failure.serial || entry?.payload.serial || "N/A",
      error: failure.error,
    });
    result.failed++;
  }
}

/** Say what happened. */
function report(result: ImportResult, skipInvalidRows: boolean, dryRun: boolean): void {
  if (result.success && result.failed > 0 && !skipInvalidRows) {
    result.success = false;
  }

  const written = dryRun ? `${result.imported} row(s) are ready to import` : `Imported ${result.imported} records`;

  if (result.success && result.failed === 0 && result.skipped === 0) {
    if (result.warnings.length) {
      toast.warning(`${written} — ${result.warnings.length} row(s) carried as they are`);
    } else {
      toast.success(dryRun ? written : `${written} successfully`);
    }
  } else if (result.success) {
    // `skipInvalidRows` (the default) means "keep going past a bad row", not
    // "hide the bad rows".  The old code showed a plain success toast here —
    // "Imported 40 records successfully" — while 12 rows had in fact been
    // rejected, and the errors were only visible if the user opened the
    // result panel.
    const parts = [written];
    if (result.failed > 0) parts.push(`${result.failed} row(s) rejected`);
    if (result.skipped > 0) parts.push(`${result.skipped} already in the register`);
    if (result.warnings.length > 0) parts.push(`${result.warnings.length} carried as they are`);
    toast.warning(parts.join(', '));
  } else {
    toast.error(`Import completed with ${result.failed} errors (${result.imported} imported)`);
  }
}

/* -------------------------------------------------------------------------- */
// Helpers
/* -------------------------------------------------------------------------- */

/**
 * The code a file's `form_type` refers to.
 *
 * A file may carry the CODE ("F/12") or the NAME ("Disposal of
 * Non-Conforming Products") — the alias layer resolves both, so an export
 * that names the document still lands under the code the records are filed
 * under.  `undefined` when the name is not one the catalogue knows.
 */
function resolveFormCode(raw: unknown): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  if (isKnownFormCode(value)) return value;
  return findFormCodeByName(value);
}

/**
 * The serial a row is filed under.
 *
 * The order is the order of authority:
 *
 *   1. the file's own `serial` — what the file says the record is;
 *   2. the source's `form_data.serial` — an export of the register usually
 *      carries the record's serial there, and a record that is already in
 *      the register must be recognised as such instead of being filed a
 *      second time under a fresh serial;
 *   3. nothing — the server allocates the next serial for that form.
 *
 * A value that is not a serial is never used as one: the live register
 * holds 8 F/19 rows whose `form_data.serial` is a sentence, and a record
 * filed under a sentence is a record nobody can find.
 */
function resolveRowSerial(row: ImportRow): string | undefined {
  const stated = String(row.serial ?? "").trim();
  if (stated) return stated;

  const carried = row.form_data?.serial;
  const value = typeof carried === "string"
    ? carried.trim()
    : typeof carried === "number"
      ? String(carried)
      : "";
  if (!value) return undefined;
  return SERIAL_SHAPED.test(value) ? value : undefined;
}

/** A serial, and nothing else: "F/08-001", "CAPA-25-001". */
const SERIAL_SHAPED = /^[A-Za-z0-9]{1,12}[/-][A-Za-z0-9._-]{1,24}$/;

/** Is this a plain object (and not an array, a string or null)? */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The catalogue's required fields this row does not carry.
 *
 * This is the server's own rule, computed from the same catalogue the
 * server's list is copied from (migration 19), minus `serial` — the serial
 * is a COLUMN, not a business field, and it comes from the file's own
 * column, not from `form_data`.
 */
function missingRequiredFields(formCode: string, formData: Record<string, unknown>): string[] {
  const schema = getFormSchema(formCode);
  if (!schema) return [];

  const missing: string[] = [];
  for (const field of schema.fields) {
    if (!field.required || field.key === "serial") continue;
    const value = formData[field.key];
    if (value === undefined || value === null) {
      missing.push(field.key);
      continue;
    }
    if (typeof value === "string" && value.trim() === "") missing.push(field.key);
  }
  return missing;
}

function normalizeRow(raw: unknown): ImportRow {
  const r = raw as Record<string, unknown>;
  return {
    serial: (r.serial || r.Serial || "") as string,
    // `r.formType` was tested twice here, so a file using the snake_case
    // `form_code` header produced an empty form type and every row was rejected
    // as "Unknown form type".
    form_type: (r.form_type || r.formType || r.form_code || r.formCode || "") as string,
    form_data: (r.form_data || r.formData || r) as Record<string, unknown>,
    // Not a column on `records` (production has no revision_no; there is no
    // versioning table either) and not a parameter of create_record_validated, so
    // this value is read for file-format compatibility and is NOT persisted.
    revision_no: (r.revision_no || r.revisionNo || "A") as string,
    // Likewise read-only here: the workflow, not the import file, decides the
    // initial status, and "active" was never a member of record_status_enum.
    status: ((r.status as string) || "") as string,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// REMOVED: generateNextSerial().
//
// It built the prefix by replacing "/" with "-" (so "F/08" became "F-08") and
// then queried `serial LIKE 'F-08-%'`. Production serials are "F/08-001" (slash,
// see SERIAL_FORMAT and the 318 distinct production serials), so the pattern
// never matched, `last` was always undefined, and it always returned "F-08-001"
// — both a duplicate of an existing record and in the wrong format. Serial
// allocation belongs to the server: create_record_validated takes p_serial (with
// 'auto' as the sentinel) and returns out_serial.

/* -------------------------------------------------------------------------- */
// Validation preview (for wizard UI)
/* -------------------------------------------------------------------------- */

export async function previewImport(
  file: File
): Promise<{ type: "json" | "csv"; rows: number; sample: ImportRow[] }> {
  const text = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    const parsed = JSON.parse(text);
    const rows = (Array.isArray(parsed) ? parsed : [parsed]).map(normalizeRow);
    return { type: "json", rows: rows.length, sample: rows.slice(0, 5) };
  }

  if (ext === "csv") {
    const lines = text.trim().split("\n");
    const headers = parseCsvLine(lines[0]);
    const sample: ImportRow[] = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = parseCsvLine(lines[i]);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] ?? ""; });
      sample.push({
        serial: obj.serial || "",
        form_type: obj.form_type || obj.formType || obj.form_code || "",
        form_data: obj,
        revision_no: obj.revision_no || "A",
        // Preview only — the workflow decides the initial status at write time.
        status: obj.status || "",
      });
    }
    return { type: "csv", rows: lines.length - 1, sample };
  }

  throw new Error("Unsupported file format. Use .json or .csv");
}
