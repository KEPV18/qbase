# QBase — Phase 2 findings (code ↔ production database)

**Baseline under audit:** `503fb8bf6f87e04a71ab74791e649db44cb30feb` — the commit Vercel
Production deployment `dpl_gX2EukE7oLRJGYWFhvL2tc9u9UDo` was built from, branch `main`,
repo `KEPV18/qbase`. Seeded verbatim into this repository (commit `e0cf839`, 315 files).

**Production schema authority:** the PostgREST OpenAPI document served by
`https://iouuikter...supabase.co/rest/v1/` (17 tables, 24 RPCs). It is a complete
server-generated column list, and it **does** carry RPC argument lists in
`paths./rpc/<n>.post.parameters[body].schema`. TypeScript `types.ts` was *not* treated as
evidence of the database, and a successful `select('*')` was *not* treated as proof of parity.

**Production data authority:** a read-only forensic read (`audit/prod-data-forensics.mjs`),
318 records, 6,523 audit rows, taken 2026-09-28.

**Method:** `audit/schema-parity.mjs` extracts every table, column and RPC the deployed source
names, attaches reachability computed from the real entry points (`src/main.tsx` per
`index.html:33`, plus `api/**` and `server/*.js`), and diffs all of it against the OpenAPI.
238 source files scanned, 175 reachable. Four further read-only dimensions (write-loss,
data-movement, RLS/authorisation/secrets, build/tooling) were audited separately and their
load-bearing claims re-verified by hand before being recorded here.

---

## 0. CORRECTION — the root cause of broken record create **and** edit

An earlier revision of this document recorded the record-creation failure as a PostgREST
argument-resolution error and the edit failure as an unknown-column error. Both are real, but
**neither is reached**: an earlier failure aborts the write first.

`src/services/preWriteValidation.ts:126` calls `validateFormData(formCode, normalizedData)`.
That identifier is **defined** (`src/schemas/formValidation.ts:72`) and **imported** by
`DynamicFormRenderer.tsx` and `importService.ts` — but `preWriteValidation.ts` does **not**
import it, does not define it, and no ambient declaration binds it (verified by exhaustive
grep over `*.ts`/`*.tsx`/`*.d.ts`/`*.js`/`*.mjs` plus a search for `declare global` /
`declare function`). The file's only imports are `log`, `FORM_ZOD_SCHEMAS`, `z`, and the type
`RecordData`.

Line 126 is reached on **every** call whose form code exists in `FORM_ZOD_SCHEMAS` (the only
early return is the schema-missing branch at `:78-94`), and it sits inside no `try`/`catch`.
So `preWriteValidation()` **throws `ReferenceError`** for every real form. It is called at:

* `src/services/recordStorage.ts:430` — inside `createRecord`
* `src/services/recordStorage.ts:677` — inside `updateRecord`

**Therefore record creation and record editing both fail with an exception**, before the RPC
call and before the update payload is built. The argument-drift and phantom-column defects
recorded below are *downstream* of this and will surface next once it is fixed.

The call site reads `zodResult.success`, `zodResult.errors` and `zodResult.data` (`:128`,
`:130`, `:162`) — the shape of a **Zod `safeParse` result**, not of `formValidation.validateFormData`,
which returns `{ valid, errors, sanitizedData }`. The correct repair is to validate with
`FORM_ZOD_SCHEMAS[formCode].safeParse(...)` (already imported) rather than a second wrapper.

**Why the build did not catch it:** `npm run build` is `vite build` (esbuild transpile-only,
no type-check). `npm run typecheck` is bare `tsc --noEmit` against a solution-style
`tsconfig.json` whose only content is `"files": []` plus `references` — not `tsc -b`, so it
type-checks nothing. (Config read directly; not executed, because `node_modules` is absent in
this copy and no install was performed.) The type error is invisible to both the build and the
typecheck script.

---

## P0 — catastrophic

### P0-1. The production service-role key is committed to a public repository

Eight tracked files carry a JWT literal that decodes to `"role":"service_role"` for project
ref `iouuikteroixnsqazznc`. Verified **by digest, not by reading the value**: each literal's
SHA-256 was compared against the SHA-256 of the live `SUPABASE_SERVICE_ROLE_KEY` held in the
operator env file. All eight match the live key.

