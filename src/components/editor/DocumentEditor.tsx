// ============================================================================
// DocumentEditor — Record editing with version history
// REFACTORED: Dialog replaces prompt(), Button replaces plain <button>
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import { Save, X, Edit2, Lock, History, Eye, Copy, AlertCircle } from 'lucide-react';
import { SchemaDrivenRecordView } from '../forms/SchemaDrivenRecordView';
import { EditableSchemaField } from './EditableSchemaField';
import { VersionHistory } from './VersionHistory';
import { useRecordEditor } from '../../hooks/useRecordEditor';
import { useRefreshData } from '../../hooks/useRefreshData';
import { getFormSchema } from '../../data/formSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface DocumentEditorProps {
  recordId: string;
  formCode: string;
  initialData: Record<string, unknown>;
  onSaved?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  recordId,
  formCode,
  initialData,
  onSaved,
}) => {
  const {
    state: editorState,
    versions,
    checkEditPermission,
    startEditing,
    cancelEditing,
    saveChanges,
    loadVersions,
    restoreVersion,
  } = useRecordEditor(recordId);
  const { refreshRecords } = useRefreshData();

  const [editData, setEditData] = useState<Record<string, unknown>>(initialData);
  const [changeReason, setChangeReason] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [linkedProject, setLinkedProject] = useState(initialData.linked_project as string || '');
  const [coverageMonth, setCoverageMonth] = useState(initialData.coverage_month as string || '');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<string>('');
  const [restoreReason, setRestoreReason] = useState('');

  useEffect(() => {
    checkEditPermission();
  }, [checkEditPermission]);

  useEffect(() => {
    if (showVersions) loadVersions();
  }, [showVersions, loadVersions]);

  const schema = getFormSchema(formCode);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const result = await saveChanges(editData, changeReason || undefined, {
      linkedProject: linkedProject || undefined,
      coverageMonth: coverageMonth || undefined,
    });
    if (result.success) {
      setChangeReason('');
      onSaved?.();
    }
  }, [editData, changeReason, linkedProject, coverageMonth, saveChanges, onSaved]);

  const handleStartEdit = useCallback(async () => {
    const success = await startEditing();
    if (success) setEditData(initialData);
  }, [startEditing, initialData]);

  const openRestoreDialog = useCallback((versionId: string) => {
    setRestoreTargetId(versionId);
    setRestoreReason('');
    setRestoreDialogOpen(true);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!restoreReason.trim()) return;
    const result = await restoreVersion(restoreTargetId, restoreReason);
    if (result.success) {
      await refreshRecords();
      setRestoreDialogOpen(false);
      setShowVersions(false);
      onSaved?.();
    }
  }, [restoreVersion, restoreTargetId, restoreReason, refreshRecords, onSaved]);

  const canEdit = editorState.canEdit && !editorState.isLocked;

  return (
    <div className="document-editor space-y-6">
      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>Enter a reason for restoring this historical version.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={restoreReason}
              onChange={e => setRestoreReason(e.target.value)}
              placeholder="e.g. Rolled back due to incorrect data entry"
              className={restoreReason.trim() ? '' : 'border-warning'}
            />
            {!restoreReason.trim() && <p className="text-xs text-warning mt-1">Reason is required</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmRestore} disabled={!restoreReason.trim()}>Confirm Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          {editorState.isEditing ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                <Edit2 className="w-3 h-3" /> Editing
              </span>
              <Input
                type="text"
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                placeholder="Reason for changes (optional)"
                className="w-64"
              />
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
              <Eye className="w-3 h-3" /> View Mode
            </span>
          )}
          {editorState.isLocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
              <Lock className="w-3 h-3" /> Locked by {editorState.lockedBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
            <History className="w-4 h-4 mr-1" /> Versions
          </Button>
          {editorState.isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={editorState.isSaving}>
                {editorState.isSaving ? 'Saving…' : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleStartEdit} disabled={!canEdit}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* System Metadata */}
      <div className="p-4 border rounded-lg bg-card/50">
        <h3 className="text-sm font-semibold text-foreground mb-3">System Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Linked Project</label>
            <Input
              type="text" value={linkedProject} onChange={e => setLinkedProject(e.target.value)}
              readOnly={!editorState.isEditing}
              className={editorState.errors.linked_project ? 'border-destructive' : ''}
              placeholder="Enter project name or ID"
            />
            {editorState.errors.linked_project && <p className="text-xs text-destructive">{editorState.errors.linked_project}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Coverage Month</label>
            <Input
              type="month" value={coverageMonth} onChange={e => setCoverageMonth(e.target.value)}
              readOnly={!editorState.isEditing}
              className={editorState.errors.coverage_month ? 'border-destructive' : ''}
            />
            {editorState.errors.coverage_month && <p className="text-xs text-destructive">{editorState.errors.coverage_month}</p>}
          </div>
        </div>
      </div>

      {/* Document Body */}
      {editorState.isEditing && schema ? (
        <div className="space-y-4 p-4 border rounded-lg bg-background">
          {schema.fields.map(field => {
            if (field.type === 'heading') {
              return <h3 key={field.key} className="text-lg font-semibold text-foreground pt-4 border-b pb-2">{field.label}</h3>;
            }
            return <EditableSchemaField
              key={field.key}
              field={field}
              value={editData[field.key] ?? (editData.formData as Record<string, unknown>)?.[field.key]}
              onChange={handleFieldChange}
              readOnly={(field as {readOnly?: boolean}).readOnly || false}
              error={editorState.errors[field.key]}
            />;
          })}
        </div>
      ) : (
        <SchemaDrivenRecordView formCode={formCode} data={initialData} showMeta={true} />
      )}

      {/* Version History Panel */}
      {showVersions && (
        <div className="border rounded-lg bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Version History
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {versions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No versions yet</p>}
            {versions.map(v => (
              <div key={v.versionId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Version {v.versionNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
                      v.changeType === 'create' ? 'bg-green-500/10 text-green-600' :
                      v.changeType === 'edit' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-purple-500/10 text-purple-600'
                    }`}>{v.changeType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">By {v.changedBy || 'Unknown'} on {new Date(v.changedAt).toLocaleDateString()}</p>
                  {v.changeReason && <p className="text-xs text-muted-foreground italic">{v.changeReason}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => openRestoreDialog(v.versionId)} disabled={!canEdit}>
                  <Copy className="w-3 h-3 mr-1" /> Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
