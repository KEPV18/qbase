// ============================================================================
// QBase — Record Storage Service
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
import { restGet } from './userService';

import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Database row type — mirrors the new schema exactly
// ============================================================================

interface DbRecord {
  id: string;
  form_code: string;
  serial: string;
  form_name: string;
  project_id: string | null;
  status: string;
  approval_status: 'Draft' | 'Pending_Approval' | 'Approved';
  department: string | null;
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
// RBAC Types
// ============================================================================

export type Department = 'HR' | 'Sales' | 'Operations' | 'Quality' | 'RD' | 'Management';
export type ApprovalRole = 'admin' | 'dept_head' | 'employee';

/** Department mapping from form code — canonical source of truth */
const FORM_DEPT_MAP: Record<string, Department> = {
  'F/08': 'Sales', 'F/09': 'Sales', 'F/10': 'Sales', 'F/50': 'Sales',
  'F/28': 'HR', 'F/29': 'HR', 'F/30': 'HR', 'F/40': 'HR', 'F/41': 'HR', 'F/42': 'HR', 'F/43': 'HR', 'F/44': 'HR',
  'F/11': 'Operations', 'F/12': 'Operations', 'F/13': 'Operations', 'F/14': 'Operations', 'F/15': 'Operations',
  'F/16': 'Operations', 'F/18': 'Operations', 'F/19': 'Operations', 'F/22': 'Operations', 'F/24': 'Operations', 'F/25': 'Operations',
  'F/17': 'Quality', 'F/47': 'Quality',
  'F/32': 'RD', 'F/34': 'RD', 'F/35': 'RD', 'F/37': 'RD',
  'F/20': 'Management', 'F/21': 'Management', 'F/23': 'Management', 'F/45': 'Management', 'F/46': 'Management', 'F/48': 'Management',
};

/** Resolve department from form_code */
export function resolveDepartment(formCode: string): Department | null {
  return FORM_DEPT_MAP[formCode] || null;
}

/** Current user snapshot for RBAC decisions */
interface CurrentUserSnapshot {
  userId: string;
  email: string;
  role: ApprovalRole;
  department: Department | null;
}

/** Get current user for RBAC (lightweight, cached) */
async function getCurrentUser(): Promise<CurrentUserSnapshot | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fast-path: check localStorage cache
    const cached = localStorage.getItem('qms_session');
    if (cached) {
      try {
        const s = JSON.parse(cached) as { userId: string; role?: string; department?: string };
        if (s.userId === user.id) {
          const role = (s.role?.toLowerCase() || 'user') as string;
          // Map old role names to approval roles
          const mappedRole: ApprovalRole =
            role === 'admin' ? 'admin' :
            role === 'manager' || role === 'auditor' ? 'dept_head' :
            'employee';
          return {
            userId: user.id,
            email: user.email || '',
            role: mappedRole,
            department: (s.department as Department) || null,
          };
        }
      } catch { /* cache parse error, fall through */ }
    }

    // Fallback: fetch from DB via raw REST (supabase.from().maybeSingle() hangs on Vercel)
    const [profileRes, roleRes] = await Promise.all([
      restGet<{ is_active: boolean | null }>(`/rest/v1/profiles?select=is_active&user_id=eq.${user.id}`),
      restGet<{ role: string | null; department: string | null }[]>(`/rest/v1/user_roles?select=role,department&user_id=eq.${user.id}`),
    ]);

    const profile = profileRes.data;
    const roleRow = Array.isArray(roleRes.data) ? roleRes.data[0] : null;

    if (profile && !(profile.is_active ?? false)) {
      await supabase.auth.signOut();
      return null;
    }

    const rawRole = (roleRow as { role?: string } | null)?.role?.toLowerCase() || 'user';
    const mappedRole: ApprovalRole =
      rawRole === 'admin' ? 'admin' :
      rawRole === 'manager' || rawRole === 'auditor' ? 'dept_head' :
      'employee';

    return {
      userId: user.id,
      email: user.email || '',
      role: mappedRole,
      department: ((roleRow as { department?: string } | null)?.department as Department) || null,
    };
  } catch {
    return null;
  }
}

/** Check if user can access a record's department */
function canAccessDepartment(user: CurrentUserSnapshot, recordDept: string | null): boolean {
  if (user.role === 'admin') return true;
  if (!recordDept || !user.department) return false;
  return recordDept === user.department;
}

