-- ============================================================================
-- Prime migration 09 — ROLLBACK
-- Removes the table privilege layer restored by
-- 20260929_09_table_grant_layer.sql, returning the public schema to the
-- state the restore left it in (no table ACLs for anon / authenticated /
-- service_role).
--
-- !! WARNING !!
-- Rolling this back does NOT restore the pre-restore state of the ORIGINAL
-- project — it re-creates the defect: with no table privilege for
-- `authenticated`, PostgREST answers 42501 permission denied for every table
-- the application reads or writes.  Only roll back if the privilege layer has
-- to be rebuilt differently.
--
-- Idempotent: every statement is a REVOKE; re-running changes nothing.
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── drop the table privileges ──────────────────────────────────────────────
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all tables in schema public from service_role;

-- ── drop the sequence privileges ───────────────────────────────────────────
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;
revoke all on all sequences in schema public from service_role;

-- ── drop the default privileges for future tables ──────────────────────────
alter default privileges in schema public
  revoke all on tables from anon;
alter default privileges in schema public
  revoke all on tables from authenticated;
alter default privileges in schema public
  revoke all on tables from service_role;
alter default privileges in schema public
  revoke all on sequences from anon;
alter default privileges in schema public
  revoke all on sequences from authenticated;
alter default privileges in schema public
  revoke all on sequences from service_role;

commit;
