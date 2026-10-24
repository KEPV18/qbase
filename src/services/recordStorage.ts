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
import { bulkTransitionRecords } from './bulkRecordOps';

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
// Protected keys — ONE source of truth
// ============================================================================

/**
 * The keys that belong to the DATABASE, not to the form.
 *
 * `form_data` is the business content of a record; these keys are the
 * record's identity and workflow state, and the columns (or the engine)
 * own them.  `parseRowToRecord` strips them out of `form_data` so that a
 * form can never overwrite them — and `updateRecord` puts back the ones the
 * stored `form_data` really carries, so that stripping never becomes a
 * deletion (see the Zero Data Loss note in `updateRecord`).
 */
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

/** Is this value "nothing" — absent, blank, or an empty list? */
function isBlankValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
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
  // F/49 — Document Master List, section 7 (Management & Documentation), the
  // same section as F/45/F/46/F/48.  Without it `resolveDepartment` returned
  // null, so a F/49 record carried no department and the department-scoped
  // row-level policy could not see it.
  'F/49': 'Management',
};

/** Resolve department from form_code */
export function resolveDepartment(formCode: string): Department | null {
  return FORM_DEPT_MAP[formCode] || null;
}

/** Current user snapshot for RBAC decisions */
export interface CurrentUserSnapshot {
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
  /** Set when the primary write succeeded but a follow-up was refused
   * (e.g. the workflow engine refused a status move). Never swallowed. */
  warning?: string;
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

  // PROTECTED KEYS (see the module-level list): these are authoritative DB
  // metadata fields that must NEVER be overwritten by form_data. If form_data
  // contains these keys (e.g., from a bad backfill where form_data.serial =
  // "F/40" instead of "F/40-001"), they are stripped here to preserve DB
  // authority — and `updateRecord` puts the stored value back, so that
  // stripping never deletes anything.

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

/**
 * The authenticated account's UUID.
 *
 * `getCurrentUserId` answers the E-MAIL, because that is what the register
 * shows and what the policies compare `created_by` against.  The create
 * RPC's `p_created_by` is a `uuid`, though, and the e-mail raised
 * "invalid input syntax for type uuid" — so no record could be created
 * through that path at all.  The function now resolves the author from the
 * session; this uuid is the value its parameter has always wanted, and the
 * fallback for a call with no session.
 */
async function getCurrentUserAuthId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id || null;
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

  const baseQuery = supabase
    .from('records')
    .select('*')
    .is('deleted_at', null)  // Only active records
    .order('form_code', { ascending: true });

  // NOTE: `records` has no `department` column (verified against the live
  // PostgREST schema). A query-level `.eq('department', …)` here made the entire
  // read fail with PGRST204 for any user who had a department, so department
  // scoping is applied in memory below instead.

  // The FORM filter belongs in the query, not in JavaScript.
  //
  // `select('*')` without it downloads EVERY record of EVERY form — including
  // each record's whole `form_data` blob — and throws the rest away in the
  // filter at the bottom of this function.  The form-scoped callers (the
  // serial list, the register view, the import check) paid for the entire
  // table on every call.  The in-memory filter stays below as a safety net.
  const query = formCode ? baseQuery.eq('form_code', formCode) : baseQuery;

  const { data, error } = await query;

  if (error) {
    throw new RecordStorageError(`Failed to fetch records: ${error.message}`, 'NETWORK', error);
  }

  let records = (data as DbRecord[])
    .map(row => parseRowToRecord(row))
    .filter((r): r is RecordData => r !== null);

