-- ============================================================================
-- Prime migration 10 — ROLLBACK
-- Restores the legacy 20260521-era policies that
-- 20260929_10_legacy_policy_cleanup.sql removed, verbatim.
--
-- !! WARNING !!
-- This rollback restores the state the Prime spine was meant to end:
--   * every signed-in user may INSERT / UPDATE / DELETE the whole SWOT
--     register again;
--   * the error_reports table becomes unreadable for everyone (the legacy
--     RESTRICTIVE lock also cancels the spine's manager-or-admin read
--     policy), while the three legacy PUBLIC policies (USING (true)) sit
--     behind it ready to expose every error report to an anonymous visitor
--     the moment that lock is lifted;
--   * the document_* tables get their world-readable policies back.
--
-- Use only to undo the cleanup itself, never as a target state.
--
-- Idempotency: every statement is DROP POLICY IF EXISTS + CREATE POLICY, so
-- re-running restores the same end state.
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── swot_items ─────────────────────────────────────────────────────────────
drop policy if exists "authenticated can select swot_items" on public.swot_items;
create policy "authenticated can select swot_items" on public.swot_items
  for select to authenticated using (true);
drop policy if exists "authenticated can insert swot_items" on public.swot_items;
create policy "authenticated can insert swot_items" on public.swot_items
  for insert to authenticated with check (true);
drop policy if exists "authenticated can update swot_items" on public.swot_items;
create policy "authenticated can update swot_items" on public.swot_items
  for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete swot_items" on public.swot_items;
create policy "authenticated can delete swot_items" on public.swot_items
  for delete to authenticated using (true);

-- ── swot_strategies ────────────────────────────────────────────────────────
drop policy if exists "authenticated can select swot_strategies" on public.swot_strategies;
create policy "authenticated can select swot_strategies" on public.swot_strategies
  for select to authenticated using (true);
drop policy if exists "authenticated can insert swot_strategies" on public.swot_strategies;
create policy "authenticated can insert swot_strategies" on public.swot_strategies
  for insert to authenticated with check (true);
drop policy if exists "authenticated can update swot_strategies" on public.swot_strategies;
create policy "authenticated can update swot_strategies" on public.swot_strategies
  for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete swot_strategies" on public.swot_strategies;
create policy "authenticated can delete swot_strategies" on public.swot_strategies
  for delete to authenticated using (true);

-- ── error_reports ──────────────────────────────────────────────────────────
drop policy if exists "Allow insert for all" on public.error_reports;
create policy "Allow insert for all" on public.error_reports
  for insert with check (true);
drop policy if exists "Allow select for admins" on public.error_reports;
create policy "Allow select for admins" on public.error_reports
  for select using (true);
drop policy if exists "Allow update for admins" on public.error_reports;
create policy "Allow update for admins" on public.error_reports
  for update using (true) with check (true);
drop policy if exists rls_lock_all on public.error_reports;
create policy rls_lock_all on public.error_reports
  as restrictive to authenticated, anon using (false) with check (false);

-- ── document_metadata / document_reviews / document_versions ──────────────
drop policy if exists "Allow view for authenticated" on public.document_metadata;
create policy "Allow view for authenticated" on public.document_metadata
  for select using ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow write for admin/manager" on public.document_metadata;
create policy "Allow write for admin/manager" on public.document_metadata
  using ((exists (select 1 from public.user_roles
                   where user_roles.user_id = auth.uid()
                     and user_roles.role = any (array['admin'::text, 'manager'::text]))))
  with check (true);

drop policy if exists "Allow view for authenticated" on public.document_reviews;
create policy "Allow view for authenticated" on public.document_reviews
  for select using ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow write for admin/manager" on public.document_reviews;
create policy "Allow write for admin/manager" on public.document_reviews
  using ((exists (select 1 from public.user_roles
                   where user_roles.user_id = auth.uid()
                     and user_roles.role = any (array['admin'::text, 'manager'::text]))))
  with check (true);

drop policy if exists "Allow view for authenticated" on public.document_versions;
create policy "Allow view for authenticated" on public.document_versions
  for select using ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow write for admin/manager" on public.document_versions;
create policy "Allow write for admin/manager" on public.document_versions
  using ((exists (select 1 from public.user_roles
                   where user_roles.user_id = auth.uid()
                     and user_roles.role = any (array['admin'::text, 'manager'::text]))))
  with check (true);

commit;
