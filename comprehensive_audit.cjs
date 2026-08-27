// Comprehensive QMS Audit Script
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://iouuikteroixnsqazznc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load form schemas from the TypeScript file
const schemaContent = fs.readFileSync('/home/Kepv/.qwenpaw/workspaces/qms/qbase-work/src/data/formSchemas.ts', 'utf8');

// Parse schemas (simplified extraction)
function parseSchemas(content) {
  const schemas = {};
  // This is a simplified parser - in reality we'd want a proper TS parser
  // But for audit purposes, we'll hard-code the key requirements per form
  
  // We'll define the required fields per form based on the schema
  return {
    "F/08": { name: "Order Form", required: ["serial", "client_name"], tableFields: [] },
    "F/09": { name: "Customer Complaint", required: ["serial", "date", "client_name", "description", "complaint_nature"], tableFields: [] },
    "F/10": { name: "Customer Feedback", required: ["serial", "date", "client_name"], tableFields: [] },
    "F/50": { name: "Customer Property Register", required: ["serial"], tableFields: ["entries"] },
    "F/11": { name: "Production Plan", required: ["serial", "month", "date", "items", "prepared_by", "reviewed_by", "approved_by", "signature", "updated_based_on_progress"], tableFields: ["items"] },
    "F/19": { name: "Product Description", required: ["serial", "product_name", "process_name", "end_product_characteristics", "method_of_prevention", "storage_condition", "support_update_period", "licensing_legal", "intended_use", "regulatory_requirements", "where_sold"], tableFields: [] },
    "F/12": { name: "Non-Conforming", required: ["serial", "month", "items"], tableFields: ["items"] },
    "F/17": { name: "QA Test Request", required: ["request_no", "date", "from_department", "to_department", "sample_qty", "product_name", "stage_of_test", "qty_received", "batch_no_lot_no", "batch_size", "test_results", "status", "requested_by", "received_by", "tested_by", "approved_by"], tableFields: ["test_results"] },
    "F/18": { name: "Product Re-Call", required: ["serial", "date", "product_name", "reference_inward_no", "qty_taken", "products_identified_by", "released_by", "requested_by", "verified_by", "verified_on", "status", "entry_closed_on", "entry_closed_by"], tableFields: [] },
    "F/22": { name: "Corrective Action", required: ["sr_no", "description_of_non_conformity", "root_cause_analysis", "identified_date", "identified_by", "actions_recommended", "responsibility"], tableFields: [] },
    "F/25": { name: "Audit Plan", required: ["audit_plan_no", "date", "from_role", "to_role", "intro_corporate_note", "audit_matrix", "status_of_actual_audit", "reviewed_and_approved_by"], tableFields: ["audit_matrix"] },
    "F/47": { name: "Audit Checklist", required: ["serial", "date", "department", "checklist_items", "auditor"], tableFields: ["checklist_items"] },
    "F/48": { name: "Internal Audit Report", required: ["serial", "date", "month", "scope", "findings", "auditor", "reviewed_by"], tableFields: [] },
    "F/13": { name: "Purchase Order", required: ["serial", "po_no", "date", "vendor_name", "prepared_by", "reviewed_and_approved_by"], tableFields: ["items_table"] },
    "F/14": { name: "Incoming Inspection", required: ["serial", "date", "prepared_by", "checked_by"], tableFields: ["items"] },
    "F/15": { name: "Approved Vendor List", required: ["serial", "year", "prepared_by"], tableFields: ["items"] },
    "F/16": { name: "Supplier Registration Form", required: ["serial", "name", "address", "contact_person", "products_services", "vendor_auth_name", "vendor_date", "authorised_by", "authorised_date", "status", "registered_by"], tableFields: [] },
    "F/28": { name: "Training Attendance", required: ["serial", "topic", "department", "conducted_by", "training_date", "attendees", "trainer_signature", "hr_signature"], tableFields: ["attendees"] },
    "F/29": { name: "Training Record", required: ["serial", "employee_name", "employee_id", "department", "course_name", "training_date", "trainer", "recorded_by"], tableFields: ["items"] },
    "F/30": { name: "Performance Appraisal", required: ["serial", "date", "employee_name", "designation", "department", "working_in_organisation", "evaluation_done_by", "evaluation_matrix", "total_marking", "evaluated_by"], tableFields: [] },
    "F/40": { name: "Competence Matrix", required: ["serial", "period", "items", "prepared_by"], tableFields: [] },
    "F/41": { name: "Competence Gap Analyses Form", required: ["serial", "date", "items", "prepared_by"], tableFields: [] },
    "F/42": { name: "Annual Training Program", required: ["serial", "date", "year", "objectives", "items", "prepared_by"], tableFields: [] },
    "F/43": { name: "Induction Training Form", required: ["serial", "date", "employee_name", "employee_id", "designation", "date_of_joining", "department", "project", "qualification", "trainer", "effectiveness"], tableFields: [] },
    "F/44": { name: "Job Description", required: ["serial", "date", "job_title", "department", "responsibilities", "prepared_by"], tableFields: [] },
    "F/32": { name: "R&D Request", required: ["serial", "date", "from_department", "to_department", "request_type", "customer_name", "product_name", "specification", "reason_for_development", "design_input_details", "target_completion", "requested_by"], tableFields: [] },
    "F/34": { name: "Design Verification", required: ["serial", "date", "project_number", "product_name", "verification_items", "conclusion", "checked_by", "reviewed_and_approved_by"], tableFields: ["verification_items"] },
    "F/35": { name: "Design Monitoring", required: ["serial", "date", "month", "year", "items"], tableFields: [] },
    "F/37": { name: "Experiment Data", required: ["serial", "date", "product_name", "experiment_no", "incharge", "objective", "experiments", "conclusion", "done_by", "reviewed_by"], tableFields: [] },
    "F/20": { name: "Review Agenda", required: ["serial", "date", "time", "place", "agenda", "minutes", "approved_by", "chairperson", "prepared_by", "action_items"], tableFields: [] },
    "F/21": { name: "Review Minutes", required: ["serial", "date", "time", "place", "agenda", "attendees", "decisions", "discussion", "minutes_by", "approved_by", "chairperson", "prepared_by", "meeting_date"], tableFields: [] },
    "F/23": { name: "Master List of Records", required: ["serial", "date", "records", "department", "maintained_by"], tableFields: [] },
    "F/24": { name: "Objectives & Targets", required: ["serial", "year", "quarter", "department", "objectives", "prepared_by", "reviewed_by"], tableFields: [] },
    "F/45": { name: "Master List of Documents", required: ["serial"], tableFields: [] },
    "F/46": { name: "Change Management", required: ["serial"], tableFields: [] },
  };
}