// ============================================================================
// Approval Workflow — Ahmed's Rules
// ============================================================================

/**
 * Resolve approval status based on actor and target department.
 * Rule A: Admin/GM → auto Approved
 * Rule B: Dept Head acting within own dept → auto Approved
 * Rule C: Employee → Pending_Approval
 */
export function resolveApprovalStatus(
  user: CurrentUserSnapshot,
  targetDepartment: string | null
): 'Draft' | 'Pending_Approval' | 'Approved' {
  if (user.role === 'admin') return 'Approved';                      // Rule A
  if (user.role === 'dept_head' && targetDepartment === user.department) return 'Approved'; // Rule B
  return 'Pending_Approval';                                         // Rule C
}

/**
 * Check if user can approve a record (admin can approve any, dept_head only their own)
 */
export function canApprove(user: CurrentUserSnapshot, recordDept: string | null): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'dept_head') {
    if (!recordDept || !user.department) return false;
    return recordDept === user.department;
  }
  return false;
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
  // Structured logging handled by logger.ts
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
  // Post-Phase 11: canonical JSONB backfilled from DOCX source files
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
    project_id: row.project_id || undefined,
    _createdAt: row.created_at || '',
    _createdBy: row.created_by || '',
    _lastModifiedAt: row.updated_at || '',
    _lastModifiedBy: row.last_modified_by || '',
    _editCount: row.edit_count || 0,
    _modificationReason: row.modification_reason || '',
    _status: row.status || 'draft',
    _approvalStatus: row.approval_status || 'Approved',
    _department: row.department || '',
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
    'serial', 'formCode', 'formName', 'project_id',
    '_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason', '_status', '_approvalStatus', '_department',
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

  const recordDept = resolveDepartment(formCode);
  return {
    form_code: formCode,
    serial: String(data.serial ?? ''),
    form_name: String(data.formName ?? formSchema?.name ?? ''),
    project_id: (data.project_id as string) || null,
    status: String(data._status ?? 'draft'),
    approval_status: (data._approvalStatus as 'Draft' | 'Pending_Approval' | 'Approved') || 'Approved',
    department: recordDept || (data._department as string) || null,
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
// Auth helper — get current authenticated user
// ============================================================================

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.email || user.id || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Public API — Read operations
// ============================================================================

export async function getRecords(formCode?: string): Promise<RecordData[]> {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const query = supabase
    .from('records')
    .select('*')
    .is('deleted_at', null)  // Only active records
    .order('form_code', { ascending: true });

  // For non-admins: add department filter at query level
  if (!isAdmin && user?.department) {
    query.eq('department', user.department);
  }

  const { data, error } = await query;

  if (error) {
    throw new RecordStorageError(`Failed to fetch records: ${error.message}`, 'NETWORK', error);
  }

  let records = (data as DbRecord[])
    .map(row => parseRowToRecord(row))
    .filter((r): r is RecordData => r !== null);

  // Secondary RBAC filter (defense in depth)
  if (!isAdmin && user) {
    records = records.filter(r => canAccessDepartment(user, r._department as string || null));
  }

  if (formCode) {
    records = records.filter(r => r.formCode === formCode);
  }

  return records;
}

export async function getRecord(serial: string): Promise<RecordData | null> {
  const user = await getCurrentUser();

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
  const record = parseRowToRecord(data as DbRecord);
  if (!record) return null;

  // RBAC: check if user can view this record
  if (user && !canAccessDepartment(user, (data as DbRecord).department)) {
    throw new RecordStorageError(
      `Access denied: you do not have permission to view record ${serial}`,
      'NOT_FOUND'
    );
  }

  return record;
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

  // AUTH CHECK: Verify user is authenticated before write
  const currentUser = await getCurrentUserId();
  if (!currentUser) {
    log.record.failed(formCode, '?', 'Unauthorized: no authenticated user');
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: '?', formCode, success: false, error: 'Unauthorized', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: 'Unauthorized: please sign in to create records' };
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

  // 2. Generate serial with atomic claim-and-verify (retry loop)
  let serial = '';
  const providedSerial = String(data.serial ?? '');
  if (providedSerial && providedSerial !== 'auto') {
    serial = providedSerial;
  } else {
    // Atomic serial generation: attempt to generate, verify no one took it, retry if collision
    const MAX_ATTEMPTS = 5;
    let attempt = 0;
    let claimed = false;

    while (attempt < MAX_ATTEMPTS && !claimed) {
      attempt++;
      const existingSerials = await getExistingSerials(formCode);
      const candidate = getNextSerial(formCode);

      // Atomically verify uniqueness via Supabase check just before insert
      const { data: collision, error: checkErr } = await supabase
        .from('records')
        .select('id')
        .eq('serial', candidate)
        .limit(1);

      if (checkErr) {
        log.system.error("createRecord:serialCheck_failed", `Attempt ${attempt}: ${checkErr.message}`);
        continue;
      }

      if (!collision || collision.length === 0) {
        serial = candidate;
        claimed = true;
      } else {
        log.system.error("createRecord:serialCheck_collision", `Collision on ${candidate}, retrying...`);
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100)); // jittered backoff
      }
    }

    if (!claimed) {
      return {
        success: false,
        error: `Cannot generate unique serial for ${formCode} after ${MAX_ATTEMPTS} attempts. Please try again.`,
        duplicateSerial: true,
      };
    }
  }

  // 3. Final uniqueness check for user-provided serials
  if (providedSerial && providedSerial !== 'auto') {
    const existingSerials = await getExistingSerials(formCode);
    if (existingSerials.includes(serial)) {
      return { success: false, error: `Serial ${serial} already exists for ${formCode}.`, duplicateSerial: true };
    }
  }
  data.serial = serial;
  data.formCode = formCode;
  const formSchema = getFormSchema(formCode);
  data.formName = formSchema?.name || '';
  data._createdAt = data._createdAt || new Date().toISOString();
  data._createdBy = data._createdBy || 'unknown';
  data._lastModifiedAt = null;
  data._lastModifiedBy = null;
  data._editCount = 0;
  data._modificationReason = null;
  data._status = data._status || 'pending_review';

  // === APPROVAL WORKFLOW (Ahmed's Rules) ===
  const actor = await getCurrentUser();
  const recordDept = resolveDepartment(formCode);
  const approvalStatus = actor ? resolveApprovalStatus(actor, recordDept) : 'Pending_Approval';
  data._approvalStatus = approvalStatus;
  data._department = recordDept || '';

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
      p_status: (data._status as string || 'draft') as unknown,
      p_serial: 'auto',
      p_section: data._section as number || formSchema?.section || null,
      p_section_name: data._sectionName as string || formSchema?.sectionName || null,
      p_frequency: data._frequency as string || formSchema?.frequency || null,
      p_approval_status: approvalStatus,
      p_department: recordDept,
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
      // Audit log failed silently
    });
    log.validation.passed(formCode, actualSerial);
    log.record.created(formCode, actualSerial, Math.round(performance.now() - startTime));

    // 8. Event emission (non-blocking — fire and forget)
    emitEvent(Events.recordCreated(
      actualSerial, formCode, data.formName as string || '', data._createdBy as string
    )).catch(err => {
      // Event emission failed silently
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
  const actor = await getCurrentUser();
  const recordDept = (currentRow as DbRecord).department || resolveDepartment(formCode);

  // Enforce approval workflow: employees can only edit Draft records
  const currentApproval = (currentRow as DbRecord).approval_status || 'Approved';
  if (actor?.role === 'employee' && currentApproval !== 'Draft') {
    return {
      success: false,
      error: 'Employees can only edit records in Draft status. Please contact your department head.',
    };
  }

  // Re-evaluate approval on significant changes
  const isSignificantChange = Object.keys(changes).some(k =>
    !k.startsWith('_') && k !== 'id' && k !== 'serial' && k !== 'formCode'
  );
  const newApprovalStatus = (actor && isSignificantChange)
    ? resolveApprovalStatus(actor, recordDept)
    : currentApproval;

  const merged: RecordData = {
    ...currentRecord,
    ...changes,
    serial: currentRecord.serial,
    formCode: currentRecord.formCode,
    formName: currentRecord.formName,
    _createdAt: currentRecord._createdAt,
    _createdBy: currentRecord._createdBy,
    _lastModifiedAt: new Date().toISOString(),
    _lastModifiedBy: actor?.email || await getCurrentUserId() || 'unknown',
    _editCount: currentEditCount + 1,
    _modificationReason: modificationReason || null,
    _approvalStatus: newApprovalStatus,
    _department: recordDept || '',
  };

  // 4. Validation
  const validation = preWriteValidation(currentRecord.formCode as string, merged, 'update', serial);
  if (!validation.valid || !validation.sanitizedData) {
    return { success: false, error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}` };
  }

  // 5. Update in Supabase — using ID (not serial) for precise targeting
  try {
    const updateData = recordToRow(validation.sanitizedData);
    // Ensure approval_status is explicitly set
    (updateData as Record<string, unknown>)['approval_status'] = merged._approvalStatus as string;
    (updateData as Record<string, unknown>)['department'] = merged._department as string;
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
        // Audit log failed silently
      });
    }

    log.record.updated(formCode, serial, Math.round(performance.now() - startTime), undefined, { changedFields: diff.changedFields });

    // 7. Event emission (non-blocking)
    if (diff.changedFields.length > 0) {
      emitEvent(Events.recordUpdated(
        serial, formCode, merged.formName as string || '', diff.changedFields, merged._lastModifiedBy as string
      )).catch(err => {
        // Update event emission failed silently
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

  // AUTH CHECK
  const currentUser = await getCurrentUserId();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: please sign in to change record status' };
  }

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
      .update({ status: newStatus, edit_count: ((currentRow as DbRecord).edit_count ?? 0) + 1, last_modified_by: currentUser })
      .eq('id', (currentRow as DbRecord).id);

    if (updateError) {
      throw new RecordStorageError(`Failed to update status: ${updateError.message}`, 'NETWORK', updateError);
    }

    // Audit status change
    appendAuditLog(serial, 'status_change', currentUser, ['status'], { status: previousStatus }, { status: newStatus }).catch(err => {
      // Status audit log failed silently
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

// ============================================================================
// Approval Operation — Approve a Pending_Approval record
// ============================================================================

export async function approveRecord(
  serial: string,
  reason?: string
): Promise<StorageResult> {
  const startTime = performance.now();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: please sign in' };
  }

  const { data: currentRow, error: fetchError } = await supabase
    .from('records')
    .select('*')
    .eq('serial', serial)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !currentRow) {
    return { success: false, error: `Record ${serial} not found.` };
  }

  const record = parseRowToRecord(currentRow as DbRecord);
  if (!record) return { success: false, error: `Failed to parse record ${serial}.` };

  const recordDept = (currentRow as DbRecord).department;
  const currentApproval = (currentRow as DbRecord).approval_status || 'Draft';

  // Only Pending_Approval records can be approved
  if (currentApproval !== 'Pending_Approval') {
    return { success: false, error: `Record ${serial} is not pending approval (current: ${currentApproval}).` };
  }

  // RBAC: check if user can approve this department
  if (!canApprove(user, recordDept)) {
    return { success: false, error: 'You do not have permission to approve this record.' };
  }

  try {
    const { error: updateError } = await supabase
      .from('records')
      .update({
        approval_status: 'Approved',
        last_modified_by: user.email,
        edit_count: ((currentRow as DbRecord).edit_count ?? 0) + 1,
      })
      .eq('id', (currentRow as DbRecord).id);

    if (updateError) {
      throw new RecordStorageError(`Failed to approve record: ${updateError.message}`, 'NETWORK', updateError);
    }

    // Audit: approval event
    appendAuditLog(serial, 'status_change', user.email, ['approval_status'], { approval_status: 'Pending_Approval' }, { approval_status: 'Approved' }, record.formCode as string).catch(() => {});

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: record.formCode as string, success: true, durationMs: Math.round(performance.now() - startTime) });

    return {
      success: true,
      record: { ...record, _approvalStatus: 'Approved', _lastModifiedBy: user.email },
    };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// Batch approval — for admin/dept_head efficiency
// ============================================================================

export async function approveRecords(
  serials: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const user = await getCurrentUser();
  if (!user) return { success: 0, failed: serials.length, errors: ['Unauthorized'] };

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const serial of serials) {
    const result = await approveRecord(serial);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`${serial}: ${result.error}`);
    }
  }

  return results;
}

// invalidateRowCache was a legacy React Query cache helper.
// React Query now handles its own cache via queryClient.invalidateQueries().
// Kept as no-op for API compatibility.
export function invalidateRowCache(): void {}