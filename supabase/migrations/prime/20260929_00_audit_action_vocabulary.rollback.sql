-- ============================================================================
-- QBase — rollback of 20260929_00_audit_action_vocabulary.sql
--
-- Restores the original closed vocabulary on public.audit_log.action:
--     ('create','update','delete','status_change')
--
-- CAVEAT — the rollback VALIDATES existing rows.  If any audit row already
-- carries one of the widened values ('ai_assisted_create',
-- 'workflow_transition', 'discard', 'restore', 'error_report_resolved'),
-- the ADD CONSTRAINT fails and the rollback stops.  That is deliberate: those
-- rows are real audit evidence and must not be rewritten or deleted to make a
-- rollback pass.  In that case, restore the constraint as NOT VALID and
-- reconcile the rows separately:
--
--   alter table public.audit_log add constraint audit_log_action_check
--     check (action = any (array['create','update','delete','status_change']))
--     not valid;
--
-- ============================================================================

begin;

alter table public.audit_log drop constraint audit_log_action_check;

alter table public.audit_log add constraint audit_log_action_check check (
  action = any (array['create','update','delete','status_change'])
);

commit;
