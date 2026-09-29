// ============================================================================
// QBase — AI tool: summarizeAuditTrail (Prime §D5)
// ---------------------------------------------------------------------------
// Summarizes the audit trail of one record for a reviewer. Data comes from
// the existing read service (getAuditLogForserial — RLS-gated, actor-derived
// rows only). The tool is strictly read-only: acceptance of its proposal
// performs NO persistence, because a trail summary is derived display data,
// not QMS data — rejecting it discards nothing, accepting it keeps it as
// ephemeral display state. This is stated explicitly so there is no hidden
// write and no fabricated "saved" impression.
// ============================================================================

import { getAuditLogForSerial } from '@/services/auditLog';
import type { Proposal } from '../types';
import { makeProposal, acceptProposal } from '../proposal';
import { aiComplete } from '../client';

export interface SummarizeAuditTrailArgs {
  serial: string;
  signal?: AbortSignal;
}

export interface SummarizeAuditTrailContent {
  summary: string;
  /** Number of audit entries considered (traceability, Prime §9). */
  entriesConsidered: number;
}

/**
 * Summarize the audit trail of a record. Reads through the validated read
 * service (getAuditLogForSerial → RLS-gated select on audit_log). Returns a
 * proposal — nothing persisted, ever.
 */
export async function summarizeAuditTrailProposal(
  args: SummarizeAuditTrailArgs
): Promise<Proposal<SummarizeAuditTrailContent>> {
  const entries = await getAuditLogForSerial(args.serial);
  if (!entries.length) {
    // Honest empty state — never ask the model to fabricate trail content.
    throw new Error(`No audit trail entries exist for ${args.serial} — nothing to summarize.`);
  }

  // Compact transcript: time, action, server-derived actor, changed fields.
  // previous/new values are omitted to keep the prompt small — the reviewer
  // can open the full trail in the UI for details.
  const transcript = entries
    .slice(0, 200) // bound the prompt; the summary states the coverage
    .map((e) => `- ${e.timestamp} [${e.action}] by ${e.user}: changed ${(e.changedFields || []).join(', ') || 'nothing/structured data'}`)
    .join('\n');

  const prompt =
    `Summarize the audit trail below for a QMS reviewer: what happened to this ` +
    `record, in what order, by whom, and anything anomalous (unexpected actors, ` +
    `unusual edit counts, rapid re-edits). Ground every statement in the ` +
    `transcript — never invent events.\n\n` +
    `Record ${args.serial} audit trail (${entries.length} entries, ` +
    `showing most recent first, up to 200):\n${transcript}\n\n` +
    `Respond with a plain-text summary of at most 150 words. No JSON.`;

  const result = await aiComplete('summarize_audit_trail', prompt, {
    system:
      'You summarize audit trails for QMS reviewers. You are read-only: you ' +
      'produce prose summaries only, never save anything.',
    maxTokens: 500,
    signal: args.signal,
  });

  return makeProposal({
    tool: 'summarize_audit_trail',
    kind: 'audit_trail_summary',
    content: { summary: result.content.trim(), entriesConsidered: Math.min(entries.length, 200) },
    model: result.model,
    promptPreview: `Audit trail of ${args.serial}`,
  });
}

/**
 * Acceptance path — read-only artifact: acceptance is a pure state change on
 * the proposal object ("reviewer acknowledges the summary"). NO write occurs
 * — a summary is derived, display-only data; persisting it would duplicate
 * the audit trail itself (Prime §9: metrics/summaries must stay traceable to
 * the real data, not become a second source of truth).
 */
export async function acceptAuditTrailSummary(
  proposal: Proposal<SummarizeAuditTrailContent>
): Promise<Proposal<SummarizeAuditTrailContent>> {
  return (
    await acceptProposal(proposal, async () => {
      // Deliberate no-op: the summary is derived display data (see above).
      return null;
    })
  ).proposal;
}