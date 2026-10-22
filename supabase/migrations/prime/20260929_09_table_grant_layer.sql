-- ============================================================================
-- Prime migration 09 — Restore the table privilege layer of the public schema
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Applied:      2026-10-22
-- ============================================================================
--
-- Why this migration exists
-- -------------------------
-- The original project (iouuikteroixnsqazznc) gave the application roles
-- their table privileges through Supabase's project-level default privileges
-- in the public schema:
--
--     alter default privileges in schema public
--       grant all on tables to postgres, anon, authenticated, service_role;
--
-- pg_dump does NOT dump default privileges, and the restore recreated the 18
-- application tables as plain CREATE TABLE statements.  The consequence on the
-- restored project is that every public table shows "(no acl)": only the owner
-- (postgres) holds any privilege, and
--
--     select table_name, grantee from information_schema.role_table_grants
--       where table_schema = 'public'
--
-- returns nothing for anon / authenticated / service_role.
--
-- Table privileges and RLS are two INDEPENDENT layers.  A policy is never
-- evaluated for a role that lacks the underlying table privilege, so with the
-- privilege layer missing PostgREST answers
--
--     42501 permission denied for table records
--
-- for every table the application touches — including for a signed-in
-- administrator.  The RLS policies in this database are correct and stay
-- untouched by this migration: the grants below are only the FLOOR, every
-- row-level decision remains with the policies.
--
-- What is granted
-- ---------------
--   postgres       all                      (owner; explicit for clarity)
--   service_role  all                      (trusted backend role)
--   authenticated  select on every table    (the application's read surface)
--   authenticated  insert / update / delete on the tables the application
--                  writes directly (the rest of the write surface is reached
--                  through the SECURITY DEFINER RPCs, which are unaffected by
--                  table privileges)
--   anon           select on tenant_settings ONLY — the one table whose
--                  policy (tenant_settings_read_all) is intentionally world
--                  readable, because the company identity is used for client
--                  branding before sign-in.  Every other table stays closed
--                  to anon: no permissive policy names the role, and the
--                  rls_block_anon / rls_lock_all restrictive policies back
--                  that up.  This is deliberately tighter than the
--                  platform default, and it matches the anon hardening of
--                  migration 07 (31 anon-reachable functions -> 0).
--
-- What is NOT granted, and why
-- ---------------------------
--   * DELETE on records — the Prime design keeps hard deletes behind
--     soft_delete_record; the restrictive policy rls_deny_records_delete
--     denies them anyway.  Leaving the privilege off makes the refusal
--     explicit (42501) instead of a silent zero-row delete.
--   * INSERT / UPDATE / DELETE on audit_log — the audit trail is append-only
--     through the audit_log_server_append RPC and is immutable by policy.
--   * INSERT / UPDATE / DELETE on error_reports — the browser never writes
--     that table; submissions ride the SECURITY DEFINER RPC
--     error_report_submit.
--   * INSERT / UPDATE / DELETE on user_roles — role management rides the
--     admin_* RPCs.
--   * TRUNCATE / REFERENCES / TRIGGER on anything — never needed by an
--     application, and TRUNCATE bypasses row-level security.
--
-- Idempotency
-- -----------
-- Every statement is a GRANT; re-running this file changes nothing.
--
-- Rollback: 20260929_09_table_grant_layer.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── schema usage ───────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

-- ── owner and trusted backend role: full access ───────────────────────────
grant all on all tables in schema public to postgres;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to postgres;
grant all on all sequences in schema public to service_role;

-- ── signed-in user: the application's read surface ─────────────────────────
grant select on all tables in schema public to authenticated;

-- ── signed-in user: the tables the application writes directly ────────────
-- records: created/updated directly by the legacy flows as well as through
--          the engine RPCs; the policies decide which rows.
grant insert, update on public.records to authenticated;

-- profiles: the user edits their own profile row.
grant update on public.profiles to authenticated;

-- notifications: the user marks their own notifications read / removes them.
grant update, delete on public.notifications to authenticated;

-- capas / risks: registering and editing a risk or a CAPA is a normal user
--               action; the policies decide which rows.
grant insert, update on public.capas to authenticated;
grant insert, update on public.risks to authenticated;

-- processes: the process register is edited by managers/admins (policy).
grant insert, update on public.processes to authenticated;

-- tenant_settings: the single tenant row, manager/admin-write (policy).
grant insert, update on public.tenant_settings to authenticated;

-- ── anonymous visitor: the world-readable tenant settings only ─────────────
grant select on public.tenant_settings to anon;

-- ── sequences ─────────────────────────────────────────────────────────────
-- No sequence exists in the public schema today (every key is a uuid), but
-- the grant is explicit so a future identity column is usable immediately.
grant usage, select on all sequences in schema public to authenticated;

-- ── default privileges: future tables inherit the same floor ─────────────
-- NOTE: the application schema requires RLS on every table; a new table must
-- ship its policies in the same migration that creates it, otherwise the
-- grant above is the only barrier.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant all on sequences to service_role;

commit;
