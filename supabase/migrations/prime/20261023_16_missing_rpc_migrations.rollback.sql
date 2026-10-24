-- ============================================================================
-- Prime migration 16 — ROLLBACK
-- Drops the six functions this migration created.
--
-- WARNING: on a database that was built from the pg_dump, these six
-- functions ALREADY EXISTED and this migration only re-created them.  This
-- rollback then removes functions the application calls:
--
--   * `create_record_validated` — the create path of the register.  Every
--     "save new record" would fail with "function does not exist".
--   * `soft_delete_record`      — the delete path.  Every "delete record"
--     would fail the same way.
--
-- So this rollback is only safe on a database that did NOT have them before
-- migration 16 — that is, a database built purely from `supabase/migrations/`.
-- On the live project, do not run this: the functions are the production
-- ones and the migration was a no-op there.
--
-- Rollback of 20261023_16_missing_rpc_migrations.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

drop function if exists public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid);
drop function if exists public.soft_delete_record(uuid);
drop function if exists public.append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text);
drop function if exists public._validate_form_required_fields(text, jsonb);
drop function if exists public.get_next_serial(text);
drop function if exists public.has_role(text);

-- The enum is left in place: on the live project it predates this migration
-- (the pg_dump creates it), and dropping it would break `records.status`.
-- The DO block that created it is a no-op when the type is already there,
-- so a from-scratch build that wants it gone has to drop it explicitly.

commit;
