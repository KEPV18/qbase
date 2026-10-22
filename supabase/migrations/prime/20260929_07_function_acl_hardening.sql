-- ============================================================================
-- QBase — function ACL hardening (2026-10-22)
--
-- WHY
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default.  The
-- 20260929_01_authz_spine.sql migration revoked PUBLIC/anon on an explicit
-- list of functions, but the functions it did not name kept the default
-- PUBLIC grant.  Measured after the Prime set was applied: 31 of the 54
-- public functions in this project were still executable by the `anon` role
-- — the key that ships in the browser bundle.
--
-- Four of them are RPCs the app actually calls:
--
--   admin_list_users()          -> SECURITY DEFINER, no auth check:
--                                   returns every profile, email and role
--   audit_log_server_append(..) -> internally guarded (auth.uid() is null
--                                   -> 42501), but PUBLIC by default
--   create_record_validated(..) -> internally guarded (has_role admin/manager)
--   soft_delete_record(uuid)    -> internally guarded (admin role check)
--
-- and the ones with NO internal guard are the actual damage:
--
--   purge_all_empty_records()   -> hard DELETEs every ghost record, no check
--   purge_empty_record(uuid)    -> hard DELETEs one record, no check
--   update_record_with_lock(..) -> overwrites form_data/status of ANY record
--   emit_event(..)              -> writes a notification to an admin
--   notify_admins(..)           -> writes a notification to every admin
--   notify_leadership(..)       -> writes a notification to every manager
--   get_record_by_serial(text)  -> reads a record
--   get_record_count()          -> counts records
--   get_empty_records()         -> reads every record that has no content
--   get_next_serial(text)       -> reads the serial sequence
--
-- The repo's own assessment already flagged this class as P1 with "unknown
-- EXECUTE grants (dangerous if misgranted)" — see
-- audit/PRIME-ASSESSMENT.md (A3, P1 list).  The grants are now known, and
-- they are open.
--
-- WHAT IT DOES
--
-- 1. REVOKE EXECUTE from PUBLIC and from `anon` on all 31 anon-reachable
--    public functions.
-- 2. GRANT EXECUTE back to the roles that legitimately need it:
--      * `authenticated` — the 16 RPCs the app calls, the helpers that RLS
--        policy expressions evaluate (is_admin, is_manager,
--        current_user_department, has_role) and the trigger/helper
--        functions.  Every signed-in user keeps exactly what they could do
--        before, so no app path changes.
--      * `service_role` — trusted backends, on all 31.
-- 3. The three destructive functions (purge_all_empty_records,
--    purge_empty_record, update_record_with_lock) get NO `authenticated`
--    grant: the app has zero call sites for them (audit/PRIME-ASSESSMENT.md
--    A3 — "live but orphaned"), they bypass the append-only audit trail
--    (hard DELETE / silent overwrite), and the rest of the schema treats
--    deletion as admin-only and soft (records_delete_admin +
--    soft_delete_record).  The owner (postgres) and service_role keep them.
--
-- Nothing is dropped, no body is edited, no row is touched: this is a
-- privilege change only.  Idempotent, and reversible by the .rollback.sql
-- sibling.
--
-- The `search_path` is pinned for the duration so that the argument types
-- (record_status_enum, notification_category, notification_priority)
-- resolve to exactly the ones the live functions were created with.
-- ============================================================================

begin;

set local search_path = public, pg_catalog;

-- ── 1. close the anon/PUBLIC surface ───────────────────────────────────────

