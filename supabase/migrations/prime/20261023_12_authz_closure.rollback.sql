-- ============================================================================
-- Prime migration 12 — ROLLBACK
-- Restores the authorization state exactly as it was before
-- 20261023_12_authz_closure.sql.
--
-- WARNING: this puts back the leaks.
--   * `admin_list_users()` loses its internal role check, so any
--     signed-in account can read every user's email, display_name,
--     is_active, last_login and role again.
--   * `profiles_authenticated_read` and `user_roles_read` come back as
--     `USING (true)`, so any signed-in account can read every profile
--     row — INCLUDING the legacy `password` column — and every row of
--     `user_roles`.
--
-- Rollback of 20261023_12_authz_closure.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. the blanket SELECT policies come back ──────────────────────────────
create policy profiles_authenticated_read
  on public.profiles
  for select
  to authenticated
  using (true);

create policy user_roles_read
  on public.user_roles
  for select
  to authenticated
  using (true);

-- ── 2. admin_list_users() without the check, exactly as it was ────────────
create or replace function public.admin_list_users()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_result jsonb;
begin
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

-- ── 3. the two helpers go ─────────────────────────────────────────────────
drop function if exists public.prime_admin_user_ids();
drop function if exists public.prime_leadership_user_ids();

commit;
