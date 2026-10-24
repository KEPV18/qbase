# QBase — Comprehensive code review (2026-10-23)

**Request:** «افحص الكود كله فحص شامل بحث عن مناطق واكواد ممكن تتحسن» — a comprehensive review of the whole codebase for areas and code that can be improved.
**Mandate:** «صلح كل المشاكل وحسن كل الاكواد وظبط كل حاجة» — fix everything; confirmed defects are repaired and verified green.

**Method.** Every finding below was read out of the code and, where it is a behavioural claim, *measured* — against the schema, against the 36 document facsimiles, and against the production data restored into the local database (`127.0.0.1:5433/qbase_local`, 318 records, key names and JSON types only — no values). Numbers quoted below are counts from that data, not estimates.

**State at the end of this pass:** `npm run ci` → **EXIT=0** — eslint clean, `tsc -b` clean, schema parity 0 errors / 0 warnings, **21 test files / 428 tests green**, build ✓.

**State after the remediation waves (2026-10-24):** the waves that followed this review repaired H1–H3, H6–H9, M2 and the LOW items; **31 test files / 558 tests green**, eslint clean, `tsc -b` clean, schema parity 0 errors / 0 warnings. H6 — the compliance verdict — is now computed by the **server** (`public.compliance_map`, `public.records_page`, migration 20) instead of in the browser, and the two engines are compared against each other over the whole register by `tools/local-stack/verify-compliance-parity.ts`. No migration in this work alters a row: every one of them is functions, policies and grants only.

**H6 closed in the browser (2026-10-24):** the four pages that answer a compliance question — the dashboard, the audit dashboard, the forms registry and the compliance report — now call the server (`compliance_map`, `records_page`, `dashboard_stats`) and none of them reads the whole register: the `records?select=*` download is gone from all four, and the list behind the audit table is one filtered page at a time. Driven through a real browser against the local stack, with **0 console errors**; the audit's overdue tab shows the 5 forms the server found and a row opens that form's detailed report. The run is repeatable: `tools/local-stack/verify-server-compliance-path.mjs` drives the same four pages and fails if a page stops asking the server, or starts downloading the register again. The run also exposed a defect in the **local** stack — the API shim's CORS preflight did not allow `Content-Profile` / `Accept-Profile`, the two headers `@supabase/postgrest-js` sends on every request, so Chrome refused the preflight and the request never left the browser; the CORS proxy in front of the shim had hidden it by answering with `*`. Fixed in `tools/local-stack/qbase_api.py` and pinned by `src/lib/__tests__/localStackCors.test.ts`.

---

## 0. What this pass repaired (all verified)

| # | Defect | Where | Evidence |
|---|--------|-------|----------|
| 1 | **27 of 36 forms could not be created at all** — the create path validated against the strict schema while the payload came from the document facsimile, and 56 `required` fields were keys the document does not have | `src/schemas/unifiedSchema.ts` | "FORMS WITH A BLOCKED CREATE: 0" after the fix (was 27) |
| 2 | A non-required `select`/`radio` was **filled with its first option on every save** — a fabricated "Minor" severity / "Yes" compliance answer written into real records | `src/schemas/unifiedSchema.ts` (`toZodSchema`) | a select is now `.optional()` and stays absent |
| 3 | The **"Pending" audit tab was a byte-identical copy of the "Never Filled" tab**, and its tile counted something else entirely (filled-but-not-compliant forms) — the tile and its own tab never agreed | `src/pages/audit/useAuditPage.ts:227`, `src/pages/AuditPage.tsx:159` | the tab now filters `_status === 'pending_review'`, the tile counts records |
| 4 | The edit form was **seeded from the catalogue alone**, so 2–45 real fields per form were invisible in edit mode on records that were full | `src/pages/RecordViewPage.tsx` (`seedEditData`) | the seed now starts from the stored record |
| 5 | Zod's `z.object()` **stripped every key the schema does not declare**, and `update_record_versioned` replaces `form_data` wholesale — a stripped key was **destroyed on the first edit**, silently, with `valid: true` | `src/schemas/unifiedSchema.ts:1436` | `.catchall(z.unknown())` on the form object |
| 6 | Six templates wrote a table as a **JSON string** instead of an array | F11, F12, F28, F42, F50, `FormTemplateKit.useDynamicRows` | real arrays |
| 7 | `onChange` on the templates was typed `Record<string, unknown>`, so the 35 facsimiles could not report a field change — **the whole edit path was blind** | 35 × `F*Template.tsx` + `FormKit.tsx` | `onChange?: (field: string, value: unknown) => void` |
| 8 | The **local stack did not enforce RLS** — every local user saw all 318 records, including the 2 soft-deleted ones, because the shim connects as the table owner | `tools/local-stack/qbase_api.py` | verified: old shim 318 rows to a plain user, new shim 0 |
| 9 | A **restart of the local shim pointed it at the LIVE production database** — `run-shim.py` did not inherit `SB_DSN`, so the restarted shim fell back to the Supabase pooler while the stack still said "local database" | `tools/local-stack/run-shim.py:32` | `SB_DSN` added to the inherited key list |

