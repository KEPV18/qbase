// ============================================================================
// QMS Forge — Record Utility Functions
// Shared record helpers extracted from mockRecords.ts.
// Works with RecordData from recordStorage (Supabase-backed).
// ============================================================================

type EditRiskLevel = 'none' | 'low' | 'medium' | 'high';

/** Get edit risk level based on edit count */
export function getEditRiskLevel(record: { _editCount?: number }): EditRiskLevel {
  const count = record._editCount ?? 0;
  if (count === 0) return 'none';
  if (count <= 1) return 'low';
  if (count <= 3) return 'medium';
  return 'high';
}