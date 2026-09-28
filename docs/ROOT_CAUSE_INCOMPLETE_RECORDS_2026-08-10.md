# 🔍 ROOT-CAUSE AUDIT — How Incomplete Records Reached Supabase

**Date:** 2026-08-10
**Auditor:** QMS Man
**Scope:** Complete record creation/update pipeline — UI → service → RPC → DB
**Status:** REPORT ONLY. No production changes made. F/11-002/003/004/013 untouched.

---

## 1. Executive Summary

The system was NEVER able to prevent incomplete records because **validation exists only as
voluntary client-side checks backed by FOUR divergent, unsynchronized schema definitions**.
The database itself enforces nothing beyond `form_data IS NOT NULL` — any JSON object passes.

Incomplete records did not "bypass" one gate; they entered through **three permanently open doors**:
1. Raw SQL `UPDATE ... SET form_data = '...'::jsonb` (migrations/SQL editor) — zero validation,
   performed by service_role, immune to RLS.
2. Client-side scripts using the **service role key** API (.update()/.insert()/.upsert()) — bypass
   RLS AND skip the app's validation modules (they never call preWriteValidation).
3. The app's own unvalidated writes (statusService.updateRecordStatus, backupService.importBackup,
   bulkCreateMissingMonths places minimal placeholder records).

All three doors remain open today, because the server-side validator that exists
(`_validate_form_required_fields` behind `create_record_validated`) is **not the single authority**:
- It is not invoked by the update path at all.
- It is not invoked by status updates, backup restore, or any script.
- Its required-field map is **stale** (tests show it still demands old F/30 keys `period/criterion/score/overall_score/evaluator`
  and F/19 keys `project_name/client_name/description` that the DOCX-faithful records no longer use).

---

## 2. Layer-by-Layer Findings

### 2.1 Required fields definition — FOUR divergent sources (CL/1)

| Layer | File | Behavior |
|---|---|---|
| UI schema | `src/data/formSchemas.ts` | `required?: boolean` flags; used by DynamicFormRenderer & DataSanitizer |
| Zod validation | `src/schemas/formValidation.ts` | Most fields `.optional().default('')` → near-empty records PASS |
| Pre-write | `src/services/preWriteValidation.ts` | Zod-based; called by createRecord/updateRecord |
| Server RPC | `_validate_form_required_fields` (DB, unversioned) | Hardcoded stale key map; NOT called on update |

**Proof of divergence:** parser diff of `formSchemas.ts` vs `formValidation.ts` shows every form with
UI-required keys missing entirely from the Zod truly-required set (e.g. F/30 UI requires
`evaluation_matrix/total_marking/further_training_need`, but live probe of the RPC validator demands
`criterion/score/overall_score/evaluator` — the OLD 4-point keys). The schema was migrated in the UI
and templates but **never pushed down to Zod or the DB validator**.

### 2.2 DB constraints — form_data is a free-for-all (CL/3–4)

OpenAPI introspection of production `records` table:
```
form_data | jsonb | NOT NULL   ← only constraint: non-null. No CHECK. No JSON schema.
```
A JSONB column accepts `{}`, `{"serial":"x"}`, `{"garbage":"100%"}` alike. **Required keys can be
silently omitted with zero DB error.** There is no trigger, no constraint, no generated column.

### 2.3 INSERT / UPDATE inventory — 7 distinct paths (CL/6–7)

| # | Path | Validation | DB-level guard | Status |
|---|---|---|---|---|
| 1 | UI Create → `createRecord()` → `create_record_validated` RPC | preWriteValidation (frontend Zod) + RPC validator (stale keys) | RLS | ✅ partially enforced |
| 2 | UI Update → `updateRecord()` → `supabase.from('records').update()` | preWriteValidation (frontend only) | **RLS only** — no RPC, no DB check | 🔴 OPEN |
| 3 | Status update — `statusService.updateRecordStatus()` raw `.update({form_data})` | **NONE** | RLS | 🔴 OPEN |
| 4 | Backup restore — `backupService.importBackup()` `.upsert(batch, onConflict:'serial')` | **NONE** | RLS | 🔴 OPEN |
| 5 | `bulkCreateMissingMonths()` → createRecord with minimal payload | passes Zod (all optional) + stale RPC validator | RLS | ⚠️ weak |
| 6 | SQL migrations (`20260622_canonical_records_backfill.sql`) `UPDATE records SET form_data=$json$...$json$` | **NONE** | NONE (SQL bypasses RLS) | 🔴 OPEN |
| 7 | External scripts with service-role key (`/tmp/*.js`, repo `migrate_*.py`, `fix_*.py`) | **NONE** — never call preWriteValidation | RLS bypassed | 🔴 OPEN |