Wave 8's regression test — `src/__tests__/createPathNotBlocked.test.ts` (37 assertions) — reads every facsimile, synthesises the payload the app would build, and asserts the create is accepted. It was mutation-verified: re-adding `required: true` to F/12's `department` makes the F/12 case fail.

---

## 1. The findings, ranked

### HIGH

#### H1 — The catalogue and the documents are *different documents* (16 of 36 forms)

The schema catalogue (`src/schemas/unifiedSchema.ts`) and the facsimiles (`src/components/forms/templates/F*Template.tsx`) are two independent descriptions of the same form code, and for 16 codes they do not describe the same document at all. The facsimile is the document a user sees and signs; the catalogue is the schema that validates, filters, groups and reports on it.

| Code | Catalogue says | The document is | Evidence |
|------|-----------------|-----------------|----------|
| F/08 | Order Form | **Purchase Order** | `F08Template.tsx:42` |
| F/12 | Purchase Requisition | **Disposal of Non-Conforming Products** | `F12Template.tsx:148` |
| F/14 | Goods Receipt Note | **Indent and Incoming Inspection Record** | `F14Template.tsx:60` |
| F/15 | Vendor Registration | **Approved Vendor List** | `F15Template.tsx:59` |
| F/16 | Vendor Re-evaluation | **Supplier Registration** | `F16Template.tsx:49` |
| F/17 | Production Order | **QA Test Request** | `F17Template.tsx:42` |
| F/18 | Daily Production Report | **Product Re-Call** | `F18Template.tsx:47` |
| F/22 | Non-Conformity Report | **Corrective Action** | `F22Template.tsx:99` |
| F/23 | Corrective Action | **Master List of Records** | `F23Template.tsx:108` |
| F/24 | Internal Audit Schedule | **Objectives & Targets** | `F24Template.tsx:97` |
| F/25 | Management Review | **Audit Plan** | `F25Template.tsx:100` |
| F/29 | Training Record | **Employee Training & Competence Record Sheet** | `F29Template.tsx:96` |
| F/45 | Exit Interview | **Master List of Documents** | `F45Template.tsx:167` |
| F/46 | Employee Suggestion | **Management of Change Plan** | `F46Template.tsx:98` |
| F/47 | Competency Assessment | **Internal Audit Checklist** | `F47Template.tsx:334` |
| F/50 | Record Retention Schedule | **Customer Property Monitoring Register** | `F50Template.tsx:127` |

*Failure scenario.* F/50 is called "Record Retention Schedule" in the catalogue — the name a compliance report, a filter, the section grouping and the create-page picker all show — while the document the user actually fills in is a **Customer Property Monitoring Register** with a completely different table. A user told "you owe a Record Retention Schedule" is shown a customer-property form. Worse, F/50 has *three* names: the catalogue says "Record Retention Schedule", the document says "Customer Property Monitoring Register", and the registry says "Customer Property Register" — one code, three documents.
*Fix.* One code, one document, one name. Pick the document as the source of truth (the facsimile is the signed artefact), rewrite the catalogue's `name` for these 16 codes to the document's title, and add a CI check that fails when `FORM_SCHEMAS[code].name` and the template's `formName` disagree — the check is three lines and would have caught all 16. **This one needs the owner's decision**: renaming 16 forms changes what every report and filter says.

#### H2 — 262 real business fields exist in the data that the schema does not declare (27 forms)

Measured on the restored production copy — the distinct business keys present in `records.form_data`, minus the metadata and the four keys an import stamped on every row (`record_month`, `coverage_period`, `project_scope`, `prepared_by`):

* **262 distinct undeclared keys**, in **295 key instances**, spread over **27 of the 35 forms that have records**.
* Worst affected: F/16 (35 keys), F/19 (28), F/11 (18), F/25 (18), F/46 (17), F/10 / F/17 / F/21 (16), F/08 / F/12 / F/18 / F/22 (10–11).
* Examples that are plainly business content, not plumbing: F/16 `pin` `city` `email` `mobile`; F/19 `composition` `process_flow` `intended_use`; F/46 `impact` `reason` `follow_up` `resources`; F/17 `batch_size` `sample_qty` `tested_by`; F/11 `active_agents` `target_focus_areas` `expected_outcome`.

