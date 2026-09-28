# QMS → QBase Migration Strategy

> **Phase 1: Analysis & Planning**  
> Prepared: 2026-06-14  
> Target: 262 records × 35 forms  
> Source: QMS (Google Drive + Google Sheets) → Destination: QBase (Supabase PostgreSQL)

---

## 1. Executive Summary

Both QMS and QBase manage the same 35 ISO 9001:2015 forms across 7 sections. The **form definitions are identical** (same codes, names, sections, frequencies). The differences are entirely in **how records are stored and structured**:

| | QMS (Source) | QBase (Destination) |
|---|---|---|
| Record Storage | 262 DOCX files in Google Drive folders | JSONB in Supabase `records.form_data` |
| Metadata | Google Sheets "Data" sheet (35 rows) | Supabase `records` table columns |
| Form Structure | Defined in DOCX templates only | Defined in `formSchemas.ts` (843 lines, full field schemas) |
| Validation | None (free-form DOCX) | Zod schemas + `preWriteValidation` gatekeeper |
| API | Google Sheets API + Google Drive API | Supabase RPC (`create_record_validated`) |
| Auth | Google OAuth token | Supabase Auth (RLS policies) |

**Key Insight**: QBase has a stricter, more structured data model than QMS. Migrating from QMS to QBase means going from **unstructured DOCX files** to **strictly-validated JSONB** — the challenge is extraction, not mapping.

---

## 2. Architecture Comparison

### 2.1 QMS Architecture

```
┌────────────────────────────────────────────────┐
│  QMS Frontend (React/Vite)                     │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  │
│  │ driveSvc │  │ googleSheet│  │ formRecSvc│  │
│  │ (Drive   │  │ (Sheets    │  │ (localStor│  │
│  │  API)    │  │  API)      │  │  age)     │  │
│  └────┬─────┘  └─────┬──────┘  └─────┬─────┘  │
└───────┼──────────────┼───────────────┼────────┘
        │              │               │
   ┌────▼────┐   ┌─────▼──────┐  ┌────▼─────────┐
   │ Google  │   │  Google    │  │  localStorage │
   │ Drive   │   │  Sheets    │  │  (offline     │
   │ (262    │   │  "Data"    │  │   fallback)   │
   │  DOCX)  │   │  (35 rows) │  │               │
   └─────────┘   └────────────┘  └───────────────┘
```

- **Google Sheets "Data"**: 35 rows (one per form), columns A–R contain metadata: category, code, name, description, whenToFill, templateLink, folderLink, lastSerial, lastFileDate, daysAgo, nextSerial, auditStatus, reviewedBy, reviewDate, fileReviews (JSON), reviewed flag
- **Google Drive**: 35 folders (one per form), each containing DOCX record files
- **localStorage**: `qms_form_records` key — cached form record data

### 2.2 QBase Architecture

```
┌────────────────────────────────────────────────┐
│  QBase Frontend (React/Vite)                   │
│  ┌──────────────┐  ┌────────────┐              │
│  │ DynamicForm  │  │ recordStor │              │
│  │ Renderer     │  │ age (CRUD) │              │
│  │ (formSchemas │  │            │              │
│  │  .ts)        │  └─────┬──────┘              │
│  └──────────────┘        │                     │
│         ┌────────────────┼──────────────┐      │
│         │ preWriteValid  │ Zod         │      │
│         │ ation.ts       │ Schemas     │      │
│         └────────────────┴──────┬──────┘      │
└─────────────────────────────────┼─────────────┘
                                  │
                          ┌───────▼────────┐
                          │   Supabase     │
                          │  ┌──────────┐  │
                          │  │ records  │  │
                          │  │ table    │  │
                          │  │  (RLS)   │  │
                          │  └──────────┘  │
                          │  RPC:          │
                          │  create_record │
                          │  _validated    │
                          └────────────────┘
```

