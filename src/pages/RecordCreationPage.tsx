// ============================================================================
// QBase — Record Creation Page (Section-First Flow, Prime §D4)
// Flow: section → form → one-screen form → success. No informational gate
// step. Opening a form immediately creates (or resumes) a SERVER-SIDE draft
// (record_draft_create), kept current by debounced record_draft_autosave and
// finalized at submit through the record_transition workflow engine — so
// Ahmed's Rules are enforced server-side and the browser never writes tables.
// Serials come from the server at draft creation (allocated across archived
// rows too, never from a client-side guess); abandoned drafts resurface on
// the dashboard "Continue drafts" strip.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, CheckCircle, XCircle, ArrowLeft, Loader2,
  ChevronRight, Layers, Building2, FolderKanban, CloudUpload, AlertTriangle,
  Handshake,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas';
import { todayDDMMYYYY } from '../schemas';
import { MODULE_CONFIG } from '../config/modules';
import DynamicFormRenderer, { type RecordData } from '../components/forms/DynamicFormRenderer';
import { SchemaDrivenRecordView } from '../components/forms/SchemaDrivenRecordView';
import { getTemplateComponent, TemplateWrapper } from '@/components/templates';
import { type TemplateComponentProps } from '@/components/templates';
import { useSubmitDraft } from '../hooks/useRecordStorage';
import {
  createDraftRecord,
  autosaveRecordDraft,
  discardRecordDraft,
  getCurrentUserSnapshot,
  resolveApprovalStatus,
  resolveDepartment,
  type RecordStatusEnum,
} from '../services/recordStorage';
import { preWriteValidation, type ValidationError } from '../services/preWriteValidation';
import { PROJECTS } from '../data/projectsData';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

// ============================================================================
// Section groups
//
// A form's own `sectionName` (from the unified schema) is the truth about
// which section it belongs to.  Grouping by the section NUMBER alone merged
// two distinct sections — Quality & Audit shares number 3 with Production &
// Operations, Document Control & Records shares number 7 with Management &
// Documentation — and the merged card was then labelled from MODULE_CONFIG,
// whose section numbers are offset by one from the schema.  The result was a
// card grid where every label described other forms and one name ("Management
// & Documentation") appeared twice.  The group key is the schema's own name,
// so a card's label always describes the forms inside it.
// ============================================================================

type SectionIcon = typeof Layers;

/** Icons for the sections the module config names identically. */
const MODULE_ICON_BY_NAME: Record<string, SectionIcon> = {};
Object.values(MODULE_CONFIG).forEach(m => {
  MODULE_ICON_BY_NAME[m.name] = m.icon;
});

/**
 * The one section the module config does not name: Sales & Customer Service
 * has no module of its own.
 */
const SECTION_ICON_OVERRIDES: Record<string, SectionIcon> = {
  'Sales & Customer Service': Handshake,
};

const sectionIcon = (name: string): SectionIcon =>
  SECTION_ICON_OVERRIDES[name] || MODULE_ICON_BY_NAME[name] || Layers;

/** The group a form belongs to: its own section name, with a numeric fallback. */
const sectionKeyOf = (form: { section: number; sectionName: string }): string =>
  form.sectionName?.trim() || `Section ${form.section}`;

const AUTOSAVE_DEBOUNCE_MS = 1200;

// ============================================================================
// Record Creation Page
// ============================================================================

interface DraftRef {
  id: string;
  serial: string;
}

const RecordCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFormCode = searchParams.get('formCode');
  const urlSection = searchParams.get('section');
  // The legacy `?section=N` link shape selects a section NUMBER; the cards
  // select a section NAME.  Numbers are coarser than names (two sections
  // share number 3, two share number 7), so a numeric link still selects
  // every group carrying that number.
  const urlSectionNum = urlSection !== null && /^\d+$/.test(urlSection.trim())
    ? parseInt(urlSection, 10)
    : null;

  const queryClient = useQueryClient();
  const submitDraft = useSubmitDraft();

  const [selectedCode, setSelectedCode] = useState<string>(urlFormCode || '');
  const [activeSectionName, setActiveSectionName] = useState<string | null>(
    urlSectionNum === null ? urlSection : null
  );
  const [activeSectionNumber, setActiveSectionNumber] = useState<number | null>(urlSectionNum);
  const [created, setCreated] = useState<{ code: string; serial: string; data: RecordData } | null>(null);
  const [search, setSearch] = useState('');
  // Single submit path — no gate step: select → form → success.
  const [step, setStep] = useState<'select' | 'form'>(urlFormCode ? 'form' : 'select');
  const [createError, setCreateError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [scope, setScope] = useState<'company-wide' | 'project-specific'>('company-wide');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // ── Server-side draft state (Prime §D4) ──
  const [draft, setDraft] = useState<DraftRef | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [resumedContent, setResumedContent] = useState<Record<string, unknown> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const draftRetry = useRef(0); // bumped to re-run draft creation after a failure

  // Template form data for DOCX-accurate form editing
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Autosave plumbing: one shared debounce per content source (page state for
  // the template path; renderer events for the fallback path). The latest
  // content always lives in a ref so a pending debounce never races a re-render.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rendererAutosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<Record<string, unknown>>({});

  const schema = selectedCode ? getFormSchema(selectedCode) : null;

  // Each entry carries the section name, its section number and its form count.
  // The name is the one the forms themselves declare, so the card's label
  // describes the forms inside it.
  const sections = useMemo(() => {
    const byName = new Map<string, { name: string; number: number; count: number }>();
    for (const form of FORM_SCHEMAS) {
      const name = sectionKeyOf(form);
      const existing = byName.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        byName.set(name, { name, number: form.section, count: 1 });
      }
    }
    // Sort by section number; the sort is stable, so groups sharing a number
    // keep the order the forms appear in the schema.
    return [...byName.values()].sort((a, b) => a.number - b.number);
  }, []);

  const clearAutosaveTimer = useCallback((which: 'template' | 'renderer') => {
    const timer = which === 'template' ? autosaveTimer : rendererAutosaveTimer;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // ── Server-side draft: created the moment the form opens; resumed if the
  // user already has an unfinished draft for this form (server-side idempotent
  // per creator+form — record_draft_create returns that same draft again).
  useEffect(() => {
    if (step !== 'form' || !selectedCode || created) return;
    let cancelled = false;
    setDraftBusy(true);
    setDraft(null);
    (async () => {
      const s = getFormSchema(selectedCode);
      const result = await createDraftRecord(
        selectedCode,
        { date: todayDDMMYYYY(), despatch_date: todayDDMMYYYY() },
        {
          formName: s?.name || '',
          section: s?.section ?? undefined,
          sectionName: s?.sectionName ?? undefined,
          frequency: s?.frequency ?? undefined,
        },
      );
      if (cancelled) return;
      setDraftBusy(false);
      if (!result.success) {
        setCreateError(result.error || 'Could not open a draft for this form.');
        return;
      }
      // A resumed draft carries previously saved content — hand it to the
      // form so the user sees what they already had ('serial' alone = fresh).
      setResumedContent(Object.keys(result.savedData).length > 1 ? result.savedData : null);
      setDraft({ id: result.id, serial: result.serial });
    })();
    return () => { cancelled = true; };
  }, [step, selectedCode, draftRetry.current, created]);

  // ── Template-path content: seeded from the resumed draft (or fresh
  // defaults) with the server-allocated serial. ──
  useEffect(() => {
    if (step !== 'form' || !selectedCode) return;
    const today = todayDDMMYYYY();
    const seed: Record<string, unknown> = {
      date: today,
      despatch_date: today,
      despatch_no: '',
      bill_no: '',
      ...(resumedContent || {}),
    };
    if (draft) seed.serial = draft.serial;
    setFormData(seed);
    latestContentRef.current = seed;
  }, [step, selectedCode, draft]);

  // ── Debounced server-side autosave (template path — content in page state;
  // scope/selectedProject ride along so the draft always persists them too). ──
  useEffect(() => {
    if (step !== 'form' || !draft || !getTemplateComponent(selectedCode)) return;
    if (!dirty) return;
    const t = setTimeout(async () => {
      const result = await autosaveRecordDraft(draft.id, latestContentRef.current);
      if (result.success) {
        setDirty(false);
        setAutosaveError(null);
      } else {
        // Never hide an autosave failure: the beforeunload guard stays armed
        // (dirty remains true) until content is actually on the server.
        setAutosaveError(`Autosave failed: ${result.error}. Your changes are still in the form.`);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    autosaveTimer.current = t;
    return () => clearTimeout(t);
  }, [formData, scope, selectedProjectId, draft, step, dirty]);

  // Template-path field change: keep the latest content fresh + schedule save.
  const handleTemplateFieldChange = useCallback(
    (field: string, value: string | Record<string, unknown> | Array<Record<string, unknown>>) => {
      setFormData(prev => {
        const next = { ...prev, [field]: value };
        latestContentRef.current = {
          ...next,
          scope,
          project_id: scope === 'project-specific' ? selectedProjectId : undefined,
        };
        return next;
      });
      setDirty(true);
      // The debounced effect above fires off `formData`; scope/project changes
      // are captured because they are deps of that effect too.
    },
    [scope, selectedProjectId],
  );

  // Renderer (fallback) path: the schema-driven form holds its own content and
  // streams changes out for the same server-side autosave.
  const handleRendererFieldChange = useCallback((data: RecordData) => {
    latestContentRef.current = data as Record<string, unknown>;
    setDirty(true);
    if (rendererAutosaveTimer.current) clearTimeout(rendererAutosaveTimer.current);
    const d = draft;
    rendererAutosaveTimer.current = setTimeout(async () => {
      const result = await autosaveRecordDraft(d?.id || '', data as Record<string, unknown>);
      if (result.success) {
        setDirty(false);
        setAutosaveError(null);
      } else {
        setAutosaveError(`Autosave failed: ${result.error}. Your changes are still in the form.`);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [draft]);

  // ── beforeunload guard: warn when unsaved changes would be lost (Prime §D4) ──
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // The active filter: the selected group name, or every group carrying the
  // legacy section number.  Null means "no section selected".
  const activeFilter = useMemo<{ names: string[]; label: string } | null>(() => {
    if (activeSectionName) {
      const known = sections.some(s => s.name === activeSectionName);
      return known ? { names: [activeSectionName], label: activeSectionName } : null;
    }
    if (activeSectionNumber !== null) {
      const names = sections.filter(s => s.number === activeSectionNumber).map(s => s.name);
      return names.length ? { names, label: names.join(' / ') } : null;
    }
    return null;
  }, [activeSectionName, activeSectionNumber, sections]);

  // Filter forms based on the active section
  const filteredForms = useMemo(() => {
    let forms = activeFilter
      ? FORM_SCHEMAS.filter(f => activeFilter.names.includes(sectionKeyOf(f)))
      : FORM_SCHEMAS;

    if (search) {
      const q = search.toLowerCase();
      forms = forms.filter(f =>
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      );
    }
    return forms;
  }, [activeFilter, search]);

  const handleFormSelect = (code: string) => {
    setSelectedCode(code);
    setStep('form');
  };

  const resetToSelect = () => {
    setCreated(null);
    setSelectedCode('');
    setStep('select');
    setCreateError(null);
    setValidationErrors([]);
    setAutosaveError(null);
    setResumedContent(null);
    setSearch('');
  };

  const selectSection = (name: string) => {
    setActiveSectionName(name);
    setActiveSectionNumber(null);
  };

  const clearSection = () => {
    setActiveSectionName(null);
    setActiveSectionNumber(null);
  };

  const currentSectionName = activeFilter?.label ?? null;

  // ─────────────────────────────────────────────────────────────────────
  // Single submit path: both UI paths (DOCX template + schema renderer)
  // finalize through submitRecordDraft — one final server-side save, then ONE
  // record_transition whose engine enforces Ahmed's Rules server-side.
  // Completeness is validated client-side (the canonical preWriteValidation
  // wrapper) immediately before, for both paths.
  // ─────────────────────────────────────────────────────────────────────
  const finalizeDraft = useCallback((content: Record<string, unknown>, withScope: boolean) => {
    if (!draft || !selectedCode || !schema || submitPending) return;
    clearAutosaveTimer('template');
    clearAutosaveTimer('renderer');
    setSubmitPending(true);
    setCreateError(null);
    setValidationErrors([]);

    const data: Record<string, unknown> = { ...content };
    if (withScope) {
      data.scope = scope;
      if (scope === 'project-specific' && selectedProjectId) {
        data.project_id = selectedProjectId;
      }
    }
    data._createdAt = data._createdAt || new Date().toISOString();
    // _frequency rides the form-data metadata set like every other create.
    data._frequency = schema.frequency || '';
    // _createdBy is NOT set here: the draft row already carries the
    // server-derived author (record_draft_create), and the workflow engine
    // attributes every transition itself. No client-side attribution.
    data.serial = draft.serial;

    const actorEmail = getCurrentUserSnapshot()?.email || '';
    const validation = preWriteValidation(selectedCode, data as RecordData, 'create', undefined, actorEmail);
    if (!validation.valid || !validation.sanitizedData) {
      setValidationErrors(validation.errors);
      setSubmitPending(false);
      return;
    }

    // Ahmed's Rules resolved client-side for UX; the authoritative check is
    // the record_transition engine (draft → approved requires admin or owning
    // dept_head; employees land on pending_review).
    const snapshot = getCurrentUserSnapshot();
    const recordDept = resolveDepartment(selectedCode);
    const target: RecordStatusEnum = snapshot ? resolveApprovalStatus(snapshot, recordDept) : 'pending_review';

    submitDraft.mutate(
      {
        id: draft.id,
        content: validation.sanitizedData as Record<string, unknown>,
        formCode: selectedCode,
        targetStatus: target,
      },
      {
        onSuccess: (result) => {
          setSubmitPending(false);
          if (!result.success || !result.record) {
            setCreateError(result.error || 'Failed to submit the draft.');
            return;
          }
          setDirty(false);
          setCreated({ code: selectedCode, serial: result.record.serial as string, data: result.record });
        },
        onError: (err: Error) => {
          setSubmitPending(false);
          setCreateError(err.message || 'Failed to submit the draft.');
        },
      },
    );
  }, [draft, selectedCode, schema, scope, selectedProjectId, submitPending, submitDraft, clearAutosaveTimer]);

  // Template path (DOCX-accurate templates): shared submit path with
  // client-side completeness validation.
  const handleFormSubmit = useCallback(() => {
    if (!schema || !selectedCode || !draft) return;
    finalizeDraft(
      { ...formData, scope, project_id: scope === 'project-specific' ? selectedProjectId : undefined },
      false,
    );
  }, [schema, selectedCode, draft, formData, scope, selectedProjectId, finalizeDraft]);

  // Renderer (fallback) path: the renderer validates internally, then funnels
  // through the SAME finalize path.
  const handleSubmit = useCallback((data: RecordData) => {
    if (!schema || !draft) return;
    finalizeDraft(data as Record<string, unknown>, false);
  }, [schema, draft, finalizeDraft]);

  const discardDraft = useCallback(async () => {
    if (!draft) return;
    clearAutosaveTimer('template');
    clearAutosaveTimer('renderer');
    const result = await discardRecordDraft(draft.id);
    if (!result.success) {
      // Never hide a refusal — the draft stays so nothing is silently lost.
      setCreateError(result.error || 'Could not discard the draft.');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['forge-records'] });
    resetToSelect();
  }, [draft, clearAutosaveTimer, queryClient]);

  const retryDraft = () => {
    setCreateError(null);
    draftRetry.current += 1;
    setDraft(d => d); // force a re-render pass; the effect re-runs on draftRetry
  };

  // ── Success ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <AppShell breadcrumbs={[
        { label: "Dashboard", path: "/" },
        ...(currentSectionName ? [{ label: currentSectionName }] : []),
        { label: "Create Record" },
      ]} maxWidth="max-w-doc">
        <div className="max-w-full mx-auto">
          {/* Success Header */}
          <div className="ds-card p-6 text-center border-success/30 mb-4">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-success-tint" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Record Created Successfully</h2>
            <span className="px-3 py-1.5 text-sm bg-success/10 text-success-tint border border-success/20 rounded-sm font-mono font-semibold">
              {created.serial}
            </span>
          </div>

          {/* Form-Formatted Record View */}
          <div className="ds-card p-6 mb-4">
            {(() => {
              // `_FORCE_VITE_INCLUDE` is not defined anywhere — it was a leftover
              // from the template-registry refactor, and reading it threw
              // ReferenceError, so this success screen crashed after every create.
              // `getTemplateComponent` is the registry the rest of the page uses
              // (and is already imported above). TemplateWrapper supplies the
              // Suspense boundary the lazy template needs.
              const fc = created.code;
              const TemplateComponent = getTemplateComponent(fc);
              if (TemplateComponent) {
                return (
                  <TemplateWrapper formCode={fc} data={created.data as Record<string, unknown>} isTemplate={false} />
                );
              }
              return <SchemaDrivenRecordView formCode={created.code} data={created.data} showMeta={true} />;
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button onClick={resetToSelect} className="ds-press ds-focus-ring px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium">
              Create Another
            </button>
            <button onClick={() => navigate(`/records/${encodeURIComponent(created.serial)}`)} className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors">
              View Record
            </button>
            <button onClick={() => navigate('/')} className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors">
              Dashboard
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ─── Main ──────────────────────────────────────────────────────────────
  // The container tier follows the step.  `select` is a scannable index
  // of section/form cards and belongs in the grid column; `form` renders
  // the Word-origin facsimile, whose tables run up to 18 columns wide and
  // need the document column.
  const shellTier = step === 'form' && getTemplateComponent(selectedCode) ? "max-w-doc" : "max-w-grid";
  return (
    <AppShell breadcrumbs={[
      { label: "Dashboard", path: "/" },
      ...(currentSectionName ? [{ label: currentSectionName }] : []),
      { label: "Create Record" },
    ]} maxWidth={shellTier}>
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {activeFilter && step === 'select' && (
            <button
              onClick={() => { clearSection(); setSelectedCode(''); setSearch(''); }}
              className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors ds-hit-44"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {step === 'form' && schema && getTemplateComponent(selectedCode)
              ? '' : step === 'form' && schema ? `Create ${schema.name}` : 'Create Record'}
          </h1>
          {currentSectionName && step !== 'form' && (
            <span className="text-sm text-muted-foreground font-medium px-2 py-0.5 bg-muted/30 rounded-sm">
              {currentSectionName}
            </span>
          )}
        </div>
        <button onClick={() => navigate(-1)} className="ds-press px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm hover:bg-accent transition-colors">
          Cancel
        </button>
      </div>

      {/* Error */}
      {(createError || autosaveError) && (
        <div className="mb-4 p-4 rounded-sm bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive-tint mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive-tint">{createError || autosaveError}</p>
            {createError && step === 'form' && (
              <div className="mt-1.5 flex gap-3">
                <button onClick={retryDraft} className="text-xs text-destructive-tint underline">
                  Retry
                </button>
                <button onClick={resetToSelect} className="text-xs text-muted-foreground underline">
                  Back to form list
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation errors (single error surface for both paths) */}
      {validationErrors.length > 0 && step === 'form' && (
        <div className="mb-4 p-4 rounded-sm bg-destructive/10 border border-destructive/20">
          <p className="text-sm font-medium text-destructive-tint mb-2">Fix the following before submitting:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-destructive-tint">
            {validationErrors.map(err => (
              <li key={err.field}><span className="font-mono">{err.field}</span> — {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ======== STEP: FORM (one-screen creation) ======== */}
      {step === 'form' && schema && (() => {
        const fc = selectedCode;
        const TemplateComponent = getTemplateComponent(fc);
        if (draftBusy) {
          return (
            <div className="max-w-lg mx-auto ds-card p-10 text-center text-muted-foreground">
              <Spinner size="md" className="mx-auto" />
              <p className="text-sm mt-3">Opening draft…</p>
            </div>
          );
        }
        if (!draft) return null;
        if (TemplateComponent) {
          // DOCX-accurate template for form creation — content lives in page
          // state (debounced server-side autosave above).
          return (
            <div className="max-w-full mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Create {schema.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fill in the form below. Fields marked with * are required.
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{draft.serial}</span>
                    {resumedContent && (
                      <span className="ml-2 text-xs text-warning-tint">resumed draft</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CloudUpload className="w-3 h-3" />
                    {dirty ? 'Autosaving…' : 'All changes saved'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={discardDraft}
                    className="ds-press px-4 py-2 text-sm bg-secondary text-secondary-foreground border border-border rounded-sm hover:bg-accent transition-colors"
                  >
                    Discard draft
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={submitPending}
                    className="ds-press ds-focus-ring px-6 py-2 text-sm bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Record
                  </button>
                </div>
              </div>
              <div className="ds-card p-6">
                <TemplateWrapper
                  formCode={fc}
                  data={formData}
                  isTemplate={false}
                  editMode={true}
                  onChange={handleTemplateFieldChange}
                />
              </div>

              {/* ── Scope Selector ─────────────────────────── */}
              <div className="mt-4 bg-card border border-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Record Scope
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => { setScope('company-wide'); setSelectedProjectId(''); }}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-all ${
                      scope === 'company-wide'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-ink-2 dark:text-ink-2 border border-border hover:border-foreground/20'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Company-Wide
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('project-specific')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-all ${
                      scope === 'project-specific'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-ink-2 dark:text-ink-2 border border-border hover:border-foreground/20'
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    Project-Specific
                  </button>
                </div>

                {scope === 'project-specific' && (
                  <div>
                    <label className="block text-xs text-ink-2 dark:text-ink-2 mb-1.5">Select Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25"
                    >
                      <option value="">— Select a project —</option>
                      {PROJECTS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-ink-3 mt-1">
                      This record will be linked to the selected project.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        // Fallback: schema-driven form (renderer holds its own content and
        // autosaves through handleRendererFieldChange).  This one is a
        // single-column form, so it gets the reading column.
        return (
          <div className="max-w-read mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create {schema.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">Fill in the form below. Fields marked with * are required.</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CloudUpload className="w-3 h-3" />
                  {dirty ? 'Autosaving…' : 'All changes saved'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={discardDraft}
                  className="ds-press px-4 py-2 text-sm bg-secondary text-secondary-foreground border border-border rounded-sm hover:bg-accent transition-colors"
                >
                  Discard draft
                </button>
                <button
                  onClick={() => { setStep('select'); setSelectedCode(''); }}
                  className="ds-press px-4 py-2 text-sm bg-secondary text-secondary-foreground border border-border rounded-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <DynamicFormRenderer
              formCode={selectedCode}
              initialData={(resumedContent || {}) as RecordData}
              onSubmit={handleSubmit}
              onFieldChange={handleRendererFieldChange}
              onCancel={() => { setStep('select'); setSelectedCode(''); }}
              isSubmitting={submitPending}
            />
          </div>
        );
      })()}

      {/* ======== STEP: SELECT (Section picker or form list) ======== */}
      {step === 'select' && (
        <>
          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeFilter ? "Search forms in this section..." : "Search all forms..."}
              className="w-full h-11 pl-10 pr-4 rounded-sm border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* No section selected — show section cards */}
          {!activeFilter && !search && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Select a section to see available forms, or search above.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sections.map(sec => {
                  const Icon = sectionIcon(sec.name);
                  return (
                    <button
                      key={sec.name}
                      onClick={() => selectSection(sec.name)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-sm border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group"
                      )}
                    >
                      <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary-tint" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary-tint transition-colors">
                          {sec.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sec.count} form{sec.count !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-primary-tint transition-colors mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section selected OR searching — show form list */}
          {(activeFilter || search) && (
            <div className="space-y-2">
              {/* Section chip (removable) */}
              {activeFilter && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={clearSection}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/10 text-primary-tint text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {currentSectionName}
                    <XCircle className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {filteredForms.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No forms found</p>
                </div>
              )}

              {filteredForms.map(f => {
                const Icon = sectionIcon(sectionKeyOf(f));
                return (
                  <button
                    key={f.code}
                    onClick={() => handleFormSelect(f.code)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-sm border border-border bg-card",
                      "hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group"
                    )}
                  >
                    <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary-tint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary-tint transition-colors">
                          {f.name}
                        </h3>
                        <span className="text-[10px] font-mono text-muted-foreground">{f.code}</span>
                      </div>
                      {f.frequency && (
                        <p className="text-xs text-muted-foreground mt-0.5">{f.frequency}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-primary-tint transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </AppShell>
  );
};

export default RecordCreationPage;