// ============================================================================
// QBase — Unified Schema Source of Truth
// Single definition → generates BOTH:
//   1. FormSchema (UI: formSchemas.ts) for DynamicFormRenderer
//   2. ZodSchema (Validation: formValidation.ts) for preWriteValidation
// CI job validates parity. No more schema drift.
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Primitive Validators (shared by both UI and Zod)
// ============================================================================

const DDMMYYYY_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const SERIAL_REGEX = /^F\/\d{1,2}-\d{3,4}$/;

// ============================================================================
// Core Field Definition — the ONLY place field metadata lives
// ============================================================================

export type UnifiedFieldType =
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
  | "heading"
  | "array"; // complex nested data (e.g., evaluation_matrix)

export interface UnifiedField {
  key: string;
  label: string;
  type: UnifiedFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];           // for select/multiselect/radio
  columns?: UnifiedField[];     // for table type
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  width?: "full" | "half" | "third";
  // Zod-specific overrides (optional)
  zod?: {
    custom?: z.ZodTypeAny;      // full custom Zod type
    optional?: boolean;         // override required
    nullable?: boolean;
    default?: unknown;
  };
}

export interface UnifiedFormSchema {
  code: string;
  name: string;
  section: number;
  sectionName: string;
  frequency: string;
  importance: "Critical" | "High" | "Medium" | "Low";
  description: string;
  fields: UnifiedField[];
  // Template metadata
  templateApprovedDate?: string;
  templateLastModified?: string | null;
  templateCreatedBy?: string;
  templateApprovedBy?: string;
}

// ============================================================================
// ALL 35 FORMS — Single Source of Truth
// ============================================================================