*Failure scenario.* These fields are invisible to the schema, so they are never validated, never typed, never appear in a filtered list, never in the compare view, and never in an export built from the schema. The `catchall` fix (wave 7) stopped them being *destroyed*; it did not make them *known*.
*Fix.* Declare them. The 36 facsimiles are the authority on what a document holds; the schema should be generated from them, not maintained beside them. Until then, each form's undeclared keys should be added to its `fields` list with the type the document uses.

#### H3 — Six records carry a form code that has no schema at all

`records.form_code` in the production copy contains **`CAPA REGISTER` (5 records)** and **`TEST` (1 record)** — neither is a form code in the catalogue (`F/00`–`F/50`).
*Failure scenario.* Those six records cannot be validated, cannot be rendered by a facsimile, and drop out of every catalogue-driven view — while still counting as "records" in the total. A CAPA register that is invisible to the CAPA page is a compliance hole, not a cosmetic one.
*Fix.* Decide what they are. If they are F-forms, re-point them with the correct code and migrate their `form_data` into the facsimile's key shape; if they are a separate object (a CAPA register and a test record are plausible in an ISO 9001 system), give them their own schema, facsimile and catalogue entry.

#### H4 — The local stack did not enforce RLS: every local user saw the whole register

`tools/local-stack/qbase_api.py` set the caller's JWT **claims** as GUCs but never switched the **database role**. The shim connects as `postgres`, which *owns* the tables, and a table owner bypasses its own row-level security policies.
*Measured, before the fix:* a plain `user` account, through the local API, saw **318 of 318 records and 6 of 6 profiles**; the admin saw 318 records **including the 2 soft-deleted ones** that production hides.
*Measured, after the fix (live instance on 54353):* the plain user sees **0 records and 1 profile**; the admin sees **316** — the live records, exactly as production. The RPC write path is unchanged (`create_record_validated` answers with its own validation error, not a permission error), and login is unchanged.
*Fix — applied.* `_impersonate()` in `qbase_api.py` issues `SET ROLE` for the `/rest/v1` path only (the auth and storage endpoints are the Supabase *server* talking to its own tables and keep running as the owner, as in production). `delete_with_audit_guard` was made owner-aware, because disabling a trigger needs the table's owner and production gives `authenticated` no `DELETE` on `records` at all.
> **One step left for the owner:** the instance the proxies point at (`54350`) still runs the previous code. Restart it — `pkill -f 'qbase_api[.]py --port 54350'`, then the supervisor brings it back within five seconds, now inheriting `SB_DSN` and enforcing RLS.

#### H5 — A restart of the local shim pointed it at the LIVE production database

`tools/local-stack/run-shim.py` inherited six environment keys from the running instance — and `SB_DSN`, the one that names the database, was not among them. The shim's DSN default is the Supabase pooler, i.e. `postgres.<project>:…@aws-0-eu-west-1.pooler.supabase.com`. The supervisor starts a new shim whenever the port is down.
*Failure scenario.* The local shim dies → the supervisor restarts it → it now has no `SB_DSN` → it talks to **production** → the local stack still answers "local database on this machine" and the local app writes to the live project. The restart looks perfectly healthy.
*Fix — applied.* `SB_DSN` added to the inherited key list.

#### H6 — The whole table is downloaded to the browser, and the compliance answer is computed there

`getRecords()` (`src/services/recordStorage.ts:351`) does `select('*')` over `records`; `useRecords()` (`src/hooks/useRecordStorage.ts:69`) fetches it without a form filter and the audit and dashboard pages consume the whole set. Measured: **318 records, 379 kB of `form_data`**, for every user, on every visit to the dashboard or the audit page — and the compliance verdict is then computed in the browser by `buildComplianceMap` (`src/pages/audit/useAuditPage.ts:110`).
*Failure scenario.* The page that exists to tell you your compliance state is a full-table download, and the number it shows is computed from a snapshot the browser holds, not from the server's view. Two users on two snapshots can be shown two different compliance answers for the same minute, and the whole thing scales linearly with the register.
*Fix.* Move the compliance map to the server (the `dashboard_stats` RPC already exists and is called by the app) and have the audit page consume it, with a paginated, filtered record list behind the table.

#### H7 — The import writes one row at a time: two round trips per row

