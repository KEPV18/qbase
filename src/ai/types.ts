// ============================================================================
// QBase — AI layer types (Prime §D5)
// ---------------------------------------------------------------------------
// Architecture: AI → AI Tools → Domain Services → Authorization → Database.
// The AI layer never receives service_role credentials or direct DB handles.
// Every AI artifact is a PROPOSAL object; approval is a normal user action
// that then performs the real write through the same validated paths a manual
// edit would use, audited with action='ai_assisted_create' (record content).
// ============================================================================

/** The four allow-listed AI tools (mirrors api/ai.js ALLOWED_TOOLS). */
export type AiToolName =
  | 'draft_record_content'
  | 'classify_document'
  | 'suggest_corrective_action'
  | 'summarize_audit_trail';

/** Lifecycle states of a proposal object. */
export type ProposalState =
  | 'proposed'    // AI output arrived, untouched
  | 'edited'      // user modified the proposed content
  | 'accepted'    // user approved — the real write HAPPENED via domain services
  | 'rejected';   // user discarded the proposal (no write)

/** Kind of artifact the proposal carries. */
export type ProposalKind =
  | 'record_content'          // draftRecordContent — fields for a new record
  | 'document_classification' // classifyDocument — category + rationale
  | 'corrective_action'       // suggestCorrectiveAction — CAPA action text
  | 'audit_trail_summary';    // summarizeAuditTrail — text summary (read-only)

/** Field-level diff used by the proposal "compare" state. */
export interface ProposalDiff {
  changedFields: string[];
  baselineValues: Record<string, unknown>;
  currentValues: Record<string, unknown>;
}

/**
 * A proposal: an AI-generated artifact that can never touch persistence on
 * its own. Only `accept` performs a real write — and always through the
 * same validated domain-service path a manual edit uses.
 */
export interface Proposal<TContent = Record<string, unknown>> {
  id: string;
  tool: AiToolName;
  kind: ProposalKind;
  /** The AI content as generated (immutable baseline for compare). */
  baseline: TContent;
  /** The current proposal content (equals baseline until edited). */
  content: TContent;
  state: ProposalState;
  /** Provenance: which model, when, and the user prompt that produced it. */
  provenance: {
    model: string | null;
    createdAt: string;
    promptPreview: string;
  };
}

/** Error thrown when the deployment has no provider key (endpoint 503). */
export class AiDisabledError extends Error {
  readonly code = 'AI_DISABLED' as const;
  constructor(message = 'AI assistance is disabled — no AI provider key is configured.') {
    super(message);
    this.name = 'AiDisabledError';
  }
}

/** Error thrown when the session is missing/expired (endpoint 401). */
export class AiAuthRequiredError extends Error {
  readonly code = 'AUTH_REQUIRED' as const;
  constructor(message = 'Sign in to use AI assistance.') {
    super(message);
    this.name = 'AiAuthRequiredError';
  }
}