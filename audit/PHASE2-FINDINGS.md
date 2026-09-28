# QBase — Phase 2 findings (code ↔ production database)

**Baseline under audit:** `503fb8bf6f87e04a71ab74791e649db44cb30feb` — the commit Vercel
Production deployment `dpl_gX2EukE7oLRJGYWFhvL2tc9u9UDo` was built from, branch `main`,
repo `KEPV18/qbase`. Seeded verbatim into this repository (commit `e0cf839`, 315 files).

**Production schema authority:** the PostgREST OpenAPI document served by
`https://iouuikter...supabase.co/rest/v1/` (17 tables, 24 RPCs). It is a complete
server-generated column list, and — contrary to an earlier note in this audit — it
**does** carry RPC argument lists in `paths./rpc/<n>.post.parameters[body].schema`.
TypeScript `types.ts` was *not* treated as evidence of the database, and a successful
`select('*')` was *not* treated as proof of parity.

**Method:** `audit/schema-parity.mjs` extracts every table, column and RPC the deployed
source names, attaches reachability computed from the real entry points (`src/main.tsx`
per `index.html:33`, plus `api/**` and `server/*.js`), and diffs all of it against the
OpenAPI. 238 source files scanned, 175 reachable.

---

## P0 / P1 — confirmed runtime-breaking mismatches

Every item below is on a **reachable** path. Evidence is a file:line plus the production
signature it contradicts.

### 1. Record creation fails entirely — P1 (arguably P0: the primary write path)

`src/services/recordStorage.ts:532` calls:

```
supabase.rpc('create_record_validated', {
  p_form_code, p_form_name, p_form_data, p_status, p_serial: 'auto',
  p_section, p_section_name, p_frequency,
  p_approval_status: approvalStatus,   //  <-- not a parameter
  p_department: recordDept,            //  <-- not a parameter
})
```

Production's function accepts exactly nine parameters:

| | |
| --- | --- |
| required | `p_form_code`, `p_form_name`, `p_form_data` |
| optional | `p_created_by`, `p_frequency`, `p_section`, `p_section_name`, `p_serial`, `p_status` |

PostgREST resolves a named-argument call by matching the supplied key set against the
function's parameter list in its schema cache. A key that is not a parameter means **no
function matches**, and the request fails with `PGRST202` *before the body executes* —
so this does not merely degrade the write, it prevents it. This mechanism was demonstrated
empirically against production: `POST /rest/v1/rpc/create_record_validated` with a
deliberately impossible key returns

```
404 PGRST202  Could not find the function public.create_record_validated(p_qbase_probe_zzz_not_a_real_param)
```

`p_approval_status` and `p_department` are not in the parameter list, so they make the
resolution fail in exactly the same way.

*Correction to an earlier claim in this audit:* the two extra arguments were previously
described as producing an `approval_status`-column error. The actual failure is
argument-resolution, and it is total.

### 2. Record editing fails — P1

`src/services/recordStorage.ts:686-687` builds the update payload and then assigns:

```
(updateData as Record<string, unknown>)['approval_status'] = merged._approvalStatus;
(updateData as Record<string, unknown>)['department']       = merged._department;
```

`records` in production has 17 columns and **neither** of these. PostgREST answers a write
naming an unknown column with `PGRST204` (schema-cache miss), so the edit is rejected.
Note the payload is assembled in a variable and assigned by bracket notation, so an
object-literal-only scan does not see it — this is why the scanner collects both forms.

### 3. Approve fails — P1

`src/services/recordStorage.ts:873`:

```
supabase.from('records').update({
  approval_status: 'Approved',
  last_modified_by: ..., edit_count: ...,
}).eq('id', ...)
```

Same unknown column; `PGRST204`. This path also gates on
`row.approval_status || 'Pending_Approval'`, and since the column does not exist the
guard never passes — the function returns "not pending approval" before it can fail on
the write.

### 4. Database Import fails — P1

`src/services/importService.ts:141` inserts `form_type` and `revision_no` into `records`.
Neither column exists in production (`PGRST204`). Reachable from
`src/pages/DatabaseManagementPage.tsx`.

---

## P4 — mismatches on unreachable / test-only code

Reported as P4 rather than P1 because reachability was computed, not assumed.

| Item | Location | Note |
| --- | --- | --- |
| `records.locked_by`, `records.locked_at` | `src/hooks/useRecordEditor.ts:42` | columns absent from production |
| `rpc lock_record_for_edit` | `src/hooks/useRecordEditor.ts:72` | RPC absent (probe-confirmed) |
| `rpc unlock_record` | `:88`, `:140` | RPC absent (probe-confirmed) |
| `rpc save_record_version` | `:127` | RPC absent (probe-confirmed) |
| `rpc get_record_version_history` | `:158` | RPC absent (probe-confirmed) |
| `rpc restore_record_version` | `:175` | RPC absent (probe-confirmed) |