export const UNIFIED_SCHEMAS: UnifiedFormSchema[] = [
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
      { key: "complaint_details", label: "Complaint Details", type: "textarea", width: "full" },
      { key: "investigation", label: "Investigation", type: "textarea", width: "full" },
      { key: "root_cause", label: "Root Cause", type: "textarea", width: "full" },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", width: "full" },
      { key: "preventive_action", label: "Preventive Action", type: "textarea", width: "full" },
      { key: "status", label: "Status", type: "select", width: "half", options: ["Open", "In Progress", "Closed"] },
      { key: "closed_date", label: "Closed Date", type: "text", width: "half" },
      { key: "closed_by", label: "Closed By", type: "text", width: "half" },
    ],
  },
  {
    code: "F/10",
    name: "Customer Feedback",
    section: 1,
    sectionName: "Sales & Customer Service",
    frequency: "Monthly",
    importance: "Medium",
    description: "Monthly customer satisfaction survey results.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "month", label: "Month", type: "select", width: "half", options: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]},
      { key: "year", label: "Year", type: "text", width: "half" },
      { key: "client_name", label: "Customer Name", type: "text", required: true, width: "full" },
      { key: "survey_score", label: "Survey Score", type: "number", width: "half" },
      { key: "feedback_details", label: "Feedback Details", type: "textarea", width: "full" },
      { key: "action_taken", label: "Action Taken", type: "textarea", width: "full" },
      { key: "reviewed_by", label: "Reviewed By", type: "text", width: "half" },
    ],
  },

  // ── Section 02: Procurement & Vendors ─────────────────────────────────
  {
    code: "F/11",
    name: "Vendor Evaluation",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "Monthly",
    importance: "Critical",
    description: "Monthly vendor performance evaluation with items table.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "month", label: "Month", type: "text", required: true, width: "half" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "items", label: "Evaluation Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "vendor_name", label: "Vendor Name", type: "text", width: "full" },
        { key: "material_service", label: "Material/Service", type: "text", width: "full" },
        { key: "po_no", label: "PO No.", type: "text", width: "full" },
        { key: "qty_ordered", label: "Qty Ordered", type: "text", width: "full" },
        { key: "qty_received", label: "Qty Received", type: "text", width: "full" },
        { key: "rejection_qty", label: "Rejection Qty", type: "text", width: "full" },
        { key: "quality_rating", label: "Quality Rating", type: "select", width: "full", options: ["A", "B", "C"] },
        { key: "delivery_rating", label: "Delivery Rating", type: "select", width: "full", options: ["A", "B", "C"] },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "signature", label: "Signature", type: "signature", required: true, width: "half" },
      { key: "updated_based_on_progress", label: "Updated Based on Progress", type: "text", width: "full" },
    ],
  },
  {
    code: "F/12",
    name: "Purchase Requisition",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "On event",
    importance: "High",
    description: "Internal purchase requisition before PO creation.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "full" },
      { key: "requested_by", label: "Requested By", type: "signature", required: true, width: "half" },
      { key: "items", label: "Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "description", label: "Description", type: "text", width: "full" },
        { key: "quantity", label: "Quantity", type: "text", width: "full" },
        { key: "unit", label: "Unit", type: "text", width: "full" },
        { key: "estimated_rate", label: "Estimated Rate", type: "text", width: "full" },
        { key: "purpose", label: "Purpose", type: "text", width: "full" },
      ]},
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "remarks", label: "Remarks", type: "textarea", width: "full" },
    ],
  },
  {
    code: "F/13",
    name: "Purchase Order",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "On event",
    importance: "Critical",
    description: "Official Purchase Order sent to vendor.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "vendor_name", label: "Vendor Name", type: "text", required: true, width: "full" },
      { key: "vendor_address", label: "Vendor Address", type: "textarea", width: "full" },
      { key: "items", label: "Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "description", label: "Description", type: "text", width: "full" },
        { key: "qty", label: "Qty", type: "text", width: "full" },
        { key: "rate", label: "Rate", type: "text", width: "full" },
        { key: "amount", label: "Amount", type: "text", width: "full" },
      ]},
      { key: "total_amount", label: "Total Amount", type: "text", width: "half" },
      { key: "delivery_period", label: "Delivery Period", type: "text", width: "half" },
      { key: "payment_terms", label: "Payment Terms", type: "text", width: "half" },
      { key: "mode_of_despatch", label: "Mode of Despatch", type: "text", width: "half" },
      { key: "despatch_arrangement", label: "Despatch Arrangement", type: "text", width: "half" },
      { key: "method_of_product_approval", label: "Method of Product Approval", type: "text", width: "full" },
      { key: "test_certificate_required", label: "Test Certificate Required", type: "select", width: "half", options: ["Yes", "No"] },
      { key: "insurance", label: "Insurance", type: "text", width: "half" },
      { key: "despatch_destination", label: "Despatch Destination", type: "text", width: "full" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/14",
    name: "Goods Receipt Note",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "On event",
    importance: "High",
    description: "Records goods received against PO.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "po_no", label: "PO No.", type: "text", required: true, width: "half" },
      { key: "vendor_name", label: "Vendor Name", type: "text", required: true, width: "full" },
      { key: "items", label: "Received Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "description", label: "Description", type: "text", width: "full" },
        { key: "ordered_qty", label: "Ordered Qty", type: "text", width: "full" },
        { key: "received_qty", label: "Received Qty", type: "text", width: "full" },
        { key: "accepted_qty", label: "Accepted Qty", type: "text", width: "full" },
        { key: "rejected_qty", label: "Rejected Qty", type: "text", width: "full" },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "received_by", label: "Received By", type: "signature", required: true, width: "half" },
      { key: "inspected_by", label: "Inspected By", type: "signature", width: "half" },
      { key: "remarks", label: "Remarks", type: "textarea", width: "full" },
    ],
  },
  {
    code: "F/15",
    name: "Vendor Registration",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "Annual",
    importance: "High",
    description: "Vendor registration and approval form with 29 fields.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "name", label: "Vendor Name", type: "text", required: true, width: "full" },
      { key: "address", label: "Address", type: "textarea", width: "full" },
      { key: "city", label: "City", type: "text", width: "half" },
      { key: "state", label: "State", type: "text", width: "half" },
      { key: "pin", label: "PIN", type: "text", width: "half" },
      { key: "tel_fax", label: "Tel/Fax", type: "text", width: "half" },
      { key: "contact_person", label: "Contact Person", type: "text", width: "full" },
      { key: "designation", label: "Designation", type: "text", width: "half" },
      { key: "email", label: "Email", type: "text", width: "full" },
      { key: "mobile", label: "Mobile", type: "text", width: "half" },
      { key: "year_of_establishment", label: "Year of Establishment", type: "text", width: "half" },
      { key: "nature_of_business_concern", label: "Nature of Business", type: "text", width: "full" },
      { key: "type_of_organization", label: "Type of Organization", type: "text", width: "full" },
      { key: "sister_concerns", label: "Sister Concerns", type: "text", width: "full" },
      { key: "employee_strength", label: "Employee Strength", type: "text", width: "half" },
      { key: "annual_turnover", label: "Annual Turnover", type: "text", width: "half" },
      { key: "export_import_code", label: "Export Import Code", type: "text", width: "half" },
      { key: "gst_no", label: "GST No.", type: "text", width: "half" },
      { key: "pan_no", label: "PAN No.", type: "text", width: "half" },
      { key: "product_service_speciality", label: "Product/Service Speciality", type: "textarea", width: "full" },
      { key: "major_clients", label: "Major Clients", type: "textarea", width: "full" },
      { key: "quality_certifications", label: "Quality Certifications", type: "textarea", width: "full" },
      { key: "infrastructure_details", label: "Infrastructure Details", type: "textarea", width: "full" },
      { key: "audit_objections", label: "Audit Objections", type: "textarea", width: "full" },
      { key: "recommendation_reasons", label: "Recommendation Reasons", type: "textarea", width: "full" },
      { key: "recommended_by", label: "Recommended By", type: "signature", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "registration_validity", label: "Registration Validity", type: "text", width: "half" },
    ],
  },
  {
    code: "F/16",
    name: "Vendor Re-evaluation",
    section: 2,
    sectionName: "Procurement & Vendors",
    frequency: "Annual",
    importance: "High",
    description: "Annual re-evaluation of approved vendors.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "vendor_name", label: "Vendor Name", type: "text", required: true, width: "full" },
      { key: "vendor_code", label: "Vendor Code", type: "text", width: "half" },
      { key: "items", label: "Evaluation Criteria", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "criteria", label: "Criteria", type: "text", width: "full" },
        { key: "weightage", label: "Weightage", type: "text", width: "full" },
        { key: "score", label: "Score", type: "text", width: "full" },
        { key: "weighted_score", label: "Weighted Score", type: "text", width: "full" },
      ]},
      { key: "total_score", label: "Total Score", type: "text", width: "half" },
      { key: "rating", label: "Rating", type: "select", width: "half", options: ["A", "B", "C"] },
      { key: "recommended_by", label: "Recommended By", type: "signature", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "remarks", label: "Remarks", type: "textarea", width: "full" },
    ],
  },

  // ── Section 03: Production & Operations ───────────────────────────────
  {
    code: "F/17",
    name: "Production Order",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "On event",
    importance: "High",
    description: "Production order with BOM and routing.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "product_name", label: "Product Name", type: "text", required: true, width: "full" },
      { key: "quantity", label: "Quantity", type: "text", required: true, width: "half" },
      { key: "target_date", label: "Target Date", type: "text", width: "half" },
      { key: "bom", label: "Bill of Materials", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "material", label: "Material", type: "text", width: "full" },
        { key: "specification", label: "Specification", type: "text", width: "full" },
        { key: "qty_required", label: "Qty Required", type: "text", width: "full" },
        { key: "qty_issued", label: "Qty Issued", type: "text", width: "full" },
        { key: "balance", label: "Balance", type: "text", width: "full" },
      ]},
      { key: "routing", label: "Routing", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "operation", label: "Operation", type: "text", width: "full" },
        { key: "machine", label: "Machine", type: "text", width: "full" },
        { key: "time_estimate", label: "Time Estimate", type: "text", width: "full" },
        { key: "operator", label: "Operator", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/18",
    name: "Daily Production Report",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "Daily",
    importance: "Medium",
    description: "Daily production output tracking.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "shift", label: "Shift", type: "select", width: "half", options: ["A", "B", "C"] },
      { key: "items", label: "Production Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "product", label: "Product", type: "text", width: "full" },
        { key: "target", label: "Target", type: "text", width: "full" },
        { key: "actual", label: "Actual", type: "text", width: "full" },
        { key: "variance", label: "Variance", type: "text", width: "full" },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/19",
    name: "Product Description",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "Per project",
    importance: "Critical",
    description: "Product specification and description for each project.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "project_code", label: "Project Code", type: "text", required: true, width: "half" },
      { key: "product_name", label: "Product Name", type: "text", required: true, width: "full" },
      { key: "specification", label: "Specification", type: "textarea", width: "full" },
      { key: "material", label: "Material", type: "text", width: "full" },
      { key: "dimensions", label: "Dimensions", type: "text", width: "full" },
      { key: "weight", label: "Weight", type: "text", width: "half" },
      { key: "color", label: "Color", type: "text", width: "half" },
      { key: "packaging", label: "Packaging", type: "text", width: "full" },
      { key: "testing_requirements", label: "Testing Requirements", type: "textarea", width: "full" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
    ],
  },
  {
    code: "F/20",
    name: "Review Agenda",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "Before meeting",
    importance: "High",
    description: "Management review meeting agenda with structured agenda items.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "time", label: "Time", type: "text", width: "half" },
      { key: "place", label: "Place", type: "text", width: "half" },
      { key: "agenda", label: "Agenda", type: "textarea", required: true, width: "full" },
      { key: "minutes", label: "Minutes", type: "textarea", width: "full" },
      { key: "action_items", label: "Action Items", type: "textarea", width: "full" },
      { key: "chairperson", label: "Chairperson", type: "text", width: "half" },
      { key: "prepared_by", label: "Prepared By", type: "signature", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "record_month", label: "Record Month", type: "text", width: "half" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "half" },
      { key: "coverage_period", label: "Coverage Period", type: "text", width: "half" },
    ],
  },
  {
    code: "F/21",
    name: "Review Minutes",
    section: 7,
    sectionName: "Management & Documentation",
    frequency: "After meeting",
    importance: "High",
    description: "Management review meeting minutes with discussion points and decisions.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "meeting_date", label: "Meeting Date", type: "text", required: true, width: "half" },
      { key: "meeting_time", label: "Time", type: "text", width: "half" },
      { key: "meeting_place", label: "Place", type: "text", width: "half" },
      { key: "attendees", label: "Attendees", type: "text", width: "full" },
      { key: "discussion_points", label: "Discussion Points", type: "textarea", required: true, width: "full" },
      { key: "minutes_circulated_with", label: "Minutes Circulated With", type: "text", width: "full" },
      { key: "prepared_by", label: "Prepared By", type: "signature", width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
      { key: "record_month", label: "Record Month", type: "text", width: "half" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "half" },
      { key: "coverage_period", label: "Coverage Period", type: "text", width: "half" },
    ],
  },
  {
    code: "F/22",
    name: "Non-Conformity Report",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "On event",
    importance: "Critical",
    description: "Non-conformity reporting and tracking.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "nc_type", label: "NC Type", type: "select", required: true, width: "half", options: ["Minor", "Major", "Critical"] },
      { key: "source", label: "Source", type: "select", required: true, width: "half", options: ["Internal Audit", "Customer Complaint", "NC Report", "Management Review", "Other"] },
      { key: "description", label: "Description", type: "textarea", required: true, width: "full" },
      { key: "root_cause", label: "Root Cause", type: "textarea", width: "full" },
      { key: "immediate_action", label: "Immediate Action", type: "textarea", width: "full" },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", width: "full" },
      { key: "preventive_action", label: "Preventive Action", type: "textarea", width: "full" },
      { key: "responsible_person", label: "Responsible Person", type: "text", required: true, width: "half" },
      { key: "target_date", label: "Target Date", type: "text", required: true, width: "half" },
      { key: "closure_date", label: "Closure Date", type: "text", width: "half" },
      { key: "verified_by", label: "Verified By", type: "signature", width: "half" },
      { key: "status", label: "Status", type: "select", width: "half", options: ["Open", "In Progress", "Closed", "Verified"] },
      { key: "non_conformity_source", label: "NC Source Details", type: "object", width: "full", zod: {
        custom: z.object({
          source: z.string().optional(),
          internal_audit: z.boolean().optional(),
          customer_complaint: z.boolean().optional(),
          nc_report: z.boolean().optional(),
          management_review: z.boolean().optional(),
          other: z.string().optional(),
        }).default({}),
      }},
    ],
  },
  {
    code: "F/23",
    name: "Corrective Action",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "On event",
    importance: "Critical",
    description: "Corrective action tracking linked to NC.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "nc_ref", label: "NC Reference", type: "text", required: true, width: "half" },
      { key: "root_cause", label: "Root Cause", type: "textarea", required: true, width: "full" },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", required: true, width: "full" },
      { key: "responsible_person", label: "Responsible Person", type: "text", required: true, width: "half" },
      { key: "target_date", label: "Target Date", type: "text", required: true, width: "half" },
      { key: "completion_date", label: "Completion Date", type: "text", width: "half" },
      { key: "effectiveness_check", label: "Effectiveness Check", type: "textarea", width: "full" },
      { key: "verified_by", label: "Verified By", type: "signature", width: "half" },
      { key: "status", label: "Status", type: "select", width: "half", options: ["Open", "In Progress", "Closed", "Verified"] },
    ],
  },
  {
    code: "F/24",
    name: "Internal Audit Schedule",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "Quarterly",
    importance: "High",
    description: "Quarterly internal audit plan.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "quarter", label: "Quarter", type: "select", required: true, width: "half", options: ["Q1", "Q2", "Q3", "Q4"] },
      { key: "year", label: "Year", type: "text", required: true, width: "half" },
      { key: "items", label: "Audit Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "department", label: "Department", type: "text", width: "full" },
        { key: "process_area", label: "Process Area", type: "text", width: "full" },
        { key: "auditor", label: "Auditor", type: "text", width: "full" },
        { key: "planned_date", label: "Planned Date", type: "text", width: "full" },
        { key: "actual_date", label: "Actual Date", type: "text", width: "full" },
        { key: "status", label: "Status", type: "select", width: "full", options: ["Planned", "In Progress", "Completed", "Cancelled"] },
        { key: "findings", label: "Findings", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/25",
    name: "Management Review",
    section: 3,
    sectionName: "Production & Operations",
    frequency: "Semi-annual",
    importance: "Critical",
    description: "Semi-annual management review minutes.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "period", label: "Review Period", type: "text", required: true, width: "full" },
      { key: "attendees", label: "Attendees", type: "textarea", width: "full" },
      { key: "agenda", label: "Agenda", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "topic", label: "Topic", type: "text", width: "full" },
        { key: "discussion", label: "Discussion", type: "text", width: "full" },
        { key: "decision", label: "Decision", type: "text", width: "full" },
        { key: "action_required", label: "Action Required", type: "text", width: "full" },
        { key: "responsible", label: "Responsible", type: "text", width: "full" },
        { key: "target_date", label: "Target Date", type: "text", width: "full" },
        { key: "status", label: "Status", type: "select", width: "full", options: ["Open", "In Progress", "Closed"] },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },

  // ── Section 04: Quality & Audit ───────────────────────────────────────
  {
    code: "F/28",
    name: "Training Attendance",
    section: 5,
    sectionName: "HR & Training",
    frequency: "During training",
    importance: "High",
    description: "Training attendance sheet with participant sign-in.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "topic", label: "Training Topic", type: "text", required: true, width: "full" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", width: "half" },
      { key: "course_name", label: "Course Name", type: "text", width: "full" },
      { key: "designation", label: "Designation", type: "text", width: "half" },
      { key: "conducted_by", label: "Conducted By", type: "text", width: "half" },
      { key: "training_date", label: "Date of Training", type: "text", width: "half" },
      { key: "attendees", label: "Attendees", type: "table", required: true, width: "full", columns: [
        { key: "sl_no", label: "Sl No", type: "text", width: "full" },
        { key: "name", label: "Name Of The Participant", type: "text", width: "full" },
        { key: "department", label: "Department", type: "text", width: "full" },
        { key: "id_no", label: "ID NO.", type: "text", width: "full" },
        { key: "date", label: "Training Date", type: "text", width: "full" },
        { key: "signature", label: "Signature", type: "text", width: "full" },
        { key: "result", label: "Result", type: "text", width: "full" },
      ]},
      { key: "trainer_signature", label: "Trainer's Signature", type: "signature", width: "half" },
      { key: "hr_signature", label: "HR Signature", type: "signature", width: "half" },
      { key: "manager_signature", label: "Manager Signature", type: "signature", width: "half" },
      { key: "record_month", label: "Record Month", type: "text", width: "half" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "half" },
      { key: "coverage_period", label: "Coverage Period", type: "text", width: "half" },
    ],
  },
  {
    code: "F/29",
    name: "Training Record",
    section: 5,
    sectionName: "HR & Training",
    frequency: "After course",
    importance: "High",
    description: "Employee training & competence record with 15-topic matrix.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", width: "half" },
      { key: "course_name", label: "Course Name", type: "text", width: "full" },
      { key: "employee_name", label: "Employee Name", type: "text", width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", width: "half" },
      { key: "assessed_by", label: "Assessed By", type: "text", width: "half" },
      { key: "assessed_on", label: "Assessed On", type: "text", width: "half" },
      { key: "training_date", label: "Training Date", type: "text", width: "half" },
      { key: "training_type", label: "Training Type", type: "text", width: "half" },
      { key: "training_status", label: "Training Status", type: "text", width: "half" },
      { key: "items", label: "Competence Matrix", type: "table", required: true, width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "name", label: "Name", type: "text", width: "full" },
        { key: "designation", label: "Designation", type: "text", width: "full" },
        { key: "qualReq", label: "Qualification Required", type: "text", width: "full" },
        { key: "qualAvail", label: "Qualification Available", type: "text", width: "full" },
        { key: "expReq", label: "Experience Required", type: "text", width: "full" },
        { key: "expAvail", label: "Experience Available", type: "text", width: "full" },
        { key: "skillAvail", label: "Skill Available", type: "text", width: "full" },
      ]},
      { key: "result", label: "Result", type: "object", width: "full", zod: {
        custom: z.object({
          training_identified: z.string().optional(),
          training_given: z.string().optional(),
          training_effective: z.string().optional(),
          training_not_required: z.string().optional(),
        }).default({}),
      }},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "recorded_by", label: "Recorded By", type: "signature", width: "half" },
      { key: "authorised_by", label: "Authorised By", type: "signature", width: "half" },
      { key: "record_month", label: "Record Month", type: "text", width: "half" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "half" },
      { key: "coverage_period", label: "Coverage Period", type: "text", width: "half" },
    ],
  },

  // ── Section 05: HR & Training ─────────────────────────────────────────
  {
    code: "F/30",
    name: "Performance Appraisal",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Per person",
    importance: "High",
    description: "Employee performance appraisal record with 5-point evaluation matrix.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "designation", label: "Designation", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "working_in_organisation", label: "Working In Organisation", type: "text", required: true, width: "half" },
      { key: "last_year_increment", label: "Last Year Increment", type: "text", width: "half" },
      { key: "evaluation_done_by", label: "Evaluation Done By", type: "text", required: true, width: "half" },
      { key: "evaluation_matrix", label: "Evaluation Matrix", type: "array", required: true, zod: {
        custom: z.array(z.object({
          id: z.string(),
          category: z.string(),
          score: z.number().min(1).max(5),
        })).min(20, '20 evaluation items required'),
      }},
      { key: "total_marking", label: "Total Marking", type: "text", required: true, width: "half" },
      { key: "further_training_need", label: "Further Training Need", type: "text", width: "full" },
      { key: "promotion", label: "Promotion", type: "text", width: "half" },
      { key: "increment", label: "Increment", type: "text", width: "half" },
      { key: "suggestions_for_improvement", label: "Suggestions For Improvement", type: "textarea", width: "full" },
      { key: "evaluated_by", label: "Evaluated By", type: "signature", required: true, width: "half" },
      { key: "responsibility_shared", label: "Responsibility Shared", type: "text", width: "full" },
      { key: "authorities_issued", label: "Authorities Issued", type: "text", width: "full" },
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
      { key: "project_scope", label: "Project Scope", type: "text", width: "full" },
      { key: "items", label: "Competence Matrix Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "designation", label: "Designation", type: "text", width: "full" },
        { key: "qualReq", label: "Qual. Required", type: "text", width: "full" },
        { key: "qualAvail", label: "Qual. Available", type: "text", width: "full" },
        { key: "expReq", label: "Exp. Required", type: "text", width: "full" },
        { key: "expAvail", label: "Exp. Available", type: "text", width: "full" },
        { key: "expNote", label: "Exp. Note", type: "text", width: "full" },
        { key: "skillReq", label: "Skill Required", type: "text", width: "full" },
        { key: "skillAvail", label: "Skill Available", type: "text", width: "full" },
        { key: "skillNote", label: "Skill Note", type: "text", width: "full" },
        { key: "training", label: "Training", type: "text", width: "full" },
      ]},
      { key: "training_topics", label: "Training Topics", type: "array", zod: {
        custom: z.array(z.object({
          code: z.string(),
          name: z.string(),
        })).default([]),
      }},
      { key: "training_given", label: "Training Given", type: "array", zod: {
        custom: z.array(z.object({
          code: z.string(),
          name: z.string(),
          date: z.string(),
          participant: z.string(),
          effective: z.boolean(),
        })).default([]),
      }},
      { key: "reviewed_by", label: "Reviewed By", type: "text", width: "half" },
      { key: "reviewed_on", label: "Reviewed On", type: "text", width: "half" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "prepared_on", label: "Prepared On", type: "text", width: "half" },
      { key: "authorised_by", label: "Authorised By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/41",
    name: "Competence Gap Analyses Form",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "Medium",
    description: "Competence gap analysis based on available qualifications, experience, skills, and training received.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "matrix_ref", label: "Competence Matrix Ref", type: "text", width: "half" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "full" },
      { key: "items", label: "Gap Analysis Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "name", label: "Name", type: "text", width: "full" },
        { key: "designation", label: "Designation", type: "text", width: "full" },
        { key: "qualAvail", label: "Qual. Available", type: "text", width: "full" },
        { key: "expAvail", label: "Exp. Available", type: "text", width: "full" },
        { key: "skillAvail", label: "Skill Available", type: "text", width: "full" },
        { key: "training", label: "Training", type: "text", width: "full" },
      ]},
      { key: "training_topics", label: "Training Topics", type: "array", zod: {
        custom: z.array(z.object({
          code: z.string(),
          name: z.string(),
        })).default([]),
      }},
      { key: "training_given", label: "Training Given", type: "array", zod: {
        custom: z.array(z.object({
          code: z.string(),
          name: z.string(),
          date: z.string(),
          participant: z.string(),
          effective: z.boolean(),
        })).default([]),
      }},
      { key: "reviewed_by", label: "Reviewed By", type: "text", width: "half" },
      { key: "reviewed_on", label: "Reviewed On", type: "text", width: "half" },
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "authorised_by", label: "Authorised By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/42",
    name: "Annual Training Program",
    section: 5,
    sectionName: "HR & Training",
    frequency: "Annual",
    importance: "High",
    description: "Annual training program with topic tracking, mode, effectiveness evaluation, and remarks.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "year", label: "Year", type: "text", required: true, width: "half" },
      { key: "objectives", label: "Training Objectives", type: "text", required: true, width: "full" },
      { key: "project_scope", label: "Project Scope", type: "text", width: "full" },
      { key: "items", label: "Training Program Items", type: "table", width: "full", columns: [
        { key: "topicNo", label: "Topic No.", type: "text", width: "full" },
        { key: "title", label: "Title", type: "text", width: "full" },
        { key: "participants", label: "Participants", type: "text", width: "full" },
        { key: "identifiedBy", label: "Identified By", type: "text", width: "full" },
        { key: "reason", label: "Reason", type: "text", width: "full" },
        { key: "modeInternal", label: "Mode Internal", type: "text", width: "full" },
        { key: "modeExternal", label: "Mode External", type: "text", width: "full" },
        { key: "faculty", label: "Faculty", type: "text", width: "full" },
        { key: "plannedDate", label: "Planned Date", type: "text", width: "full" },
        { key: "actualDate", label: "Actual Date", type: "text", width: "full" },
        { key: "effMethod", label: "Effectiveness Method", type: "text", width: "full" },
        { key: "effBy", label: "Evaluated By", type: "text", width: "full" },
        { key: "effNote", label: "Effectiveness Note", type: "text", width: "full" },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/43",
    name: "Induction Training",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "High",
    description: "Employee induction training checklist with 15 topics.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "full" },
      { key: "employee_id", label: "Employee ID", type: "text", required: true, width: "half" },
      { key: "designation", label: "Designation", type: "text", required: true, width: "half" },
      { key: "date_of_joining", label: "Date of Joining", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", required: true, width: "half" },
      { key: "project", label: "Project", type: "text", required: true, width: "half" },
      { key: "qualification", label: "Qualification", type: "text", width: "half" },
      { key: "trainer", label: "Trainer", type: "text", required: true, width: "half" },
      { key: "topics", label: "Induction Topics", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "topic", label: "Topic", type: "text", width: "full" },
        { key: "trainer_check", label: "Trainer ✔", type: "checkbox", width: "full" },
        { key: "inductee_check", label: "Inductee ✔", type: "checkbox", width: "full" },
      ]},
      { key: "inductee_name", label: "Inductee Name", type: "text", width: "half" },
      { key: "inductee_signature", label: "Inductee Signature", type: "signature", required: true, width: "half" },
      { key: "inductee_date", label: "Inductee Date", type: "text", width: "half" },
      { key: "trainer_name", label: "Trainer Name", type: "text", width: "half" },
      { key: "trainer_signature", label: "Trainer Signature", type: "signature", required: true, width: "half" },
      { key: "trainer_date", label: "Trainer Date", type: "text", width: "half" },
      { key: "authorised_person", label: "Authorised Person", type: "text", width: "half" },
      { key: "authorised_signature", label: "Authorised Signature", type: "signature", required: true, width: "half" },
      { key: "authorised_date", label: "Authorised Date", type: "text", width: "half" },
      { key: "effectiveness", label: "Effectiveness", type: "textarea", width: "full" },
    ],
  },
  {
    code: "F/44",
    name: "Job Description / Responsibilities",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "High",
    description: "Job description with responsibilities (text or PDF upload).",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", width: "half" },
      { key: "designation", label: "Designation", type: "text", required: true, width: "half" },
      { key: "department", label: "Department", type: "text", width: "half" },
      { key: "project", label: "Project", type: "text", width: "half" },
      { key: "reporting_to", label: "Reporting To", type: "text", width: "half" },
      { key: "responsibilities", label: "Responsibilities", type: "textarea", width: "full" },
      { key: "qualifications", label: "Qualifications", type: "textarea", width: "full" },
      { key: "experience", label: "Experience", type: "textarea", width: "full" },
      { key: "skills", label: "Skills", type: "textarea", width: "full" },
      { key: "kpis", label: "KPIs", type: "textarea", width: "full" },
      { key: "signed_document_url", label: "Signed Document URL", type: "text", width: "full" },
      { key: "employee_signature", label: "Employee Signature", type: "signature", width: "half" },
      { key: "employee_signature_date", label: "Employee Signature Date", type: "text", width: "half" },
      { key: "authorised_person", label: "Authorised Person", type: "text", width: "half" },
      { key: "authorised_signature", label: "Authorised Signature", type: "signature", width: "half" },
      { key: "authorised_date", label: "Authorised Date", type: "text", width: "half" },
    ],
  },
  {
    code: "F/45",
    name: "Exit Interview",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "Medium",
    description: "Exit interview record for departing employees.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", width: "half" },
      { key: "designation", label: "Designation", type: "text", width: "half" },
      { key: "department", label: "Department", type: "text", width: "half" },
      { key: "date_of_joining", label: "Date of Joining", type: "text", width: "half" },
      { key: "date_of_leaving", label: "Date of Leaving", type: "text", width: "half" },
      { key: "reason_for_leaving", label: "Reason for Leaving", type: "textarea", width: "full" },
      { key: "feedback", label: "Feedback", type: "textarea", width: "full" },
      { key: "conducted_by", label: "Conducted By", type: "signature", required: true, width: "half" },
      { key: "employee_signature", label: "Employee Signature", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/46",
    name: "Employee Suggestion",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "Low",
    description: "Employee suggestion scheme record.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "half" },
      { key: "employee_id", label: "Employee ID", type: "text", width: "half" },
      { key: "suggestion", label: "Suggestion", type: "textarea", required: true, width: "full" },
      { key: "benefits", label: "Expected Benefits", type: "textarea", width: "full" },
      { key: "status", label: "Status", type: "select", width: "half", options: ["Submitted", "Under Review", "Accepted", "Implemented", "Rejected"] },
      { key: "evaluated_by", label: "Evaluated By", type: "signature", width: "half" },
      { key: "implemented_by", label: "Implemented By", type: "signature", width: "half" },
      { key: "reward", label: "Reward", type: "text", width: "half" },
    ],
  },
  {
    code: "F/47",
    name: "Competency Assessment",
    section: 5,
    sectionName: "HR & Training",
    frequency: "On event",
    importance: "Medium",
    description: "Competency assessment checklist for specific roles.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "employee_name", label: "Employee Name", type: "text", required: true, width: "full" },
      { key: "role", label: "Role", type: "text", required: true, width: "full" },
      { key: "checklist_items", label: "Checklist Items", type: "array", required: true, zod: {
        custom: z.array(z.object({
          competency: z.string(),
          level: z.enum(['Expert', 'Proficient', 'Basic', 'Needs Training']),
          evidence: z.string(),
        })).min(1),
      }},
      { key: "overall_rating", label: "Overall Rating", type: "select", width: "half", options: ["Expert", "Proficient", "Basic", "Needs Training"] },
      { key: "assessed_by", label: "Assessed By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", width: "half" },
      { key: "next_assessment", label: "Next Assessment Date", type: "text", width: "half" },
    ],
  },
  {
    code: "F/48",
    name: "Internal Audit Report",
    section: 3,
    sectionName: "Quality & Audit",
    frequency: "Monthly",
    importance: "High",
    description: "Monthly internal audit report with findings and follow-up tracking.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "audit_type", label: "Type of Audit", type: "select", required: true, width: "half", options: ["Internal", "External", "Supplier", "Second Party"] },
      { key: "date_of_audit", label: "Date of Audit", type: "text", width: "half" },
      { key: "audit_team", label: "Audit Team", type: "text", width: "full" },
      { key: "audit_standard", label: "Audit Standard", type: "text", width: "full" },
      { key: "audit_location", label: "Audit Location", type: "text", width: "full" },
      { key: "audit_scope", label: "Audit Scope", type: "textarea", width: "full" },
      { key: "auditee", label: "Auditee", type: "text", width: "full" },
      { key: "summary_report", label: "Summary Report", type: "textarea", width: "full" },
      { key: "audit_findings", label: "Audit Findings (NCs)", type: "textarea", width: "full" },
      { key: "followup_required", label: "Follow-up Audit Required", type: "select", width: "half", options: ["Yes", "No"] },
      { key: "followup_date", label: "Date of Follow Up Audit", type: "text", width: "half" },
      { key: "auditor_signature", label: "Auditor Signature", type: "signature", required: true, width: "half" },
    ],
  },

  // ── Section 06: R&D & Design ──────────────────────────────────────────
  {
    code: "F/32",
    name: "R&D Request",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "On event",
    importance: "High",
    description: "R&D request with feasibility and approval.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "from_department", label: "From Department", type: "text", required: true, width: "full" },
      { key: "to_department", label: "To Department", type: "text", required: true, width: "full" },
      { key: "request_type", label: "Request Type", type: "select", width: "half", options: ["New Product", "Product Modification", "Process Improvement", "Other"] },
      { key: "customer_name", label: "Customer Name", type: "text", width: "full" },
      { key: "product_name", label: "Product Name", type: "text", required: true, width: "full" },
      { key: "specification", label: "Specification", type: "textarea", width: "full" },
      { key: "product_code", label: "Product Code", type: "text", width: "half" },
      { key: "sample_enclosed", label: "Sample Enclosed", type: "select", width: "half", options: ["Yes", "No"] },
      { key: "manufacturer", label: "Manufacturer", type: "text", width: "full" },
      { key: "present_market", label: "Present Market", type: "text", width: "full" },
      { key: "reason_for_development", label: "Reason for Development", type: "textarea", width: "full" },
      { key: "design_input_details", label: "Design Input Details", type: "textarea", width: "full" },
      { key: "target_completion", label: "Target Completion", type: "text", width: "half" },
      { key: "remarks", label: "Remarks", type: "textarea", width: "full" },
      { key: "requested_by", label: "Requested By", type: "signature", required: true, width: "half" },
      { key: "feasibility", label: "Feasibility", type: "select", width: "half", options: ["Feasible", "Not Feasible", "Conditional"] },
      { key: "rejection_reason", label: "Rejection Reason", type: "textarea", width: "full" },
      { key: "project_no", label: "Project No.", type: "text", width: "half" },
      { key: "priority", label: "Priority", type: "select", width: "half", options: ["High", "Medium", "Low"] },
      { key: "rd_target_completion", label: "R&D Target Completion", type: "text", width: "half" },
      { key: "assigned_to", label: "Assigned To", type: "text", width: "half" },
      { key: "rd_remarks", label: "R&D Remarks", type: "textarea", width: "full" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/34",
    name: "Design Verification",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "On event",
    importance: "Critical",
    description: "Design verification record with input/output matrix.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "project_number", label: "Project Number", type: "text", required: true, width: "full" },
      { key: "product_name", label: "Product Name", type: "text", required: true, width: "full" },
      { key: "verification_items", label: "Verification Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "input", label: "Design Input", type: "text", width: "full" },
        { key: "output", label: "Design Output", type: "text", width: "full" },
        { key: "method", label: "Verification Method", type: "text", width: "full" },
        { key: "result", label: "Result", type: "select", width: "full", options: ["Pass", "Fail", "Partial"] },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "remarks", label: "Overall Remarks", type: "textarea", width: "full" },
      { key: "conclusion", label: "Conclusion", type: "select", width: "half", options: ["Verified", "Not Verified", "Conditional"] },
      { key: "checked_by", label: "Checked By", type: "signature", required: true, width: "half" },
      { key: "reviewed_and_approved_by", label: "Reviewed & Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/35",
    name: "Design Monitoring",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "Monthly",
    importance: "High",
    description: "Monthly design progress monitoring matrix.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "month", label: "Month", type: "text", required: true, width: "half" },
      { key: "year", label: "Year", type: "text", required: true, width: "half" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "items", label: "Monitoring Items", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "product_name", label: "Product Name", type: "text", width: "full" },
        { key: "specification", label: "Specification", type: "text", width: "full" },
        { key: "new_specification", label: "New Specification", type: "text", width: "full" },
        { key: "customer_name", label: "Customer Name", type: "text", width: "full" },
        { key: "reason_of_development", label: "Reason of Development", type: "text", width: "full" },
        { key: "dev_completion_date", label: "Dev. Completion Date", type: "text", width: "full" },
        { key: "actual_completion_date", label: "Actual Completion Date", type: "text", width: "full" },
        { key: "reason_for_rejection", label: "Reason for Rejection", type: "text", width: "full" },
        { key: "action_taken", label: "Action Taken", type: "text", width: "full" },
        { key: "status", label: "Status", type: "text", width: "full" },
        { key: "design_head_sign", label: "Design Head Sign", type: "signature", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/37",
    name: "Experiment Data",
    section: 6,
    sectionName: "R&D & Design",
    frequency: "On event",
    importance: "High",
    description: "Experimental data recording for R&D.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "product_name", label: "Product Name", type: "text", required: true, width: "full" },
      { key: "experiment_no", label: "Experiment No.", type: "text", required: true, width: "half" },
      { key: "incharge", label: "Incharge", type: "text", required: true, width: "full" },
      { key: "objective", label: "Objective", type: "textarea", width: "full" },
      { key: "experiments", label: "Experiments", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "quantity", label: "Quantity", type: "text", width: "full" },
        { key: "description", label: "Description", type: "text", width: "full" },
        { key: "observation", label: "Observation", type: "text", width: "full" },
      ]},
      { key: "conclusion", label: "Conclusion", type: "textarea", width: "full" },
      { key: "done_by", label: "Done By", type: "signature", required: true, width: "half" },
      { key: "reviewed_by", label: "Reviewed By", type: "signature", width: "half" },
    ],
  },

  // ── Section 07: Document Control & Records ────────────────────────────
  {
    code: "F/49",
    name: "Document Master List",
    section: 7,
    sectionName: "Document Control & Records",
    frequency: "Monthly",
    importance: "High",
    description: "Master list of all controlled documents.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "items", label: "Documents", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "doc_code", label: "Doc Code", type: "text", width: "full" },
        { key: "doc_name", label: "Document Name", type: "text", width: "full" },
        { key: "revision", label: "Revision", type: "text", width: "full" },
        { key: "effective_date", label: "Effective Date", type: "text", width: "full" },
        { key: "status", label: "Status", type: "select", width: "full", options: ["Active", "Obsolete", "Under Review"] },
        { key: "owner", label: "Owner", type: "text", width: "full" },
        { key: "location", label: "Location", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
  {
    code: "F/50",
    name: "Record Retention Schedule",
    section: 7,
    sectionName: "Document Control & Records",
    frequency: "On event",
    importance: "Medium",
    description: "Record retention and disposal schedule.",
    fields: [
      { key: "serial", label: "Serial Number", type: "text", required: true, width: "half", defaultValue: "auto" },
      { key: "date", label: "Date", type: "text", required: true, width: "half" },
      { key: "items", label: "Records", type: "table", width: "full", columns: [
        { key: "srNo", label: "Sr. No.", type: "text", width: "full" },
        { key: "record_type", label: "Record Type", type: "text", width: "full" },
        { key: "retention_period", label: "Retention Period", type: "text", width: "full" },
        { key: "disposal_method", label: "Disposal Method", type: "text", width: "full" },
        { key: "responsible_dept", label: "Responsible Dept", type: "text", width: "full" },
        { key: "storage_location", label: "Storage Location", type: "text", width: "full" },
        { key: "format", label: "Format", type: "text", width: "full" },
        { key: "remarks", label: "Remarks", type: "text", width: "full" },
      ]},
      { key: "prepared_by", label: "Prepared By", type: "signature", required: true, width: "half" },
      { key: "approved_by", label: "Approved By", type: "signature", width: "half" },
    ],
  },
];

// ============================================================================
// Code Generators — produce FormSchema (UI) and ZodSchema (Validation)
// ============================================================================

function toFormSchema(u: UnifiedFormSchema) {
  return {
    code: u.code,
    name: u.name,
    section: u.section,
    sectionName: u.sectionName,
    frequency: u.frequency,
    importance: u.importance,
    description: u.description,
    fields: u.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      placeholder: f.placeholder,
      options: f.options,
      columns: f.columns?.map(c => ({
        key: c.key,
        label: c.label,
        type: c.type,
        required: c.required ?? false,
        options: c.options,
        width: c.width,
      })),
      defaultValue: f.defaultValue,
      validation: f.validation,
      width: f.width,
    })),
    templateApprovedDate: u.templateApprovedDate,
    templateLastModified: u.templateLastModified,
    templateCreatedBy: u.templateCreatedBy,
    templateApprovedBy: u.templateApprovedBy,
  };
}

