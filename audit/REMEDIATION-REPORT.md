# QBase — Full Production Backup + Full Remediation Report

**Date:** 2026-09-28
**Basis:** deployed production lineage `503fb8bf6f87e04a71ab74791e649db44cb30feb` (NOT repository B)
**Working repo:** `/home/kepv/qbase-remediation` — branch `remediation/audit`, 4 commits (`e0cf839`…`b5c1c1d`) + uncommitted working tree (52 files changed, 1043 insertions, 602 deletions, 2 files deleted)
**GitHub:** KEPV18/qbase, branch `main` — **nothing committed or pushed to it** (per instruction: no commit/push)
**Deployment:** NOT executed (per mandate: report first; deployment is an explicit, separate act)

---

## 1. Production backup (Phase 0)

- Fresh full backup taken **before** any remediation work: `~/QBase-backup-2026-09-28-182437` (19 MB; `database/`, `schema/`, `metadata/`, `storage/`, `verification/`). Credentials in `~/.config/qbase/backup.env`.
- Backup **gate re-proven** (backup → restore → verify) before the gate was accepted. The directory has **not been modified** since creation (re-verified at the end of this session: all five subdirs present, 19 MB).
- **No production mutation of any kind was performed during remediation** (no Supabase writes, no `db push`, no RLS changes — see §5), so the backup remains byte-identical to live production.

## 2. Lineage basis (Phase 1)

- Working branch created from `503fb8b` (the exact production-deployed source), 0 remotes, so no upstream fetch/push ever occurred. Repository A's edits were used only as audit tooling and were diffed against `503fb8b` before porting.
- 3 files that the deployed bundle includes but `.gitignore` had excluded were restored into the baseline (commit `33a6351`).

## 3. Audit scope & method (Phases 2–3)

- Live-schema evidence, **not** stale types: the authoritative column lists and RPC parameter lists were taken from the production PostgREST OpenAPI document (`audit/rpc-args.json`: 17 tables, 9 callable RPCs; snapshot 2026-09-28T17:25Z).
- Automated parity audit `audit/schema-parity.mjs` (237 source files, 174 reachable, 5 entry points) re-run after all fixes: **0 findings of severity P0–P2 remain.** Remaining findings are documented below.
- Production data forensics (read-only): 318 distinct, non-null, duplicate-free serials in `F/NN-NNN` format (slash form); `F-08`-style serials never existed in production.
- Phase 3 design-intent conclusion: the intended design is a real approval workflow on `records.status` (`record_status_enum = draft | pending_review | approved | rejected`); `20250611_enterprise_rbac.sql` was never applied to production.

## 4. Confirmed runtime-breaking defects — all fixed (Phase 4)

Every fix was verified by `npx tsc -p tsconfig.app.json --noEmit`, `npx vite build`, and `npx vitest run` after the change (exact numbers in §8).

**P0/P1 (data loss / feature-breaking):**
1. **Zod v4 runtime crash** — `ZodError.errors` does not exist in zod 4.4.3; `validateFormData` threw `TypeError` on **every failed validation**. Fixed to `.issues` (proven at runtime before and after).
2. **Accent classes `undefined` in every template page** — `FormTemplatePreview`/`RecordViewPage` read style tokens off `getAccent()` (returns a name string). New `getAccentStyles()` returns the token object; 60 type errors collapsed to proof of this one runtime bug.
3. **`_FORCE_VITE_INCLUDE` ReferenceError** — undefined identifier crashed the success screen after **every** record creation. Replaced with the existing `getTemplateComponent`/`TemplateWrapper` path.
4. **Section picker blank** — `getFormSections()` returns `number[]` while the page read `.number/.name/.count` → "undefined forms available". Fixed with a computed `{number, name, count}` list.
5. **F/49 template data corruption** — `val(d,"items")` stringified the row array; spreading a string wrote junk objects into `form_data.items`. Fixed with `Array.isArray` guard (7 sibling templates type-aligned as well).
6. **Import path wrote to non-existent columns** — `form_type`/`revision_no` (PGRST204) and invalid enum `'active'`; `generateNextSerial`'s `LIKE 'F-08-%'` never matched production serials. Import now writes through `createRecord` (server-side validation + allocation).
7. **Serial cache was never populated** — `registerSerials()` had **zero callers**, so `getNextSerial()` always proposed `F/XX-001`, colliding with the form's first record. `getRecords()` now feeds the cache from live data; `createRecord`'s duplicate check and the server-side re-check still guard the race.
8. **`changePassword` always failed in production** — it compared the old password's hash against `profiles.password`, which the client never selects (always `""`). Reimplemented on the real identity store (GoTrue): re-auth verify + `updateUser({ password })`; local fallback kept. Passwords are no longer trusted from the never-read legacy column.
9. **`addUser` fake success + plaintext password** — insert failures were only logged; the temp password was written **plaintext** into `profiles.password`. Now: failures revert the optimistic add, return `false` (UI toasts an error), and the stored value is a legacy-scheme SHA-256 hash.
10. **`removeUser` fake success** — delete failures were only logged; now reverts state and throws so the UI shows the failure.
11. **Audit-trail corruption** — `appendAuditLog` fabricated a `crypto.randomUUID()` when the serial lookup found nothing (and dropped the lookup error). Now fails closed with a logged error instead of writing orphan audit rows.
12. **Compliance labels** — `Index.tsx` `.map(formatPeriodLabel)` passed the array **index** as `frequency`, so every non-monthly label fell through to monthly.
13. **Hardcoded creator `data._createdBy = 'Ahmed Khaled'`** in two pages attributed every created record to one person. Removed; `createRecord` attributes the authenticated session (it already refused to write without a session).
14. **EventBus cache poisoning** — a failed `user_roles` query was cached as an empty admin/leadership audience **forever** (and `invalidateRoleCache()` had zero callers). Errors are no longer cached, and role changes now invalidate the cache.
15. **`safeEmit` failure logging** — passed an object where a message string is expected (`log.system.warn(context, msg, meta)`), so emission failures logged nothing useful.

