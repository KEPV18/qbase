// ============================================================================
// QBase — Zod Validation Schemas
// Every form has a strict schema. Invalid data NEVER passes.
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Shared validators
// ============================================================================

/** DD/MM/YYYY date format — the ONLY accepted format */
export const DDMMYYYY = z.string()
  .regex(/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, 'Date must be DD/MM/YYYY');

/** YYYY-MM-DD for HTML date inputs — converted to DD/MM/YYYY before storage */
export const ISO_DATE = z.string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Invalid date');

/** Optional date — allows empty string or valid ISO date */
export const OPTIONAL_DATE = z.string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))?$/, 'Invalid date')
  .optional()
  .default('');

/** Serial number format: F/XX-NNN (e.g. F/12-001) */
export const SERIAL_FORMAT = z.string()
  .regex(/^F\/\d{1,2}-\d{3,4}$/, 'Serial must be F/XX-NNN format');

/** Auto-serial placeholder — accepts 'auto' (will be replaced) or F/XX-NNN format */
export const AUTO_SERIAL = z.union([
  z.literal('auto'),
  SERIAL_FORMAT,
]).optional().default('auto');

/** Non-empty string */
export const REQUIRED_TEXT = z.string().min(1, 'This field is required');

/** Optional string */
export const OPTIONAL_TEXT = z.string().default('');

/** Person name */
export const PERSON_NAME = z.string().min(1, 'Name is required').max(100);

/** Date or free text — accepts DD/MM/YYYY, ISO date, or any text string */
export const DATE_OR_TEXT = z.string().default('');

/** Year number */
export const YEAR = z.number().int().min(2020).max(2099);

/** Percentage 0-100 */
export const PERCENTAGE = z.number().min(0).max(100);

