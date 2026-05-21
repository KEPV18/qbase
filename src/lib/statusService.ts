// Status Management Service
// Handles record status workflow and transitions

import type { RecordStatus, QMSRecord } from './googleSheets';
import { updateSheetCell } from './googleSheets';

/** Minimal shape for record-like objects used in status operations */
interface StatusRecord extends Pick<QMSRecord, 'rowIndex' | 'auditStatus' | 'reviewed' | 'fileReviews'> {
    actualRecordCount?: number;
}

// Status workflow transitions
const STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
    draft: ['pending_review'],
    pending_review: ['approved', 'rejected'],
    approved: [], // Terminal state
    rejected: ['draft'], // Can resubmit
};

// Status display labels
export const STATUS_LABELS: Record<RecordStatus, { en: string; color: string }> = {
    draft: {
        en: 'Draft',
        color: 'gray',
    },
    pending_review: {
        en: 'Pending Review',
        color: 'yellow',
    },
    approved: {
        en: 'Approved',
        color: 'green',
    },
    rejected: {
        en: 'Rejected',
        color: 'red',
    },
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: RecordStatus, to: RecordStatus): boolean {
    const allowedTransitions = STATUS_TRANSITIONS[from];
    return allowedTransitions.includes(to);
}

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedNextStatuses(currentStatus: RecordStatus): RecordStatus[] {
    return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Parse status from Google Sheets audit status field with priority to 'reviewed' flag
 */
export function parseStatusFromAuditField(auditStatus: string, reviewed: boolean = false, hasFiles: boolean = false, metadata?: { recordStatus?: string }): RecordStatus {
    // 0. Priority: If metadata explicitly says 'rejected' from Automated Audit
    if (metadata?.recordStatus === 'rejected') {
        return 'rejected';
    }

    // 1. Priority: If reviewed is true, it's definitely approved
    if (reviewed) {
        return 'approved';
    }

    // 2. If it has files but not reviewed, it's definitely pending review
    if (hasFiles) {
        return 'pending_review';
    }

    // 3. Fallback to parsing text for issues or specific draft status
    const lower = (auditStatus || '').toLowerCase().trim();
    if (lower.includes('rejected') || lower.includes('❌') || lower.includes('nc')) {
        return 'rejected';
    }

    if (lower.includes('pending') || lower.includes('review') || lower.includes('waiting')) {
        return 'pending_review';
    }

    // Default for empty forms with no files
    return 'draft';
}

/**
 * Convert RecordStatus to audit status string for Google Sheets
 */
export function statusToAuditField(status: RecordStatus): string {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'pending_review':
            return 'Pending Review';
        case 'draft':
            return 'Draft';
        default:
            return 'Waiting';
    }
}

/**
 * Update a specific file's review status
 */
export async function updateFileReview(
    rowIndex: number,
    fileId: string,
    status: RecordStatus,
    comment: string,
    reviewedBy: string,
    existingReviews: Record<string, { status?: RecordStatus; comment?: string; reviewedBy?: string; reviewDate?: string }> = {}
): Promise<boolean> {
    const existingFileReview = existingReviews[fileId] || {};
    const updatedReviews = {
        ...existingReviews,
        [fileId]: { 
            ...existingFileReview,
            status, 
            comment, 
            reviewedBy, 
            reviewDate: new Date().toISOString() 
        }
    };

    return await updateSheetCell(
        rowIndex,
        'P',
        JSON.stringify(updatedReviews)
    );
}

/**
 * Update record status in Google Sheets
 */
export async function updateRecordStatus(
    record: StatusRecord, // Passing the whole record to handle metadata merging
    newStatus: RecordStatus,
    reviewedBy?: string
): Promise<boolean> {
    const { rowIndex, fileReviews = {} } = record;

    // 1. Update overall status inside the JSON in Column P
    const updatedMetadata = {
        ...fileReviews,
        recordStatus: newStatus,
        lastUpdated: new Date().toISOString()
    };

    await updateSheetCell(
        rowIndex,
        'P',
        JSON.stringify(updatedMetadata)
    );

    // 2. If approved or rejected, mark as reviewed in metadata columns
    if (newStatus === 'approved' || newStatus === 'rejected') {
        // Update reviewed column (column R = 18)
        await updateSheetCell(rowIndex, 'R', 'TRUE');

        // Update reviewed by (column N = 14)
        if (reviewedBy) {
            await updateSheetCell(rowIndex, 'N', reviewedBy);
        }

        // Update review date (column O = 15)
        const today = new Date().toISOString().split('T')[0];
        await updateSheetCell(rowIndex, 'O', today);
    } else {
        // If pending or draft, clear the reviewed flag and metadata
        await updateSheetCell(rowIndex, 'R', 'FALSE');
        await updateSheetCell(rowIndex, 'N', '');
        await updateSheetCell(rowIndex, 'O', '');
    }

    return true;
}

export async function bulkApproveRecords(
    records: StatusRecord[],
    reviewedBy: string
): Promise<number> {
    let successCount = 0;

    for (const record of records) {
        const success = await updateRecordStatus(record, 'approved', reviewedBy);
        if (success) {
            successCount++;
        }
    }

    return successCount;
}

/**
 * Bulk reject multiple records
 * @param records - Array of records to reject
 * @param reviewedBy - Who is rejecting
 * @returns Number of successfully rejected records
 */
export async function bulkRejectRecords(
    records: unknown[],
    reviewedBy: string
): Promise<number> {
    let successCount = 0;

    for (const record of records) {
        const success = await updateRecordStatus(record, 'rejected', reviewedBy);
        if (success) {
            successCount++;
        }
    }

    return successCount;
}

/**
 * Get status badge color class for UI
 */
export function getStatusBadgeClass(status: RecordStatus): string {
    const colors = {
        draft: 'bg-gray-100 text-gray-800 border-gray-300',
        pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        approved: 'bg-green-100 text-green-800 border-green-300',
        rejected: 'bg-red-100 text-red-800 border-red-300',
    };

    return colors[status] || colors.draft;
}

/**
 * Get status statistics from records
 */
export function getStatusStats(records: unknown[]): {
    draft: number;
    pending_review: number;
    approved: number;
    rejected: number;
    total: number;
} {
    const stats = {
        draft: 0,
        pending_review: 0,
        approved: 0,
        rejected: 0,
        total: records.length,
    };

    records.forEach(record => {
        // Priority 1: Check metadata JSON status if it exists
        const metadataStatus = record.fileReviews?.recordStatus;
        let status: RecordStatus;
        
        if (metadataStatus) {
            status = metadataStatus as RecordStatus;
        } else {
            status = parseStatusFromAuditField(record.auditStatus, record.reviewed, (record.actualRecordCount || 0) > 0, record.fileReviews);
        }
        
        if (stats[status] !== undefined) {
            stats[status]++;
        } else {
            stats.draft++;
        }
    });

    return stats;
}
