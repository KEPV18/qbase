// ============================================================================
// QMS Forge — Dynamic Form Renderer (Phase 9 Refined)
// Consistent design system classes, improved hierarchy, better interactions.
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  FormSchema,
  FieldSchema,
  FieldType,
  FORM_SCHEMAS,
  getFormSchema,
  getFormSections,
} from '../../data/formSchemas';
import {
  validateFormData,
  validatePreCreationGate,
  getNextSerial,
  getFrequencyWarning,
  isoToDisplay,
  todayISO,
  type PreCreationGateData,
} from '../../schemas';
import { Shield, Loader2, Plus, X, AlertTriangle, FileText } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface RecordData {
  [key: string]: string | number | boolean | RecordData[];
}

export interface FormErrors {
  [key: string]: string;
}

interface DynamicFormRendererProps {
  formCode?: string;
  initialData?: RecordData;
  onSubmit: (data: RecordData) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  editMode?: boolean;
}

// ============================================================================
// Pre-Creation Gate Modal
// ============================================================================

const PreCreationGate: React.FC<{
  formCode: string;
  frequency: string;
  onPass: (answers: PreCreationGateData) => void;
  onBack: () => void;
}> = ({ formCode, frequency, onPass, onBack }) => {
  const [needReason, setNeedReason] = useState('');
  const [businessEvent, setBusinessEvent] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warning = getFrequencyWarning(formCode, frequency);

  const handlePass = () => {
    const result = validatePreCreationGate({ needReason, businessEvent, frequencyCheck: confirmed ? 'yes' : '' });
    if (result.success) {
      onPass(result.data);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-warning/30 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl ds-fade-enter">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Pre-Creation Gate</h3>
            <p className="text-xs text-muted-foreground">Required check before record creation</p>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-sm p-3 mb-4">
          <p className="text-sm text-warning">{warning}</p>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Every record must be justified. Answer these 3 questions before proceeding.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              1. Why is this record needed? <span className="text-destructive">*</span>
            </label>
            <textarea
              value={needReason}
              onChange={e => setNeedReason(e.target.value)}
              placeholder="e.g. New project started — requires training records"
              className="input-modern w-full px-3 py-2 text-sm resize-none"
              rows={2}
            />
            {errors.needReason && <p className="text-destructive text-xs mt-1">{errors.needReason}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              2. What business event triggered this? <span className="text-destructive">*</span>
            </label>
            <textarea
              value={businessEvent}
              onChange={e => setBusinessEvent(e.target.value)}
              placeholder="e.g. Monthly management review cycle"
              className="input-modern w-full px-3 py-2 text-sm resize-none"
              rows={2}
            />
            {errors.businessEvent && <p className="text-destructive text-xs mt-1">{errors.businessEvent}</p>}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              3. I confirm this record is needed per its frequency schedule
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button
            onClick={handlePass}
            className="ds-press ds-focus-ring px-6 py-2 bg-primary text-primary-foreground rounded-sm font-medium"
          >
            Proceed to Form
          </button>
          <button
            onClick={onBack}
            className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Field Components — Unified with design system
// ============================================================================

const FIELD_BASE = 'w-full px-3 py-2 rounded-sm text-sm';
const FIELD_NORMAL = `${FIELD_BASE} input-modern`;
const FIELD_ERROR = 'border-destructive';
const FIELD_READONLY = 'opacity-60 cursor-not-allowed';

const TextField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={readOnly || field.defaultValue === 'auto'}
      className={`${FIELD_NORMAL} ${error ? FIELD_ERROR : ''} ${readOnly || field.defaultValue === 'auto' ? FIELD_READONLY : ''}`}
    />
    {field.defaultValue === 'auto' && !readOnly && (
      <p className="text-xs text-muted-foreground mt-1">Auto-generated</p>
    )}
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

const NumberField: React.FC<{
  field: FieldSchema;
  value: number | string;
  onChange: (val: number) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={field.validation?.min}
      max={field.validation?.max}
      disabled={readOnly}
      className={`${FIELD_NORMAL} ${error ? FIELD_ERROR : ''} ${readOnly ? FIELD_READONLY : ''}`}
    />
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

const DateField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={readOnly}
      className={`${FIELD_NORMAL} ${error ? FIELD_ERROR : ''} ${readOnly ? FIELD_READONLY : ''}`}
    />
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

const SelectField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={readOnly}
      className={`${FIELD_NORMAL} ${error ? FIELD_ERROR : ''} ${readOnly ? FIELD_READONLY : ''}`}
    >
      <option value="">— Select —</option>
      {field.options?.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

const TextareaField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className="form-field col-span-2">
    <label className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={readOnly}
      rows={3}
      className={`${FIELD_NORMAL} resize-none ${error ? FIELD_ERROR : ''} ${readOnly ? FIELD_READONLY : ''}`}
    />
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

const CheckboxField: React.FC<{
  field: FieldSchema;
  value: boolean;
  onChange: (val: boolean) => void;
  readOnly?: boolean;
}> = ({ field, value, onChange, readOnly }) => (
  <div className="form-field col-span-2">
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        disabled={readOnly}
        className="rounded border-border accent-primary"
      />
      {field.label}
    </label>
  </div>
);

const HeadingField: React.FC<{ field: FieldSchema }> = ({ field }) => (
  <div className="col-span-2 mt-4 pt-2 border-t border-border">
    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{field.label}</h3>
  </div>
);

// ============================================================================
// Table Field Component — Unified with design system
// ============================================================================

const TableField: React.FC<{
  field: FieldSchema;
  rows: RecordData[];
  onChange: (rows: RecordData[]) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
}> = ({ field, rows, onChange, readOnly, errors }) => {
  const columns = field.columns || [];

  const addRow = () => {
    const newRow: RecordData = {};
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : '';
    });
    onChange([...rows, newRow]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex: number, colKey: string, value: string | number | boolean) => {
    const updated = rows.map((row, i) => {
      if (i !== rowIndex) return row;
      return { ...row, [colKey]: value };
    });
    onChange(updated);
  };

  const tableError = errors?.[field.key];

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-foreground mb-2">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              <th className="px-3 py-2 text-left text-secondary-foreground font-medium w-8">#</th>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-2 text-left text-secondary-foreground font-medium">
                  {col.label}
                  {col.required && <span className="text-destructive ml-1">*</span>}
                </th>
              ))}
              {!readOnly && <th className="px-2 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (readOnly ? 1 : 2)} className="px-3 py-4 text-center text-muted-foreground">
                  No rows added yet — click "+ Add Row" below
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-card' : 'bg-secondary/30'}>
                <td className="px-3 py-1 text-muted-foreground text-xs">{ri + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-1">
                    {col.type === 'select' ? (
                      <select
                        value={row[col.key] as string || ''}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm input-modern"
                      >
                        <option value="">—</option>
                        {col.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : col.type === 'number' ? (
                      <input
                        type="number"
                        value={row[col.key] as number || ''}
                        onChange={e => updateCell(ri, col.key, Number(e.target.value))}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm input-modern"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[col.key] as string || ''}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm input-modern"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeRow(ri)}
                      className="text-destructive hover:text-destructive/80 text-sm ds-press"
                      title="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableError && <p className="text-destructive text-xs mt-1">{tableError}</p>}
      {!readOnly && (
        <button
          onClick={addRow}
          className="mt-2 ds-press px-3 py-1.5 text-sm rounded-sm border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Row
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Validation Error Banner — Unified with design system
// ============================================================================

const ValidationBanner: React.FC<{ errors: Record<string, string>; onDismiss: () => void }> = ({ errors, onDismiss }) => {
  const count = Object.keys(errors).length;
  if (count === 0) return null;

  return (
    <div className="mb-4 ds-critical-card rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-destructive font-medium text-sm">
          <AlertTriangle className="w-4 h-4" />
          {count} validation error{count !== 1 ? 's' : ''}
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs ds-press">
          Dismiss
        </button>
      </div>
      <ul className="space-y-1 text-xs text-destructive/80">
        {Object.entries(errors).map(([key, msg]) => (
          <li key={key}><span className="font-mono text-foreground/70">{key}:</span> {msg}</li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// Main DynamicFormRenderer
// ============================================================================

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  formCode,
  initialData,
  onSubmit,
  onCancel,
  readOnly = false,
  editMode = false,
}) => {
  const [selectedCode, setSelectedCode] = useState(formCode || '');
  const [formData, setFormData] = useState<RecordData>(initialData || {});
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gatePassed, setGatePassed] = useState(editMode);
  const [gateAnswers, setGateAnswers] = useState<PreCreationGateData | null>(null);
  const [showGate, setShowGate] = useState(false);

  const schema = selectedCode ? getFormSchema(selectedCode) : null;

  // Reset state when formCode changes
  React.useEffect(() => {
    if (formCode && formCode !== selectedCode) {
      setSelectedCode(formCode);
    }
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({});
    }
    setErrors({});
    setSubmitted(false);
    setIsSubmitting(false);
    if (editMode) {
      setGatePassed(true);
    } else {
      setGatePassed(false);
    }
    setGateAnswers(null);
  }, [formCode, editMode]);

  const handleFormSelect = (code: string) => {
    if (!gatePassed && code !== selectedCode) {
      setShowGate(true);
    }
  };

  const handleGatePass = (answers: PreCreationGateData) => {
    setGatePassed(true);
    setGateAnswers(answers);
    setShowGate(false);
  };

  const handleFieldChange = useCallback((key: string, value: string | number | boolean | RecordData[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [submitted]);

  const validate = useCallback((): boolean => {
    if (!schema || !selectedCode) return false;
    const dataToValidate = { ...formData };
    if (!dataToValidate.serial || dataToValidate.serial === 'auto') {
      dataToValidate.serial = getNextSerial(selectedCode);
    }
    const result = validateFormData(selectedCode, dataToValidate);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(result.errors);
    setSubmitted(true);
    return false;
  }, [schema, selectedCode, formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const dataToValidate = { ...formData };
    if (!dataToValidate.serial || dataToValidate.serial === 'auto') {
      dataToValidate.serial = getNextSerial(selectedCode);
    }

    dataToValidate._createdAt = new Date().toISOString();
    dataToValidate._createdBy = 'Ahmed Khaled';
    dataToValidate._creationReason = gateAnswers?.needReason || '';
    dataToValidate._businessEvent = gateAnswers?.businessEvent || '';

    const result = validateFormData(selectedCode, dataToValidate);
    if (result.success) {
      setIsSubmitting(true);
      if (schema) {
        schema.fields.forEach(field => {
          if (field.type === 'date' && result.data[field.key]) {
            result.data[field.key] = isoToDisplay(result.data[field.key] as string);
          }
        });
      }
      onSubmit({ ...result.data, formCode: selectedCode } as RecordData);
    } else {
      setErrors(result.errors);
      setSubmitted(true);
    }
  };

  const renderField = (field: FieldSchema) => {
    const val = formData[field.key];
    const err = errors[field.key];

    switch (field.type) {
      case 'text':
      case 'signature':
        return (
          <TextField
            key={field.key}
            field={field}
            value={val as string || (field.defaultValue === 'auto' ? `Will be: ${getNextSerial(selectedCode)}` : '')}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'number':
        return (
          <NumberField
            key={field.key}
            field={field}
            value={val as number || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'date':
        return (
          <DateField
            key={field.key}
            field={field}
            value={val as string || (field.required ? todayISO() : '')}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'select':
      case 'radio':
        return (
          <SelectField
            key={field.key}
            field={field}
            value={val as string || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            key={field.key}
            field={field}
            value={val as string || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'checkbox':
        return (
          <CheckboxField
            key={field.key}
            field={field}
            value={val as boolean || false}
            onChange={v => handleFieldChange(field.key, v)}
            readOnly={readOnly}
          />
        );
      case 'table':
        return (
          <TableField
            key={field.key}
            field={field}
            rows={val as RecordData[] || []}
            onChange={v => handleFieldChange(field.key, v)}
            readOnly={readOnly}
            errors={errors}
          />
        );
      case 'heading':
        return <HeadingField key={field.key} field={field} />;
      default:
        return null;
    }
  };

  // Show the pre-creation gate modal
  if (showGate && schema) {
    return (
      <>
        <PreCreationGate
          formCode={selectedCode}
          frequency={schema.frequency}
          onPass={handleGatePass}
          onBack={() => setShowGate(false)}
        />
        <div className="ds-card p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg text-foreground mb-2">Complete the Pre-Creation Gate</h3>
            <p className="text-sm text-muted-foreground">
              Answer 3 questions before filling the <span className="text-primary font-mono font-semibold">{selectedCode}</span> form.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="ds-card p-6">
      {schema ? (
        <>
          {/* Form header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 text-xs font-bold bg-primary/15 text-primary rounded-sm font-mono">
                {schema.code}
              </span>
              <h2 className="text-xl font-semibold text-foreground">{schema.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{schema.description}</p>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Section: {schema.sectionName}</span>
              <span>·</span>
              <span>Frequency: {schema.frequency}</span>
              <span>·</span>
              <span className={
                schema.importance === 'Critical' ? 'text-destructive font-medium' :
                schema.importance === 'High' ? 'text-warning font-medium' : ''
              }>
                {schema.importance}
              </span>
            </div>
            {gateAnswers && (
              <div className="mt-2 text-xs bg-success/10 border border-success/20 rounded-sm px-3 py-1.5 text-success">
                ✓ Gate passed — Reason: {gateAnswers.needReason.slice(0, 60)}...
              </div>
            )}
          </div>

          {/* Validation errors */}
          {submitted && Object.keys(errors).length > 0 && (
            <ValidationBanner errors={errors} onDismiss={() => setErrors({})} />
          )}

          {/* Form fields */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {schema.fields.map(renderField)}
            </div>

            {/* Submit / Cancel */}
            {!readOnly && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting || readOnly}
                  className={`ds-press ds-focus-ring px-6 py-2 rounded-sm font-medium flex items-center gap-2 ${
                    (isSubmitting || readOnly)
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } transition-colors`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? (editMode ? 'Saving...' : 'Creating...') : (editMode ? 'Save Changes' : 'Create Record')}
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </form>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg text-foreground mb-2">Select a Form</h3>
          <p className="text-sm text-muted-foreground">Choose a form from the sidebar. You'll answer 3 gate questions before filling the form.</p>
        </div>
      )}
    </div>
  );
};

export default DynamicFormRenderer;