-- ============================================================================
-- Prime migration 13 — ROLLBACK
-- Restores the table-level SELECT grant on public.profiles, so the legacy
-- `password` column is served to the `authenticated` role again.
--
-- WARNING: this puts the legacy password hashes back on the REST surface
-- for every signed-in account that asks for them.
--
-- Rollback of 20261023_13_profiles_password_column.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- The column-level grants go with the table-level one, then the
-- unrestricted table-level grant comes back.
revoke select (id, user_id, email, display_name, is_active, last_login,
               created_at, updated_at, department)
  on public.profiles from authenticated;

grant select on public.profiles to authenticated;

commit;
