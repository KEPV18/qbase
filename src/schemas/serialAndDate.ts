// ============================================================================
// QMS Forge — Serial Number Generator & Date Utilities
// Serial format: F/XX-NNN (e.g. F/12-001, F/43-065)
// ============================================================================

import { google } from 'googleapis';
import { get_service } from '../google/oauth_bridge';

// ============================================================================
// Date Utilities
// ============================================================================

/** Convert HTML date input (YYYY-MM-DD) to storage format (DD/MM/YYYY) */
export function isoToDisplay(date: string): string {
  if (!date) return '';
  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;
  // ISO timestamp (YYYY-MM-DDTHH:MM:SSZ) — extract date part only
  const datePart = date.substring(0, 10);
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

/** Convert storage format (DD/MM/YYYY) to HTML date input (YYYY-MM-DD) */
export function displayToIso(date: string): string {
  if (!date) return '';
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
}

/** Get current date in DD/MM/YYYY format */
export function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Get current date in YYYY-MM-DD format */
export function todayISO(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${year}-${month}-${day}`;
}

// ============================================================================
// Serial Number Generator
// ============================================================================

/**
 * Generate the next serial number for a given form code.
 * Queries Google Sheets to find the highest existing serial.
 * Format: F/XX-NNN where XX is form number, NNN is zero-padded sequence.
 * 
 * @param formCode - e.g. "F/12"
 * @param existingSerials - array of existing serial strings for this form
 * @returns next serial string like "F/12-004"
 */
export function generateSerial(formCode: string, existingSerials: string[]): string {
  const formNum = formCode.replace('F/', '');
  
  // Find highest existing serial number
  let maxSerial = 0;
  existingSerials.forEach(serial => {
    // Match patterns like F/12-001, F/12-1, F/12-002
    const match = serial.match(new RegExp(`F\\/${formNum}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSerial) maxSerial = num;
    }
  });
  
  // Next serial
  const next = maxSerial + 1;
  
  // Pad to 3 digits (or more if needed)
  const padded = next < 1000 ? String(next).padStart(3, '0') : String(next);
  
  return `F/${formNum}-${padded}`;
}

/**
 * Get existing serials for a form from local cache or Sheets.
 * This is the data source for duplicate prevention.
 */
export const SERIAL_CACHE: Record<string, string[]> = {};

/**
 * Register existing serials into cache.
 * Called on app init after loading data from Sheets.
 */
export function registerSerials(formCode: string, serials: string[]): void {
  SERIAL_CACHE[formCode] = serials;
}

/**
 * Get next serial for a form code, checking cache first.
 * Prevents duplicate serials.
 */
export function getNextSerial(formCode: string): string {
  const existing = SERIAL_CACHE[formCode] || [];
  return generateSerial(formCode, existing);
}

/**
 * Validate that a serial doesn't already exist.
 */
export function isSerialUnique(formCode: string, serial: string): boolean {
  const existing = SERIAL_CACHE[formCode] || [];
  return !existing.includes(serial);
}

// ============================================================================
// Pre-Creation Gate
// ============================================================================

export interface PreCreationAnswers {
  needReason: string;
  businessEvent: string;
  frequencyConfirmed: boolean;
}

/**
 * Pre-Creation Gate — 3 mandatory questions before creating ANY record.
 * Born from the F/16-002 lesson: NEVER create a blank/unnecessary record.
 * 
 * Returns { pass: true } or { pass: false, reasons: string[] }
 */
export function checkPreCreationGate(
  formCode: string,
  frequency: string,
  answers: PreCreationAnswers
): { pass: boolean; reasons?: string[] } {
  const reasons: string[] = [];
  
  // Q1: Why is this record needed?
  if (!answers.needReason || answers.needReason.trim().length < 10) {
    reasons.push('Explain why this record is needed (minimum 10 characters)');
  }
  
  // Q2: What business event triggers this record?
  if (!answers.businessEvent || answers.businessEvent.trim().length < 5) {
    reasons.push('Specify the business event that triggers this record (minimum 5 characters)');
  }
  
  // Q3: Confirm this record is needed per its frequency schedule
  if (!answers.frequencyConfirmed) {
    reasons.push('Confirm this record is needed per its frequency schedule');
  }
  
  if (reasons.length > 0) {
    return { pass: false, reasons };
  }
  return { pass: true };
}

/**
 * Get the frequency description for a form code.
 */
export function getFrequencyWarning(formCode: string, frequency: string): string {
  const monthly = ['F/11', 'F/48', 'F/35'];
  const quarterly = ['F/24'];
  const semiAnnual = ['F/25', 'F/40'];
  const annual = ['F/15', 'F/16', 'F/42'];
  
  if (monthly.includes(formCode)) {
    return `⚠️ ${formCode} is a MONTHLY form. Only one record per month is expected. Are you sure you need a new one this month?`;
  }
  if (quarterly.includes(formCode)) {
    return `⚠️ ${formCode} is a QUARTERLY form. Only one record per quarter is expected. Are you sure you need a new one this quarter?`;
  }
  if (semiAnnual.includes(formCode)) {
    return `⚠️ ${formCode} is a SEMI-ANNUAL form. Only one record every 6 months is expected. Are you sure you need a new one?`;
  }
  if (annual.includes(formCode)) {
    return `⚠️ ${formCode} is an ANNUAL form. Only one record per year is expected. Are you sure you need a new one this year?`;
  }
  return `ℹ️ ${formCode} is created "${frequency}". A new record should be justified by a specific event.`;
}