/** Month enum */
export const MONTH = z.enum([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

/** Quarter enum */
export const QUARTER = z.enum(['Q1', 'Q2', 'Q3', 'Q4']);

/** Semester enum */
export const SEMESTER = z.enum(['H1', 'H2']);

/** Project status */
export const PROJECT_STATUS = z.enum(['Active', 'Completed', 'On Hold']);

/** NC severity */
export const NC_SEVERITY = z.enum(['Minor', 'Major', 'Critical']);

/** Compliance level */
export const COMPLIANCE_LEVEL = z.enum(['Yes', 'No', 'Partial', 'N/A']);

/** Inspection result */
export const INSPECTION_RESULT = z.enum(['Accepted', 'Rejected', 'Conditionally Accepted']);

/** Vendor rating */
export const VENDOR_RATING = z.enum(['A', 'B', 'C']);

/** Vendor status */
export const VENDOR_STATUS = z.enum(['Approved', 'Pending', 'Suspended']);

/** Training result */
export const TRAINING_RESULT = z.enum(['Pass', 'Fail', 'Incomplete']);

/** Competence level */
export const COMPETENCE_LEVEL = z.enum(['Expert', 'Proficient', 'Basic', 'Needs Training']);

/** Change type */
export const CHANGE_TYPE = z.enum(['Process', 'Document', 'System', 'Organizational']);

/** NC source */
export const NC_SOURCE = z.enum(['Internal Audit', 'Customer Complaint', 'NC Report', 'Management Review', 'Other']);

/** CA status */
export const CA_STATUS = z.enum(['Open', 'In Progress', 'Closed', 'Verified']);

/** Test type */
export const TEST_TYPE = z.enum(['Functional', 'Performance', 'Compliance', 'Other']);

/** Compliance status */
export const COMPLIANCE_STATUS = z.enum(['On Track', 'Behind', 'Achieved', 'Not Achieved']);

/** Document status */
export const DOC_STATUS = z.enum(['Active', 'Obsolete', 'Draft']);

/** Training method */
export const TRAINING_METHOD = z.enum(['Internal', 'External', 'Online']);

/** Attendance */
export const ATTENDANCE = z.enum(['Yes', 'No']);

/** Complaint type */
export const COMPLAINT_TYPE = z.enum(['Service Quality', 'Delivery Delay', 'Product Defect', 'Communication', 'Other']);

/** Satisfaction level */
export const SATISFACTION_LEVEL = z.enum(['Excellent', 'Good', 'Satisfactory', 'Poor']);

/** Satisfaction with N/A */
export const SATISFACTION_NA = z.enum(['Excellent', 'Good', 'Satisfactory', 'Poor', 'N/A']);

/** Property condition */
export const PROPERTY_CONDITION = z.enum(['Good', 'Damaged', 'N/A']);

/** Design verification result */
export const DESIGN_RESULT = z.enum(['Fully', 'Partially', 'Not Met']);

/** Audit plan status */
export const AUDIT_PLAN_STATUS = z.enum(['Planned', 'Completed', 'Postponed']);

/** CA priority */
export const CA_PRIORITY = z.enum(['Minor', 'Major', 'Critical']);

/** Signature — just a name string */
export const SIGNATURE = z.string().min(1, 'Signature (name) is required');

// ============================================================================
// Pre-Creation Gate Schema
// ============================================================================

export const PreCreationGateSchema = z.object({
  needReason: z.string().min(10, 'Explain why this record is needed (min 10 chars)'),
  businessEvent: z.string().min(5, 'What business event triggers this record?'),
  frequencyCheck: z.literal('yes', { message: 'Confirm this record is needed per its frequency schedule' }),
});
export type PreCreationGateData = z.infer<typeof PreCreationGateSchema>;

// ============================================================================
// Individual Form Schemas — Every field validated, no free text where enums exist
// ============================================================================

export const F08Schema = z.object({
  serial: AUTO_SERIAL,
  date: DATE_OR_TEXT,          // Date — DD/MM/YYYY or free text
  client_name: REQUIRED_TEXT,  // Customer name
  mode_of_receipt: OPTIONAL_TEXT, // Email / Phone / Walk-in
  items: z.string().optional().default('[]'), // Product items as JSON string
  test_certificate_required: z.enum(['Yes', 'No']).optional().default('No'),
  delivery_schedule: DATE_OR_TEXT, // Date or free text
  complies: z.enum(['Complies', 'Does Not Comply']).optional().default('Complies'),
  order_status: z.enum(['Accepted', 'Rejected']).optional().default('Accepted'),
  remarks: OPTIONAL_TEXT,
  reviewed_by: OPTIONAL_TEXT,   // Authorised person
  bill_no: OPTIONAL_TEXT,      // Bill No — auto from serial
  despatch_date: DATE_OR_TEXT, // Despatch Date — DD/MM/YYYY or free text
});
export type F08Data = z.infer<typeof F08Schema>;

export const F09Schema = z.object({
  serial: AUTO_SERIAL,
  date: OPTIONAL_DATE,
  receipt_date: OPTIONAL_DATE,
  receipt_time: OPTIONAL_TEXT,
  received_by: OPTIONAL_TEXT,
  mode_of_receipt: OPTIONAL_TEXT,
  client_name: OPTIONAL_TEXT,
  product_type: OPTIONAL_TEXT,
  product_details: OPTIONAL_TEXT,
  description: OPTIONAL_TEXT,
  complaint_nature: OPTIONAL_TEXT,
  corrective_action: OPTIONAL_TEXT,
  result_of_action: OPTIONAL_TEXT,
  actions_proposed: OPTIONAL_TEXT,
  customer_informed_vide: OPTIONAL_TEXT,
  customer_informed_date: OPTIONAL_DATE,
  clientplatform_confirmation: OPTIONAL_TEXT,
  clientplatform_confirmation_date: OPTIONAL_DATE,
  analysed_by: OPTIONAL_TEXT,
  closed_by: OPTIONAL_TEXT,
});
export type F09Data = z.infer<typeof F09Schema>;

export const F10Schema = z.object({
  serial: AUTO_SERIAL,
  date: OPTIONAL_DATE,
  year: OPTIONAL_TEXT,
  client_name: OPTIONAL_TEXT,
  project_name: OPTIONAL_TEXT,
  address: OPTIONAL_TEXT,
  rating_product_quality: OPTIONAL_TEXT,
  rating_order_processing: OPTIONAL_TEXT,
  rating_complaint_handling: OPTIONAL_TEXT,
  rating_delivery: OPTIONAL_TEXT,
  rating_price: OPTIONAL_TEXT,
  comment_text: OPTIONAL_TEXT,
  suggestions: OPTIONAL_TEXT,
  distributor_signature: OPTIONAL_TEXT,
  reviewed_by: OPTIONAL_TEXT,
  action_proposed: OPTIONAL_TEXT,
  corrective_action_ref: OPTIONAL_TEXT,
  remarks: OPTIONAL_TEXT,
});
export type F10Data = z.infer<typeof F10Schema>;

export const F50Schema = z.object({
  serial: AUTO_SERIAL,
  entries: z.array(z.record(z.string(), z.string())).optional().default([]),
});
export type F50Data = z.infer<typeof F50Schema>;

export const F11Schema = z.object({
  serial: AUTO_SERIAL,
  month: MONTH,
  year: YEAR,
  date: ISO_DATE,
  projects: z.array(z.object({
    name: REQUIRED_TEXT,
    client: OPTIONAL_TEXT,
    status: PROJECT_STATUS,
    notes: OPTIONAL_TEXT,
  })).min(1, 'At least one project is required'),
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F11Data = z.infer<typeof F11Schema>;

export const F19Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project_name: REQUIRED_TEXT,
  client_name: REQUIRED_TEXT,
  description: REQUIRED_TEXT,
  specifications: OPTIONAL_TEXT,
  requirements: OPTIONAL_TEXT,
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F19Data = z.infer<typeof F19Schema>;

export const F12Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project_name: OPTIONAL_TEXT,
  nc_type: NC_SEVERITY,
  description: REQUIRED_TEXT,
  root_cause: OPTIONAL_TEXT,
  corrective_action: REQUIRED_TEXT,
  preventive_action: OPTIONAL_TEXT,
  status: CA_STATUS,
  closure_date: OPTIONAL_DATE,
  reported_by: SIGNATURE,
});
export type F12Data = z.infer<typeof F12Schema>;

export const F17Schema = z.object({
  request_no: REQUIRED_TEXT,
  date: DATE_OR_TEXT,
  from_department: REQUIRED_TEXT,
  to_department: REQUIRED_TEXT,
  sample_qty: REQUIRED_TEXT,
  product_name: REQUIRED_TEXT,
  stage_of_test: REQUIRED_TEXT,
  version_build_no: OPTIONAL_TEXT,
  qty_received: REQUIRED_TEXT,
  batch_no_lot_no: REQUIRED_TEXT,
  challan_no_date: OPTIONAL_TEXT,
  batch_size: REQUIRED_TEXT,
  test_results: z.array(z.object({
    test_required: REQUIRED_TEXT,
    results: REQUIRED_TEXT,
  })).min(1, 'At least one test result required'),
  status: REQUIRED_TEXT,
  requested_by: REQUIRED_TEXT,
  received_by: REQUIRED_TEXT,
  tested_by: REQUIRED_TEXT,
  approved_by: REQUIRED_TEXT,
});
export type F17Data = z.infer<typeof F17Schema>;

export const F18Schema = z.object({
  serial: AUTO_SERIAL,
  date: DATE_OR_TEXT,
  product_name: REQUIRED_TEXT,
  reference_inward_no: REQUIRED_TEXT,
  qty_taken: REQUIRED_TEXT,
  products_identified_by: REQUIRED_TEXT,
  released_by: REQUIRED_TEXT,
  requested_by: REQUIRED_TEXT,
  verified_by: REQUIRED_TEXT,
  verified_on: DATE_OR_TEXT,
  status: REQUIRED_TEXT,
  entry_closed_on: DATE_OR_TEXT,
  entry_closed_by: REQUIRED_TEXT,
});
export type F18Data = z.infer<typeof F18Schema>;

export const F22Schema = z.object({
  sr_no: AUTO_SERIAL,
  date: OPTIONAL_DATE,
  department: OPTIONAL_TEXT,
  non_conformity_source: z.object({
    raw_material_inspection: z.boolean().default(false),
    inprocess_inspection: z.boolean().default(false),
    manufacturing: z.boolean().default(false),
    final_inspection: z.boolean().default(false),
    customer_complaints: z.boolean().default(false),
    internal_quality_audit: z.boolean().default(false),
    others: z.boolean().default(false),
  }).default({}),
  description_of_non_conformity: REQUIRED_TEXT,
  root_cause_analysis: REQUIRED_TEXT,
  identified_date: ISO_DATE,
  identified_by: REQUIRED_TEXT,
  actions_recommended: z.union([z.string().min(1), z.array(z.string()).min(1)]),
  responsibility: REQUIRED_TEXT,
  actions_taken: z.union([z.string(), z.array(z.string())]).default(''),
  action_taken_date: OPTIONAL_DATE,
  action_taken_by: OPTIONAL_TEXT,
  document_change_summary: OPTIONAL_TEXT,
  planned_review_date: OPTIONAL_DATE,
  verification_status: OPTIONAL_TEXT,
  verified_date: OPTIONAL_DATE,
  verified_by: OPTIONAL_TEXT,
  verified_role: OPTIONAL_TEXT,
});
export type F22Data = z.infer<typeof F22Schema>;

export const F25Schema = z.object({
  audit_plan_no: REQUIRED_TEXT,
  date: ISO_DATE,
  from_role: REQUIRED_TEXT,
  to_role: REQUIRED_TEXT,
  last_audit_month: OPTIONAL_TEXT,
  last_audit_plan_no: OPTIONAL_TEXT,
  last_audit_plan_date: OPTIONAL_TEXT,
  next_audit_due_month: OPTIONAL_TEXT,
  next_audit_plan_no: OPTIONAL_TEXT,
  intro_corporate_note: REQUIRED_TEXT,
  audit_matrix: z.array(z.object({
    department: REQUIRED_TEXT,
    activity_scope: REQUIRED_TEXT,
    date_time: REQUIRED_TEXT,
    auditor: REQUIRED_TEXT,
  })).min(1, 'At least one audit matrix entry required'),
  status_of_actual_audit: REQUIRED_TEXT,
  remarks: OPTIONAL_TEXT,
  reviewed_and_approved_by: SIGNATURE,
});
export type F25Data = z.infer<typeof F25Schema>;

export const F47Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  audit_ref: OPTIONAL_TEXT,
  department: REQUIRED_TEXT,
  checklist_items: z.array(z.object({
    clause: REQUIRED_TEXT,
    requirement: REQUIRED_TEXT,
    compliant: COMPLIANCE_LEVEL,
    evidence: OPTIONAL_TEXT,
  })).min(1, 'At least one checklist item required'),
  auditor: SIGNATURE,
});
export type F47Data = z.infer<typeof F47Schema>;