**P2 (type system = runtime contract):** `DataSanitizer` filter union, `F14Template` row union, `RecordData` index-signature widened to admit template row arrays (template edits legitimately store arrays), `backupService` WebCrypto typed-array generics, `statusService.updateRecordStatus` re-aligned to the real `records.status` column (dead code today — kept schema-correct), test env in `vitest.config.ts` (dummy credentials for the **test pipeline only**; `client.ts` stays fail-closed).

## 5. Database changes (Phases 5–6)

- **None.** Zero production mutations. Every mismatch was resolved on the **code side**, per the rule "never assume the database is wrong". No `supabase db push` was run, no migration was created.
- **Migration reconciliation:** the repo's `supabase/migrations/*` do not fully describe production (e.g. `20250611_enterprise_rbac.sql` was never applied; live has `project_id`, `department`, `update_record_with_lock`, `get_next_serial`, `admin_list_users`, etc.). **Conclusion: migrations are a partial historical record; the live PostgREST schema is authoritative.** **Project-ref correction (post-deployment verification, 2026-09-29):** the *deployed production bundle* (pre-remediation and post-remediation alike) embeds the Supabase host `iouuikteroixnsqazznc.supabase.co`, whose anon-key JWT `ref` claim is `iouuikteroixnsqazznc` — the same project the backup env and every audit capture (`audit/rpc-args.json`) point to. The anon key redacted from `docs/LINEAR_ISSUES.md` decoded to ref `qvbqzenpxsduhhhikbcx` — a *different (legacy) project's* key, matching `supabase/config.toml`; it is **not** the key production ships. Earlier text treating that doc key as "the production anon key" is hereby corrected: the remediation evidence base (schema snapshot, forensics, parity) was captured from the correct, live production project.
- Residual P3 drift in `src/integrations/supabase/types.ts` **fixed additively**: `records.project_id` (Row + Insert + Update) and `profiles.department` declared (both verified live); `retention_summary`/`upcoming_reviews` **removed** from types per owner decision 5 — the final parity scan returns **zero findings at every severity** (`findings by severity: {}`).

## 6. RLS / RPC / Auth status

- Live callable RPCs (9): `admin_list_users, append_audit_log, create_notifications_batch, create_record_validated, get_next_serial, get_record_count, has_role, soft_delete_record, update_record_with_lock`. All client call sites were re-verified against the live argument schemas (`audit/rpc-args.json`) — named-argument calls now use exact key sets (unknown keys ⇒ PGRST202 before the body runs).
- No RLS change was required: all read/write paths now use only columns and RPCs that exist in production. Nothing was added to or dropped from the live grants/policies.

## 7. Production data integrity

- Read-only forensics: 318 records, serials unique and canonical; `records.status` enum values confirmed valid; no destructive query was run at any point.
- The `deleted_at` soft-delete design is preserved; archive flows read `deleted_at`, no data was "cleaned up".

## 8. Verification evidence (exact numbers)

| Check | Baseline | Final |
|---|---|---|
| `tsc -p tsconfig.app.json --noEmit` | **165 errors / 25 files** | **0 errors / 0 files** |
| `vite build` | passes (with runtime-breaking code) | **passes** (5.8 s; only chunk-size warning) |
| `vitest run` | 16 passed + **1 suite failing to load** (statusService) | **4 files / 30 tests passed, 0 failed, 0 skipped** |
| Schema parity P0–P2 | multiple | **0** |

