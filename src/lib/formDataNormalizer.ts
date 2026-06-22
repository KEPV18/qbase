// ============================================================================
// formDataNormalizer.ts
// Maps legacy DB form_data keys → template-expected keys at render time.
// Applied in parseRowToRecord() — adds alias keys alongside originals.
// No DB migration, no data loss, no template rewriting needed.
// ============================================================================
//
// Two mapping types:
// 1. SIMPLE ALIAS: { templateKey: dbKey } — if templateKey not in data, copy dbKey value
// 2. ARRAY MAP: { templateArrayKey: { source: dbArrayKey, fieldMap: { dbField: templateField } } }
//    — if templateArrayKey not in data, copy dbArrayKey and rename fields within each row
//
// Generated from analysis of 249 DB records vs 35 form template source files.
// ============================================================================

type SimpleAliasMap = Record<string, string>; // templateKey → dbKey
type ArrayFieldMap = Record<string, string>;  // dbField → templateField
type ArrayMapping = { source: string; fieldMap: ArrayFieldMap };
type FormMapping = {
  aliases?: SimpleAliasMap;
  arrays?: Record<string, ArrayMapping>; // templateArrayKey → mapping
};

const FORM_MIGRATION_MAP: Record<string, FormMapping> = {
  // ── F/09 — 1 record ──────────────────────────────────────────────
  "F/09": {
    // Template expects formCode but DB doesn't have it; everything else matches
    aliases: {
      // DB has rich extra data that template doesn't read — that's fine (only-orphan)
    },
  },

  // ── F/11 — 9 records — Production Plan ──────────────────────────
  "F/11": {
    aliases: {
      remarks: "notes",
      updated_by: "approved_by",
    },
    arrays: {
      items: {
        source: "projects",
        fieldMap: {
          product: "product",
          batch_no: "batchNo",
          // DB projects: {sr, yield, product, batch_no, ...}
          // Template items: {product, batchNo, planDate, planCompletion, planSize, actualDate, actualQty, yieldPercent}
        },
      },
      rows: {
        source: "projects",
        fieldMap: {
          product: "product",
          batch_no: "batchNo",
        },
      },
    },
  },

  // ── F/12 — 1 record — Disposal of Non-Conforming Products ────────
  "F/12": {
    aliases: {
      department: "nc_type", // "Process / Documentation" — best available
      month: "closure_date", // "N/A" — best available
      authorised_signature: "reported_by",
    },
    // DB has flat text (root_cause, description, corrective_action, preventive_action)
    // Template expects items[] array with structured rows. Can't auto-map flat→array.
    // The flat text data IS preserved (orphan keys remain), just not shown in template table.
  },

  // ── F/13 — 1 record — Purchase Order ───────────────────────────
  "F/13": {
    aliases: {
      authorised_by: "approved_by",
      ordered_by: "requested_by",
      terms: "supplier", // best available — DB has supplier text
      to: "supplier",
    },
  },

  // ── F/14 — 1 record — Incoming Inspection ───────────────────────
  "F/14": {
    aliases: {
      checked_by: "inspector",
      prepared_by: "inspector",
    },
    arrays: {
      items: {
        source: "items_inspected", // DB has flat string, template expects array
        fieldMap: {},
      },
    },
  },

  // ── F/15 — 1 record — Approved Vendor List ─────────────────────
  "F/15": {
    aliases: {
      // Template only reads items/rows + serial
    },
    arrays: {
      items: {
        source: "vendors",
        fieldMap: {
          name: "supplierName",
          scope: "scopeOfSupply",
          approved: "approvalCriteria",
          criteria: "approvalCriteria",
        },
      },
      rows: {
        source: "vendors",
        fieldMap: {
          name: "supplierName",
          scope: "scopeOfSupply",
          approved: "approvalCriteria",
          criteria: "approvalCriteria",
        },
      },
    },
  },

  // ── F/16 — 1 record — Vendor Registration ───────────────────────
  "F/16": {
    aliases: {
      name: "supplier_name",
      contact_person: "evaluated_by", // best available
      address: "supplier_contact",
      mobile_no: "supplier_contact",
      tel_fax: "supplier_contact",
      evaluated_by: "evaluated_by",
      authorised_by: "evaluated_by",
      authorised_date: "date",
      approval_reason: "evaluation_result",
      past_experience: "qualifications",
      employee_strength: "service_type",
      association_years: "service_type",
      sites_branches: "service_type",
      sister_concerns: "service_type",
      reference: "service_type",
      residence_no: "supplier_contact",
      vendor_auth_name: "evaluated_by",
      vendor_auth_designation: "service_type",
      vendor_date: "date",
    },
  },

  // ── F/17 — 1 record — Test Request ───────────────────────────────
  "F/17": {
    aliases: {
      sample_description: "description",
      sample_qty: "test_required",
      batch_no: "test_type",
      request_from: "project_name",
      request_to: "project_name",
      test_result_ref: "criteria",
      signature_requested: "requested_by",
      signature_approved: "requested_by",
    },
  },

  // ── F/18 — 1 record — Material Release ─────────────────────────
  "F/18": {
    aliases: {
      authorised_by: "authorized_by", // spelling fix
      department: "product", // best available
    },
    arrays: {
      items: {
        source: "affected_items", // DB has flat string
        fieldMap: {},
      },
    },
  },

  // ── F/20 — 1 record — Meeting Notice ───────────────────────────
  "F/20": {
    aliases: {
      approved_by: "chairperson",
      meeting_place: "location",
      meeting_date: "date",
      meeting_time: "date", // best available
    },
  },

  // ── F/21 — 1 record — Meeting Minutes ──────────────────────────
  "F/21": {
    aliases: {
      meeting_place: "attendees", // best available
      meeting_time: "attendees",
      discussion_points: "discussion",
      minutes_circulated_with: "attendees",
      next_meeting: "decisions", // best available — decisions mentions next meeting
      approved_by: "chairperson",
    },
  },

  // ── F/22 — 1 record — Corrective Action Request ────────────────
  "F/22": {
    aliases: {
      approved_by: "initiated_by",
      prepared_by: "initiated_by",
      department: "source",
      nc_description: "description",
      inprocess_specify: "source",
      others_specify: "source",
      target_date: "due_date",
      verification_date: "due_date",
    },
  },

  // ── F/23 — 1 record — Master List of Records ───────────────────
  "F/23": {
    aliases: {
      department: "maintained_by",
      authorised_signature: "maintained_by",
    },
    arrays: {
      items: {
        source: "records",
        fieldMap: {
          description: "title",
          form_code: "recordNo",
          date_created: "issueDate",
          record_serial: "docNo",
          storage: "storagePlace",
        },
      },
      rows: {
        source: "records",
        fieldMap: {
          description: "title",
          form_code: "recordNo",
          date_created: "issueDate",
          record_serial: "docNo",
          storage: "storagePlace",
        },
      },
    },
  },

  // ── F/24 — 1 record — Quality Objectives ───────────────────────
  "F/24": {
    aliases: {
      department: "quarter", // best available
      signature: "reviewed_by",
    },
    arrays: {
      items: {
        source: "objectives",
        fieldMap: {},
      },
      rows: {
        source: "objectives",
        fieldMap: {},
      },
    },
  },

  // ── F/25 — 1 record — Internal Audit Schedule ───────────────────
  "F/25": {
    aliases: {
      from: "period",
      to: "period",
      last_audit_month: "year",
      last_audit_plan_date: "scope",
      last_audit_plan_no: "scope",
    },
    arrays: {
      items: {
        source: "audits",
        fieldMap: {},
      },
      rows: {
        source: "audits",
        fieldMap: {},
      },
    },
  },

  // ── F/28 — 15 records — Training Attendance ────────────────────
  "F/28": {
    aliases: {
      trainer: "trainer",
      training_topic: "project", // best available — project = training topic
    },
    arrays: {
      items: {
        source: "attendees",
        fieldMap: {
          name: "name",
          id: "idNo",
          attended: "signature",
        },
      },
      rows: {
        source: "attendees",
        fieldMap: {
          name: "name",
          id: "idNo",
          attended: "signature",
        },
      },
    },
  },

  // ── F/29 — 19 records — Competence Evaluation ───────────────────
  "F/29": {
    aliases: {
      assessed_by: "recorded_by",
      assessed_on: "training_date",
      authorised_by: "trainer",
      prepared_by: "recorded_by",
    },
    // DB has flat text (comments, course_name, etc.), template expects items[] array
    // Can't auto-map flat text → structured rows. Data preserved as orphan keys.
  },

  // ── F/30 — 56 records — Performance Evaluation ─────────────────
  "F/30": {
    aliases: {
      evaluated_by: "evaluator",
      evaluator_name: "evaluator",
      evaluator_name2: "evaluator",
      evaluator_name3: "evaluator",
      increment: "recommendations", // best available — recommendations mentions increment
      last_increment: "recommendations",
      promotion: "recommendations",
      responsibility: "recommendations",
      suggestions: "recommendations",
      total_marking: "overall_score",
      training_need: "recommendations",
      working_months: "period",
      authorities: "department", // best available
    },
    arrays: {
      items: {
        source: "criteria",
        fieldMap: {
          criterion: "criterion",
          score: "score",
          comments: "comments",
        },
      },
    },
  },

  // ── F/32 — 1 record — R&D Request ───────────────────────────────
  "F/32": {
    aliases: {
      product_name: "title",
      product_code: "title",
      manufacturer: "requested_by",
      customer_name: "requested_by",
      assigned_to: "requested_by",
      from_dept: "requested_by",
      present_market: "methodology",
      specification: "objective",
      project_no: "title",
      rd_target: "expected_outcome",
      rd_remarks: "methodology",
      requested_designation: "requested_by",
      target_completion: "expected_outcome",
    },
  },

  // ── F/34 — 1 record — Design Verification ──────────────────────
  "F/34": {
    aliases: {
      approved_by: "verified_by",
      product_name: "project",
      input_requirements: "findings",
      output_observed: "requirements_met", // best available
    },
  },

  // ── F/35 — 1 record — New Product Development ──────────────────
  "F/35": {
    aliases: {
      authorised_by: "monitored_by",
    },
    arrays: {
      items: {
        source: "issues", // DB has flat string, template expects array
        fieldMap: {},
      },
      rows: {
        source: "issues",
        fieldMap: {},
      },
    },
  },

  // ── F/37 — 1 record — Experiment Record ─────────────────────────
  "F/37": {
    aliases: {
      done_by: "recorded_by",
      experiment_no: "experiment_title",
      incharge: "recorded_by",
      product: "experiment_title",
      reviewed_by: "recorded_by",
      object_variables: "hypothesis",
    },
    arrays: {
      items: {
        source: "results", // DB has flat string
        fieldMap: {},
      },
      rows: {
        source: "results",
        fieldMap: {},
      },
    },
  },

  // ── F/40 — 3 records — Competence Matrix ───────────────────────
  "F/40": {
    aliases: {
      authorised_by: "prepared_by",
      reviewed_by: "prepared_by",
      reviewed_on: "period",
    },
    arrays: {
      items: {
        source: "matrix",
        fieldMap: {
          name: "designation",
          role: "designation",
          level: "qualReq",
          skill: "skillReq",
        },
      },
      rows: {
        source: "matrix",
        fieldMap: {
          name: "designation",
          role: "designation",
          level: "qualReq",
          skill: "skillReq",
        },
      },
    },
  },

  // ── F/41 — 4 records — Training Needs Identification ─────────────
  "F/41": {
    aliases: {
      authorised_by: "prepared_by",
      reviewed_by: "prepared_by",
      reviewed_on: "date",
    },
    arrays: {
      items: {
        source: "gaps",
        fieldMap: {
          employee: "name",
          qual_required: "qualReq",
          qual_available: "qualAvail",
          training_needed: "training1",
        },
      },
      rows: {
        source: "gaps",
        fieldMap: {
          employee: "name",
          qual_required: "qualReq",
          qual_available: "qualAvail",
          training_needed: "training1",
        },
      },
    },
  },

  // ── F/42 — 4 records — Annual Training Plan ────────────────────
  "F/42": {
    aliases: {
      date: "method", // best available
    },
    arrays: {
      items: {
        source: "plan",
        fieldMap: {},
      },
      rows: {
        source: "plan",
        fieldMap: {},
      },
    },
  },

  // ── F/43 — 68 records — Induction Training Record ───────────────
  "F/43": {
    aliases: {
      authorised_sign: "manager_signature",
      date_of_joining: "employee_id", // DB employee_id contains date value
      designation: "project", // DB project = role/designation
      effectiveness: "performance",
      inductee_sign: "manager_signature",
      sign_date: "employee_id", // DB employee_id = date
      topics: "topics_covered",
      trainer_sign: "trainer_signature",
    },
  },

  // ── F/44 — 15 records — Job Description ─────────────────────────
  "F/44": {
    aliases: {
      approved_by: "prepared_by",
      delegation: "department", // best available
      position: "job_title",
      reports_to: "reporting_to",
    },
  },

  // ── F/45 — 1 record — Document Master List ──────────────────────
  "F/45": {
    aliases: {
      authorised_signature: "maintained_by",
      department: "maintained_by",
    },
    arrays: {
      items: {
        source: "documents",
        fieldMap: {
          title: "title",
          doc_id: "docNo",
          version: "issueNo",
          status: "access",
          date_created: "issueDate",
        },
      },
      rows: {
        source: "documents",
        fieldMap: {
          title: "title",
          doc_id: "docNo",
          version: "issueNo",
          status: "access",
          date_created: "issueDate",
        },
      },
    },
  },

  // ── F/46 — 1 record — Change Request ────────────────────────────
  "F/46": {
    aliases: {
      approval_remarks: "approved_by",
      completion_date: "date",
      followup_date_1: "date",
      followup_date_2: "date",
      requestor_signature: "approved_by",
      responsible_designation: "change_type",
      responsible_name: "approved_by",
      target_date: "date",
      type_other: "change_type",
      type_other_specify: "change_type",
      verified_by: "approved_by",
    },
  },

  // ── F/47 — 1 record — Internal Audit Checklist ──────────────────
  "F/47": {
    aliases: {
      approved_by: "auditor",
      audit_date: "date",
    },
  },

  // ── F/48 — 4 records — Internal Audit Report ─────────────────────
  "F/48": {
    aliases: {
      audit_findings: "findings",
      audit_location: "scope",
      audit_scope: "scope",
      audit_standard: "scope",
      audit_team: "auditor",
      audit_type: "scope",
      audit_type_value: "scope",
      auditee: "department",
      auditor_signature: "auditor",
      date_of_audit: "date",
      followup_date: "recommendations",
      followup_required: "recommendations",
      summary_report: "findings",
    },
  },

  // ── F/50 — 1 record — Material Consumption ──────────────────────
  "F/50": {
    // Template expects entries[] — DB HAS entries[]. Check if field names match.
    arrays: {
      entries: {
        source: "entries",
        fieldMap: {
          outward_by: "outward_by",
          balance_qty: "balance_qty",
          outward_qty: "outward_qty",
          purpose_for: "purpose_for",
          received_by: "received_by",
          outward_date: "outward_date",
        },
      },
    },
  },
};