export const F48Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  month: MONTH,
  year: YEAR,
  scope: REQUIRED_TEXT,
  findings: REQUIRED_TEXT,
  nc_count: z.number().min(0).default(0),
  observations: OPTIONAL_TEXT,
  recommendations: OPTIONAL_TEXT,
  auditor: SIGNATURE,
  reviewed_by: SIGNATURE,
});
export type F48Data = z.infer<typeof F48Schema>;

export const F13Schema = z.object({
  serial: AUTO_SERIAL,
  po_no: REQUIRED_TEXT,
  date: ISO_DATE,
  vendor_name: REQUIRED_TEXT,
  intro_statement: OPTIONAL_TEXT,
  items_table: z.array(z.object({
    sr_no: z.number().optional(),
    description: REQUIRED_TEXT,
    qty: z.number().optional(),
    rate: z.number().optional(),
    amount: z.number().optional(),
  })).min(1, 'At least one item required'),
  total_amount_rs: z.number().optional(),
  specifications: OPTIONAL_TEXT,
  as_per_clause: OPTIONAL_TEXT,
  supplies_notice: OPTIONAL_TEXT,
  logistics_grid: z.object({
    delivery_period: OPTIONAL_TEXT,
    payment_terms: OPTIONAL_TEXT,
    mode_of_despatch: OPTIONAL_TEXT,
    despatch_arrangement: OPTIONAL_TEXT,
    product_approval_method: OPTIONAL_TEXT,
    test_certificate_required: OPTIONAL_TEXT,
    insurance: OPTIONAL_TEXT,
    despatch_destination: OPTIONAL_TEXT,
  }).optional(),
  disclaimers: z.array(z.string()).optional(),
  prepared_by: REQUIRED_TEXT,
  reviewed_and_approved_by: REQUIRED_TEXT,
});
export type F13Data = z.infer<typeof F13Schema>;