### 2.4 Where the SPECIFIC flagged data came from (CL/2)

**F/11-002 / F/11-003 / F/11-004 garbage rows — PROVEN SOURCE:**
`supabase/migrations/20260622_canonical_records_backfill.sql` contains the literal payloads:
```
F/11-002: items:[{"product":"Date 🡪 01/02/2026"}, {"product":"Month 🡪 February 2026"},
          {"product":"Planning For Products"}, {"product":"Actual Completion"}, {"product":"Qty."},
          {"product":"Average achieved daily output"}, ... {"product":"100%"}, ...]
```
DOCX header rows ("Planning For Products", "Qty.", "100%") were ingested AS DATA items. Raw SQL
UPDATE — no validation of any kind. These exact strings are still in production today.

**F/11-013 missing signature — PROVEN SOURCE:**
Live check: `form_data` has NO `signature` key (sibling records have
`"signature":"Ahmed Khaled / date"`). NOT in the migration — introduced separately by an unverified
script/update. Confirms door #2 or #7 (script with service role).

### 2.5 Integrity audit — 293 active records, app's own schema (CL/8)

Replicated DataSanitizer's exact scan (FORM_SCHEMAS required fields vs parsed record):
**98 / 293 records (33%) flagged missing ≥1 UI-required field**, across 18 forms. Segmentation:

**REAL data gaps (fields genuinely absent from form_data):**
- F/11 (13/13): `year` missing (data uses `record_month`), plus garbage `items` rows in 002/003/004
- F/21 (5/5): `action_items`, `responsible` — real gaps
- F/47 (1/1): `checklist_items`, `audit_ref` — real gaps
- F/45 (1/1): `title`, `doc_number`, `current_revision` — real gaps
- F/48 (5/9): `nc_count` — real gaps on 5 records
- F/13 (1/1): `qty` — real gap (qty buried in items_table rows)
- F/14 (1/1): `qty`, `inspectionStatus` — real gaps
- F/15 (1/1): `scopeOfSupply`, `approvalCriteria` — real gaps
- F/22 (2/3): `date` — real gap (uses identified_date; UI outdated)
- F/34 (1/1), F/37 (1/1), F/25 (2/2), F/23 (1/1), F/24 (6/6), F/28 (18/18), F/35 (7/7), F/44 (32/32 — qualifications_required naming drift)
- **F/30 (57/57): NO `employee_id`** — but every record has `employee_name`; employee_id is a UI-schema
  requirement not in DOCX → schema drift, but still flagged by app rules.

*(Full per-record list captured in /tmp audit scripts; report-level detail below.)*

**Why DataSanitizer showed "0 incomplete" in the last live check:** it scans `allRecords`
loaded through the app with the CURRENT UI schema — the UI schema required-flag set was being
kept in sync with records that PAYLOAD patches already touched, and the sanitizer treats
`year/items` style drift as satisfied once any value exists. The sanitizer is also a
**detect-after-the-fact** tool (read-only dashboard), exactly what this task says is insufficient.

---

## 3. Root Cause — 5-Why

1. **Why did F/11-002/003/004 have garbage?** Migration payload ingested DOCX text rows as data.
2. **Why did the migration payload pass?** Raw SQL UPDATE with literal JSONB — no validation can run.
3. **Why is there no validation at the DB?** `form_data` is a plain JSONB with no CHECK/trigger; the
   only validator is an optional RPC that the write paths may ignore.
4. **Why can write paths ignore it?** Validation is decentralized: frontend Zod, preWrite fn, RPC —
   separate copies that drifted apart; scripts and SQL legitimately never had to call any of them.
5. **Why did the drift happen?** The canonical DOCX migration (templates/formSchemas) was done at the
   frontend layer; the Zod schemas and the DB RPC were never regenerated from the same source.
   **No single source of truth for "required fields per form" exists.**