  // Secondary RBAC filter (defense in depth)
  if (!isAdmin && user) {
    records = records.filter(r => {
      // A user may always see the records they created.
      //
      // The row-level policy grants exactly that (`created_by = auth.uid()`),
      // but the client filter did not: an employee whose account has no
      // department assigned was denied every record of a department that is
      // not theirs — INCLUDING the ones they had created themselves — so the
      // register showed them an empty list while the database had returned
      // their own rows.  The filter is now the same rule the policy is.
      if (user.userId && r._createdBy === user.userId) return true;
      // The author is stored as the actor's E-MAIL (the engine stamps it
      // that way — see record_draft_create and create_record_validated),
      // and 14 legacy rows carry the account's uuid instead.  Both are the
      // same person, so both are the owner.
      if (user.email && r._createdBy === user.email) return true;
      return canAccessDepartment(user, r._department as string || null);
    });
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

  // The account's uuid — the type `p_created_by` declares.  The e-mail
  // (`currentUser`) is what the register shows; the uuid is what the
  // parameter takes.
  const authId = await getCurrentUserAuthId();

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
      // The account's uuid.  It used to be the e-mail, which the `uuid`
      // parameter rejected — every create failed with "invalid input
      // syntax for type uuid".  The function now stamps the author from
      // the session, so the e-mail in the register is the one the session
      // carries, and this is only the fallback.
      p_created_by: authId ?? null,
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

// ============================================================================
// Public API — Draft operations (Prime §D4 autosave-draft flow)
//
// A draft row is created server-side the moment a user opens a creation form
// (record_draft_create: idempotent per creator+form, server-allocated serial),
// kept current by debounced record_draft_autosave calls, and finalized at
// submit by record_transition, which enforces Ahmed's Rules server-side.
// The browser never writes tables directly.
// ============================================================================

/** Shared error mapping for the engine RPCs (permission / edge / not-found). */
function mapEngineError(msg: string): string {
  if (msg.includes('Insufficient role') || msg.includes('Access denied')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('is not permitted') || msg.includes('Invalid target status')) {
    return 'This status change is not allowed by the workflow.';
  }
  if (msg.includes('not found') || msg.includes('P0002')) {
    return 'This record no longer exists.';
  }
  if (msg.includes('not a draft') || msg.includes('Only draft')) {
    return 'This draft was already submitted or no longer exists.';
  }
  return msg;
}

/** Result of a draft operation that must confirm the server-side row. */
export interface DraftResult {
  id: string;
  serial: string;
  /** Business content already saved on the draft (non-empty when resuming). */
  savedData: Record<string, unknown>;
}

/**
 * Create — or resume — the caller's server-side draft for a form.
 * Idempotent per (creator, form): the RPC returns the caller's existing
 * unfinished draft instead of forking a duplicate, so opening a form twice
 * (or retrying after a network blip) can never multiply drafts. The serial is
 * allocated server-side across ALL rows (archived included), never client-side.
 */
export async function createDraftRecord(
  formCode: string,
  initialData: Record<string, unknown>,
  meta: { formName?: string; section?: number; sectionName?: string; frequency?: string } = {},
): Promise<DraftResult & { error?: string; success: boolean }> {
  const currentUser = await getCurrentUserId();
  if (!currentUser) {
    return { id: '', serial: '', savedData: {}, success: false, error: 'Unauthorized: please sign in to create records' };
  }

  const { data: rpcResult, error } = await supabase.rpc('record_draft_create', {
    p_form_code: formCode,
    p_form_data: initialData ?? {},
    p_form_name: meta.formName ?? null,
    p_section: meta.section ?? null,
    p_section_name: meta.sectionName ?? null,
    p_frequency: meta.frequency ?? null,
  });

  if (error) {
    log.system.error('recordStorage:draft_create_failed', `${formCode}: ${error.message}`);
    return { id: '', serial: '', savedData: {}, success: false, error: error.message };
  }

  const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!row?.id || !row?.serial) {
    // Same write-loss class as createRecord: never report success without a
    // server-confirmed identity.
    log.system.error('recordStorage:draft_create_unconfirmed', `${formCode}: no row returned`);
    return { id: '', serial: '', savedData: {}, success: false, error: 'Draft creation was not confirmed by the server.' };
  }

  // Resumed drafts carry previously saved content; hand it back so the UI can
  // fill the form with what the user had.
  const savedBusiness = ((row as DbRecord).form_data as Record<string, unknown>) || {};
  logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: String(row.serial), formCode, success: true, durationMs: 0 });
  return {
    id: String(row.id),
    serial: String(row.serial),
    savedData: { ...savedBusiness, serial: String(row.serial) },
    success: true,
  };
}