export const F14Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  indent_no: OPTIONAL_TEXT,
  items: z.array(z.object({
    date: OPTIONAL_TEXT,
    itemDescription: REQUIRED_TEXT,
    qty: OPTIONAL_TEXT,
    supplier: REQUIRED_TEXT,
    inspectionStatus: OPTIONAL_TEXT,
    inspectedBy: OPTIONAL_TEXT,
  })).min(1, 'At least one item required'),
  disclaimer: OPTIONAL_TEXT,
  prepared_by: REQUIRED_TEXT,
  checked_by: REQUIRED_TEXT,
});
export type F14Data = z.infer<typeof F14Schema>;

export const F15Schema = z.object({
  serial: AUTO_SERIAL,
  year: YEAR,
  items: z.array(z.object({
    dateApproval: OPTIONAL_TEXT,
    supplierName: REQUIRED_TEXT,
    scopeOfSupply: REQUIRED_TEXT,
    approvalCriteria: OPTIONAL_TEXT,
    remarks: OPTIONAL_TEXT,
  })).min(1, 'At least one vendor required'),
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F15Data = z.infer<typeof F15Schema>;

export const F16Schema = z.object({
  serial: AUTO_SERIAL,
  name: REQUIRED_TEXT,
  address: REQUIRED_TEXT,
  tel_fax: OPTIONAL_TEXT,
  contact_person: REQUIRED_TEXT,
  mobile_no: OPTIONAL_TEXT,
  residence_no: OPTIONAL_TEXT,
  sister_concerns: OPTIONAL_TEXT,
  reference: OPTIONAL_TEXT,
  products_services: REQUIRED_TEXT,
  employee_strength: OPTIONAL_TEXT,
  sites_branches: OPTIONAL_TEXT,
  associated_yes: OPTIONAL_TEXT,
  associated_no: OPTIONAL_TEXT,
  association_years: OPTIONAL_TEXT,
  speciality: OPTIONAL_TEXT,
  objections_no: OPTIONAL_TEXT,
  objections_yes: OPTIONAL_TEXT,
  vendor_auth_name: REQUIRED_TEXT,
  vendor_auth_designation: OPTIONAL_TEXT,
  vendor_date: REQUIRED_TEXT,
  recommended: OPTIONAL_TEXT,
  not_recommended: OPTIONAL_TEXT,
  approval_reason: OPTIONAL_TEXT,
  past_experience: OPTIONAL_TEXT,
  authorised_by: REQUIRED_TEXT,
  authorised_date: REQUIRED_TEXT,
  status: REQUIRED_TEXT,
  registered_by: REQUIRED_TEXT,
});
export type F16Data = z.infer<typeof F16Schema>;

export const F28Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  course_name: REQUIRED_TEXT,
  trainer: REQUIRED_TEXT,
  project: OPTIONAL_TEXT,
  attendees: z.array(z.object({
    name: REQUIRED_TEXT,
    id: OPTIONAL_TEXT,
    department: OPTIONAL_TEXT,
    attended: ATTENDANCE,
  })).min(1, 'At least one attendee required'),
  trainer_signature: SIGNATURE,
  manager_signature: SIGNATURE,
});
export type F28Data = z.infer<typeof F28Schema>;