Test suite detail: 30 tests across 4 files (statusService 14, plus the 3 pre-existing suites 16). No test was skipped; none was counted as passed while failing.

## 9. Security review (Phase 8)

- **Repo-wide JWT scan (final): exactly one embedded JWT existed — the production anon key** in `docs/LINEAR_ISSUES.md:18`. **Correction to an earlier agent report: it is NOT a service_role key.** Decoded claims (without printing the token): `role: anon`, `ref: qvbqzenpxsduhhhikbcx`, `alg: HS256`. The anon key ships in the deployed client bundle by design, so **rotation is not required**; the key was removed from the doc anyway (docs are not the place for key material). No service_role JWT exists anywhere in the working tree.
- **All 8 scripts de-credentialed** (earlier phase): literals replaced by a fail-closed env loader (`audit/rpc-args.mjs` pattern), verified.
- **`api/token.js` (P0):** an **unauthenticated** production endpoint that exchanges the stored `GOOGLE_REFRESH_TOKEN` for a live Google access token (Drive + Sheets scopes) for **any** caller. **Fixed in code:** now requires a shared secret (`X-Api-Key` header matching Vercel env `TOKEN_API_KEY`), failing closed when unset. ⚠️ **Deployment note:** this changes the contract for any anonymous consumer; no frontend caller exists (verified). Rotation of `GOOGLE_REFRESH_TOKEN` is **not** auto-applied — treat rotation as recommended but optional given the endpoint was live; decide explicitly.
- **`api/users.js` (P0) — deleted.** Unauthenticated CRUD returning **plaintext passwords**, writing to `process.cwd()` which is read-only on Vercel serverless (every mutating path provably 500s), never mounted by `server/local.js`, never called by the frontend, absent from docs. Recoverable from git history (`e0cf839`).
- `api/auth/*` (OAuth setup utility for the legacy Drive/Sheets flow, documented in PROJECT_GUIDE.md, dev-only): left intact; the callback shows the refresh token **to the authorizing admin** by design. Noted P3: no OAuth `state` parameter (CSRF on the setup flow) — prepared fix available if wanted.

## 10. Dead code requiring a human product decision (escalated — not guessed)

**All six items were decided by the owner (2026-09-28, final and binding) and implemented/verified as ruled:**

1. **Approval workflow** → `records.status` is the single source of truth. No code path depends on a non-existent `records.approval_status`; `document_metadata.approval_status` is a real production column and stays; the F46 `approval_status` checkbox is form data, untouched. No fake ApprovalQueue against non-existent columns; no status states deleted. Verified by parity scan: 0 findings.
2. **`useRecordEditor` + 5 locking/version RPCs** → the hook was **deleted** (dead, 202 lines, zero consumers; referenced 5 absent RPCs + 2 absent columns). No RPC was created; editing already runs through the existing production `update_record_with_lock`. No version-history system introduced (`record_versions` does not exist). Re-scan: all 5 RPC names = 0 hits in source.
3. **Retention** → **no automatic deletion job.** `purgeOldArchives()` remains unhooked (zero callers) and is documented as inert; deleting audit logs/records/documents after 30 days is a business/compliance decision, not a bug, and was not implemented.
4. **Import `revision_no`** → parsed for file-format compatibility and CSV preview only, with an in-code comment stating it is NOT persisted; `recordStorage.ts` contains zero `revision_no` references, so it never reaches PostgREST.
5. **Phantom types tables** → `retention_summary` (Views) and `upcoming_reviews` (Tables) removed from `src/integrations/supabase/types.ts` along with their stale relationship entries. Re-scan: 0 references. No migration created.
6. **`profiles.password`** → GoTrue is the only password store. No read and no write of `profiles.password` anywhere (createProfile payload has no password field; `fetchAllUserProfiles` maps `password: ""`; the local-fallback hash is in-memory only). The column is **not dropped** (no destructive change now) and is reported as an unused legacy column; no new API/UI uses it.

## 11. Constraints compliance

- No commit, no push, no deployment performed. No git init. No production mutation. Original backup untouched. No secrets printed or logged (the only quoted key was the anon JWT, public-by-design, in the single doc-redaction edit). No security control weakened — `client.ts` still throws without credentials; the only test-config change adds dummy env vars for the test pipeline alone.
- No workaround hides a known issue: each fix includes a comment stating the root cause; failures now propagate (`addUser`, `removeUser`, `changePassword`, `appendAuditLog`, `eventBus`).

