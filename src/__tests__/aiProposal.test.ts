// ============================================================================
// QBase — AI proposal state machine tests (Prime §D5)
// ---------------------------------------------------------------------------
// Contract under test: a proposal is inert data; ONLY acceptProposal's
// performWrite callback can persist; failed writes leave the proposal in its
// pre-accept state (no false "done"); terminal states reject all transitions;
// compare diffs against the immutable baseline (what the model actually
// produced), not the user's edits.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  makeProposal,
  editProposal,
  regenerateProposal,
  compareProposal,
  acceptProposal,
  rejectProposal,
  InvalidProposalTransitionError,
} from '../ai/proposal';
import { parseAiJsonObject } from '../ai/parse';
import { AiDisabledError, AiAuthRequiredError } from '../ai/types';

describe('makeProposal', () => {
  it('creates a proposed proposal with a cloned baseline', () => {
    const content = { client_name: 'Acme Ltd', remarks: 'calibration due' };
    const p = makeProposal({
      tool: 'draft_record_content',
      kind: 'record_content',
      content,
      model: 'claude-sonnet-5-5',
      promptPreview: 'Draft F/09 for line 3',
    });

    expect(p.state).toBe('proposed');
    expect(p.content).toEqual(content);
    expect(p.baseline).toEqual(content);

    // baseline is an independent clone — mutating source content afterwards
    // must not corrupt the baseline (compare integrity).
    content.client_name = 'Mutated';
    expect((p.baseline as Record<string, unknown>).client_name).toBe('Acme Ltd');
    expect((p.content as Record<string, unknown>).client_name).toBe('Mutated');
  });

  it('stamps provenance', () => {
    const p = makeProposal({
      tool: 'summarize_audit_trail',
      kind: 'audit_trail_summary',
      content: { summary: '3 transitions', entriesConsidered: 3 },
    });
    expect(p.provenance.model).toBeNull();
    expect(p.provenance.promptPreview).toBe('');
    expect(p.provenance.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('editProposal', () => {
  it('moves state to edited and replaces content', () => {
    const p = makeProposal({
      tool: 'draft_record_content',
      kind: 'record_content',
      content: { remarks: 'v1' },
    });
    const edited = editProposal(p, { remarks: 'human-corrected' });
    expect(edited.state).toBe('edited');
    expect(edited.content).toEqual({ remarks: 'human-corrected' });
    // baseline unchanged
    expect(edited.baseline).toEqual({ remarks: 'v1' });
  });

  it('refuses edit on accepted/rejected proposals', () => {
    const accepted = { ...makeProposal({ tool: 'classify_document', kind: 'document_classification', content: { category: 'record', rationale: '' } }), state: 'accepted' as const };
    expect(() => editProposal(accepted, { category: 'form', rationale: '' })).toThrow(
      InvalidProposalTransitionError
    );
    const rejected = rejectProposal(makeProposal({ tool: 'classify_document', kind: 'document_classification', content: { category: 'form', rationale: '' } }));
    expect(() => editProposal(rejected, { category: 'form', rationale: '' })).toThrow(
      InvalidProposalTransitionError
    );
  });
});

describe('regenerateProposal', () => {
  it('resets baseline + content and returns to proposed', () => {
    const p = editProposal(
      makeProposal({ tool: 'draft_record_content', kind: 'record_content', content: { remarks: 'v1' } }),
      { remarks: 'edited' }
    );
    const fresh = regenerateProposal(p, { remarks: 'v2 (fresh model output)' }, 'gpt-5.2');
    expect(fresh.state).toBe('proposed');
    expect(fresh.content).toEqual({ remarks: 'v2 (fresh model output)' });
    expect(fresh.baseline).toEqual({ remarks: 'v2 (fresh model output)' });
    expect(fresh.provenance.model).toBe('gpt-5.2');
  });

  it('refuses regenerate on accepted proposals', () => {
    const accepted = { ...makeProposal({ tool: 'suggest_corrective_action', kind: 'corrective_action', content: { corrective_action: 'x', rationale: '' } }), state: 'accepted' as const };
    expect(() => regenerateProposal(accepted, { corrective_action: 'y', rationale: '' })).toThrow(
      InvalidProposalTransitionError
    );
  });
});

describe('compareProposal', () => {
  it('diffs current content against the immutable baseline', () => {
    const p = makeProposal({
      tool: 'draft_record_content',
      kind: 'record_content',
      content: { a: 1, b: 'same', c: 'old' },
    });
    const edited = editProposal(p, { a: 2, b: 'same', c: null as unknown as string });
    const diff = compareProposal(edited as never);
    expect(diff.changedFields.sort()).toEqual(['a', 'c']);
    expect(diff.baselineValues).toEqual({ a: 1, c: 'old' });
    expect(diff.currentValues).toEqual({ a: 2, c: null });
  });

  it('returns an empty diff when content equals baseline', () => {
    const p = makeProposal({
      tool: 'draft_record_content',
      kind: 'record_content',
      content: { a: 1 },
    });
    const diff = compareProposal(p as never);
    expect(diff.changedFields).toEqual([]);
  });
});

describe('acceptProposal', () => {
  it('performs the real write ONLY through the supplied domain-service callback', async () => {
    const p = makeProposal({ tool: 'suggest_corrective_action', kind: 'corrective_action', content: { corrective_action: 'Fix jig', rationale: 'root cause' } });
    const writeSpy = async (content: { corrective_action: string }) => ({ capaId: 'CAPA-26-001', created: false, received: content.corrective_action });

    const { proposal, result } = await acceptProposal(p, writeSpy);
    expect(proposal.state).toBe('accepted');
    expect(result.received).toBe('Fix jig');
  });

  it('keeps the pre-accept state when the write throws (no false done)', async () => {
    const p = makeProposal({ tool: 'draft_record_content', kind: 'record_content', content: { a: 1 } });
    await expect(
      acceptProposal(p, async () => {
        throw new Error('record_transition refused by engine');
      })
    ).rejects.toThrow('record_transition refused by engine');
    // proposal unchanged — the caller still holds state 'proposed'
    expect(p.state).toBe('proposed');
  });

  it('refuses double-accept', async () => {
    const p = makeProposal({ tool: 'suggest_corrective_action', kind: 'corrective_action', content: { corrective_action: 'x', rationale: '' } });
    const { proposal } = await acceptProposal(p, async () => null);
    await expect(acceptProposal(proposal, async () => null)).rejects.toThrow(InvalidProposalTransitionError);
  });
});

describe('rejectProposal', () => {
  it('rejects without mutating the carried content', () => {
    // rejectProposal's signature takes no write callback — it is structurally
    // incapable of persisting anything.
    const p = makeProposal({ tool: 'draft_record_content', kind: 'record_content', content: { a: 1 } });
    const rejected = rejectProposal(p);
    expect(rejected.state).toBe('rejected');
    expect(rejected.content).toEqual({ a: 1 });
  });

  it('refuses reject on accepted proposals', async () => {
    const p = makeProposal({ tool: 'suggest_corrective_action', kind: 'corrective_action', content: { corrective_action: 'x', rationale: '' } });
    const { proposal } = await acceptProposal(p, async () => null);
    expect(() => rejectProposal(proposal)).toThrow(InvalidProposalTransitionError);
  });
});

describe('parseAiJsonObject', () => {
  it('parses a direct JSON object', () => {
    expect(parseAiJsonObject<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('extracts a fenced json block wrapped in prose', () => {
    const text = 'Here you go:\n```json\n{"corrective_action":"Fix jig"}\n```\nDone.';
    expect(parseAiJsonObject<{ corrective_action: string }>(text)).toEqual({ corrective_action: 'Fix jig' });
  });

  it('extracts the outermost brace object from prose', () => {
    const text = 'The proposed values are {"client_name":"Acme"} — review please.';
    expect(parseAiJsonObject<{ client_name: string }>(text)).toEqual({ client_name: 'Acme' });
  });

  it('throws honestly on empty or unparseable content (never fabricates)', () => {
    expect(() => parseAiJsonObject('   ')).toThrow(/empty response/);
    expect(() => parseAiJsonObject('no json here at all')).toThrow(/did not contain a parseable JSON object/);
  });
});

describe('fail-closed error classes', () => {
  it('AiDisabledError carries the AI_DISABLED code with the honest default message', () => {
    const err = new AiDisabledError();
    expect(err.code).toBe('AI_DISABLED');
    expect(err.message).toMatch(/no AI provider key is configured/);
  });

  it('AiAuthRequiredError carries AUTH_REQUIRED', () => {
    const err = new AiAuthRequiredError();
    expect(err.code).toBe('AUTH_REQUIRED');
  });
});