-- ============================================================================
-- Prime migration 16 — the two RPCs the code calls that no migration creates
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- `scripts/verify-schema-parity.ts` compares the RPCs the CLIENT calls
-- against the RPCs the migrations create, and it reported:
--
--     [WARNING] rpc-missing-migration: create_record_validated
--     [WARNING] rpc-missing-migration: soft_delete_record
--
-- Both are called from `src/services/recordStorage.ts` — the create path and
-- the delete path of the register.  No migration in this repository creates
-- them, so the schema in this repository cannot rebuild itself: a fresh
-- database built from `supabase/migrations/` would have the table, the
-- policies and the notification contract, but NOT the two functions the app
-- calls to create and to delete a record.  Every write would fail with
-- "function public.create_record_validated(...) does not exist".
--
-- The same gap is wider than the two.  Measured on the restored database:
--
--     functions in the live public schema   : 58
--     functions any migration creates       : 42 names
--     live functions with no migration       : 23
--
-- Most of those 23 are triggers (handle_new_user, handle_updated_at,
-- rls_auto_enable, set_tenant_updated_at, update_updated_at_column,
-- prevent_audit_modification, enforce_singleton_tenant) or are called from
-- inside SQL rather than from the client (emit_event, notify_admins,
-- notify_leadership, create_notification, log_record_change, …).  They are
-- real, but nothing in the repository creates them either.
--
-- This migration closes the part that is reachable from the client and from
-- the two functions themselves:
--
--   * `has_role(text)`                    — the role check, used by
--                                           create_record_validated.
--   * `get_next_serial(text)`             — the serial generator, used by
--                                           create_record_validated.
--   * `_validate_form_required_fields`    — the server-side required-field
--                                           gate, used by
--                                           create_record_validated.
--   * `append_audit_log(...)`             — the audit writer, used by
--                                           soft_delete_record.
--   * `create_record_validated(...)`      — the create RPC the client calls.
--   * `soft_delete_record(uuid)`          — the delete RPC the client calls.
--
-- The bodies are the production bodies, taken from the live schema
-- (pg_get_functiondef) — not a rewrite.  A rewrite would be a different
-- function, and the point of this migration is that the repository and the
-- live project hold the SAME function.
--
-- Why the two RPCs were not written down before
-- ---------------------------------------------
-- Migration 07 (`20260929_07_function_acl_hardening.sql`) already REFERENCES
-- `create_record_validated` and `update_record_with_lock` — it revokes
-- EXECUTE on them.  A revocation of a function that no migration creates is
-- a no-op on a from-scratch build, and a working revocation on the live
-- project.  The migration set was therefore always a DELTA on top of a
-- pg_dump, not a schema in its own right.  This migration starts closing
-- that gap for the client-reachable path; the trigger set and the
-- `update_record_with_lock` path are the next ones.
--
-- Nothing here changes behaviour on the live project: every body is the
-- body that is already deployed, and the grants are the grants that are
-- already in place (verified in the live schema: `authenticated` holds
-- EXECUTE on has_role, get_next_serial, _validate_form_required_fields,
-- create_record_validated and soft_delete_record; append_audit_log is
-- postgres + service_role only, because it is only ever called from inside
-- another function).
--
-- The type `record_status_enum` is created by the pg_dump, not by a
-- migration, so the DO block below creates it when it is missing.  The
-- label order is the deployed one: draft, pending_review, approved, rejected.
--
-- Idempotency
-- -----------
-- CREATE OR REPLACE / DO blocks; re-running changes nothing.
--
-- Rollback: 20261023_16_missing_rpc_migrations.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 0. the type the create RPC's signature names ─────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'record_status_enum'
  ) then
    create type public.record_status_enum as enum
      ('draft', 'pending_review', 'approved', 'rejected');
  end if;
end;
$$;

-- ── 1. the role check ────────────────────────────────────────────────────
-- `has_role` is STABLE + SECURITY DEFINER so that a policy can call it
-- without the caller needing SELECT on `user_roles`.
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role = required_role
  );