| File | Where |
| --- | --- |
| `comprehensive_audit.mjs` | `:6` |
| `comprehensive_audit.cjs` | `:6` |
| `qa_incomplete_check.mjs` | `:2` |
| `qa_test_check.mjs` | `:2` |
| `inspect_f11_data.mjs` | `:5` |
| `inspect_f11_data.js` | `:5` |
| `inspect_f11_full.mjs` | `:4` |
| `inspect_f11_bad.mjs` | `:4` |

Impact: a service-role key bypasses RLS on every table and carries `auth.admin` capability.
It is the highest-privilege credential for this database. It is in the deployed commit, so it
is in every clone and in git history, and `.github/workflows/mirror-to-work.yml:43` mirrors the
repository with `--force --prune` to a second remote (`github.com/akhdev185/qms-core.git`).
The client bundle is **not** affected — there is no `eyJ` substring anywhere under `src/`,
`api/`, `server/`, `public/` or `supabase/`, and `vercel.json` serves only `/api/*` plus
`index.html`.

**Not auto-rotated.** Rotation is a production-affecting, irreversible action and is escalated
in the final report with a prepared procedure.

### P0-2. An unauthenticated, deployed endpoint exposes a password store

`api/users.js` is a live Vercel function with **no authentication or authorisation check of any
kind** (`:57-136`). Its `GET` returns the full user list with the `password` field verbatim
(`parseLine`/`toLine`, `:16-42`); `POST`/`PUT`/`DELETE` accept a `role` field, so an anonymous
caller could create or promote an account. Confirmed reachable in production:

```
GET https://qbase-kqt1f4zde-kepv18s-projects.vercel.app/api/users  ->  HTTP 200  []
```

The store is currently empty (`data/users.txt` is 0 bytes), so no data is leaking today and no
client code calls `/api/users` — this is dead-but-deployed code. It remains an unauthenticated
admin-capable endpoint on the public internet and must be removed or protected.
`api/auth/index.js:11-19` additionally returns the **names** of all non-`VERCEL_` environment
variables to any unauthenticated caller via `?health=true` (names, not values).

---

## P1 — production feature broken

### P1-1. Record creation and editing throw (see §0) — root cause
`preWriteValidation.ts:126` unbound `validateFormData`. Called from `recordStorage.ts:430`
(create) and `:677` (update).

### P1-2. Record creation would then fail on argument resolution
`recordStorage.ts:532` passes `p_approval_status` and `p_department` to
`create_record_validated`, whose live parameters are exactly `p_form_code, p_form_name,
p_form_data` (required) + `p_created_by, p_frequency, p_section, p_section_name, p_serial,
p_status` (optional). A key that is not a parameter makes PostgREST fail resolution with
`PGRST202` *before the body executes* — so this prevents the write rather than degrading it.
Demonstrated empirically against production with a deliberately impossible key:
`404 PGRST202 Could not find the function public.create_record_validated(p_qbase_probe_zzz_not_a_real_param)`.

### P1-3. Record editing would then fail on an unknown column
`recordStorage.ts:686-687` assigns `approval_status` and `department` into the update payload;
production `records` has 17 columns and neither. PostgREST answers `PGRST204`. The payload is
assembled in a variable and assigned by bracket notation, which is why the scanner collects
both object-literal and bracket-assignment keys.

### P1-4. Approve fails, and its guard can never pass
`recordStorage.ts:873` updates `approval_status`, same `PGRST204`. The path also gates on
`row.approval_status || 'Pending_Approval'`; the column does not exist, so the guard never
passes and the function returns "not pending approval" before it can fail on the write.

### P1-5. Approval Queue read side permanently reports "Approved"
`recordStorage.ts:259` — `_approvalStatus: row.approval_status || 'Approved'`. Because the
column does not exist, this is **always** the literal `'Approved'` for every record fetched.
`recordToRow` (`:296`) writes it back out. The approval UI therefore reads a synthesized value
that no user ever set.

### P1-6. Database Import cannot succeed
`importService.ts:141` inserts `form_type` and `revision_no` (`PGRST204` — neither exists) and
`status: row.status || "active"`, where `"active"` is not a member of production's
`record_status_enum` (`draft, pending_review, approved, rejected`). Reachable from
`DatabaseManagementPage.tsx:352`.

