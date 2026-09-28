// Status Management Service
// Handles record status workflow and transitions
// Storage: Supabase records table (formData._status field)

import type { RecordStatus } from '@/config/modules';
import { supabase } from '@/integrations/supabase/client';

// ─── Transitions ────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
    draft: ['pending_review'],
    pending_review: ['approved', 'rejected'],
    approved: [],  // Terminal state
    rejected: ['draft'], // Can resubmit
};

// ─── Labels ─────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<RecordStatus, { en: string; ar: string; color: string }> = {
    draft:           { en: 'Draft',           ar: 'مسودة',        color: 'gray' },
    pending_review:  { en: 'Pending Review',  ar: 'قيد المراجعة', color: 'yellow' },
    approved:        { en: 'Approved',        ar: 'تمت الموافقة', color: 'green' },
    rejected:        { en: 'Rejected',        ar: 'مرفوض',        color: 'red' },
};

// ─── Pure Functions ─────────────────────────────────────────────────────────

export function isValidTransition(from: RecordStatus, to: RecordStatus): boolean {
    return (STATUS_TRANSITIONS[from] || []).includes(to);
}

export function getAllowedNextStatuses(currentStatus: RecordStatus): RecordStatus[] {
    return STATUS_TRANSITIONS[currentStatus] || [];
}

export function parseStatusFromAuditField(
    auditStatus: string,
    reviewed: boolean = false,
    hasFiles: boolean = false,
    metadata?: { recordStatus?: string }
): RecordStatus {
    if (metadata?.recordStatus === 'rejected') return 'rejected';
    if (reviewed) return 'approved';
    if (hasFiles) return 'pending_review';

    const lower = (auditStatus || '').toLowerCase().trim();
    if (lower.includes('rejected') || lower.includes('❌') || lower.includes('nc')) return 'rejected';
    if (lower.includes('pending') || lower.includes('review') || lower.includes('waiting')) return 'pending_review';

    return 'draft';
}

export function statusToAuditField(status: RecordStatus): string {
    switch (status) {
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        case 'pending_review': return 'Pending Review';
        case 'draft': return 'Draft';
        default: return 'Waiting';
    }
}

export function getStatusBadgeClass(status: RecordStatus): string {
    const colors: Record<RecordStatus, string> = {
        draft: 'bg-gray-100 text-gray-800 border-gray-300',
        pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        approved: 'bg-green-100 text-green-800 border-green-300',
        rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || colors.draft;
}

// ─── Supabase-backed Operations ─────────────────────────────────────────────

interface StatusRecord {
    serial: string;
    recordId?: string;
}

/**
 * Update a record's status in Supabase via formData._status field.
 */
export async function updateRecordStatus(
    record: StatusRecord,
    newStatus: RecordStatus,
    reviewedBy?: string,
): Promise<boolean> {
    const identifier = record.recordId || record.serial;
    const matchField = record.recordId ? 'id' : 'serial';

    // Fetch current formData
    const { data: row, error: fetchErr } = await supabase
        .from('records')
        .select('id, form_data')
        .eq(matchField, identifier)
        .single();

    if (fetchErr || !row) return false;

    const formData = row.form_data || {};
    const updatedFormData = {
        ...formData,
        _status: newStatus,
        _statusUpdatedAt: new Date().toISOString(),
        ...(reviewedBy ? { _reviewedBy: reviewedBy } : {}),
        ...((newStatus === 'approved' || newStatus === 'rejected') ? { _reviewedAt: new Date().toISOString() } : {}),
    };

    const { error: updateErr } = await supabase
        .from('records')
        .update({ form_data: updatedFormData })
        .eq('id', row.id);

    return !updateErr;
}

/**
 * Bulk approve records
 */
export async function bulkApproveRecords(
    records: StatusRecord[],
    reviewedBy: string,
): Promise<number> {
    let count = 0;
    for (const record of records) {
        if (await updateRecordStatus(record, 'approved', reviewedBy)) count++;
    }
    return count;
}

/**
 * Bulk reject records
 */
export async function bulkRejectRecords(
    records: StatusRecord[],
    reviewedBy: string,
): Promise<number> {
    let count = 0;
    for (const record of records) {
        if (await updateRecordStatus(record, 'rejected', reviewedBy)) count++;
    }
    return count;
}

/**
 * Get status statistics from an array of records
 */
export function getStatusStats(records: { formData?: Record<string, unknown> }[]): {
    draft: number;
    pending_review: number;
    approved: number;
    rejected: number;
    total: number;
} {
    const stats = { draft: 0, pending_review: 0, approved: 0, rejected: 0, total: records.length };

    records.forEach(r => {
        const fd = r.formData || {};
        const status = (fd._status as string || 'draft') as RecordStatus;
        if (stats[status] !== undefined) stats[status]++;
        else stats.draft++;
    });

    return stats;
}