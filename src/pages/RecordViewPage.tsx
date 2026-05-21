// ============================================================================
// QMS Forge — Record View Page (Phase 9 Refined)
// Consistent design system classes, improved hierarchy, better interactions.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, AlertTriangle, Shield, Clock, User,
  FileText, CheckCircle, Lock, Loader2, RefreshCw, History,
  Download, FileJson, FileSpreadsheet, FileText as FileTextIcon,
  Trash2,
} from 'lucide-react';
import { getFormSchema } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import DynamicFormRenderer, { type RecordData } from '../components/forms/DynamicFormRenderer';
import { SchemaDrivenRecordView } from '../components/forms/SchemaDrivenRecordView';
import { getFormTemplateComponent } from '@/components/forms/templates';
import { useRecord, useUpdateRecord, useRecords, useDeleteRecord } from '../hooks/useRecordStorage';
import { useAuditLog } from '../hooks/useAuditLog';
import { useAuth } from '../hooks/useAuth';
import { evaluateRulesForRecord, getSeverityColor, type RuleSeverity } from '../services/ruleEngine';
import { getEditRiskLevel } from '../services/recordUtils';
import { exportRecordToDocx } from '../services/docxExport';
import { exportRecordToJson, exportRecordToCsv } from '../services/fileExport';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';

// ============================================================================
// Constants
// ============================================================================

const IDENTITY_FIELDS = new Set(['serial', '_createdAt', '_createdBy', 'formCode', 'formName']);
const CRITICAL_FIELDS = new Set([
  'date', 'status', 'nc_type', 'closure_date',
  'project_name', 'employee_name', 'employee_id',
  'performance', 'overall_score', 'month', 'year',
]);

// ============================================================================
// Record View Page
// ============================================================================