**The `records` table schema** (inferred from `recordStorage.ts`):
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| form_code | text | e.g. "F/08" |
| serial | text | e.g. "F/08-004" |
| form_name | text | "Order Form" |
| status | text | draft / pending_review / approved / rejected |
| form_data | jsonb | **ALL business fields** — the core payload |
| section | int | 1–7 |
| section_name | text | e.g. "Sales & Customer Service" |
| frequency | text | e.g. "On event" |
| created_by | text | email |
| last_modified_by | text | email |
| edit_count | int | optimistic lock counter |
| modification_reason | text | |
| deleted_at | timestamptz | soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**WRITE PATH (rigid)**:
```
User → DynamicFormRenderer → ZOD validation → onSubmit →
  createRecord() → preWriteValidation() → supabase.rpc('create_record_validated') →
    RPC checks: serial uniqueness, required fields, RBAC → INSERT
```

Records NEVER bypass validation. No direct INSERT, no raw SQL writes.

---

## 3. Form-by-Form Mapping

Both projects have exactly 35 forms with identical codes and names. Below is the complete registry with QBase field counts:

### Section 01: Sales & Customer Service (4 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/08 | Order Form | Template-defined (unknown) | 12 fields (serial, date, client_name, mode_of_receipt, items, test_certificate_required, delivery_schedule, complies, order_status, remarks, reviewed_by, bill_no, despatch_date) | 3 | Direct mapping possible after DOCX extraction |
| F/09 | Customer Complaint | Template-defined | 16 fields | 0 | Schema-ready (also has custom F09ComplaintForm component) |
| F/10 | Customer Feedback | Template-defined | 17 fields | 2 | Schema-ready |
| F/50 | Customer Property Register | Template-defined | 1 table field (12 columns) | 0 | Schema-ready |

### Section 02: Operations & Production (2 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/11 | Production Plan | Template-defined | 7 fields (incl. projects table) | 7 | Schema-ready |
| F/19 | Product Description | Template-defined | 8 fields | 3 | Schema-ready |

### Section 03: Quality & Audit (7 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/12 | Non-Conforming | Template-defined | 10 fields | 0 | Schema-ready |
| F/17 | QA Test Request | Template-defined | 6 fields | 0 | Schema-ready |
| F/18 | Product Re-Call | Template-defined | 6 fields | 0 | Schema-ready |
| F/22 | Corrective Action | Template-defined | 11 fields | 2 | Schema-ready (also has F22CAPAForm component) |
| F/25 | Audit Plan | Template-defined | 8 fields (incl. audits table) | 1 | Schema-ready |
| F/47 | Audit Checklist | Template-defined | 5 fields (incl. checklist_items table) | 0 | Schema-ready |
| F/48 | Internal Audit Report | Template-defined | 10 fields | 4 | Schema-ready |

### Section 04: Procurement & Vendors (4 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/13 | Purchase Order | Template-defined | 7 fields (incl. items table) | 0 | Schema-ready |
| F/14 | Incoming Inspection | Template-defined | 7 fields | 0 | Schema-ready |
| F/15 | Approved Vendor List | Template-defined | 5 fields (incl. vendors table) | 1 | Schema-ready |
| F/16 | Supplier Registration Form | Template-defined | 7 fields | 1 | Schema-ready |

### Section 05: HR & Training (8 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/28 | Training Attendance | Template-defined | 9 fields (incl. attendees table) | 8 | Schema-ready (also has F28TrainingForm component) |
| F/29 | Training Record | Template-defined | 10 fields | 5 | Schema-ready |
| F/30 | Performance Appraisal | Template-defined | 8 fields (incl. criteria table) | 19 | Schema-ready |
| F/40 | Competence Matrix | Template-defined | 4 fields (incl. matrix table) | 4 | Schema-ready |
| F/41 | Gap Analysis | Template-defined | 5 fields | 0 | Schema-ready |
| F/42 | Annual Training Plan | Template-defined | 6 fields (incl. plan table) | 1 | Schema-ready |
| F/43 | Induction Training Record | Template-defined | 13 fields | 64 | Schema-ready |
| F/44 | Job Description | Template-defined | 7 fields | 0 | Schema-ready |

### Section 06: R&D & Design (4 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/32 | R&D Request | Template-defined | 7 fields | 0 | Schema-ready |
| F/34 | Design Verification | Template-defined | 6 fields | 0 | Schema-ready |
| F/35 | Design Monitoring | Template-defined | 7 fields | 4 | Schema-ready |
| F/37 | Experiment Data | Template-defined | 7 fields | 0 | Schema-ready |

