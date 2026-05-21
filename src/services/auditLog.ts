// ============================================================================
// QMS Forge — Audit Log Service
// CUTOVER EDITION — Uses ONLY new schema columns.
// No legacy field references. No last_serial. No code/record_name.
// Storage: Supabase audit_log table (append-only)
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  serial: string;
  formCode: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  user: string;
  changedFields: string;
  previousValues: string;
  newValues: string;
}

export interface AuditLogDiff {
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

// ─── Compute Diff ───────────────────────────────────────────────────────────

/**
 * Compute the diff between previous and current record data.
 * Returns only fields that changed, with their previous and new values.
 * Excludes metadata fields from the diff (they're tracked separately).
 */
export function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): AuditLogDiff {
  const METADATA_KEYS = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
    '_creationReason', '_businessEvent',
  ]);

  const changedFields: string[] = [];
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    if (METADATA_KEYS.has(key)) continue;

    const prevVal = previous[key];
    const currVal = current[key];

    const prevStr = JSON.stringify(prevVal ?? null);
    const currStr = JSON.stringify(currVal ?? null);

    if (prevStr !== currStr) {
      changedFields.push(key);
      previousValues[key] = prevVal ?? null;
      newValues[key] = currVal ?? null;
    }
  }

  return { changedFields, previousValues, newValues };
}

// ─── Append Audit Log Entry ────────────────────────────────────────────────

/**
 * Append an audit log entry to the Supabase audit_log table.
 * This is append-only — never edit or delete log entries.
 * Non-blocking: errors are logged but don't fail the main operation.
 */
export async function appendAuditLog(
  serial: string,
  action: 'create' | 'update' | 'delete' | 'status_change',
  user: string,
  changedFields: string[],
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  formCode?: string
): Promise<{ success: boolean; id: string }> {
  // Find the record_id for this serial using new schema column
  const { data: record } = await supabase
    .from('records')
    .select('id')
    .eq('serial', serial)
    .maybeSingle();

  const recordId = record?.id || crypto.randomUUID();

  // Use RPC — now passes form_code and serial directly
  const { error } = await supabase.rpc('append_audit_log', {
    p_record_id: recordId,
    p_action: action,
    p_changed_fields: changedFields,
    p_previous_values: previousValues,
    p_new_values: newValues,
    p_performed_by: user,
    p_form_code: formCode || '',
    p_serial: serial,
  });

  if (error) {
    console.error('[auditLog] Failed to append audit log:', error.message);
    return { success: false, id: '' };
  }

  console.log(`[auditLog] ${action} logged for ${serial}`);
  return { success: true, id: recordId };
}

// ─── Read Audit Log ─────────────────────────────────────────────────────────

export interface AuditLogReadEntry {
  id: string;
  timestamp: string;
  serial: string;
  formCode: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  user: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  _raw: {
    changedFields: string;
    previousValues: string;
    newValues: string;
  };
}

/**
 * Read all audit log entries for a specific serial.
 * Returns entries in chronological order (oldest first).
 */
export async function getAuditLogForSerial(serial: string): Promise<AuditLogReadEntry[]> {
  // Find the record_id for this serial using new schema column
  const { data: record } = await supabase
    .from('records')
    .select('id')
    .eq('serial', serial)
    .maybeSingle();

  if (!record) return [];

  const { data: logs, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('record_id', record.id)
    .order('created_at', { ascending: true });

  if (error || !logs) {
    console.error('[auditLog] Failed to read audit log:', error?.message);
    return [];
  }

  return (logs as any[]).map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    serial: row.serial || serial,
    formCode: row.form_code || '',
    action: row.action as 'create' | 'update' | 'delete' | 'status_change',
    user: row.performed_by,
    changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
    previousValues: (row.previous_values as Record<string, unknown>) || {},
    newValues: (row.new_values as Record<string, unknown>) || {},
    _raw: {
      changedFields: JSON.stringify(row.changed_fields),
      previousValues: JSON.stringify(row.previous_values),
      newValues: JSON.stringify(row.new_values),
    },
  }));
}

/**
 * Read all audit log entries (for admin/debugging).
 */
export async function getAllAuditLogs(limit = 100): Promise<AuditLogReadEntry[]> {
  const { data: logs, error } = await supabase
    .from('audit_log')
    .select('*, records(serial, form_code)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !logs) {
    console.error('[auditLog] Failed to read audit log:', error?.message);
    return [];
  }

  return (logs as any[]).map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    serial: row.serial || row.records?.serial || '',
    formCode: row.form_code || row.records?.form_code || '',
    action: row.action as 'create' | 'update' | 'delete' | 'status_change',
    user: row.performed_by,
    changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
    previousValues: (row.previous_values as Record<string, unknown>) || {},
    newValues: (row.new_values as Record<string, unknown>) || {},
    _raw: {
      changedFields: JSON.stringify(row.changed_fields),
      previousValues: JSON.stringify(row.previous_values),
      newValues: JSON.stringify(row.new_values),
    },
  }));
}