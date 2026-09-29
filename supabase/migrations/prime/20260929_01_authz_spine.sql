-- ============================================================================
-- Prime migration 01 — Authorization spine (SECURITY DEFINER RPC family)
--
-- Idempotent, additive, backward-compatible. No table is dropped, no policy is
-- silently weakened: every policy change is DROP IF EXISTS + explicit CREATE of
-- a NARROWER (fail-closed) policy, and every helper REVOKEs from anon.
--
-- Rule compliance (Prime mandate §13–15):
--  * fail closed on every check (no role ⇒ deny)
--  * actor identity is derived from auth.uid() server-side — clients cannot
--    assert another user's identity for privileged operations
--  * audit trail: server-derived actor, deny UPDATE/DELETE on audit_log
-- ============================================================================
begin;

-- ── helpers ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER + pinned search_path (security hardening per Postgres best
-- practice), STABLE because they only read user_roles.

create or replace function public.prime_user_role(p_user_id uuid default null)
returns table (role text, department text)
language sql security definer stable set search_path = '' as $$
  select ur.role, ur.department
    from public.user_roles ur
   where ur.user_id = coalesce(p_user_id, auth.uid())
     and coalesce(ur.role, '') <> ''
   order by ur.created_at asc
   limit 1;
$$;

create or replace function public.prime_is_admin()
returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role = 'admin'
  );
$$;

create or replace function public.prime_is_manager_or_admin()
returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role in ('admin', 'dept_head', 'manager')
  );
$$;

-- Form → department ownership map. Single authority shared by the workflow
-- engine (record_transition), the versioned update path (update_record_versioned)
-- and record_restore, so the map can never disagree with the client's
-- FORM_DEPT_MAP in one engine but agree in another.
create or replace function public.prime_record_department(p_form_code text)
returns text
language sql immutable set search_path = '' as $$
  select case p_form_code
    when 'F/08' then 'Sales' when 'F/09' then 'Sales' when 'F/10' then 'Sales' when 'F/50' then 'Sales'
    when 'F/28' then 'HR' when 'F/29' then 'HR' when 'F/30' then 'HR' when 'F/40' then 'HR'
    when 'F/41' then 'HR' when 'F/42' then 'HR' when 'F/43' then 'HR' when 'F/44' then 'HR'
    when 'F/11' then 'Operations' when 'F/12' then 'Operations' when 'F/13' then 'Operations'
    when 'F/14' then 'Operations' when 'F/15' then 'Operations' when 'F/16' then 'Operations'
    when 'F/18' then 'Operations' when 'F/19' then 'Operations' when 'F/22' then 'Operations'
    when 'F/24' then 'Operations' when 'F/25' then 'Operations'
    when 'F/17' then 'Quality' when 'F/47' then 'Quality'
    when 'F/32' then 'RD' when 'F/34' then 'RD' when 'F/35' then 'RD' when 'F/37' then 'RD'
    when 'F/20' then 'Management' when 'F/21' then 'Management' when 'F/23' then 'Management'
    when 'F/45' then 'Management' when 'F/46' then 'Management' when 'F/48' then 'Management'
    else null end;
$$;

revoke execute on function public.prime_user_role(uuid) from public, anon;
revoke execute on function public.prime_is_admin() from public, anon;
revoke execute on function public.prime_is_manager_or_admin() from public, anon;
revoke execute on function public.prime_record_department(text) from public, anon;
grant execute on function public.prime_user_role(uuid) to authenticated;
grant execute on function public.prime_is_admin() to authenticated;
grant execute on function public.prime_is_manager_or_admin() to authenticated;
grant execute on function public.prime_record_department(text) to authenticated;

-- ── privileged operation RPCs (server-side authorization) ──────────────────