### P1-7. Database Import rejects every row for a second, independent reason
`importService.ts:124` and `:146` read `validation.success` and `validation.data`, but
`formValidation.validateFormData` returns `{ valid, errors, sanitizedData }`. `validation.success`
is therefore always `undefined`, the failure branch always runs, and `Object.entries` over the
`ValidationError[]` array yields index keys, so every row is reported as
`Validation: 0: [object Object]` — and no row can ever reach the insert.

### P1-8. A backup export cannot be imported
`exportBackup` emits `form_code`/`form_data`/`serial`/`status`; `importService.normalizeRow`
(`:175-184`) looks for `form_type`/`formType`. The two data-movement paths do not share a schema.

### P1-9. Google OAuth login is broken in production
`api/auth/index.js:1`, `api/auth/callback.js:1` and `api/token.js:1` all `import axios from
'axios'`. `axios` is **not** in `package.json` and **not** in `package-lock.json` (0
occurrences; `bun.lock` does list it, so that lockfile is stale relative to `package.json`).
Confirmed live, read-only:

```
GET /api/auth?health=true  ->  HTTP 500 FUNCTION_INVOCATION_FAILED
GET /api/auth              ->  HTTP 500 FUNCTION_INVOCATION_FAILED
GET /api/auth/callback     ->  HTTP 500 FUNCTION_INVOCATION_FAILED
```

The module fails to load, which is what a missing import produces. The exact runtime log line
was not retrieved, so the cause is a strongly-supported inference from the 500 plus the absent
dependency, not a recovered log message. `server/local.js:2-3` has the same defect for `dotenv`
and `cors` (local dev only).

### P1-10. Eleven writes report success without the database having changed anything
PostgREST returns HTTP 200 and **no error** when an `UPDATE`/`DELETE` matches zero rows, so a
write must inspect the affected rows (`.select()`) to know it happened. None of these do:

| Location | Reported success |
| --- | --- |
| `recordStorage.ts:691-698` `updateRecord` | UI exits edit mode showing unpersisted data; audit row and notification still fire |
| `recordStorage.ts:871-882` `approveRecord` | Approval Queue's `handleApprove` takes the success branch with no toast and no error path |
| `recordStorage.ts:960-967` `restoreRecord` | Toasts "Record restored successfully"; record stays soft-deleted |
| `userService.ts:223-229` `updateProfile` | "Name updated" / "Saved" with zero rows matched |
| `userService.ts:254-256` `deleteUserRole` | `ok: true` on a zero-row delete |
| `userService.ts:260-265` `deleteUserProfile` | as above |
| `backupService.ts:195-201` `importBackup` | `imported` incremented by batch *size*; `success` is the absence of errors |
| `importService.ts:141-147` | `imported++` unconditionally |
| `useNotifications.ts:209-223` `markAllRead` | `.select('id')` present but `data` never read; badge clears |
| `useNotifications.ts:243-256` `clearAll` | same; list empties, rows remain |
| `useTenantIdentity.tsx:180-188` | "Company profile updated", branding reverts |

Contrast: `riskRegisterService`, `capaRegisterService` and `processInteractionService` all use
`.select().single()` after their writes and are genuinely verified.

### P1-11. Changing a password reports success and persists nothing
`useUserManagement.ts:207-224` `changePassword` hashes the new password and calls
`updateUser(id, { password: hashedNew })`. `updateUser` (`:127-134`) builds its payload from
`name`/`email`/`active`/`lastLoginAt` **only**, so `password` is dropped,
`Object.keys(payload).length === 0`, and no write is issued at all — then `changePassword`
returns `true` and `Settings.tsx` shows "Password updated". The old password continues to work.

### P1-12. Account creation reports success for accounts that cannot log in
`AdminPanel.tsx:147-152` calls `addUser(...)` **without `await`** and immediately toasts
"Account Created" with a temporary password. Inside, `useUserManagement.ts:91-103` logs
profile/role insert failures to the console and resolves normally, then `reloadUsers()` rebuilds
the list without the new user. Combined: the admin is given a password for an account that may
not exist.