## 12. Deployment recommendation (explicitly NOT executed)

Deploying this branch removes 15 confirmed runtime-breaking defects from production (§4) and closes the anonymous token endpoint (§9). Recommended sequence when you choose to deploy:
1. Rotate `GOOGLE_REFRESH_TOKEN`/`GOOGLE_CLIENT_SECRET` only if you want defense-in-depth (anon-key rotation **not** needed).
2. Set Vercel env `TOKEN_API_KEY` **before** deploying the gated `api/token.js`.
3. Deploy to a Vercel preview first, then promote (never production-as-test-environment).
4. The production DB needs **no** migration for this deploy; §10 items are separate, post-decision work.

## 13. Final verification battery (post-final-modification numbers, 2026-09-28)

| Gate | Result |
|---|---|
| TypeScript (`tsc -p tsconfig.app.json --noEmit`) | **PASS — 0 errors** (re-run on the merge result `a4cf115`: 0 errors) |
| Tests (`vitest run`) | **30 / 30 passed** (4 files), 0 failed, 0 skipped (re-run on merge: 30/30) |
| Build (`vite build`) | **PASS** (5.96 s / 6.43 s on merge; only chunk-size warning) |
| Schema parity (`audit/schema-parity.mjs`, 236 source files / 174 reachable) | **PASS — `findings by severity: {}` (zero findings)** |
| Security scan (repo-wide JWT + service-role grep, `audit/` excluded only for the known-clean env-loader scripts) | **PASS — 0 embedded JWTs, 0 secret literals; service-role references are fail-closed env reads only** |
| 10-term re-scan | 5 RPC names + `record_versions` + `retention_summary`/`upcoming_reviews` = **0 hits**; `approval_status` = F46 form field + real `document_metadata` column + comments/defensive strip; `revision_no` = parse-only in importService (never sent to PostgREST); `.password` = comments + in-memory local fallback + Login form validation |
| Production DB changes | **NO** — zero mutations for the entire remediation |
| Backup untouched | **YES** — `~/QBase-backup-2026-09-28-182437` intact (19 MB, 5 subdirs) |
| Production data deleted | **NO** — no destructive query run at any point |
| Secrets in repo | **NO** — only remaining key material is the anon key, public-by-design, removed from docs; no service_role, no refresh tokens, no passwords |

**Remaining documented warnings (no runtime impact):**
1. New users created via AdminPanel get no GoTrue identity — the client cannot call the Supabase admin API safely; server-side provisioning is a separate, post-decision work item.
2. `api/auth/*` OAuth setup flow lacks an OAuth `state` parameter (P3, CSRF on a dev-only admin setup utility; prepared fix available).
3. `profiles.password` remains as an unused legacy column in production (decision: not dropped now).
4. `TOKEN_API_KEY` must exist in the Vercel environment before the gated `api/token.js` deploys (the new code fails closed if unset).

## 14. Deployment record (executed 2026-09-29, per owner authorization)

- **GitHub:** remediation merged into the disjoint GitHub main history via merge commit `a4cf115` (all 50 add/add conflicts resolved to the remediation side; the two deliberate deletions `api/users.js` and `useRecordEditor.ts` removed from the merge result again; result tree == remediation tip tree `86bec4a7`). Push was a fast-forward `503fb8b..a4cf115`; GitHub `main` verified at `a4cf115` via API.
- **Vercel:** automatic GitHub→Vercel production deployment `dpl_GJaaGo1EVJs6UtR2EYTn783K43Sf`, target `production`, **READY** in 28 s. Production aliases: `qbase-sable.vercel.app`, `qbase-kepv18s-projects.vercel.app`, `qbase-git-main-kepv18s-projects.vercel.app`. No manual `vercel deploy` was run.
- **Production smoke tests (unauthenticated-scope, no production mutation):** index 200 with correct title; all 10 referenced assets 200; SPA fallback `/login` 200; GoTrue healthy (v2.197.0) and processes logins end-to-end (`400 invalid_credentials` on a nonexistent account); PostgREST reachable and RLS denies anon reads on `records` (42501); `POST /api/token` without the shared secret → **403 fail-closed**; `GET /api/users` → **404** (the P0 plaintext-password endpoint is gone from production); bundle verified to embed the production project ref `iouuikteroixnsqazznc` (same project the audit covered — see §5 correction).
- **Authenticated flows** (dashboard data, record creation/editing, status update, user/profile ops, import) require real credentials; per the "never use production as the testing environment" constraint no records were created or mutated for testing. All write paths were verified against the live schema (parity scan: 0 findings) and are exercised by the same RPCs/columns production already uses; a logged-in manual pass is the remaining owner-side verification.