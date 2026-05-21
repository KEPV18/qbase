// ============================================================================
// QMS Forge — Schema-Driven Record View
// Renders a record as a "submitted form snapshot" using its form schema.
// No static layouts. Field order, types, and grouping from schema.
// ============================================================================

import React, { useMemo } from 'react';
import {
  FormSchema,
  FieldSchema,
  getFormSchema,
  getFormSections,
} from '../../data/formSchemas';
import { isoToDisplay } from '../../schemas';
import type { RecordData } from './DynamicFormRenderer';

// ============================================================================
// Types
// ============================================================================

interface SchemaDrivenRecordViewProps {
  formCode: string;
  data: RecordData;
  className?: string;
  /** Show metadata section (serial, dates, status) */
  showMeta?: boolean;
  /** Compact mode for inline/embedded display */
  compact?: boolean;
}

// ============================================================================
// Field Value Renderer
// Renders a single field value based on its FieldType
// ============================================================================

const FieldValue: React.FC<{
  field: FieldSchema;
  value: unknown;
  compact?: boolean;
}> = ({ field, value, compact }) => {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground italic text-sm">—</span>;
  }

  const val = value as string | number | boolean | RecordData[];

  switch (field.type) {
    case 'text':
    case 'signature':
      return <span className="text-foreground break-words">{String(val)}</span>;

    case 'number':
      return <span className="text-foreground font-mono tabular-nums">{String(val)}</span>;

    case 'date': {
      // Convert ISO to display format if needed
      let displayVal = String(val);
      if (/^\d{4}-\d{2}-\d{2}/.test(displayVal)) {
        displayVal = isoToDisplay(displayVal) || displayVal;
      }
      return <span className="text-foreground font-mono">{displayVal}</span>;
    }

    case 'select':
    case 'radio':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {String(val)}
        </span>
      );

    case 'multiselect': {
      const items = Array.isArray(val) ? val : String(val).split(',').map(s => s.trim());
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    case 'textarea':
      return (
        <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
          {String(val)}
        </div>
      );

    case 'checkbox':
      return val ? (
        <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Yes
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">No</span>
      );

    case 'table': {
      const rows = Array.isArray(val) ? val : [];
      if (rows.length === 0) {
        return <span className="text-muted-foreground italic text-sm">No entries</span>;
      }
      const columns = field.columns || [];
      return (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                {columns.map(col => (
                  <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2 text-foreground">
                      {row[col.key] !== undefined && row[col.key] !== '' ? String(row[col.key]) : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'heading':
      return null; // Headings are not data fields

    default:
      return <span className="text-foreground">{String(val)}</span>;
  }
};

// ============================================================================
// Schema-Driven Record View Component
// ============================================================================

export const SchemaDrivenRecordView: React.FC<SchemaDrivenRecordViewProps> = ({
  formCode,
  data,
  className = '',
  showMeta = true,
  compact = false,
}) => {
  const schema = useMemo(() => getFormSchema(formCode), [formCode]);
  const sections = useMemo(() => getFormSections(formCode), [formCode]);

  if (!schema) {
    // Fallback: no schema found, render raw key-value pairs
    return (
      <div className={`space-y-2 ${className}`}>
        {Object.entries(data).map(([key, value]) => {
          if (key.startsWith('_') || key === 'id') return null;
          if (value === undefined || value === null || value === '') return null;
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key}</span>
              <span className="text-sm text-foreground">{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Extract metadata from data
  const meta = {
    serial: data.serial as string || '',
    formCode: data.formCode as string || formCode,
    formName: data.formName as string || schema.name,
    status: data._status as string || 'draft',
    createdAt: data._createdAt as string || '',
    createdBy: data._createdBy as string || '',
    lastModifiedAt: data._lastModifiedAt as string || '',
    lastModifiedBy: data._lastModifiedBy as string || '',
    editCount: data._editCount as number || 0,
    section: data._section as number || schema.section,
    sectionName: data._sectionName as string || schema.sectionName,
    frequency: data._frequency as string || schema.frequency,
  };

  // Build field lookup from schema
  const fieldMap = new Map<string, FieldSchema>();
  const buildFieldMap = (fields: FieldSchema[]) => {
    for (const f of fields) {
      if (f.type === 'table' && f.columns) {
        // Table columns are sub-fields — don't add to top-level map
      }
      fieldMap.set(f.key, f);
    }
  };
  buildFieldMap(schema.fields);

  // Determine which data keys are business fields (not metadata)
  const METADATA_KEYS = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason', '_status',
    '_section', '_sectionName', '_frequency',
    '_creationReason', '_businessEvent',
  ]);

  // Get ordered business fields from schema
  const orderedFields = schema.fields.filter(f => f.type !== 'heading');

  // Status badge styling
  const statusStyle: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground border-border',
    pending_review: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div className={`schema-record-view ${className}`}>
      {/* ── Header: Form identity + status ────────────────────────────── */}
      {showMeta && (
        <div className="mb-6 border border-border rounded-sm bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {meta.sectionName}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-sm font-medium text-foreground">{meta.formCode} — {meta.formName}</span>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${statusStyle[meta.status] || statusStyle.draft}`}>
              {meta.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            <MetaCell label="Serial" value={meta.serial} mono />
            <MetaCell label="Frequency" value={meta.frequency} />
            <MetaCell label="Created" value={meta.createdAt ? isoToDisplay(meta.createdAt.substring(0, 10)) || meta.createdAt : '—'} />
            <MetaCell label="Created By" value={meta.createdBy} />
          </div>

          {meta.lastModifiedAt && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Last modified {isoToDisplay(meta.lastModifiedAt.substring(0, 10))} by {meta.lastModifiedBy} (v{meta.editCount})
            </div>
          )}
        </div>
      )}

      {/* ── Body: Schema-ordered field values ─────────────────────────── */}
      <div className="space-y-1">
        {schema.fields.map((field, index) => {
          // Render headings as section dividers
          if (field.type === 'heading') {
            return compact ? null : (
              <div key={`heading-${index}`} className="mt-4 mb-2 first:mt-0">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider pb-1 border-b border-border">
                  {field.label}
                </h3>
              </div>
            );
          }

          // Read from formData (business data) first, then top-level (backward compat)
          const formData = data.formData as Record<string, unknown> | undefined;
          const value = (formData && formData[field.key] !== undefined)
            ? formData[field.key]
            : data[field.key];
          const isEmpty = value === undefined || value === null || value === '';

          return (
            <div
              key={field.key}
              className={`
                grid gap-x-4 gap-y-1 py-2 px-3 rounded-sm
                ${field.width === 'full' ? 'grid-cols-[180px_1fr]' : 'grid-cols-[180px_1fr]'}
                ${isEmpty ? 'opacity-60' : ''}
                hover:bg-accent/20 transition-colors
              `}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </span>
                {field.required && (
                  <span className="w-1 h-1 rounded-full bg-primary inline-block" title="Required field" />
                )}
              </div>

              {/* Value */}
              <div className="min-w-0">
                <FieldValue field={field} value={value} compact={compact} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: Any extra data not in schema ───────────────────────── */}
      {(() => {
        // Merge top-level data + formData for "extra fields" detection
        const formData = data.formData as Record<string, unknown> | undefined;
        const mergedData: Record<string, unknown> = { ...data };
        if (formData && typeof formData === 'object') {
          Object.entries(formData).forEach(([k, v]) => {
            if (!(k in mergedData)) mergedData[k] = v;
          });
        }
        const schemaKeys = new Set(schema.fields.map(f => f.key));
        const extraKeys = Object.keys(mergedData).filter(
          k => !METADATA_KEYS.has(k) && !schemaKeys.has(k) && k !== 'id' && k !== 'formData'
        ).filter(k => mergedData[k] !== undefined && mergedData[k] !== null && mergedData[k] !== '');
        if (extraKeys.length === 0) return null;
        return (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Additional Fields
            </h4>
            <div className="space-y-1">
              {extraKeys.map(key => (
                <div key={key} className="grid grid-cols-[180px_1fr] gap-x-4 px-3 py-1 hover:bg-accent/20 rounded-sm">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm text-foreground break-words">{String(mergedData[key])}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ============================================================================
// Meta Cell — Grid cell for the header metadata strip
// ============================================================================

const MetaCell: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <div className="px-4 py-2.5 bg-card">
    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className={`text-sm text-foreground mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>{value || '—'}</div>
  </div>
);

export default SchemaDrivenRecordView;