$$;

-- ── 2. the serial generator ──────────────────────────────────────────────
-- The next serial is the highest numeric suffix of the live (not deleted)
-- rows of that form, plus one, zero-padded to three digits.
create or replace function public.get_next_serial(p_form_code text)
returns text
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_max_serial int;
  v_next text;
begin
  select coalesce(max(
           cast(regexp_replace(serial, '.*-', '') as int)
         ), 0)
    into v_max_serial
    from public.records
   where form_code = p_form_code
     and deleted_at is null;

  v_next := p_form_code || '-' || lpad((v_max_serial + 1)::text, 3, '0');
  return v_next;
end;
$$;

-- ── 3. the server-side required-field gate ───────────────────────────────
-- The frontend Zod schemas are more complete; this is the layer that
-- catches a direct API call that skips the frontend.  The required-field
-- lists are the deployed ones.
create or replace function public._validate_form_required_fields(
  p_form_code text,
  p_form_data  jsonb
)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_required_fields text[];
  v_missing text[];
  v_field text;
begin
  v_required_fields := case p_form_code
    when 'F/08' then array['date', 'client_name']
    when 'F/09' then array['date', 'client_name', 'description', 'complaint_nature']
    when 'F/10' then array['date', 'client_name']
    when 'F/11' then array['date', 'month', 'year', 'name', 'prepared_by', 'approved_by']
    when 'F/12' then array['date', 'nc_type', 'description', 'corrective_action', 'reported_by']
    when 'F/13' then array['date', 'supplier', 'description', 'quantity', 'requested_by', 'approved_by']
    when 'F/14' then array['date', 'supplier', 'items_inspected', 'inspector']
    when 'F/15' then array['year', 'name', 'service', 'prepared_by', 'approved_by']
    when 'F/16' then array['date', 'supplier_name', 'service_type', 'evaluated_by']
    when 'F/17' then array['date', 'description', 'requested_by']
    when 'F/18' then array['date', 'product', 'reason', 'authorized_by']
    when 'F/19' then array['date', 'project_name', 'client_name', 'description', 'prepared_by', 'approved_by']
    when 'F/20' then array['date', 'chairperson', 'item', 'prepared_by']
    when 'F/21' then array['meeting_date', 'chairperson', 'attendees', 'discussion', 'decisions', 'action', 'minutes_by', 'approved_by']
    when 'F/22' then array['date', 'problem_description', 'root_cause', 'corrective_action', 'responsible', 'initiated_by']
    when 'F/23' then array['date', 'form_code', 'record_serial', 'maintained_by']
    when 'F/24' then array['date', 'quarter', 'year', 'objective', 'target', 'prepared_by', 'reviewed_by']
    when 'F/25' then array['date', 'period', 'year', 'scope', 'department', 'prepared_by', 'approved_by']
    when 'F/28' then array['date', 'course_name', 'trainer', 'name', 'trainer_signature', 'manager_signature']
    when 'F/29' then array['date', 'employee_name', 'employee_id', 'department', 'course_name', 'training_date', 'trainer', 'recorded_by']
    when 'F/30' then array['date', 'employee_name', 'employee_id', 'department', 'period', 'criterion', 'score', 'overall_score', 'evaluator', 'employee_signature']
    when 'F/32' then array['date', 'title', 'objective', 'requested_by', 'approved_by']
    when 'F/34' then array['date', 'project', 'findings', 'verified_by']
    when 'F/35' then array['date', 'month', 'year', 'project', 'progress', 'monitored_by']
    when 'F/37' then array['date', 'experiment_title', 'recorded_by']
    when 'F/40' then array['date', 'period', 'name', 'skill', 'prepared_by']
    when 'F/41' then array['date', 'gaps', 'training_needed', 'prepared_by']
    when 'F/42' then array['date', 'year', 'objectives', 'course', 'prepared_by', 'approved_by']
    when 'F/43' then array['date', 'employee_name', 'employee_id', 'department', 'project', 'qualification', 'trainer', 'issued_by', 'trainer_signature', 'manager_signature']
    when 'F/44' then array['date', 'job_title', 'department', 'responsibilities', 'prepared_by']
    when 'F/45' then array['date', 'doc_id', 'title', 'maintained_by']
    when 'F/46' then array['date', 'change_type', 'description', 'reason', 'approved_by']
    when 'F/47' then array['date', 'department', 'clause', 'requirement', 'auditor']
    when 'F/48' then array['date', 'month', 'year', 'scope', 'findings', 'auditor', 'reviewed_by']
    when 'F/50' then array[]::text[]
    else array[]::text[]
  end;

  if array_length(v_required_fields, 1) > 0 then
    foreach v_field in array v_required_fields loop
      if not (p_form_data ? v_field)
         or (p_form_data ->> v_field) is null
         or (p_form_data ->> v_field) = '' then
        v_missing := array_append(v_missing, v_field);
      end if;
    end loop;

    if array_length(v_missing, 1) > 0 then
      raise exception 'Missing required fields for form %: %',
        p_form_code, array_to_string(v_missing, ', ');
    end if;
  end if;
