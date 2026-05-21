// ============================================================================
// QMS Forge — Pre-Write Validation Layer
// NO write operation without validation. This is the gatekeeper.
// Even if the UI passed validation, this layer re-validates before writing.
// ============================================================================

import { validateFormData, FORM_ZOD_SCHEMAS } from '../schemas/formValidation';
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

export function getValidationLog(): typeof VALIDATION_LOG {
  return [...VALIDATION_LOG];
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
 * @returns PreWriteResult with validity, errors, and sanitized data
 */
export function preWriteValidation(
  formCode: string,
  data: RecordData,
  operation: 'create' | 'update',
  serial?: string
): PreWriteResult {
  const errors: ValidationError[] = [];

  // 1. Check that form schema exists
  const schemaExists = formCode in FORM_ZOD_SCHEMAS;
  if (!schemaExists) {
    errors.push({
      field: 'formCode',
      message: `No Zod schema found for form ${formCode}. Cannot validate data.`,
      code: 'custom',
    });
    const result: PreWriteResult = { valid: false, errors, sanitizedData: null };
    VALIDATION_LOG.push({
      timestamp: new Date().toISOString(),
      formCode,
      serial,
      operation,
      errors,
      rawPayload: data,
    });
    return result;
  }

  // 1b. Extract metadata keys before Zod validation (Zod strips unknown keys)
  // Zod form schemas only define form fields — metadata keys would be lost after safeParse
  const METADATA_KEYS = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
    '_creationReason', '_businessEvent',
  ]);
  const savedMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key)) {
      savedMetadata[key] = value;
    }
  }

  // 1c. Normalize dates: convert DD/MM/YYYY → YYYY-MM-DD before Zod validation
  // The UI stores dates in DD/MM/YYYY format, but Zod ISO_DATE expects YYYY-MM-DD
  const normalizedData = { ...data };
  const displayPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  for (const [key, value] of Object.entries(normalizedData)) {
    if (typeof value === 'string' && displayPattern.test(value)) {
      const match = value.match(displayPattern);
      if (match) {
        normalizedData[key] = `${match[3]}-${match[2]}-${match[1]}`; // DD/MM/YYYY → YYYY-MM-DD
      }
    }
  }

  // 2. Run Zod validation via the same function the UI uses
  const zodResult = validateFormData(formCode, normalizedData);

  if (!zodResult.success) {
    // Convert Zod errors to our ValidationError format
    const zodErrors = zodResult.errors;
    for (const [field, message] of Object.entries(zodErrors)) {
      // Determine error code from message content
      let code: ValidationError['code'] = 'custom';
      if (message.toLowerCase().includes('required') || message.toLowerCase().includes('cannot be empty')) {
        code = 'required';
      } else if (message.toLowerCase().includes('format') || message.toLowerCase().includes('invalid date') || message.toLowerCase().includes('dd/mm/yyyy')) {
        code = 'format';
      } else if (message.toLowerCase().includes('must be one of') || message.toLowerCase().includes('enum')) {
        code = 'enum';
      } else if (message.toLowerCase().includes('must be') || message.toLowerCase().includes('minimum') || message.toLowerCase().includes('maximum')) {
        code = 'range';
      } else if (message.toLowerCase().includes('must be a') || message.toLowerCase().includes('expected')) {
        code = 'type';
      }

      errors.push({ field, message, code });
    }

    const result: PreWriteResult = { valid: false, errors, sanitizedData: null };
    VALIDATION_LOG.push({
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
  const validatedData = zodResult.data as RecordData;

  // 3a. Re-merge metadata that Zod stripped during safeParse
  // Zod form schemas only validate form fields — metadata keys are stripped from result.data
  // We must restore them so serializeRecordToRow can write them to the correct columns
  for (const [key, value] of Object.entries(savedMetadata)) {
    if (!(key in validatedData)) {
      validatedData[key] = value;
    }
  }

  // 3b. Serial format check — only for real serials (not 'auto' placeholder)
  const serialValue = String(validatedData.serial ?? '');
  if (serialValue && serialValue !== 'auto') {
    const serialPattern = /^F\/\d{1,2}-\d{3,4}$/;
    if (!serialPattern.test(serialValue)) {
      errors.push({
        field: 'serial',
        message: `Invalid serial format: "${serialValue}". Expected F/XX-NNN format.`,
        code: 'format',
      });
    }
  }

  // 3b. Date format check — ensure stored dates are DD/MM/YYYY or YYYY-MM-DD
  const dateFields = Object.entries(validatedData).filter(([key]) =>
    key.toLowerCase().includes('date') || key === 'date'
  );
  for (const [key, value] of dateFields) {
    if (value && typeof value === 'string' && value.trim()) {
      const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
      const displayPattern = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!isoPattern.test(value) && !displayPattern.test(value)) {
        errors.push({
          field: key,
          message: `Invalid date format: "${value}". Expected DD/MM/YYYY or YYYY-MM-DD.`,
          code: 'format',
        });
      }
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

  // 3d. For creates, auto-fill metadata if missing
  if (operation === 'create') {
    if (!validatedData._createdAt) {
      validatedData._createdAt = new Date().toISOString();
    }
    if (!validatedData._createdBy) {
      validatedData._createdBy = 'akh.dev185@gmail.com';
    }
  }

  if (errors.length > 0) {
    const result: PreWriteResult = { valid: false, errors, sanitizedData: null };
    VALIDATION_LOG.push({
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

// ============================================================================
// Serialize for Sheets storage
// ============================================================================

/**
 * Convert a RecordData object into a flat row for Google Sheets.
 * Columns: serial | formCode | formName | _createdAt | _createdBy |
 *          _lastModifiedAt | _lastModifiedBy | _editCount |
 *          _modificationReason | formData (JSON string)
 */
export function serializeRecordToRow(data: RecordData): string[] {
  // Extract known metadata columns
  const serial = String(data.serial ?? '');
  const formCode = String(data.formCode ?? '');
  const formName = String(data.formName ?? '');
  const createdAt = String(data._createdAt ?? '');
  const createdBy = String(data._createdBy ?? '');
  const lastModifiedAt = String(data._lastModifiedAt ?? '');
  const lastModifiedBy = String(data._lastModifiedBy ?? '');
  const editCount = String(data._editCount ?? '0');
  const modificationReason = String(data._modificationReason ?? '');

  // Everything else goes into formData as JSON
  const metadataKeys = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
  ]);

  const formDataObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!metadataKeys.has(key)) {
      formDataObj[key] = value;
    }
  }

  const formDataJson = JSON.stringify(formDataObj);

  return [
    serial,
    formCode,
    formName,
    createdAt,
    createdBy,
    lastModifiedAt,
    lastModifiedBy,
    editCount,
    modificationReason,
    formDataJson,
  ];
}

/**
 * Parse a Google Sheets row back into a RecordData object.
 */
export function parseRowToRecord(row: string[]): RecordData | null {
  if (!row || row.length < 10) return null;

  const [
    serial,
    formCode,
    formName,
    createdAt,
    createdBy,
    lastModifiedAt,
    lastModifiedBy,
    editCount,
    modificationReason,
    formDataJson,
  ] = row;

  if (!serial || !formCode) return null;

  let formData: Record<string, unknown> = {};
  try {
    if (formDataJson && formDataJson.trim()) {
      formData = JSON.parse(formDataJson);
    }
  } catch {
    // Malformed JSON — treat as empty formData but still return record
    console.warn(`[recordStorage] Malformed JSON in formData for ${serial}:`, formDataJson?.substring(0, 100));
  }

  return {
    serial,
    formCode,
    formName,
    _createdAt: createdAt,
    _createdBy: createdBy,
    _lastModifiedAt: lastModifiedAt || null,
    _lastModifiedBy: lastModifiedBy || null,
    _editCount: parseInt(editCount, 10) || 0,
    _modificationReason: modificationReason || null,
    ...formData,
  };
}