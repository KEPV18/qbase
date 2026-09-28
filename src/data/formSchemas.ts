// ============================================================================
// QBase — Form Schemas (Generated from Unified Schema Source)
// This file is GENERATED from src/schemas/unifiedSchema.ts
// DO NOT EDIT DIRECTLY — edit unifiedSchema.ts instead
// ============================================================================

import { FORM_SCHEMAS, getFormSchema, getFormSections, getFormsBySection, getAllFormCodes } from '@/schemas/unifiedSchema';

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "textarea"
  | "checkbox"
  | "radio"
  | "table"
  | "signature"
  | "heading";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  columns?: FieldSchema[];
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  width?: "full" | "half" | "third";
}

export interface FormSchema {
  code: string;
  name: string;
  section: number;
  sectionName: string;
  frequency: string;
  importance: "Critical" | "High" | "Medium" | "Low";
  description: string;
  fields: FieldSchema[];
  templateApprovedDate?: string;
  templateLastModified?: string | null;
  templateCreatedBy?: string;
  templateApprovedBy?: string;
}

// Re-export from unified source
export { FORM_SCHEMAS, getFormSchema, getFormSections, getFormsBySection, getAllFormCodes };