### Section 07: Management & Documentation (6 forms)
| Code | Name | QMS Fields | QBase Fields | Record Count | Status |
|---|---|---|---|---|---|
| F/20 | Review Agenda | Template-defined | 6 fields (incl. agenda_items table) | 4 | Schema-ready |
| F/21 | Review Minutes | Template-defined | 9 fields (incl. action_items table) | 4 | Schema-ready |
| F/23 | Master List of Records | Template-defined | 4 fields (incl. records table) | 2 | Schema-ready |
| F/24 | Objectives & Targets | Template-defined | 5 fields (incl. objectives table) | 4 | Schema-ready |
| F/45 | Master List of Documents | Template-defined | 4 fields (incl. documents table) | 2 | Schema-ready |
| F/46 | Change Management | Template-defined | 7 fields | 0 | Schema-ready |

**Key Finding**: QBase's `formSchemas.ts` already defines complete field schemas for ALL 35 forms — 843 lines of field definitions including types, validations, required flags, and options. The mapping is 1:1 and complete; no QBase schema modifications are needed because it already covers MORE structure than QMS.

---

## 4. Data Extraction: DOCX → JSONB

### 4.1 The Challenge

The 262 records exist as DOCX files generated from Word templates. Each template has placeholder fields (e.g., `[serial]`, `[date]`, `[client_name]`) that were filled in. The extraction approach depends on:

1. **Are the templates consistent per form?** — If all F/08 files use the same template, we can write a single extractor.
2. **Are placeholders preserved?** — Some DOCX files may have the template structure still visible; others may be "flattened" (plain text only).
3. **What's the field naming?** — We need to map DOCX field names to QBase `form_data` keys.

### 4.2 Proposed Extraction Strategy

**Option A: DOCX Template Parsing (Preferred)**
- Access each DOCX via Google Drive API
- Parse DOCX XML to find either:
  - Content control tags (`<w:sdt>`) — if templates used Word content controls
  - Table cell patterns — if templates used Word tables with field labels
  - Regex extraction — if templates follow a predictable label: value format
- Map extracted values to `form_data` keys matching QBase `formSchemas.ts` field keys

**Option B: Google Doc Conversion**
- Copy DOCX → Google Doc via Drive API
- Use Google Docs API to parse structured content
- Extract key-value pairs from the document

**Option C: Script-Based Extraction**
- Write a Python/Node script that reads DOCX via `python-docx` or `mammoth`
- Run locally against downloaded files
- Output JSON files that can be batch-inserted

### 4.3 Required for Extraction

To proceed, we need:
- ✅ Google API token (user confirmed available)
- ✅ `VITE_SPREADSHEET_ID` env var (to locate the sheet and folders)
- ✅ `VITE_GOOGLE_API_KEY` env var
- 🔍 Sample DOCX files (at least 1 per form type) to analyze template structure

---

## 5. Migration Approach

### 5.1 Two-Phase Strategy

**Phase A: Sample Analysis** (required before Phase B)
1. Connect to Google Drive API with provided token
2. List all 35 folders and their file counts
3. Download 1 sample DOCX per form type (35 files)
4. Analyze each template's structure to determine extraction pattern
5. Build field mappers: DOCX field → `form_data` key

**Phase B: Batch Migration**
1. For each of the 35 forms:
   a. List all files in the form's Drive folder
   b. Download each DOCX
   c. Extract structured data using the mapper from Phase A
   d. Validate extracted data against QBase Zod schemas
   e. Insert via `create_record_validated` RPC
   f. Log success/failure per record
2. Generate migration report

### 5.2 Migration Script

The migration will be implemented as a Node.js/TypeScript script that:
- Uses the same Supabase client as QBase
- Calls Google Drive API for file listing/download
- Parses DOCX to extract fields
- Bypasses the QBase UI — writes directly to Supabase RPC (still goes through validation)

### 5.3 Serial Number Handling

QMS uses serials like `F/08-001`, `F/11-007`, etc. These come from:
- The `lastSerial` column in Google Sheets
- The actual filenames on Drive

For QBase migration:
- **Preserve original serials** where possible — DON'T auto-generate new ones
- Use `createRecord()` with explicit serials (not 'auto')
- If a record already exists in QBase with the same serial, flag it for review