export const F29Schema = z.object({
  serial: AUTO_SERIAL,
  employee_name: REQUIRED_TEXT,
  employee_id: REQUIRED_TEXT,
  department: REQUIRED_TEXT,
  course_name: REQUIRED_TEXT,
  training_date: ISO_DATE,
  trainer: REQUIRED_TEXT,
  result: TRAINING_RESULT,
  score: PERCENTAGE.optional(),
  comments: OPTIONAL_TEXT,
  recorded_by: SIGNATURE,
});
export type F29Data = z.infer<typeof F29Schema>;

export const F30Schema = z.object({
  serial: AUTO_SERIAL,
  employee_name: REQUIRED_TEXT,
  employee_id: REQUIRED_TEXT,
  department: REQUIRED_TEXT,
  period: REQUIRED_TEXT,
  criteria: z.array(z.object({
    criterion: REQUIRED_TEXT,
    score: PERCENTAGE,
    comments: OPTIONAL_TEXT,
  })).min(1, 'At least one criterion required'),
  overall_score: PERCENTAGE,
  recommendations: OPTIONAL_TEXT,
  evaluator: SIGNATURE,
  employee_signature: SIGNATURE,
});
export type F30Data = z.infer<typeof F30Schema>;

export const F40Schema = z.object({
  serial: AUTO_SERIAL,
  period: REQUIRED_TEXT,
  matrix: z.array(z.object({
    name: REQUIRED_TEXT,
    role: OPTIONAL_TEXT,
    skill: REQUIRED_TEXT,
    level: COMPETENCE_LEVEL,
  })).min(1, 'At least one entry required'),
  prepared_by: SIGNATURE,
});
export type F40Data = z.infer<typeof F40Schema>;

