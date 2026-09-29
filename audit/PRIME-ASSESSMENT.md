# QBase Prime Assessment — 2026-09-29

**Basis:** live production evidence `~/QBase-backup-2026-09-29-prime-2/` (17 tables, 7,236 rows,
verification PASS, every table reconciled against server-side `count=exact` totals), live PostgREST
OpenAPI snapshot in the same directory, and three parallel read-only audits (schema parity,
frontend architecture/UX, security/authorization). Method and citations are inside each section;
every claim is file:line-cited or manifest-referenced. **No production mutation occurred.**

Production commit at audit time: `c3491ab` (branch `prime`). Deployed production: `a4cf115`-lineage
on `main` (verified READY 2026-09-29, dpl_GJaaGo1EVJs6UtR2EYTn783K43Sf).

---

## A. Database — live state (authoritative: OpenAPI + backup manifest)

17 live tables. Row counts (2026-09-29T17:47Z): audit_log **6,523**, records **318**, swot_items 28,
risks 12, swot_strategies 12, processes 8, projects 8, profiles 4, user_roles 4, capas 5,
tenant_settings 1, and **7 tables at 0 rows** (document_metadata, document_reviews,
document_versions, error_reports, notifications, process_interactions).

### A1. Dead-weight tables (zero code references to the table anywhere in src/ or api/)
| Table | Rows | Verdict |
|---|---|---|
| `document_metadata` | 0 | Dead — no queries. Storage/doc subsystem never built out. |
| `document_reviews` | 0 | Dead. |
| `document_versions` | 0 | Dead — "version control" does not exist despite the table existing. |
| `error_reports` | 0 | Dead — error reporting UI never wired to the table. |
| `process_interactions` | 0 | Dead (single comment reference). |
| `projects` | 8 | **Live data, zero code queries** — the UI's "projects" come from hardcoded `src/data/projectsData`, and `records.project_id` references project rows in data but the `projects` table itself is never read/written by the app. |
| `swot_items` | 28 | **Live data, zero code queries** — SWOT page is fully client-local. |
| `swot_strategies` | 12 | Same. |

### A2. Dead-weight columns (declared live, zero code references)
- `profiles.password` — legacy; never selected, never written (GoTrue is the only store). Previously decision-bound to keep; column stays but remains unused.
- `audit_log.action_type`, `audit_log.user_email` — never read, never written.
- `notifications.type` — never written (create_notifications_batch has no p_type arg), never read specifically.
- `tenant_settings.updated_by` — never read/written.
- `processes.controls` — written as constant `''`, never meaningfully read.

### A3. RPC surface (24 live functions)
Actively called: `admin_list_users`, `append_audit_log`, `create_notifications_batch`,
`create_record_validated`, `get_record_count`, `soft_delete_record`, `get_empty_records`.
**Live but orphaned (0 call sites):** `get_next_serial`, `has_role`, `update_record_with_lock`
(production record updates bypass the locking RPC via direct table UPDATE with a client-side
optimistic lock), `is_admin`, `is_manager`, `purge_empty_record`, `purge_all_empty_records`,
`rls_auto_enable`, `emit_event`, `create_notification` (singular). **No phantom RPCs — every
invoked name exists live.** Stale arg-shapes persist only in generated `types.ts` (`has_role._role`
vs live `required_role`; `soft_delete_record.p_record_id` vs live `p_id`).

### A4. RLS/policy state (UNVERIFIED — no catalog access)
PostgREST exposes GET+POST+PATCH+DELETE on **all 17 tables** (grant layer). Write protection rests
entirely on RLS that OpenAPI does not publish and no catalog credential can read. Repo migrations
*claim* policies (see security audit UNVERIFIED list), and three migration files are explicitly
"PENDING, apply manually" — **the repo is not evidence of live policy state.** This is the single
largest security unknown, and Prime treats it as such (§D).

---

## B. Code — architecture and quality state

Verified-good (from remediation, re-confirmed): validation before every write; server-owned serial
allocation (`create_record_validated` p_serial='auto' + out_serial confirmation); optimistic
conflict detection; write-outcome observation (`.select('id')` after UPDATE — no fake success);
fail-closed client; no service_role in the client; GoTrue-only passwords.

Structural findings:
1. **Authorization is client-side theater.** Role checks are string comparisons against
   `localStorage["qms_session"]` — editable by any user to self-assign `admin` in the UI. The live
   `has_role` RPC exists and is never called. Privileged mutations (role assignment, profile
   create/delete, tenant settings) go straight from browser to tables with only (unverified) RLS
   behind them.