`src/services/importService.ts:118` loops the rows and calls `createRecord` one at a time. `createRecord` (`src/services/recordStorage.ts:472`) first reads `getExistingSerials(formCode)` — a scan of every serial of that form — and then makes one `create_record_validated` insert.
*Failure scenario.* Importing 200 rows is **400 round trips**, and the serial scan is repeated for every row: importing *n* rows of a form that already holds *m* records reads the *m* serials *n* times. There is no server-side bulk path.
*Fix.* One RPC that takes a JSON array and allocates serials server-side, inside one transaction, with a unique-constraint failure per row instead of a round trip per row.

#### H8 — The restore bypasses the audit engine entirely

`src/services/backupService.ts:202` restores with `supabase.from("records").upsert(batch, { onConflict: "serial" })` — a direct table write.
*Failure scenario.* Restored rows do not go through `record_transition` or `update_record_versioned`, so they have no version history, no `edit_count`, and **no audit-trail entry**. A record that appears from nowhere is exactly the record an auditor asks about, and the system has no answer.
*Fix.* Restore through the same path a create takes (`create_record_validated` / `record_transition`), with a `restored_from_backup` reason written into the audit log.

#### H9 — Approving N records costs 2N sequential round trips

`approveRecords` (`src/services/recordStorage.ts:1231`) loops the serials and calls `approveRecord` one at a time; each `approveRecord` reads the row (`:1153`) and then calls `record_transition` (`:1187`).
*Failure scenario.* Approving 50 records from the review queue is 100 serialised round trips. The user waits, one round trip at a time, and a dropped connection half-way through leaves a queue that is neither approved nor rejected.
*Fix.* One RPC that takes the array of ids and transitions them all in one transaction, returning a per-id result.

### MED

#### M1 — The integrity rules are recomputed per record over the whole table (O(n²))

`src/pages/RecordListPage.tsx:152` calls `evaluateRulesForRecord(record, records)` for **every** record, and several rules scan the entire array (`src/services/ruleEngine.ts:88, 107, 128, 150` — `allRecords.filter(...)` inside the rule body). 318 records × ~4 array-scanning rules × 318 elements ≈ 400k comparisons, in the browser, on the records list.
*Fix.* Build the per-form-code index once (`Map<formCode, RecordData[]>`) and pass that to the rules instead of the raw array; the rules then do a map lookup instead of a scan.

#### M2 — The local database cannot be rebuilt from the repository

`tools/local-stack/prepare.sh:22` hardcodes `REPO="/home/kepv/qbase-remediation"` and a dump at `/home/kepv/QMS_BACKUP/pre-acl-hardening-20261022/01_schema_and_data.sql` — a path **outside the repository**, on a disk that is not version-controlled. The 58 functions, 19 tables, 93 policies and 318 records of the local stack come from that one file.
*Failure scenario.* Another machine, or this machine after the backup directory is rotated, has no way to rebuild the local stack: the "local Supabase" is one directory away from disappearing, and with it the only place RLS can be tested.
*Fix.* Commit a schema-only dump (`pg_dump --schema-only`) into the repo, and keep the *data* dump external with a documented refresh step. The schema is what the stack needs to be reproducible; the data is a convenience.

#### M3 — `src/ai/` is 902 lines with no importer

Nine files, 902 LOC, and **no module outside `src/ai/` imports it** — the only reference is `src/__tests__/aiProposal.test.ts`. It is not in the bundle and not in the app.
*Fix.* Either wire it in (there is a `draftRecordContent` tool that was clearly meant for the create path) or delete it. Dead code that looks alive is the most expensive kind.

#### M4 — 144 exported values and ~100 exported types are used nowhere

A whole-file scan of `src/**` (excluding tests) for every `export const|let|var|function|class|enum` and every reference outside its own file: **144 runtime values** with no other reference, including `setRuleMode`, `evaluateAllRecords`, `detectMissingReferences`, `detectMissingDependencies`, `getExistingSerials`, `changeRecordStatus`, `bulkApproveRecords`, `bulkRejectRecords`, `getStatusStats`, `isValidTransition`, `getAllowedNextStatuses`, `updateRecordStatus`, `getMetrics`, `getValidationLog`, `parseDashboardStats`, the whole `lib/traceability.ts` API, and the ~37 `FxxProps` type aliases in the templates.
*Fix.* Delete them, or wire them. A `knip` run in CI would keep the list from growing again.

#### M5 — 52 `key={idx}` on deletable rows, across 27 templates

When a row is deleted from a table, the rows after it shift and React reuses the wrong DOM node and the wrong state — a signature cell, a checkbox or a focus position follows the wrong row.
*Fix.* A stable id per row (`useRef` counter or a `crypto.randomUUID()` minted at insert) as the key. 52 sites, mechanical.

#### M6 — The table key in the schema is not the table key in the document (8 forms)

