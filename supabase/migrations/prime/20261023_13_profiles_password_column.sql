-- ============================================================================
-- Prime migration 13 — the legacy `profiles.password` column was still
--                        readable through the app's REST surface
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- Migration 12 stopped every signed-in account from reading every profile
-- row.  What it did not do is stop a legitimate ADMIN from reading the
-- `password` column of a profile row — and that column still holds data.
--
--   \d public.profiles
--     id            uuid
--     user_id       uuid
--     email         text
--     display_name  text
--     password      text      <-- legacy SHA-256 hash of the old system's
--                                   passwords; nothing reads or writes it
--     is_active     boolean
--     …
--
-- Facts measured on the local copy (post-migration-12 state):
--
--   * 4 of the 6 profile rows carry a non-empty `password` value.
--   * `handle_new_user()` — the trigger that creates a profile for every
--     new sign-up — does NOT write the column.  It has been dead since
--     the passwords moved to Supabase Auth (GoTrue).
--   * No client code reads or writes it.  `src/services/userService.ts`
--     maps it to "" on the way in, and the change-password flow
--     (`src/hooks/useUserManagement.ts:258`) re-authenticates against
--     GoTrue and calls `supabase.auth.updateUser` instead of comparing
--     hashes.
--
-- So the column is a stored-credential relic that the application has
-- no reason to serve.  With table-level SELECT granted to
-- `authenticated`, any client that asked for `select=*` on `profiles` —
-- or named the column explicitly — could pull the hashes out of
-- PostgREST, admin or not.
--
-- The fix
-- -------
-- Table-level SELECT is replaced by COLUMN-level SELECT for the nine
-- columns the application actually uses, so `password` stops being
-- served to the `authenticated` role:
--
--   revoke select on public.profiles from authenticated;
--   grant  select (id, user_id, email, display_name, is_active,
--                  last_login, created_at, updated_at, department)
--     on public.profiles to authenticated;
--
-- The data is NOT touched: the column, its type and its four values stay
-- exactly as they are, so a one-time migration of the old hashes is
-- still possible by the owner.  `service_role` and the table owner keep
-- the unrestricted table-level grant, so anything that needs the column
-- (a deliberate export, a migration script) can still read it.
--
-- Nothing in the application breaks, because no code path selects the
-- column.  Every `profiles` read in the codebase names its columns
-- explicitly:
--
--   src/services/userService.ts:171  id, user_id, display_name, email,
--                                    is_active, last_login, created_at,
--                                    updated_at, department
--   src/services/userService.ts:190  the same list
--   src/hooks/useSupabaseAuth.ts:459 an UPDATE of `last_login`, which
--                                    keeps the table-level UPDATE grant
--
-- and the one RPC that returns profile rows (`admin_list_users`) is
-- SECURITY DEFINER, so it runs as the table owner and is unaffected.
--
-- The RLS policies stay in force: `profiles_read_own_or_admin` and
-- `profiles_update_own_or_admin` reference `user_id`, which is granted,
-- so both still evaluate.
--
-- Idempotency
-- -----------
-- REVOKE / GRANT; re-running changes nothing.
--
-- Rollback: 20261023_13_profiles_password_column.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- Table-level SELECT goes; the nine columns the app uses come back one
-- by one.  `password` is deliberately absent.
revoke select on public.profiles from authenticated;

grant select (
  id,
  user_id,
  email,
  display_name,
  is_active,
  last_login,
  created_at,
  updated_at,
  department
) on public.profiles to authenticated;

commit;