revoke execute on function
  public._validate_form_required_fields(text, jsonb),
  public.admin_list_users(),
  public.audit_log_server_append(uuid, text, jsonb, jsonb, jsonb, text, text),
  public.create_notification(uuid, text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid),
  public.current_user_department(),
  public.emit_event(text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.enforce_singleton_tenant(),
  public.get_empty_records(),
  public.get_next_serial(text),
  public.get_record_by_serial(text),
  public.get_record_count(),
  public.handle_new_user(),
  public.handle_updated_at(),
  public.has_role(text),
  public.is_admin(),
  public.is_manager(),
  public.jsonb_has_any_text(jsonb),
  public.jsonb_has_user_content(jsonb, text),
  public.log_record_change(),
  public.notify_admins(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_leadership(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_on_record_decision(),
  public.prevent_audit_modification(),
  public.purge_all_empty_records(),
  public.purge_empty_record(uuid),
  public.rls_auto_enable(),
  public.set_tenant_updated_at(),
  public.soft_delete_record(uuid),
  public.update_record_with_lock(uuid, jsonb, integer, public.record_status_enum, text, uuid),
  public.update_updated_at_column()
  from public, anon;

-- ── 2. the app's own RPC surface ───────────────────────────────────────────
-- Every .rpc() call site in src/ (plus the two raw /rest/v1/rpc calls in
-- DataSanitizer.tsx).  Nothing else in the app calls an RPC.

grant execute on function
  public.admin_list_users(),
  public.audit_log_server_append(uuid, text, jsonb, jsonb, jsonb, text, text),
  public.create_notifications_batch(uuid[], text, text, text, text, text, text, text, text, jsonb, text),
  public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid),
  public.dashboard_stats(),
  public.error_report_resolve(uuid, text),
  public.error_report_submit(text, text, text, text, jsonb, jsonb),
  public.get_empty_records(),
  public.get_record_count(),
  public.record_discard_draft(uuid),
  public.record_draft_autosave(uuid, jsonb, integer, text, text),
  public.record_draft_create(text, jsonb, text, integer, text, text),
  public.record_restore(uuid),
  public.record_transition(uuid, text, text),
  public.soft_delete_record(uuid),
  public.update_record_versioned(uuid, jsonb, integer, text, text, integer, text, text, text)
  to authenticated;

-- ── 3. helpers that RLS policy expressions evaluate ────────────────────────
-- A policy expression is evaluated with the QUERYING role's privileges, so
-- losing EXECUTE on one of these breaks the query, not just the RPC.
-- Policies that call them (from the live policy set):
--   public.is_admin()             -> profiles_*, projects_read_active,
--                                    records_read_dept_or_owner,
--                                    records_update_owner_or_admin
--   public.is_manager()           -> audit_log_read_admin,
--                                    projects_write_manager_or_admin
--   public.current_user_department() -> records_read_dept_or_owner

grant execute on function
  public.current_user_department(),
  public.has_role(text),
  public.is_admin(),
  public.is_manager()
  to authenticated;

-- ── 4. internal helpers and trigger functions ──────────────────────────────
-- Called from other functions (which run as their SECURITY DEFINER owner)
-- or fired as triggers.  EXECUTE on a trigger function is only checked when
-- the trigger is created, but keeping it granted to `authenticated` removes
-- any doubt about a trigger firing on a signed-in user's statement.

grant execute on function
  public._validate_form_required_fields(text, jsonb),
  public.create_notification(uuid, text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.emit_event(text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.enforce_singleton_tenant(),
  public.get_next_serial(text),
  public.get_record_by_serial(text),
  public.handle_new_user(),
  public.handle_updated_at(),
  public.jsonb_has_any_text(jsonb),
  public.jsonb_has_user_content(jsonb, text),
  public.log_record_change(),
  public.notify_admins(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_leadership(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_on_record_decision(),
  public.prevent_audit_modification(),
  public.rls_auto_enable(),
  public.set_tenant_updated_at(),
  public.update_updated_at_column()
  to authenticated;

-- ── 5. trusted backends keep everything ───────────────────────────────────

grant execute on function
  public._validate_form_required_fields(text, jsonb),
  public.admin_list_users(),
  public.audit_log_server_append(uuid, text, jsonb, jsonb, jsonb, text, text),
  public.create_notification(uuid, text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.create_notifications_batch(uuid[], text, text, text, text, text, text, text, text, jsonb, text),
  public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid),
  public.current_user_department(),
  public.dashboard_stats(),
  public.emit_event(text, text, text, text, text, uuid, uuid, text, jsonb, uuid),
  public.enforce_singleton_tenant(),
  public.error_report_resolve(uuid, text),
  public.error_report_submit(text, text, text, text, jsonb, jsonb),
  public.get_empty_records(),
  public.get_next_serial(text),
  public.get_record_by_serial(text),
  public.get_record_count(),
  public.handle_new_user(),
  public.handle_updated_at(),
  public.has_role(text),
  public.is_admin(),
  public.is_manager(),
  public.jsonb_has_any_text(jsonb),
  public.jsonb_has_user_content(jsonb, text),
  public.log_record_change(),
  public.notify_admins(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_leadership(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb),
  public.notify_on_record_decision(),
  public.prevent_audit_modification(),
  public.purge_all_empty_records(),
  public.purge_empty_record(uuid),
  public.record_discard_draft(uuid),
  public.record_draft_autosave(uuid, jsonb, integer, text, text),
  public.record_draft_create(text, jsonb, text, integer, text, text),
  public.record_restore(uuid),
  public.record_transition(uuid, text, text),
  public.rls_auto_enable(),
  public.set_tenant_updated_at(),
  public.soft_delete_record(uuid),
  public.update_record_versioned(uuid, jsonb, integer, text, text, integer, text, text, text),
  public.update_record_with_lock(uuid, jsonb, integer, public.record_status_enum, text, uuid),
  public.update_updated_at_column()
  to service_role;

commit;
