// ============================================================================
// QMS Forge — Record Storage Service
// CUTOVER EDITION — Uses ONLY new schema columns.
// No legacy field mappings. No file_reviews. No code/record_name.
// Supabase is the ONLY source of truth.
// No write without validation. No bypass paths.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { preWriteValidation } from './preWriteValidation';
import { getFormSchema } from '../data/formSchemas';
import { getNextSerial, isSerialUnique } from '../schemas/serialAndDate';
import { appendAuditLog, computeDiff } from './auditLog';
import { log } from './logger';
import { emitEvent, Events } from './eventBus';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Database row type — mirrors the new schema exactly
// ============================================================================

interface DbRecord {
  id: string;
  form_code: string;
  serial: string;
  form_name: string;
  status: string;
  form_data: Record<string, unknown>;
  section: number | null;
  section_name: string;
  frequency: string;
  created_by: string;
  last_modified_by: string;
  edit_count: number;
  modification_reason: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Operation Log
// ============================================================================

export interface OperationLogEntry {
  timestamp: string;
  operation: 'create' | 'update' | 'delete';
  serial: string;
  formCode: string;
  success: boolean;
  error?: string;
  conflict?: boolean;
  durationMs?: number;
}

const OPERATION_LOG: OperationLogEntry[] = [];
const MAX_LOG_ENTRIES = 200;

function logOperation(entry: OperationLogEntry) {
  OPERATION_LOG.push(entry);
  if (OPERATION_LOG.length > MAX_LOG_ENTRIES) {
    OPERATION_LOG.shift();
  }
  const prefix = entry.success ? '✅' : '❌';
  console.log(`${prefix} [recordStorage] ${entry.operation.toUpperCase()} ${entry.serial} ${entry.success ? 'succeeded' : `failed: ${entry.error}`}${entry.conflict ? ' (CONFLICT)' : ''} (${entry.durationMs}ms)`);
}

export function getOperationLog(): OperationLogEntry[] {
  return [...OPERATION_LOG];
}

// ============================================================================
// Types
// ============================================================================

export interface StorageResult {
  success: boolean;
  record?: RecordData;
  error?: string;
  conflict?: boolean;
  duplicateSerial?: boolean;
}

export class RecordStorageError extends Error {
  public readonly code: 'VALIDATION' | 'DUPLICATE' | 'CONFLICT' | 'NETWORK' | 'PARSE' | 'NOT_FOUND' | 'UNKNOWN';
  public readonly details?: unknown;

  constructor(message: string, code: RecordStorageError['code'], details?: unknown) {
    super(message);
    this.name = 'RecordStorageError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Row ↔ RecordData conversion — NEW SCHEMA ONLY
// ============================================================================

function parseRowToRecord(row: DbRecord): RecordData | null {
  if (!row.form_code) return null;

  // form_data is the single source of truth for all form field data
  const formData = row.form_data && typeof row.form_data === 'object'
    ? { ...(row.form_data as Record<string, unknown>) }
    : {};

  // Inject system metadata into the record data structure
  // (FormData contains business fields; metadata is on the row itself)
  const recordData: RecordData = {
    id: row.id || '',          // Supabase UUID — needed for delete RPC
    serial: row.serial || row.form_code,
    formCode: row.form_code,
    formName: row.form_name || '',
    _createdAt: row.created_at || '',
    _createdBy: row.created_by || '',
    _lastModifiedAt: row.updated_at || '',
    _lastModifiedBy: row.last_modified_by || '',
    _editCount: row.edit_count || 0,
    _modificationReason: row.modification_reason || '',
    _status: row.status || 'draft',
    _section: row.section || 0,
    _sectionName: row.section_name || '',
    _frequency: row.frequency || '',
    ...formData,  // Business fields from form_data
  };

  return recordData;
}

function recordToRow(data: RecordData): Omit<DbRecord, 'id' | 'created_at' | 'updated_at'> {
  // Extract metadata from RecordData (fields starting with _)
  const metadataKeys = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason', '_status',
    '_section', '_sectionName', '_frequency',
  ]);

