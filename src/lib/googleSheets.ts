import { DriveFile } from './driveService';
import { MODULE_MAPPINGS, normalizeCategory as configNormalizeCategory, normalizeAuditStatus as configNormalizeAuditStatus } from '@/config/modules';

// Local aliases for use within this file
const normalizeCategory = configNormalizeCategory;
const normalizeAuditStatus = configNormalizeAuditStatus;
import { getAccessToken } from './auth';

// Google Sheets API Configuration - MUST be set via environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || "";
const SHEET_NAME = "Data";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Status types for record workflow
export type RecordStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

// Type for individual file review metadata stored in Column P
export interface FileReview {
  status: RecordStatus;
  comment: string;
  reviewedBy?: string;
  reviewDate?: string;
  date?: string;
  project?: string;
  targetMonth?: string;
  targetYear?: string;
  identifiedErrors?: string;
  errorsFixed?: boolean;
  [key: string]: unknown;
}

// Form Template - represents the 35 form definitions
export interface FormTemplate {
  code: string;
  recordName: string;
  category: string;
  description: string;
  whenToFill: string;
  templateLink: string;
  folderLink: string;
  isoClause?: string;
}

// Record Instance - represents actual filled forms in Drive folders
export interface RecordInstance {
  id: string;
  formCode: string;
  serialNumber: string;
  fileName: string;
  fileLink: string;
  createdDate: Date;
  status: RecordStatus;
  reviewedBy?: string;
  reviewDate?: Date;
  reviewNotes?: string;
}

// Enhanced QMS Record with actual file count from Drive
export interface QMSRecord {
  rowIndex: number;
  category: string;
  code: string;
  recordName: string;
  description: string;
  whenToFill: string;
  templateLink: string;
  folderLink: string;
  lastSerial: string;
  lastFileDate: string;
  daysAgo: string;
  nextSerial: string;
  auditStatus: string;
  reviewed: boolean;
  reviewedBy: string;
  reviewDate: string;
  // New field: actual count from Drive folder
  actualRecordCount?: number;
  // New field: individual file reviews (from Column P)
  fileReviews?: Record<string, FileReview>;
  // New field: actual files from Drive
  files?: DriveFile[];
  // New field: days remaining until next required fill
  daysUntilNextFill?: number;
  fillFrequency?: string;
  isOverdue?: boolean;
  // Extended fields for atomic/file-based records
  isAtomic?: boolean;
  fileStatus?: RecordStatus;
  fileReviewedBy?: string;
  fileId?: string;
  fileName?: string;
  fileLink?: string;
  fileComment?: string;
  fileProject?: string;
  fileTargetYear?: string;
  googleDriveFileId?: string;
  driveFileId?: string;
}

export interface ModuleStats {
  id: string;
  name: string;
  formsCount: number;   // Number of templates (formerly 'total')
  recordsCount: number; // Total files in Drive folders
  pendingCount: number; // Files awaiting review
  issuesCount: number;  // Templates with 'Issue' status
  compliantFormsCount: number; // Number of templates with 'Approved' status
}

export interface AuditSummary {
  total: number;
  compliant: number;
  pending: number;
  issues: number;
  complianceRate: number;
}

export interface ReviewSummary {
  completed: number;
  pending: number;
  total: number;
  rejected: number;
}

export interface MonthlyComparison {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  isPositive: boolean;
}

// ── Unified File Status Resolution ──────────────────────────────────────────
// Single source of truth for file-level status counts.
// All dashboard/audit/module calculations MUST use this to avoid inconsistent logic.

/** Metadata keys in fileReviews that are NOT actual file IDs */
const FILE_REVIEW_META_KEYS = new Set([
  'recordstatus', 'lastupdated', 'lastauditdate', 'auditissues'
]);

/** A single file with its resolved status, linked back to its parent record/category */
export interface ResolvedFile {
  id: string;                // Drive file ID or fileReviews key
  status: RecordStatus;      // resolved status
  recordCategory: string;    // parent record category (normalized id)
  recordCategoryName: string;// parent record category display name
  recordCode: string;        // parent record code (e.g. "F/01")
  source: 'drive' | 'reviews'; // where we found this file
}

