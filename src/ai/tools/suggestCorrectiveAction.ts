// ============================================================================
// QBase — AI tool: suggestCorrectiveAction (Prime §D5)
// ---------------------------------------------------------------------------
// Proposes an ISO 9001:2015 Clause 10.2 corrective action for a
// nonconformity. The proposal is inert. Acceptance performs the REAL write
// through the existing CAPA domain service (src/lib/capaRegisterService.ts):
// either an update to an existing CAPA (updateCAPA) or a new CAPA (addCAPA)
// with the proposed corrective_action text — the same validated service a
// manual CAPA edit uses. No direct table writes from the AI layer.
// ============================================================================

import {
  addCAPA,
  updateCAPA,
} from '@/lib/capaRegisterService';
import type { Proposal } from '../types';
import { makeProposal, acceptProposal } from '../proposal';
import { parseAiJsonObject } from '../parse';
import { aiComplete } from '../client';

export interface SuggestCorrectiveActionArgs {
  /** The nonconformity / finding to act on. */
  nonconformity: string;
  /** CAPA source label (e.g. "Internal Audit", "Customer Complaint"). */
  source: string;
  /** Optional root-cause text already recorded for the nonconformity. */
  rootCause?: string;
  signal?: AbortSignal;
}

export interface SuggestCorrectiveActionContent {
  corrective_action: string;
  rationale: string;
}

/**
 * Suggest a corrective action for a nonconformity. Returns a proposal —
 * nothing persisted.
 */
export async function suggestCorrectiveActionProposal(
  args: SuggestCorrectiveActionArgs
): Promise<Proposal<SuggestCorrectiveActionContent>> {
  if (!args.nonconformity.trim()) {
    throw new Error('No nonconformity description supplied.');
  }

  const prompt =
    `A nonconformity was raised in our QMS (ISO 9001:2015 Clause 10.2).\n` +
    `Source: ${args.source}\n` +
    (args.rootCause ? `Recorded root cause analysis:\n${args.rootCause}\n\n` : '') +
    `Nonconformity description:\n"""${args.nonconformity.slice(0, 20_000)}"""\n\n` +
    `Propose ONE concrete corrective action (what is done, by whom in role terms, ` +
    `and how effectiveness will be checked). Do not invent dates, names of real ` +
    `people, or compliance facts not present above.\n\n` +
    `Respond with ONE JSON object: {"corrective_action": "<the proposed action>", ` +
    `"rationale": "<why this addresses the root cause>"}. No prose.`;

  const result = await aiComplete('suggest_corrective_action', prompt, {
    system:
      'You assist a QMS corrective-action workflow (ISO 9001:2015 Clause 10.2). ' +
      'You propose actions; a human always reviews and explicitly accepts before ' +
      'anything is saved.',
    maxTokens: 800,
    signal: args.signal,
  });

  const parsed = parseAiJsonObject<{ corrective_action?: string; rationale?: string }>(result.content);
  if (!parsed.corrective_action || !parsed.corrective_action.trim()) {
    throw new Error('AI response contained no corrective action text.');
  }

  return makeProposal({
    tool: 'suggest_corrective_action',
    kind: 'corrective_action',
    content: {
      corrective_action: parsed.corrective_action,
      rationale: parsed.rationale || '',
    },
    model: result.model,
    promptPreview: args.nonconformity.slice(0, 200),
  });
}

export interface AcceptCorrectiveActionArgs {
  /** Existing CAPA to receive the proposed corrective_action (update path). */
  capaId?: string;
  /**
   * A fully-formed new CAPA (all mandatory fields supplied by the user in the
   * UI) to create with the proposed corrective_action (create path).
   */
  newCAPA?: {
    source_of_capa: string;
    type: 'Corrective' | 'Preventive';
    description: string;
    root_cause_analysis: string;
    responsible_person: string;
    target_completion_date: string;
    reference?: string;
    related_risk?: string;
  };
}

/**
 * Acceptance path — performs the REAL write through the CAPA domain service:
 *  - capaId supplied       → updateCAPA(capaId, { corrective_action })
 *  - newCAPA supplied      → addCAPA({ ...newCAPA, corrective_action })
 * Never both / neither — refuses honestly otherwise (no silent no-op).
 */
export async function acceptCorrectiveActionProposal(
  proposal: Proposal<SuggestCorrectiveActionContent>,
  args: AcceptCorrectiveActionArgs
): Promise<{ proposal: Proposal<SuggestCorrectiveActionContent>; result: { capaId: string; created: boolean } }> {
  return acceptProposal(proposal, async (content) => {
    if (args.capaId && args.newCAPA) {
      throw new Error('Ambiguous accept: supply either capaId or newCAPA, not both.');
    }
    if (args.capaId) {
      const updated = await updateCAPA(args.capaId, { corrective_action: content.corrective_action });
      return { capaId: updated.capa_id, created: false };
    }
    if (args.newCAPA) {
      const created = await addCAPA({
        ...args.newCAPA,
        corrective_action: content.corrective_action,
      });
      return { capaId: created.capa_id, created: true };
    }
    throw new Error(
      'No CAPA write path supplied — attach the proposal to an existing CAPA id ' +
      'or provide the new-CAPA mandatory fields.'
    );
  });
}