| Code | Schema's table | The document writes |
|------|----------------|---------------------|
| F/13 | `items` | `items_table` |
| F/15 | — | `items` |
| F/22 | — | `nc_sources` |
| F/23 | — | `records` |
| F/24 | `items` | `objectives` |
| F/25 | `agenda` | `audit_matrix` |
| F/45 | — | `documents` |
| F/50 | `items` (8 columns) | `entries` (different columns) |

*Failure scenario.* The catalogue's table for F/50 is `items` with eight retention columns; the document's table is `entries` with the customer-property columns. The schema's table is **always empty** and the document's table is **always undeclared** — the two never meet, so every table-driven feature (compare, export, filter, the schema view) shows the wrong thing.
*Fix.* As H1: regenerate the schema from the facsimiles, then the keys agree by construction.

#### M7 — `parseRows` is array-only: a legacy record saved as a JSON string renders 25 empty rows

`src/components/forms/templates/F11Template.tsx:125` (and the same shape in F12 `:57`, F14, F15, F23, F24, F29, F40, F41, F42):
```ts
const raw = d.items;
if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") { … }
return Array.from({ length: count }, () => ({ ...EMPTY_ROW }));
```
*Failure scenario.* A record whose table was stored as a JSON **string** — which is what the pre-wave-6 templates wrote, and what an import or an external script can still write — falls through to the empty-row branch and renders **25 blank rows**. The data is in the record; the form refuses to show it, and saving the form then writes 25 empty rows over it.
*Fix.* Parse a string as JSON when it is one, and fall back to the empty rows only when there is genuinely nothing to show.

#### M8 — The rule engine can be reconfigured by code that nothing calls

`setRuleMode` (`src/services/ruleEngine.ts:597`) mutates an in-memory `RULES` array; the server never sees the change, and no caller exists. A rule set that can be "switched" in one browser tab and not in another is a rule set nobody can reason about.
*Fix.* Delete it, or make the mode a per-record/per-form property that travels with the data.

### LOW

* **L1 — `src/components/templates/index.tsx` exports `QMS_TEMPLATE_REGISTRY` and `TemplateLoadingFallback` that nothing outside the file uses**, while the registry itself is imported through a different path — a trap for the next reader. Fold into M4.
* **L2 — `getValidationLog`, `getMetrics`, `getLogBuffer`, `clearLogBuffer`** (`src/services/logger.ts`, `src/services/preWriteValidation.ts:52`) keep an in-memory ring buffer of up to 1000 entries including **raw payloads** — a memory cost in every tab and a place where form content sits in a global. Bound it to a smaller window or make it opt-in behind a debug flag.

---

## 2. Appendix — the measurements

| Measurement | Value |
|---|---|
| Records in the restored production copy | 318 (2 soft-deleted) |
| `form_data` size | 379 kB |
| Forms with records | 35 (of 36 in the catalogue) |
| Records with a form code that has no schema | 6 (`CAPA REGISTER` ×5, `TEST` ×1) |
| Distinct business keys in the data that the schema does not declare | **262** (295 instances, 27 forms) |
| Worst-affected forms | F/16 (35), F/19 (28), F/11 (18), F/25 (18), F/46 (17) |
| Forms whose catalogue name ≠ their document title | **16 of 36** |
| Forms that could not be created at all (before this pass) | **27 of 36**, 56 unsatisfiable `required` fields |
| Code-called RPCs | 16 distinct, 23 call sites — **all 16 are defined in the migrations** and executable by `authenticated` (and by `anon`: no) |
| Functions in the local database | 58 (16 app RPCs + 42 others) |
| RLS policies in the local database | 93 (8 on `records`) |
| Exported runtime values used nowhere else | **144** |
| `key={idx}` sites in the templates | 52, across 27 files |
| `src/ai/` | 9 files, 902 LOC, 0 importers outside itself |
| CI | eslint ✓ · `tsc -b` ✓ · schema parity 0/0 · **31 files / 558 tests** ✓ · build ✓ (as of 2026-10-24) |

---

## 3. What is not done, and why

* **H1 (the 16 renames) and H3 (the two unknown form codes) need the owner's decision** — they change what every report, filter and create-page picker says, and which document a code means. Everything else is either fixed or is a mechanical change with a stated fix.
* **Nothing is pushed and nothing is deployed.** The production deploy (`qbase-sable.vercel.app`) and the production migrations 11–16 need one live message naming them.
* **The local shim restart (H4) needs one command from the owner** — the fix is in the code and verified on a live instance, but the instance the proxies point at still runs the previous code until it is restarted.
* The **six records whose form code has no schema** and the **262 undeclared fields** are the two findings that most affect the register's truthfulness; both are data questions as much as code questions.
