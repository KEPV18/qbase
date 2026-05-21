// ============================================================================
// QMS Forge — React Query hooks for record storage
// Google Sheets is the ONLY source of truth.
// Hooks provide loading states, error handling, cache invalidation.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  softDeleteRecord,
  invalidateRowCache,
  type StorageResult,
} from '../services/recordStorage';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Query Keys
// ============================================================================

const RECORD_KEYS = {
  all: ['forge-records'] as const,
  byForm: (formCode: string) => ['forge-records', 'form', formCode] as const,
  bySerial: (serial: string) => ['forge-records', 'serial', serial] as const,
};

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

  return useMutation({
    mutationFn: (data: RecordData) => createRecord(data),

    // Optimistic update: add to cache immediately
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: RECORD_KEYS.all });

      // Snapshot current value
      const previousRecords = queryClient.getQueryData<RecordData[]>(RECORD_KEYS.all);

      // Optimistic add — won't have serial yet, but UI shows something
      const optimisticRecord: RecordData = {
        ...newData,
        _createdAt: newData._createdAt || new Date().toISOString(),
        _createdBy: newData._createdBy || 'akh.dev185@gmail.com',
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

    // On success: invalidate cache to refetch from Sheets
    onSuccess: (result: StorageResult) => {
      if (result.success && result.record) {
        toast.success(`Record ${result.record.serial} created successfully`);
      }
      // Invalidate all record queries (source of truth = Sheets)
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
// useUpdateRecord — update an existing record with conflict detection
// ============================================================================

export function useUpdateRecord() {
  const queryClient = useQueryClient();

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
          _lastModifiedBy: 'akh.dev185@gmail.com',
        };
        queryClient.setQueryData(RECORD_KEYS.bySerial(serial), optimisticRecord);
      }

      return { previousRecord };
    },

    // On success: invalidate all caches to refetch from Sheets
    onSuccess: (result: StorageResult, { serial }) => {
      if (result.success) {
        toast.success(`Record ${serial} updated successfully`);
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
    queryKey: ['forge-serials', formCode],
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
    },

    onError: (error: Error, _variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(RECORD_KEYS.all, context.previousRecords);
      }
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}