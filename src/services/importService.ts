// =============================================================================
// QBase — Data Import Service
// Validates batch imports against Zod schemas before insertion.
// Supports JSON (array of records) and structured CSV formats.
// =============================================================================

import { getFormSchema } from "@/data/formSchemas";
import { validateFormData } from "@/schemas/formValidation";
import { createRecord } from "@/services/recordStorage";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
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
  errors: { row: number; serial: string; error: string }[];
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
  const result: ImportResult = { success: true, imported: 0, failed: 0, errors: [] };
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i + 1, rows.length);

    const formCode = row.form_type;
    const formSchema = getFormSchema(formCode);
    if (!formSchema) {
      result.errors.push({ row: i + 1, serial: row.serial || "N/A", error: `Unknown form type: ${formCode}` });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    // Validate against Zod. `errors` is a list of { field, message, code }, not a
    // map, so it must be mapped rather than passed to Object.entries.
    const validation = validateFormData(formCode, row.form_data);

    if (!validation.valid) {
      const issues = validation.errors.map(e => `${e.field}: ${e.message}`).join("; ");
      result.errors.push({ row: i + 1, serial: row.serial || "N/A", error: `Validation: ${issues}` });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    if (dryRun) {
      result.imported++; // Count as valid
      continue;
    }

    // Write through the same validated path as the UI (create_record_validated).
    // The previous implementation inserted directly with `form_type` and
    // `revision_no` — neither is a column on `records` — and a `status` of
    // "active", which is not a member of record_status_enum. PostgREST rejected
    // every row with PGRST204 / an invalid enum value, so no import could ever
    // succeed. Routing through createRecord also means imports cannot bypass
    // preWriteValidation, the auth check, or server-side serial allocation.
    const write = await createRecord({
      ...(validation.sanitizedData ?? row.form_data),
      formCode,
      formName: formSchema.name,
      serial: row.serial || "auto",
    } as unknown as RecordData);

    if (!write.success) {
      result.errors.push({
        row: i + 1,
        serial: (write.record?.serial as string) || row.serial || "N/A",
        error: write.error || "Write failed",
      });
      result.failed++;
      result.success = false;
    } else {
      result.imported++;
    }
  }

  if (result.success && result.failed > 0 && !skipInvalidRows) {
    result.success = false;
  }

  if (result.success) {
    toast.success(`Imported ${result.imported} records successfully`);
  } else {
    toast.error(`Import completed with ${result.failed} errors (${result.imported} imported)`);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
// Helpers
/* -------------------------------------------------------------------------- */

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