/**
 * Resolve all files across all records and determine each file's status.
 *
 * Priority for status resolution (per file):
 *   1. If Drive files are available (record.files.length > 0):
 *      - Match each Drive file to its fileReviews entry by ID
 *      - Use individual review status, fall back to record-level status
 *   2. If no Drive files but fileReviews has entries:
 *      - Skip meta-keys (recordstatus, lastupdated, etc.)
 *      - Use each fileReview entry's individual status, fall back to record-level status
 *   3. If no files and no reviews:
 *      - No files to count for this record
 *
 * This function is the ONLY place that decides how many files exist and their status.
 * calculateReviewSummary, calculateAuditSummary, calculateModuleStats all derive from this.
 */
export function resolveFileStatuses(records: QMSRecord[]): ResolvedFile[] {
  const resolved: ResolvedFile[] = [];

  for (const record of records) {
    const files = record.files || [];
    const reviews = (record.fileReviews || {}) as Record<string, FileReview>;
    const recordLevelStatus = (
      (reviews as Record<string, unknown>)?.recordStatus as string ||
      record.auditStatus ||
      'pending'
    ).toLowerCase() as RecordStatus;

    const normalized = normalizeCategory(record.category);
    const categoryId = normalized?.id || record.category;
    const categoryName = normalized?.name || record.category;

    if (files.length > 0) {
      // ── Source 1: Drive files available ──────────────────────────────────
      for (const file of files) {
        const review = reviews[file.id];
        const status = normalizeStatus(review?.status || recordLevelStatus);
        resolved.push({
          id: file.id,
          status,
          recordCategory: categoryId,
          recordCategoryName: categoryName,
          recordCode: record.code,
          source: 'drive',
        });
      }
    } else {
      // ── Source 2: No Drive files — use fileReviews from Column P ──────────
      const reviewEntries = Object.entries(reviews).filter(
        ([key]) => !FILE_REVIEW_META_KEYS.has(key.toLowerCase())
      );

      if (reviewEntries.length > 0) {
        for (const [fileId, reviewData] of reviewEntries) {
          const review = reviewData as FileReview;
          const status = normalizeStatus(review?.status || recordLevelStatus);
          resolved.push({
            id: fileId,
            status,
            recordCategory: categoryId,
            recordCategoryName: categoryName,
            recordCode: record.code,
            source: 'reviews',
          });
        }
      }
      // ── Source 3: No files, no reviews → nothing to add ──────────────────
    }
  }

  return resolved;
}

/** Normalize any status string into a proper RecordStatus */
function normalizeStatus(raw: string): RecordStatus {
  const lower = raw.toLowerCase().trim();
  if (lower === 'approved') return 'approved';
  if (lower === 'rejected') return 'rejected';
  if (lower === 'draft') return 'draft';
  // Treat anything else (pending_review, pending, etc.) as pending_review
  return 'pending_review';
}

/**
 * Quick aggregate counts from resolved files — used by all dashboard functions.
 */
export function getFileStatusCounts(files: ResolvedFile[]): {
  approved: number;
  pending: number;
  rejected: number;
  draft: number;
  total: number;
} {
  let approved = 0, pending = 0, rejected = 0, draft = 0;
  for (const f of files) {
    switch (f.status) {
      case 'approved': approved++; break;
      case 'pending_review': pending++; break;
      case 'rejected': rejected++; break;
      case 'draft': draft++; break;
    }
  }
  return { approved, pending, rejected, draft, total: approved + pending + rejected + draft };
}

// Module category mappings are now in @/config/modules.ts
// Re-export for backward compatibility with files that import from googleSheets

export { normalizeCategory, normalizeAuditStatus, MODULE_MAPPINGS } from '@/config/modules';

function isValidRecord(row: string[]): boolean {
  const code = row[1]?.trim() || "";

  // Skip empty codes
  if (!code) return false;

  // Skip "No Code" markers
  if (code.includes("No Code") || code.includes("⚪")) return false;

  // Skip folder headers (they often have emoji prefixes)
  if (code.includes("📂") || code.includes("Folder")) return false;

  // Valid codes typically start with F/ or similar pattern
  return /^[A-Z]+\/\d+/i.test(code) || /^\d+$/.test(code);
}