---

## 6. Field Mapping Strategy

Since QMS fields are defined in DOCX templates (not in code), the mapping process is:

1. **Read QBase field schema** for form F/XX from `formSchemas.ts`
2. **Open sample DOCX** for form F/XX from Drive
3. **Identify corresponding fields** in the DOCX
4. **Build mapper**: `{ "docx_label": "form_data_key", ... }`
5. **Test extraction** on sample file
6. **Apply to all files** of that form type

### Field Type Conversions

| DOCX Representation | QBase Field Type | Conversion |
|---|---|---|
| Plain text (name, title) | `text` | Direct string |
| Date string (various formats) | `date` (ISO) | Parse and normalize to YYYY-MM-DD |
| Checkbox ☑/☐ | `checkbox` | ☑ → true, ☐ → false |
| Dropdown value | `select` | Match against QBase options list |
| Multi-row table | `table` | Parse rows → array of objects |
| Signature (name text) | `signature` | Direct string |

---

## 7. Risks & Ambiguities

### 7.1 Critical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **DOCX templates inconsistent across files** | Extraction fails for some records | Sample analysis phase will catch this early |
| **Some files are PDF, not DOCX** | Requires different parser | List all file MIME types before extraction |
| **Zod validation rejects extracted data** | Records fail to insert | Pre-validate and report; fix extraction or relax schema |
| **Duplicate serials between QMS and existing QBase data** | Insertion fails | Check existing QBase records before migration |
| **Google API rate limits** | 262 files × extraction = many API calls | Batch with concurrency limits (6 parallel); add delays |
| **File contents corrupted or unreadable** | Data loss | Flag and skip; report for manual handling |

### 7.2 Known Unknowns

1. **Are all 262 files DOCX?** — Need to verify via `listFolderFiles()` MIME types
2. **Do templates use content controls or plain tables?** — Determines extraction complexity
3. **Is there any structured data in Google Sheets beyond metadata?** — Column P (`fileReviews`) contains per-file JSON; may have additional data
4. **Are there attachments/files linked within records?** — QMS has `relatedRecords` — need to preserve in QBase traceability
5. **What about the `fileReviews` data?** — Column P contains per-file review statuses — should these be migrated too?

---

## 8. Estimated Implementation Plan

### Phase A: Sample Analysis & Mapping (~1-2 hours)
1. ✅ Connect Google Drive API — list all folders and files
2. Download 1 sample per form type (max 35 files)
3. Analyze DOCX structure for each form
4. Build field mappers for all 35 forms
5. Test extraction on samples
6. Document edge cases and failures

### Phase B: Batch Migration (~3-5 hours)
1. Script: iterate 35 forms × N records
2. Download DOCX, extract data, validate, insert
3. Real-time progress tracking
4. Error handling and retry logic
5. Final migration report

### Phase C: Validation (~1 hour)
1. Verify record count = 262
2. Spot-check field completeness
3. Compare sample records between QMS (Google Drive) and QBase (Supabase)
4. Generate final report with pass/fail/skip counts

---

## 9. Success Criteria

- [ ] All 262 records exist in QBase `records` table
- [ ] Data integrity: extracted values match source DOCX contents
- [ ] No Zod validation failures in migrated records (unless source data was genuinely invalid)
- [ ] Original serial numbers preserved
- [ ] Complete migration report delivered

---

## 10. Decision Points (Need User Input)

Before proceeding to Phase 2 (implementation), please confirm:

1. **Google API credentials**: Ready to provide `VITE_SPREADSHEET_ID` and `VITE_GOOGLE_API_KEY`?
2. **Existing QBase data**: Are there already records in QBase that might conflict with QMS serials?
3. **Soft-deleted records**: If QMS has archived/deleted files, skip them or include?
4. **Migration approach preference**: 
   - A) Direct script (runs locally, connects to both Google Drive and Supabase)
   - B) Web-based migration tool (built into QBase temporarily)
   - C) Two-step: export QMS data to JSON files first, then import to QBase

---

**End of Phase 1 Analysis. Awaiting approval to proceed to Phase 2 (Form Gap Resolution & Implementation).**