// ============================================================================
// normalizeFormData — applies migration map to form_data
// Returns a NEW object with template-expected keys added alongside originals.
// Original keys are NEVER removed — only additions.
// ============================================================================

export function normalizeFormData(
  formCode: string,
  formData: Record<string, unknown>
): Record<string, unknown> {
  const mapping = FORM_MIGRATION_MAP[formCode];
  if (!mapping) return formData; // no mapping needed

  const result: Record<string, unknown> = { ...formData };

  // 1. Apply simple aliases: if templateKey not in data, copy from dbKey
  if (mapping.aliases) {
    for (const [templateKey, dbKey] of Object.entries(mapping.aliases)) {
      if (result[templateKey] == null || result[templateKey] === "") {
        const dbVal = result[dbKey];
        if (dbVal != null && dbVal !== "") {
          result[templateKey] = dbVal;
        }
      }
    }
  }

  // 2. Apply array mappings: if templateArrayKey not in data, copy from source + rename fields
  if (mapping.arrays) {
    for (const [templateArrayKey, arrayMapping] of Object.entries(mapping.arrays)) {
      // Only add if template key is missing or empty
      const existing = result[templateArrayKey];
      const hasExisting = existing != null && existing !== "" &&
        !(typeof existing === "string" && existing === "[]") &&
        !(Array.isArray(existing) && existing.length === 0);

      if (hasExisting) continue;

      const sourceData = result[arrayMapping.source];
      if (sourceData == null || sourceData === "") continue;

      // Handle string-encoded arrays (JSON strings)
      let sourceArray: unknown[];
      if (typeof sourceData === "string") {
        // If it's a JSON array string, parse it
        if (sourceData.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(sourceData);
            if (Array.isArray(parsed)) {
              sourceArray = parsed;
            } else {
              continue; // not an array
            }
          } catch {
            continue; // not valid JSON
          }
        } else {
          // Flat string — can't convert to array, skip
          continue;
        }
      } else if (Array.isArray(sourceData)) {
        sourceArray = sourceData;
      } else {
        continue;
      }

      // Map fields within each row
      const fieldMap = arrayMapping.fieldMap;
      const mappedArray = sourceArray.map((row) => {
        if (typeof row !== "object" || row === null) return row;
        const rowObj = row as Record<string, unknown>;
        const mappedRow: Record<string, unknown> = { ...rowObj };

        for (const [dbField, templateField] of Object.entries(fieldMap)) {
          if (mappedRow[templateField] == null || mappedRow[templateField] === "") {
            if (rowObj[dbField] != null && rowObj[dbField] !== "") {
              mappedRow[templateField] = rowObj[dbField];
            }
          }
        }

        return mappedRow;
      });

      result[templateArrayKey] = mappedArray;
    }
  }

  return result;
}