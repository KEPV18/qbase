-- ============================================================================
-- Prime migration 12 — the authorization layer was still open in two places
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- Migration 11 closed the `records` table.  Two more holes of exactly the
-- same shape were still open, and both are reachable by ANY signed-in
-- account (role 'user' included):
--
-- 1. `admin_list_users()` is a SECURITY DEFINER function with EXECUTE
--    granted to `authenticated`, and it had NO role check inside the body.
--    It aggregates every row of `public.profiles` — email, display_name,
--    is_active, last_login and the user's role — and hands the result to
--    any caller.  The only thing standing between a plain account and the
--    full user list was a `RequireRole` in the React router, which is a
--    client-side check and is not a security boundary.
--
--    The five sibling RPCs (`admin_create_profile`,
--    `admin_deactivate_profile`, `admin_delete_user_role`,
--    `admin_update_profile`, `admin_upsert_user_role`) all open with
--
--       if not public.prime_is_admin() then raise exception … 42501
--
--    and `admin_upsert_tenant_settings` opens with
--    `prime_is_manager_or_admin()`.  `admin_list_users` was the one that
--    was missed.
--
-- 2. Two SELECT policies are `USING (true)`:
--
--       profiles_authenticated_read   SELECT  true
--       user_roles_read               SELECT  true
--
--    Permissive policies are OR-ed, so these two decide their tables on
--    their own.  Every signed-in account could therefore read:
--
--      * every row of `public.profiles` — INCLUDING THE `password` COLUMN.
--        That column is a legacy SHA-256 hash of the old system's
--        passwords.  The client never reads it (userService maps it to
--        "" and the change-password flow re-authenticates against GoTrue
--        instead), but the DATABASE still served it.  Measured on the
--        local copy: a plain 'user' account could SELECT 6 of 6 profile
--        rows, 4 of which carried a non-empty password hash.
--
--      * every row of `public.user_roles` — every user's role and
--        department.
--
--    The scoped policies that were meant to govern these tables are
--    already in place and correct:
--
--       profiles_read_own_or_admin  SELECT  (user_id = auth.uid()) OR is_admin()
--       user_roles_read_own_or_admin SELECT (user_id = auth.uid()) OR is_manager()
--
--    so dropping the blanket policies leaves exactly the intended rule.
--
-- The fix
-- -------
--   A. `admin_list_users()` gains the same internal check its five
--      siblings already have.  The check belongs in the FUNCTION, not in
--      the UI: a SECURITY DEFINER function is the boundary.
--
--   B. `profiles_authenticated_read` and `user_roles_read` are dropped.
--
--   C. Two new SECURITY DEFINER helpers replace the client-side reads
--      of the whole `user_roles` table:
--
--        prime_admin_user_ids()      -> jsonb array of user_id
--        prime_leadership_user_ids() -> jsonb array of user_id
--
--      The event bus needs the admin/manager user ids to address
--      notifications (`create_notifications_batch` takes a p_user_ids
--      array), and it needs them as a NON-admin user — an employee
--      creating a record must be able to notify the admins.  Reading the
--      whole `user_roles` table was how it did that.  These two functions
--      return the same ids without exposing every user's role and
--      department to every client, and they are granted to
--      `authenticated` only.
--
-- What this changes for the accounts that exist
-- ---------------------------------------------
--   * admins: unchanged.  `is_admin()` still lets them read every
--     profile and every user_role, and `admin_list_users()` still returns
--     the full list to them.
--   * managers: unchanged for `user_roles` (is_manager()), and they now
--     read only their own profile row.
--   * dept heads: unchanged for their own rows.
--   * a plain 'user': the profile list and the role table are no longer
--     theirs to read.  They still see their own profile, their own role,
--     and they can still address notifications to admins and managers
--     through the two new helpers.
--
--   The admin accounts page (/admin/accounts) is the only client caller
--   of `admin_list_users()`, and it is already behind `RequireRole
--   roles={["admin"]}`, so the new check changes no user-visible flow.
--
-- No table data is read or written by this migration, and no privilege is
-- widened: the two new functions are revoked from PUBLIC and anon and
-- granted to `authenticated` only.
--
-- Idempotency
-- -----------
-- Every statement is DROP POLICY IF EXISTS / CREATE OR REPLACE / REVOKE /
-- GRANT; re-running changes nothing.
--
-- Rollback: 20261023_12_authz_closure.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. admin_list_users() gets the check its siblings already have ────────
-- The role test is inside the function because the function is
-- SECURITY DEFINER: it runs as its owner and therefore bypasses the
-- table's RLS.  Without an internal check, EXECUTE to `authenticated` is
-- the only gate, and that gate is open to every signed-in account.
create or replace function public.admin_list_users()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_result jsonb;
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;

  select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'email', p.email,
      'display_name', p.display_name,
      'is_active', p.is_active,
      'last_login', p.last_login,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'role', (select ur.role from public.user_roles ur where ur.user_id = p.user_id limit 1)
    ))
    into v_result
    from public.profiles p;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- ── 2. the two blanket SELECT policies go ─────────────────────────────────
-- Either of these on its own decides its table: permissive policies are
-- OR-ed, and both say `USING (true)`.
--
-- The scoped policies that remain are:
--   profiles_read_own_or_admin   (user_id = auth.uid()) OR is_admin()
--   user_roles_read_own_or_admin  (user_id = auth.uid()) OR is_manager()
drop policy if exists profiles_authenticated_read on public.profiles;
drop policy if exists user_roles_read on public.user_roles;

-- ── 3. the notification audience, without the table ──────────────────────
-- The event bus resolves "who should see this event" to a list of user
-- ids and hands that list to create_notifications_batch().  It did that
-- by reading the whole user_roles table, which is why that table needed a
-- blanket policy.  These two functions return the same two lists
-- (admins; admins + managers) and expose no other user's role or
-- department.
create or replace function public.prime_admin_user_ids()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(ur.user_id order by ur.user_id), '[]'::jsonb)
    from public.user_roles ur
   where ur.role = 'admin'
     and ur.user_id is not null;
$$;

create or replace function public.prime_leadership_user_ids()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(ur.user_id order by ur.user_id), '[]'::jsonb)
    from public.user_roles ur
   where ur.role in ('admin', 'manager')
     and ur.user_id is not null;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, and
-- `anon` is a member of PUBLIC.  These two read the user roles, so they
-- are for signed-in users only.
revoke execute on function public.prime_admin_user_ids() from public, anon;
revoke execute on function public.prime_leadership_user_ids() from public, anon;
grant execute on function public.prime_admin_user_ids() to authenticated;
grant execute on function public.prime_leadership_user_ids() to authenticated;

commit;
