// ============================================================================
// QMS Forge — File Export Service (CSV + JSON)
// Lightweight export helpers. Read-only — never modifies data.
// ============================================================================

import { saveAs } from 'file-saver';
import { getFormSchema } from '../data/formSchemas';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// JSON Export
// ============================================================================

export function exportRecordToJson(record: Record<string, unknown>): void {
  const serial = record.serial as string;
  const formCode = record.formCode as string;
  const filename = `${serial.replace('/', '-')}_${formCode}_${new Date().toISOString().substring(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  saveAs(blob, filename);
}

export function exportRecordsToJson(records: Record<string, unknown>[]): void {
  const timestamp = new Date().toISOString().substring(0, 10);
  const filename = `QMS_Forge_Export_${records.length}_records_${timestamp}.json`;
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  saveAs(blob, filename);
}

// ============================================================================
// CSV Export
// ============================================================================

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline — wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportRecordsToCsv(records: Record<string, unknown>[]): void {
  if (records.length === 0) throw new Error('No records to export');

  // Collect all unique keys across records (preserve order)
  const allKeys = new Set<string>();
  for (const record of records) {
    Object.keys(record).forEach(k => allKeys.add(k));
  }
  const headers = Array.from(allKeys);

  // Build CSV
  const rows: string[] = [headers.map(escapeCSV).join(',')];

  for (const record of records) {
    const row = headers.map(key => {
      const value = (record as Record<string, unknown>)[key];
      // Flatten objects/arrays to JSON string for CSV
      if (typeof value === 'object' && value !== null) {
        return escapeCSV(JSON.stringify(value));
      }
      return escapeCSV(value);
    });
    rows.push(row.join(','));
  }

  const timestamp = new Date().toISOString().substring(0, 10);
  const filename = `QMS_Forge_Export_${records.length}_records_${timestamp}.csv`;
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

// ============================================================================
// Single-record CSV (flattened key-value pairs)
// ============================================================================

export function exportRecordToCsv(record: Record<string, unknown>): void {
  const serial = (record.serial as string) || 'unknown';
  const formCode = (record.formCode as string) || 'unknown';
  const schema = getFormSchema(formCode);

  // Use schema field order if available, otherwise alphabetical
  const fieldKeys = schema
    ? schema.fields.filter(f => f.type !== 'heading').map(f => f.key)
    : Object.keys(record).sort();

  // Add metadata keys
  const metaKeys = ['_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy', '_editCount'];
  const allKeys = [...fieldKeys, ...metaKeys.filter(k => !fieldKeys.includes(k))];

  const rows: string[] = ['Field,Value'];

  for (const key of allKeys) {
    const value = (record as Record<string, unknown>)[key];
    if (typeof value === 'object' && value !== null) {
      rows.push(`${escapeCSV(key)},${escapeCSV(JSON.stringify(value))}`);
    } else {
      rows.push(`${escapeCSV(key)},${escapeCSV(value)}`);
    }
  }

  const filename = `${serial.replace('/', '-')}_${formCode}_${new Date().toISOString().substring(0, 10)}.csv`;
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}