### P1-13. "Removed" users may still authenticate
`useUserManagement.ts:184-203` `removeUser` logs `deleteUserRole`/`deleteUserProfile` failures
and resolves anyway; the local list was already updated with no rollback. `AdminPanel.tsx:432`
calls it from a confirm dialog with no `await`/`catch`. The UI shows the user gone while the
`profiles`/`user_roles` rows survive.

### P1-14. Serial generation cannot converge, blocking creation
`registerSerials` (`serialAndDate.ts:96`) has **no call site** anywhere in `src/` (verified:
only its definition and a re-export in `src/schemas/index.ts:36`). `SERIAL_CACHE` is therefore
always `{}`, so `getNextSerial` always returns `F/XX-001`. `recordStorage.ts:446-495` retries up
to five times, but `existingSerials` fetched at `:456` is never used and the candidate is a pure
function of the empty cache — so all five attempts produce the same string, the collision check
keeps matching, and the user-serial path reports `Serial F/XX-001 already exists`.

### P1-15. One transient read failure mutes all notifications for the session
`eventBus.ts:112-120` and `:122-130` cache the admin/leadership id lists. `data` is `null` on
error, so the cache is set to `[]` — and `[]` is truthy, so the `if (_cachedAdminIds)` guard
makes the empty list permanent for the session. `emitEvent` then returns early on
`targetUserIds.length === 0`, silently dropping every subsequent notification.

---

## P2 — important functional bug

- **The audit trail can be written against a random UUID.** `auditLog.ts:91-97` reads the
  record's `id` by serial with the `error` destructured away and falls back to
  `crypto.randomUUID()`. The read path (`auditLog.ts:144-150`) filters `audit_log` by
  `record_id` and returns `[]` when the lookup fails, so a transient failure is
  indistinguishable from "this record has no history". For an ISO 9001 QMS this is a silently
  unrecorded change history.
- **Optimistic locking is not enforced.** `recordStorage.ts:626-637` compares a client-supplied
  `edit_count` against a value read in a prior round-trip, but the write at `:694` filters only
  on `id`; `edit_count` never appears in the `WHERE`. Two users who both read `edit_count = 3`
  both pass and both write `4`; the second silently overwrites the first. Production shows this
  is effectively untested: 317 of 318 rows have `edit_count = 0`.
- **RLS gaps.**
  - `record_versions` keeps `USING (true)` SELECT and INSERT policies: `20260610` creates them
    and `20260614` drops only `record_versions_select`/`record_versions_insert`, so the later
    permissive pair survives the "hardening" migration (permissive policies OR together).
  - `records_read_dept_or_owner` (`20260614:170`) grants read when `section IS NULL` to any
    authenticated user — production has **31 records with an empty `section_name`**.
  - `audit_log_insert_authenticated` has `WITH CHECK (true)`: any authenticated user may insert
    arbitrary audit rows, which undermines the audit trail's evidential value.
  - `notifications_insert_system` (`20260616:102`) is `WITH CHECK (true)`, so any authenticated
    user may insert a notification addressed to **any** `user_id`.
  - `risks`/`capas`/`processes`/`process_interactions` INSERT and UPDATE policies are all
    `WITH CHECK (true)` (`20260521`), with no role check.
  - `tenant_settings`, `swot_items`, `swot_strategies` are production tables with **no** policy
    and no creating DDL in any migration; `tenant_settings` is read with `allowAnon: true`.
  - `records_update_owner_or_admin`'s `WITH CHECK` is only `deleted_at IS NULL` — it does not
    re-assert ownership, so a row's owner may rewrite any column.
- **SECURITY DEFINER without a pinned `search_path`.** `001_wysiwyg_editor.sql` defines
  `save_record_version` (`:122`), `lock_record_for_edit` (`:154`), `unlock_record` (`:169`),
  `get_record_version_history` (`:202`) and `restore_record_version` (`:239`) with
  `SECURITY DEFINER` and no `SET search_path`. `20260614:341-361` re-pins such functions, but
  only those existing when it runs; `restore_record_version` is never re-created.
  These `001` functions also take the acting user as a **parameter** and never compare it to
  `auth.uid()`, and `20260610:223-226` grants EXECUTE on the newer signatures to `authenticated,
  anon`.