2. **Audit trail is forgeable and lossy.** `append_audit_log` RPC accepts client-supplied
   `performed_by` strings; failures are swallowed (`.catch(log)`); openapi shows UPDATE/DELETE
   grants on `audit_log` whose denial depends on unverified RLS; `record_id` FK existence is
   unverifiable from the REST surface.
3. **Record engine has no draft/autosave.** Creation is single-shot; a reload mid-form loses all
   input; template-path forms submit **with zero field validation** (only the DynamicFormRenderer
   fallback validates). Two parallel submit paths in RecordCreationPage.
4. **Workflow = one status column + client-side rules.** "Approvals" are a status flip in the
   browser. No approver/reviewer entity, no per-record reviewer, no approval event (approved/
   rejected are configured in eventBus but never emitted — this is why `notifications` has 0 rows).
5. **Version control does not exist.** `record_versions` was deliberately not created in
   remediation (owner decision); `document_versions` sits at 0 rows. No history/diff/restore for
   records (only audit_log's change snapshots, keyed by serial).
6. **RecordListPage (572 lines) is unreachable** — App.tsx redirects `/records` to `/` while
   FormTemplatePreview navigates to `/records?formCode=` (filter silently dropped).
7. Notification pipeline wired top to bottom (eventBus → RPC create_notifications_batch → polling
   UI) but 0 rows because (a) approval events never emitted, (b) RPC/user_roles fanout at emit
   time — needs live verification.
8. 8 of 17 tables dead (A1): the product is effectively `records + audit_log + users/roles +
   risk/CAP/processes + SWOT-as-local-state`, not the document-management platform the schema
   pretends to be.

---

## C. Security findings (P0/P1 summarized; P2/P3 preserved in the full agent report)

**P0-1. `api/auth/callback.js` renders the Google refresh token into the HTML response of an
unauthenticated production endpoint.** Anyone completing the OAuth flow sees the tenant's
Sheets/Drive refresh token. (Previously triaged P3 "by design, dev-only" — the deeper audit shows
the flow has no gate in production; elevated to P0.)

**P0-2. Privileged operations without server-side authorization:** role assignment/demotion,
profile create/delete, tenant_settings writes (no policy in any migration), audit_log INSERT
(`WITH CHECK (true)`), direct table DELETE grants on all 17 tables. If live RLS diverges from
migration claims (three files explicitly marked "apply manually"), any authenticated user can
self-promote to admin end-to-end. **Cannot be verified or fixed from the REST surface alone.**

**P1:** no policies in repo for `tenant_settings`, `document_metadata`, `document_reviews`,
`document_versions`, `swot_items`, `swot_strategies`, `error_reports` (all CRUD-exposed per
OpenAPI); forgeable audit attribution; `/admin/approvals` missing RequireRole;
`purge_empty_record`/`purge_all_empty_records`/`rls_auto_enable` RPCs with unknown EXECUTE grants
(dangerous if misgranted); edge-function admin check rides on unverified `user_roles` RLS.

**P2/P3 (not repeated here in full):** localStorage JWT, policy drift between 20260614 and
20260618 migrations, permissive `WITH CHECK (true)` on processes/risks/capas inserts,
`backupService` upsert writing arbitrary columns from backup files, non-constant-time token
compare, health endpoint key-name enumeration.

---

## D. Prime target architecture (decision set for implementation)

Priority order per mandate: data safety > security > correctness > maintainability > UX >
performance > scalability > simplicity > convenience.

### D1. Authorization spine (closes the P0-2 class)
- **Single server-side authorization primitive:** Postgres `SECURITY DEFINER` RPC family
  (`authz_*`) that reads `user_roles` under `auth.uid()` server-side and returns/raises. Every
  privileged operation becomes an RPC; the browser never writes `user_roles`, `profiles` (others'),
  or `tenant_settings` directly.
- New RPCs to ship (migration `prime/`): `admin_upsert_user_role`, `admin_delete_user_role`,
  `admin_create_profile`, `admin_deactivate_profile`, `admin_upsert_tenant_settings`,
  `audit_log_server_append` (derives actor from `auth.uid()`; `performed_by` is display-only),
  `record_transition` (workflow engine, validates source→target against a transition table + role),
  `record_version_snapshot`.
- RLS: policies for the 7 unprotected tables (fail-closed: deny-by-default with explicit
  role-scoped grants), plus `audit_log` UPDATE/DELETE deny-all-for-everyone policy, plus
  tightening the permissive 20260521 policy set. All migrations verified on an isolated Postgres
  instance with RLS tests before any production ask.
- Client: all role checks re-pointed to `has_role`/`is_admin` RPC results (server truth), cached
  per request via react-query, never trusted from localStorage beyond UX defaulting.

### D2. Workflow engine (real, minimal, permission-validated)
- `workflows` + `workflow_transitions` tables (draft→pending_review→approved/rejected with
  return-to-draft), transition validation inside `record_transition` RPC; every transition writes
  audit_log with `action='workflow_transition'` and emits the missing
  `record.approved`/`record.rejected` events → notifications flow finally has producers.
- Existing `records.status` stays the single state column (backward compatible).

### D3. Version control (real)
- `record_versions` table (per-row immutable snapshots: version#, full form_data JSONB,
  changed_by, change summary, created_at), written server-side inside the
  `update_record_with_lock`-successor RPC; history/diff/restore UI on RecordViewPage. First-class
  per mandate §7; replaces nothing — additive.

### D4. Record engine (frictionless + loss-proof)
- **Autosave draft:** server-side draft record — `records.status='draft'` created as soon as the
  user opens a form, kept current by debounced update; abandoned drafts resurface on the dashboard
  "Continue drafts". (Chosen over localStorage drafts: crash/switch-device safe, no second source
  of truth.) `beforeunload` guard + per-field autosave.
- Field validation on the template path: reuse `validateFormData` for template schemas — single
  submit path after refactor (removes the two-parallel-path maintenance trap).
- Creation flow: section → form → one-screen form (no informational gate step; real duplicate
  check against `getExistingSerials` + server-side serial allocation), success retains the full
  record link.

### D5. AI layer (AI → AI Tools → Domain Services → Authorization → Database)
- `src/ai/` (`AIClient` provider-agnostic) → `src/ai/tools/*` (typed tools: draftRecordContent,
  classifyDocument, suggestCorrectiveAction, summarizeAuditTrail) → each tool calls existing
  domain services (`recordStorage`, `capaRegisterService`…) which already run authorization →
  server (RLS/RPC) enforces. AI never receives service_role or direct DB handles; every AI artifact
  is a *proposal* object with accept/reject/edit/regenerate/compare states; approval is a normal
  user action that then performs the real write through the same validated paths, audited with
  `action='ai_assisted_create'`.
- Provider key: fails closed when the provider secret is absent (no provider key is currently in
  the environment — the endpoint returns 503 AI_DISABLED until the user supplies one).

### D6. Dashboard intelligence (traceable, no fabrication)
- KPIs computed from real tables via one RPC (`dashboard_stats`) — counts, statuses, CAPA closure
  rate, overdue reviews — each widget documents its exact query; empty data renders "no data",
  never fabricated numbers.

### D7. UX overhaul (evidence-based, from the UX audit)
- Adopt `StateScreen`/`PageHeader` everywhere; replace 37 ad-hoc spinners via an `<AsyncBoundary>`
  wrapper (loading skeleton / empty / error / success).
- Real `/records` list (resurrect RecordListPage with working `/records?formCode=` filter), bulk
  actions wired to the existing `approveRecords`, command palette (cmdk) with global search across
  records+modules+actions, keyboard nav in lists, accessible modals (Radix dialog everywhere),
  nav as `<NavLink>` with `aria-current`, mobile nav parity, responsive record templates.
- Wire orphaned real features: error_reports UI hook, approval-decision notifications.

### D8. Search, import/export, files
- Server-side search on records (`form_data::text` ILIKE via a paging RPC) behind the command
  palette; PG full-text added additively later only if size justifies it.
- Import: existing validated path + duplicate-detection preview + row-level error reporting +
  dry-run (validate-only) mode; never bypassing create_record_validated.
- Files: documents stay out of public buckets; signed-URL reads under storage RLS;
  document_metadata gets a real purpose (record attachments) or is declared out-of-scope with
  reasoning in the final report.

### D9. Cleanup (backward-compatible, eventual)
- No production data/table deletion now. Dead tables/columns documented and left in place; app
  code stops referencing stale generated types; root-level dead files (`Index.fixed.tsx`,
  `RecordListPage.fixed.tsx`) removed; dead duplicate components (unused `ui/sidebar.tsx` adoption
  decision, `NotificationBell`, `record-detail/*`) handled per tree-shaking-by-removal from the
  bundle with zero behavior change.

---

## E. Constraint acknowledgment (what Prime will NOT do)

- **No production DDL has been applied.** No `supabase db push`. No live policy changes. Everything
  DB-side lands as migration files, verified on an isolated local Postgres, applied to production
  only when a user-supplied credential (access token / DB password) makes application possible —
  and only after backup + rollback path are re-verified.
- Production remains mutation-free during the audit phase; the `prime-2` backup above is the
  rollback point for any future production work.
- No secrets printed or logged; backup tooling reads keys from a fail-closed env loader outside
  the repo.