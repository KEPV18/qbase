// ============================================================================
// Procedure ↔ Record Mapping
// Links procedures (ProceduresContent) with QMS records (from Google Sheets)
// using keyword matching against record name & description.
// ============================================================================

import { type QMSRecord, type RecordStatus } from "@/lib/googleSheets";
import { PROCEDURES_CONTENT, type ProcedureSection } from "@/lib/ProceduresContent";

/**
 * Keywords each procedure is associated with.
 * When a QMS record's name/description matches any of these keywords,
 * it is considered "linked" to that procedure.
 *
 * Extend this mapping as new procedures or records are added.
 */
export const PROCEDURE_RECORD_KEYWORDS: Record<string, string[]> = {
  p01: ["risk", "opportunity", "interested party", "context", "issue"],
  p02: ["objective", "target", "kpi", "objective register"],
  p03: ["monitoring", "measurement", "analysis", "kpi", "performance", "trend", "dashboard"],
  p04: ["management review", "review meeting", "action plan"],
  p05: ["internal audit", "audit report", "nonconformity", "audit finding", "audit"],
  p06: ["training", "competence", "awareness", "competency"],
  p07: ["document", "record", "documents", "document control"],
  p08: ["corrective", "corrective action", "capa", "action plan"],
  p09: ["measuring equipment", "calibration", "measurement equipment"],
  p10: ["purchasing", "subcontracting", "vendor", "supplier", "procurement"],
  p11: ["change management", "change request", "change control"],
  p12: ["legal", "compliance", "regulatory", "legal compliance"],
  p13: ["non-conforming", "nonconformity", "ncr", "non conforming"],
};

/**
 * Get all QMS records linked to a given procedure.
 * Matching is case-insensitive against recordName and description.
 */
export function getRecordsForProcedure(
  procedureId: string,
  records: QMSRecord[],
): QMSRecord[] {
  const keywords = PROCEDURE_RECORD_KEYWORDS[procedureId];
  if (!keywords || keywords.length === 0) return [];

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  return records.filter((rec) => {
    const name = (rec.recordName || "").toLowerCase();
    const desc = (rec.description || "").toLowerCase();
    const code = (rec.code || "").toLowerCase();
    return lowerKeywords.some(
      (kw) =>
        name.includes(kw) || desc.includes(kw) || code.includes(kw),
    );
  });
}

/**
 * Get the procedure that is most closely linked to a given record.
 * Returns the procedure ID and title, or null if no match.
 */
export function getProcedureForRecord(
  record: QMSRecord,
): { id: string; title: string } | null {
  const name = (record.recordName || "").toLowerCase();
  const desc = (record.description || "").toLowerCase();
  const code = (record.code || "").toLowerCase();

  // Score each procedure by how many keywords match
  let bestScore = 0;
  let best: { id: string; title: string } | null = null;

  for (const proc of PROCEDURES_CONTENT) {
    const keywords = PROCEDURE_RECORD_KEYWORDS[proc.id];
    if (!keywords) continue;

    const score = keywords.filter((kw) => {
      const lowerKw = kw.toLowerCase();
      return (
        name.includes(lowerKw) ||
        desc.includes(lowerKw) ||
        code.includes(lowerKw)
      );
    }).length;

    if (score > bestScore) {
      bestScore = score;
      best = { id: proc.id, title: proc.title };
    }
  }

  return best;
}

/**
 * Build a lookup map: procedureId → QMSRecord[] for all procedures.
 */
export function groupRecordsByProcedure(
  records: QMSRecord[],
): Record<string, QMSRecord[]> {
  const map: Record<string, QMSRecord[]> = {};
  for (const proc of PROCEDURES_CONTENT) {
    const matched = getRecordsForProcedure(proc.id, records);
    if (matched.length > 0) {
      map[proc.id] = matched;
    }
  }
  return map;
}

/**
 * Build a reverse lookup map: record code → procedureId.
 */
export function buildProcedureLookup(
  records: QMSRecord[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const rec of records) {
    const proc = getProcedureForRecord(rec);
    if (proc) {
      map[rec.code] = proc.id;
    }
  }
  return map;
}

// ============================================================================
// Project ↔ Record Mapping
// Matches records to projects via the "project" field stored in fileReviews
// (set via EditMetadataModal's Project Assignment dropdown).
// ============================================================================

/**
 * Get all QMS records that have at least one file assigned to a given project name.
 * Checks each record's fileReviews for entries where project === projectName.
 *
 * Returns records with a resolvedFile info array containing:
 *   - fileId, fileName, status, reviewDate, reviewedBy, category, whenToFill
 */
export interface ProjectRecordEntry {
  record: QMSRecord;
  files: Array<{
    fileId: string;
    project: string;
    status: RecordStatus;
    reviewDate?: string;
    reviewedBy?: string;
    identifiedErrors?: string;
    errorsFixed?: boolean;
  }>;
}

/**
 * Get all records linked to a project via their fileReviews metadata.
 * The "project" field is set per-file in EditMetadataModal.
 */
export function getRecordsForProject(
  projectName: string,
  records: QMSRecord[],
): ProjectRecordEntry[] {
  const result: ProjectRecordEntry[] = [];

  for (const record of records) {
    const reviews = record.fileReviews || {};
    const matchedFiles: ProjectRecordEntry["files"] = [];

    for (const [fileId, review] of Object.entries(reviews)) {
      const r = review as Record<string, unknown>;
      // Skip meta keys (recordstatus, lastupdated, etc.)
      if (typeof r === "object" && r !== null && r.project === projectName) {
        matchedFiles.push({
          fileId,
          project: r.project as string,
          status: (r.status as RecordStatus) || "pending_review",
          reviewDate: (r.reviewDate as string) || (r.date as string) || "",
          reviewedBy: (r.reviewedBy as string) || "",
          identifiedErrors: (r.identifiedErrors as string) || "",
          errorsFixed: (r.errorsFixed as boolean) || false,
        });
      }
    }

    if (matchedFiles.length > 0) {
      result.push({ record, files: matchedFiles });
    }
  }

  return result;
}