const SCHEMAS = parseSchemas(schemaContent);

async function runAudit() {
  console.log('Fetching all records...');
  const { data: records, error } = await supabase.from('records').select('*').order('form_code,serial');
  
  if (error) {
    console.error('Error fetching records:', error);
    return;
  }
  
  console.log(`Total records: ${records.length}`);
  
  const findings = [];
  let totalEmptyFieldsRef = [0]; let totalInvalidValuesRef = [0]; let totalInconsistenciesRef = [0]; let totalDuplicatesRef = [0];
  let totalInvalidValues = 0;
  let totalInconsistencies = 0;
  let totalDuplicates = 0;
  
  // Group by form
  const byForm = {};
  for (const r of records) {
    if (!byForm[r.form_code]) byForm[r.form_code] = [];
    byForm[r.form_code].push(r);
  }
  
  // Track serials for duplicate detection
  const serialMap = {};
  
  for (const [formCode, formRecords] of Object.entries(byForm)) {
    const schema = SCHEMAS[formCode];
    if (!schema) {
      console.log(`⚠ No schema defined for ${formCode}`);
      continue;
    }
    
    console.log(`\n=== Auditing ${formCode} (${schema.name}) - ${formRecords.length} records ===`);
    
    for (const record of formRecords) {
      // Check for duplicate serials
      if (serialMap[record.serial]) {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: 'serial',
          value: record.serial,
          type: 'DUPLICATE_SERIAL',
          description: `Duplicate serial number found: ${record.serial} also exists in ${serialMap[record.serial]}`,
          recommendation: 'Ensure each record has a unique serial number',
          severity: 'CRITICAL'
        });
        totalDuplicatesRef[0]++;
      } else {
        serialMap[record.serial] = formCode;
      }
      
      const formData = record.form_data || {};
      
      // Check required fields
      for (const reqField of schema.required) {
        const value = formData[reqField];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          findings.push({
            form: `${formCode} - ${schema.name}`,
            record: record.serial,
            field: reqField,
            value: value === undefined ? 'MISSING' : value === null ? 'NULL' : value === '' ? 'EMPTY_STRING' : 'EMPTY_ARRAY',
            type: 'MISSING_REQUIRED_FIELD',
            description: `Required field "${reqField}" is missing, empty, or null`,
            recommendation: `Populate the required field "${reqField}" with valid data`,
            severity: 'HIGH'
          });
          totalEmptyFieldsRef[0]++;
        }
      }
      
      // Check table fields if they exist and are empty
      for (const tableField of schema.tableFields) {
        const value = formData[tableField];
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
          findings.push({
            form: `${formCode} - ${schema.name}`,
            record: record.serial,
            field: tableField,
            value: value === undefined ? 'MISSING' : value === null ? 'NULL' : 'EMPTY_ARRAY',
            type: 'EMPTY_TABLE_FIELD',
            description: `Required table field "${tableField}" is missing or empty`,
            recommendation: `Populate the table field "${tableField}" with at least one row`,
            severity: 'HIGH'
          });
          totalEmptyFieldsRef[0]++;
        } else if (Array.isArray(value)) {
          // Check each row in the table for empty required columns
          for (let i = 0; i < value.length; i++) {
            const row = value[i];
            if (row && typeof row === 'object') {
              for (const [colKey, colVal] of Object.entries(row)) {
                if (colVal === undefined || colVal === null || colVal === '') {
                  findings.push({
                    form: `${formCode} - ${schema.name}`,
                    record: record.serial,
                    field: `${tableField}[${i}].${colKey}`,
                    value: colVal === undefined ? 'MISSING' : colVal === null ? 'NULL' : 'EMPTY_STRING',
                    type: 'EMPTY_TABLE_CELL',
                    description: `Table cell is empty in ${tableField} row ${i+1}, column ${colKey}`,
                    recommendation: `Populate cell ${colKey} in row ${i+1} of ${tableField}`,
                    severity: 'MEDIUM'
                  });
                  totalEmptyFieldsRef[0]++;
                }
              }
            }
          }
        }
      }
      
      // Check all fields for empty values (even non-required)
      for (const [fieldKey, fieldValue] of Object.entries(formData)) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          // Only flag if not already flagged as required
          const isRequired = schema.required.includes(fieldKey);
          if (!isRequired && !schema.tableFields.includes(fieldKey)) {
            findings.push({
              form: `${formCode} - ${schema.name}`,
              record: record.serial,
              field: fieldKey,
              value: fieldValue === undefined ? 'MISSING' : fieldValue === null ? 'NULL' : 'EMPTY_STRING',
              type: 'EMPTY_OPTIONAL_FIELD',
              description: `Optional field "${fieldKey}" is empty or missing`,
              recommendation: `Consider populating field "${fieldKey}" if applicable`,
              severity: 'LOW'
            });
            totalEmptyFieldsRef[0]++;
          }
        }
        
        // Check for suspicious values
        if (typeof fieldValue === 'string') {
          // Check for placeholder/suspicious values
          const suspicious = ['N/A', 'n/a', 'NA', 'na', 'TBD', 'TBA', 'XXX', 'TODO', 'test', 'Test', 'TEST', 'null', 'NULL', 'undefined'];
          if (suspicious.includes(fieldValue.trim())) {
            findings.push({
              form: `${formCode} - ${schema.name}`,
              record: record.serial,
              field: fieldKey,
              value: fieldValue,
              type: 'SUSPICIOUS_VALUE',
              description: `Field contains suspicious/placeholder value: "${fieldValue}"`,
              recommendation: `Verify if "${fieldValue}" is intentional or should be replaced with actual data`,
              severity: 'MEDIUM'
            });
            totalInvalidValuesRef[0]++;
          }
          
          // Check for garbled/encoded text
          if (fieldValue.includes('\\u') && fieldValue.length > 20) {
            findings.push({
              form: `${formCode} - ${schema.name}`,
              record: record.serial,
              field: fieldKey,
              value: fieldValue.substring(0, 50) + '...',
              type: 'ENCODED_TEXT',
              description: `Field appears to contain Unicode escape sequences instead of actual text`,
              recommendation: `Decode the Unicode sequences to proper Arabic/UTF-8 text`,
              severity: 'HIGH'
            });
            totalInvalidValuesRef[0]++;
          }
        }
      }
      
      // Form-specific validations
      await validateFormSpecific(formCode, schema, record, formData, findings);
    }
  }
  
  // Also check risks and capas tables
  console.log('\n=== Auditing risks table ===');
  await auditRisks(findings);
  
  console.log('\n=== Auditing capas table ===');
  await auditCapas(findings);
  
  // Generate report
  generateReport(findings, records.length, Object.keys(byForm).length, totalEmptyFieldsRef[0], totalInvalidValuesRef[0], totalInconsistenciesRef[0], totalDuplicatesRef[0]);
}

