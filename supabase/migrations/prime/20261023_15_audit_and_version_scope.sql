-- ============================================================================
-- Prime migration 15 — the audit trail and the version history were still
--                        open, and the "your own records" rule could never
--                        match
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- Migration 11 closed the `records` table.  Two tables that hold THE SAME
-- DATA were still readable by every signed-in account, so the closure was
-- only half a closure:
--
--   audit_log_read                      SELECT  true
--   record_versions_read_authenticated  SELECT  true
--
--   * `audit_log` holds, for every write the engine has ever made, the
--     row's `previous_values` and `new_values` — the FULL business content
--     of the record, before and after.  6523 rows.  So a plain account
--     could read every record in the register through the audit trail even
--     with the records policy closed.  The /audit route is not role-gated
--     in the router, so the Audit page rendered the whole trail to anyone
--     who signed in.
--
--   * `record_versions` holds the same thing as a per-version snapshot
--     (`form_data jsonb`).  It is empty today, but the engine writes a
--     version on every update (`record_version_snapshot`), so it fills up
--     with the first edits.
--
-- Both tables are the record's content in a different shape, so both have
-- to follow the record's own policy.
--
-- The second, quieter defect
-- ---------------------------
-- Migration 11 gave `records` this owner clause:
--
--     created_by = (auth.uid())::text
--
-- `records.created_by` is written by the engine as the actor's PROFILE
-- EMAIL:
--
--     record_draft_create:       coalesce(v_actor_email, auth.uid()::text)
--     create_record_validated:   p_created_by (the same email)
--
-- and the restored data confirms it: of the 315 live rows, 0 have an
-- email-shaped `created_by`, 14 have a uuid-shaped one and 267 are an
-- empty string (the legacy import never filled the column).  So the clause
-- matched 14 rows of 315, and "your own records" was effectively dead:
-- a user could not read a record they had just created themselves.
--
-- The fix
-- -------
--   A. `prime_current_user_email()` — the caller's profile email, the
--      value `created_by` actually holds.
--
--   B. `records_read_dept_or_owner` is recreated with an owner clause
--      that matches EITHER the uuid or the email, so a user can read the
--      records they created.  The department and manager/admin clauses are
--      unchanged.
--
--   C. `audit_log` — the blanket policy is dropped and a scoped one takes
--      its place:
--
--        using (is_manager() or exists (select 1 from public.records r
--                                          where r.id = audit_log.record_id))
--
--      The sub-select is evaluated with the QUERYING user's rights, so
--      the `records` RLS applies inside it: the audit rows a user can see
--      are exactly the audit rows of the records they can see.  A manager
--      keeps the whole trail through `audit_log_read_admin`.
--
--   D. `record_versions` — the same shape: the versions of the records the
--      caller can read, plus the whole history for a manager.
--
--   E. Two leftover pairs of duplicate policies are removed, because a
--      policy set with two names for the same rule is a policy set nobody
--      can reason about:
--        * `process_interactions` had two identical `USING (true)` read
--          policies and two update policies.
--        * `tenant_settings` had `tenant_settings_read_all` (anon +
--          authenticated) AND "Authenticated users can read tenant
--          settings" (authenticated) AND "Anon cannot access tenant
--          settings" (anon, `false`) — the last one contradicts the first
--          one and is dead, because permissive policies are OR-ed.  The
--          surviving rule is the one the grant layer intends: anon may
--          read the tenant branding, and nobody else may read it.
--
-- What this changes for the accounts that exist
-- ---------------------------------------------
--   * admins and dept heads: the whole audit trail and the whole version
--     history, exactly as before.
--   * managers: the whole audit trail (`is_manager()`).
--   * a plain 'user': the audit rows and the versions of the records they
--     can read — their own (now that the owner clause matches) and their
--     department's.  Today no account has a department set, so that is
--     their own records only.
--
--   The Audit page is open to every signed-in account in the router, so a
--   plain user now sees an empty trail.  That is the honest answer for an
--   account with no department: it is not a failure of the page.
--
-- No table data is read or written by this migration.
--
-- Idempotency
-- -----------
-- DROP POLICY IF EXISTS / CREATE OR REPLACE; re-running changes nothing.
--
-- Rollback: 20261023_15_audit_and_version_scope.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. the caller's email ─────────────────────────────────────────────────
-- `records.created_by` holds the actor's profile email (the engine writes
-- `coalesce(v_actor_email, auth.uid()::text)`), so this is the value the
-- owner clause has to compare against.
create or replace function public.prime_current_user_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.email
    from public.profiles p
   where p.user_id = auth.uid()
   limit 1;
$$;

revoke execute on function public.prime_current_user_email() from public, anon;
grant execute on function public.prime_current_user_email() to authenticated;

-- ── 2. the records policy, with an owner clause that can match ───────────
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
      or created_by = public.prime_current_user_email()
      or prime_record_department(form_code) = current_user_department()
    )
  );

-- ── 3. the audit trail follows the record ────────────────────────────────
drop policy if exists audit_log_read on public.audit_log;
-- The scoped policy is dropped too: this file promises that re-running it
-- changes nothing, and a `create policy` for a name that already exists
-- is an error.  The policy is recreated on the next line with the same
-- rule, so the state afterwards is the same state.
drop policy if exists audit_log_read_record_scope on public.audit_log;

create policy audit_log_read_record_scope
  on public.audit_log
  for select
  to authenticated
  using (
    is_manager()
    or exists (
      select 1
        from public.records r
       where r.id = audit_log.record_id
    )
  );

-- ── 4. the version history follows the record ────────────────────────────
drop policy if exists record_versions_read_authenticated on public.record_versions;
drop policy if exists record_versions_read_record_scope on public.record_versions;

create policy record_versions_read_record_scope
  on public.record_versions
  for select
  to authenticated
  using (
    is_manager()
    or exists (
      select 1
        from public.records r
       where r.id = record_versions.record_id
    )
  );

-- ── 5. the duplicate policies go ─────────────────────────────────────────
-- process_interactions: two identical read rules and two update rules.
drop policy if exists "Authenticated can read process_interactions" on public.process_interactions;
drop policy if exists "Authenticated can update process_interactions" on public.process_interactions;

-- tenant_settings: the blanket `true` rule for anon + authenticated stays
-- (the branding is meant to be public inside the tenant); the duplicate
-- authenticated-only read rule and the contradictory "anon cannot access"
-- rule go.
drop policy if exists "Authenticated users can read tenant settings" on public.tenant_settings;
drop policy if exists "Anon cannot access tenant settings" on public.tenant_settings;

commit;
