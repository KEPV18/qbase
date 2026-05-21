// ============================================================================
// QMS Forge — Form Schemas
// Each form defines its fields, types, validation, and sections.
// The DynamicFormRenderer reads these to build UI automatically.
// ============================================================================

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "textarea"
  | "checkbox"
  | "radio"
  | "table"      // repeating row table
  | "signature"  // name field representing a signature
  | "heading";   // section heading (not a data field)

export interface FieldSchema {
  key: string;           // unique field identifier
  label: string;         // display label
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];    // for select/multiselect/radio
  columns?: FieldSchema[]; // for table type — defines each column
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;   // regex
    message?: string;   // validation error message
  };
  width?: "full" | "half" | "third";  // layout width
}

export interface FormSchema {
  code: string;          // e.g. "F/08"
  name: string;          // e.g. "Order Form"
  section: number;        // 1-7
  sectionName: string;
  frequency: string;
  importance: "Critical" | "High" | "Medium" | "Low";
  description: string;   // what this form is for
  fields: FieldSchema[];
}

// ============================================================================
// ALL 35 FORMS
// ============================================================================

export const FORM_SCHEMAS: FormSchema[] = [
  // ── Section 01: Sales & Customer Service ──────────────────────────────
  {
    code: "F/08",
    name: "Order Form",
    section: 1,
    sectionName: "Sales & Customer Service",
    frequency: "On event",
    importance: "Critical",
    description: "Order Form / Order Confirmation — captures customer, products, delivery schedule, and order decision.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: false, width: "half" },
      { key: "client_name", label: "Customer", type: "text", required: true, width: "full" },
      { key: "mode_of_receipt", label: "Mode Of Receipt", type: "text", width: "full" },
      { key: "items", label: "Products", type: "textarea", width: "full" },
      { key: "test_certificate_required", label: "Test Certificate Required", type: "select", width: "half", options: ["Yes", "No"] },
      { key: "delivery_schedule", label: "Delivery Schedule", type: "text", width: "full" },
      { key: "complies", label: "Statutory & Regulatory", type: "select", width: "half", options: ["Complies", "Does Not Comply"] },
      { key: "order_status", label: "Order", type: "select", width: "half", options: ["Accepted", "Rejected"] },
      { key: "remarks", label: "Remarks", type: "textarea", width: "full" },
      { key: "reviewed_by", label: "Reviewed By", type: "text", width: "half" },
      { key: "bill_no", label: "Bill No.", type: "text", width: "half" },
      { key: "despatch_date", label: "Despatch Date", type: "text", width: "half" },
    ],
  },
  {
    code: "F/09",
    name: "Customer Complaint",
    section: 1,
    sectionName: "Sales & Customer Service",
    frequency: "On event",
    importance: "High",
    description: "Records customer complaints and tracks resolution.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "receipt_date", label: "Receipt Date", type: "text", width: "half" },
      { key: "receipt_time", label: "Receipt Time", type: "text", width: "half" },
      { key: "received_by", label: "Received By", type: "text", width: "full" },
      { key: "mode_of_receipt", label: "Mode of Receipt", type: "text", width: "full" },
      { key: "client_name", label: "Customer Name", type: "text", required: true, width: "full" },
      { key: "product_type", label: "Type Of Product", type: "text", width: "full" },
      { key: "description", label: "Description Of Complaints", type: "textarea", required: true, width: "full" },
      { key: "complaint_nature", label: "Nature Of Complaints", type: "select", required: true, options: ["SERIOUS", "MAJOR", "MINOR"], width: "full" },
      { key: "corrective_action", label: "Corrective Action Taken", type: "textarea", width: "full" },
      { key: "result_of_action", label: "Result Of Action Taken", type: "textarea", width: "full" },
      { key: "actions_proposed", label: "Actions Proposed For Future", type: "textarea", width: "full" },
      { key: "customer_informed_date", label: "Customer Informed Date", type: "text", width: "half" },
      { key: "analysed_by", label: "Analysed By", type: "text", width: "half" },
      { key: "closed_by", label: "Closed By", type: "text", width: "half" },
    ],
  },
  {
    code: "F/10",
    name: "Customer Feedback",
    section: 1,
    sectionName: "Sales & Customer Service",
    frequency: "On event",
    importance: "High",
    description: "Customer satisfaction survey and feedback record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "year", label: "Year", type: "text", width: "half" },
      { key: "client_name", label: "Name", type: "text", required: true, width: "full" },
      { key: "address", label: "Address", type: "text", width: "full" },
      { key: "rating_product_quality", label: "Product Quality", type: "select", options: ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"], width: "full" },
      { key: "rating_order_processing", label: "Order Processing", type: "select", options: ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"], width: "full" },
      { key: "rating_complaint_handling", label: "Complaint Handling", type: "select", options: ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"], width: "full" },
      { key: "rating_delivery", label: "Delivery", type: "select", options: ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"], width: "full" },
      { key: "rating_price", label: "Price", type: "select", options: ["Excellent", "Good", "Satisfactory", "Average", "Poor", "N/A"], width: "full" },
      { key: "project_name", label: "Project Name", type: "text", width: "half" },
      { key: "comment_text", label: "Customer Comment", type: "text", width: "full" },
      { key: "suggestions", label: "Suggestions for Improvement", type: "textarea", width: "full" },
      { key: "distributor_signature", label: "Distributor Signature", type: "text", width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "text", width: "half" },
      { key: "action_proposed", label: "Action Proposed for Future", type: "text", width: "full" },
      { key: "corrective_action_ref", label: "Corrective Action Reference", type: "text", width: "full" },
      { key: "remarks", label: "Remarks", type: "text", width: "full" },
    ],
  },
  {
    code: "F/50",
    name: "Customer Property Register",
    section: 1,
    sectionName: "Sales & Customer Service",
    frequency: "On event",
    importance: "Medium",
    description: "Tracks customer property received and returned.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "entries", label: "Property Entries", type: "table", columns: [
        { key: "received_date", label: "Received Date", type: "text" },
        { key: "name_of_property", label: "Name Of Property", type: "text" },
        { key: "purpose_for", label: "Purpose For", type: "text" },
        { key: "received_qty", label: "Received Qty.", type: "text" },
        { key: "name_of_customer", label: "Name of Customer", type: "text" },
        { key: "inward_inspection", label: "Inward Inspection", type: "text" },
        { key: "received_by", label: "Received By", type: "text" },
        { key: "outward_date", label: "Outward Date", type: "text" },
        { key: "outward_qty", label: "Outward Qty", type: "text" },
        { key: "balance_qty", label: "Balance Qty", type: "text" },
        { key: "damage_summary", label: "Damage / Rejection", type: "text" },
        { key: "outward_by", label: "Outward By", type: "text" },
      ], width: "full" },
    ],
  },

  // ── Section 02: Operations & Production ───────────────────────────────
  {
    code: "F/11",
    name: "Production Plan",
    section: 2,
    sectionName: "Operations & Production",
    frequency: "Monthly",
    importance: "Critical",
    description: "Monthly production plan covering all active projects.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "month", label: "Month", type: "select", required: true, options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], width: "third" },
      { key: "year", label: "Year", type: "number", required: true, width: "third" },
      { key: "date", label: "Date", type: "date", required: true, width: "third" },
      { key: "heading_projects", label: "Projects", type: "heading", width: "full" },
      { key: "projects", label: "Projects", type: "table", columns: [
        { key: "name", label: "Project Name", type: "text", required: true },
        { key: "client", label: "Client", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Active", "Completed", "On Hold"] },
        { key: "notes", label: "Notes", type: "text" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/19",
    name: "Product Description",
    section: 2,
    sectionName: "Operations & Production",
    frequency: "Per project",
    importance: "High",
    description: "Defines project scope, requirements, and specifications.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "project_name", label: "Project Name", type: "text", required: true, width: "half" },
      { key: "client_name", label: "Client Name", type: "text", required: true, width: "half" },
      { key: "description", label: "Product/Service Description", type: "textarea", required: true, width: "full" },
      { key: "specifications", label: "Specifications", type: "textarea", width: "full" },
      { key: "requirements", label: "Client Requirements", type: "textarea", width: "full" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 03: Quality & Audit ───────────────────────────────────────
  {
    code: "F/12",
    name: "Non-Conforming",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "On event",
    importance: "Critical",
    description: "Non-conformity report — tracks defects and corrective actions.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date Identified", type: "date", required: true, width: "half" },
      { key: "project_name", label: "Project", type: "text", width: "half" },
      { key: "nc_type", label: "NC Type", type: "select", required: true, options: ["Minor", "Major", "Critical"], width: "half" },
      { key: "description", label: "Non-Conformity Description", type: "textarea", required: true, width: "full" },
      { key: "root_cause", label: "Root Cause", type: "textarea", width: "full" },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", required: true, width: "full" },
      { key: "preventive_action", label: "Preventive Action", type: "textarea", width: "full" },
      { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"], width: "half" },
      { key: "closure_date", label: "Closure Date", type: "date", width: "half" },
      { key: "reported_by", label: "Reported By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/17",
    name: "QA Test Request",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "On event",
    importance: "High",
    description: "Request for quality assurance testing.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "project_name", label: "Project", type: "text", width: "half" },
      { key: "test_type", label: "Test Type", type: "select", options: ["Functional", "Performance", "Compliance", "Other"], width: "half" },
      { key: "description", label: "Test Description", type: "textarea", required: true, width: "full" },
      { key: "criteria", label: "Acceptance Criteria", type: "textarea", width: "full" },
      { key: "requested_by", label: "Requested By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/18",
    name: "Product Re-Call",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "On event",
    importance: "Critical",
    description: "Product recall record — tracks recalled items and resolution.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "product", label: "Product/Service", type: "text", required: true, width: "full" },
      { key: "reason", label: "Recall Reason", type: "textarea", required: true, width: "full" },
      { key: "affected_items", label: "Affected Items", type: "textarea", width: "full" },
      { key: "resolution", label: "Resolution", type: "textarea", width: "full" },
      { key: "authorized_by", label: "Authorized By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/22",
    name: "Corrective Action",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "On event",
    importance: "Critical",
    description: "Corrective action request — tracks CA from identification to closure.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date Initiated", type: "date", required: true, width: "half" },
      { key: "project_name", label: "Project", type: "text", width: "half" },
      { key: "source", label: "Source", type: "select", options: ["Internal Audit", "Customer Complaint", "NC Report", "Management Review", "Other"], width: "half" },
      { key: "problem_description", label: "Problem Description", type: "textarea", required: true, width: "full" },
      { key: "root_cause", label: "Root Cause Analysis", type: "textarea", required: true, width: "full" },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", required: true, width: "full" },
      { key: "responsible", label: "Responsible Person", type: "text", required: true, width: "half" },
      { key: "due_date", label: "Due Date", type: "date", width: "half" },
      { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed", "Verified"], width: "half" },
      { key: "verification", label: "Verification of Effectiveness", type: "textarea", width: "full" },
      { key: "initiated_by", label: "Initiated By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/25",
    name: "Audit Plan",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "Semi-annual",
    importance: "Critical",
    description: "Semi-annual audit scheduling and planning.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "period", label: "Audit Period", type: "select", required: true, options: ["H1", "H2"], width: "third" },
      { key: "year", label: "Year", type: "number", required: true, width: "third" },
      { key: "date", label: "Date", type: "date", required: true, width: "third" },
      { key: "scope", label: "Audit Scope", type: "textarea", required: true, width: "full" },
      { key: "audits", label: "Scheduled Audits", type: "table", columns: [
        { key: "department", label: "Department", type: "text", required: true },
        { key: "audit_date", label: "Planned Date", type: "date" },
        { key: "auditor", label: "Auditor", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Planned", "Completed", "Postponed"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/47",
    name: "Audit Checklist",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "On event",
    importance: "High",
    description: "Pre-audit checklist for auditor preparation.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "audit_ref", label: "Audit Reference", type: "text", width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "checklist_items", label: "Checklist Items", type: "table", columns: [
        { key: "clause", label: "ISO Clause", type: "text", required: true },
        { key: "requirement", label: "Requirement", type: "text", required: true },
        { key: "compliant", label: "Compliant?", type: "select", options: ["Yes", "No", "Partial", "N/A"] },
        { key: "evidence", label: "Evidence", type: "text" },
      ]},
      { key: "auditor", label: "Auditor", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/48",
    name: "Internal Audit Report",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "Monthly",
    importance: "Critical",
    description: "Monthly internal audit findings and results.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Audit Date", type: "date", required: true, width: "half" },
      { key: "month", label: "Month", type: "select", required: true, options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], width: "third" },
      { key: "year", label: "Year", type: "number", required: true, width: "third" },
      { key: "scope", label: "Audit Scope", type: "textarea", required: true, width: "full" },
      { key: "findings", label: "Findings", type: "textarea", required: true, width: "full" },
      { key: "nc_count", label: "Non-Conformities Found", type: "number", width: "half" },
      { key: "observations", label: "Observations", type: "textarea", width: "full" },
      { key: "recommendations", label: "Recommendations", type: "textarea", width: "full" },
      { key: "auditor", label: "Auditor", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 04: Procurement & Vendors ─────────────────────────────────
  {
    code: "F/13",
    name: "Purchase Order",
    section: 4,
    sectionName: "Procurement & Vendors",
    frequency: "On event",
    importance: "High",
    description: "Purchase order for materials or services.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "supplier", label: "Supplier", type: "text", required: true, width: "half" },
      { key: "items", label: "Items", type: "table", columns: [
        { key: "description", label: "Description", type: "text", required: true },
        { key: "quantity", label: "Quantity", type: "number", required: true },
        { key: "unit", label: "Unit", type: "text" },
        { key: "specifications", label: "Specifications", type: "text" },
      ]},
      { key: "requested_by", label: "Requested By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/14",
    name: "Incoming Inspection",
    section: 4,
    sectionName: "Procurement & Vendors",
    frequency: "On event",
    importance: "Medium",
    description: "Inspection record for received materials/services.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "po_ref", label: "PO Reference", type: "text", width: "half" },
      { key: "supplier", label: "Supplier", type: "text", required: true, width: "half" },
      { key: "items_inspected", label: "Items Inspected", type: "textarea", required: true, width: "full" },
      { key: "result", label: "Inspection Result", type: "select", options: ["Accepted", "Rejected", "Conditionally Accepted"], width: "half" },
      { key: "defects", label: "Defects Found", type: "textarea", width: "full" },
      { key: "inspector", label: "Inspector", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/15",
    name: "Approved Vendor List",
    section: 4,
    sectionName: "Procurement & Vendors",
    frequency: "Annual",
    importance: "High",
    description: "Annual list of qualified and approved vendors.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "year", label: "Year", type: "number", required: true, width: "half" },
      { key: "vendors", label: "Approved Vendors", type: "table", columns: [
        { key: "name", label: "Vendor Name", type: "text", required: true },
        { key: "service", label: "Service/Product", type: "text", required: true },
        { key: "rating", label: "Rating", type: "select", options: ["A", "B", "C"] },
        { key: "status", label: "Status", type: "select", options: ["Approved", "Pending", "Suspended"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/16",
    name: "Supplier Registration Form",
    section: 4,
    sectionName: "Procurement & Vendors",
    frequency: "Annual",
    importance: "High",
    description: "Vendor onboarding and qualification record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "supplier_name", label: "Supplier Name", type: "text", required: true, width: "half" },
      { key: "supplier_contact", label: "Contact Person", type: "text", width: "half" },
      { key: "service_type", label: "Service/Product Type", type: "text", required: true, width: "full" },
      { key: "qualifications", label: "Qualifications/Certifications", type: "textarea", width: "full" },
      { key: "evaluation_result", label: "Evaluation Result", type: "select", options: ["Approved", "Conditionally Approved", "Not Approved"], width: "half" },
      { key: "evaluated_by", label: "Evaluated By", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 05: HR & Training ─────────────────────────────────────────
  {
    code: "F/28",
    name: "Training Attendance",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per session",
    importance: "Critical",
    description: "Training session attendance record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Training Date", type: "date", required: true, width: "half" },
      { key: "course_name", label: "Course Name", type: "text", required: true, width: "half" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "project", label: "Project", type: "text", width: "half" },
      { key: "attendees", label: "Attendees", type: "table", columns: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "id", label: "Employee ID", type: "text" },
        { key: "department", label: "Department", type: "text" },
        { key: "attended", label: "Attended", type: "select", options: ["Yes", "No"] },
      ]},
      { key: "trainer_signature", label: "Trainer Signature", type: "signature", required: true, width: "half" },
      { key: "manager_signature", label: "Manager Signature", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/29",
    name: "Training Record",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per employee per course",
    importance: "Critical",
    description: "Individual training record per employee per course.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "course_name", label: "Course Name", type: "text", required: true, width: "half" },
      { key: "training_date", label: "Training Date", type: "date", required: true, width: "half" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "result", label: "Result", type: "select", options: ["Pass", "Fail", "Incomplete"], width: "half" },
      { key: "score", label: "Score (%)", type: "number", width: "half" },
      { key: "comments", label: "Comments", type: "textarea", width: "full" },
      { key: "recorded_by", label: "Recorded By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/30",
    name: "Performance Appraisal",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per person",
    importance: "High",
    description: "Employee performance appraisal record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "period", label: "Appraisal Period", type: "text", required: true, width: "full" },
      { key: "criteria", label: "Evaluation Criteria", type: "table", columns: [
        { key: "criterion", label: "Criterion", type: "text", required: true },
        { key: "score", label: "Score (%)", type: "number", required: true },
        { key: "comments", label: "Comments", type: "text" },
      ]},
      { key: "overall_score", label: "Overall Score (%)", type: "number", required: true, width: "half" },
      { key: "recommendations", label: "Recommendations", type: "textarea", width: "full" },
      { key: "evaluator", label: "Evaluator", type: "signature", required: true, width: "half" },
      { key: "employee_signature", label: "Employee Signature", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/40",
    name: "Competence Matrix",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Semi-annual",
    importance: "High",
    description: "Skills and competence tracking matrix for all employees.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "period", label: "Period", type: "text", required: true, width: "half" },
      { key: "matrix", label: "Competence Matrix", type: "table", columns: [
        { key: "name", label: "Employee Name", type: "text", required: true },
        { key: "role", label: "Role", type: "text" },
        { key: "skill", label: "Skill/Competence", type: "text", required: true },
        { key: "level", label: "Level", type: "select", options: ["Expert", "Proficient", "Basic", "Needs Training"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/41",
    name: "Gap Analysis",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "Medium",
    description: "Training gap analysis based on competence matrix.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "matrix_ref", label: "Competence Matrix Ref", type: "text", width: "half" },
      { key: "gaps", label: "Identified Gaps", type: "textarea", required: true, width: "full" },
      { key: "training_needed", label: "Training Needed", type: "textarea", required: true, width: "full" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/42",
    name: "Annual Training Plan",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Annual",
    importance: "High",
    description: "Annual training strategy and schedule.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "year", label: "Year", type: "number", required: true, width: "half" },
      { key: "objectives", label: "Training Objectives", type: "textarea", required: true, width: "full" },
      { key: "plan", label: "Training Plan", type: "table", columns: [
        { key: "course", label: "Course", type: "text", required: true },
        { key: "target", label: "Target Audience", type: "text" },
        { key: "quarter", label: "Quarter", type: "select", options: ["Q1", "Q2", "Q3", "Q4"] },
        { key: "method", label: "Method", type: "select", options: ["Internal", "External", "Online"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/43",
    name: "Induction Training Record",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per new hire",
    importance: "Critical",
    description: "Onboarding training record for new employees.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Training Date", type: "date", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Company ID", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "project", label: "Project", type: "text", required: true, width: "half" },
      { key: "qualification", label: "Qualification", type: "text", required: true, width: "half" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "issued_by", label: "Issued By", type: "text", required: true, width: "half" },
      { key: "performance", label: "Performance (%)", type: "number", width: "half" },
      { key: "topics_covered", label: "Topics Covered", type: "textarea", width: "full" },
      { key: "trainer_signature", label: "Trainer Signature", type: "signature", required: true, width: "half" },
      { key: "manager_signature", label: "Manager Signature", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/44",
    name: "Job Description",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per role",
    importance: "Medium",
    description: "Job description and responsibilities for each role.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "job_title", label: "Job Title", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "responsibilities", label: "Key Responsibilities", type: "textarea", required: true, width: "full" },
      { key: "qualifications_required", label: "Qualifications Required", type: "textarea", width: "full" },
      { key: "reporting_to", label: "Reports To", type: "text", width: "half" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 06: R&D & Design ──────────────────────────────────────────
  {
    code: "F/32",
    name: "R&D Request",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "On event",
    importance: "Medium",
    description: "Research and development request record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "title", label: "R&D Title", type: "text", required: true, width: "full" },
      { key: "objective", label: "Objective", type: "textarea", required: true, width: "full" },
      { key: "methodology", label: "Methodology", type: "textarea", width: "full" },
      { key: "expected_outcome", label: "Expected Outcome", type: "textarea", width: "full" },
      { key: "requested_by", label: "Requested By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/34",
    name: "Design Verification",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "After design phase",
    importance: "High",
    description: "Verification that design meets requirements.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "project", label: "Project", type: "text", required: true, width: "half" },
      { key: "design_ref", label: "Design Reference", type: "text", width: "half" },
      { key: "requirements_met", label: "Requirements Met", type: "select", options: ["Fully", "Partially", "Not Met"], width: "half" },
      { key: "findings", label: "Verification Findings", type: "textarea", required: true, width: "full" },
      { key: "verified_by", label: "Verified By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/35",
    name: "Design Monitoring",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "Monthly during dev",
    importance: "Medium",
    description: "Monthly design progress monitoring during development.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "month", label: "Month", type: "select", required: true, options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], width: "third" },
      { key: "year", label: "Year", type: "number", required: true, width: "third" },
      { key: "project", label: "Project", type: "text", required: true, width: "half" },
      { key: "progress", label: "Progress Summary", type: "textarea", required: true, width: "full" },
      { key: "issues", label: "Issues/Changes", type: "textarea", width: "full" },
      { key: "next_steps", label: "Next Steps", type: "textarea", width: "full" },
      { key: "monitored_by", label: "Monitored By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/37",
    name: "Experiment Data",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "During testing",
    importance: "Low",
    description: "Experiment/test data recording.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "experiment_title", label: "Experiment Title", type: "text", required: true, width: "full" },
      { key: "hypothesis", label: "Hypothesis", type: "textarea", width: "full" },
      { key: "method", label: "Method", type: "textarea", width: "full" },
      { key: "results", label: "Results", type: "textarea", width: "full" },
      { key: "conclusion", label: "Conclusion", type: "textarea", width: "full" },
      { key: "recorded_by", label: "Recorded By", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 07: Management & Documentation ────────────────────────────
  {
    code: "F/20",
    name: "Review Agenda",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "Before management review",
    importance: "High",
    description: "Management review meeting agenda.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Meeting Date", type: "date", required: true, width: "half" },
      { key: "location", label: "Location", type: "text", width: "half" },
      { key: "chairperson", label: "Chairperson", type: "text", required: true, width: "half" },
      { key: "agenda_items", label: "Agenda Items", type: "table", columns: [
        { key: "item", label: "Item", type: "text", required: true },
        { key: "presenter", label: "Presenter", type: "text" },
        { key: "duration", label: "Duration", type: "text" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/21",
    name: "Review Minutes",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "After management review",
    importance: "Critical",
    description: "Management review meeting minutes and decisions.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "meeting_date", label: "Meeting Date", type: "date", required: true, width: "half" },
      { key: "chairperson", label: "Chairperson", type: "text", required: true, width: "half" },
      { key: "attendees", label: "Attendees", type: "textarea", required: true, width: "full" },
      { key: "discussion", label: "Discussion Points", type: "textarea", required: true, width: "full" },
      { key: "decisions", label: "Decisions Made", type: "textarea", required: true, width: "full" },
      { key: "action_items", label: "Action Items", type: "table", columns: [
        { key: "action", label: "Action", type: "text", required: true },
        { key: "responsible", label: "Responsible", type: "text" },
        { key: "deadline", label: "Deadline", type: "date" },
        { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]},
      { key: "minutes_by", label: "Minutes By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/23",
    name: "Master List of Records",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "When record added",
    importance: "Critical",
    description: "Master index of all QMS records — audit trail.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date Updated", type: "date", required: true, width: "half" },
      { key: "records", label: "Record Entries", type: "table", columns: [
        { key: "form_code", label: "Form Code", type: "text", required: true },
        { key: "record_serial", label: "Record Serial", type: "text", required: true },
        { key: "description", label: "Description", type: "text" },
        { key: "date_created", label: "Date Created", type: "date" },
        { key: "storage", label: "Storage Location", type: "text" },
      ]},
      { key: "maintained_by", label: "Maintained By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/24",
    name: "Objectives & Targets",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "Quarterly",
    importance: "High",
    description: "Quality objectives and measurable targets.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "quarter", label: "Quarter", type: "select", required: true, options: ["Q1", "Q2", "Q3", "Q4"], width: "third" },
      { key: "year", label: "Year", type: "number", required: true, width: "third" },
      { key: "objectives", label: "Objectives", type: "table", columns: [
        { key: "objective", label: "Objective", type: "text", required: true },
        { key: "target", label: "Target", type: "text", required: true },
        { key: "actual", label: "Actual", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["On Track", "Behind", "Achieved", "Not Achieved"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/45",
    name: "Master List of Documents",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "When document created",
    importance: "Critical",
    description: "Master index of all QMS documents — document control.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date Updated", type: "date", required: true, width: "half" },
      { key: "documents", label: "Document Entries", type: "table", columns: [
        { key: "doc_id", label: "Document ID", type: "text", required: true },
        { key: "title", label: "Title", type: "text", required: true },
        { key: "version", label: "Version", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Active", "Obsolete", "Draft"] },
        { key: "date_created", label: "Date Created", type: "date" },
      ]},
      { key: "maintained_by", label: "Maintained By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/46",
    name: "Change Management",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "On event",
    importance: "Medium",
    description: "Change request and management record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "date", required: true, width: "half" },
      { key: "change_type", label: "Change Type", type: "select", required: true, options: ["Process", "Document", "System", "Organizational"], width: "half" },
      { key: "description", label: "Change Description", type: "textarea", required: true, width: "full" },
      { key: "reason", label: "Reason for Change", type: "textarea", required: true, width: "full" },
      { key: "impact", label: "Impact Assessment", type: "textarea", width: "full" },
      { key: "approved", label: "Approved", type: "checkbox", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", required: true, width: "half" },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function getFormSchema(code: string): FormSchema | undefined {
  return FORM_SCHEMAS.find(f => f.code === code);
}

export function getFormsBySection(section: number): FormSchema[] {
  return FORM_SCHEMAS.filter(f => f.section === section);
}

export function getFormSections(): { number: number; name: string; count: number }[] {
  const sections = new Map<number, string>();
  FORM_SCHEMAS.forEach(f => sections.set(f.section, f.sectionName));
  return Array.from(sections.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, name]) => ({ number: num, name, count: FORM_SCHEMAS.filter(f => f.section === num).length }));
}