const RecordViewPage: React.FC = () => {
  const { serial } = useParams<{ serial: string }>();
  const decodedSerial = serial ? decodeURIComponent(serial) : '';
  const navigate = useNavigate();

  const { data: originalRecord, isLoading, error, refetch } = useRecord(decodedSerial);
  const updateMutation = useUpdateRecord();
  const deleteMutation = useDeleteRecord();
  const { data: allRecords } = useRecords();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const schema = originalRecord ? getFormSchema(originalRecord.formCode as string) : null;

  const [mode, setMode] = useState<'view' | 'edit' | 'intent' | 'history'>('view');
  const [editData, setEditData] = useState<RecordData>({});
  const [modificationReason, setModificationReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: auditLog, isLoading: auditLoading } = useAuditLog(decodedSerial);
  const auditEntries = auditLog || [];
  const isSaving = updateMutation.isPending;

  const hasChangedFields = useMemo(() => {
    if (!originalRecord || !schema) return false;
    return schema.fields.some(field => {
      if (field.type === 'heading') return false;
      const key = field.key as string;
      const oldVal = String((originalRecord as Record<string, unknown>)[key] ?? '');
      const newVal = String(editData[key] ?? '');
      return oldVal !== newVal;
    });
  }, [originalRecord, schema, editData]);

  const riskLevel = useMemo(() => {
    if (!originalRecord) return 'none';
    return getEditRiskLevel(originalRecord);
  }, [originalRecord]);

  const integritySignals = useMemo(() => {
    if (!originalRecord || !allRecords) return [];
    return evaluateRulesForRecord(
      originalRecord as unknown as RecordData,
      allRecords as unknown as RecordData[],
    );
  }, [originalRecord, allRecords]);

  const integritySeverity: RuleSeverity = integritySignals.length === 0
    ? 'clean'
    : integritySignals.some(s => s.severity === 'critical') ? 'critical' : 'warning';

  const getBreadcrumbs = () => [
    { label: "Dashboard", path: "/" },
    { label: "Records", path: "/records" },
    { label: decodedSerial },
  ];

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell breadcrumbs={getBreadcrumbs()}>
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading record {decodedSerial}...</p>
      </div>
      </AppShell>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell breadcrumbs={getBreadcrumbs()}>
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 ds-fade-enter">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl text-foreground mb-2">Failed to Load Record</h2>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
      </AppShell>
    );
  }

  // ─── No record ─────────────────────────────────────────────────────────
  if (!originalRecord || !schema) {
    return (
      <AppShell breadcrumbs={getBreadcrumbs()}>
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 ds-fade-enter">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl text-foreground mb-2">Record Not Found</h2>
        <p className="text-muted-foreground mb-4">No record with serial <code className="text-primary font-mono">{decodedSerial}</code></p>
        <button onClick={() => navigate('/records')} className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Records
        </button>
      </div>
      </AppShell>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleStartEdit = () => {
    const data: RecordData = {};
    schema.fields.forEach(field => {
      if (field.type === 'heading') return;
      const key = field.key as string;
      data[key] = (originalRecord as Record<string, unknown>)[key] ?? field.defaultValue ?? '';
    });
    setEditData(data);
    setErrors({});
    setModificationReason('');
    setMode('edit');
  };

  const handleFormSubmit = (data: RecordData) => {
    setEditData(data);
    const criticalChanged = Object.keys(data).some(key => {
      if (!CRITICAL_FIELDS.has(key)) return false;
      const oldVal = String((originalRecord as Record<string, unknown>)[key] ?? '');
      const newVal = String(data[key] ?? '');
      return oldVal !== newVal;
    });
    if (criticalChanged && !modificationReason.trim()) {
      setMode('intent');
      return;
    }
    doSave(data);
  };

  const handleIntentProceed = () => {
    if (modificationReason.trim().length < 5) return;
    setMode('edit');
    doSave(editData);
  };

  const handleIntentCancel = () => {
    setModificationReason('');
    setMode('edit');
  };

  const doSave = (data: RecordData) => {
    if (!schema) return;
    updateMutation.mutate(
      { serial: originalRecord.serial as string, changes: { ...data, _editCount: originalRecord._editCount }, reason: modificationReason || undefined },
      {
        onSuccess: (result) => {
          if (result.success) {
            setMode('view');
            setModificationReason('');
            setErrors({});
            refetch();
          } else {
            if (result.conflict) {
              setErrors({ _conflict: result.error || 'Concurrent modification detected. Please reload.' });
            } else {
              setErrors({ _save: result.error || 'Failed to save record.' });
            }
          }
        },
        onError: (err: Error) => { setErrors({ _save: err.message }); },
      }
    );
  };

  const handleExportDocx = async () => {
    setIsExporting(true); setExportMenuOpen(false);
    try { await exportRecordToDocx(originalRecord as Record<string, unknown>); toast.success(`Exported ${originalRecord.serial} as .docx`); }
    catch (err) { toast.error('Export failed: ' + (err as Error).message); }
    finally { setIsExporting(false); }
  };

  const handleExportJson = () => {
    setExportMenuOpen(false);
    try { exportRecordToJson(originalRecord as Record<string, unknown>); toast.success(`Exported ${originalRecord.serial} as JSON`); }
    catch (err) { toast.error('Export failed: ' + (err as Error).message); }
  };

  const handleExportCsv = () => {
    setExportMenuOpen(false);
    try { exportRecordToCsv(originalRecord as Record<string, unknown>); toast.success(`Exported ${originalRecord.serial} as CSV`); }
    catch (err) { toast.error('Export failed: ' + (err as Error).message); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const recordId = originalRecord?.id as string | undefined;
    if (!recordId) { toast.error('Cannot delete: record ID not found'); return; }
    try {
      await deleteMutation.mutateAsync(recordId);
      setConfirmDelete(false);
      navigate('/records');
    } catch {
      // Error handled by mutation onError
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <AppShell breadcrumbs={getBreadcrumbs()}>
    <div className="max-w-4xl mx-auto page-transition">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/records')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ds-press rounded-sm px-2 py-1">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Records</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Export */}
          {mode === 'view' && (
            <div className="relative">
              <button onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={isExporting}
                className="ds-press ds-focus-ring px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 hover:bg-accent transition-colors">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export
              </button>
              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-sm shadow-xl z-50 overflow-hidden ds-fade-enter">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-secondary/50">
                      Export {originalRecord.serial as string}
                    </div>
                    <button onClick={handleExportDocx} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors">
                      <FileTextIcon className="w-5 h-5 text-blue-400" />
                      <div className="text-left"><div className="font-medium">Word Document</div><div className="text-xs text-muted-foreground">.docx — formatted report</div></div>
                    </button>
                    <button onClick={handleExportJson} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors border-t border-border">
                      <FileJson className="w-5 h-5 text-emerald-400" />
                      <div className="text-left"><div className="font-medium">JSON</div><div className="text-xs text-muted-foreground">.json — raw data</div></div>
                    </button>
                    <button onClick={handleExportCsv} className="w-full px-4 py-3 text-sm text-popover-foreground hover:bg-accent flex items-center gap-3 transition-colors border-t border-border">
                      <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                      <div className="text-left"><div className="font-medium">CSV</div><div className="text-xs text-muted-foreground">.csv — key-value pairs</div></div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'view' && (
            <button onClick={handleStartEdit}
              className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          )}
          {mode === 'view' && isAdmin && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">Delete this record?</span>
                <button onClick={handleDelete} disabled={deleteMutation.isPending}
                  className="ds-press px-3 py-2 bg-destructive text-destructive-foreground rounded-sm flex items-center gap-2 text-sm font-medium hover:bg-destructive/90 transition-colors">
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="ds-press px-3 py-2 bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 text-sm hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={handleDelete}
                className="ds-press ds-focus-ring px-3 py-2 bg-secondary text-destructive rounded-sm flex items-center gap-2 text-sm hover:bg-destructive/10 transition-colors border border-destructive/20">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )
          )}
          {mode === 'edit' && (
            <>
              <button onClick={() => { setMode('view'); setErrors({}); }}
                className="ds-press px-4 py-2 bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 text-sm hover:bg-accent transition-colors">
                <X className="w-4 h-4" /> Cancel
              </button>
              {hasChangedFields && (
                <span className="px-2 py-1 text-xs bg-warning/10 text-warning border border-warning/20 rounded-sm font-medium">
                  Unsaved changes
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Metadata Card ─────────────────────────────────────────────── */}
      <div className="ds-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">System Metadata</h3>
          {integritySeverity !== 'clean' && mode === 'view' && (
            <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full border ${
              integritySeverity === 'critical'
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : 'bg-warning/10 text-warning border-warning/20'
            }`}>
              {integritySeverity === 'critical' ? `${integritySignals.length} issues` : `${integritySignals.length} warnings`}
            </span>
          )}
          {integritySeverity === 'clean' && mode === 'view' && (
            <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
              Clean
            </span>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Serial</span>
            <p className="font-mono text-primary font-semibold mt-0.5">{originalRecord.serial as string}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Form</span>
            <p className="text-foreground mt-0.5">{originalRecord.formCode as string}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Created</span>
            <p className="text-foreground mt-0.5">{isoToDisplay(originalRecord._createdAt as string)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">By</span>
            <p className="text-foreground truncate mt-0.5">{originalRecord._createdBy as string}</p>
          </div>
          {(originalRecord._lastModifiedAt || originalRecord._editCount > 0) && (
            <>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Modified</span>
                <p className="text-foreground mt-0.5">{originalRecord._lastModifiedAt ? isoToDisplay(originalRecord._lastModifiedAt as string) : '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Modified By</span>
                <p className="text-foreground truncate mt-0.5">{(originalRecord._lastModifiedBy as string) || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Edits
                  {riskLevel !== 'none' && <AlertTriangle className="w-3 h-3" />}
                </span>
                <p className={`font-semibold mt-0.5 ${
                  riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-warning' : 'text-foreground'
                }`}>
                  {originalRecord._editCount as number}
                </p>
              </div>
              {originalRecord._modificationReason && (
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Reason</span>
                  <p className="text-foreground text-xs truncate mt-0.5">{originalRecord._modificationReason as string}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Risk warnings */}
        {riskLevel === 'high' && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-sm text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Frequently modified ({originalRecord._editCount as number} edits). Verify data integrity.</span>
          </div>
        )}
        {riskLevel === 'medium' && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-sm text-xs text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This record has been edited {originalRecord._editCount as number} time(s).</span>
          </div>
        )}

        {/* Integrity signals */}
        {integritySignals.length > 0 && mode === 'view' && (
          <div className={`mt-3 px-3 py-2 border rounded-sm text-sm ${
            integritySeverity === 'critical'
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-warning/10 border-warning/20 text-warning'
          }`}>
            <div className="flex items-center gap-2 mb-1.5 font-medium">
              <Shield className="w-4 h-4" />
              {integritySeverity === 'critical' ? 'Critical Issues' : 'Warnings'} ({integritySignals.length})
            </div>
            <div className="space-y-1 ml-6">
              {integritySignals.map((signal, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className={signal.severity === 'critical' ? 'text-destructive' : 'text-warning'}>
                    {signal.severity === 'critical' ? '✕' : '⚠'}
                  </span>
                  <div>
                    <span className="text-foreground">{signal.message}</span>
                    {signal.details && <span className="text-muted-foreground ml-1">— {signal.details}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {integritySignals.length === 0 && mode === 'view' && riskLevel === 'none' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-sm text-xs text-success">
            <CheckCircle className="w-4 h-4" />
            <span>No integrity issues detected</span>
          </div>
        )}

        {/* History button */}
        {mode !== 'history' && (
          <button
            onClick={() => { setMode('history'); setErrors({}); }}
            className="mt-3 ds-press ds-focus-ring flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-sm text-xs text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            View History ({originalRecord._editCount as number} edits)
          </button>
        )}
      </div>

      {/* ─── Content ──────────────────────────────────────────────────── */}

      {mode === 'view' ? (
        <div className="ds-card p-6 page-transition">
          {(() => {
            const TemplateComponent = getFormTemplateComponent(originalRecord.formCode as string);
            if (TemplateComponent) {
              return (
                <TemplateComponent
                  data={originalRecord as unknown as Record<string, unknown>}
                  isTemplate={false}
                />
              );
            }
            return (
              <SchemaDrivenRecordView
                formCode={originalRecord.formCode as string}
                data={originalRecord as unknown as RecordData}
              />
            );
          })()}
        </div>
      ) : mode === 'history' ? (
        <div className="ds-card p-6 page-transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Change History</h3>
              <span className="text-xs text-muted-foreground ml-2 font-mono">{decodedSerial}</span>
            </div>
            <button onClick={() => setMode('view')} className="ds-press ds-focus-ring px-3 py-1.5 text-sm bg-secondary border border-border rounded-sm text-secondary-foreground hover:bg-accent transition-colors">
              Back to Record
            </button>
          </div>

          {auditLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading history...</span>
            </div>
          ) : !auditEntries || auditEntries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No history entries found for this record.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Audit logging was added in v0.7-alpha. Older edits may not appear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry, idx) => (
                <div key={entry.id} className={`border rounded-sm p-4 ${
                  entry.action === 'create'
                    ? 'bg-success/5 border-success/20'
                    : 'bg-primary/5 border-primary/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.action === 'create'
                        ? <CheckCircle className="w-4 h-4 text-success" />
                        : <Edit3 className="w-4 h-4 text-primary" />
                      }
                      <span className={`text-sm font-medium ${
                        entry.action === 'create' ? 'text-success' : 'text-primary'
                      }`}>
                        {entry.action === 'create' ? 'Created' : 'Updated'}
                      </span>
                      <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.timestamp ? isoToDisplay(entry.timestamp.substring(0, 10)) + ' ' + entry.timestamp.substring(11, 19) : '—'}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.user || '—'}</span>
                    </div>
                  </div>

                  {entry.action === 'create' ? (
                    <p className="text-xs text-muted-foreground">
                      Initial record created with {entry.changedFields.length} field{entry.changedFields.length !== 1 ? 's' : ''}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {entry.changedFields.map(field => (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <span className="px-1.5 py-0.5 bg-primary/15 text-primary rounded-sm font-mono shrink-0 text-[11px]">
                            {field}
                          </span>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-destructive/70 line-through truncate">{JSON.stringify(entry.previousValues[field] ?? '')}</span>
                            <span className="text-muted-foreground/40">→</span>
                            <span className="text-success truncate">{JSON.stringify(entry.newValues[field] ?? '')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : mode === 'intent' ? (
        /* ─── Edit Intent Check ─────────────────────────────────────── */
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-warning/30 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl ds-fade-enter">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Edit Intent Check</h3>
                <p className="text-xs text-muted-foreground">Critical field modification</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You are modifying critical fields on <code className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">{originalRecord.serial as string}</code>.
              Please provide a reason for this change.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Reason for modification <span className="text-destructive">*</span>
              </label>
              <textarea
                value={modificationReason}
                onChange={e => setModificationReason(e.target.value)}
                placeholder="e.g. Correcting project name to match official records"
                className="input-modern w-full px-3 py-2 text-sm resize-none"
                rows={3}
              />
              {modificationReason.trim().length > 0 && modificationReason.trim().length < 5 && (
                <p className="text-xs text-destructive mt-1">Minimum 5 characters required</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleIntentCancel} className="ds-press px-4 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleIntentProceed}
                disabled={modificationReason.trim().length < 5 || isSaving}
                className="ds-press ds-focus-ring px-4 py-2 bg-warning text-warning-foreground rounded-sm text-sm flex items-center gap-2 hover:bg-warning/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save with Reason
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Edit form ────────────────────────────────────────────── */
        <>
          {errors._conflict && (
            <div className="mb-4 p-4 ds-critical-card rounded-sm">
              <strong className="text-destructive">Conflict:</strong> <span className="text-destructive/80">{errors._conflict}</span>
              <button onClick={() => { setErrors({}); refetch(); }} className="ml-3 underline text-destructive/60 hover:text-destructive">Reload record</button>
            </div>
          )}
          {errors._save && (
            <div className="mb-4 p-4 ds-critical-card rounded-sm">
              <strong className="text-destructive">Error:</strong> <span className="text-destructive/80">{errors._save}</span>
            </div>
          )}
          <DynamicFormRenderer
            formCode={originalRecord.formCode as string}
            initialData={editData}
            onSubmit={handleFormSubmit}
            editMode={true}
          />
        </>
      )}
    </div>
    </AppShell>
  );
};

export default RecordViewPage;