- **Approval authority exists only in the browser.** `recordStorage.ts:135-142` `canApprove`
  and `:123-130` `resolveApprovalStatus` decide in the client who may approve and what value the
  record receives; `approveRecord` gates on that and then performs a plain PostgREST `UPDATE`.
  No migration constrains who may set approval state. The "employees may edit only Draft
  records" rule (`recordStorage.ts:645`) and department scoping (`:330`, `:339-341`, `:943-945`)
  are likewise client-side. `App.tsx:127` wraps `/admin/approvals` in `RequireAuth` **only**,
  with no role guard (unlike `/admin/accounts` etc. at `:123-125`).
- **Role vocabulary drift.** App `VALID_ROLES` (`userService.ts:300`) includes
  `admin, manager, auditor, user, moderator, dept_head, employee`; the DB has `is_admin()`
  matching `admin` and `is_manager()` matching `admin, manager`. The app treats `dept_head` as an
  approver (`recordStorage.ts:136-141`) but `is_manager()` does not — and a `manager` is a
  manager to the DB but `canApprove` returns `false` for them. Production `user_roles.role`
  contains only `admin` (2) and `dept_head` (2): **no `manager` and no `employee` rows exist**,
  so every role-conditioned branch in the client is currently evaluating against a vocabulary
  the data does not use. `001:54,71` tests `qa_manager`/`editor`, which are in no role list.
- **Passwords are stored client-hashable and compared client-side.** Production `profiles` has a
  `password` column. `useUserManagement.ts:213` hashes with unsalted SHA-256 using a salt that
  defaults to a hardcoded literal (`"qms-salt-2026-v1"`) and, if `VITE_AUTH_SALT` is set, is
  inlined into the client bundle. `:214-220` compares against `u.password` in the browser.
  A `VITE_`-prefixed salt is public by construction.

---

## P3 — correctness / maintenance

- **Generated types drift** (`src/integrations/supabase/types.ts`): `has_role` declared as
  `{ _role }` (`:1072`) while the live parameter is `required_role`; `soft_delete_record`
  declared as `{ p_record_id }` (`:1073`) while the call at `recordStorage.ts:740` passes
  `p_id`, which the live signature confirms is correct — the call is right and the type is
  wrong. `profiles.department` and `records.project_id` exist in production but are undeclared;
  `retention_summary` and `upcoming_reviews` are declared but **absent from production** (0
  mentions in the OpenAPI document). `types.ts` does **not** declare `records.approval_status`;
  the app writes that column through casts that bypass the types entirely.
- **Build and tooling.**
  - `package.json:14` `verify:schemas` runs `tsx scripts/verify-schema-parity.ts`, which does
    not exist anywhere in the tree — so `npm run ci` (`:18`) cannot pass. `@playwright/test` is
    declared and four E2E specs exist, but **no npm script runs Playwright**.
  - `playwright.config.ts:11,32` targets `localhost:5173` while `vite.config.ts:12` binds
    **8080**, so E2E would time out on `webServer` even once wired up.
  - `axios`, `dotenv`, `cors` are imported but undeclared (see P1-9).
  - `date-fns`, `@tailwindcss/typography` and `tsx` are declared and wholly unreferenced
    (typography is never registered in `tailwind.config.ts`).
  - `tailwind.config.ts:7-9` globs `./pages`, `./components`, `./app`, none of which exist.
  - Three lockfiles coexist (`package-lock.json`, `bun.lock`, `bun.lockb`) with no
    `packageManager` field; `bun.lock` is stale (it lists `axios`, `package.json` does not).
  - `.github/workflows/mirror-to-work.yml` is the only workflow and runs **no** install, lint,
    typecheck, test or build — it only force-pushes a mirror to a second remote.
