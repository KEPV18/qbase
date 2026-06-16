import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';

export interface EditorState {
  isEditing: boolean;
  isSaving: boolean;
  isLocked: boolean;
  lockedBy: string | null;
  canEdit: boolean;
  errors: Record<string, string>;
}

export interface VersionInfo {
  versionId: string;
  versionNumber: number;
  changedBy: string;
  changedAt: string;
  changeReason?: string;
  changeType: string;
}

export function useRecordEditor(recordId: string | undefined) {
  const { user, role } = useAuth();
  const [state, setState] = useState<EditorState>({
    isEditing: false,
    isSaving: false,
    isLocked: false,
    lockedBy: null,
    canEdit: false,
    errors: {},
  });

  const [versions, setVersions] = useState<VersionInfo[]>([]);

  const checkEditPermission = useCallback(async () => {
    if (!recordId || !user) return false;
    
    const { data: record } = await supabase
      .from('records')
      .select('created_by, status, locked_by, locked_at')
      .eq('id', recordId)
      .single();

    if (!record) return false;

    const isAdmin = ['admin', 'qa_manager'].includes(role || '');
    const isOwner = record.created_by === user.id;
    
    const isLockedByOther = record.locked_by 
      && record.locked_by !== user.id 
      && new Date(record.locked_at) > new Date(Date.now() - 30 * 60 * 1000);

    const canEdit = isAdmin || (isOwner && !isLockedByOther);
    
    setState(s => ({
      ...s,
      canEdit,
      isLocked: !!isLockedByOther,
      lockedBy: isLockedByOther ? record.locked_by : null,
    }));

    return canEdit;
  }, [recordId, user, role]);

  const startEditing = useCallback(async () => {
    if (!recordId || !user) return false;
    
    setState(s => ({ ...s, isEditing: true }));
    
    const { data, error } = await supabase.rpc('lock_record_for_edit', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    if (error || !data) {
      setState(s => ({ ...s, isEditing: false, isLocked: true }));
      return false;
    }

    return true;
  }, [recordId, user]);

  const cancelEditing = useCallback(async () => {
    if (!recordId || !user) return;
    
    await supabase.rpc('unlock_record', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    setState(s => ({ ...s, isEditing: false, errors: {} }));
  }, [recordId, user]);

  const saveChanges = useCallback(async (
    formData: Record<string, unknown>,
    changeReason?: string,
    options?: { linkedProject?: string; coverageMonth?: string }
  ) => {
    if (!recordId || !user) return { success: false, error: 'Not authenticated' };

    setState(s => ({ ...s, isSaving: true, errors: {} }));

    const errors: Record<string, string> = {};

    if (options?.linkedProject !== undefined && !options.linkedProject) {
      errors.linked_project = 'Linked Project is required';
    }
    if (options?.coverageMonth !== undefined && !options.coverageMonth) {
      errors.coverage_month = 'Coverage Month is required';
    }

    if (Object.keys(errors).length > 0) {
      setState(s => ({ ...s, isSaving: false, errors }));
      return { success: false, errors };
    }

    const updatePayload: unknown = {
      form_data: formData,
      status: 'draft',
    };

    if (options?.linkedProject) updatePayload.linked_project = options.linkedProject;
    if (options?.coverageMonth) updatePayload.coverage_month = options.coverageMonth;

    const { data: versionId, error: versionError } = await supabase.rpc('save_record_version', {
      p_record_id: recordId,
      p_form_data: formData,
      p_changed_by: user.id,
      p_change_reason: changeReason || 'Document updated',
      p_change_type: 'edit',
    });

    if (versionError) {
      setState(s => ({ ...s, isSaving: false }));
      return { success: false, error: versionError.message };
    }

    await supabase.rpc('unlock_record', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    setState(s => ({
      ...s,
      isSaving: false,
      isEditing: false,
      errors: {},
    }));

    return { success: true, versionId };
  }, [recordId, user]);

  const loadVersions = useCallback(async (limit = 20, offset = 0) => {
    if (!recordId) return;

    const { data, error } = await supabase.rpc('get_record_version_history', {
      p_record_id: recordId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Failed to load versions:', error);
      return;
    }

    setVersions(data || []);
  }, [recordId]);

  const restoreVersion = useCallback(async (versionId: string, reason?: string) => {
    if (!recordId || !user) return { success: false };

    const { data: newVersionId, error } = await supabase.rpc('restore_record_version', {
      p_record_id: recordId,
      p_version_id: versionId,
      p_user_id: user.id,
      p_reason: reason || `Restored from version ${versionId}`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await loadVersions();

    return { success: true, versionId: newVersionId };
  }, [recordId, user, loadVersions]);

  return {
    state,
    versions,
    checkEditPermission,
    startEditing,
    cancelEditing,
    saveChanges,
    loadVersions,
    restoreVersion,
  };
}

export default useRecordEditor;