export const F41Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  matrix_ref: OPTIONAL_TEXT,
  gaps: REQUIRED_TEXT,
  training_needed: REQUIRED_TEXT,
  prepared_by: SIGNATURE,
});
export type F41Data = z.infer<typeof F41Schema>;

export const F42Schema = z.object({
  serial: AUTO_SERIAL,
  year: YEAR,
  objectives: OPTIONAL_TEXT,
  plan: z.array(z.object({
    course: REQUIRED_TEXT,
    target: OPTIONAL_TEXT,
    quarter: QUARTER,
    method: TRAINING_METHOD,
  })).min(1, 'At least one course required'),
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F42Data = z.infer<typeof F42Schema>;

export const F43Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  employee_name: REQUIRED_TEXT,
  employee_id: REQUIRED_TEXT,
  department: REQUIRED_TEXT,
  project: REQUIRED_TEXT,
  qualification: REQUIRED_TEXT,
  trainer: REQUIRED_TEXT,
  issued_by: REQUIRED_TEXT,
  performance: PERCENTAGE.optional(),
  topics_covered: OPTIONAL_TEXT,
  trainer_signature: SIGNATURE,
  manager_signature: SIGNATURE,
});
export type F43Data = z.infer<typeof F43Schema>;

export const F44Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  job_title: REQUIRED_TEXT,
  department: REQUIRED_TEXT,
  responsibilities: REQUIRED_TEXT,
  qualifications_required: OPTIONAL_TEXT,
  reporting_to: OPTIONAL_TEXT,
  prepared_by: SIGNATURE,
});
export type F44Data = z.infer<typeof F44Schema>;