async function validateFormSpecific(formCode, schema, record, formData, findings) {
  // F/11 Production Plan specific checks
  if (formCode === 'F/11') {
    // Check items array structure
    if (formData.items && Array.isArray(formData.items)) {
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        const requiredCols = ['product', 'batch_no', 'plan_date', 'plan_size', 'actual_date', 'actual_qty', 'yield_percent'];
        for (const col of requiredCols) {
          if (!item[col] || item[col] === '') {
            findings.push({
              form: `${formCode} - ${schema.name}`,
              record: record.serial,
              field: `items[${i}].${col}`,
              value: item[col] || 'MISSING',
              type: 'EMPTY_TABLE_CELL',
              description: `Production plan item ${i+1} missing required column: ${col}`,
              recommendation: `Fill in ${col} for product row ${i+1}`,
              severity: 'MEDIUM'
            });
          }
        }
        // Check for the garbage "100%" row issue mentioned in AGENTS.md
        if (item.product === '100%' || item.yield_percent === '100%' && item.product === '100%') {
          findings.push({
            form: `${formCode} - ${schema.name}`,
            record: record.serial,
            field: `items[${i}]`,
            value: JSON.stringify(item),
            type: 'GARBAGE_ROW',
            description: `Garbage row detected with "100%" as product name - known data artifact`,
            recommendation: `Remove this artifact row from the production plan`,
            severity: 'HIGH'
          });
        }
      }
    }
    
    // Check for inconsistent month/year format
    if (formData.month && formData.year) {
      // Month should be full name per schema
      const validMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (!validMonths.includes(formData.month)) {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: 'month',
          value: formData.month,
          type: 'INVALID_MONTH_FORMAT',
          description: `Month should be full name (e.g., "January"), got: "${formData.month}"`,
          recommendation: `Use full month name per schema requirements`,
          severity: 'MEDIUM'
        });
        totalInvalidValuesRef[0]++;
      }
    }
  }
  
  // F/29 Training Record - result should be Pass/Fail/Incomplete
  if (formCode === 'F/29') {
    if (formData.result && !['Pass', 'Fail', 'Incomplete'].includes(formData.result)) {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: 'result',
        value: formData.result,
        type: 'INVALID_ENUM_VALUE',
        description: `Result must be one of: Pass, Fail, Incomplete. Got: "${formData.result}"`,
        recommendation: `Correct the result value to a valid option`,
        severity: 'HIGH'
      });
      totalInvalidValuesRef[0]++;
    }
    
    // Check if result is an object (serialized JSON)
    if (typeof formData.result === 'object') {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: 'result',
        value: JSON.stringify(formData.result).substring(0, 100),
        type: 'SERIALIZED_OBJECT_IN_FIELD',
        description: `Result field contains a serialized object instead of a simple string value`,
        recommendation: `Extract the actual result value (Pass/Fail/Incomplete) from the object`,
        severity: 'HIGH'
      });
      totalInvalidValuesRef[0]++;
    }
  }
  
  // F/30 Performance Appraisal - check evaluation_matrix structure
  if (formCode === 'F/30') {
    if (!formData.evaluation_matrix || !Array.isArray(formData.evaluation_matrix) || formData.evaluation_matrix.length === 0) {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: 'evaluation_matrix',
        value: formData.evaluation_matrix ? JSON.stringify(formData.evaluation_matrix).substring(0, 50) : 'MISSING',
        type: 'EMPTY_EVALUATION_MATRIX',
        description: `Evaluation matrix is required but missing or empty`,
        recommendation: `Populate the evaluation matrix with performance criteria and scores`,
        severity: 'HIGH'
      });
    } else {
      // Check each matrix item has required fields
      for (let i = 0; i < formData.evaluation_matrix.length; i++) {
        const item = formData.evaluation_matrix[i];
        if (!item.criteria || !item.score) {
          findings.push({
            form: `${formCode} - ${schema.name}`,
            record: record.serial,
            field: `evaluation_matrix[${i}]`,
            value: JSON.stringify(item).substring(0, 100),
            type: 'INCOMPLETE_EVALUATION_ITEM',
            description: `Evaluation matrix item ${i+1} missing criteria or score`,
            recommendation: `Ensure each evaluation item has both criteria and score fields`,
            severity: 'MEDIUM'
          });
        }
      }
    }
  }
  
  // F/43 Induction Training - check 15-topic checklist
  if (formCode === 'F/43') {
    const requiredInductionFields = ['employee_name', 'employee_id', 'designation', 'date_of_joining', 'department', 'project', 'qualification', 'trainer', 'effectiveness'];
    for (const field of requiredInductionFields) {
      if (!formData[field] || formData[field] === '') {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: field,
          value: formData[field] || 'MISSING',
          type: 'MISSING_INDUCTION_FIELD',
          description: `Induction form missing required field: ${field}`,
          recommendation: `Populate the required induction field: ${field}`,
          severity: 'HIGH'
        });
        totalEmptyFieldsRef[0]++;
      }
    }
  }
  
  // F/48 Internal Audit - check scope and findings are substantial
  if (formCode === 'F/48') {
    if (formData.scope && formData.scope.length < 20) {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: 'scope',
        value: formData.scope,
        type: 'INSUFFICIENT_CONTENT',
        description: `Audit scope is too brief (${formData.scope.length} chars) - may be incomplete`,
        recommendation: `Provide a comprehensive audit scope description`,
        severity: 'MEDIUM'
      });
    }
    if (formData.findings && formData.findings.length < 20) {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: 'findings',
        value: formData.findings,
        type: 'INSUFFICIENT_CONTENT',
        description: `Audit findings are too brief (${formData.findings.length} chars) - may be incomplete`,
        recommendation: `Provide detailed audit findings`,
        severity: 'MEDIUM'
      });
    }
  }
  
  // F/10 Customer Feedback - check ratings are valid
  if (formCode === 'F/10') {
    const ratingFields = ['rating_product_quality', 'rating_order_processing', 'rating_complaint_handling', 'rating_delivery', 'rating_price'];
    const validRatings = ['Excellent', 'Good', 'Satisfactory', 'Average', 'Poor', 'N/A'];
    for (const rf of ratingFields) {
      if (formData[rf] && !validRatings.includes(formData[rf])) {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: rf,
          value: formData[rf],
          type: 'INVALID_RATING',
          description: `Rating field ${rf} has invalid value: "${formData[rf]}". Must be one of: ${validRatings.join(', ')}`,
          recommendation: `Correct the rating to a valid option`,
          severity: 'MEDIUM'
        });
        totalInvalidValuesRef[0]++;
      }
    }
  }
  
  // F/28 Training Attendance - check attendees table
  if (formCode === 'F/28' && formData.attendees && Array.isArray(formData.attendees)) {
    for (let i = 0; i < formData.attendees.length; i++) {
      const attendee = formData.attendees[i];
      if (!attendee.name || attendee.name === '') {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: `attendees[${i}].name`,
          value: 'EMPTY',
          type: 'EMPTY_ATTENDEE_NAME',
          description: `Attendee row ${i+1} has empty name`,
          recommendation: `Fill in the attendee name for row ${i+1}`,
          severity: 'HIGH'
        });
      }
    }
  }
  
  // Check date format consistency
  const dateFields = ['date', 'training_date', 'record_month', 'coverage_period', 'prepared_on', 'reviewed_on'];
  for (const df of dateFields) {
    if (formData[df] && typeof formData[df] === 'string') {
      // Check for mixed date formats
      const val = formData[df];
      if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // ISO format - good
      } else if (val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // DD/MM/YYYY - acceptable
      } else if (val.match(/^\d{2}-\d{2}-\d{4}$/)) {
        // DD-MM-YYYY - acceptable
      } else if (val.match(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/)) {
        // Month YYYY - acceptable for coverage_period
      } else if (val.match(/^\d{2}\/\d{4}$/)) {
        // MM/YYYY - acceptable for record_month
      } else if (val.length > 0) {
        findings.push({
          form: `${formCode} - ${schema.name}`,
          record: record.serial,
          field: df,
          value: val,
          type: 'INCONSISTENT_DATE_FORMAT',
          description: `Date field "${df}" has non-standard format: "${val}"`,
          recommendation: `Standardize date format (prefer DD/MM/YYYY or ISO 8601)`,
          severity: 'LOW'
        });
        totalInconsistenciesRef[0]++;
      }
    }
  }
  
  // Check for Arabic/Unicode encoding issues
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string' && value.includes('\\u06')) {
      findings.push({
        form: `${formCode} - ${schema.name}`,
        record: record.serial,
        field: key,
        value: value.substring(0, 100),
        type: 'UNICODE_ESCAPE_SEQUENCES',
        description: `Field contains Unicode escape sequences (\\u06xx) instead of proper Arabic text`,
        recommendation: `Decode Unicode escape sequences to proper UTF-8 Arabic text`,
        severity: 'HIGH'
      });
      totalInvalidValuesRef[0]++;
    }
  }
}

