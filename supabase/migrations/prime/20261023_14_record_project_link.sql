-- ============================================================================
-- Prime migration 14 — the project link a user picks was never persisted
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- `records` has a `project_id uuid` column.  188 of the 316 live rows have
-- it filled (they came from the original system).  But NO record created
-- through this application ever got it, so every project filter in the app
-- was dead for the records people actually create:
--
--   src/pages/Index.tsx:516          r.project_id === activeProject
--   src/pages/RecordListPage.tsx:169 r.project_id === projectFilter
--   src/pages/ProjectsPage.tsx:41    PROJECTS.find(p => p.id === projectId)
--   src/pages/ProjectDetailPage.tsx:24
--
-- The chain, end to end:
--
--   1. `src/pages/RecordCreationPage.tsx:365` puts the selected project
--      into the payload (`data.project_id = selectedProjectId`) and the
--      page tells the user "This record will be linked to the selected
--      project."
--
--   2. The draft row is written by `record_draft_create` / updated by
--      `record_draft_autosave`, which store `form_data` verbatim — so the
--      id ends up inside `records.form_data->>'project_id'`, NOT in the
--      `project_id` column.  Neither function writes the column.
--
--   3. `parseRowToRecord` (src/services/recordStorage.ts:311) reads
--        project_id: row.project_id || undefined
--      AFTER spreading form_data, so the NULL column overwrites the value
--      that is sitting in form_data.  The client object ends up with
--      `project_id === undefined` and every project filter misses.
--
--   4. The same loss happens a second time on the first EDIT of a record:
--      `update_record_versioned` replaces `form_data` wholesale with the
--      Zod-validated business fields, and the Zod form schemas do not
--      declare `project_id` or `scope`, so `safeParse` strips both.  The
--      project's link and the company-wide/project-specific scope are
--      dropped from the record on its first edit.
--
-- The fix
-- -------
-- A BEFORE INSERT OR UPDATE trigger on `records` lifts the project id out
-- of `form_data` and into the `project_id` column whenever the column is
-- empty.  The column then holds what the app always believed it held, and
-- `parseRowToRecord` reads the same value the filters compare against.
--
-- The trigger is used rather than a new parameter on
-- `create_record_validated` / `record_draft_create` / `update_record_versioned`
-- on purpose: adding a parameter to those functions means DROP + CREATE
-- with a new signature (a CREATE OR REPLACE with a different signature
-- leaves an OVERLOAD behind, and an overload of a PostgREST RPC is exactly
-- the ambiguity that broke `create_notifications_batch` before).  A trigger
-- covers all three write paths — the draft create, the draft autosave and
-- the versioned update — with one object and no signature churn.
--
-- The client half of the fix is one line in
-- `src/services/preWriteValidation.ts`: `project_id` and `scope` are added
-- to the metadata key set, so Zod stops stripping them and the update path
-- stops dropping the link on the first edit.
--
-- What it does NOT change
-- -----------------------
--   * No row is rewritten: the trigger only fills a column that is empty,
--     from a value the row already carries.  The 188 imported rows keep
--     the project id they were imported with.
--   * A record with no project is unaffected — the column stays NULL.
--   * A `form_data.project_id` that is not a UUID (an old row, a bad
--     backfill) leaves the column NULL instead of failing the write: the
--     cast is guarded, because a trigger that raises would take the
--     INSERT down with it.
--
-- Idempotency
-- -----------
-- CREATE OR REPLACE + DROP TRIGGER IF EXISTS + CREATE TRIGGER; re-running
-- changes nothing.
--
-- Rollback: 20261023_14_record_project_link.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. the lift ───────────────────────────────────────────────────────────
create or replace function public.prime_sync_record_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is null
     and new.form_data is not null
     and new.form_data ? 'project_id' then
    begin
      new.project_id := nullif(btrim(new.form_data->>'project_id'), '')::uuid;
    exception when invalid_text_representation then
      -- The value is not a UUID.  Leave the column NULL rather than fail
      -- the write: the row is still valid, it is just not project-linked.
      new.project_id := null;
    end;
  end if;
  return new;
end;
$$;

-- ── 2. the trigger ────────────────────────────────────────────────────────
drop trigger if exists records_sync_project on public.records;

create trigger records_sync_project
  before insert or update of form_data, project_id
  on public.records
  for each row
  execute function public.prime_sync_record_project();

-- The trigger function is called by the table's own writes, never by a
-- client directly, so it does not need to be executable by anybody.
revoke execute on function public.prime_sync_record_project() from public, anon;

commit;