- **Dates.** Local-time and UTC derivations are mixed: `serialAndDate.ts` `todayDDMMYYYY`/
  `todayISO` use `getDate()`/`getMonth()` (local), while `backupService`, `purgeOldArchives`
  (`recordStorage.ts:988`), `ruleEngine.ts:207-240` and the export filenames use `toISOString()`
  (UTC). For the app's Cairo (UTC+2/3) users, anything created between 00:00 and 03:00 local is
  dated to the previous UTC day. `preWriteValidation.ts:186-202` requires a **two-digit**
  day and month, so a stored `"1/2/2026"` fails validation and blocks the save; the filter is
  name-based on `"date"`, so any `...DateTime` key stored in `form_data` also fails.
  `isoToDisplay` (`serialAndDate.ts:12-21`) returns `undefined/undefined/...` for any input that
  is neither ISO nor two-digit DD/MM/YYYY.
- **Template serialization.** Five templates persist arrays as JSON strings
  (`F28Template.tsx:60`, `F11Template.tsx:147`, `F12Template.tsx:85`, `F42Template.tsx:62`,
  `F50Template.tsx:86`, and `FormTemplateKit.tsx:333-336`), while `F28Template.tsx:33-47`
  requires a real array (`Array.isArray(raw)` → `false` for `"[]"`), so a saved F/28 record
  re-opens with zero attendee rows. `FormTemplateKit.tsx:324-334` *is* tolerant, so two
  conventions coexist. `val()` (`:43-49`) stringifies non-scalars, rendering arrays as
  comma-joined text and objects as `[object Object]`.
- **Zod strip and defaults.** `unifiedSchema.ts` `toZodSchema` returns `z.object(shape)` with
  default (stripping) behaviour, so any `form_data` key not in the form's declared field list
  is deleted on the next save. `preWriteValidation.ts:98-104` re-merges a `METADATA_KEYS` set
  that omits `_status`, `_approvalStatus`, `_department`, `_section`, `_sectionName`,
  `_frequency`, `_deletedAt`. `.default(...)` on every field means a stored `form_data` cannot
  distinguish "left blank" from "defaults to empty", and a select's first option is recorded as
  if chosen. No `type: "date"` field exists in `unifiedSchema.ts`, so the `DDMMYYYY_REGEX`
  branch is dead.
- **`recordToRow` re-persists `id` and `_deletedAt` inside `form_data`** (`recordStorage.ts:269-308`):
  neither is in its `metadataKeys`, so the record's UUID and soft-delete timestamp are copied
  into the JSON blob on every save. `:305` also emits `deleted_at: null` unconditionally, so any
  update through this converter clears the soft-delete marker.
- **Export** (`backupService.ts:102-126`) selects `*` (so the key set is the real 17 columns —
  correct) but has no `deleted_at` filter and no pagination, so a table beyond the API row cap
  truncates silently while `meta.recordCount` reports the truncated count. `meta.checksum` is a
  non-cryptographic 32-bit hash stored beside the ciphertext — a corruption check, not an
  authenticity check. `importBackup` performs **no** validation of the payload. The separate
  `fileExport.ts` writers emit client-side `_`-prefixed keys that are not DB columns and are
  consumed by no importer. `exportUtils.ts` `escapeCSV` does not quote on `\n`/`\r`, and
  `exportToExcelXML` interpolates values into XML unescaped.

---

## P4 — dead code / non-runtime

Unreachable from `src/main.tsx`, verified by import-graph and call-site search:

- `src/hooks/useRecordEditor.ts` — imported by nothing; targets the record-versioning /
  pessimistic-locking design that was never deployed. It calls five RPCs that are absent from
  production (`lock_record_for_edit:72`, `unlock_record:88,140`, `save_record_version:127`,
  `get_record_version_history:158`, `restore_record_version:175`), selects the non-existent
  `records.locked_by`/`locked_at` (`:42`) with the error destructured away, and its call shapes
  select the *unpinned, caller-supplied-user-id* `001` overloads of those functions.
- `src/components/forms/templates/index.tsx:100` `getFormTemplateComponent` — no caller.
- `preWriteValidation.ts:270` `serializeRecordToRow`, `:316` `parseRowToRecord` — no callers.
- `src/pages/RecordListPage.tsx` — lazy-imported at `App.tsx:34` but rendered by no `<Route>`
  (`/records` redirects to `/` at `:118`).