async function auditRisks(findings) {
  const { data: risks, error } = await supabase.from('risks').select('*');
  if (error || !risks) return;
  
  for (const risk of risks) {
    const requiredFields = ['risk_id', 'process_department', 'risk_description', 'cause', 'likelihood', 'impact', 'risk_score', 'action_control', 'owner', 'status', 'review_date'];
    for (const field of requiredFields) {
      if (!risk[field] && risk[field] !== 0) {
        findings.push({
          form: 'RISK REGISTER',
          record: risk.risk_id || 'UNKNOWN',
          field: field,
          value: risk[field] || 'MISSING',
          type: 'MISSING_RISK_FIELD',
          description: `Risk register entry missing required field: ${field}`,
          recommendation: `Populate the required risk field: ${field}`,
          severity: 'HIGH'
        });
      }
    }
    
    // Validate risk_score = likelihood * impact
    if (risk.likelihood && risk.impact && risk.risk_score) {
      const expected = risk.likelihood * risk.impact;
      if (risk.risk_score !== expected) {
        findings.push({
          form: 'RISK REGISTER',
          record: risk.risk_id,
          field: 'risk_score',
          value: `${risk.risk_score} (expected: ${expected})`,
          type: 'RISK_SCORE_MISMATCH',
          description: `Risk score (${risk.risk_score}) does not match likelihood (${risk.likelihood}) × impact (${risk.impact}) = ${expected}`,
          recommendation: `Recalculate risk score as likelihood × impact`,
          severity: 'HIGH'
        });
      }
    }
    
    // Check for duplicate risk IDs
    // (handled by primary key constraint in DB)
  }
}

