// ============================================================================
// QBase — AI tool: classifyDocument (Prime §D5)
// ---------------------------------------------------------------------------
// Proposes a document classification (ISO 9001 document pyramid: record /
// procedure / work instruction / form / certificate / report...) for pasted
// content. The proposal is inert. Acceptance persists ONLY when a server-side
// draft id is supplied — the classification is merged into the draft content
// through the same validated autosave path a manual keystroke uses.
// Finalized records are NEVER silently mutated: for those the tool refuses
// with a readable error, because editing finalized data requires the
// conflict-checked update path with a modification reason (a deliberate user
// edit, not an AI side-effect).
// ============================================================================

import { autosaveRecordDraft } from '@/services/recordStorage';
import type { Proposal } from '../types';
import { makeProposal, acceptProposal } from '../proposal';
import { parseAiJsonObject } from '../parse';
import { aiComplete } from '../client';

/** The classification vocabulary (kept closed — no free-form categories). */
export const DOCUMENT_CATEGORIES = [
  'record',
  'procedure',
  'work_instruction',
  'form',
  'quality_manual',
  'certificate',
  'report',
  'other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface ClassifyDocumentArgs {
  formCode: string;
  /** The document/record text to classify (already fetched by the caller). */
  text: string;
  signal?: AbortSignal;
}

export interface ClassifyDocumentResult {
  category: DocumentCategory;
  rationale: string;
}

/**
 * Classify content into the closed category vocabulary. Returns a proposal
 * carrying {category, rationale} — nothing persisted.
 */
export async function classifyDocumentProposal(
  args: ClassifyDocumentArgs
): Promise<Proposal<ClassifyDocumentResult>> {
  if (!args.text.trim()) {
    throw new Error('No document text supplied to classify.');
  }

  const prompt =
    `Classify this QBase document content (form ${args.formCode}) into exactly one ` +
    `category from: ${DOCUMENT_CATEGORIES.join(', ')}.\n\n` +
    `Content:\n"""${args.text.slice(0, 40_000)}"""\n\n` +
    `Respond with ONE JSON object: {"category": "<one of the list>", ` +
    `"rationale": "<one or two sentences, grounded in the content>"}. No prose.`;

  const result = await aiComplete('classify_document', prompt, {
    system:
      'You classify QMS documents. Respond only with the requested JSON object; ' +
      'choose a category strictly from the supplied list.',
    maxTokens: 300,
    signal: args.signal,
  });

  const parsed = parseAiJsonObject<{ category?: string; rationale?: string }>(result.content);
  const category = parsed.category;
  if (!category || !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    throw new Error(
      `AI proposed category "${String(category)}" which is outside the closed category list.`
    );
  }

  return makeProposal({
    tool: 'classify_document',
    kind: 'document_classification',
    content: { category: category as DocumentCategory, rationale: parsed.rationale || '' },
    model: result.model,
    promptPreview: args.text.slice(0, 200),
  });
}

export interface AcceptClassificationArgs {
  /**
   * The server-side draft to merge the classification into. Acceptance is
   * deliberately draft-only: finalized records go through the reason-required
   * update path as a normal user edit instead.
   */
  draftId: string;
}

/**
 * Acceptance path — merges `ai_classification` into the DRAFT's content via
 * the validated autosave RPC. Refuses honestly (throws) when the draft write
 * fails (e.g. the draft was submitted or discarded meanwhile).
 */
export async function acceptDocumentClassification(
  proposal: Proposal<ClassifyDocumentResult>,
  args: AcceptClassificationArgs
): Promise<Proposal<ClassifyDocumentResult>> {
  return (
    await acceptProposal(proposal, async (content) => {
      // Validated path: record_draft_autosave RPC (draft status enforced
      // server-side by the record engine).
      const saved = await autosaveRecordDraft(args.draftId, {
        ai_classification: {
          category: content.category,
          rationale: content.rationale,
          ai_model: proposal.provenance.model,
          classified_at: new Date().toISOString(),
        },
      });
      if (!saved.success) {
        throw new Error(
          saved.error ||
          'Could not persist the classification — the draft may have been submitted or discarded.'
        );
      }
      return saved;
    })
  ).proposal;
}