function toZodSchema(u: UnifiedFormSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of u.fields) {
    if (f.type === "heading") continue; // headings are not data fields

    let zodField: z.ZodTypeAny;

    if (f.zod?.custom) {
      zodField = f.zod.custom;
    } else {
      switch (f.type) {
        case "text":
        case "textarea":
          zodField = f.required ? z.string().min(1, f.validation?.message || 'Required') : z.string().default('');
          break;
        case "number":
          zodField = f.required
            ? z.number({ invalid_type_error: 'Must be a number' }).min(f.validation?.min ?? -Infinity).max(f.validation?.max ?? Infinity)
            : z.number().optional().default(0);
          break;
        case "date":
          zodField = f.required
            ? z.string().regex(DDMMYYYY_REGEX, 'Date must be DD/MM/YYYY')
            : z.string().regex(DDMMYYYY_REGEX, 'Date must be DD/MM/YYYY').optional().default('');
          break;
        case "select":
          zodField = f.required
            ? z.enum(f.options as [string, ...string[]])
            : z.enum(f.options as [string, ...string[]]).optional().default(f.options?.[0] || '');
          break;
        case "multiselect":
          zodField = f.required
            ? z.array(z.string()).min(1)
            : z.array(z.string()).default([]);
          break;
        case "checkbox":
          zodField = f.required ? z.boolean() : z.boolean().default(false);
          break;
        case "radio":
          zodField = f.required
            ? z.enum(f.options as [string, ...string[]])
            : z.enum(f.options as [string, ...string[]]).optional().default(f.options?.[0] || '');
          break;
        case "signature":
          zodField = f.required ? z.string().min(1, 'Signature required') : z.string().default('');
          break;
        case "table":
          zodField = z.array(z.object(
            Object.fromEntries(
              (f.columns || []).map(c => [
                c.key,
                c.required ? z.string().min(1) : z.string().default('')
              ])
            )
          )).default([]);
          break;
        case "array":
          zodField = z.array(z.any()).default([]);
          break;
        default:
          zodField = z.any();
      }
    }

    if (f.zod?.optional !== undefined && f.zod.optional) {
      zodField = zodField.optional();
    }
    if (f.zod?.nullable) {
      zodField = zodField.nullable();
    }
    if (f.zod?.default !== undefined) {
      zodField = zodField.default(f.zod.default);
    }

    shape[f.key] = zodField;
  }

  return z.object(shape);
}

// ============================================================================
// Exported Registries (generated from single source)
// ============================================================================

export const FORM_SCHEMAS = UNIFIED_SCHEMAS.map(toFormSchema);
export const FORM_ZOD_SCHEMAS: Record<string, z.ZodType> = Object.fromEntries(
  UNIFIED_SCHEMAS.map(u => [u.code, toZodSchema(u)])
);

// Type exports
export type FormSchema = ReturnType<typeof toFormSchema>;
export type { UnifiedFormSchema, UnifiedField };

// ============================================================================
// Helper functions
// ============================================================================

export function getFormSchema(code: string) {
  return FORM_SCHEMAS.find(f => f.code === code);
}

export function getZodSchema(code: string) {
  return FORM_ZOD_SCHEMAS[code];
}

export function getAllFormCodes() {
  return UNIFIED_SCHEMAS.map(u => u.code);
}

export function getFormSections() {
  return [...new Set(UNIFIED_SCHEMAS.map(f => f.section))].sort((a, b) => a - b);
}

export function getFormsBySection(section: number) {
  return UNIFIED_SCHEMAS.filter(f => f.section === section);
}