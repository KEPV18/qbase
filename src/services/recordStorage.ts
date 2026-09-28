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
import { getNextSerial, isSerialUnique, registerSerials } from '../schemas/serialAndDate';
import { appendAuditLog, computeDiff } from './auditLog';
import { log } from './logger';
import { emitEvent, Events } from './eventBus';
import { safeEmit } from '@/lib/safeEmit';
import { restGet } from './userService';

import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Database row type — mirrors the production `records` table exactly.
// Column list verified against the live PostgREST OpenAPI document
// (GET /rest/v1/ → definitions.records.properties); 17 columns, and there is
// deliberately NO `approval_status` and NO `department` column on `records`.
// The generated src/integrations/supabase/types.ts is STALE — it is missing
// `project_id` — so it is not used as the source of truth here.
// ============================================================================

interface DbRecord {
  id: string;
  form_code: string;
  serial: string;
  form_name: string;
  project_id: string | null;
  /** records.status — Postgres enum: draft | pending_review | approved | rejected */
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
// Status vocabulary — ONE source of truth
// ============================================================================
// The workflow state lives in the `records.status` column. The UI historically
// read a parallel `_approvalStatus` field, so that field is kept as a *derived
// label* rather than as independent state — two writable copies of one fact is
// what produced the drift being repaired here. The label spelling is preserved
// because ApprovalQueuePage and Index filter on these exact strings.

/** The production `record_status_enum` values, verbatim. */
export type RecordStatusEnum = 'draft' | 'pending_review' | 'approved' | 'rejected';

/** UI-facing label for a `records.status` value. */
export type ApprovalLabel = 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected';

/** records.status → UI label. Unknown values read as Draft, never as Approved. */
export function statusToApprovalLabel(status: string | null | undefined): ApprovalLabel {
  switch (String(status ?? '').trim().toLowerCase()) {
    case 'approved': return 'Approved';
    case 'pending_review': return 'Pending_Approval';
    case 'rejected': return 'Rejected';
    case 'draft': return 'Draft';
    default: return 'Draft';
  }
}

/** UI label → records.status. */
export function approvalLabelToStatus(label: string | null | undefined): RecordStatusEnum {
  switch (String(label ?? '').trim()) {
    case 'Approved': return 'approved';
    case 'Pending_Approval': return 'pending_review';
    case 'Rejected': return 'rejected';
    case 'Draft': return 'draft';
    default: return 'draft';
  }
}

/** Coerce an arbitrary string to a valid records.status value. */
export function toRecordStatusEnum(value: string | null | undefined): RecordStatusEnum {
  const v = String(value ?? '').trim().toLowerCase();
  return (v === 'draft' || v === 'pending_review' || v === 'approved' || v === 'rejected')
    ? v
    : 'draft';
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

/** Module-level cached user snapshot (populated by AuthProvider on login/session restore) */
let currentUserSnapshot: CurrentUserSnapshot | null = null;

/** Set the cached user snapshot (called by AuthProvider) */
export function setCurrentUserSnapshot(snapshot: CurrentUserSnapshot | null): void {
  currentUserSnapshot = snapshot;
}

/** Get the cached user snapshot — no network calls */
export function getCurrentUserSnapshot(): CurrentUserSnapshot | null {
  return currentUserSnapshot;
}

/** Clear the cached user snapshot (called on logout) */
export function clearCurrentUserSnapshot(): void {
  currentUserSnapshot = null;
}

/** Get current user for RBAC — now synchronous, reads from AuthProvider's cache */
/** @deprecated Use getCurrentUserSnapshot() from AuthContext instead */
async function getCurrentUser(): Promise<CurrentUserSnapshot | null> {
  // Return cached snapshot (no network calls)
  return getCurrentUserSnapshot();
}

/** Check if user can access a record's department */
function canAccessDepartment(user: CurrentUserSnapshot, recordDept: string | null): boolean {
  if (user.role === 'admin') return true;
  // If record has no department assigned, allow access (unassigned = no restriction)
  if (!recordDept) return true;
  // If user has no department, deny access to department-assigned records
  if (!user.department) return false;
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
 *
 * Returns a `records.status` enum value (the single workflow column), not a
 * label. Use statusToApprovalLabel() for display.
 */
export function resolveApprovalStatus(
  user: CurrentUserSnapshot,
  targetDepartment: string | null
): RecordStatusEnum {
  if (user.role === 'admin') return 'approved';                      // Rule A
  if (user.role === 'dept_head' && targetDepartment === user.department) return 'approved'; // Rule B
  return 'pending_review';                                           // Rule C
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

  // PROTECTED KEYS: These are authoritative DB metadata fields that must NEVER
  // be overwritten by form_data. If form_data contains these keys (e.g., from
  // a bad backfill where form_data.serial = "F/40" instead of "F/40-001"),
  // they are stripped here to preserve DB authority.
  const PROTECTED_KEYS = new Set([
    'id', 'serial', 'formCode', 'form_code', 'formName', 'form_name',
    'project_id', 'projectId',
    '_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy',
    '_deletedAt', '_editCount', '_modificationReason',
    '_status', '_approvalStatus', '_department',
    '_section', '_sectionName', '_frequency',
    'created_at', 'created_by', 'updated_at', 'last_modified_by',
    'edit_count', 'modification_reason', 'deleted_at',
    'approval_status', 'department', 'section', 'section_name', 'frequency',
  ]);

  // Strip any protected keys from form_data to prevent collisions
  for (const key of PROTECTED_KEYS) {
    if (key in formData) {
      // log.system.warn takes (event, message:string) — the object was being passed
      // as the message, which the logger cannot render.
      log.system.warn('parseRowToRecord:protected_key_stripped', JSON.stringify({
        formCode: row.form_code,
        serial: row.serial,
        strippedKey: key,
        formDataValue: formData[key],
        dbValue: (row as unknown as Record<string, unknown>)[key],
      }));
      delete formData[key];
    }
  }

  // Inject system metadata into the record data structure
  // Metadata keys are authoritative — form_data can never override them
  const recordData: RecordData = {
    ...formData,  // Business fields from form_data (protected keys already stripped)
    id: row.id || '',          // Supabase UUID — needed for delete RPC
    serial: row.serial || row.form_code,
    formCode: row.form_code,
    formName: row.form_name || '',
    project_id: row.project_id || undefined,
    _createdAt: row.created_at || '',
    _createdBy: row.created_by || '',
    _lastModifiedAt: row.updated_at || '',
    _lastModifiedBy: row.last_modified_by || '',
    _deletedAt: row.deleted_at || '',
    _editCount: row.edit_count || 0,
    _modificationReason: row.modification_reason || '',
    _status: toRecordStatusEnum(row.status),
    // Derived from the status column — records has no `approval_status` column.
    _approvalStatus: statusToApprovalLabel(row.status),
    // Derived from the form code — records has no `department` column.
    // FORM_DEPT_MAP is documented as the canonical form→department mapping.
    _department: resolveDepartment(row.form_code) || '',
    _section: row.section || 0,
    _sectionName: row.section_name || '',
    _frequency: row.frequency || '',
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

  return {
    form_code: formCode,
    serial: String(data.serial ?? ''),
    form_name: String(data.formName ?? formSchema?.name ?? ''),
    project_id: (data.project_id as string) || null,
    // The only writable workflow column. `_approvalStatus` is a derived label
    // for the UI and is deliberately NOT written anywhere.
    status: toRecordStatusEnum(data._status),
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
  const user = getCurrentUserSnapshot();
  const isAdmin = user?.role === 'admin';

  const query = supabase
    .from('records')
    .select('*')
    .is('deleted_at', null)  // Only active records
    .order('form_code', { ascending: true });

  // NOTE: `records` has no `department` column (verified against the live
  // PostgREST schema). A query-level `.eq('department', …)` here made the entire
  // read fail with PGRST204 for any user who had a department, so department
  // scoping is applied in memory below instead.

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

  // Feed the serial cache so getNextSerial() proposes a number beyond what
  // already exists. Nothing ever called registerSerials() before, so the cache
  // stayed empty forever and getNextSerial() always proposed F/XX-001, which
  // collides with the form's first record and fails createRecord's duplicate
  // check. The double-check inside createRecord still guards against a race.
  const serialsByForm = new Map<string, string[]>();
  for (const r of records) {
    const serial = r.serial;
    const code = r.formCode;
    if (!serial || !code) continue;
    const list = serialsByForm.get(code);
    if (list) list.push(serial);
    else serialsByForm.set(code, [serial]);
  }
  for (const [code, list] of serialsByForm) registerSerials(code, list);

  return records;
}

export async function getRecord(serial: string): Promise<RecordData | null> {
  const user = getCurrentUserSnapshot();

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

  // RBAC: check if user can view this record.
  // `records` has no department column — use the form→department mapping.
  if (user && !canAccessDepartment(user, resolveDepartment((data as DbRecord).form_code))) {
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
  const validation = preWriteValidation(formCode, formData, 'create', undefined, currentUser);
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

  // 2. Serial allocation.
  // The server owns serial allocation: create_record_validated takes p_serial and
  // returns out_serial, and production also exposes a dedicated get_next_serial
  // RPC. The previous implementation ran a "claim and verify" retry loop here
  // whose result was then discarded — the RPC call below always sent
  // p_serial: 'auto' — so it spent 1-5 extra queries per create and logged
  // collisions it never acted on. 'auto' is the sentinel this codebase already
  // uses (see AUTO_SERIAL in the Zod schema and preWriteValidation).
  const providedSerial = String(data.serial ?? '');
  const hasExplicitSerial = !!providedSerial && providedSerial !== 'auto';

  // 3. Uniqueness check for a caller-supplied serial. Not a substitute for a
  // server-side constraint — the server re-checks — but it turns the common case
  // into a clear error instead of a failed round trip.
  if (hasExplicitSerial) {
    const existingSerials = await getExistingSerials(formCode);
    if (existingSerials.includes(providedSerial)) {
      return { success: false, error: `Serial ${providedSerial} already exists for ${formCode}.`, duplicateSerial: true };
    }
  }
  data.serial = hasExplicitSerial ? providedSerial : 'auto';
  data.formCode = formCode;
  const formSchema = getFormSchema(formCode);
  data.formName = formSchema?.name || '';
  data._createdAt = data._createdAt || new Date().toISOString();
  // Attribute the record to the authenticated user. currentUser was resolved
  // above for the auth gate; preWriteValidation fills _createdBy from the actor
  // it is handed, so this is the last-resort fallback.
  data._createdBy = (data._createdBy as string) || currentUser;
  data._lastModifiedAt = null;
  data._lastModifiedBy = null;
  data._editCount = 0;
  data._modificationReason = null;

  // === APPROVAL WORKFLOW (Ahmed's Rules) ===
  // The workflow is authoritative here: a caller must not be able to choose an
  // arbitrary starting status. Previously `p_status` was taken straight from the
  // client payload, so an employee could create a record already marked approved.
  const actor = getCurrentUserSnapshot();
  const recordDept = resolveDepartment(formCode);
  const initialStatus: RecordStatusEnum = actor ? resolveApprovalStatus(actor, recordDept) : 'pending_review';
  data._status = initialStatus;
  data._approvalStatus = statusToApprovalLabel(initialStatus);
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

    // Parameter set copied from the live function signature (verified from the
    // PostgREST OpenAPI document: paths./rpc/create_record_validated.post
    // .parameters[in=body].schema). The previous call ALSO sent p_approval_status
    // and p_department. Neither is a parameter of this function, and PostgREST
    // resolves a named-argument call by matching the supplied key set against the
    // function's parameter names — so the key set never matched, the function was
    // never found, and EVERY record create failed with PGRST202 before the body
    // ran. p_created_by was a real parameter that was never sent.
    const { data: rpcResult, error } = await supabase.rpc('create_record_validated', {
      p_created_by: String(data._createdBy ?? ''),
      p_form_code: formCode,
      p_form_name: (data.formName as string) || formSchema?.name || '',
      p_form_data: businessData,
      p_status: data._status,
      p_serial: hasExplicitSerial ? providedSerial : 'auto',
      p_section: (data._section as number) || formSchema?.section || null,
      p_section_name: (data._sectionName as string) || formSchema?.sectionName || null,
      p_frequency: (data._frequency as string) || formSchema?.frequency || null,
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

    // Extract the server-assigned serial. Prefer the documented out_serial field,
    // then a returned row's own serial, then a caller-supplied serial that was
    // sent verbatim. If none is present we must NOT report success with a serial
    // we guessed — that is the "write-loss" class this codebase has been bitten
    // by, where a write is reported as succeeded and the record is not findable.
    const resultRow = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const actualSerial = resultRow?.out_serial || resultRow?.serial || (hasExplicitSerial ? providedSerial : '');
    const actualId = resultRow?.out_id || resultRow?.id;
    if (!actualSerial) {
      throw new RecordStorageError(
        'Record creation was not confirmed: the server returned no serial for the new record.',
        'UNKNOWN',
        rpcResult,
      );
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: actualSerial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 7. Audit log (non-blocking — fire and forget)
    const allFields = Object.keys(data).filter(k => !k.startsWith('_'));
    const newFieldValues: Record<string, unknown> = {};
    for (const key of allFields) { newFieldValues[key] = data[key]; }
    appendAuditLog(actualSerial, 'create', data._createdBy as string || 'unknown', allFields, {}, newFieldValues, formCode).catch(err => {
      log.audit.failed(actualSerial, String(err));
      console.error(`[AUDIT LOG FAILED] create ${actualSerial}:`, err);
      // Audit log failed - log to console for monitoring
    });
    log.validation.passed(formCode, actualSerial);
    log.record.created(formCode, actualSerial, Math.round(performance.now() - startTime));

    // 8. Event emission (non-blocking — fire and forget)
    emitEvent(Events.recordCreated(
      actualSerial, formCode, data.formName as string || '', data._createdBy as string
    )).catch(err => {
      console.error(`[EVENT EMISSION FAILED] create ${actualSerial}:`, err);
    });

    // Update the data object with actual serial AND id for return
    data.serial = actualSerial;
    data.id = actualId;
    return { success: true, record: data };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: String(data.serial ?? ''), formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
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
  const actor = getCurrentUserSnapshot();
  // `records` has no department column — the form→department map is authoritative.
  const recordDept = resolveDepartment(formCode);
  const currentStatus = toRecordStatusEnum((currentRow as DbRecord).status);

  // Enforce approval workflow: employees can only edit Draft records
  if (actor?.role === 'employee' && currentStatus !== 'draft') {
    return {
      success: false,
      error: 'Employees can only edit records in Draft status. Please contact your department head.',
    };
  }

  // Re-evaluate approval on significant changes
  const isSignificantChange = Object.keys(changes).some(k =>
    !k.startsWith('_') && k !== 'id' && k !== 'serial' && k !== 'formCode'
  );
  const newStatus: RecordStatusEnum = (actor && isSignificantChange)
    ? resolveApprovalStatus(actor, recordDept)
    : currentStatus;

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
    // `status` is the single writable workflow field; the label is derived from it
    // so the two can never disagree.
    _status: newStatus,
    _approvalStatus: statusToApprovalLabel(newStatus),
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
    // NOTE: there is deliberately no approval_status / department assignment here.
    // Neither column exists on `records` (verified against the live PostgREST
    // schema), so supplying them made PostgREST reject the entire UPDATE with
    // PGRST204 and every save of an existing record failed. The workflow state is
    // carried by `status`, which recordToRow writes.
    // Remove id from update payload — we don't update the primary key
    const { id: _id, ...updateFields } = updateData as DbRecord & { id?: string };

    // .select() is required to observe the outcome: PostgREST answers a 0-row
    // UPDATE with HTTP 200 and no error, so without reading the affected rows back
    // we would report success for a write that changed nothing (including an
    // UPDATE silently refused by RLS).
    const { data: updatedRows, error: updateError } = await supabase
      .from('records')
      .update(updateFields)
      .eq('id', (currentRow as DbRecord).id)
      .select('id');

    if (updateError) {
      throw new RecordStorageError(`Failed to update record: ${updateError.message}`, 'NETWORK', updateError);
    }
    if (!updatedRows || updatedRows.length === 0) {
      throw new RecordStorageError(
        `Record ${serial} was not updated: no row matched id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
      );
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 6. Audit log
    const diff = computeDiff(currentRecord, validation.sanitizedData);
    if (diff.changedFields.length > 0) {
      appendAuditLog(serial, 'update', merged._lastModifiedBy as string || 'unknown', diff.changedFields, diff.previousValues, diff.newValues, formCode).catch(err => {
        log.audit.failed(serial, String(err));
        console.error(`[AUDIT LOG FAILED] update ${serial}:`, err);
        // Audit log failed - log to console for monitoring
      });
    }

    log.record.updated(formCode, serial, Math.round(performance.now() - startTime), undefined, { changedFields: diff.changedFields });

    // 7. Event emission (non-blocking)
    if (diff.changedFields.length > 0) {
      emitEvent(Events.recordUpdated(
        serial, formCode, merged.formName as string || '', diff.changedFields, merged._lastModifiedBy as string
      )).catch(err => {
        console.error(`[EVENT EMISSION FAILED] update ${serial}:`, err);
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
    }).catch(err => {
      console.error(`[EVENT EMISSION FAILED] delete ${id}:`, err);
    });

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

  // Validate against the real enum before writing. Passing an unknown value would
  // otherwise reach Postgres and fail there as 22P02 with a less useful message.
  const targetStatus = String(newStatus ?? '').trim().toLowerCase();
  if (targetStatus !== 'draft' && targetStatus !== 'pending_review' && targetStatus !== 'approved' && targetStatus !== 'rejected') {
    return {
      success: false,
      error: `Invalid status "${newStatus}". Expected one of: draft, pending_review, approved, rejected.`,
    };
  }

  try {
    const { data: statusRows, error: updateError } = await supabase
      .from('records')
      .update({ status: targetStatus, edit_count: ((currentRow as DbRecord).edit_count ?? 0) + 1, last_modified_by: currentUser })
      .eq('id', (currentRow as DbRecord).id)
      .select('id');

    if (updateError) {
      throw new RecordStorageError(`Failed to update status: ${updateError.message}`, 'NETWORK', updateError);
    }
    // A 0-row UPDATE returns 200 with no error — verify the row was actually changed.
    if (!statusRows || statusRows.length === 0) {
      throw new RecordStorageError(
        `Status for ${serial} was not changed: no row matched id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
      );
    }

    // Audit status change
    appendAuditLog(serial, 'status_change', currentUser, ['status'], { status: previousStatus }, { status: targetStatus }).catch(err => {
      log.audit.failed(serial, `status_change: ${String(err)}`);
    });

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });
    return { success: true, record: { ...currentRecord, _status: targetStatus, _approvalStatus: statusToApprovalLabel(targetStatus) } };
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
  const user = getCurrentUserSnapshot();

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

  const recordDept = resolveDepartment(String((currentRow as DbRecord).form_code || ''));
  const currentStatus = toRecordStatusEnum((currentRow as DbRecord).status);

  // Only a record awaiting review can be approved
  if (currentStatus !== 'pending_review') {
    return { success: false, error: `Record ${serial} is not pending review (current status: ${currentStatus}).` };
  }

  // RBAC: check if user can approve this department
  if (!canApprove(user, recordDept)) {
    return { success: false, error: 'You do not have permission to approve this record.' };
  }

  try {
    // The approval decision is written to `status` — the only workflow column that
    // exists on `records`. It previously wrote an `approval_status` column that does
    // not exist, so the approval never persisted.
    const { data: approvedRows, error: updateError } = await supabase
      .from('records')
      .update({
        status: 'approved',
        last_modified_by: user.email,
        edit_count: ((currentRow as DbRecord).edit_count ?? 0) + 1,
      })
      .eq('id', (currentRow as DbRecord).id)
      .select('id');

    if (updateError) {
      throw new RecordStorageError(`Failed to approve record: ${updateError.message}`, 'NETWORK', updateError);
    }
    if (!approvedRows || approvedRows.length === 0) {
      throw new RecordStorageError(
        `Approval of ${serial} was not applied: no row matched id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
      );
    }

    // Audit: approval event
    appendAuditLog(serial, 'status_change', user.email, ['status'], { status: 'pending_review' }, { status: 'approved' }, record.formCode as string).catch(err => {
      log.audit.failed(serial, `approve: ${String(err)}`);
    });

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: record.formCode as string, success: true, durationMs: Math.round(performance.now() - startTime) });

    return {
      success: true,
      record: { ...record, _status: 'approved', _approvalStatus: 'Approved', _lastModifiedBy: user.email },
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
  const user = getCurrentUserSnapshot();
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

// ============================================================================
// Archive — fetch, restore, purge
// ============================================================================

export async function getArchivedRecords(): Promise<RecordData[]> {
  const user = getCurrentUserSnapshot();
  const isAdmin = user?.role === 'admin';

  // NOTE: this used to call purgeOldArchives() before reading, and that function
  // permanently DELETEs every record soft-deleted more than 30 days ago. That made
  // merely opening the archive page — a read — destroy data, with no confirmation,
  // no audit entry and no recovery except a backup. Retention enforcement needs to
  // be an explicit, scheduled, audited job rather than a side effect of a read, so
  // it is no longer invoked from here. purgeOldArchives() is left intact for that job.
  const query = supabase
    .from('records')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  // Same as getRecords: `records.department` does not exist, so no query-level
  // department filter. The in-memory filter below is the actual scoping.

  const { data, error } = await query;
  if (error) {
    throw new RecordStorageError(`Failed to fetch archived records: ${error.message}`, 'NETWORK', error);
  }

  let archived = (data as DbRecord[])
    .map(row => parseRowToRecord(row))
    .filter((r): r is RecordData => r !== null);

  if (!isAdmin && user) {
    archived = archived.filter(r => canAccessDepartment(user, (r._department as string) || null));
  }

  return archived;
}

export async function restoreRecord(id: string): Promise<StorageResult> {
  const startTime = performance.now();
  try {
    const { data: restored, error } = await supabase
      .from('records')
      .update({ deleted_at: null })
      .eq('id', id)
      .select('id');

    if (error) {
      throw new RecordStorageError(`Failed to restore record: ${error.message}`, 'NETWORK', error);
    }
    // Without .select() a 0-row UPDATE reports 200 and we would claim a restore
    // that never happened (missing row, or an UPDATE refused by RLS).
    if (!restored || restored.length === 0) {
      throw new RecordStorageError(
        `Record ${id} was not restored: no row matched that id.`,
        'NOT_FOUND',
      );
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial: id, formCode: '?', success: true, durationMs: Math.round(performance.now() - startTime) });
    safeEmit(
      emitEvent({
        // EventAction has no 'restore' member; a restore is an update of deleted_at.
        // The distinct eventType below still records what actually happened.
        action: 'update', category: 'records', priority: 'important',
        eventType: 'record.restored', title: 'Record Restored',
        message: `A record was restored from archive (id: ${id.substring(0, 8)}...).`,
        targetId: id, metadata: { recordId: id },
      }),
      'emitEvent:record.restored'
    );

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial: id, formCode: '?', success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: errorMsg };
  }
}

async function purgeOldArchives(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error } = await supabase
    .from('records')
    .delete()
    .lt('deleted_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Failed to purge old archived records:', error.message);
  }
}

// invalidateRowCache was a legacy React Query cache helper.
// React Query now handles its own cache via queryClient.invalidateQueries().
// Kept as no-op for API compatibility.
export function invalidateRowCache(): void {}