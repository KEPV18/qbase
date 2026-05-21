// ============================================================================
// QMS Forge — Event Intelligence System
// Structured event emission → notification creation.
// No spam. Only CRITICAL and IMPORTANT events reach UI.
// INFO events go to logs only.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { log } from './logger';

// ============================================================================
// Types
// ============================================================================

export type EventCategory = 'records' | 'users' | 'security' | 'system' | 'tenant';
export type EventPriority = 'critical' | 'important' | 'info';
export type EventAction =
  | 'create' | 'update' | 'delete' | 'approve' | 'reject'
  | 'login' | 'role_change' | 'rls_violation' | 'settings_change'
  | 'rpc_error' | 'migration' | 'system_boot';

export interface SystemEvent {
  /** What happened */
  action: EventAction;
  /** Which domain: records/users/security/system/tenant */
  category: EventCategory;
  /** How urgent: critical → notify immediately, important → notify, info → log only */
  priority: EventPriority;
  /** Human-readable title */
  title: string;
  /** Human-readable detail */
  message: string;
  /** Semantic event type for UI grouping (e.g. "record.created", "security.rls_violation") */
  eventType: string;
  /** Who performed the action (user_id or null for system) */
  actorId?: string;
  /** What entity was affected (record_id, user_id, etc.) */
  targetId?: string;
  /** Deep link for quick navigation (e.g. "/records/F/11-008") */
  link?: string;
  /** Additional structured data */
  metadata?: Record<string, unknown>;
  /** Only these user IDs should be notified. If empty, defaults to admins. */
  targetUserIds?: string[];
}

// ============================================================================
// Event Classification Rules
// Audit-aware platform: only system-relevant events generate notifications
// ============================================================================

const PRIORITY_RULES: Record<string, EventPriority> = {
  // Records
  'record.created': 'important',
  'record.updated': 'important',
  'record.deleted': 'important',
  'record.approved': 'important',
  'record.rejected': 'important',
  'record.validated_failed': 'critical',

  // Users
  'user.login': 'info',           // → log only, no notification
  'user.role_change': 'important',
  'user.signup': 'info',

  // Security
  'security.rls_violation': 'critical',
  'security.unauthorized_access': 'critical',
  'security.auth_failure': 'important',

  // System
  'system.migration': 'info',     // → log only
  'system.rpc_error': 'important',
  'system.boot': 'info',

  // Tenant
  'tenant.settings_change': 'important',
  'tenant.branding_change': 'info',
};

const CATEGORY_RULES: Record<string, EventCategory> = {
  'record.': 'records',
  'user.': 'users',
  'security.': 'security',
  'system.': 'system',
  'tenant.': 'tenant',
};

// ============================================================================
// Notification Target Resolution
// Who needs to see this event?
// ============================================================================

async function resolveTargetUserIds(event: SystemEvent): Promise<string[]> {
  // Explicit targets — use them
  if (event.targetUserIds && event.targetUserIds.length > 0) {
    return event.targetUserIds;
  }

  // CRITICAL events → all admins + managers
  if (event.priority === 'critical') {
    return getLeadershipUserIds();
  }

  // IMPORTANT events → all admins
  return getAdminUserIds();
}

let _cachedAdminIds: string[] | null = null;
let _cachedLeadershipIds: string[] | null = null;

async function getAdminUserIds(): Promise<string[]> {
  if (_cachedAdminIds) return _cachedAdminIds;
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  _cachedAdminIds = (data || []).map(r => r.user_id);
  return _cachedAdminIds!;
}

async function getLeadershipUserIds(): Promise<string[]> {
  if (_cachedLeadershipIds) return _cachedLeadershipIds;
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'manager']);
  _cachedLeadershipIds = (data || []).map(r => r.user_id);
  return _cachedLeadershipIds!;
}

/** Clear cached role IDs — call after role changes */
export function invalidateRoleCache() {
  _cachedAdminIds = null;
  _cachedLeadershipIds = null;
}

// ============================================================================
// Event Emission
// ============================================================================

export async function emitEvent(event: SystemEvent): Promise<string | null> {
  // Auto-classify if not explicitly set
  const resolvedPriority = event.priority || classifyPriority(event.eventType);
  const resolvedCategory = event.category || classifyCategory(event.eventType);

  // INFO events → log only, no notification
  if (resolvedPriority === 'info') {
    log.info('event', event.eventType, {
      title: event.title,
      actor: event.actorId,
      target: event.targetId,
      category: resolvedCategory,
    });
    return null;
  }

  // CRITICAL and IMPORTANT → create notification
  try {
    const targetUserIds = await resolveTargetUserIds(event);

    if (targetUserIds.length === 0) {
      log.warn('event', `No target users for ${event.eventType}`, { title: event.title });
      return null;
    }

    // Build data JSONB — embed serial/formCode for record events
    const data: Record<string, unknown> = { ...(event.metadata || {}) };
    if (event.actorId) data.actorId = event.actorId;
    if (event.targetId) data.targetId = event.targetId;

    const { data: rpcResult, error } = await supabase.rpc('create_notifications_batch', {
      p_user_ids: targetUserIds,
      p_title: event.title,
      p_message: event.message,
      p_category: resolvedCategory,
      p_priority: resolvedPriority,
      p_event_type: event.eventType,
      p_actor_id: event.actorId || null,
      p_target_id: event.targetId || null,
      p_link: event.link || null,
      p_data: data,
      p_created_by: event.actorId || null,
    });

    if (error) {
      log.error('event', `Failed to emit ${event.eventType}: ${error.message}`);
      return null;
    }

    log.info('event', `Emitted ${event.eventType} → ${targetUserIds.length} users`, {
      category: resolvedCategory,
      priority: resolvedPriority,
    });

    // Return the count of notifications created
    return typeof rpcResult === 'number' ? String(rpcResult) : 'ok';
  } catch (err) {
    log.error('event', `emitEvent failed: ${err}`);
    return null;
  }
}