---

## 4. Root Cause Statement

**Incomplete records entered because there is no enforced, single, authoritative schema at the point
of write.** The database accepts any JSONB; the service layer has a frontend-only, drifted-Zod check;
the create-only RPC validator is stale and uninvoked for updates/scripts/SQL; and the backfill tooling
(which contributed most of the volume, including the raw-SQL migration) bypassed all of it. The
DataSanitizer is a reactive dashboard — it was never a gate.

---

## 5. Proposed Fix (NOT implemented — awaiting approval)

Goal: make it technically impossible for an incomplete record to enter.

### 5.1 Single source of truth (Pillar 4 extension)
- Define `CANONICAL_REQUIRED_FIELDS` in ONE file (e.g. `src/schemas/canonicalSchema.ts`) generated
  from the DOCX-faithful templates — the 4 pillars' canonical keys (F/30 `evaluation_matrix`,
  F/40 `items[]`, etc.).
- Regenerate `formSchemas.ts` required flags, `formValidation.ts` Zod, and the DB RPC map FROM this file.

### 5.2 DB-level hard gate (blocks ALL paths incl. SQL/scripts)
- Replace ad-hoc RPC map with a **schema-driven constraint function**:
  - Add `BEFORE INSERT OR UPDATE` trigger on `public.records` calling a SECURITY DEFINER
    function `enforce_form_data_completeness()` that checks required JSONB keys per `form_code`
    (map stored in a `form_required_fields` table, editable via migration; not hardcoded).
  - `RAISE EXCEPTION 'incomplete record %: missing %', NEW.serial, missing` on failure.
  - Also add CHECK `form_data IS JSON OBJECT AND jsonb_typeof(form_data)='object'`.
- This blocks raw SQL, service-role scripts, status updates — every path — because triggers fire
  regardless of role, unless explicitly `session_replication_role` (not used).

### 5.3 Close the open write paths
- `statusService.updateRecordStatus` → route through the same trigger validation (it will be,
  automatically, via trigger) + keep merge semantics.
- `backupService.importBackup` → same automatic protection + pre-validate batch before upsert.
- `bulkCreateMissingMonths` → full canonical payload (all required keys with placeholder defaults)
  instead of minimal `{coverage_period, record_month}`.
- Update path → call `update_record_with_lock` RPC (or rely on new trigger for enforcement).

### 5.4 Batch backfill gate (CL/10)
- New shared script `scripts/backfillWithValidation.js`: reads an input JSON array, validates EVERY
  payload against the canonical schema BEFORE any write; aborts entire batch with a list of failing
  serials on the first incomplete payload. Add to AGENTS.md Record Operation Verification Protocol
  as step 0 ("VALIDATE-BEFORE-WRITE").

### 5.5 Reconciliation (after approval only)
- Fix real gaps from §2.5 (F/21 action_items, F/47 checklist_items, F/45, F/48 nc_count, etc.)
  and F/11 garbage items — while keeping F/11-002/003/004/013 frozen until explicit approval.
- Align UI schema to canonical keys to eliminate drift false-positives.

**Explicitly NOT done now:** no production migration, no trigger creation, no data fixes. The
proposed DB trigger SQL, canonical schema file, and backfill gate are ready to be drafted on approval.

---

## 6. Evidence Index

| Evidence | Location |
|---|---|
| Raw SQL payloads with "100%" garbage | `supabase/migrations/20260622_canonical_records_backfill.sql` |
| records OpenAPI (form_data NOT NULL, no CHECK) | `/tmp/openapi_sr.json` |
| RPC validator stale-key proof (F/30, F/19 probes) | `/tmp/probe_validator.py` output |
| Live incomplete scan (98/293) | `/tmp/audit_appschema.js` |
| Canonical-map scan (89/293 incl. drift) | `/tmp/audit_live_canonical.js` |
| F/11-013 signature absent | `/tmp/verify_f11_final.js` output |
| Write-path inventory (code refs) | recordStorage.ts:412/596/691, statusService.ts:96, backupService.ts:195, importService.ts:141, bulkCreate.ts:50, migration:208+ |

---

*QMS Man guards the standard — report only, no changes during audit.*