- Also orphaned: `components/audit/AuditCharts|AuditFilters`, `layout/NotificationBell`,
  `NavLink`, `record-detail/*` (4), `risk/RiskStats`, `traceability/RelationshipPicker`,
  10 `ui/*` components, `data/interestedPartiesData.ts`, `data/operationalKPIData.ts`,
  `hooks/useBodyOverflow`, `hooks/useHotkeys`, `lib/bulkCreate`, `lib/exportUtils`,
  `lib/validation`, `pages/forms/formsStats`.
- Byte-identical root duplicates (verified with `cmp`): `Index.fixed.tsx` =
  `src/pages/Index.tsx`; `RecordListPage.fixed.tsx` = `src/pages/RecordListPage.tsx`;
  `QBase-Design-Board.html` = `public/design-board.html`; `logo.png` = `src/assets/logo.png`.
  The two `.tsx` duplicates sit at the repo root and are therefore linted by `eslint .`.
- 25 unreferenced root scripts (14 `.py`, 11 `.js`/`.cjs`/`.mjs`, ~6,262 lines), plus
  `sidebar-filters-fix.patch`, `build-timestamp.txt`, an empty `.mode`, a 1-byte `server/t`,
  and `supabase/.temp/cli-latest`.
- `src/templates.ts` side-effect-imports 35 templates but omits `F49Template`, which is
  reachable by other paths; `src/main.tsx:6` force-imports `F28Template` to defeat tree-shaking.
- `supabase/config.toml:1` declares `project_id = "qvbqzenpxsduhhhikbcx"`, which is **not** the
  production project (`iouuikteroixnsqazznc`). Relevant to any future `supabase db push`.

---

## Production objects with no migration provenance (Phase 6 input)

`create_record_validated` and `update_record_with_lock` **exist in production** but are defined
by **no migration in the deployed chain** (13 files, none mention either) — they were created
out-of-band. `update_record_with_lock`'s live signature:

```
required:  p_id uuid, p_form_data jsonb, p_expected_edit_count integer
optional:  p_last_modified_by uuid, p_modification_reason text, p_status record_status_enum
```

That is compare-and-set on `edit_count` — exactly the optimistic locking `updateRecord` fails to
apply. It is exposed by production and **called by nothing** in the deployed code. Sixteen
further production RPCs have no migration provenance: `has_role`, `rls_auto_enable`,
`notify_admins`, `get_next_serial`, `create_notification`, `notify_leadership`,
`_validate_form_required_fields`, `append_audit_log`, `purge_empty_record`, `soft_delete_record`,
`purge_all_empty_records`, `admin_list_users`, `emit_event`, `get_record_by_serial`,
`jsonb_has_user_content`, `jsonb_has_any_text`.

---

## Phase 3 — what the production data establishes about the approval design

Read-only forensics, 318 records and 6,523 audit rows:

| Observation | Value |
| --- | --- |
| `records.status` | `approved` 312, `draft` 6 — **only two of the enum's four states ever used** |
| `record_status_enum` (from OpenAPI) | `draft, pending_review, approved, rejected` |
| `audit_log` actions | `update` 6201, `create` 319, `delete` 3 — **no approval action has ever been recorded** |
| `profiles.department` / `user_roles.department` | **all NULL** (4 and 4 rows) |
| `edit_count` | 317 rows at `0`, 1 row at `1` |
| `modification_reason` | **never set** on any row |
| `serial` | 318 distinct, 0 null, **0 duplicates** |
| `records.project_id` | set on 189 of 318 |
| `record_versions` table | **absent from production** |

Approval-shaped state DOES exist — but **inside `form_data`, per form**, not in a global column:
`approval_reason`, `approved`, `rejection_reason` ("N/A (Approved)"), `reviewed_on`,
`verified_on`, `authorised_date`, `verification_method`, `vendor_auth_designation`.

Combined with the migration evidence already recorded (below), this settles the design question
without guesswork:

1. `20250611_enterprise_rbac.sql` is the **only** migration adding `records.approval_status` and
   `records.department`; it also backfills `records.department` from `section_name`.
2. `20260616_fix_missing_columns.sql` **re-adds** `department` to `profiles`/`user_roles` — and
   deliberately **not** to `records`. A re-add is only needed if the earlier migration never ran.
3. `20260622_fix_get_empty_records.sql:4` states outright: *"The records table has NO department
   column."*