-- Role management: only admin, server-verified. One role row per user.
create or replace function public.admin_upsert_user_role(
  p_user_id uuid, p_role text, p_department text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;
  -- Canonical assignable vocabulary = roles the engine has semantics for
  -- (employee-class: 'employee' + legacy self-provisioned 'user'; privileged:
  -- 'admin','manager','dept_head'). Unknown strings are rejected, never stored.
  if p_role not in ('admin', 'manager', 'dept_head', 'employee', 'user') then
    raise exception 'Invalid role: %', p_role using errcode = '22P02';
  end if;
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22004';
  end if;
  insert into public.user_roles (user_id, role, department)
       values (p_user_id, p_role, p_department)
       on conflict (user_id) do update
         set role = excluded.role, department = excluded.department;
end;
$$;

create or replace function public.admin_delete_user_role(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;
  -- Guard: never allow the last admin to be demoted by this path.
  if exists (
    select 1 from public.user_roles ur
     where ur.user_id = p_user_id and ur.role = 'admin'
  ) and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the only admin role' using errcode = '23505';
  end if;
  delete from public.user_roles where user_id = p_user_id;
end;
$$;

-- Profile lifecycle: creation must always ride an admin decision.
create or replace function public.admin_create_profile(
  p_user_id uuid, p_email text, p_display_name text,
  p_department text default null, p_is_active boolean default true
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;
  insert into public.profiles (user_id, email, display_name, department, is_active)
       values (p_user_id, p_email, p_display_name, p_department, p_is_active)
       on conflict (user_id) do update
         set email = excluded.email,
             display_name = excluded.display_name,
             department = excluded.department,
             is_active = true,
             updated_at = now()
       returning profiles.id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_deactivate_profile(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;
  update public.profiles set is_active = false, updated_at = now()
   where user_id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Admin profile edit: coalesce-set any of email/display_name/department/
-- is_active/last_login on ONE server-validated path (replaces direct
-- authenticated UPDATEs on other users' profile rows).
create or replace function public.admin_update_profile(
  p_user_id uuid, p_email text default null, p_display_name text default null,
  p_department text default null, p_is_active boolean default null,
  p_last_login timestamptz default null
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;
  update public.profiles
     set email = coalesce(p_email, email),
         display_name = coalesce(p_display_name, display_name),
         department = coalesce(p_department, department),
         is_active = coalesce(p_is_active, is_active),
         last_login = coalesce(p_last_login, last_login),
         updated_at = now()
   where user_id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Tenant settings: single row, manager/admin-write via RPC, world-readable
-- (same read scope as today: company identity is used for client branding).
create or replace function public.admin_upsert_tenant_settings(
  p_company_name text, p_company_logo_url text default null, p_theme_color text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_existing uuid;
begin
  if not public.prime_is_manager_or_admin() then
    raise exception 'Insufficient role: manager or admin required' using errcode = '42501';
  end if;
  select id into v_existing from public.tenant_settings order by created_at asc limit 1;
  if v_existing is not null then
    update public.tenant_settings
       set company_name = p_company_name,
           company_logo_url = p_company_logo_url,
           theme_color = p_theme_color,
           updated_at = now(),
           updated_by = auth.uid()::text
     where id = v_existing;
    return v_existing;
  end if;
  insert into public.tenant_settings (company_name, company_logo_url, theme_color, updated_by)
       values (p_company_name, p_company_logo_url, p_theme_color, auth.uid()::text)
       returning id into v_id;
  return v_id;
end;
$$;

-- Self-provisioning (Prime D1): first-signup profile creation no longer needs
-- a direct profiles insert from the browser. The email is derived from
-- auth.users server-side — a caller can only provision their OWN identity.
create or replace function public.self_provision_profile(
  p_display_name text default null, p_department text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    insert into public.profiles (user_id, email, display_name, department, is_active)
         values (auth.uid(),
                 (select email from auth.users where id = auth.uid()),
                 coalesce(p_display_name, 'User'), p_department, true)
         returning public.profiles.id into v_id;
    -- First provisioning also self-assigns the legacy 'user' role (employee-
    -- class server-side) so first-login bootstrap completes without any direct
    -- user_roles write from the browser. Existing users' roles are NEVER
    -- touched here — an admin-deactivated role stays deleted.
    insert into public.user_roles (user_id, role, department)
         values (auth.uid(), 'user', p_department);
    return v_id;
  end if;
  -- Already provisioned: re-sync own display fields ONLY (role untouched).
  update public.profiles
     set display_name = coalesce(p_display_name, display_name),
         department = coalesce(p_department, department),
         last_login = now(),
         updated_at = now()
   where user_id = auth.uid();
  select id into v_id from public.profiles where user_id = auth.uid();
  return v_id;
end;
$$;

-- Audit log append that derives the actor server-side. performed_by remains a
-- display string; the authoritative actor is auth.uid() on every call.
-- NOTE: no client-supplied actor parameter — performed_by is derived from
-- auth.uid() server-side, so audit attribution cannot be forged (Prime §15).
create or replace function public.audit_log_server_append(
  p_record_id uuid, p_action text, p_changed_fields jsonb default null,
  p_previous_values jsonb default null, p_new_values jsonb default null,
  p_form_code text default null, p_serial text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: audit writes require an authenticated session'
      using errcode = '42501';
  end if;
  select email into v_user from public.profiles where user_id = auth.uid() limit 1;
  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, serial, user_email)
  values
    (p_record_id, p_action, p_changed_fields, p_previous_values, p_new_values,
     coalesce(v_user, auth.uid()::text),
     'system', p_form_code, p_serial, null)
  returning id into v_id;
  return v_id;
end;
$$;

-- The LEGACY client-callable audit RPC accepts a forgeable p_performed_by —
-- with it, any authenticated session could attribute audit rows to an
-- arbitrary identity (Prime §15: no forgery). Withhold it from every role:
-- audit rows get written by the engine paths themselves and, where a client
-- must append (e.g. legacy create flow), by audit_log_server_append, which
-- derives the actor from auth.uid() alone. Signature verified against the
-- production OpenAPI document before revoking.
do $$ begin
  revoke execute on function public.append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text)
    from public, anon, authenticated;
exception when undefined_function then null;  -- legacy RPC not present here
end $$;

-- Workflow transition engine (Prime §6) — the single authority for status
-- changes. Validates the transition against permitted state edges and the
-- actor's server-derived role; writes the audit row itself.
create or replace function public.record_transition(
  p_record_id uuid,
  p_target_status text,
  p_reason text default null
)
returns records
language plpgsql security definer set search_path = '' as $$
declare
  v_current text;
  v_target_status text := p_target_status;
  v_form_code text;
  v_actor_role text;
  v_actor_dept text;
  v_record_dept text;
  v_actor_name text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select status, form_code into v_current, v_form_code
    from public.records where id = p_record_id and deleted_at is null;
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;

  select role, department into v_actor_role, v_actor_dept
    from public.prime_user_role(auth.uid());

  -- Fail closed: a session with no server-derived role may not transition
  -- anything (Prime §13).
  if v_actor_role is null then
    raise exception 'Insufficient role: no role assigned' using errcode = '42501';
  end if;

  -- Form→department mapping kept in sync with the client's FORM_DEPT_MAP.
  v_record_dept := public.prime_record_department(v_form_code);

  if p_target_status not in ('draft', 'pending_review', 'approved', 'rejected') then
    raise exception 'Invalid target status: %', p_target_status using errcode = '22P02';
  end if;

  -- Transition graph (single authority, validated server-side):
  --   draft → pending_review / approved (Rule A/B creators land approved)/ rejected-on-edit
  --   pending_review → approved|rejected  (admin or owning dept_head)
  --   rejected → draft (rework) ; approved → draft (reopen, manager/admin only)
  if not (
    (v_current = 'draft'      and v_target_status in ('pending_review', 'approved', 'rejected')) or
    (v_current = 'pending_review' and v_target_status in ('approved', 'rejected')) or
    (v_current = 'rejected'   and v_target_status = 'draft') or
    (v_current = 'approved'   and v_target_status = 'draft')
  ) then
    raise exception 'Transition % → % is not permitted', v_current, p_target_status
      using errcode = '23514';
  end if;

  if v_target_status in ('approved', 'rejected') then
    if not (
      v_actor_role = 'admin'
      or (v_actor_role = 'dept_head' and v_record_dept is not null
          and v_record_dept = v_actor_dept)
    ) then
      raise exception 'Insufficient role: admin or owning department head required'
        using errcode = '42501';
    end if;
  elsif v_current = 'approved' and v_target_status = 'draft' then
    if v_actor_role not in ('admin', 'dept_head', 'manager') then
      raise exception 'Insufficient role to reopen an approved record' using errcode = '42501';
    end if;
  end if;

  select display_name into v_actor_name
    from public.profiles where user_id = auth.uid() limit 1;

  update public.records
     set status = p_target_status::public.record_status_enum,
         last_modified_by = coalesce(v_actor_name, auth.uid()::text),
         edit_count = edit_count + 1,
         modification_reason = coalesce(p_reason, 'workflow: ' || v_current || ' → ' || p_target_status),
         updated_at = now()
   where id = p_record_id;
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;

  -- Audit the transition (server-derived actor).
  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, user_email)
  values
    (p_record_id, 'workflow_transition',
     jsonb_build_object('status', true),
     jsonb_build_object('status', v_current),
     jsonb_build_object('status', p_target_status),
     -- performed_by is the stable profile email (server-derived), never a
     -- client-supplied display name; convention shared with
     -- audit_log_server_append (Prime §15).
     coalesce((select email from public.profiles where user_id = auth.uid()), auth.uid()::text),
     'workflow', v_form_code, null);

  return (select r from public.records r where r.id = p_record_id);
end;
$$;

-- Immutable record version snapshot (Prime §7). Called inside the update path.
create or replace function public.record_version_snapshot(
  p_record_id uuid, p_form_data jsonb, p_change_summary text default null
)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_next integer;
  v_user text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  select coalesce(max(version), 0) + 1 into v_next
    from public.record_versions where record_id = p_record_id;
  select display_name into v_user from public.profiles where user_id = auth.uid() limit 1;
  insert into public.record_versions
    (record_id, version, form_data, changed_by, changed_by_user_id, change_summary)
  values
    (p_record_id, v_next, p_form_data,
     coalesce(v_user, auth.uid()::text), auth.uid(), p_change_summary);
  return v_next;
end;
$$;

revoke execute on function
  public.admin_upsert_user_role(uuid, text, text),
  public.admin_delete_user_role(uuid),
  public.admin_create_profile(uuid, text, text, text, boolean),
  public.admin_update_profile(uuid, text, text, text, boolean, timestamptz),
  public.admin_deactivate_profile(uuid),
  public.admin_upsert_tenant_settings(text, text, text),
  public.record_transition(uuid, text, text),
  public.record_version_snapshot(uuid, jsonb, text),
  public.self_provision_profile(text, text)
  from public, anon;
grant execute on function
  public.admin_upsert_user_role(uuid, text, text),
  public.admin_delete_user_role(uuid),
  public.admin_create_profile(uuid, text, text, text, boolean),
  public.admin_update_profile(uuid, text, text, text, boolean, timestamptz),
  public.admin_deactivate_profile(uuid),
  public.record_transition(uuid, text, text),
  public.record_version_snapshot(uuid, jsonb, text),
  public.self_provision_profile(text, text)
  to authenticated;
grant execute on function
  public.admin_upsert_tenant_settings(text, text, text),
  public.audit_log_server_append(uuid, text, jsonb, jsonb, jsonb, text, text)
  to authenticated;

-- ── RLS hardening ──────────────────────────────────────────────────────────

-- audit_log: immutable, append via RPC only.
drop policy if exists audit_log_update_admin on public.audit_log;
drop policy if exists audit_log_delete_admin on public.audit_log;
drop policy if exists audit_log_insert_authenticated on public.audit_log;
drop policy if exists audit_log_deny_update on public.audit_log;
drop policy if exists audit_log_deny_delete on public.audit_log;
drop policy if exists audit_log_insert_server_rpc on public.audit_log;
create policy audit_log_deny_update on public.audit_log
  for update to authenticated, anon using (false) with check (false);
create policy audit_log_deny_delete on public.audit_log
  for delete to authenticated, anon using (false);
create policy audit_log_insert_server_rpc on public.audit_log
  for insert to authenticated with check (false);

-- tenant_settings: world-readable, manager/admin-write via RPC.
alter table public.tenant_settings enable row level security;
drop policy if exists tenant_settings_read_all on public.tenant_settings;
create policy tenant_settings_read_all on public.tenant_settings
  for select to anon, authenticated using (true);
drop policy if exists tenant_settings_insert_admin on public.tenant_settings;
create policy tenant_settings_insert_admin on public.tenant_settings
  for insert to authenticated with check (public.prime_is_manager_or_admin());
drop policy if exists tenant_settings_write_admin on public.tenant_settings;
create policy tenant_settings_write_admin on public.tenant_settings
  for update to authenticated using (public.prime_is_manager_or_admin())
  with check (public.prime_is_manager_or_admin());
drop policy if exists tenant_settings_delete_admin on public.tenant_settings;
create policy tenant_settings_delete_admin on public.tenant_settings
  for delete to authenticated using (public.prime_is_admin());

-- Fail-closed on tables no app code references (document_*, swot_*, error_reports).
do $$
declare t text;
begin
  foreach t in array array['document_metadata','document_reviews','document_versions',
                           'error_reports','swot_items','swot_strategies']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read_admin', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.prime_is_manager_or_admin())',
      t || '_read_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_admin', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.prime_is_admin())',
      t || '_insert_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_admin', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.prime_is_admin()) with check (public.prime_is_admin())',
      t || '_update_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_admin', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.prime_is_admin())',
      t || '_delete_admin', t);
  end loop;
end $$;

-- records: hard DELETE is admin-only going forward; the soft-delete RPC
-- (soft_delete_record) remains the employee-reachable deletion path.
drop policy if exists records_delete_owner_or_admin on public.records;
drop policy if exists records_delete_admin on public.records;
create policy records_delete_admin on public.records
  for delete to authenticated using (public.prime_is_manager_or_admin());

-- processes / process_interactions were writeable by everyone (20260521):
-- narrow structural writes to manager-or-admin; reads unchanged.
drop policy if exists "Authenticated users can update processes" on public.processes;
drop policy if exists "Authenticated users can insert processes" on public.processes;
drop policy if exists processes_update_manager on public.processes;
drop policy if exists processes_insert_manager on public.processes;
create policy processes_update_manager on public.processes
  for update to authenticated using (public.prime_is_manager_or_admin())
  with check (public.prime_is_manager_or_admin());
create policy processes_insert_manager on public.processes
  for insert to authenticated with check (public.prime_is_manager_or_admin());

drop policy if exists "Authenticated users can update process_interactions" on public.process_interactions;
drop policy if exists "Authenticated users can insert process_interactions" on public.process_interactions;
drop policy if exists process_interactions_update_manager on public.process_interactions;
drop policy if exists process_interactions_insert_manager on public.process_interactions;
create policy process_interactions_update_manager on public.process_interactions
  for update to authenticated using (public.prime_is_manager_or_admin())
  with check (public.prime_is_manager_or_admin());
create policy process_interactions_insert_manager on public.process_interactions
  for insert to authenticated with check (public.prime_is_manager_or_admin());

-- Version control table (Prime §7). record_versions did not exist live
-- (owner decision from remediation); created now as a first-class subsystem.
create table if not exists public.record_versions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  version integer not null,
  form_data jsonb not null default '{}'::jsonb,
  changed_by text not null,
  changed_by_user_id uuid,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (record_id, version)
);
create index if not exists record_versions_record_idx
  on public.record_versions (record_id, version desc);
alter table public.record_versions enable row level security;
drop policy if exists record_versions_read_authenticated on public.record_versions;
drop policy if exists record_versions_insert_system on public.record_versions;
create policy record_versions_read_authenticated on public.record_versions
  for select to authenticated using (true);
create policy record_versions_insert_system on public.record_versions
  for insert to authenticated with check (false); -- inserts only via RPCs

-- Risks/CAPAs inserts were WITH CHECK (true): keep creation available to
-- authenticated users (registering a risk is a normal user action) but require
-- an authenticated session explicitly.
drop policy if exists "Authenticated users can insert risks" on public.risks;
drop policy if exists risks_insert_authenticated on public.risks;
create policy risks_insert_authenticated on public.risks
  for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Authenticated users can insert capas" on public.capas;
drop policy if exists capas_insert_authenticated on public.capas;
create policy capas_insert_authenticated on public.capas
  for insert to authenticated with check (auth.uid() is not null);

commit;