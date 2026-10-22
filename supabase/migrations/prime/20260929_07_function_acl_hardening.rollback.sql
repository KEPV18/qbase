-- ============================================================================
-- QBase — rollback of 20260929_07_function_acl_hardening.sql
--
-- Restores the pre-migration privilege state: EXECUTE for PUBLIC (and hence
-- for `anon`) on the 31 functions the forward migration closed, and drops the
-- explicit `authenticated` / `service_role` grants it added.
--
-- WARNING — this re-opens the hole the forward migration closed.  After a
-- rollback the `anon` role can once again:
--   * hard-DELETE production records   (purge_all_empty_records,
--                                       purge_empty_record)
--   * overwrite any record's content    (update_record_with_lock)
--   * read every profile, email and role (admin_list_users)
--   * write notifications to admins      (emit_event, notify_admins,
--                                        notify_leadership)
-- Only roll back if the forward migration itself is being reverted, or if a
-- verified replacement for it is applied in the same change.
--
-- The grants this rollback adds are exactly the ones the forward migration
-- issued; the ones that existed before it (PUBLIC on all 31, nothing else)
-- are restored by the GRANT ... TO PUBLIC below.
-- ============================================================================

begin;

set local search_path = public, pg_catalog;

grant execute on function
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
  to public;

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
  from authenticated, service_role;

commit;