// normalizeAuditStatus is now imported from @/config/modules

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export async function fetchSheetData(): Promise<QMSRecord[]> {
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:R?key=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  // Skip header row (index 0)
  const records: QMSRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!isValidRecord(row)) continue;

    const auditStatus = row[11] || "";
    const lastSerial = row[7] || "";

    // Parse count from text like "(4 files)"
    const countMatch = auditStatus.match(/\((\d+)\s+files?\)/i);
    let parsedCount = countMatch ? parseInt(countMatch[1]) : 0;

    // If no "(X files)" pattern but we have a serial, it counts as at least 1 file
    if (parsedCount === 0 && lastSerial && lastSerial !== "" && !lastSerial.toLowerCase().includes("no files")) {
      parsedCount = 1;
    }

    // Parse file reviews from Column P (index 15)
    let fileReviews: unknown = {};
    if (row[15]) {
      try {
        fileReviews = JSON.parse(row[15]);
      } catch (e) {
        // Error logged
      }
    }

    // Default to 'Pending' as requested by user, 
    // but check if we have an app-specific status stored in the JSON metadata
    let appStatus = "Pending";
    if (fileReviews.recordStatus) {
      if (fileReviews.recordStatus === 'approved') appStatus = "Approved";
      else if (fileReviews.recordStatus === 'rejected') appStatus = "Rejected";
    }

    records.push({
      rowIndex: i + 1, // 1-indexed for API calls
      category: row[0] || "",
      code: row[1] || "",
      recordName: row[2] || "",
      description: row[3] || "",
      whenToFill: row[4] || "",
      templateLink: row[5] || "",
      folderLink: row[6] || "",
      lastSerial: lastSerial,
      lastFileDate: row[8] || "",
      daysAgo: row[9] || "",
      nextSerial: row[10] || "",
      auditStatus: appStatus,
      reviewed: (row[17] || "").toUpperCase() === "TRUE", // Column R is index 17
      reviewedBy: row[13] || "",
      reviewDate: row[14] || "", // Column O is index 14
      actualRecordCount: parsedCount,
      fileReviews: fileReviews,
      ...calculateFillStats(row[4] || "", row[8] || ""), // Pass 'When to Fill' and 'Last File Date'
    });
  }

  return records;
}

/**
 * Fetch sheet data and populate actual record counts from Google Drive folders
 * This is the enhanced version that includes Drive API integration
 */
export async function fetchSheetDataWithDriveCounts(): Promise<QMSRecord[]> {
  // First, get all records from the sheet
  const records = await fetchSheetData();

  // Import Drive service dynamically to avoid circular dependencies
  const { batchGetFolderCounts } = await import('./driveService');

  // Extract all folder links
  const folderLinks = records
    .map(r => r.folderLink)
    .filter(link => link && link.trim() !== "" && !link.includes("No Files Yet"));

  // Batch fetch file counts for all folders
  const folderCounts = await batchGetFolderCounts(folderLinks);

  // Populate actualRecordCount for each record
  records.forEach(record => {
    const driveCount = folderCounts.get(record.folderLink);

    // If we have a count from the sheet (e.g. "(4 files)"), use it if higher
    // but default to Drive count as the actual physical truth
    if (driveCount !== undefined) {
      record.actualRecordCount = Math.max(record.actualRecordCount || 0, driveCount);
    }
  });

  return records;
}

/**
 * Fetch everything: Sheets data + Drive file list for each record
 */
export async function fetchSheetDataWithAllFiles(): Promise<QMSRecord[]> {
  const records = await fetchSheetData();
  
  try {
    const { batchGetFolderFiles } = await import('./driveService');

    const folderLinks = records
      .map(r => r.folderLink)
      .filter(link => link && link.trim() !== "" && !link.includes("No Files Yet"));

    const allFiles = await batchGetFolderFiles(folderLinks);

    records.forEach(record => {
      const driveFiles = allFiles.get(record.folderLink);
      if (driveFiles && driveFiles.length > 0) {
        record.files = driveFiles;
        record.actualRecordCount = driveFiles.length;

        if (!record.fileReviews) record.fileReviews = {};

        driveFiles.forEach(file => {
          const review = record.fileReviews![file.id] || { status: 'pending_review', comment: '' };
          
          if (!review.project) {
             review.project = "General / All Company";
          }
          if (!review.targetMonth || !review.targetYear) {
             const d = file.createdTime ? new Date(file.createdTime) : new Date();
             review.targetMonth = (d.getMonth() + 1).toString();
             review.targetYear = d.getFullYear().toString();
          }
          
          record.fileReviews![file.id] = review;
        });

        // Update lastFileDate dynamically from the actual Drive files
        if (driveFiles.length > 0) {
          // Sort files by createdTime to find the absolute newest one
          const sortedFiles = [...driveFiles].sort((a, b) =>
            new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
          );

          const newestDate = sortedFiles[0].createdTime;
          record.lastFileDate = newestDate;

          // RE-CALCULATE compliance stats with this live date
          const liveStats = calculateFillStats(record.whenToFill || "", newestDate);
          record.daysUntilNextFill = liveStats.daysUntilNextFill;
          record.isOverdue = liveStats.isOverdue;
        }
      }
    });
  } catch (error) {
    console.error('Error calculating fill statistics:', error);
  }

  return records;
}


