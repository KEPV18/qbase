// =============================================================================
// QBase — Data Import Service
// Validates batch imports against Zod schemas before insertion.
// Supports JSON (array of records) and structured CSV formats.
// =============================================================================

import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getFormSchema } from "@/data/formSchemas";
import { validateFormData } from "@/schemas/formValidation";
import { toast } from "sonner";

export interface ImportOptions {
  skipInvalidRows?: boolean;   // default true
  dryRun?: boolean;            // validate only, don't insert
  onProgress?: (processed: number, total: number) => void;
}

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

    const formSchema = getFormSchema(row.form_type);
    if (!formSchema) {
      result.errors.push({ row: i + 1, serial: row.serial || "N/A", error: `Unknown form type: ${row.form_type}` });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    // Validate against Zod
    const validation = validateFormData(row.form_type, row.form_data);

    if (!validation.success) {
      const issues = Object.entries(validation.errors).map(([path, msg]) => `${path}: ${msg}`).join("; ");
      result.errors.push({ row: i + 1, serial: row.serial || "N/A", error: `Validation: ${issues}` });
      result.failed++;
      if (!skipInvalidRows) result.success = false;
      continue;
    }

    if (dryRun) {
      result.imported++; // Count as valid
      continue;
    }

    // Generate serial if not provided
    const serial = row.serial || await generateNextSerial(row.form_type);

    // Insert
    const { error } = await supabase.from("records").insert({
      serial,
      form_type: row.form_type,
      revision_no: row.revision_no || "A",
      status: row.status || "active",
      form_data: validation.data,
    });

    if (error) {
      result.errors.push({ row: i + 1, serial, error: `DB insert: ${error.message}` });
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
    form_type: (r.form_type || r.formType || r.formType || "") as string,
    form_data: (r.form_data || r.formData || r) as Record<string, unknown>,
    revision_no: (r.revision_no || r.revisionNo || "A") as string,
    status: (r.status || "active") as string,
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

async function generateNextSerial(formType: string): Promise<string> {
  const prefix = formType.toUpperCase().replace(/\//g, "-");
  const { data } = await supabase
    .from("records")
    .select("serial")
    .like("serial", `${prefix}-%`)
    .order("serial", { ascending: false })
    .limit(1);

  const last = data?.[0]?.serial;
  let num = 1;
  if (last) {
    const parts = last.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) num = n + 1;
  }
  return `${prefix}-${String(num).padStart(3, "0")}`;
}

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
        form_type: obj.form_type || obj.formType || "",
        form_data: obj,
        revision_no: obj.revision_no || "A",
        status: obj.status || "active",
      });
    }
    return { type: "csv", rows: lines.length - 1, sample };
  }

  throw new Error("Unsupported file format. Use .json or .csv");
}
