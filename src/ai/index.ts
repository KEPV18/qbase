// ============================================================================
// QBase — AI layer barrel (Prime §D5)
// ---------------------------------------------------------------------------
// One import surface for the AI layer. The layered contract:
//   UI → aiComplete/tool proposal builders (src/ai) → domain services
//   (src/services, src/lib) → RPC/RLS (server) → database.
// The AI layer never holds service_role credentials, never touches the
// database directly, and never persists an artifact except as an explicit
// accept action through the same validated paths a manual edit uses.
// ============================================================================

export * from './types';
export * from './proposal';
export * from './parse';
export { aiComplete, type AiResult, type AiCallOptions } from './client';
export {
  draftRecordContentProposal,
  acceptDraftRecordProposal,
  type DraftRecordContentArgs,
  type DraftRecordContentResult,
  type AcceptDraftRecordArgs,
  type AcceptDraftRecordResult,
} from './tools/draftRecordContent';
export {
  DOCUMENT_CATEGORIES,
  classifyDocumentProposal,
  acceptDocumentClassification,
  type ClassifyDocumentArgs,
  type ClassifyDocumentResult,
  type DocumentCategory,
  type AcceptClassificationArgs,
} from './tools/classifyDocument';
export {
  suggestCorrectiveActionProposal,
  acceptCorrectiveActionProposal,
  type SuggestCorrectiveActionArgs,
  type SuggestCorrectiveActionContent,
  type AcceptCorrectiveActionArgs,
} from './tools/suggestCorrectiveAction';
export {
  summarizeAuditTrailProposal,
  acceptAuditTrailSummary,
  type SummarizeAuditTrailArgs,
  type SummarizeAuditTrailContent,
} from './tools/summarizeAuditTrail';