export async function updateSheetCell(
  rowIndex: number,
  column: string,
  value: string
): Promise<boolean> {
  // Always quote sheet name in case it contains spaces
  const range = `'${SHEET_NAME}'!${column}${rowIndex}`;
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No access token available. Please restart the OAuth server.");
  }

  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  // Debug log
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      values: [[value]],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    throw new Error(`Google Sheets rejected the write: ${message}`);
  }

  return true;
}

export async function batchUpdateReviewedBy(
  records: QMSRecord[],
  reviewerName: string
): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No access token available.");

  const data = records
    .filter(r => r.code && r.rowIndex)
    .map(r => ({
      range: `'${SHEET_NAME}'!N${r.rowIndex}`,
      values: [[reviewerName]],
    }));

  if (data.length === 0) return false;

  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values:batchUpdate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || response.statusText);
  }
  return true;
}

export function calculateModuleStats(records: QMSRecord[]): ModuleStats[] {
  const resolved = resolveFileStatuses(records);
  const moduleMap = new Map<string, ModuleStats>();

  // Track which records belong to which module for formsCount
  const recordModules = new Map<string, string>();
  for (const record of records) {
    const normalized = normalizeCategory(record.category);
    if (!normalized) continue;
    recordModules.set(record.code, normalized.id);
  }

  // Initialize modules from MODULE_MAPPINGS to ensure all are present
  for (const mapping of Object.values(MODULE_MAPPINGS)) {
    if (!moduleMap.has(mapping.id)) {
      moduleMap.set(mapping.id, {
        id: mapping.id,
        name: mapping.name,
        formsCount: 0,
        recordsCount: 0,
        pendingCount: 0,
        issuesCount: 0,
        compliantFormsCount: 0,
      });
    }
  }

  // Count forms (templates) per module
  for (const record of records) {
    const normalized = normalizeCategory(record.category);
    if (!normalized) continue;
    const stats = moduleMap.get(normalized.id);
    if (!stats) continue;
    stats.formsCount++;

    // A template is "compliant" if it has at least one file with evidence
    if ((record.actualRecordCount || 0) > 0 || (record.files?.length || 0) > 0) {
      stats.compliantFormsCount++;
    }
  }

  // Count resolved files per module
  for (const file of resolved) {
    const stats = moduleMap.get(file.recordCategory);
    if (!stats) continue;
    stats.recordsCount++;
    switch (file.status) {
      case 'approved': break; // not pending, not issue
      case 'rejected': stats.issuesCount++; break;
      case 'pending_review': case 'draft': stats.pendingCount++; break;
    }
  }

  // Sort by module order
  return Array.from(moduleMap.values()).sort((a, b) => {
    const orderA = Object.values(MODULE_MAPPINGS).find(m => m.id === a.id)?.order || 99;
    const orderB = Object.values(MODULE_MAPPINGS).find(m => m.id === b.id)?.order || 99;
    return orderA - orderB;
  });
}

export function calculateAuditSummary(records: QMSRecord[]): AuditSummary {
  const resolved = resolveFileStatuses(records);
  const counts = getFileStatusCounts(resolved);

  const totalTemplates = records.length;
  const compliantTemplates = records.filter(
    r => (r.actualRecordCount || 0) > 0 || (r.files?.length || 0) > 0
  ).length;

  const complianceRate = totalTemplates > 0
    ? Math.round((compliantTemplates / totalTemplates) * 100)
    : 0;

  return {
    total: totalTemplates,
    compliant: compliantTemplates,
    pending: counts.pending,
    issues: counts.rejected,
    complianceRate,
  };
}

