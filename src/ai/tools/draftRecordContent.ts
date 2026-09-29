// ============================================================================
// QBase — AI tool: draftRecordContent (Prime §D5)
// ---------------------------------------------------------------------------
// Generates proposed field values for a form. The proposal is inert; accept()
// performs the REAL writes through the exact same validated draft path a
// manual creation uses (createDraftRecord → submitRecordDraft → workflow
// engine), then tags provenance with an audit row action='ai_assisted_create'
// appended via the server-derived-actor RPC (never a forged actor).
// ============================================================================

import { getFormSchema } from '@/data/formSchemas';
import { appendAuditLog } from '@/services/auditLog';
import {
  createDraftRecord,
  submitRecordDraft,
  type RecordStatusEnum,
} from '@/services/recordStorage';
import type { Proposal } from '../types';
import { makeProposal, acceptProposal } from '../proposal';
import { parseAiJsonObject } from '../parse';
import { aiComplete } from '../client';

export interface DraftRecordContentArgs {
  formCode: string;
  /** Free-text context: what the record is for (line, client, findings…). */
  context: string;
  signal?: AbortSignal;
}

export interface DraftRecordContentResult {
  /** Proposed form field values (schema keys → values). */
  fields: Record<string, unknown>;
}

/**
 * Ask the AI to draft field values for the given form. Returns a proposal —
 * nothing has been written anywhere.
 */
export async function draftRecordContentProposal(
  args: DraftRecordContentArgs
): Promise<Proposal<Record<string, unknown>>> {
  const schema = getFormSchema(args.formCode);
  if (!schema) {
    throw new Error(`Unknown form code "${args.formCode}" — cannot draft content.`);
  }

  const fieldLines = schema.fields
    .map((f) => {
      const options = f.options?.length ? ` (one of: ${f.options.join(' | ')})` : '';
      const required = f.required ? ' [required]' : '';
      return `- "${f.key}" (${f.label}, type ${f.type})${required}${options}`;
    })
    .join('\n');

  const prompt =
    `You are drafting field values for the QBase form "${schema.name}" (code ${args.formCode}).\n` +
    `Form fields:\n${fieldLines}\n\n` +
    `Context from the quality engineer:\n"""${args.context.slice(0, 12_000)}"""\n\n` +
    `Respond with ONE JSON object whose keys are the field keys above and whose ` +
    `values are appropriate content for this record. Omit a field rather than ` +
    `inventing compliance data you cannot support from the context. No prose.`;

  const result = await aiComplete('draft_record_content', prompt, {
    system:
      'You assist a QMS record-keeping workflow. You propose content; a human ' +
      'always reviews and explicitly accepts before anything is saved.',
    signal: args.signal,
  });

  const fields = parseAiJsonObject<Record<string, unknown>>(result.content);
  return makeProposal({
    tool: 'draft_record_content',
    kind: 'record_content',
    content: fields,
    model: result.model,
    promptPreview: args.context.slice(0, 200),
  });
}

export interface AcceptDraftRecordArgs {
  formCode: string;
  formName?: string;
  section?: number;
  sectionName?: string;
  frequency?: string;
  /** Workflow target enforced server-side by the record engine. */
  submitAs?: RecordStatusEnum;
}

export interface AcceptDraftRecordResult {
  recordId: string;
  serial: string;
  provenanceAudited: boolean;
}

/**
 * Acceptance path — performs the REAL writes through the validated draft
 * flow (the same path used by a manual entry, incl. preWriteValidation on
 * the submit side; the server engine is the authority for identity,
 * permissions and workflow). Then appends ONE provenance audit row with
 * action='ai_assisted_create' via the server-derived-actor RPC.
 */
export async function acceptDraftRecordProposal(
  proposal: Proposal<Record<string, unknown>>,
  args: AcceptDraftRecordArgs
): Promise<{ proposal: Proposal<Record<string, unknown>>; result: AcceptDraftRecordResult }> {
  return acceptProposal(proposal, async (content) => {
    // 1) Real write #1 — create the server-side draft (validated path,
    //    server-side serial allocation).
    const draft = await createDraftRecord(args.formCode, content, {
      formName: args.formName,
      section: args.section,
      sectionName: args.sectionName,
      frequency: args.frequency,
    });

    // 2) Real write #2 — one record_transition through the workflow engine.
    const submitted = await submitRecordDraft(draft.id, content, args.submitAs ?? 'pending_review');
    if (!submitted.success || !submitted.record) {
      throw new Error(submitted.error || 'AI-assisted submit failed with no error detail.');
    }
    const serial = submitted.record.serial as string;

    // 3) Provenance tag — action='ai_assisted_create' via the server-derived
    //    actor RPC. The record write itself already produced genuine audit
    //    rows ('create' + workflow transition); this row marks AI provenance.
    //    If it fails we report it in the result (never silent), but we do not
    //    roll back the accepted record — the write succeeded through the
    //    validated path with its own audit rows.
    const provenance = await appendAuditLog(
      serial,
      'ai_assisted_create',
      '', // ignored — actor is derived server-side
      [], // no field diff: the create/transition rows carry the data changes
      {},
      { ai_tool: 'draft_record_content', ai_model: proposal.provenance.model },
      args.formCode
    );

    return {
      recordId: draft.id,
      serial,
      provenanceAudited: provenance.success,
    };
  });
}