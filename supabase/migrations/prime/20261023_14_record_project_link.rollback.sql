-- ============================================================================
-- Prime migration 14 — ROLLBACK
-- Removes the trigger that lifts `form_data.project_id` into the
-- `records.project_id` column.
--
-- WARNING: after this, records created through the application have a NULL
-- `project_id` column again, so every project filter in the app
-- (Index.tsx, RecordListPage.tsx, ProjectsPage.tsx, ProjectDetailPage.tsx)
-- stops matching them.  The value stays inside `form_data`, but
-- `parseRowToRecord` prefers the (empty) column over it.
--
-- Rollback of 20261023_14_record_project_link.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

drop trigger if exists records_sync_project on public.records;
drop function if exists public.prime_sync_record_project();

commit;