`useRecordEditor.ts` is imported by nothing. It targets a record-versioning / pessimistic
locking design that was **never deployed**: no migration in the deployed chain defines
those functions, and the five are absent from the live schema. The same file also
destructures the error away (`.select(...)` result read without its `error`), so even if
it were reachable it would fail silently rather than loudly.

---

## P3 — generated types drift

| Table | Drift |
| --- | --- |
| `profiles` | `department` exists in production, not declared |
| `records` | `project_id` exists in production, not declared |
| `retention_summary` | declared in `types.ts`, **absent from production** (0 mentions anywhere in the OpenAPI document) |
| `upcoming_reviews` | declared in `types.ts`, **absent from production** (0 mentions) |

`retention_summary` and `upcoming_reviews` are declared but have no source reference and
no production object — they are stale generated-type entries for views that do not exist.
Note that `types.ts` does **not** declare `records.approval_status`; the app writes that
column through casts that bypass the types entirely.

---

## P1 — production objects with no migration provenance (Phase 6 input)

`create_record_validated` and `update_record_with_lock` **exist in production** but are
defined by **no migration in the deployed chain** (13 files, none mention either). They
were created out-of-band. `update_record_with_lock`'s live signature is:

```
required:  p_id uuid, p_form_data jsonb, p_expected_edit_count integer
optional:  p_last_modified_by uuid, p_modification_reason text, p_status record_status_enum
```

That is optimistic concurrency control (compare-and-set on `edit_count`). It is exposed by
production and **called by nothing in the deployed code** — while `updateRecord` instead
does a plain `.update()` naming two columns that do not exist.

---

## Intended design — what the evidence establishes

This is not a guess; it is the only reading consistent with all of the following:

1. `supabase/migrations/20250611_enterprise_rbac.sql` is the **only** migration that adds
   `records.approval_status` and `records.department` (plus `department` to `profiles` and
   `user_roles`), and it backfills `records.department` from `section_name`.
2. `supabase/migrations/20260616_fix_missing_columns.sql` **re-adds** `department` to
   `profiles` and `user_roles` — and deliberately **not** to `records`. A re-add is only
   necessary if the earlier migration never ran.
3. `supabase/migrations/20260622_fix_get_empty_records.sql:4` states outright:
   *"The records table has NO department column."*
4. Production has `profiles.department` and `user_roles.department`, but **no**
   `records.department` and **no** `records.approval_status`.

**Conclusion:** `20250611_enterprise_rbac.sql` was **never applied to production**, and its
two `records` columns were deliberately never re-supplied. The intended final design is:

- `records.status` (type `public.record_status_enum`) is the **single** status authority.
  There is no second approval column.
- **No** `records.department`; departments live on `profiles` / `user_roles` and are read
  through the `current_user_department` RPC.
- Record creation goes through `create_record_validated` (9 parameters).
- Record edits go through `update_record_with_lock` with `p_expected_edit_count`
  (optimistic locking), not a blind `.update()`.
- `record_versions`, `locked_by`, `locked_at` and the 5 versioning RPCs were never
  deployed at all.

**Therefore the remediation is to correct the application to match production's design**,
not to add `approval_status`/`department` columns to production. Adding them would
*reintroduce* the RBAC-era design that a later migration explicitly and deliberately
recorded as absent.

One product decision remains and is escalated in the final report: the Approval Queue UI
and the "employee may edit only Draft records" rule are user-facing features built on the
missing column. They can be re-expressed on top of `records.status` with no schema change,
or the approval workflow can be designed and delivered properly — that choice is a product
decision, not a technical one.

---

## Toolchain

| File | Purpose |
| --- | --- |
| `audit/schema-parity.mjs` | code ↔ production parity, with computed reachability |
| `audit/rpc-signature-probe.mjs` | RPC existence/absence, read-only and non-executing |
| `audit/schema-parity-report.json` | machine-readable findings |
| `audit/rpc-signatures.json` | raw probe responses |

### Corrections made to this audit's own tooling, recorded for honesty

- `objectKeys()` split on commas at `depth === 1` while callers passed the content
  *inside* the braces, where top-level commas are at depth 0. It therefore captured only
  the **first** key of every payload. This produced false "missing required argument"
  findings and **hid** the real unknown-argument defect. Fixed to depth 0.
- `types.ts` parsing matched table blocks at 6-space indent without bounding them to the
  `public` schema, so `graphql_public.graphql` was reported as a phantom public table. Fixed.
- `api/auth/*.js` were not treated as entry points (non-recursive scan). Fixed.
- The first version's entry-point resolution produced only `api`/`server` roots, marking
  the entire `src/` tree unreachable and everything P4. Fixed.
- `rpc-signature-probe.mjs` initially labelled a PostgREST `hint` as "the real signature".
  The hint is a **name-similarity suggestion**, not an argument list. Verdict logic
  corrected: hint present ⇒ the name did not resolve ⇒ the RPC is absent.
