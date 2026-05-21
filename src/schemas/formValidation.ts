// ============================================================================
// QMS Forge — Zod Validation Schemas
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

/** Vendor evaluation */
export const VENDOR_EVAL = z.enum(['Approved', 'Conditionally Approved', 'Not Approved']);

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
  date: ISO_DATE,
  complainant_name: REQUIRED_TEXT,
  complainant_contact: OPTIONAL_TEXT,
  project_name: OPTIONAL_TEXT,
  complaint_type: COMPLAINT_TYPE,
  description: REQUIRED_TEXT,
  corrective_action: OPTIONAL_TEXT,
  resolved: z.boolean().default(false),
  resolution_date: OPTIONAL_DATE,
  handled_by: SIGNATURE,
});
export type F09Data = z.infer<typeof F09Schema>;

export const F10Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  client_name: REQUIRED_TEXT,
  project_name: REQUIRED_TEXT,
  product_quality: SATISFACTION_LEVEL,
  order_processing: SATISFACTION_LEVEL,
  complaint_handling: SATISFACTION_LEVEL,
  delivery: SATISFACTION_LEVEL,
  price: SATISFACTION_NA,
  comments: OPTIONAL_TEXT,
  reviewed_by: SIGNATURE,
});
export type F10Data = z.infer<typeof F10Schema>;

export const F50Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  client_name: REQUIRED_TEXT,
  property_description: REQUIRED_TEXT,
  quantity: z.number().min(0).default(0),
  condition_received: PROPERTY_CONDITION,
  date_returned: OPTIONAL_DATE,
  recorded_by: SIGNATURE,
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
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project_name: OPTIONAL_TEXT,
  test_type: TEST_TYPE,
  description: REQUIRED_TEXT,
  criteria: OPTIONAL_TEXT,
  requested_by: SIGNATURE,
});
export type F17Data = z.infer<typeof F17Schema>;

export const F18Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  product: REQUIRED_TEXT,
  reason: REQUIRED_TEXT,
  affected_items: OPTIONAL_TEXT,
  resolution: OPTIONAL_TEXT,
  authorized_by: SIGNATURE,
});
export type F18Data = z.infer<typeof F18Schema>;

export const F22Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project_name: OPTIONAL_TEXT,
  source: NC_SOURCE,
  problem_description: REQUIRED_TEXT,
  root_cause: REQUIRED_TEXT,
  corrective_action: REQUIRED_TEXT,
  responsible: REQUIRED_TEXT,
  due_date: OPTIONAL_DATE,
  status: CA_STATUS,
  verification: OPTIONAL_TEXT,
  initiated_by: SIGNATURE,
});
export type F22Data = z.infer<typeof F22Schema>;

export const F25Schema = z.object({
  serial: AUTO_SERIAL,
  period: SEMESTER,
  year: YEAR,
  date: ISO_DATE,
  scope: REQUIRED_TEXT,
  audits: z.array(z.object({
    department: REQUIRED_TEXT,
    audit_date: OPTIONAL_DATE,
    auditor: OPTIONAL_TEXT,
    status: AUDIT_PLAN_STATUS,
  })).min(1, 'At least one audit entry required'),
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
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
  date: ISO_DATE,
  supplier: REQUIRED_TEXT,
  items: z.array(z.object({
    description: REQUIRED_TEXT,
    quantity: z.number().min(0),
    unit: OPTIONAL_TEXT,
    specifications: OPTIONAL_TEXT,
  })).min(1, 'At least one item required'),
  requested_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F13Data = z.infer<typeof F13Schema>;

export const F14Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  po_ref: OPTIONAL_TEXT,
  supplier: REQUIRED_TEXT,
  items_inspected: REQUIRED_TEXT,
  result: INSPECTION_RESULT,
  defects: OPTIONAL_TEXT,
  inspector: SIGNATURE,
});
export type F14Data = z.infer<typeof F14Schema>;

export const F15Schema = z.object({
  serial: AUTO_SERIAL,
  year: YEAR,
  vendors: z.array(z.object({
    name: REQUIRED_TEXT,
    service: REQUIRED_TEXT,
    rating: VENDOR_RATING,
    status: VENDOR_STATUS,
  })).min(1, 'At least one vendor required'),
  prepared_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F15Data = z.infer<typeof F15Schema>;

export const F16Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  supplier_name: REQUIRED_TEXT,
  supplier_contact: OPTIONAL_TEXT,
  service_type: REQUIRED_TEXT,
  qualifications: OPTIONAL_TEXT,
  evaluation_result: VENDOR_EVAL,
  evaluated_by: SIGNATURE,
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
  title: REQUIRED_TEXT,
  objective: REQUIRED_TEXT,
  methodology: OPTIONAL_TEXT,
  expected_outcome: OPTIONAL_TEXT,
  requested_by: SIGNATURE,
  approved_by: SIGNATURE,
});
export type F32Data = z.infer<typeof F32Schema>;

export const F34Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  project: REQUIRED_TEXT,
  design_ref: OPTIONAL_TEXT,
  requirements_met: DESIGN_RESULT,
  findings: REQUIRED_TEXT,
  verified_by: SIGNATURE,
});
export type F34Data = z.infer<typeof F34Schema>;

export const F35Schema = z.object({
  serial: AUTO_SERIAL,
  month: MONTH,
  year: YEAR,
  project: REQUIRED_TEXT,
  progress: REQUIRED_TEXT,
  issues: OPTIONAL_TEXT,
  next_steps: OPTIONAL_TEXT,
  monitored_by: SIGNATURE,
});
export type F35Data = z.infer<typeof F35Schema>;

export const F37Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  experiment_title: REQUIRED_TEXT,
  hypothesis: OPTIONAL_TEXT,
  method: OPTIONAL_TEXT,
  results: OPTIONAL_TEXT,
  conclusion: OPTIONAL_TEXT,
  recorded_by: SIGNATURE,
});
export type F37Data = z.infer<typeof F37Schema>;

export const F20Schema = z.object({
  serial: AUTO_SERIAL,
  date: ISO_DATE,
  location: OPTIONAL_TEXT,
  chairperson: REQUIRED_TEXT,
  agenda_items: z.array(z.object({
    item: REQUIRED_TEXT,
    presenter: OPTIONAL_TEXT,
    duration: OPTIONAL_TEXT,
  })).min(1, 'At least one agenda item required'),
  prepared_by: SIGNATURE,
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
  records: z.array(z.object({
    form_code: REQUIRED_TEXT,
    record_serial: REQUIRED_TEXT,
    description: OPTIONAL_TEXT,
    date_created: OPTIONAL_DATE,
    storage: OPTIONAL_TEXT,
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

export const FORM_ZOD_SCHEMAS: Record<string, z.ZodObject<any>> = {
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
export function getZodSchema(code: string): z.ZodObject<any> | undefined {
  return FORM_ZOD_SCHEMAS[code];
}

/** Validate data against a form's schema. Returns { success, data } or { success: false, errors } */
export function validateFormData(code: string, data: unknown): 
  { success: true; data: any } | { success: false; errors: Record<string, string> } {
  const schema = FORM_ZOD_SCHEMAS[code];
  if (!schema) {
    return { success: false, errors: { _form: `Unknown form code: ${code}` } };
  }
  
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  const issues = result.error.issues || result.error.errors || [];
  issues.forEach((err: { path: (string | number)[]; message: string }) => {
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
  const issues = result.error.issues || result.error.errors || [];
  issues.forEach((err: { path: (string | number)[]; message: string }) => {
    const path = err.path.join('.');
    errors[path || '_gate'] = err.message;
  });
  return { success: false, errors };
}