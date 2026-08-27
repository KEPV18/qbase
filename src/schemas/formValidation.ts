// ============================================================================
// QBase — Zod Validation Schemas (Generated from Unified Schema Source)
// This file is GENERATED from src/schemas/unifiedSchema.ts
// DO NOT EDIT DIRECTLY — edit unifiedSchema.ts instead
// ============================================================================

import { FORM_ZOD_SCHEMAS, getZodSchema } from '@/schemas/unifiedSchema';
import { z } from 'zod';

// Re-export all shared validators for backward compatibility
export const DDMMYYYY = z.string()
  .regex(/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, 'Date must be DD/MM/YYYY');

export const ISO_DATE = z.string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Invalid date');

export const OPTIONAL_DATE = z.string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))?$/, 'Invalid date')
  .optional()
  .default('');

export const SERIAL_FORMAT = z.string()
  .regex(/^F\/\d{1,2}-\d{3,4}$/, 'Serial must be F/XX-NNN format');

export const AUTO_SERIAL = z.union([
  z.literal('auto'),
  SERIAL_FORMAT,
]).optional().default('auto');

export const REQUIRED_TEXT = z.string().min(1, 'This field is required');
export const OPTIONAL_TEXT = z.string().default('');
export const PERSON_NAME = z.string().min(1, 'Name is required').max(100);
export const DATE_OR_TEXT = z.string().default('');
export const YEAR = z.number().int().min(2020).max(2099);
export const PERCENTAGE = z.number().min(0).max(100);

export const MONTH = z.enum([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

export const QUARTER = z.enum(['Q1', 'Q2', 'Q3', 'Q4']);
export const SEMESTER = z.enum(['H1', 'H2']);
export const PROJECT_STATUS = z.enum(['Active', 'Completed', 'On Hold']);
export const NC_SEVERITY = z.enum(['Minor', 'Major', 'Critical']);
export const COMPLIANCE_LEVEL = z.enum(['Yes', 'No', 'Partial', 'N/A']);
export const INSPECTION_RESULT = z.enum(['Accepted', 'Rejected', 'Conditionally Accepted']);
export const VENDOR_RATING = z.enum(['A', 'B', 'C']);
export const VENDOR_STATUS = z.enum(['Approved', 'Pending', 'Suspended']);
export const TRAINING_RESULT = z.enum(['Pass', 'Fail', 'Incomplete']);
export const COMPETENCE_LEVEL = z.enum(['Expert', 'Proficient', 'Basic', 'Needs Training']);
export const CHANGE_TYPE = z.enum(['Process', 'Document', 'System', 'Organizational']);
export const NC_SOURCE = z.enum(['Internal Audit', 'Customer Complaint', 'NC Report', 'Management Review', 'Other']);
export const CA_STATUS = z.enum(['Open', 'In Progress', 'Closed', 'Verified']);
export const TEST_TYPE = z.enum(['Functional', 'Performance', 'Compliance', 'Other']);

export const SIGNATURE = z.string().min(1, 'Signature required');

// Re-export generated Zod schemas
export { FORM_ZOD_SCHEMAS, getZodSchema };

// ============================================================================
// validateFormData — backward compatibility wrapper
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: 'required' | 'format' | 'enum' | 'range' | 'type' | 'custom';
}

export function validateFormData(formCode: string, data: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  sanitizedData: Record<string, unknown> | null;
} {
  const schema = FORM_ZOD_SCHEMAS[formCode];
  if (!schema) {
    return {
      valid: false,
      errors: [{ field: 'formCode', message: `No Zod schema for ${formCode}`, code: 'custom' }],
      sanitizedData: null,
    };
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: ValidationError[] = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: 'custom',
    }));
    return { valid: false, errors, sanitizedData: null };
  }

  return { valid: true, errors: [], sanitizedData: result.data };
}

// Type exports for each form (for backward compatibility with existing imports)
export type F08Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/08']>;
export type F09Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/09']>;
export type F10Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/10']>;
export type F11Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/11']>;
export type F12Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/12']>;
export type F13Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/13']>;
export type F14Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/14']>;
export type F15Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/15']>;
export type F16Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/16']>;
export type F17Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/17']>;
export type F18Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/18']>;
export type F19Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/19']>;
export type F20Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/20']>;
export type F21Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/21']>;
export type F22Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/22']>;
export type F23Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/23']>;
export type F24Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/24']>;
export type F25Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/25']>;
export type F28Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/28']>;
export type F29Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/29']>;
export type F30Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/30']>;
export type F32Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/32']>;
export type F34Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/34']>;
export type F35Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/35']>;
export type F37Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/37']>;
export type F40Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/40']>;
export type F41Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/41']>;
export type F42Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/42']>;
export type F43Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/43']>;
export type F44Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/44']>;
export type F45Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/45']>;
export type F46Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/46']>;
export type F47Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/47']>;
export type F48Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/48']>;
export type F50Data = z.infer<typeof FORM_ZOD_SCHEMAS['F/50']>;