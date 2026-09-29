-- ============================================================================
-- Prime migration 02 — Record engine: versioned updates + server-side drafts
--
-- Additive. Introduces:
--   * update_record_versioned   — the single write path for record edits:
--       server-side optimistic lock, dept-based authorization, version
--       snapshot-before-every-save, audited diff. The live
--       update_record_with_lock is NOT replaced; adoption is a client-side
--       cutover (one caller), and the old RPC stays untouched for rollback.
--   * record_draft_autosave     — debounced client autosave lands here;
--       create_record_validated (existing, untouched) creates the draft with
--       p_status='draft'.
--   * record_discard_draft      — removes only the caller's own unsent draft
--       (created_by = the caller's profile email); never touches submitted
--       records.
-- ============================================================================
begin;

-- Single-write-path record update: optimistic lock + version snapshot + audit
-- in ONE server round trip, authorization checked server-side.
create or replace function public.update_record_versioned(
  p_id uuid,
  p_form_data jsonb,
  p_expected_edit_count integer default null,
  p_last_modified_by text default null,
  p_modification_reason text default null,
  p_section integer default null,
  p_section_name text default null,
  p_frequency text default null,
  p_change_summary text default null
)
returns records
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.records;
  v_actor_role text;
  v_actor_dept text;
  v_record_dept text;
  v_actor_email text;
  v_actor_name text;
  v_updated public.records;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_current from public.records
    where id = p_id and deleted_at is null for update;
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;

  -- Server-side department authorization (authority map lives in the spine's
  -- prime_record_department; admin bypasses).
  select role, department into v_actor_role, v_actor_dept
    from public.prime_user_role(auth.uid());
  v_record_dept := public.prime_record_department(v_current.form_code);

  if v_actor_role is null then
    raise exception 'Insufficient role: no role assigned' using errcode = '42501';
  end if;
  if v_actor_role <> 'admin'
     and (v_record_dept is null or v_record_dept <> coalesce(v_actor_dept, '')) then
    raise exception 'Access denied: record belongs to department %', coalesce(v_record_dept, 'UNASSIGNED')
      using errcode = '42501';
  end if;
  -- Employee-class roles (employee + legacy self-provisioned 'user' + any
  -- future role) may edit DRAFTS of their own department record only; this is
  -- fail-closed by construction — a role that is NOT in the privileged set
  -- gets the least privilege, never more.
  if v_actor_role not in ('admin', 'manager', 'dept_head')
     and v_current.status <> 'draft' then
    raise exception 'Employees can only edit records in Draft status'
      using errcode = '42501';
  end if;

  -- Optimistic lock: expected must equal current edit_count. The only caller
  -- allowed to omit it is the draft-autosave path (the row is a draft; drafts
  -- do not bump edit_count). Any non-draft update without the expected count
  -- is refused — no blind writes.
  if p_expected_edit_count is null then
    if v_current.status <> 'draft' then
      raise exception 'Conflict check required: p_expected_edit_count is mandatory for non-draft records'
        using errcode = '23509';
    end if;
  elsif p_expected_edit_count <> coalesce(v_current.edit_count, 0) then
    raise exception 'Conflict: record was modified by another user (expected edit_count %, current %)',
      p_expected_edit_count, v_current.edit_count using errcode = '23509';
  end if;

  select email, display_name into v_actor_email, v_actor_name
    from public.profiles where user_id = auth.uid() limit 1;

  -- Version snapshot BEFORE the write (immutable history, Prime §7). Draft
  -- autosaves do NOT create versions — a version is a saved, deliberate state.
  if v_current.status <> 'draft' then
    perform public.record_version_snapshot(
      p_id, to_jsonb(v_current.form_data), coalesce(p_change_summary, 'edit'));
  end if;

  update public.records
     set form_data = p_form_data,
         section = coalesce(p_section, section),
         section_name = coalesce(p_section_name, section_name),
         frequency = coalesce(p_frequency, frequency),
         last_modified_by = coalesce(p_last_modified_by, v_actor_name, auth.uid()::text),
         edit_count = coalesce(v_current.edit_count, 0) + 1,
         modification_reason = p_modification_reason,
         updated_at = now()
   where id = p_id
   returning * into v_updated;
  if not found then
    raise exception 'Update did not apply: no row matched (id %)', p_id
      using errcode = 'P0002';
  end if;

  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, serial)
  values
    (p_id, 'update',
     jsonb_build_object('form_data',
       (to_jsonb(v_current)->>'form_data') is distinct from (to_jsonb(v_updated)->>'form_data'),
        'status', v_current.status is distinct from v_updated.status),
     jsonb_build_object('form_data', to_jsonb(v_current)->'form_data'),
     jsonb_build_object('form_data', to_jsonb(v_updated)->'form_data'),
     -- performed_by is the stable profile email (server-derived), matching
     -- audit_log_server_append (Prime §15).
     coalesce((select email from public.profiles where user_id = auth.uid()), auth.uid()::text),
     'edit', v_current.form_code, v_current.serial);

  return v_updated;