export function calculateReviewSummary(records: QMSRecord[]): ReviewSummary {
  const resolved = resolveFileStatuses(records);
  const counts = getFileStatusCounts(resolved);

  return {
    completed: counts.approved,
    pending: counts.pending,
    total: counts.total,
    rejected: counts.rejected,
  };
}

export function calculateMonthlyComparison(records: QMSRecord[]): MonthlyComparison {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let currentMonth = 0;
  let previousMonth = 0;

  for (const record of records) {
    const date = parseDate(record.lastFileDate);
    if (!date) continue;

    if (date >= thirtyDaysAgo) {
      currentMonth++;
    } else if (date >= sixtyDaysAgo) {
      previousMonth++;
    }
  }

  const percentageChange = previousMonth > 0
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
    : currentMonth > 0 ? 100 : 0;

  return {
    currentMonth,
    previousMonth,
    percentageChange: Math.abs(percentageChange),
    isPositive: percentageChange >= 0,
  };
}

export function getRecentActivity(records: QMSRecord[], limit: number = 5): QMSRecord[] {
  // Sort by last file date, most recent first
  const sorted = [...records]
    .filter(r => r.lastFileDate)
    .sort((a, b) => {
      const dateA = parseDate(a.lastFileDate);
      const dateB = parseDate(b.lastFileDate);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

  return sorted.slice(0, limit);
}

export function formatTimeAgo(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getModuleForCategory(category: string): string {
  const normalized = normalizeCategory(category);
  return normalized?.name || category;
}

/**
 * Calculate days remaining based on frequency and last sync
 */
function calculateFillStats(frequencyStr: string, lastDateStr: string) {
  if (!frequencyStr) return { daysUntilNextFill: undefined, isOverdue: false, fillFrequency: frequencyStr || "" };

  const freqLower = frequencyStr.toLowerCase();
  if (freqLower.includes("needed") || freqLower.includes("event") || freqLower === "manual") {
    return { daysUntilNextFill: undefined, isOverdue: false, fillFrequency: frequencyStr };
  }

  if (!lastDateStr) return { daysUntilNextFill: undefined, isOverdue: false, fillFrequency: frequencyStr };

  const lastDate = parseDate(lastDateStr);
  if (!lastDate) return { daysUntilNextFill: undefined, isOverdue: false, fillFrequency: frequencyStr };

  const now = new Date();

  let intervalDays = 0;
  if (freqLower.includes("daily") || freqLower === "day") intervalDays = 1;
  else if (freqLower.includes("weekly") || freqLower.includes("week")) intervalDays = 7;
  else if (freqLower.includes("bi-weekly")) intervalDays = 14;
  else if (freqLower.includes("monthly") || freqLower.includes("month")) intervalDays = 30;
  else if (freqLower.includes("quarterly") || freqLower.includes("3 months")) intervalDays = 90;
  else if (freqLower.includes("semi-annually") || freqLower.includes("6 months")) intervalDays = 182;
  else if (freqLower.includes("annually") || freqLower.includes("yearly") || freqLower.includes("year")) intervalDays = 365;

  if (intervalDays === 0) return { daysUntilNextFill: undefined, isOverdue: false, fillFrequency: frequencyStr };

  const nextDueDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // Calculate difference
  const diffMs = nextDueDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Use floor for "remaining days"

  return {
    daysUntilNextFill: Math.max(-999, diffDays),
    isOverdue: diffDays < 0,
    fillFrequency: frequencyStr
  };
}

/**
 * Delete a record from the Google Sheet
 */
export async function deleteRecord(rowIndex: number): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No access token available. Please restart the OAuth server.");
  }

  const range = `'${SHEET_NAME}'!A${rowIndex}:Z${rowIndex}`;

  // Clear the row using authenticated request
  const clearResponse = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!clearResponse.ok) {
    const errorData = await clearResponse.json().catch(() => ({}));
    const message = errorData.error?.message || clearResponse.statusText;
    throw new Error(`Failed to clear record from sheet: ${message}`);
  }
}
