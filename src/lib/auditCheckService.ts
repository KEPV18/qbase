import { QMSRecord } from './googleSheets';
import { getFileMetadata, listFolderFiles, extractFileId, extractFolderId, DriveFile } from './driveService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface AuditIssue {
  message: string;
  severity: IssueSeverity;
  phase: 1 | 2 | 3;
}

export interface AuditRecordResult {
  recordCode: string;
  recordName: string;
  category: string;

  // Phase 1: Record Integrity
  templateStatus: 'valid' | 'invalid' | 'missing_link' | 'duplicate';
  folderStatus: 'valid' | 'invalid' | 'missing_link' | 'wrong_name' | 'duplicate' | 'not_a_folder';

  // Phase 2: File Sequence Integrity  
  sequenceStatus: 'valid' | 'broken' | 'empty' | 'no_serial_parsing' | 'not_checked';

  // Phase 3: File Naming Convention
  namingStatus: 'valid' | 'partial' | 'invalid' | 'not_checked';

  suggestedStatus: 'approved' | 'rejected' | 'pending_review';
  suggestedFixes?: { id: string; currentName: string; suggestedName: string; type: 'folder' | 'file' }[];
  missingSerials: number[];
  issues: AuditIssue[];
  filesChecked: number;
  checkedFileNames?: string[];
  error?: string; // Per-record error message if Drive API failed
}

export interface AuditSummaryStats {
  duration: number;        // seconds
  apiCallsMade: number;
  totalFiles: number;
  totalRecords: number;
  healthScore: number;     // 0-100
}