async function auditCapas(findings) {
  const { data: capas, error } = await supabase.from('capas').select('*');
  if (error || !capas) return;
  
  for (const capa of capas) {
    const requiredFields = ['capa_id', 'description', 'type', 'status', 'root_cause', 'corrective_action', 'owner', 'target_date'];
    for (const field of requiredFields) {
      if (!capa[field] && capa[field] !== 0) {
        findings.push({
          form: 'CAPA REGISTER',
          record: capa.capa_id || 'UNKNOWN',
          field: field,
          value: capa[field] || 'MISSING',
          type: 'MISSING_CAPA_FIELD',
          description: `CAPA register entry missing required field: ${field}`,
          recommendation: `Populate the required CAPA field: ${field}`,
          severity: 'HIGH'
        });
      }
    }
  }
}

function generateReport(findings, totalRecords, totalForms, totalEmptyFields, totalInvalidValues, totalInconsistencies, totalDuplicates) {
  // Sort findings by severity
  const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  // Count by severity
  const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const typeCounts = {};
  
  for (const f of findings) {
    severityCounts[f.severity]++;
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
  }
  
  let report = fs.readFileSync('/home/Kepv/Desktop/Comprehensive_Audit_Report.md', 'utf8');
  
  // Fill in the summary
  report = report.replace(
    '*To be filled upon completion of the audit.*',
    `**Audit Date:** ${new Date().toISOString().split('T')[0]}\n**Total Forms Audited:** ${totalForms}\n**Total Records Audited:** ${totalRecords}\n**Total Findings:** ${findings.length}\n**Critical:** ${severityCounts.CRITICAL}\n**High:** ${severityCounts.HIGH}\n**Medium:** ${severityCounts.MEDIUM}\n**Low:** ${severityCounts.LOW}\n\n**Categories:**\n- Missing/Empty Fields: ${totalEmptyFields}\n- Invalid/Incorrect Values: ${totalInvalidValues}\n- Inconsistencies: ${totalInconsistencies}\n- Duplicates: ${totalDuplicates}`
  );
  
  // Add findings to the table
  let tableRows = '';
  for (const f of findings) {
    tableRows += `| ${f.form} | ${f.record} | ${f.field} | ${String(f.value).substring(0, 50)} | ${f.type} | ${f.description} | ${f.recommendation} | ${f.severity} |\n`;
  }
  
  // Replace the empty table row with findings
  report = report.replace(
    '|           |                   |            |               |            |                      |                        |                   |',
    tableRows.trimEnd()
  );
  
  // Add summary by type at the end
  report += '\n\n## Findings by Type\n\n';
  report += '| Issue Type | Count |\n|------------|-------|\n';
  for (const [type, count] of Object.entries(typeCounts).sort((a,b) => b[1] - a[1])) {
    report += `| ${type} | ${count} |\n`;
  }
  
  report += '\n\n## Top Priority Actions\n\n';
  const criticalHigh = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  for (let i = 0; i < Math.min(criticalHigh.length, 20); i++) {
    const f = criticalHigh[i];
    report += `${i+1}. **[${f.severity}]** ${f.form} - ${f.record} - ${f.field}: ${f.description}\n`;
  }
  
  fs.writeFileSync('/home/Kepv/Desktop/Comprehensive_Audit_Report.md', report);
  console.log('\n=== AUDIT COMPLETE ===');
  console.log(`Total findings: ${findings.length}`);
  console.log(`Critical: ${severityCounts.CRITICAL}`);
  console.log(`High: ${severityCounts.HIGH}`);
  console.log(`Medium: ${severityCounts.MEDIUM}`);
  console.log(`Low: ${severityCounts.LOW}`);
  console.log(`Report saved to /home/Kepv/Desktop/Comprehensive_Audit_Report.md`);
}

runAudit().catch(console.error);
