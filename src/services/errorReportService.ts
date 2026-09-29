// ============================================================================
// QBase — error_reports domain service (Prime §D7)
// ---------------------------------------------------------------------------
// Wires the previously-orphaned public.error_reports table (a real feature
// that existed in production with no app code referencing it — see
// audit/PRIME-ASSESSMENT.md). Writes go through the ONE audited server-side
// RPC (prime migration 20260929_06): the RPC derives the reporter's
// identity from the JWT (never from the payload) and bounds every text
// field — so a client crash report can never be an oversized-payload
// vector, and the browser never writes the table directly (§5).
//
// Fire-and-forget by design: reportError() NEVER blocks or breaks the UI
// that is already failing — a failed report is logged and dropped (the
// local log buffer keeps the evidence client-side), never thrown.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/services/logger';

export interface ErrorReportContext {
  /** Route/page URL where the failure happened (bounded server-side). */
  pageUrl?: string;
  /** Anything contextual about the failure (bounded jsonb payload). */
  context?: Record<string, unknown>;
}

const APP_VERSION = '0.0.0'; // keep in sync with package.json — no build-time import to avoid bundling it whole

/**
 * Submit a client-side error report. Resolves to the report id on success,
 * or null when the report could not be delivered (logged, never thrown).
 */
export async function reportError(
  error: Error | unknown,
  { pageUrl, context }: ErrorReportContext = {},
): Promise<string | null> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  try {
    const { data, error: rpcError } = await supabase.rpc('error_report_submit', {
      p_error_message: message,
      p_error_stack: stack,
      p_page_url: pageUrl ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      p_version: APP_VERSION,
      p_browser_info: typeof navigator !== 'undefined'
        ? { userAgent: navigator.userAgent }
        : null,
      p_context: context ?? null,
    });

    if (rpcError) {
      // Report channels must fail quiet-but-honest: log locally, never
      // crash a crashing UI, never fabricate success.
      log.system.warn('errorReport', `submit failed: ${rpcError.message}`);
      return null;
    }

    const reportId = typeof data === 'string' ? data : null;
    if (!reportId) {
      log.system.warn('errorReport', 'submit returned no report id — not claimed as delivered');
      return null;
    }
    log.system.info('errorReport', `submitted ${reportId} (${message.slice(0, 80)})`);
    return reportId;
  } catch (err) {
    log.system.warn('errorReport', `submit threw: ${(err as Error).message}`);
    return null;
  }
}

/** Minimal shape of the error_reports rows the admin list reads. */
export interface ErrorReportRow {
  id: string;
  error_message: string;
  error_stack: string | null;
  page_url: string | null;
  version: string | null;
  user_email: string | null;
  created_at: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

/**
 * List error reports (manager-or-admin only — enforced by the table's RLS
 * read policy; a non-manager receives an honest error, never empty-as-ok).
 */
export async function listErrorReports(limit = 50): Promise<ErrorReportRow[]> {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.system.error('errorReport', `list failed: ${error.message}`);
    throw new Error(`Could not load error reports: ${error.message}`);
  }
  return (data ?? []) as ErrorReportRow[];
}

/** Manager-or-admin resolution — rides the audited server-side RPC. */
export async function resolveErrorReport(id: string, notes: string): Promise<void> {
  const { error } = await supabase.rpc('error_report_resolve', {
    p_report_id: id,
    p_notes: notes || null,
  });
  if (error) {
    // Surfaced to the admin UI — a refused resolution is never silent (§20).
    throw new Error(`Could not resolve error report: ${error.message}`);
  }
}