// ============================================================================
// QBase — React Query hooks for record storage
// The Supabase `records` table is the ONLY source of truth.
// Hooks provide loading states, error handling, cache invalidation.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getArchivedRecords,
  restoreRecord,
  submitRecordDraft,
  invalidateRowCache,
  type StorageResult,
} from '../services/recordStorage';
import { getDashboardStats } from '../services/dashboardStats';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Query Keys
// ============================================================================

const RECORD_KEYS = {
  all: ['forge-records'] as const,
  byForm: (formCode: string) => ['forge-records', 'form', formCode] as const,
  bySerial: (serial: string) => ['forge-records', 'serial', serial] as const,
  dashboardStats: ['dashboard-stats'] as const,
};

/**
 * The serials already in use for a form — the duplicate check.
 *
 * It has its own key because it is a different question ("which serials are
 * taken?") from the record list, and it is invalidated by every write: a
 * serial that had just been used must not still be offered as free.
 */
const SERIAL_KEYS = {
  byForm: (formCode: string) => ['forge-serials', formCode] as const,
};

// ============================================================================
// useDashboardStats — org-level KPIs via the ONE dashboard_stats RPC (Prime D6)
// Each widget consuming this hook documents its exact query (migration
// 20260929_04); fetch errors propagate to the widget's error state and empty
// registers render "no data" — never fabricated numbers.
// ============================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: RECORD_KEYS.dashboardStats,
    queryFn: getDashboardStats,
    staleTime: 60_000,      // aggregates; a minute of staleness is fine
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// ============================================================================
// useRecords — fetch all records, optionally filtered by formCode
// ============================================================================

export function useRecords(formCode?: string) {
  return useQuery({
    queryKey: formCode ? RECORD_KEYS.byForm(formCode) : RECORD_KEYS.all,
    queryFn: () => getRecords(formCode),
    staleTime: 30_000,       // 30 seconds — fresh but not aggressive
    gcTime: 5 * 60_000,     // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// ============================================================================
// useRecord — fetch a single record by serial
// ============================================================================

export function useRecord(serial: string | undefined) {
  return useQuery({
    queryKey: RECORD_KEYS.bySerial(serial || ''),
    queryFn: () => serial ? getRecord(serial) : Promise.resolve(null),
    enabled: !!serial,       // Don't fetch if no serial
    staleTime: 15_000,       // 15 seconds for individual records
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// ============================================================================
// useCreateRecord — create a new record with optimistic update
// ============================================================================

export function useCreateRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: RecordData) => createRecord(data),

    // Optimistic update: add to cache immediately
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: RECORD_KEYS.all });

      // Snapshot current value
      const previousRecords = queryClient.getQueryData<RecordData[]>(RECORD_KEYS.all);

      // Optimistic add — won't have serial yet, but UI shows something
      const currentUserEmail = user?.email || 'unknown';
      const optimisticRecord: RecordData = {
        ...newData,
        _createdAt: newData._createdAt || new Date().toISOString(),
        _createdBy: newData._createdBy || currentUserEmail,
        _editCount: 0,
        _lastModifiedAt: null,
        _lastModifiedBy: null,
        _modificationReason: null,
      };

      // Update cache optimistically
      queryClient.setQueryData<RecordData[]>(RECORD_KEYS.all, (old = []) => [
        ...old,
        optimisticRecord,
      ]);

      return { previousRecords };
    },

    // On success: invalidate cache to refetch from the records table
    onSuccess: (result: StorageResult) => {
      if (result.success && result.record) {
        toast.success(`Record ${result.record.serial} created successfully`);
        // Invalidate specific form query to update Quick-Jump dropdown immediately.
        // formCode is optional on RecordData, so it must be narrowed before use as
        // a query key.
        const createdFormCode = result.record.formCode;
        if (createdFormCode) {
          queryClient.invalidateQueries({ queryKey: RECORD_KEYS.byForm(createdFormCode) });
          // The serial is now taken — the duplicate check must not offer it
          // again.  Nothing invalidated this key, so the form kept listing
          // a serial that had just been used.
          queryClient.invalidateQueries({ queryKey: SERIAL_KEYS.byForm(createdFormCode) });
        }
      } else {
        // The storage layer REPORTS a failure by returning {success:false}
        // instead of throwing, so `onError` never runs for it.  Without this
        // branch a rejected record was created with no message at all: the
        // form looked saved and nothing was saved.
        toast.error(`Create failed: ${result.error || 'Unknown error'}`);
      }
      // Invalidate all record queries (source of truth = the records table)
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
    },

    // On error: rollback optimistic update
    onError: (error: Error, _variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(RECORD_KEYS.all, context.previousRecords);
      }

      // Check if it's a duplicate serial error
      const message = error.message || 'Failed to create record';
      if (message.includes('duplicate') || message.includes('unique')) {
        toast.error('Duplicate serial number detected. Record not created.');
      } else {
        toast.error(`Create failed: ${message}`);
      }
    },
  });
}

// ============================================================================
// useSubmitDraft — finalize a server-side draft (Prime §D4)
// One final server-side save + ONE record_transition (Ahmed's Rules enforced
// by the engine); invalidates the record caches only after a confirmed write.
// ============================================================================

