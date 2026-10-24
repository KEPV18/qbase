-- ============================================================================
-- Prime migration 15 — ROLLBACK
-- Puts the audit trail and the version history back the way they were:
-- readable by every signed-in account, with the "your own records" clause
-- back to the uuid-only form that matched 14 rows out of 315.
--
-- WARNING: with this applied, a plain 'user' account can read all 6523
-- audit rows again — including the `previous_values` / `new_values` of
-- every record in the register, which is the full business content of the
-- records that the records policy hides from it.
--
-- Rollback of 20261023_15_audit_and_version_scope.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. the blanket policies come back ─────────────────────────────────────
create policy audit_log_read
  on public.audit_log
  for select
  to authenticated
  using (true);

create policy record_versions_read_authenticated
  on public.record_versions
  for select
  to authenticated
  using (true);

drop policy if exists audit_log_read_record_scope on public.audit_log;
drop policy if exists record_versions_read_record_scope on public.record_versions;

-- ── 2. the records policy, with the uuid-only owner clause ───────────────
drop policy if exists records_read_dept_or_owner on public.records;

create policy records_read_dept_or_owner
  on public.records
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      prime_is_manager_or_admin()
      or created_by = (auth.uid())::text
      or prime_record_department(form_code) = current_user_department()
    )
  );

-- ── 3. the duplicate policies come back ───────────────────────────────────
create policy "Authenticated can read process_interactions"
  on public.process_interactions
  for select
  to authenticated
  using (true);

create policy "Authenticated can update process_interactions"
  on public.process_interactions
  for update
  to authenticated
  using (true);

create policy "Authenticated users can read tenant settings"
  on public.tenant_settings
  for select
  to authenticated
  using (true);

create policy "Anon cannot access tenant settings"
  on public.tenant_settings
  for select
  to anon
  using (false);

-- ── 4. the helper goes ───────────────────────────────────────────────────
drop function if exists public.prime_current_user_email();

commit;