end;
$$;

-- ── 4. the audit writer ──────────────────────────────────────────────────
-- SECURITY DEFINER, and NOT granted to `authenticated`: it is only ever
-- called from inside another function, and giving the client EXECUTE on it
-- would let a client write an audit row with any `performed_by` it liked.
create or replace function public.append_audit_log(
  p_record_id       uuid,
  p_action          text,
  p_changed_fields  jsonb default '{}'::jsonb,
  p_previous_values jsonb default '{}'::jsonb,
  p_new_values      jsonb default '{}'::jsonb,
  p_performed_by    text default ''::text,
  p_form_code       text default ''::text,
  p_serial          text default ''::text
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_id uuid;
begin
  insert into public.audit_log (
    record_id, action, changed_fields, previous_values, new_values,
    performed_by, action_type, form_code, serial, user_email
  ) values (
    p_record_id, p_action, p_changed_fields, p_previous_values, p_new_values,
    coalesce(p_performed_by, auth.jwt() ->> 'email'::text, 'system'),
    p_action,
    p_form_code,
    p_serial,
    coalesce(p_performed_by, auth.jwt() ->> 'email'::text, 'system')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ── 5. the create RPC the client calls ───────────────────────────────────
create or replace function public.create_record_validated(
  p_form_code   text,
  p_form_name   text,
  p_form_data   jsonb,
  p_status      public.record_status_enum default 'draft'::public.record_status_enum,
  p_serial      text default 'auto'::text,
  p_section     integer default null::integer,
  p_section_name text default null::text,
  p_frequency   text default null::text,
  p_created_by  uuid default null::uuid
)
returns table(out_id uuid, out_serial text, out_form_code text)
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_serial text;
  v_section integer;
  v_section_name text;
  v_frequency text;
  v_form_name text;
  v_id uuid;
  v_form_data jsonb;
begin
  -- GATE 1: role check.
  if not public.has_role('admin') and not public.has_role('manager') then
    raise exception 'Insufficient role: admin or manager required';
  end if;

  -- GATE 2: form_data must not be empty.  A new record must carry at least
  -- one business field, so a blank template row cannot enter the register.
  v_form_data := p_form_data;
  if v_form_data is null or v_form_data = '{}'::jsonb then
    raise exception 'Validation failed: form_data cannot be empty. At least one business field is required.';
  end if;

  -- GATE 3: the form-specific required fields.
  perform public._validate_form_required_fields(p_form_code, v_form_data);

  -- Serial generation.
  if p_serial is null or p_serial = 'auto' then
    v_serial := public.get_next_serial(p_form_code);
  else
    v_serial := p_serial;
    perform 1 from public.records where serial = v_serial and deleted_at is null;
    if found then
      raise exception 'Serial % already exists', v_serial;
    end if;
  end if;

  -- Derive the section info from the form code when it was not passed.
  if p_section is null then
    v_section := case
      when p_form_code in ('F/08','F/09','F/10','F/50') then 1
      when p_form_code in ('F/11','F/12','F/13','F/14','F/15','F/16','F/17','F/18','F/19') then 3
      when p_form_code in ('F/20','F/21','F/22','F/23','F/24','F/25') then 4
      when p_form_code in ('F/28','F/29','F/30') then 5
      when p_form_code in ('F/32','F/34','F/35') then 6
      when p_form_code in ('F/37','F/40','F/41','F/42','F/43','F/44','F/45','F/46','F/47','F/48') then 7
      else 0
    end;
  else
    v_section := p_section;
  end if;

  if p_section_name is null then
    v_section_name := case v_section
      when 1 then 'Sales & Customer Service'
      when 3 then 'Planning & Risk'
      when 4 then 'Management Review'
      when 5 then 'HR & Training'
      when 6 then 'Design & Development'
      when 7 then 'Measurement & Improvement'
      else 'General'
    end;
  else
    v_section_name := p_section_name;
  end if;

  if p_frequency is null then
    v_frequency := case p_form_code
      when 'F/11' then 'Monthly'
      when 'F/48' then 'Monthly'
      when 'F/24' then 'Quarterly'
      when 'F/25' then 'Semi-annual'
      when 'F/40' then 'Semi-annual'
      when 'F/15' then 'Annual'
      when 'F/16' then 'Annual'
      when 'F/42' then 'Annual'
      else 'On event'
    end;
  else
    v_frequency := p_frequency;
  end if;

  v_form_name := p_form_name;

  insert into public.records (
    form_code, serial, form_name, status, form_data,
    section, section_name, frequency,
    created_by, edit_count, modification_reason, deleted_at
  ) values (
    p_form_code, v_serial, v_form_name, p_status, v_form_data,
    v_section, v_section_name, v_frequency,
    p_created_by, 0, '', null
  )
  returning public.records.id, public.records.serial, public.records.form_code
    into v_id, v_serial, p_form_code;

  return query select v_id, v_serial, p_form_code;
end;
$$;

-- ── 6. the delete RPC the client calls ───────────────────────────────────
-- Only an administrator may delete, and the check is INSIDE the function:
-- the function is SECURITY DEFINER, so a check outside it would be checked
-- with the definer's rights and would always pass.
create or replace function public.soft_delete_record(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_result record;
  v_role text;
begin
  select role into v_role
    from public.user_roles
   where user_id = auth.uid();

  if v_role is distinct from 'admin' then
    raise exception 'Only administrators can delete records';
  end if;

  -- Atomic check-and-update: the row is only updated when it is not already
  -- deleted, so a double delete cannot write two audit rows.
  update public.records
     set deleted_at = now(),
         updated_at = now()
   where id = p_id
     and deleted_at is null
  returning form_code, serial into v_result;

  if not found then
    raise exception 'Record not found or already deleted';
  end if;

  perform public.append_audit_log(
    p_id, 'delete',
    '{"deleted_at": true}'::jsonb,
    '{"deleted_at": null}'::jsonb,
    jsonb_build_object('deleted_at', now()),
    auth.jwt() ->> 'email',
    v_result.form_code,
    v_result.serial
  );

  return true;
end;
$$;

-- ── 7. the grants, exactly as the live schema has them ───────────────────
-- `append_audit_log` stays closed to `authenticated`: it is called from
-- inside `soft_delete_record`, which is itself role-gated, and a client
-- with EXECUTE on it could forge an audit row.
revoke execute on function public.has_role(text) from public, anon;
revoke execute on function public.get_next_serial(text) from public, anon;
revoke execute on function public._validate_form_required_fields(text, jsonb) from public, anon;
revoke execute on function public.append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid) from public, anon;
revoke execute on function public.soft_delete_record(uuid) from public, anon;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.get_next_serial(text) to authenticated;
grant execute on function public._validate_form_required_fields(text, jsonb) to authenticated;
grant execute on function public.append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid) to authenticated;
grant execute on function public.soft_delete_record(uuid) to authenticated;

commit;