export function useSubmitDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, formCode, targetStatus }: {
      id: string;
      content: Record<string, unknown>;
      formCode: string;
      targetStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
    }) => submitRecordDraft(id, content, targetStatus),

    onSuccess: (result: StorageResult, { formCode }) => {
      if (result.success && result.record) {
        toast.success(`Record ${result.record.serial} created successfully`);
        const createdFormCode = formCode || result.record.formCode;
        if (createdFormCode) {
          queryClient.invalidateQueries({ queryKey: RECORD_KEYS.byForm(createdFormCode) });
        }
      }
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
    },

    onError: (error: Error) => {
      toast.error(`Submit failed: ${error.message || 'unknown error'}`);
    },
  });
}

// ============================================================================
// useUpdateRecord — update an existing record with conflict detection
// ============================================================================

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ serial, changes, reason }: {
      serial: string;
      changes: RecordData;
      reason?: string;
    }) => updateRecord(serial, changes, reason),

    // Optimistic update
    onMutate: async ({ serial, changes }) => {
      await queryClient.cancelQueries({ queryKey: RECORD_KEYS.bySerial(serial) });

      const previousRecord = queryClient.getQueryData<RecordData | null>(
        RECORD_KEYS.bySerial(serial)
      );

      // Optimistic update: merge changes into cached record
      if (previousRecord) {
        const currentUserEmail = user?.email || 'unknown';
        const optimisticRecord: RecordData = {
          ...previousRecord,
          ...changes,
          // Preserve identity fields
          serial: previousRecord.serial,
          formCode: previousRecord.formCode,
          formName: previousRecord.formName,
          _createdAt: previousRecord._createdAt,
          _createdBy: previousRecord._createdBy,
          // Bump tracking
          _editCount: (previousRecord._editCount || 0) + 1,
          _lastModifiedAt: new Date().toISOString(),
          _lastModifiedBy: currentUserEmail,
        };
        queryClient.setQueryData(RECORD_KEYS.bySerial(serial), optimisticRecord);
      }

      return { previousRecord };
    },

    // On success: invalidate all caches to refetch from the records table
    onSuccess: (result: StorageResult, { serial }) => {
      if (result.success) {
        toast.success(`Record ${serial} updated successfully`);
      } else {
        // Same as the create path: a refusal comes back as {success:false},
        // not as a thrown error, and used to be reported to nobody.
        toast.error(`Update failed: ${result.error || 'Unknown error'}`);
      }
      // Invalidate both individual and list caches
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.bySerial(serial) });
    },

    // On error: rollback + show specific error
    onError: (error: Error, { serial }, context) => {
      const result = (error as unknown as StorageResult);

      // Rollback optimistic update
      if (context?.previousRecord !== undefined) {
        queryClient.setQueryData(RECORD_KEYS.bySerial(serial), context.previousRecord);
      }

      // Check for conflict (concurrent modification)
      const message = error.message || 'Failed to update record';
      if (result?.conflict || message.includes('modified by another')) {
        toast.error(
          `Record ${serial} was modified by another user. Please reload and try again.`,
          { duration: 8000 }
        );
        // Force refetch to show the latest data
        queryClient.invalidateQueries({ queryKey: RECORD_KEYS.bySerial(serial) });
      } else {
        toast.error(`Update failed: ${message}`);
      }

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
    },
  });
}

// ============================================================================
// useExistingSerials — for duplicate checking before create
// ============================================================================

export function useExistingSerials(formCode: string) {
  return useQuery({
    queryKey: SERIAL_KEYS.byForm(formCode),
    queryFn: () => getRecords(formCode).then(records => records.map(r => r.serial as string)),
    staleTime: 10_000,      // 10 seconds — needs to be fresh for duplicate checks
    gcTime: 60_000,
    enabled: !!formCode,
  });
}

// ============================================================================
// useDeleteRecord — soft-delete a record (admin only, enforced by RPC)
// ============================================================================

export function useDeleteRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteRecord(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: RECORD_KEYS.all });
      const previousRecords = queryClient.getQueryData<RecordData[]>(RECORD_KEYS.all);
      // Optimistic remove from cache
      queryClient.setQueryData<RecordData[]>(RECORD_KEYS.all, (old = []) =>
        old.filter(r => (r as Record<string, unknown>).id !== id)
      );
      return { previousRecords };
    },

    onSuccess: (result: StorageResult, id) => {
      if (result.success) {
        toast.success('Record deleted successfully');
      } else {
        toast.error(`Delete failed: ${result.error || 'Unknown error'}`);
      }
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
      // A deleted serial is free again.
      queryClient.invalidateQueries({ queryKey: ['forge-serials'] });
    },

    onError: (error: Error, _variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(RECORD_KEYS.all, context.previousRecords);
      }
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

// ============================================================================
// useArchivedRecords — fetch soft-deleted records
// ============================================================================

export function useArchivedRecords() {
  return useQuery({
    queryKey: [...RECORD_KEYS.all, 'archived'],
    queryFn: getArchivedRecords,
    staleTime: 30_000,
    gcTime: 120_000,
  });
}

// ============================================================================
// useRestoreRecord — restore a record from archive
// ============================================================================

export function useRestoreRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreRecord(id),
    onSuccess: (result: StorageResult) => {
      if (result.success) {
        toast.success('Record restored successfully');
      } else {
        toast.error(`Restore failed: ${result.error || 'Unknown error'}`);
      }
      queryClient.invalidateQueries({ queryKey: RECORD_KEYS.all });
    },
    onError: (error: Error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
  });
}