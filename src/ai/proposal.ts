// ============================================================================
// QBase — proposal state machine (Prime §D5)
// ---------------------------------------------------------------------------
// Pure functions over the Proposal object. A proposal itself has NO write
// capability: every AI artifact is inert data. `acceptProposal` REQUIRES a
// caller-supplied `performWrite` callback — the domain-service invocation —
// so acceptance always executes the real write through the same validated
// path a manual edit would, never through anything AI-specific.
// ============================================================================

import type { Proposal, ProposalDiff, ProposalKind, ProposalState } from './types';

/** Thrown on an invalid proposal lifecycle transition (already accepted, etc.). */
export class InvalidProposalTransitionError extends Error {
  constructor(proposalId: string, from: ProposalState, attempted: string) {
    super(
      `Proposal ${proposalId} cannot ${attempted} from state '${from}' — ` +
      'only a proposal still in proposed/edited state can be acted on.'
    );
    this.name = 'InvalidProposalTransitionError';
  }
}

let proposalCounter = 0; // combined with crypto.randomUUID for unique ids
function newProposalId(): string {
  proposalCounter += 1;
  return `prop-${Date.now().toString(36)}-${proposalCounter}-${crypto.randomUUID()}`;
}

/**
 * Wrap raw AI content into a proposal (state 'proposed'). The baseline is a
 * frozen copy so regenerate/compare always diffs against what the model
 * actually produced, not the user's edits.
 */
export function makeProposal<TContent>(args: {
  tool: Proposal['tool'];
  kind: ProposalKind;
  content: TContent;
  model?: string | null;
  promptPreview?: string;
}): Proposal<TContent> {
  const baseline = structuredClone(args.content);
  return {
    id: newProposalId(),
    tool: args.tool,
    kind: args.kind,
    baseline,
    content: args.content,
    state: 'proposed',
    provenance: {
      model: args.model ?? null,
      createdAt: new Date().toISOString(),
      promptPreview: (args.promptPreview || '').slice(0, 200),
    },
  };
}

/** User edit: replaces the proposed content; state → 'edited'. Accept/reject still available. */
export function editProposal<TContent>(proposal: Proposal<TContent>, content: TContent): Proposal<TContent> {
  if (proposal.state === 'accepted' || proposal.state === 'rejected') {
    throw new InvalidProposalTransitionError(proposal.id, proposal.state, 'edit');
  }
  return { ...proposal, content, state: 'edited' };
}

/** Regenerate: replace both baseline + content with fresh AI output; state back → 'proposed'. */
export function regenerateProposal<TContent>(proposal: Proposal<TContent>, freshContent: TContent, model?: string | null): Proposal<TContent> {
  if (proposal.state === 'accepted' || proposal.state === 'rejected') {
    throw new InvalidProposalTransitionError(proposal.id, proposal.state, 'regenerate');
  }
  return {
    ...proposal,
    baseline: freshContent,
    content: freshContent,
    state: 'proposed',
    provenance: {
      ...proposal.provenance,
      model: model ?? proposal.provenance.model,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Compare: field-level diff between the immutable baseline and current content. */
export function compareProposal<TContent extends Record<string, unknown>>(proposal: Proposal<TContent>): ProposalDiff {
  const changedFields: string[] = [];
  const baselineValues: Record<string, unknown> = {};
  const currentValues: Record<string, unknown> = {};
  const keys = new Set([
    ...Object.keys(proposal.baseline as Record<string, unknown>),
    ...Object.keys(proposal.content),
  ]);
  for (const key of keys) {
    const before = JSON.stringify((proposal.baseline as Record<string, unknown>)[key] ?? null);
    const after = JSON.stringify(proposal.content[key] ?? null);
    if (before !== after) {
      changedFields.push(key);
      baselineValues[key] = (proposal.baseline as Record<string, unknown>)[key] ?? null;
      currentValues[key] = proposal.content[key] ?? null;
    }
  }
  return { changedFields, baselineValues, currentValues };
}

/**
 * Accept the proposal: `performWrite` executes the REAL write through the
 * validated domain-service path supplied by the tool's accept wiring. If the
 * write throws, the proposal stays in its pre-accept state (no false "done"),
 * and the error propagates to the caller for honest surfacing.
 */
export async function acceptProposal<TContent, TResult>(
  proposal: Proposal<TContent>,
  performWrite: (content: TContent) => Promise<TResult>
): Promise<{ proposal: Proposal<TContent>; result: TResult }> {
  if (proposal.state === 'accepted') {
    throw new InvalidProposalTransitionError(proposal.id, proposal.state, 'accept');
  }
  if (proposal.state === 'rejected') {
    throw new InvalidProposalTransitionError(proposal.id, proposal.state, 'accept');
  }
  const result = await performWrite(proposal.content);
  return { proposal: { ...proposal, state: 'accepted' }, result };
}

/** Reject the proposal: no write of any kind occurs. */
export function rejectProposal<TContent>(proposal: Proposal<TContent>): Proposal<TContent> {
  if (proposal.state === 'accepted' || proposal.state === 'rejected') {
    throw new InvalidProposalTransitionError(proposal.id, proposal.state, 'reject');
  }
  return { ...proposal, state: 'rejected' };
}