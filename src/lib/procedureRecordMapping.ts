// Stub: Procedure-to-record mapping from QMS Personal
// QBase uses Supabase records instead of Google Sheets
// This module is imported by ProceduresPage for type compatibility only

export interface ProcedureRecord {
  code: string;
  recordName: string;
  actualRecordCount?: number;
}

export function getRecordsForProcedure(_procedureId: string, _records: unknown[]): ProcedureRecord[] {
  return [];
}