/** Debounced per-field autosave target: refresh the draft's form_data. */
export async function autosaveRecordDraft(
  draftId: string,
  formContent: Record<string, unknown>,
): Promise<StorageResult> {
  const { error } = await supabase.rpc('record_draft_autosave', {
    p_draft_id: draftId,
    p_form_data: formContent ?? {},
  });
  if (error) {
    log.system.error('recordStorage:draft_autosave_failed', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Discard only the caller's own unsent draft (tombstone-audited server-side). */
export async function discardRecordDraft(draftId: string): Promise<StorageResult> {
  const { error } = await supabase.rpc('record_discard_draft', { p_draft_id: draftId });
  if (error) {
    const msg = (error as Error)?.message || String(error);
    log.system.error('recordStorage:draft_discard_failed', msg);
    return { success: false, error: mapEngineError(msg) };
  }
  return { success: true };
}

/**
 * Finalize a draft: one server-side final autosave, then ONE workflow
 * transition to the actor's resolved status (admin / owning dept_head →
 * approved; employee → pending_review — the engine enforces these rules
 * server-side and refuses unauthorized transitions before anything commits).
 *
 * Schema completeness (required fields) is enforced client-side immediately
 * before this call — the same trust boundary the live update path has
 * (update_record_versioned performs no Zod validation server-side); the
 * server remains the authority for identity, permissions and workflow.
 */
export async function submitRecordDraft(
  draftId: string,
  finalContent: Record<string, unknown>,
  targetStatus: RecordStatusEnum,
): Promise<StorageResult> {
  const currentUser = await getCurrentUserId();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: please sign in to create records' };
  }

  // Final save first: the form content lands even if the transition is then
  // refused, so nothing the user typed is lost.
  const saveResult = await autosaveRecordDraft(draftId, finalContent);
  if (!saveResult.success) {
    return { success: false, error: `Final save failed: ${saveResult.error}` };
  }

  const { data: transitionRows, error: transitionError } = await supabase.rpc(
    'record_transition',
    {
      p_record_id: draftId,
      p_target_status: targetStatus,
      p_reason: 'created from draft',
    } as never,
  );
  if (transitionError) {
    const msg = (transitionError as Error)?.message || String(transitionError);
    log.system.error('recordStorage:draft_submit_transition_refused', msg);
    return { success: false, error: mapEngineError(msg) };
  }

  const row = Array.isArray(transitionRows) ? transitionRows[0] : transitionRows;
  if (!row?.serial) {
    return { success: false, error: 'Submission was not confirmed: the server returned no record.' };
  }
  const record = parseRowToRecord(row as DbRecord);
  if (!record) {
    return { success: false, error: `Failed to parse the submitted record ${row.serial}.` };
  }
  return { success: true, record };
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
  //
  // `currentRecord` is handed over as the STORED state: a required field the
  // record never carried is not an error this edit introduced, so it must
  // not block the save (all 69 stored F/43 records lack the `inductee_signature`
  // the schema requires — the document stores it as `inductee_sign`).
  const validation = preWriteValidation(currentRecord.formCode as string, merged, 'update', serial, undefined, currentRecord);
  if (!validation.valid || !validation.sanitizedData) {
    return { success: false, error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}` };
  }

  // 5. Write through the server-side engine — NO direct table writes.
  // update_record_versioned owns the concurrent-safe write, the before-write
  // version snapshot (non-drafts), the audit row and edit_count bump;
  // record_transition is the single authority for workflow state (Prime §5/§6).
  try {
    // form_data carries the business fields exactly like the create path does;
    // metadata columns are handled by the engine from the row itself.
    const businessData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.sanitizedData)) {
      if (key === 'id' || key === 'formCode' || key === 'formName' || key === 'serial' ||
          key.startsWith('_')) continue;
      businessData[key] = value;
    }

    // Zero Data Loss: `update_record_versioned` REPLACES form_data wholesale,
    // so a key that is dropped here is DELETED from the record.
    //
    // `parseRowToRecord` strips the PROTECTED keys out of form_data — they
    // are authoritative DB metadata — but the stored form_data of 229 live
    // records carries one anyway: `serial` (316 records), `department`
    // (215), `frequency` (8), `created_by` (5) and `approval_status` (1).
    // The first edit of any of those records deleted it.
    //
    // The rule: a stored value is KEPT when the edit did not supply one.
    // The key is absent from the payload, or the payload's value is empty
    // — the latter because the app hides the protected value, so the form
    // renders the field blank and an untouched field must not wipe what is
    // stored.  A value the user DID type still wins, and an ordinary
    // business field can still be cleared as usual.
    const storedFormData = (currentRow as DbRecord).form_data as Record<string, unknown> | null;
    if (storedFormData) {
      for (const key of Object.keys(storedFormData)) {
        if (!PROTECTED_KEYS.has(key)) continue;
        const storedValue = storedFormData[key];
        const payloadValue = businessData[key];
        if (payloadValue === undefined || isBlankValue(payloadValue)) {
          if (!isBlankValue(storedValue)) businessData[key] = storedValue;
        }
      }
    }

    // NOTE: neither approval_status nor department is sent — neither column
    // exists on `records` (verified against the live PostgREST schema). The
    // workflow state is carried by `status` and moves only via record_transition.
    const { data: rpcRows, error: updateError } = await supabase.rpc('update_record_versioned', {
      p_id: (currentRow as DbRecord).id,
      p_form_data: businessData,
      // The count was read moments ago; the server re-checks it under the row
      // lock, so any concurrent modification is still caught there.
      p_expected_edit_count: currentEditCount,
      p_last_modified_by: merged._lastModifiedBy ?? null,
      p_modification_reason: modificationReason ?? null,
      p_section: (Number(validation.sanitizedData._section) || null) as number | null,
      p_section_name: (validation.sanitizedData._sectionName as string) || null,
      p_frequency: (validation.sanitizedData._frequency as string) || null,
      p_change_summary: modificationReason || 'edit',
    });

    if (updateError) {
      throw new RecordStorageError(`Failed to update record: ${updateError.message}`, 'NETWORK', updateError);
    }
    const updatedRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!updatedRow || !updatedRow.id) {
      throw new RecordStorageError(
        `Record ${serial} was not updated: the server returned no row for id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
        rpcRows,
      );
    }

    // If the save implies a workflow move (Ahmed's Rules: Rule A/B actors land
    // their significant edits as approved, employees submit to review), the
    // state change goes through record_transition — the engine validates the
    // edge and the actor's server-derived role. A refused edge (e.g. a
    // rejected record may only return to Draft for rework) leaves the saved
    // data in its current state and is surfaced as a warning, never hidden.
    let finalRecord: RecordData = {
      ...validation.sanitizedData,
      _status: currentStatus,
      _approvalStatus: statusToApprovalLabel(currentStatus),
    };
    let warning: string | undefined;
    if (newStatus !== currentStatus) {
      const { data: transitionRow, error: transitionError } = await supabase.rpc('record_transition', {
        p_record_id: (currentRow as DbRecord).id,
        p_target_status: newStatus,
        p_reason: modificationReason || `edit: ${currentStatus} → ${newStatus}`,
      });
      if (transitionError) {
        warning = `Saved, but the status change to ${newStatus} was refused by the workflow engine: ${transitionError.message}`;
        log.system.warn('RecordStorage:transition_refused', warning);
      } else {
        const row = Array.isArray(transitionRow) ? transitionRow[0] : transitionRow;
        if (row?.id) {
          const mapped = parseRowToRecord(row as DbRecord);
          if (mapped) finalRecord = mapped;
        }
      }
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // Field-level diff detail for the in-memory operation log and events. The
    // authoritative audit row is written server-side by update_record_versioned.
    const diff = computeDiff(currentRecord, validation.sanitizedData);

    log.record.updated(formCode, serial, Math.round(performance.now() - startTime), undefined, { changedFields: diff.changedFields });

    // Event emission (non-blocking)
    if (diff.changedFields.length > 0) {
      emitEvent(Events.recordUpdated(
        serial, formCode, merged.formName as string || '', diff.changedFields, merged._lastModifiedBy as string
      )).catch(err => {
        console.error(`[EVENT EMISSION FAILED] update ${serial}:`, err);
      });
    }

    return { success: true, record: finalRecord, warning };
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
    // The workflow engine is the single authority for status changes: it
    // validates the transition edge against the server-side state graph and
    // the actor's server-derived role, bumps edit_count and writes the audit
    // row itself. The previous direct-table UPDATE let any authenticated
    // session set any status (no permission check, no state validation).
    const { data: transitionRows, error: transitionError } = await supabase.rpc('record_transition', {
      p_record_id: (currentRow as DbRecord).id,
      p_target_status: targetStatus,
      p_reason: reason ?? null,
    });

    if (transitionError) {
      const msg = transitionError.message || '';
      if (msg.includes('is not permitted') || msg.includes('23514')) {
        return { success: false, error: `That status change is not allowed by the workflow: ${msg}` };
      }
      if (msg.includes('Insufficient role') || msg.includes('Access denied') || msg.includes('42501')) {
        return { success: false, error: 'You do not have permission to make this status change.' };
      }
      throw new RecordStorageError(`Failed to update status: ${msg}`, 'NETWORK', transitionError);
    }
    // PostgREST answers an RPC that matched no row with an empty set — treat
    // that as a failed write, never a success.
    const transitionRow = Array.isArray(transitionRows) ? transitionRows[0] : transitionRows;
    if (!transitionRow || !transitionRow.id) {
      throw new RecordStorageError(
        `Status for ${serial} was not changed: the server returned no row for id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
        transitionRows,
      );
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    const transitioned = parseRowToRecord(transitionRow as DbRecord);
    return {
      success: true,
      record: transitioned
        ? transitioned
        : { ...currentRecord, _status: targetStatus, _approvalStatus: statusToApprovalLabel(targetStatus) },
    };
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
    // The approval is a workflow transition through the engine (Prime §6):
    // record_transition validates the pending_review → approved edge and the
    // actor's server-derived role (admin, or a dept_head of the owning
    // department), bumps edit_count and writes the audit row itself. The
    // previous direct-table UPDATE had no server-side permission check —
    // any authenticated session could write `status: approved` directly.
    const { data: approvedRows, error: updateError } = await supabase.rpc('record_transition', {
      p_record_id: (currentRow as DbRecord).id,
      p_target_status: 'approved',
      p_reason: reason ?? null,
    });

    if (updateError) {
      const msg = updateError.message || '';
      if (msg.includes('Insufficient role') || msg.includes('Access denied') || msg.includes('42501')) {
        return { success: false, error: 'You do not have permission to approve this record.' };
      }
      if (msg.includes('is not permitted') || msg.includes('23514')) {
        return { success: false, error: `Approval is not an allowed status change: ${msg}` };
      }
      throw new RecordStorageError(`Failed to approve record: ${msg}`, 'NETWORK', updateError);
    }
    const approvedRow = Array.isArray(approvedRows) ? approvedRows[0] : approvedRows;
    if (!approvedRow || !approvedRow.id) {
      throw new RecordStorageError(
        `Approval of ${serial} was not applied: the server returned no row for id ${(currentRow as DbRecord).id}.`,
        'NOT_FOUND',
        approvedRows,
      );
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: record.formCode as string, success: true, durationMs: Math.round(performance.now() - startTime) });

    const approved = parseRowToRecord(approvedRow as DbRecord);
    return {
      success: true,
      record: approved
        ? approved
        : { ...record, _status: 'approved', _approvalStatus: 'Approved', _lastModifiedBy: user.email },
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
  if (!serials.length) return results;

  // ONE read for the whole queue.
  //
  // The old loop read the queue ONE RECORD AT A TIME and then moved each
  // record with its own transition: 2N round trips, and a dropped
  // connection half-way through left a queue that was neither approved nor
  // rejected.  The rules are unchanged — only pending_review records can
  // be approved, and only by someone allowed to approve that department —
  // but the queue is now read once and moved once.
  const { data: rows, error: fetchError } = await supabase
    .from('records')
    .select('id, serial, form_code, status')
    .in('serial', serials)
    .is('deleted_at', null);

  if (fetchError) {
    return {
      success: 0,
      failed: serials.length,
      errors: [`Could not read the queue: ${fetchError.message}`],
    };
  }

  const bySerial = new Map(
    ((rows ?? []) as { id: string; serial: string; form_code: string; status: string }[])
      .map(r => [r.serial, r]),
  );

  const eligible: { id: string; serial: string }[] = [];
  for (const serial of serials) {
    const row = bySerial.get(serial);
    if (!row) {
      results.failed++;
      results.errors.push(`${serial}: record not found`);
      continue;
    }
    const status = toRecordStatusEnum(row.status);
    if (status !== 'pending_review') {
      results.failed++;
      results.errors.push(`${serial}: record is not pending review (current status: ${status})`);
      continue;
    }
    const recordDept = resolveDepartment(String(row.form_code || ''));
    if (!canApprove(user, recordDept)) {
      results.failed++;
      results.errors.push(`${serial}: you do not have permission to approve this record`);
      continue;
    }
    eligible.push({ id: row.id, serial });
  }

  if (!eligible.length) return results;

  // ONE transition for the whole queue.  The server applies the SAME
  // transition graph and the SAME role rules the single path applies —
  // `record_transition` is called, not re-implemented — so a bulk approval
  // can never be more permissive than a single one.  A refused record is
  // reported; the others still move.
  const outcome = await bulkTransitionRecords(
    eligible.map(e => e.id),
    'approved',
    'bulk approval',
  );

  const refused = new Map(
    outcome.rows
      .filter(r => r.status !== 'transitioned')
      .map(r => [r.id, r.error ?? 'the transition was refused']),
  );

  for (const entry of eligible) {
    const error = refused.get(entry.id);
    if (error) {
      results.failed++;
      results.errors.push(`${entry.serial}: ${error}`);
    } else {
      results.success++;
      logOperation({
        timestamp: new Date().toISOString(),
        operation: 'update',
        serial: entry.serial,
        formCode: bySerial.get(entry.serial)?.form_code ?? '',
        success: true,
        durationMs: 0,
      });
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
    // Restores ride the engine (record_restore): manager-class actor scoped to
    // the record's department (admin bypasses), audited server-side. The
    // previous direct-table UPDATE on deleted_at had no permission check and
    // no audit trail.
    const { data: restoredRows, error } = await supabase.rpc('record_restore', {
      p_record_id: id,
    });

    if (error) {
      const msg = error.message || '';
      if (error.code === '23514' || msg.includes('not archived')) {
        throw new RecordStorageError('Record is not archived.', 'VALIDATION', error);
      }
      if (msg.includes('Insufficient role') || msg.includes('42501')) {
        return { success: false, error: 'You do not have permission to restore records.' };
      }
      if (msg.includes('Record not found') || error.code === 'P0002') {
        throw new RecordStorageError(
          `Record ${id} was not restored: no row matched that id.`,
          'NOT_FOUND',
          error,
        );
      }
      throw new RecordStorageError(`Failed to restore record: ${msg}`, 'NETWORK', error);
    }
    const restoredRow = Array.isArray(restoredRows) ? restoredRows[0] : restoredRows;
    if (!restoredRow || !restoredRow.id) {
      throw new RecordStorageError(
        `Record ${id} was not restored: the server returned no row.`,
        'NOT_FOUND',
        restoredRows,
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