// ============================================================================
// QBase — Form Schemas (Generated from Unified Schema Source)
// This file is GENERATED from src/schemas/unifiedSchema.ts
// DO NOT EDIT DIRECTLY — edit unifiedSchema.ts instead
// ============================================================================

import {
  FORM_SCHEMAS,
  getFormSchema,
  getFormSections,
  getFormsBySection,
  getAllFormCodes,
  type UnifiedField,
  type UnifiedFieldType,
} from '@/schemas/unifiedSchema';

// These were hand-written copies of the unified schema's shapes and had drifted
// from it — `FieldType` was missing the "array" variant that `UnifiedFieldType`
// carries, and `FieldSchema` was missing `zod`. getFormSchema() returns the
// unified shapes, so every consumer typed against the copies failed to compile.
// Deriving the types from the generator output makes the drift impossible.
export type FieldType = UnifiedFieldType;
export type FieldSchema = UnifiedField;
export type FormSchema = NonNullable<ReturnType<typeof getFormSchema>>;

// Re-export from unified source
export { FORM_SCHEMAS, getFormSchema, getFormSections, getFormsBySection, getAllFormCodes };