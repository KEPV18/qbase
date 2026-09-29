// ============================================================================
// QBase — dashboard stats domain service (Prime §D6)
// ---------------------------------------------------------------------------
// ONE RPC (public.dashboard_stats, migration 20260929_04) computes every
// org-level dashboard KPI from real tables — counts, statuses, CAPA closure
// rate, overdue reviews. Each field of the returned object IS the widget's
// exact query; the field↔widget pairing is documented in the migration and
// mirrored in the DashboardStats widget tooltip.
//
// No fabrication: a missing/malformed RPC payload THROWS (surfaced by the
// widget's error state), and an empty CAPA register yields capaClosureRate
// null — which the widget renders as "no data", never 0%.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/services/logger';

/** Aggregated KPI envelope — exactly the dashboard_stats() jsonb payload. */
export interface DashboardStats {
  recordsTotal: number;
  recordsByStatus: {
    draft: number;
    pending_review: number;
    approved: number;
    rejected: number;
  };
  recordsLast30d: number;
  capaTotal: number;
  capaClosed: number;
  capaOpen: number;
  /** NULL when the register is empty — render "no data", not 0%. */
  capaClosureRate: number | null;
  capaOverdue: number;
  pendingReviewAging: {
    under_7d: number;
    from_7_to_30d: number;
    over_30d: number;
  };
}

/** Raw jsonb shape as emitted by the 20260929_04 migration. */
interface RawStats {
  records_total?: unknown;
  records_by_status?: unknown;
  records_last_30d?: unknown;
  capa_total?: unknown;
  capa_closed?: unknown;
  capa_open?: unknown;
  capa_closure_rate?: unknown;
  capa_overdue?: unknown;
  pending_review_aging?: unknown;
}

function asInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`dashboard_stats: field "${field}" is not a finite number`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Harden the RPC payload into typed stats. Malformed payloads throw with a
 * readable message — never silently defaulted to zeros (§20: don't hide
 * failures; §9: never fabricate).
 */
export function parseDashboardStats(raw: unknown): DashboardStats {
  if (!isRecord(raw)) {
    throw new Error('dashboard_stats returned a non-object payload');
  }
  const r = raw as RawStats;
  const byStatus = r.records_by_status;
  const aging = r.pending_review_aging;
  if (!isRecord(byStatus) || !isRecord(aging)) {
    throw new Error('dashboard_stats: status/aging sub-objects missing');
  }

  return {
    recordsTotal: asInt(r.records_total, 'records_total'),
    recordsByStatus: {
      draft: asInt(byStatus.draft, 'records_by_status.draft'),
      pending_review: asInt(byStatus.pending_review, 'records_by_status.pending_review'),
      approved: asInt(byStatus.approved, 'records_by_status.approved'),
      rejected: asInt(byStatus.rejected, 'records_by_status.rejected'),
    },
    recordsLast30d: asInt(r.records_last_30d, 'records_last_30d'),
    capaTotal: asInt(r.capa_total, 'capa_total'),
    capaClosed: asInt(r.capa_closed, 'capa_closed'),
    capaOpen: asInt(r.capa_open, 'capa_open'),
    capaClosureRate:
      r.capa_closure_rate === null ? null : asInt(r.capa_closure_rate, 'capa_closure_rate'),
    capaOverdue: asInt(r.capa_overdue, 'capa_overdue'),
    pendingReviewAging: {
      under_7d: asInt(aging.under_7d, 'pending_review_aging.under_7d'),
      from_7_to_30d: asInt(aging.from_7_to_30d, 'pending_review_aging.from_7_to_30d'),
      over_30d: asInt(aging.over_30d, 'pending_review_aging.over_30d'),
    },
  };
}

/**
 * Fetch one dashboard_stats invocation. Errors propagate to the caller —
 * the dashboard widget surfaces them; a failed metrics load is never
 * rendered as zeros.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (error) {
    log.system.error('dashboardStats:rpc_failed', error.message);
    throw new Error(`Could not load dashboard statistics: ${error.message}`);
  }
  return parseDashboardStats(data);
}