end;
$$;

-- Autosave: refresh form_data of an in-progress draft. The draft row is
-- created by the existing create_record_validated (p_status='draft'); this
-- only refreshes an existing draft and refuses anything not in draft state.
create or replace function public.record_draft_autosave(
  p_draft_id uuid,
  p_form_data jsonb,
  p_section integer default null,
  p_section_name text default null,
  p_frequency text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_owner text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
    from public.records where id = p_draft_id and deleted_at is null for update;
  if not found then
    raise exception 'Draft % not found', p_draft_id using errcode = 'P0002';
  end if;
  -- Ownership server-checked: only the draft's creator or an admin may
  -- refresh it.
  if v_owner <> coalesce((select email from public.profiles
                           where user_id = auth.uid()), auth.uid()::text)
     and not public.prime_is_admin() then
    raise exception 'Access denied: not your draft' using errcode = '42501';
  end if;
  if v_status <> 'draft' then
    raise exception 'Record is not a draft (status: %)', v_status using errcode = '23514';
  end if;
  update public.records
     set form_data = p_form_data,
         section = coalesce(p_section, section),
         section_name = coalesce(p_section_name, section_name),
         frequency = coalesce(p_frequency, frequency),
         updated_at = now()
   where id = p_draft_id;
end;
$$;

-- Draft discard: only the creator or an admin; only drafts. This deletes the
-- caller's own UNSUBMITTED draft — it is not production data cleanup.
create or replace function public.record_discard_draft(p_draft_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_owner text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  select status, created_by into v_status, v_owner
    from public.records where id = p_draft_id and deleted_at is null;
  if not found then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'Only draft records can be discarded' using errcode = '23514';
  end if;
  if v_owner <> coalesce((select email from public.profiles
                           where user_id = auth.uid()), auth.uid()::text)
     and not public.prime_is_admin() then
    raise exception 'Access denied: not your draft' using errcode = '42501';
  end if;
  delete from public.record_versions where record_id = p_draft_id;
  delete from public.records where id = p_draft_id;
end;
$$;

-- record_restore — resurrect an archived (soft-deleted) record. The archive
-- read page can no longer write `records.deleted_at` directly (all record
-- writes ride the engine); restore is a manager-class action, scoped to the
-- record's department for non-admins, and audited.
create or replace function public.record_restore(p_record_id uuid)
returns records
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.records;
  v_actor_role text;
  v_actor_dept text;
  v_record_dept text;
  v_updated public.records;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_current from public.records
    where id = p_record_id for update;
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;
  if v_current.deleted_at is null then
    raise exception 'Record is not archived' using errcode = '23514';
  end if;

  select role, department into v_actor_role, v_actor_dept
    from public.prime_user_role(auth.uid());
  if v_actor_role is null then
    raise exception 'Insufficient role: no role assigned' using errcode = '42501';
  end if;
  if v_actor_role in ('employee', 'user') then
    raise exception 'Insufficient role: manager or admin required to restore records'
      using errcode = '42501';
  end if;
  -- dept_head/manager restore only records their department owns; admin bypasses.
  v_record_dept := public.prime_record_department(v_current.form_code);
  if v_actor_role <> 'admin'
     and (v_record_dept is null or v_record_dept <> coalesce(v_actor_dept, '')) then
    raise exception 'Access denied: record belongs to department %',
      coalesce(v_record_dept, 'UNASSIGNED') using errcode = '42501';
  end if;

  update public.records
     set deleted_at = null,
         updated_at = now()
   where id = p_record_id
   returning * into v_updated;
  if not found then
    raise exception 'Restore did not apply: no row matched (id %)', p_record_id
      using errcode = 'P0002';
  end if;

  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, serial)
  values
    (p_record_id, 'restore',
     jsonb_build_object('deleted_at', true),
     jsonb_build_object('deleted_at', to_jsonb(v_current.deleted_at)),
     jsonb_build_object('deleted_at', null),
     -- performed_by is the stable profile email (server-derived), matching
     -- audit_log_server_append (Prime §15).
     coalesce((select email from public.profiles where user_id = auth.uid()), auth.uid()::text),
     'workflow', v_current.form_code, v_current.serial);

  return v_updated;
end;
$$;

revoke execute on function
  public.update_record_versioned(uuid, jsonb, integer, text, text, integer, text, text, text),
  public.record_draft_autosave(uuid, jsonb, integer, text, text),
  public.record_discard_draft(uuid),
  public.record_restore(uuid)
  from public, anon;
grant execute on function
  public.update_record_versioned(uuid, jsonb, integer, text, text, integer, text, text, text),
  public.record_draft_autosave(uuid, jsonb, integer, text, text),
  public.record_discard_draft(uuid),
  public.record_restore(uuid)
  to authenticated;

commit;