export const F32Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  from_department: REQUIRED_TEXT,
  to_department: REQUIRED_TEXT,
  request_type: REQUIRED_TEXT,
  customer_name: REQUIRED_TEXT,
  product_name: REQUIRED_TEXT,
  specification: REQUIRED_TEXT,
  product_code: OPTIONAL_TEXT,
  sample_enclosed: OPTIONAL_TEXT,
  manufacturer: OPTIONAL_TEXT,
  present_market: OPTIONAL_TEXT,
  reason_for_development: REQUIRED_TEXT,
  design_input_details: REQUIRED_TEXT,
  target_completion: REQUIRED_TEXT,
  remarks: OPTIONAL_TEXT,
  requested_by: SIGNATURE,
  feasibility: OPTIONAL_TEXT,
  rejection_reason: OPTIONAL_TEXT,
  project_no: OPTIONAL_TEXT,
  priority: OPTIONAL_TEXT,
  rd_target_completion: OPTIONAL_TEXT,
  assigned_to: OPTIONAL_TEXT,
  rd_remarks: OPTIONAL_TEXT,
  approved_by: SIGNATURE,
});
export type F32Data = z.infer<typeof F32Schema>;

export const F34Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project_number: REQUIRED_TEXT,
  product_name: REQUIRED_TEXT,
  verification_items: z.array(z.object({
    input: REQUIRED_TEXT,
    output: REQUIRED_TEXT,
  })).min(1, 'At least one verification item required'),
  remarks: OPTIONAL_TEXT,
  conclusion: REQUIRED_TEXT,
  checked_by: SIGNATURE,
  reviewed_and_approved_by: SIGNATURE,
});
export type F34Data = z.infer<typeof F34Schema>;

export const F35Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  month: MONTH,
  year: YEAR,
  items: z.array(z.object({
    product_name: REQUIRED_TEXT,
    specification: REQUIRED_TEXT,
    new_specification: REQUIRED_TEXT,
    customer: REQUIRED_TEXT,
    reason: REQUIRED_TEXT,
    dev_completion_date: REQUIRED_TEXT,
    actual_completion_date: REQUIRED_TEXT,
    rejection_reason: OPTIONAL_TEXT,
    action_taken: REQUIRED_TEXT,
    status: REQUIRED_TEXT,
    design_head_sign: REQUIRED_TEXT,
  })).min(1, 'At least one monitoring item required'),
});
export type F35Data = z.infer<typeof F35Schema>;

export const F37Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  product_name: REQUIRED_TEXT,
  experiment_no: REQUIRED_TEXT,
  incharge: REQUIRED_TEXT,
  objective: REQUIRED_TEXT,
  experiments: z.array(z.object({
    quantity: REQUIRED_TEXT,
    description: REQUIRED_TEXT,
    observation: REQUIRED_TEXT,
  })).min(1, 'At least one experiment required'),
  conclusion: REQUIRED_TEXT,
  done_by: SIGNATURE,
  reviewed_by: SIGNATURE,
});
export type F37Data = z.infer<typeof F37Schema>;

export const F20Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  time: REQUIRED_TEXT,
  place: REQUIRED_TEXT,
  chairperson: REQUIRED_TEXT,
  agenda: REQUIRED_TEXT,
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F20Data = z.infer<typeof F20Schema>;

export const F21Schema = z.object({
  serial: AUTO_SERIAL,
  meeting_date: ISO_DATE,
  chairperson: REQUIRED_TEXT,
  attendees: REQUIRED_TEXT,
  discussion: REQUIRED_TEXT,
  decisions: REQUIRED_TEXT,
  action_items: z.array(z.object({
    action: REQUIRED_TEXT,
    responsible: OPTIONAL_TEXT,
    deadline: OPTIONAL_DATE,
    status: CA_STATUS,
  })).min(1, 'At least one action item required'),
  minutes_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F21Data = z.infer<typeof F21Schema>;

export const F23Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  department: REQUIRED_TEXT,
  records: z.array(z.object({
    record_no: REQUIRED_TEXT,
    title: REQUIRED_TEXT,
    format_no: REQUIRED_TEXT,
    frequency: REQUIRED_TEXT,
    method_of_filing: REQUIRED_TEXT,
    access: REQUIRED_TEXT,
    storage_place: REQUIRED_TEXT,
    retention_period: REQUIRED_TEXT,
    person_responsible: REQUIRED_TEXT,
  })).min(1, 'At least one record entry required'),
  maintained_by: SIGNATURE,
});
export type F23Data = z.infer<typeof F23Schema>;

