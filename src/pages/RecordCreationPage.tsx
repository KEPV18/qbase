// ============================================================================
// QMS Forge — Record Creation Page (Section-First Flow)
// When navigated from a module: auto-filters to that section's forms.
// When navigated directly (/create): shows section picker first.
// No more dumping all 50 forms at once.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, CheckCircle, XCircle, ArrowLeft, Loader2,
  ChevronRight, Layers,
} from 'lucide-react';
import { FORM_SCHEMAS, getFormSchema, getFormSections, getFormsBySection } from '../data/formSchemas';
import { getNextSerial } from '../schemas';
import { todayDDMMYYYY } from '../schemas';
import { MODULE_CONFIG } from '../config/modules';
import DynamicFormRenderer, { type RecordData } from '../components/forms/DynamicFormRenderer';
import { SchemaDrivenRecordView } from '../components/forms/SchemaDrivenRecordView';
import { getFormTemplateComponent } from '@/components/forms/templates';
import { useCreateRecord } from '../hooks/useRecordStorage';
import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';

// ============================================================================
// Section config (maps section numbers to icons/colors from MODULE_CONFIG)
// ============================================================================

const SECTION_META: Record<number, { id: string; icon: typeof Layers; color: string }> = {};
Object.values(MODULE_CONFIG).forEach(m => {
  SECTION_META[m.section] = { id: m.id, icon: m.icon, color: m.moduleClass };
});

// ============================================================================
// Record Creation Page
// ============================================================================

const RecordCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFormCode = searchParams.get('formCode');
  const urlSection = searchParams.get('section');
  const urlSectionNum = urlSection ? parseInt(urlSection, 10) : null;

  const createMutation = useCreateRecord();

  const [selectedCode, setSelectedCode] = useState<string>(urlFormCode || '');
  const [activeSection, setActiveSection] = useState<number | null>(urlSectionNum);
  const [created, setCreated] = useState<{ code: string; serial: string; data: RecordData } | null>(null);
  const [search, setSearch] = useState('');
  const [gateStep, setGateStep] = useState<'select' | 'gate' | 'form' | 'success'>(
    urlFormCode ? 'gate' : 'select'
  );
  const [createError, setCreateError] = useState<string | null>(null);

  const sections = getFormSections();
  const schema = selectedCode ? getFormSchema(selectedCode) : null;

  // Template form data for DOCX-accurate form editing
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Initialize defaults when entering form step
  useEffect(() => {
    if (gateStep === 'form' && selectedCode) {
      const serial = getNextSerial(selectedCode);
      const today = todayDDMMYYYY();
      setFormData(prev => ({
        ...prev,
        serial: prev.serial || serial,
        date: prev.date || today,
        despatch_date: prev.despatch_date || today,
        bill_no: prev.bill_no || serial,
      }));
    }
  }, [gateStep, selectedCode]);

  const handleTemplateFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFormSubmit = useCallback(() => {
    if (!schema || !selectedCode) return;
    // Build RecordData from template form data
    const data: RecordData = { ...formData };
    if (!data.serial || data.serial === 'auto') {
      data.serial = getNextSerial(selectedCode);
    }
    data.formCode = selectedCode;
    data._createdAt = new Date().toISOString();
    data._createdBy = 'Ahmed Khaled';
    // Convert dates from display format (DD/MM/YYYY) to display format (already DD/MM/YYYY from template)
    // No conversion needed — DateOrTextCell stores values as-is
    console.log('[CreateRecord] Submitting data:', JSON.stringify(data, null, 2));
    createMutation.mutate(data as any, {
      onSuccess: (result: any) => {
        console.log('[CreateRecord] Mutation result:', JSON.stringify(result, null, 2));
        // Check if the mutation actually succeeded
        if (result?.success === false) {
          setCreateError(result.error || 'Failed to create record');
          return;
        }
        const serial = result?.record?.serial || data.serial || '';
        setCreated({ code: selectedCode, serial: serial as string, data: data as RecordData });
      },
      onError: (err: any) => {
        console.error('[CreateRecord] Mutation error:', err);
        setCreateError(err.message || 'Failed to create record');
      },
    });
  }, [schema, selectedCode, formData, createMutation]);

  // Filter forms based on active section
  const filteredForms = useMemo(() => {
    let forms = activeSection !== null
      ? getFormsBySection(activeSection)
      : FORM_SCHEMAS;

    if (search) {
      const q = search.toLowerCase();
      forms = forms.filter(f =>
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      );
    }
    return forms;
  }, [activeSection, search]);

  // Group forms by section when no section is active (for section picker view)
  const formsBySection = useMemo(() => {
    if (activeSection !== null) return null;
    const map = new Map<number, typeof FORM_SCHEMAS>();
    (search ? filteredForms : FORM_SCHEMAS).forEach(f => {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    });
    return map;
  }, [activeSection, filteredForms, search]);

  const handleFormSelect = (code: string) => {
    setSelectedCode(code);
    setGateStep('gate');
  };

  const handleGatePass = () => {
    setGateStep('form');
  };

  const handleSubmit = (data: RecordData) => {
    if (!schema) return;
    setCreateError(null);

    createMutation.mutate(data, {
      onSuccess: (result) => {
        if (result.success && result.record) {
          setCreated({ code: schema.code, serial: result.record.serial as string, data: result.record });
          setGateStep('success');
        } else {
          setCreateError(result.error || 'Failed to create record.');
        }
      },
      onError: (err: Error) => {
        setCreateError(err.message || 'Failed to create record.');
      },
    });
  };

  const resetToSelect = () => {
    setCreated(null);
    setSelectedCode('');
    setGateStep('select');
    setCreateError(null);
    setSearch('');
  };

  const currentSectionName = useMemo(() => {
    if (activeSection === null) return null;
    const sec = sections.find(s => s.number === activeSection);
    return sec?.name || null;
  }, [activeSection, sections]);

  // ─── Success ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <AppShell breadcrumbs={[
        { label: "Dashboard", path: "/" },
        ...(currentSectionName ? [{ label: currentSectionName, path: `/module/${SECTION_META[activeSection!]?.id || ''}` }] : []),
        { label: "Create Record" },
      ]}>
        <div className="max-w-4xl mx-auto page-transition">
          {/* Success Header */}
          <div className="ds-card p-6 text-center border-success/30 mb-4">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Record Created Successfully</h2>
            <span className="px-3 py-1.5 text-sm bg-success/10 text-success border border-success/20 rounded-sm font-mono font-semibold">
              {created.serial}
            </span>
          </div>

          {/* Form-Formatted Record View */}
          <div className="ds-card p-6 mb-4">
            {(() => {
              const TemplateComponent = getFormTemplateComponent(created.code);
              if (TemplateComponent) {
                return <TemplateComponent data={created.data as Record<string, unknown>} isTemplate={false} />;
              }
              return <SchemaDrivenRecordView formCode={created.code} data={created.data} showMeta={true} />;
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button onClick={resetToSelect} className="ds-press ds-focus-ring px-6 py-2 bg-primary text-primary-foreground rounded-sm font-medium">
              Create Another
            </button>
            <button onClick={() => navigate(`/records/${encodeURIComponent(created.serial)}`)} className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors">
              View Record
            </button>
            <button onClick={() => navigate('/records')} className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors">
              All Records
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ─── Main ──────────────────────────────────────────────────────────────
  return (
    <AppShell breadcrumbs={[
      { label: "Dashboard", path: "/" },
      ...(currentSectionName ? [{ label: currentSectionName, path: `/module/${SECTION_META[activeSection!]?.id || ''}` }] : []),
      { label: "Create Record" },
    ]}>
    <div className="max-w-6xl mx-auto page-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {activeSection !== null && (
            <button
              onClick={() => { setActiveSection(null); setSelectedCode(''); setGateStep('select'); setSearch(''); }}
              className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {gateStep === 'form' && schema && getFormTemplateComponent(selectedCode)
              ? '' : gateStep === 'form' && schema ? `Create ${schema.name}` : 'Create Record'}
          </h1>
          {currentSectionName && gateStep !== 'form' && (
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
      {createError && (
        <div className="mb-4 p-4 rounded-sm bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{createError}</p>
        </div>
      )}

      {/* ======== STEP: GATE (Pre-Creation Check) ======== */}
      {gateStep === 'gate' && schema && (
        <div className="max-w-lg mx-auto">
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{schema.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">{schema.code} · Section {schema.section}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Before creating a new <strong>{schema.name}</strong>, verify:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>This form requires a business event (not creating for the sake of count).</li>
                <li>Per {schema.frequency || 'event-based'} frequency — no duplicate exists.</li>
                <li>All required data is available before submission.</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setSelectedCode(''); setGateStep('select'); }} className="ds-press px-4 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm">
                Back
              </button>
              <button onClick={handleGatePass} className="ds-press ds-focus-ring px-6 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== STEP: FORM (Actual Creation) ======== */}
      {gateStep === 'form' && schema && (() => {
        const TemplateComponent = getFormTemplateComponent(selectedCode);
        if (TemplateComponent) {
          // Use DOCX-accurate template for form creation
          return (
            <div className="max-w-4xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Create {schema.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Fill in the form below. Fields marked with * are required.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGateStep('select'); setSelectedCode(''); }}
                    className="ds-press ds-focus-ring px-4 py-2 text-sm bg-secondary text-secondary-foreground border border-border rounded-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={createMutation.isPending}
                    className="ds-press ds-focus-ring px-6 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Record
                  </button>
                </div>
              </div>
              <div className="ds-card p-6">
                <TemplateComponent
                  data={formData}
                  isTemplate={false}
                  editMode={true}
                  onChange={handleTemplateFieldChange}
                />
              </div>
            </div>
          );
        }
        // Fallback: schema-driven form
        return (
          <div className="max-w-2xl mx-auto">
            <DynamicFormRenderer
              formCode={selectedCode}
              onSubmit={handleSubmit}
              onCancel={() => { setGateStep('select'); setSelectedCode(''); }}
              isSubmitting={createMutation.isPending}
            />
          </div>
        );
      })()}

      {/* ======== STEP: SELECT (Section picker or form list) ======== */}
      {gateStep === 'select' && (
        <>
          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeSection ? "Search forms in this section..." : "Search all forms..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* No section selected — show section cards */}
          {activeSection === null && !search && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Select a section to see available forms, or search above.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sections.map(sec => {
                  const meta = SECTION_META[sec.number];
                  const Icon = meta?.icon || Layers;
                  return (
                    <button
                      key={sec.number}
                      onClick={() => setActiveSection(sec.number)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-sm border border-border/50 bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group"
                      )}
                    >
                      <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {sec.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sec.count} form{sec.count !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section selected OR searching — show form list */}
          {(activeSection !== null || search) && (
            <div className="space-y-2">
              {/* Section chip (removable) */}
              {activeSection !== null && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
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
                const secMeta = SECTION_META[f.section];
                const Icon = secMeta?.icon || Layers;
                return (
                  <button
                    key={f.code}
                    onClick={() => handleFormSelect(f.code)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-sm border border-border/50 bg-card",
                      "hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group"
                    )}
                  >
                    <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {f.name}
                        </h3>
                        <span className="text-[10px] font-mono text-muted-foreground">{f.code}</span>
                      </div>
                      {f.frequency && (
                        <p className="text-xs text-muted-foreground mt-0.5">{f.frequency}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
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