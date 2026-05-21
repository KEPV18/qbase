// ============================================================================
// QMS Forge — Audit Log Hooks (React Query)
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { getAuditLogForSerial, getAllAuditLogs, type AuditLogReadEntry } from '../services/auditLog';

/**
 * Fetch audit log entries for a specific record.
 */
export function useAuditLog(serial: string | null) {
  return useQuery<AuditLogReadEntry[]>({
    queryKey: ['auditLog', serial],
    queryFn: () => getAuditLogForSerial(serial!),
    enabled: !!serial,
    staleTime: 30_000, // 30 seconds — audit logs don't change rapidly
  });
}

/**
 * Fetch all audit log entries (for admin/debugging).
 */
export function useAllAuditLogs(limit = 100) {
  return useQuery<AuditLogReadEntry[]>({
    queryKey: ['auditLog', 'all', limit],
    queryFn: () => getAllAuditLogs(limit),
    staleTime: 30_000,
  });
}