// ============================================================================
// Convenience Emitters — typed helpers for common events
// ============================================================================

export const Events = {
  // ─── Records ─────────────────────────────────────────────
  recordCreated: (serial: string, formCode: string, formName: string, actorId?: string): SystemEvent => ({
    action: 'create',
    category: 'records',
    priority: 'important',
    eventType: 'record.created',
    title: `${formName} Created`,
    message: `Record ${serial} (${formCode}) has been created.`,
    actorId,
    link: `/records/${encodeURIComponent(serial)}`,
    metadata: { serial, formCode, formName },
  }),

  recordUpdated: (serial: string, formCode: string, formName: string, changedFields: string[], actorId?: string): SystemEvent => ({
    action: 'update',
    category: 'records',
    priority: 'important',
    eventType: 'record.updated',
    title: `${formName} Updated`,
    message: `Record ${serial} updated: ${changedFields.join(', ')}.`,
    actorId,
    link: `/records/${encodeURIComponent(serial)}`,
    metadata: { serial, formCode, changedFields },
  }),

  recordDeleted: (serial: string, formCode: string, formName: string, actorId?: string): SystemEvent => ({
    action: 'delete',
    category: 'records',
    priority: 'important',
    eventType: 'record.deleted',
    title: `${formName} Deleted`,
    message: `Record ${serial} (${formCode}) has been deleted.`,
    actorId,
    metadata: { serial, formCode },
  }),

  recordApproved: (serial: string, formCode: string, actorId?: string): SystemEvent => ({
    action: 'approve',
    category: 'records',
    priority: 'important',
    eventType: 'record.approved',
    title: `Record Approved`,
    message: `${serial} (${formCode}) has been approved.`,
    actorId,
    link: `/records/${encodeURIComponent(serial)}`,
    metadata: { serial, formCode },
  }),

  recordRejected: (serial: string, formCode: string, reason: string, actorId?: string): SystemEvent => ({
    action: 'reject',
    category: 'records',
    priority: 'important',
    eventType: 'record.rejected',
    title: `Record Rejected`,
    message: `${serial} (${formCode}) was rejected: ${reason}.`,
    actorId,
    link: `/records/${encodeURIComponent(serial)}`,
    metadata: { serial, formCode, reason },
  }),

  validationFailed: (serial: string, formCode: string, errors: string[], actorId?: string): SystemEvent => ({
    action: 'update',
    category: 'records',
    priority: 'critical',
    eventType: 'record.validated_failed',
    title: `Validation Failed: ${serial}`,
    message: `Record ${serial} (${formCode}) failed validation: ${errors.join('; ')}.`,
    actorId,
    link: `/records/${encodeURIComponent(serial)}`,
    metadata: { serial, formCode, errors },
  }),

  // ─── Security ────────────────────────────────────────────
  rlsViolation: (table: string, operation: string, actorId?: string): SystemEvent => ({
    action: 'rls_violation',
    category: 'security',
    priority: 'critical',
    eventType: 'security.rls_violation',
    title: `Security: RLS Violation`,
    message: `Unauthorized ${operation} on ${table} was blocked.`,
    actorId,
    metadata: { table, operation },
  }),

  // ─── System ───────────────────────────────────────────────
  rpcError: (rpcName: string, errorMsg: string, actorId?: string): SystemEvent => ({
    action: 'rpc_error',
    category: 'system',
    priority: 'important',
    eventType: 'system.rpc_error',
    title: `RPC Error: ${rpcName}`,
    message: errorMsg,
    actorId,
    metadata: { rpcName, error: errorMsg },
  }),

  // ─── Tenant ──────────────────────────────────────────────
  tenantSettingsChanged: (field: string, oldValue: string, newValue: string, actorId?: string): SystemEvent => ({
    action: 'settings_change',
    category: 'tenant',
    priority: 'important',
    eventType: 'tenant.settings_change',
    title: `Company Settings Updated`,
    message: `${field} changed from "${oldValue}" to "${newValue}".`,
    actorId,
    metadata: { field, oldValue, newValue },
  }),
};

// ============================================================================
// Classification Helpers
// ============================================================================

function classifyPriority(eventType: string): EventPriority {
  for (const [prefix, priority] of Object.entries(PRIORITY_RULES)) {
    if (eventType.startsWith(prefix)) return priority;
  }
  return 'info';
}

function classifyCategory(eventType: string): EventCategory {
  for (const [prefix, category] of Object.entries(CATEGORY_RULES)) {
    if (eventType.startsWith(prefix)) return category;
  }
  return 'system';
}