export interface AuditFullResult {
  records: AuditRecordResult[];
  summary: AuditSummaryStats;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface AuditContext {
  apiCallCount: number;
  usedTemplateIds: Map<string, string>;
  usedFolderIds: Map<string, string>;
}

function extractSequenceNumber(fileName: string): number | null {
  // First try the strict QMS format F/XX-YYY
  const matchF = fileName.match(/F\/\d+-(\d+)/i);
  if (matchF && matchF[1]) return parseInt(matchF[1], 10);

  // Try finding a 3 digit number preceded by spaces, dash, or underscore (e.g., "Form - 001.pdf")
  const matchExact = fileName.match(/[\s_-](\d{3})\b/);
  if (matchExact && matchExact[1]) return parseInt(matchExact[1], 10);

  // Fallback: Try finding any block of digits up to 4 digits long
  // We exclude 4 digit numbers that look like years (e.g., 2023, 2024)
  const matches = fileName.match(/\b\d{1,4}\b/g);
  if (matches) {
    const validMatches = matches.filter(m => {
      const n = parseInt(m, 10);
      return n < 1900 || n > 2100; // Ignore likely years
    });
    if (validMatches.length > 0) {
      return parseInt(validMatches[validMatches.length - 1], 10);
    }
  }
  return null;
}

// ─── Per-Record Audit (isolated, error-safe) ─────────────────────────────────

async function auditSingleRecord(
  record: QMSRecord,
  ctx: AuditContext,
): Promise<AuditRecordResult> {
  const result: AuditRecordResult = {
    recordCode: record.code,
    recordName: record.recordName,
    category: record.category,
    templateStatus: 'missing_link',
    folderStatus: 'missing_link',
    sequenceStatus: 'not_checked',
    namingStatus: 'not_checked',
    suggestedStatus: 'pending_review',
    missingSerials: [],
    issues: [],
    filesChecked: 0,
    checkedFileNames: [],
  };

  try {
    // ═══════ PHASE 1: Link & Name Integrity ═══════

    // 1. Verify Template Link
    let templateId: string | null = null;
    if (record.templateLink && record.templateLink.trim() !== "") {
      templateId = extractFileId(record.templateLink);
      if (!templateId) {
        result.templateStatus = 'invalid';
        result.issues.push({ message: "Template link is malformed or invalid.", severity: 'critical', phase: 1 });
      } else {
        // Uniqueness check
        if (ctx.usedTemplateIds.has(templateId)) {
          result.templateStatus = 'duplicate';
          result.issues.push({ message: `Duplicate Template: same link used in ${ctx.usedTemplateIds.get(templateId)}`, severity: 'warning', phase: 1 });
        } else {
          ctx.usedTemplateIds.set(templateId, record.code);
          ctx.apiCallCount++;
          const metadata = await getFileMetadata(templateId);
          if (!metadata) {
            result.templateStatus = 'invalid';
            result.issues.push({ message: "Template file inaccessible in Google Drive.", severity: 'critical', phase: 1 });
          } else {
            // Name Check
            if (!metadata.name.toLowerCase().includes(record.code.toLowerCase())) {
              const suggestedTemplateName = `${record.code} - ${metadata.name.replace(/^[A-Z]+\/\d+\s*[-_]?\s*/i, '')}`;
              result.issues.push({ message: `Template name mismatch: "${metadata.name}" (expected code "${record.code}")`, severity: 'warning', phase: 1 });
              result.templateStatus = 'invalid';
              
              if (!result.suggestedFixes) result.suggestedFixes = [];
              result.suggestedFixes.push({
                id: templateId,
                currentName: metadata.name,
                suggestedName: suggestedTemplateName,
                type: 'file'
              });
            } else {
              result.templateStatus = 'valid';
            }
          }
        }
      }
    } else {
      result.issues.push({ message: "Missing template link.", severity: 'critical', phase: 1 });
    }

    // 2. Verify Folder Link (saved folder)
    let folderId: string | null = null;
    let folderFiles: DriveFile[] = [];

    if (record.folderLink && record.folderLink.trim() !== "" && !record.folderLink.includes("No Files Yet")) {
      folderId = extractFolderId(record.folderLink);
      if (!folderId) {
        result.folderStatus = 'invalid';
        result.issues.push({ message: "Folder link is malformed or invalid.", severity: 'critical', phase: 1 });
      } else {
        // Uniqueness check
        if (ctx.usedFolderIds.has(folderId)) {
          result.folderStatus = 'duplicate';
          result.issues.push({ message: `Duplicate Folder: same link used in ${ctx.usedFolderIds.get(folderId)}`, severity: 'warning', phase: 1 });
        } else {
          ctx.usedFolderIds.set(folderId, record.code);
          ctx.apiCallCount++;
          const driveFolder = await getFileMetadata(folderId);

          if (!driveFolder) {
            result.folderStatus = 'invalid';
            result.issues.push({ message: "Folder inaccessible in Google Drive.", severity: 'critical', phase: 1 });
          } else if (driveFolder.mimeType && !driveFolder.mimeType.includes('folder')) {
            result.folderStatus = 'not_a_folder';
            result.issues.push({ message: `Target is a File, not a Folder: "${driveFolder.name}"`, severity: 'critical', phase: 1 });
          } else {
            // Folder Name Check
            const folderName = driveFolder.name;
            const folderNameLower = folderName.toLowerCase();
            const recordCodeLower = record.code.toLowerCase();

            if (!folderNameLower.includes(recordCodeLower)) {
              const suggestedFolderName = `${record.code} - ${record.recordName}`;
              result.issues.push({ message: `Folder name mismatch: "${driveFolder.name}" (expected code "${record.code}")`, severity: 'warning', phase: 1 });
              result.folderStatus = 'wrong_name';

              if (!result.suggestedFixes) result.suggestedFixes = [];
              result.suggestedFixes.push({
                id: folderId,
                currentName: driveFolder.name,
                suggestedName: suggestedFolderName,
                type: 'folder'
              });
            } else {
              result.folderStatus = 'valid';
            }

            // ═══════ PHASE 2: File Sequence Integrity ═══════
            if (result.folderStatus === 'valid' || result.folderStatus === 'wrong_name') {
              ctx.apiCallCount++;
              const allFolderFiles = await listFolderFiles(record.folderLink);
              
              // Ignore .json files completely in audit
              folderFiles = allFolderFiles.filter(f => !f.name.toLowerCase().endsWith('.json'));
              
              result.filesChecked = folderFiles.length;
              result.checkedFileNames = folderFiles.map(f => f.name);

              if (folderFiles && folderFiles.length > 0) {
                const extractedSerials: number[] = [];
                let failedParses = 0;

                folderFiles.forEach(f => {
                  const seq = extractSequenceNumber(f.name);
                  if (seq !== null) {
                    extractedSerials.push(seq);
                  } else {
                    failedParses++;
                  }
                });

                if (extractedSerials.length === 0) {
                  result.sequenceStatus = 'no_serial_parsing';
                  result.issues.push({ message: `No serial numbers detected in any of the ${folderFiles.length} files.`, severity: 'info', phase: 2 });
                } else {
                  const uniqueSerials = [...new Set(extractedSerials)].sort((a, b) => a - b);
                  const maxSerial = uniqueSerials[uniqueSerials.length - 1];
                  const missing: number[] = [];
                  const serialSet = new Set(uniqueSerials);

                  for (let j = 1; j < maxSerial; j++) {
                    if (!serialSet.has(j)) {
                      missing.push(j);
                    }
                  }

                  if (missing.length > 0) {
                    result.sequenceStatus = 'broken';
                    result.missingSerials = missing;
                    result.issues.push({ message: `Missing records in sequence: ${missing.join(', ')}`, severity: 'warning', phase: 2 });
                  } else {
                    result.sequenceStatus = 'valid';
                  }

                  if (failedParses > 0) {
                    result.issues.push({ message: `${failedParses} file(s) had no identifiable serial number.`, severity: 'info', phase: 2 });
                  }

                  // Check for duplicate serial numbers
                  const serialCounts = new Map<number, number>();
                  extractedSerials.forEach(s => serialCounts.set(s, (serialCounts.get(s) || 0) + 1));
                  const duplicateSerials = [...serialCounts.entries()].filter(([, count]) => count > 1);
                  if (duplicateSerials.length > 0) {
                    const dupList = duplicateSerials.map(([serial, count]) => `#${serial} (×${count})`).join(', ');
                    result.issues.push({ message: `Duplicate serial numbers found: ${dupList}`, severity: 'warning', phase: 2 });
                  }
                }
              } else {
                result.sequenceStatus = 'empty';
              }
            }

            // ═══════ PHASE 3: File Naming Convention ═══════
            if (folderFiles.length > 0) {
              const codeLower = record.code.toLowerCase();
              let matchCount = 0;
              const badNames: string[] = [];

              folderFiles.forEach(f => {
                const nameLower = f.name.toLowerCase();
                // Check if file name contains the record code (e.g., "F/11" or "F-11")
                const codeVariants = [
                  codeLower,
                  codeLower.replace('/', '-'),
                  codeLower.replace('/', '_'),
                ];
                const matches = codeVariants.some(v => nameLower.includes(v));
                if (matches) {
                  matchCount++;
                } else {
                  badNames.push(f.name);
                  // SUGGEST FIX: prepend code if missing
                  if (!result.suggestedFixes) result.suggestedFixes = [];
                  
                  // Avoid double-prepending if it somehow has a variant but not exactly the right one
                  const suggestedName = `${record.code} - ${f.name.replace(/^[A-Z]+\/\d+\s*[-_]?\s*/i, '')}`;
                  
                  result.suggestedFixes.push({
                    id: f.id,
                    currentName: f.name,
                    suggestedName: suggestedName,
                    type: 'file'
                  });
                }
              });

              if (matchCount === folderFiles.length) {
                result.namingStatus = 'valid';
              } else if (matchCount > 0 || folderFiles.length > 0) {
                result.namingStatus = matchCount > 0 ? 'partial' : 'invalid';
                
                if (badNames.length <= 5) {
                  badNames.forEach(bn => {
                    result.issues.push({ message: `File naming mismatch: "${bn}"`, severity: 'info', phase: 3 });
                  });
                } else {
                  result.issues.push({ message: `${badNames.length} of ${folderFiles.length} files don't follow naming convention (missing "${record.code}" in filename).`, severity: 'info', phase: 3 });
                }
              }

              // Check for duplicate file names within the folder
              const nameCount = new Map<string, number>();
              folderFiles.forEach(f => nameCount.set(f.name.toLowerCase(), (nameCount.get(f.name.toLowerCase()) || 0) + 1));
              const dupFiles = [...nameCount.entries()].filter(([, count]) => count > 1);
              if (dupFiles.length > 0) {
                const dupList = dupFiles.map(([name, count]) => `"${name}" (×${count})`).join(', ');
                result.issues.push({ message: `Duplicate file names in folder: ${dupList}`, severity: 'warning', phase: 3 });
              }

              // File Format Validation
              const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.csv', '.txt'];
              const googleMimeTypes = ['application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet', 'application/vnd.google-apps.presentation'];
              
              const invalidFormatFiles = folderFiles.filter(f => {
                const nameLow = f.name.toLowerCase();
                if (nameLow.startsWith('~$')) return true; // Temp Word file (invalid record)
                
                const hasValidExt = validExtensions.some(ext => nameLow.endsWith(ext));
                const isGoogleDoc = f.mimeType ? googleMimeTypes.includes(f.mimeType) : false;
                
                // If it has no valid extension and is not a native Google doc, it's flagged
                return !hasValidExt && !isGoogleDoc;
              });

              if (invalidFormatFiles.length > 0) {
                const formatList = invalidFormatFiles.map(f => f.name).join(', ');
                result.issues.push({
                  message: `Invalid or unrecognized file format detected: ${formatList}`,
                  severity: 'warning',
                  phase: 3
                });
              }
            }
          }
        }
      }
    } else {
      result.issues.push({ message: "Missing folder link.", severity: 'critical', phase: 1 });
    }

  } catch (err: unknown) {
    result.error = (err as Error)?.message || "Unknown error";
    result.issues.push({ message: `Drive API error: ${result.error}`, severity: 'critical', phase: 1 });
  }

  // ═══════ Suggested Status Calculation ═══════
  const hasCritical = result.issues.some(i => i.severity === 'critical');
  const hasWarning = result.issues.some(i => i.severity === 'warning');

  if (hasCritical) {
    result.suggestedStatus = 'rejected';
  } else if (hasWarning) {
    result.suggestedStatus = 'pending_review';
  } else if (result.templateStatus === 'valid' && result.folderStatus === 'valid' &&
    (result.sequenceStatus === 'valid' || result.sequenceStatus === 'empty')) {
    result.suggestedStatus = 'approved';
  } else {
    result.suggestedStatus = 'pending_review';
  }

  return result;
}

// ─── Main Audit Runner (Batched + Rate-Limited) ──────────────────────────────

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 200; // Delay between batches to avoid 429s

export async function runAutomatedAudit(
  records: QMSRecord[],
  onProgress?: (current: number, total: number, recordCode: string, liveIssues?: AuditIssue[]) => void
): Promise<AuditFullResult> {
  const startTime = Date.now();

  const ctx: AuditContext = {
    apiCallCount: 0,
    usedTemplateIds: new Map(),
    usedFolderIds: new Map(),
  };

  const results: AuditRecordResult[] = [];
  const total = records.length;

  // Process in batches
  // NOTE: We process sequentially within each batch because the duplicate-detection
  // Maps (usedTemplateIds, usedFolderIds) are shared mutable state. Parallel writes
  // would cause race conditions in uniqueness checks. The rate-limit delay between
  // batches still provides pacing for API calls.
  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
    const batch = records.slice(batchStart, batchEnd);

    const batchResults: AuditRecordResult[] = [];
    for (let idx = 0; idx < batch.length; idx++) {
      const record = batch[idx];
      const globalIdx = batchStart + idx;
      const result = await auditSingleRecord(record, ctx);

      // Report progress with live issues
      if (onProgress) {
        onProgress(globalIdx + 1, total, record.code, result.issues.length > 0 ? result.issues : undefined);
      }

      batchResults.push(result);
    }

    results.push(...batchResults);

    // Rate-limit between batches (skip last batch)
    if (batchEnd < total) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Cross-record duplicate file ID check
  const fileIdMap = new Map<string, string[]>(); // fileId -> [recordCodes]
  // (This check uses already-fetched data from the records' files, no extra API calls)
  records.forEach(record => {
    const files = record.files || [];
    files.forEach(file => {
      if (file.name.toLowerCase().endsWith('.json')) return; // Ignore JSON files completely
      if (!fileIdMap.has(file.id)) fileIdMap.set(file.id, []);
      fileIdMap.get(file.id)!.push(record.code);
    });
  });

  // Flag cross-folder duplicates
  fileIdMap.forEach((codes, fileId) => {
    if (codes.length > 1) {
      codes.forEach(code => {
        const result = results.find(r => r.recordCode === code);
        if (result) {
          result.issues.push({
            message: `File ID ${fileId.slice(0, 8)}... is shared with: ${codes.filter(c => c !== code).join(', ')}`,
            severity: 'warning',
            phase: 3,
          });
        }
      });
    }
  });

  const duration = Math.round((Date.now() - startTime) / 1000);
  const totalFiles = results.reduce((sum, r) => sum + r.filesChecked, 0);
  const issueRecords = results.filter(r => r.issues.length > 0).length;
  const healthScore = total > 0 ? Math.round(((total - issueRecords) / total) * 100) : 100;

  return {
    records: results,
    summary: {
      duration,
      apiCallsMade: ctx.apiCallCount,
      totalFiles,
      totalRecords: total,
      healthScore,
    },
  };
}
