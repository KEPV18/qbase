// ============================================================================
// QMS Forge — Structured Logger
// Zero silent failures. Every operation leaves a trace.
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogCategory = 'record' | 'rpc' | 'auth' | 'validation' | 'rls' | 'audit' | 'system';

export interface StructuredLogEntry {
  ts: string;
  level: LogLevel;
  cat: LogCategory;
  action: string;
  serial?: string;
  formCode?: string;
  userId?: string;
  durationMs?: number;
  err?: string;
  meta?: Record<string, unknown>;
}

// ─── Ring buffer (in-memory, bounded) ───────────────────────────────────────

const LOG_BUFFER: StructuredLogEntry[] = [];
const MAX_BUFFER = 500;

function push(entry: StructuredLogEntry): void {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) LOG_BUFFER.shift();

  // Console output with structured format
  const icon = { debug: '🔧', info: 'ℹ️', warn: '⚠️', error: '🔴', fatal: '💀' }[entry.level];
  const extras: string[] = [];
  if (entry.serial) extras.push(`serial=${entry.serial}`);
  if (entry.formCode) extras.push(`form=${entry.formCode}`);
  if (entry.durationMs !== undefined) extras.push(`${entry.durationMs}ms`);
  if (entry.err) extras.push(`err=${entry.err}`);

  console.log(
    `${icon} [${entry.cat}] ${entry.action}${extras.length ? ' | ' + extras.join(' ') : ''}`
  );
}

export function getLogBuffer(): StructuredLogEntry[] {
  return [...LOG_BUFFER];
}

export function clearLogBuffer(): void {
  LOG_BUFFER.length = 0;
}

// ─── Convenience loggers per category ───────────────────────────────────────

function ts(): string {
  return new Date().toISOString();
}

export const log = {
  record: {
    creating: (formCode: string, serial: string, userId?: string) =>
      push({ ts: ts(), level: 'info', cat: 'record', action: 'creating', formCode, serial, userId }),
    created: (formCode: string, serial: string, durationMs: number, userId?: string) =>
      push({ ts: ts(), level: 'info', cat: 'record', action: 'created', formCode, serial, durationMs, userId }),
    updated: (formCode: string, serial: string, durationMs: number, userId?: string, meta?: Record<string, unknown>) =>
      push({ ts: ts(), level: 'info', cat: 'record', action: 'updated', formCode, serial, durationMs, userId, meta }),
    deleted: (formCode: string, serial: string, userId?: string) =>
      push({ ts: ts(), level: 'info', cat: 'record', action: 'soft_deleted', formCode, serial, userId }),
    failed: (formCode: string, serial: string, err: string, durationMs?: number) =>
      push({ ts: ts(), level: 'error', cat: 'record', action: 'failed', formCode, serial, err, durationMs }),
    conflict: (formCode: string, serial: string, expectedEditCount: number, actualEditCount: number) =>
      push({ ts: ts(), level: 'warn', cat: 'record', action: 'edit_conflict', formCode, serial, meta: { expectedEditCount, actualEditCount } }),
  },

  rpc: {
    call: (fn: string, params: Record<string, unknown>) =>
      push({ ts: ts(), level: 'debug', cat: 'rpc', action: `rpc:${fn}`, meta: { params: Object.keys(params) } }),
    result: (fn: string, success: boolean, durationMs: number, err?: string) =>
      push({ ts: ts(), level: success ? 'info' : 'error', cat: 'rpc', action: `rpc:${fn}:done`, durationMs, err }),
  },

  auth: {
    login: (userId: string, email: string) =>
      push({ ts: ts(), level: 'info', cat: 'auth', action: 'login', userId, meta: { email } }),
    logout: (userId?: string) =>
      push({ ts: ts(), level: 'info', cat: 'auth', action: 'logout', userId }),
    sessionExpired: (userId?: string) =>
      push({ ts: ts(), level: 'warn', cat: 'auth', action: 'session_expired', userId }),
    unauthorized: (action: string, userId?: string) =>
      push({ ts: ts(), level: 'warn', cat: 'auth', action: `unauthorized:${action}`, userId }),
    roleCheck: (userId: string, requiredRole: string, hasRole: boolean) =>
      push({ ts: ts(), level: hasRole ? 'debug' : 'warn', cat: 'auth', action: 'role_check', userId, meta: { requiredRole, hasRole } }),
  },

  validation: {
    rejected: (formCode: string, fields: string[], serial?: string) =>
      push({ ts: ts(), level: 'warn', cat: 'validation', action: 'rejected', formCode, serial, meta: { fields } }),
    passed: (formCode: string, serial?: string) =>
      push({ ts: ts(), level: 'debug', cat: 'validation', action: 'passed', formCode, serial }),
  },

  rls: {
    blocked: (table: string, operation: string, userId?: string) =>
      push({ ts: ts(), level: 'warn', cat: 'rls', action: 'blocked', userId, meta: { table, operation } }),
  },

  audit: {
    appended: (serial: string, action: string) =>
      push({ ts: ts(), level: 'info', cat: 'audit', action: 'appended', serial, meta: { auditAction: action } }),
    failed: (serial: string, err: string) =>
      push({ ts: ts(), level: 'error', cat: 'audit', action: 'append_failed', serial, err }),
    immutable: (action: string) =>
      push({ ts: ts(), level: 'warn', cat: 'audit', action: 'immutability_violation', meta: { attempted: action } }),
  },

  system: {
    startup: (version: string) =>
      push({ ts: ts(), level: 'info', cat: 'system', action: 'startup', meta: { version } }),
    error: (context: string, err: string) =>
      push({ ts: ts(), level: 'error', cat: 'system', action: 'error', err, meta: { context } }),
  },
};

