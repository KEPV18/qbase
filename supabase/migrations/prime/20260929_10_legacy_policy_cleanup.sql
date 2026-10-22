-- ============================================================================
-- Prime migration 10 — Legacy permissive policies vs. the Prime spine
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Applied:      2026-10-22
-- ============================================================================
--
-- The problem
-- -----------
-- Migration 01 (the authz spine) replaced the 20260521-era policies on six
-- tables with narrow, server-side-scoped ones:
--
--     <table>_read_admin    for select to authenticated using (prime_is_manager_or_admin())
--     <table>_insert_admin  for insert to authenticated with check (prime_is_admin())
--     <table>_update_admin  for update to authenticated using (prime_is_admin()) ...
--     <table>_delete_admin  for delete to authenticated using (prime_is_admin())
--
-- but it never DROPPED the legacy policies that sat next to them.  Postgres
-- ORs the PERMISSIVE policies of a table together, so wherever a legacy
-- policy was wider than the spine's, the wider one won:
--
--   swot_items / swot_strategies
--     "authenticated can insert|update|delete ..." USING (true)
--     => ANY signed-in user could insert, rewrite and DELETE the whole SWOT
--        register.  The spine's admin-only policies were dead code.
--
--   error_reports
--     "Allow insert for all" / "Allow select for admins" / "Allow update for
--      admins"  USING (true), granted to PUBLIC
--     => on their own these would let an anonymous visitor read and write
--        every error report.  They are currently neutralised by a legacy
--        RESTRICTIVE policy (rls_lock_all, USING (false)) — but that same
--        lock also neutralises the spine's own error_reports_read_admin, so
--        the admin "Database Management" page (src/pages/DatabaseManagementPage.tsx,
--        admin-only route) lists NOTHING and the error history is unreadable.
--
--   document_metadata / document_reviews / document_versions
--     "Allow view for authenticated" USING (auth.role() = 'authenticated')
--     "Allow write for admin/manager" USING (EXISTS (... user_roles ...))
--     => world-readable by any signed-in user; currently inert because of the
--        same legacy rls_lock_all, which is kept below.
--
-- The fix
-- -------
-- Drop the legacy policies so the spine's scoped policies are the ones that
-- actually decide:
--
--   swot_*            the spine's four admin-scoped policies remain: managers
--                     and admins may read, admins may write.  Ordinary users
--                     can no longer touch the SWOT register.  (No application
--                     code reads these tables — the SWOT page is client-side.)
--   error_reports     the spine's four policies remain: managers/admins may
--                     read (the admin page works again), admins may write.
--                     anon is closed — no policy names the role, and the
--                     three legacy PUBLIC policies are gone.
--   document_*        the legacy policies are dropped and the legacy
--                     rls_lock_all is KEPT: these three tables stay
--                     unreachable (fail-closed), which is the stricter of
--                     the two readings and matches "no app code references
--                     these tables".  The spine's *_read_admin / *_write_admin
--                     policies remain in place, so lifting the lock later is
--                     a single statement.
--
-- What is NOT changed
-- -------------------
--   * records, capabilities, risks, processes, profiles, notifications,
--     tenant_settings, audit_log — untouched.
--   * The rls_block_anon restrictive policies — untouched.
--   * Any table privilege (migration 09 owns that layer).
--   * No table data is read or written by this migration.
--
-- Idempotency
-- -----------
-- Every statement is DROP POLICY IF EXISTS; re-running changes nothing.
--
-- Rollback: 20260929_10_legacy_policy_cleanup.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── swot_items / swot_strategies ───────────────────────────────────────────
-- The legacy "anyone who is signed in may write" policies are removed; the
-- spine's admin-scoped policies become the deciding ones.
drop policy if exists "authenticated can select swot_items" on public.swot_items;
drop policy if exists "authenticated can insert swot_items" on public.swot_items;
drop policy if exists "authenticated can update swot_items" on public.swot_items;
drop policy if exists "authenticated can delete swot_items" on public.swot_items;

drop policy if exists "authenticated can select swot_strategies" on public.swot_strategies;
drop policy if exists "authenticated can insert swot_strategies" on public.swot_strategies;
drop policy if exists "authenticated can update swot_strategies" on public.swot_strategies;
drop policy if exists "authenticated can delete swot_strategies" on public.swot_strategies;

-- ── error_reports ──────────────────────────────────────────────────────────
-- The three legacy PUBLIC policies (USING (true)) go, and the legacy blanket
-- RESTRICTIVE lock goes with them, so the spine's manager-or-admin read
-- policy is the one that applies.  anon has no policy on the table at all,
-- which means no rows and no writes.
drop policy if exists "Allow insert for all" on public.error_reports;
drop policy if exists "Allow select for admins" on public.error_reports;
drop policy if exists "Allow update for admins" on public.error_reports;
drop policy if exists rls_lock_all on public.error_reports;

-- ── document_metadata / document_reviews / document_versions ──────────────
-- The legacy wide policies are removed.  The legacy rls_lock_all is KEPT on
-- these three tables: no application code references them, so they stay
-- fail-closed.
drop policy if exists "Allow view for authenticated" on public.document_metadata;
drop policy if exists "Allow write for admin/manager" on public.document_metadata;

drop policy if exists "Allow view for authenticated" on public.document_reviews;
drop policy if exists "Allow write for admin/manager" on public.document_reviews;

drop policy if exists "Allow view for authenticated" on public.document_versions;
drop policy if exists "Allow write for admin/manager" on public.document_versions;

commit;
