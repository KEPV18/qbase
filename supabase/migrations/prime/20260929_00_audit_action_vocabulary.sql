-- ============================================================================
-- QBase — audit action vocabulary (2026-10-22)
--
-- WHY
--
-- public.audit_log carries a CHECK constraint that closed the vocabulary at
--     ('create','update','delete','status_change')
-- but two callers write values outside it:
--
--   * src/ai/tools/draftRecordContent.ts appends 'ai_assisted_create' through
--     audit_log_server_append — the app's own type union at
--     src/services/auditLog.ts:93 already lists that value, so the database
--     was narrower than the code.  The provenance row never landed.
--   * the Prime engine appends 'workflow_transition' (20260929_01),
--     'discard' and 'restore' (20260929_02) and 'error_report_resolved'
--     (20260929_06).
--
-- The consequence is not a lost audit row, it is a lost TRANSACTION: those
-- functions insert the audit row as part of their work, so a rejected insert
-- rolls the whole function back.  record_transition would therefore refuse
-- every approve/reject, record_discard_draft would refuse every discard,
-- record_restore would refuse every restore, and error_report_resolve would
-- refuse every resolution.
--
-- WHAT IT DOES
--
-- Widens the vocabulary to the union of what the app and the engine write.
-- Purely additive: every value that was valid before stays valid, and no row
-- is rewritten.  The constraint stays in place — it is still a closed set, and
-- it still rejects anything outside it.
--
-- Idempotent: safe to re-run.
-- Reversible: 20260929_00_audit_action_vocabulary.rollback.sql
-- ============================================================================

begin;

-- Guard: the constraint this migration replaces must be there.  If it is not,
-- the schema is not the one this migration was written against, and applying
-- it anyway would leave two overlapping constraints on the same column.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.audit_log'::regclass
       and conname = 'audit_log_action_check'
  ) then
    raise exception
      'public.audit_log.audit_log_action_check is missing — aborting, the schema is not the expected one';
  end if;
end $$;

alter table public.audit_log drop constraint audit_log_action_check;

alter table public.audit_log add constraint audit_log_action_check check (
  action = any (array[
    -- the original vocabulary
    'create',
    'update',
    'delete',
    'status_change',
    -- written by the app
    'ai_assisted_create',
    -- written by the Prime engine
    'workflow_transition',
    'discard',
    'restore',
    'error_report_resolved'
  ])
);

commit;