// ─── Metrics accumulator ────────────────────────────────────────────────────

export interface SystemMetrics {
  requests: { total: number; byCategory: Record<LogCategory, number> };
  errors: { total: number; byCategory: Record<LogCategory, number>; recent: StructuredLogEntry[] };
  auditLog: { insertCount: number; lastSerial: string | null; growthRate24h: number };
  recordOps: { creates: number; updates: number; deletes: number; conflicts: number; avgDurationMs: number };
  activeSince: string;
}

export function getMetrics(): SystemMetrics {
  const categories: LogCategory[] = ['record', 'rpc', 'auth', 'validation', 'rls', 'audit', 'system'];
  const byCat: Record<string, number> = {};
  const errByCat: Record<string, number> = {};
  let creates = 0, updates = 0, deletes = 0, conflicts = 0;
  let totalDuration = 0, durationCount = 0;
  const recentErrors: StructuredLogEntry[] = [];
  let lastAuditSerial: string | null = null;

  for (const entry of LOG_BUFFER) {
    byCat[entry.cat] = (byCat[entry.cat] || 0) + 1;
    if (entry.level === 'error' || entry.level === 'fatal') {
      errByCat[entry.cat] = (errByCat[entry.cat] || 0) + 1;
      if (recentErrors.length < 20) recentErrors.push(entry);
    }
    if (entry.cat === 'record') {
      if (entry.action === 'created') creates++;
      else if (entry.action === 'updated') updates++;
      else if (entry.action === 'soft_deleted') deletes++;
      else if (entry.action === 'edit_conflict') conflicts++;
      if (entry.durationMs !== undefined) { totalDuration += entry.durationMs; durationCount++; }
    }
    if (entry.cat === 'audit' && entry.action === 'appended' && entry.serial) {
      lastAuditSerial = entry.serial;
    }
  }

  const normalizedByCat: Record<LogCategory, number> = {} as any;
  const normalizedErrByCat: Record<LogCategory, number> = {} as any;
  for (const c of categories) {
    normalizedByCat[c] = byCat[c] || 0;
    normalizedErrByCat[c] = errByCat[c] || 0;
  }

  return {
    requests: { total: LOG_BUFFER.length, byCategory: normalizedByCat },
    errors: { total: recentErrors.length, byCategory: normalizedErrByCat, recent: recentErrors },
    auditLog: { insertCount: (byCat['audit'] || 0), lastSerial: lastAuditSerial, growthRate24h: 0 },
    recordOps: { creates, updates, deletes, conflicts, avgDurationMs: durationCount ? Math.round(totalDuration / durationCount) : 0 },
    activeSince: LOG_BUFFER.length > 0 ? LOG_BUFFER[0].ts : new Date().toISOString(),
  };
}