  // Everything else is business data → form_data
  const formData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!metadataKeys.has(key)) {
      formData[key] = value;
    }
  }

  const formCode = String(data.formCode ?? '');
  const formSchema = getFormSchema(formCode);

  return {
    form_code: formCode,
    serial: String(data.serial ?? ''),
    form_name: String(data.formName ?? formSchema?.name ?? ''),
    status: String(data._status ?? 'draft'),
    form_data: formData,
    section: Number(data._section ?? formSchema?.section ?? 0),
    section_name: String(data._sectionName ?? formSchema?.sectionName ?? ''),
    frequency: String(data._frequency ?? formSchema?.frequency ?? ''),
    created_by: String(data._createdBy ?? ''),
    last_modified_by: String(data._lastModifiedBy ?? ''),
    edit_count: Number(data._editCount ?? 0),
    modification_reason: String(data._modificationReason ?? ''),
    deleted_at: null,
  };
}

// ============================================================================
// Public API — Read operations
// ============================================================================

export async function getRecords(formCode?: string): Promise<RecordData[]> {
  let query = supabase
    .from('records')
    .select('*')
    .is('deleted_at', null)  // Only active records
    .order('form_code', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new RecordStorageError(`Failed to fetch records: ${error.message}`, 'NETWORK', error);
  }

  const records = (data as DbRecord[])
    .map(row => parseRowToRecord(row))
    .filter((r): r is RecordData => r !== null);

  if (formCode) {
    return records.filter(r => r.formCode === formCode);
  }

  return records;
}

export async function getRecord(serial: string): Promise<RecordData | null> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('serial', serial)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new RecordStorageError(`Failed to fetch record ${serial}: ${error.message}`, 'NETWORK', error);
  }

  if (!data) return null;
  return parseRowToRecord(data as DbRecord);
}

export async function getExistingSerials(formCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('records')
    .select('serial')
    .eq('form_code', formCode)
    .is('deleted_at', null);

  if (error) {
    throw new RecordStorageError(`Failed to fetch serials for ${formCode}: ${error.message}`, 'NETWORK', error);
  }

  return (data as Pick<DbRecord, 'serial'>[]).map(r => r.serial).filter(Boolean);
}

// ============================================================================
// Public API — Write operations (ALL go through preWriteValidation)
// ============================================================================