export const F24Schema = z.object({
  serial: AUTO_SERIAL,
  quarter: QUARTER,
  year: YEAR,
  objectives: z.array(z.object({
    objective: REQUIRED_TEXT,
    target: REQUIRED_TEXT,
    actual: OPTIONAL_TEXT,
    status: COMPLIANCE_STATUS,
  })).min(1, 'At least one objective required'),
  prepared_by: SIGNATURE,
  reviewed_by: SIGNATURE,
});
export type F24Data = z.infer<typeof F24Schema>;

export const F45Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  documents: z.array(z.object({
    doc_id: REQUIRED_TEXT,
    title: REQUIRED_TEXT,
    version: OPTIONAL_TEXT,
    status: DOC_STATUS,
    date_created: OPTIONAL_DATE,
  })).min(1, 'At least one document entry required'),
  maintained_by: SIGNATURE,
});
export type F45Data = z.infer<typeof F45Schema>;

export const F46Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  change_type: CHANGE_TYPE,
  description: REQUIRED_TEXT,
  reason: REQUIRED_TEXT,
  impact: OPTIONAL_TEXT,
  approved: z.boolean().default(false),
  approved_by: SIGNATURE,
});
export type F46Data = z.infer<typeof F46Schema>;

// ============================================================================
// Schema Registry — form code → Zod schema
// ============================================================================

export const FORM_ZOD_SCHEMAS: Record<string, z.ZodType> = {
  'F/08': F08Schema,
  'F/09': F09Schema,
  'F/10': F10Schema,
  'F/50': F50Schema,
  'F/11': F11Schema,
  'F/19': F19Schema,
  'F/12': F12Schema,
  'F/17': F17Schema,
  'F/18': F18Schema,
  'F/22': F22Schema,
  'F/25': F25Schema,
  'F/47': F47Schema,
  'F/48': F48Schema,
  'F/13': F13Schema,
  'F/14': F14Schema,
  'F/15': F15Schema,
  'F/16': F16Schema,
  'F/28': F28Schema,
  'F/29': F29Schema,
  'F/30': F30Schema,
  'F/40': F40Schema,
  'F/41': F41Schema,
  'F/42': F42Schema,
  'F/43': F43Schema,
  'F/44': F44Schema,
  'F/32': F32Schema,
  'F/34': F34Schema,
  'F/35': F35Schema,
  'F/37': F37Schema,
  'F/20': F20Schema,
  'F/21': F21Schema,
  'F/23': F23Schema,
  'F/24': F24Schema,
  'F/45': F45Schema,
  'F/46': F46Schema,
};

/** Get the Zod schema for a form code */
export function getZodSchema(code: string): z.ZodType | undefined {
  return FORM_ZOD_SCHEMAS[code];
}

/** Validate data against a form's schema. Returns { success, data } or { success: false, errors } */
export function validateFormData(code: string, data: unknown): 
  { success: true; data: Record<string, unknown> } | { success: false; errors: Record<string, string> } {
  const schema = FORM_ZOD_SCHEMAS[code];
  if (!schema) {
    return { success: false, errors: { _form: `Unknown form code: ${code}` } };
  }
  
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  
  const errors: Record<string, string> = {};
  const issues = result.error.issues;
  issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    errors[path || '_form'] = err.message;
  });
  return { success: false, errors };
}

/** Validate pre-creation gate */
export function validatePreCreationGate(data: unknown):
  { success: true; data: PreCreationGateData } | { success: false; errors: Record<string, string> } {
  const result = PreCreationGateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  const issues = result.error.issues;
  issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    errors[path || '_gate'] = err.message;
  });
  return { success: false, errors };
}