4. Production has `profiles.department` and `user_roles.department`, but **no**
   `records.department` and **no** `records.approval_status`.

**Conclusion:** `20250611_enterprise_rbac.sql` was **never applied to production**. The intended
design is a **real approval workflow expressed on `records.status`** — whose enum already carries
`pending_review` and `rejected`, states production has simply never used — and **not** a parallel
`approval_status` column. `approval_status` was a second, never-deployed expression of the same
idea. Departments live on `profiles`/`user_roles` (read via `current_user_department`), all of
which production holds and none of which `records` needs.

**Remediation direction is therefore proven, not chosen:** correct the application to
`records.status`, and do **not** add `approval_status`/`department` to production — doing so
would reintroduce a design a later migration explicitly records as absent.

**One product decision remains** and is escalated in the final report rather than guessed: which
role may perform which `status` transition, and whether the Approval Queue should drive
`draft → pending_review → approved/rejected`. The *data model* is settled by the enum; only the
*workflow rules* need a human answer.

---

## Unverifiable from repository code alone — no guess made

1. **Whether `records.serial` carries a UNIQUE constraint or unique index.** Required by
   `backupService.ts:195` (`onConflict: "serial"`); without it every restore batch fails with
   `42P10`. No `CREATE TABLE public.records` DDL and no `UNIQUE` clause on `serial` exists in
   the 13 migrations or anywhere in the repo, and PostgREST's OpenAPI carries no unique-constraint
   metadata. **Mitigating evidence from the data:** production currently holds 318 distinct,
   non-null, duplicate-free serials, so a restore would not collide today. Still must be checked
   against the database catalog. Note this also requires a direct connection: no
   `DATABASE_URL`/`postgres://` string exists anywhere in the tree.
2. **The server-side default row cap** that would truncate the unpaginated export
   (`backupService.ts:104-106`) — set by project configuration, not present in the repository.
3. **The exact runtime error behind the `/api/auth` 500s.** The 500 and the undeclared `axios`
   are both confirmed; the log line connecting them was not retrieved.

---

## Toolchain

| File | Purpose |
| --- | --- |
| `audit/schema-parity.mjs` | code ↔ production parity, with computed reachability |
| `audit/rpc-signature-probe.mjs` | RPC existence/absence, read-only and non-executing |
| `audit/prod-data-forensics.mjs` | read-only production data forensics (GET only) |
| `audit/schema-parity-report.json` | machine-readable findings |
| `audit/rpc-signatures.json` | raw probe responses |
| `audit/prod-data-forensics.json` | raw forensic aggregates |

### Corrections made to this audit's own tooling, recorded for honesty

- **This document's own earlier revision mis-stated the root cause** of broken creation/editing
  as argument/column errors. The real first failure is the unbound `validateFormData`
  (`preWriteValidation.ts:126`). Corrected in §0. The downstream defects remain valid and are
  still required fixes.
- `objectKeys()` split on commas at `depth === 1` while callers passed the content *inside* the
  braces, where top-level commas are at depth 0. It therefore captured only the **first** key of
  every payload — producing false "missing required argument" findings and **hiding** the real
  unknown-argument defect. Fixed to depth 0.
- `types.ts` parsing matched 6-space-indent blocks without bounding them to the `public` schema,
  so `graphql_public.graphql` was reported as a phantom public table. Fixed.
- `api/auth/*.js` were not treated as entry points (non-recursive scan). Fixed.
- The first version's entry-point resolution produced only `api`/`server` roots, marking the
  entire `src/` tree unreachable and everything P4. Fixed.
- `rpc-signature-probe.mjs` initially labelled a PostgREST `hint` as "the real signature". The
  hint is a **name-similarity suggestion**, not an argument list. Verdict logic corrected: hint
  present ⇒ the name did not resolve ⇒ the RPC is absent.
- An earlier note in this audit claimed the OpenAPI reports RPC arguments as `null`. That was
  **wrong** — it carries full argument lists, which is what made P1-2 provable.
- `prod-data-forensics.mjs` first selected `profiles.role`, which does not exist (42703);
  column lists are now the OpenAPI-verified ones, and each section fails soft so one bad column
  cannot discard the whole read.