export async function createRecord(formData: RecordData): Promise<StorageResult> {
  const startTime = performance.now();
  const formCode = formData.formCode as string;
  if (!formCode) {
    log.record.failed('?', '?', 'formCode is required');
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: '?', formCode: '?', success: false, error: 'formCode is required', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: 'formCode is required for record creation' };
  }

  // 1. Pre-write validation
  const validation = preWriteValidation(formCode, formData, 'create');
  if (!validation.valid || !validation.sanitizedData) {
    log.validation.rejected(formCode, validation.errors.map(e => e.field));
    log.record.failed(formCode, '?', `Validation: ${validation.errors.map(e => e.message).join('; ')}`);
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: '?', formCode, success: false, error: `Validation: ${validation.errors.map(e => e.message).join('; ')}`, durationMs: Math.round(performance.now() - startTime) });
    return {
      success: false,
      error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
    };
  }

  const data = validation.sanitizedData;

  // 2. Fetch existing serials from Supabase
  const existingSerials = await getExistingSerials(formCode);

  // 3. Generate next serial
  let serial: string;
  const providedSerial = String(data.serial ?? '');
  if (providedSerial && providedSerial !== 'auto') {
    serial = providedSerial;
  } else {
    serial = getNextSerial(formCode, existingSerials);
  }

  // 4. Re-check uniqueness
  if (existingSerials.includes(serial)) {
    const higherSerials = existingSerials.map(s => {
      const match = s.match(/F\/\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(...higherSerials, 0);
    const formNum = formCode.replace('F/', '');
    serial = `F/${formNum}-${String(maxNum + 1).padStart(3, '0')}`;

    if (existingSerials.includes(serial)) {
      return { success: false, error: `Cannot generate unique serial for ${formCode}.`, duplicateSerial: true };
    }
  }

  // 5. Set final metadata
  data.serial = serial;
  data.formCode = formCode;
  const formSchema = getFormSchema(formCode);
  data.formName = formSchema?.name || '';
  data._createdAt = data._createdAt || new Date().toISOString();
  data._createdBy = data._createdBy || 'akh.dev185@gmail.com';
  data._lastModifiedAt = null;
  data._lastModifiedBy = null;
  data._editCount = 0;
  data._modificationReason = null;
  data._status = data._status || 'pending_review';

  // 6. Insert via validated RPC (server-side enforcement)
  try {
    // Extract business data for form_data (metadata is handled by RPC)
    const metadataKeys = new Set([
      'serial', 'formCode', 'formName',
      '_createdAt', '_createdBy',
      '_lastModifiedAt', '_lastModifiedBy',
      '_editCount', '_modificationReason', '_status',
      '_section', '_sectionName', '_frequency',
    ]);
    const businessData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!metadataKeys.has(key) && key !== 'id') {
        businessData[key] = value;
      }
    }

    const { data: rpcResult, error } = await supabase.rpc('create_record_validated', {
      p_form_code: formCode,
      p_form_name: data.formName as string || formSchema?.name || '',
      p_form_data: businessData,
      p_status: (data._status as string || 'draft') as any,
      p_serial: 'auto',
      p_section: data._section as number || formSchema?.section || null,
      p_section_name: data._sectionName as string || formSchema?.sectionName || null,
      p_frequency: data._frequency as string || formSchema?.frequency || null,
    });

    if (error) {
      // Check for specific error types
      const msg = error.message || '';
      if (msg.includes('already exists') || msg.includes('23505')) {
        return { success: false, error: `Serial collision — ${msg}`, duplicateSerial: true };
      }
      if (msg.includes('Validation failed') || msg.includes('required fields missing') || msg.includes('cannot be empty')) {
        return { success: false, error: msg };
      }
      if (msg.includes('Insufficient role')) {
        return { success: false, error: 'Insufficient permissions to create records.' };
      }
      throw new RecordStorageError(`Failed to create record: ${msg}`, 'NETWORK', error);
    }

    // Extract the actual serial from RPC result
    const resultRow = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const actualSerial = resultRow?.out_serial || serial;
    const actualId = resultRow?.out_id;

    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: actualSerial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 7. Audit log (non-blocking — fire and forget)
    const allFields = Object.keys(data).filter(k => !k.startsWith('_'));
    const newFieldValues: Record<string, unknown> = {};
    for (const key of allFields) { newFieldValues[key] = data[key]; }
    appendAuditLog(actualSerial, 'create', data._createdBy as string || 'unknown', allFields, {}, newFieldValues, formCode).catch(err => {
      log.audit.failed(actualSerial, String(err));
      console.error('[recordStorage] Audit log failed (non-blocking):', err);
    });
    log.validation.passed(formCode, actualSerial);
    log.record.created(formCode, actualSerial, Math.round(performance.now() - startTime));

    // 8. Event emission (non-blocking — fire and forget)
    emitEvent(Events.recordCreated(
      actualSerial, formCode, data.formName as string || '', data._createdBy as string
    )).catch(err => {
      console.warn('[recordStorage] Event emission failed (non-blocking):', err);
    });

    // Update the data object with actual serial for return
    data.serial = actualSerial;
    return { success: true, record: data };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export async function updateRecord(
  serial: string,
  changes: RecordData,
  modificationReason?: string
): Promise<StorageResult> {
  const startTime = performance.now();

  // 1. Fetch current record using NEW schema column (serial, not last_serial)
  const { data: currentRow, error: fetchError } = await supabase
    .from('records')
    .select('*')
    .eq('serial', serial)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !currentRow) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: '?', success: false, error: 'Record not found', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: `Record ${serial} not found.` };
  }

  const currentRecord = parseRowToRecord(currentRow as DbRecord);
  if (!currentRecord) {
    return { success: false, error: `Failed to parse record ${serial}.` };
  }

  const formCode = String(currentRecord.formCode || '?');

  // 2. Optimistic locking using edit_count
  const currentEditCount = (currentRow as DbRecord).edit_count ?? 0;
  const clientEditCount = changes._editCount !== undefined ? Number(changes._editCount) : -1;

  if (clientEditCount >= 0 && clientEditCount !== currentEditCount) {
    log.record.conflict(formCode, serial, clientEditCount, currentEditCount);
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: 'Optimistic lock conflict', conflict: true, durationMs: Math.round(performance.now() - startTime) });
    return {
      success: false,
      error: `Record ${serial} was modified by another user. Please reload and try again.`,
      conflict: true,
    };
  }

  // 3. Merge
  const merged: RecordData = {
    ...currentRecord,
    ...changes,
    serial: currentRecord.serial,
    formCode: currentRecord.formCode,
    formName: currentRecord.formName,
    _createdAt: currentRecord._createdAt,
    _createdBy: currentRecord._createdBy,
    _lastModifiedAt: new Date().toISOString(),
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: currentEditCount + 1,
    _modificationReason: modificationReason || null,
  };

  // 4. Validation
  const validation = preWriteValidation(currentRecord.formCode as string, merged, 'update', serial);
  if (!validation.valid || !validation.sanitizedData) {
    return { success: false, error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}` };
  }

  // 5. Update in Supabase — using ID (not serial) for precise targeting
  try {
    const updateData = recordToRow(validation.sanitizedData);
    // Remove id from update payload — we don't update the primary key
    const { id: _id, ...updateFields } = updateData as DbRecord & { id?: string };

    const { error: updateError } = await supabase
      .from('records')
      .update(updateFields)
      .eq('id', (currentRow as DbRecord).id);

    if (updateError) {
      throw new RecordStorageError(`Failed to update record: ${updateError.message}`, 'NETWORK', updateError);
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 6. Audit log
    const diff = computeDiff(currentRecord, validation.sanitizedData);
    if (diff.changedFields.length > 0) {
      appendAuditLog(serial, 'update', merged._lastModifiedBy as string || 'unknown', diff.changedFields, diff.previousValues, diff.newValues, formCode).catch(err => {
        log.audit.failed(serial, String(err));
        console.error('[recordStorage] Audit log failed (non-blocking):', err);
      });
    }

    log.record.updated(formCode, serial, Math.round(performance.now() - startTime), undefined, { changedFields: diff.changedFields });

    // 7. Event emission (non-blocking)
    if (diff.changedFields.length > 0) {
      emitEvent(Events.recordUpdated(
        serial, formCode, merged.formName as string || '', diff.changedFields, merged._lastModifiedBy as string
      )).catch(err => {
        console.warn('[recordStorage] Update event emission failed (non-blocking):', err);
      });
    }

    return { success: true, record: validation.sanitizedData };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

// ============================================================================
// Soft delete — uses RPC function
// ============================================================================

export async function softDeleteRecord(id: string): Promise<StorageResult> {
  const startTime = performance.now();

  try {
    const { data, error } = await supabase.rpc('soft_delete_record', { p_id: id });

    if (error) {
      throw new RecordStorageError(`Failed to delete record: ${error.message}`, 'NETWORK', error);
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'delete', serial: id, formCode: '?', success: true, durationMs: Math.round(performance.now() - startTime) });

    // Event emission (non-blocking) — id used as target reference
    emitEvent({
      action: 'delete', category: 'records', priority: 'important',
      eventType: 'record.deleted', title: 'Record Deleted',
      message: `A record was soft-deleted (id: ${id.substring(0, 8)}...).`,
      targetId: id, metadata: { recordId: id },
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'delete', serial: id, formCode: '?', success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

// ============================================================================
// Status changes — uses direct update with audit
// ============================================================================

export async function changeRecordStatus(
  serial: string,
  newStatus: string,
  reason?: string
): Promise<StorageResult> {
  const startTime = performance.now();

  const { data: currentRow, error: fetchError } = await supabase
    .from('records')
    .select('*')
    .eq('serial', serial)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !currentRow) {
    return { success: false, error: `Record ${serial} not found.` };
  }

  const currentRecord = parseRowToRecord(currentRow as DbRecord);
  if (!currentRecord) {
    return { success: false, error: `Failed to parse record ${serial}.` };
  }

  const previousStatus = currentRecord._status;
  const formCode = String(currentRecord.formCode);

  try {
    const { error: updateError } = await supabase
      .from('records')
      .update({ status: newStatus, edit_count: ((currentRow as DbRecord).edit_count ?? 0) + 1 })
      .eq('id', (currentRow as DbRecord).id);

    if (updateError) {
      throw new RecordStorageError(`Failed to update status: ${updateError.message}`, 'NETWORK', updateError);
    }

    // Audit status change
    appendAuditLog(serial, 'status_change', 'akh.dev185@gmail.com', ['status'], { status: previousStatus }, { status: newStatus }).catch(err => {
      console.error('[recordStorage] Status audit log failed (non-blocking):', err);
    });

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });
    return { success: true, record: { ...currentRecord, _status: newStatus } };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

// invalidateRowCache was a legacy React Query cache helper.
// React Query now handles its own cache via queryClient.invalidateQueries().
// Kept as no-op for API compatibility.
export function invalidateRowCache(): void {}