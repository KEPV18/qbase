-- ============================================================================
-- The QBase schema — the local environment's own copy
--
-- WHY THIS FILE IS IN THE REPO
-- -----------------------------
-- The local stack used to be rebuilt from a dump that lived OUTSIDE the
-- repository:
--
--     /home/kepv/QMS_BACKUP/pre-acl-hardening-20261022/01_schema_and_data.sql
--
-- That path is not part of the project, so a rebuild depended on a file
-- that the project does not own, and the environment could not be rebuilt
-- from the repository alone.
--
-- This file IS the schema: every table, function, policy, trigger and
-- grant of the `public` schema, with NO data.  It is what makes the local
-- environment independent — `prepare.sh` restores the schema from here and
-- needs nothing from outside the repository.
--
-- The DATA is a separate, optional step: the register's rows hold real
-- names and real e-mail addresses, so they are NOT committed.  Point
-- `QBASE_DATA_DUMP` at a data-only dump to load them:
--
--     pg_dump --data-only --schema=public <connection-string> > data.sql
--
-- and the local stack runs perfectly well without them (an empty
-- register).
--
-- HOW TO REGENERATE IT
-- --------------------
-- After a migration has been applied to the local database, refresh this
-- file so a rebuild starts from the same place:
--
--     pg_dump --schema-only --no-owner --schema=public \
--       -h 127.0.0.1 -p 5433 -U postgres -d qbase_local
--
-- The two lines the local PG 16 does not understand are removed
-- afterwards: `\restrict` / `\unrestrict` (a psql 17.6+ feature) and
-- `CREATE SCHEMA public;` (the schema already exists in the target).
--
-- Dumped from PostgreSQL 16.8 with pg_dump 16.15.
-- ============================================================================

--
-- PostgreSQL database dump
--
-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Name: public; Type: SCHEMA; Schema: -; Owner: -



-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -

COMMENT ON SCHEMA public IS 'standard public schema';


-- Name: notification_category; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.notification_category AS ENUM (
    'system',
    'records',
    'users',
    'security',
    'tenant'
);


-- Name: notification_priority; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.notification_priority AS ENUM (
    'info',
    'important',
    'critical'
);


-- Name: record_status_enum; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.record_status_enum AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected'
);


-- Name: _validate_form_required_fields(text, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public._validate_form_required_fields(p_form_code text, p_form_data jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
declare
  v_required_fields text[];
  v_missing text[];
  v_field text;
begin
  v_required_fields := case p_form_code
    when 'F/08' then array['client_name']::text[]
    when 'F/09' then array['date','client_name']::text[]
    when 'F/10' then array['date','client_name']::text[]
    when 'F/11' then array['month','date','prepared_by','signature']::text[]
    when 'F/12' then array['date']::text[]
    when 'F/13' then array['date','vendor_name']::text[]
    when 'F/14' then array['date']::text[]
    when 'F/15' then array[]::text[]
    when 'F/16' then array[]::text[]
    when 'F/17' then array['date','product_name']::text[]
    when 'F/18' then array['date']::text[]
    when 'F/19' then array['product_name']::text[]
    when 'F/20' then array['date']::text[]
    when 'F/21' then array['meeting_date','discussion_points']::text[]
    when 'F/22' then array['date','description','target_date']::text[]
    when 'F/23' then array['date']::text[]
    when 'F/24' then array['year','prepared_by']::text[]
    when 'F/25' then array['date']::text[]
    when 'F/28' then array['date','topic','attendees']::text[]
    when 'F/29' then array['trainer','prepared_by']::text[]
    when 'F/30' then array['date','employee_name','designation','department','working_in_organisation','evaluation_done_by','total_marking','evaluated_by']::text[]
    when 'F/32' then array['date','from_department','product_name']::text[]
    when 'F/34' then array['date','project_number','product_name','checked_by']::text[]
    when 'F/35' then array[]::text[]
    when 'F/37' then array['date','product_name','experiment_no','incharge','done_by']::text[]
    when 'F/40' then array['prepared_by']::text[]
    when 'F/41' then array['prepared_by']::text[]
    when 'F/42' then array['date','year']::text[]
    when 'F/43' then array['date','employee_name','employee_id','designation','date_of_joining','department','project','trainer','trainer_signature']::text[]
    when 'F/44' then array['date','employee_name']::text[]
    when 'F/45' then array[]::text[]
    when 'F/46' then array['date']::text[]
    when 'F/47' then array[]::text[]
    when 'F/48' then array['audit_type','auditor_signature']::text[]
    when 'F/49' then array['date','prepared_by']::text[]
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


-- Name: admin_create_profile(uuid, text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_create_profile(p_user_id uuid, p_email text, p_display_name text, p_department text DEFAULT NULL::text, p_is_active boolean DEFAULT true) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: admin_deactivate_profile(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_deactivate_profile(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: admin_delete_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_delete_user_role(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: admin_list_users(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_list_users() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
declare
  v_result jsonb;
begin
  if not public.prime_is_admin() then
    raise exception 'Insufficient role: admin required' using errcode = '42501';
  end if;

  select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'email', p.email,
      'display_name', p.display_name,
      'is_active', p.is_active,
      'last_login', p.last_login,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'role', (select ur.role from public.user_roles ur where ur.user_id = p.user_id limit 1)
    ))
    into v_result
    from public.profiles p;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;


-- Name: admin_update_profile(uuid, text, text, text, boolean, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_update_profile(p_user_id uuid, p_email text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_last_login timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: admin_upsert_tenant_settings(text, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_upsert_tenant_settings(p_company_name text, p_company_logo_url text DEFAULT NULL::text, p_theme_color text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: admin_upsert_user_role(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.admin_upsert_user_role(p_user_id uuid, p_role text, p_department text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: append_audit_log(uuid, text, jsonb, jsonb, jsonb, text, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.append_audit_log(p_record_id uuid, p_action text, p_changed_fields jsonb DEFAULT '{}'::jsonb, p_previous_values jsonb DEFAULT '{}'::jsonb, p_new_values jsonb DEFAULT '{}'::jsonb, p_performed_by text DEFAULT ''::text, p_form_code text DEFAULT ''::text, p_serial text DEFAULT ''::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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


-- Name: audit_log_server_append(uuid, text, jsonb, jsonb, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.audit_log_server_append(p_record_id uuid, p_action text, p_changed_fields jsonb DEFAULT NULL::jsonb, p_previous_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_form_code text DEFAULT NULL::text, p_serial text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: bulk_create_records(jsonb, text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.bulk_create_records(p_rows jsonb, p_reason text DEFAULT 'import'::text, p_skip_existing boolean DEFAULT true, p_allow_incomplete boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_row jsonb;
  v_index int := 0;
  v_form_code text;
  v_form_name text;
  v_form_data jsonb;
  v_requested_serial text;
  v_serial text;
  v_status text;
  v_section integer;
  v_section_name text;
  v_frequency text;
  v_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_failures jsonb := '[]'::jsonb;
  v_to_write jsonb := '[]'::jsonb;
  v_skipped int := 0;
  v_actor_email text;
  v_original_author text;
  v_error text;
begin
  -- GATE 1: the same role gate the single create has.
  if not (public.has_role('admin') or public.has_role('manager')) then
    raise exception 'Insufficient role: admin or manager required' using errcode = '42501';
  end if;

  -- GATE 2: the payload.
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be an array of rows' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('committed', true, 'created', 0, 'skipped', 0,
                              'failed', 0, 'rows', '[]'::jsonb, 'failures', '[]'::jsonb);
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'A batch may hold at most 500 rows' using errcode = '22023';
  end if;

  select email into v_actor_email from public.profiles where user_id = auth.uid() limit 1;
  v_actor_email := coalesce(v_actor_email, auth.uid()::text);

  -- PASS 1: validate EVERY row.  Nothing is written until every row has
  -- passed, so a batch lands whole or not at all.
  v_index := 0;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;
    v_form_code := v_row ->> 'form_code';
    v_form_name := coalesce(v_row ->> 'form_name', v_form_code);
    v_form_data := v_row -> 'form_data';
    v_requested_serial := nullif(coalesce(v_row ->> 'serial', ''), '');
    v_status := coalesce(nullif(v_row ->> 'status', ''), 'draft');
    v_section_name := v_row ->> 'section_name';
    v_frequency := v_row ->> 'frequency';
    v_section := null;
    if v_row ? 'section' and v_row ->> 'section' ~ '^-?[0-9]+$' then
      v_section := (v_row ->> 'section')::int;
    end if;

    if v_form_code is null or v_form_code = '' then
      v_error := 'the row carries no form code';
    elsif not p_allow_incomplete
          and (v_form_data is null or v_form_data = '{}'::jsonb) then
      v_error := 'form_data is empty — a record must carry at least one business field';
    elsif v_status not in ('draft', 'pending_review', 'approved', 'rejected') then
      v_error := format('unknown status: %s', v_status);
    else
      v_error := null;
      -- the server's own required-field rule, per row.  A restore does not
      -- apply it: the record it writes back already existed.
      if not p_allow_incomplete then
        begin
          perform public._validate_form_required_fields(v_form_code, v_form_data);
        exception when others then
          v_error := sqlerrm;
        end;
      end if;
    end if;

    -- a serial that is already live is NEVER overwritten
    if v_error is null and v_requested_serial is not null then
      perform 1 from public.records where serial = v_requested_serial and deleted_at is null;
      if found then
        if p_skip_existing then
          v_results := v_results || jsonb_build_array(jsonb_build_object(
            'index', v_index, 'serial', v_requested_serial, 'status', 'skipped',
            'detail', 'a live record already carries this serial'));
          v_skipped := v_skipped + 1;
          continue;
        end if;
        v_error := format('Serial % already exists', v_requested_serial);
      end if;
    end if;

    if v_error is not null then
      v_failures := v_failures || jsonb_build_array(jsonb_build_object(
        'index', v_index, 'serial', coalesce(v_requested_serial, ''), 'error', v_error));
    else
      v_to_write := v_to_write || jsonb_build_array(jsonb_build_object(
        'index', v_index, 'form_code', v_form_code, 'form_name', v_form_name,
        'form_data', v_form_data, 'serial', v_requested_serial,
        'status', v_status, 'section', v_section,
        'section_name', v_section_name, 'frequency', v_frequency,
        -- The author the row had where it came from (a restore).  It is
        -- NOT written into records.created_by — the author of a new record
        -- is the session's, decided here — but it is kept in the audit
        -- row, so the provenance of a restored record is not lost.
        'original_created_by', v_row ->> 'original_created_by'));
    end if;
  end loop;

  -- ATOMIC: a row that failed means NOTHING in this batch is written.
  if jsonb_array_length(v_failures) > 0 then
    return jsonb_build_object(
      'committed', false,
      'created', 0,
      'skipped', v_skipped,
      'failed', jsonb_array_length(v_failures),
      'rows', v_results,
      'failures', v_failures);
  end if;

  -- PASS 2: write the batch, in THIS transaction.
  for v_row in select value from jsonb_array_elements(v_to_write) loop
    v_index := (v_row ->> 'index')::int;
    v_form_code := v_row ->> 'form_code';
    v_form_name := v_row ->> 'form_name';
    v_form_data := v_row ->> 'form_data';
    v_requested_serial := v_row ->> 'serial';
    v_status := v_row ->> 'status';
    v_section := (v_row ->> 'section')::int;
    v_section_name := v_row ->> 'section_name';
    v_frequency := v_row ->> 'frequency';
    v_original_author := v_row ->> 'original_created_by';

    if v_requested_serial is null or v_requested_serial = '' then
      v_serial := public.get_next_serial(v_form_code);
    else
      v_serial := v_requested_serial;
    end if;

    -- the section and the frequency, derived exactly as create_record_validated
    if v_section is null then
      v_section := case
        when v_form_code in ('F/08','F/09','F/10','F/50') then 1
        when v_form_code in ('F/11','F/12','F/13','F/14','F/15','F/16','F/17','F/18','F/19') then 3
        when v_form_code in ('F/20','F/21','F/22','F/23','F/24','F/25') then 4
        when v_form_code in ('F/28','F/29','F/30') then 5
        when v_form_code in ('F/32','F/34','F/35') then 6
        when v_form_code in ('F/37','F/40','F/41','F/42','F/43','F/44','F/45','F/46','F/47','F/48') then 7
        else 0
      end;
    end if;

    if v_section_name is null then
      v_section_name := case v_section
        when 1 then 'Sales & Customer Service'
        when 3 then 'Planning & Risk'
        when 4 then 'Management Review'
        when 5 then 'HR & Training'
        when 6 then 'Design & Development'
        when 7 then 'Measurement & Improvement'
        else 'General'
      end;
    end if;

    if v_frequency is null then
      v_frequency := case v_form_code
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
    end if;

    insert into public.records (
      form_code, serial, form_name, status, form_data,
      section, section_name, frequency,
      created_by, edit_count, modification_reason, deleted_at
    ) values (
      v_form_code, v_serial, v_form_name, v_status::public.record_status_enum, v_form_data,
      v_section, v_section_name, v_frequency,
      v_actor_email, 0, coalesce(p_reason, ''), null
    )
    returning public.records.id into v_id;

    -- The audit trail.  A record that appears from nowhere is exactly the
    -- record an auditor asks about, and the system must have an answer.
    --
    -- `original_created_by` is carried here when the row came from a
    -- backup: the record's author in THIS register is the session's, but
    -- where the row came from is part of its story and is not lost.
    insert into public.audit_log
      (record_id, action, changed_fields, previous_values, new_values,
       performed_by, action_type, form_code, serial)
    values
      (v_id, 'create',
       jsonb_build_object('created', true),
       '{}'::jsonb,
       case
         when v_original_author is null
           then jsonb_build_object('form_data', v_form_data)
         else jsonb_build_object('form_data', v_form_data,
                                 'original_created_by', v_original_author)
       end,
       v_actor_email, 'create', v_form_code, v_serial);

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'index', v_index, 'id', v_id, 'serial', v_serial,
      'form_code', v_form_code, 'status', 'created'));
  end loop;

  return jsonb_build_object(
    'committed', true,
    'created', jsonb_array_length(v_to_write),
    'skipped', v_skipped,
    'failed', 0,
    'rows', v_results,
    'failures', '[]'::jsonb);
end;
$_$;


-- Name: bulk_transition_records(uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_moved int := 0;
  v_refused int := 0;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('committed', true, 'moved', 0, 'refused', 0, 'rows', '[]'::jsonb);
  end if;
  if array_length(p_ids, 1) > 500 then
    raise exception 'A batch may hold at most 500 ids' using errcode = '22023';
  end if;
  if p_target_status not in ('draft', 'pending_review', 'approved', 'rejected') then
    raise exception 'Invalid target status: %', p_target_status using errcode = '22P02';
  end if;

  for v_id in select unnest(p_ids) loop
    -- A refusal of ONE record must not abandon the rest: the sub-transaction
    -- rolls back that record only.  The batch still commits as a whole.
    begin
      perform public.record_transition(v_id, p_target_status, p_reason);
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'id', v_id, 'status', 'transitioned'));
      v_moved := v_moved + 1;
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'id', v_id, 'status', 'refused', 'error', left(sqlerrm, 300)));
      v_refused := v_refused + 1;
    end;
  end loop;

  return jsonb_build_object(
    'committed', true,
    'moved', v_moved,
    'refused', v_refused,
    'rows', v_results);
end;
$$;


-- Name: create_notification(uuid, text, text, text, text, text, uuid, uuid, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_category text DEFAULT 'system'::text, p_priority text DEFAULT 'info'::text, p_event_type text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_target_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO PUBLIC.notifications (
    user_id, title, message, category, priority, event_type,
    actor_id, target_id, link, data, created_by, read
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_category::notification_category,
    p_priority::notification_priority,
    p_event_type,
    p_actor_id,
    p_target_id,
    p_link,
    COALESCE(p_data, '{}'::jsonb),
    p_created_by,
    false
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;


-- Name: create_notifications_batch(uuid[], text, text, text, text, text, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.create_notifications_batch(p_user_ids uuid[], p_title text, p_message text, p_category text DEFAULT 'system'::text, p_priority text DEFAULT 'info'::text, p_event_type text DEFAULT NULL::text, p_actor_id text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_link text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_created_by text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  inserted_count INTEGER := 0;
  uid UUID;
BEGIN
  FOREACH uid IN ARRAY p_user_ids LOOP
    INSERT INTO public.notifications (
      user_id, title, message, category, priority, event_type,
      actor_id, target_id, link, data, created_by, read
    ) VALUES (
      uid,
      p_title,
      p_message,
      p_category::notification_category,
      p_priority::notification_priority,
      p_event_type,
      p_actor_id::uuid,
      p_target_id::uuid,
      p_link,
      COALESCE(p_data, '{}'::jsonb),
      p_created_by::uuid,
      false
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;


-- Name: create_record_validated(text, text, jsonb, public.record_status_enum, text, integer, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.create_record_validated(p_form_code text, p_form_name text, p_form_data jsonb, p_status public.record_status_enum DEFAULT 'draft'::public.record_status_enum, p_serial text DEFAULT 'auto'::text, p_section integer DEFAULT NULL::integer, p_section_name text DEFAULT NULL::text, p_frequency text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid) RETURNS TABLE(out_id uuid, out_serial text, out_form_code text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
declare
  v_serial text;
  v_section integer;
  v_section_name text;
  v_frequency text;
  v_form_name text;
  v_id uuid;
  v_form_data jsonb;
  v_created_by text;
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

  -- WHO created the record.
  --
  -- `records.created_by` is TEXT and holds a person's name or e-mail
  -- everywhere else in the register, and the draft path — the one the UI
  -- uses — stamps the actor's e-mail.  The e-mail is read from the
  -- session's own profile, so a client can neither crash this call (it
  -- used to pass an e-mail into a uuid parameter) nor forge the author.
  --
  -- `p_created_by` stays in the signature — PostgREST resolves the
  -- overload by the parameter names and types, and changing them would
  -- break every existing caller — but it is now only the FALLBACK for a
  -- call that has no session (a service-role write).
  v_created_by := coalesce(
    (select prof.email from public.profiles prof where prof.user_id = auth.uid() limit 1),
    p_created_by::text,
    auth.uid()::text
  );

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

  if v_frequency is null then
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
    v_created_by, 0, '', null
  )
  returning public.records.id, public.records.serial, public.records.form_code
    into v_id, v_serial, p_form_code;

  return query select v_id, v_serial, p_form_code;
end;
$$;


-- Name: current_user_department(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.current_user_department() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_dept text;
BEGIN
  SELECT department INTO v_dept
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_dept;
END;
$$;


-- Name: dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.dashboard_stats() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  return jsonb_build_object(
    -- ── Records: total / status counts / last-30-days volume ──────────────
    -- Widget: "Records KPI". Exact query: count(*) over public.records
    -- excluding soft-deleted (archived) rows — archived totals are surfaced
    -- by the archive screen, not the dashboard.
    'records_total', (
      select count(*)::int from public.records where deleted_at is null
    ),
    -- Exact query: group count by the workflow status column.
    'records_by_status', (
      select jsonb_build_object(
        'draft',          count(*) filter (where status = 'draft')::int,
        'pending_review', count(*) filter (where status = 'pending_review')::int,
        'approved',       count(*) filter (where status = 'approved')::int,
        'rejected',       count(*) filter (where status = 'rejected')::int
      )
      from public.records
      where deleted_at is null
    ),
    -- Exact query: records created in the last 30 days.
    'records_last_30d', (
      select count(*)::int from public.records
      where deleted_at is null
        and created_at >= now() - interval '30 days'
    ),

    -- ── CAPA register: closure rate / overdue (ISO 9001 §10.2) ───────────
    -- Widget: "CAPA health". Exact query: counts over public.capas.
    -- capa_closure_rate is deliberately NULL when there are no CAPAs —
    -- "0%" would fabricate an achievement from an empty register; the
    -- client renders "no data".
    'capa_total', (
      select count(*)::int from public.capas
    ),
    'capa_closed', (
      select count(*)::int from public.capas where status = 'Closed'
    ),
    'capa_open', (
      select count(*)::int from public.capas where status = 'Open'
    ),
    'capa_closure_rate', (
      select case
        when count(*) = 0 then null::int
        else round(
          (count(*) filter (where status = 'Closed'))::numeric
          * 100 / count(*)
        )::int
      end
      from public.capas
    ),
    -- Exact query: non-closed CAPAs whose target completion date has passed.
    'capa_overdue', (
      select count(*)::int from public.capas
      where status <> 'Closed'
        and target_completion_date is not null
        and target_completion_date < now()::date
    ),

    -- ── Pending-review aging: how long approvals have sat ─────────────────
    -- Widget: "Overdue reviews". Exact query: pending_review records bucketed
    -- on their last update time (7d / 7-30d / >30d).
    'pending_review_aging', (
      select jsonb_build_object(
        'under_7d',      count(*) filter (where updated_at >= now() - interval '7 days')::int,
        'from_7_to_30d', count(*) filter (where updated_at < now() - interval '7 days'
                                             and updated_at >= now() - interval '30 days')::int,
        'over_30d',      count(*) filter (where updated_at < now() - interval '30 days')::int
      )
      from public.records
      where status = 'pending_review' and deleted_at is null
    )
  );
end;
$$;


-- Name: FUNCTION dashboard_stats(); Type: COMMENT; Schema: public; Owner: -

COMMENT ON FUNCTION public.dashboard_stats() IS 'Prime D6: org-level aggregate KPIs for the dashboard (counts only, no row data). One RPC; each JSON field pairs 1:1 with a dashboard widget whose rendered tooltip cites this exact query.';


-- Name: emit_event(text, text, text, text, text, uuid, uuid, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.emit_event(p_title text, p_message text, p_category text DEFAULT 'system'::text, p_priority text DEFAULT 'info'::text, p_event_type text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_target_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  new_id uuid;
  target_uid uuid;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    target_uid := p_actor_id;
  ELSE
    SELECT user_id INTO target_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;

IF target_uid IS NULL THEN RETURN NULL; END IF;

INSERT INTO PUBLIC.notifications (
    user_id, title, message, category, priority, event_type,
    actor_id, target_id, link, data, created_by, read
  ) VALUES (
    target_uid,
    p_title,
    p_message,
    p_category::notification_category,
    p_priority::notification_priority,
    p_event_type,
    p_actor_id,
    p_target_id,
    p_link,
    COALESCE(p_data, '{}'::jsonb),
    p_created_by,
    false
  ) RETURNING id INTO new_id;

RETURN new_id;
END;
$$;


-- Name: enforce_singleton_tenant(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.enforce_singleton_tenant() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_count integer;
BEGIN
  SELECT count(*) INTO row_count FROM public.tenant_settings;
  IF row_count > 1 THEN
    DELETE FROM public.tenant_settings WHERE id != (SELECT MIN(id) FROM public.tenant_settings);
  END IF;
  RETURN NEW;
END;
$$;


-- Name: error_report_resolve(uuid, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.error_report_resolve(p_report_id uuid, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_actor_email text;
begin
  -- Server-checked authorization (§13): manager-or-admin only.
  if not public.prime_is_manager_or_admin() then
    raise exception 'Insufficient role: manager or admin required'
      using errcode = '42501';
  end if;

  select email into v_actor_email
    from public.profiles where user_id = auth.uid() limit 1;

  update public.error_reports
     set resolved         = true,
         resolved_at      = now(),
         resolution_notes = left(p_notes, 2000)
   where id = p_report_id
     and coalesce(resolved, false) = false;
  if not found then
    raise exception 'Error report % not found or already resolved', p_report_id
      using errcode = 'P0002';
  end if;

  -- Audit the resolution (§15: server-derived actor; the trail must not be
  -- forgeable, and a resolution must not happen silently).
  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type)
  values
    (p_report_id, 'error_report_resolved',
     jsonb_build_object('resolved', true, 'resolution_notes', true),
     jsonb_build_object('resolved', false),
     jsonb_build_object('resolved', true, 'resolution_notes', left(p_notes, 2000)),
     coalesce(v_actor_email, auth.uid()::text),
     'system');
end;
$$;


-- Name: FUNCTION error_report_resolve(p_report_id uuid, p_notes text); Type: COMMENT; Schema: public; Owner: -

COMMENT ON FUNCTION public.error_report_resolve(p_report_id uuid, p_notes text) IS 'Prime 20260929_06: manager-or-admin resolves an error report; sets resolved/resolved_at/resolution_notes and writes an audit_log row. Server-checked authorization; refuses double-resolution (P0002).';


-- Name: error_report_submit(text, text, text, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.error_report_submit(p_error_message text, p_error_stack text DEFAULT NULL::text, p_page_url text DEFAULT NULL::text, p_version text DEFAULT NULL::text, p_browser_info jsonb DEFAULT NULL::jsonb, p_context jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_report_id uuid;
  v_email     text;
begin
  -- Fail closed: only a signed-in user may report (§13).
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select email into v_email
    from public.profiles where user_id = auth.uid() limit 1;

  -- Sanitize: the client context is free-form, so bound every text field
  -- before it reaches the table (a report must never be a vector for an
  -- oversized payload).
  insert into public.error_reports
    (error_message, error_stack, page_url, version, browser_info,
     context, user_email, resolved)
  values (
    left(p_error_message, 2000),
    left(p_error_stack, 8000),
    left(p_page_url, 500),
    left(p_version, 64),
    p_browser_info,
    p_context,
    coalesce(v_email, auth.uid()::text),
    false
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;


-- Name: FUNCTION error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb); Type: COMMENT; Schema: public; Owner: -

COMMENT ON FUNCTION public.error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb) IS 'Prime 20260929_06: authenticated client error reports into public.error_reports; identity server-derived from the JWT, text fields length-bounded. The browser never writes the table directly (no client insert policy).';


-- Name: get_empty_records(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_empty_records() RETURNS TABLE(id uuid, form_code text, serial text, form_name text, section integer, section_name text, created_by text, created_at timestamp with time zone, updated_at timestamp with time zone, form_data jsonb, is_empty boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_code,
    r.serial,
    r.form_name,
    r.section,
    r.section_name,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.form_data,
    NOT public.jsonb_has_user_content(r.form_data, r.serial) AS is_empty
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND NOT public.jsonb_has_user_content(r.form_data, r.serial);
END;
$$;


-- Name: get_next_serial(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_next_serial(p_form_code text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

-- Name: records; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.records (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    form_code text NOT NULL,
    serial text NOT NULL,
    form_name text NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.record_status_enum DEFAULT 'draft'::public.record_status_enum NOT NULL,
    created_by text DEFAULT ''::text,
    last_modified_by text DEFAULT ''::text,
    edit_count integer DEFAULT 0,
    modification_reason text DEFAULT ''::text,
    section integer,
    section_name text DEFAULT ''::text,
    frequency text DEFAULT ''::text,
    deleted_at timestamp with time zone,
    project_id uuid,
    CONSTRAINT chk_records_edit_count CHECK ((edit_count >= 0)),
    CONSTRAINT chk_records_section CHECK (((section >= 0) AND (section <= 7))),
    CONSTRAINT chk_records_status CHECK ((status = ANY (ARRAY['draft'::public.record_status_enum, 'pending_review'::public.record_status_enum, 'approved'::public.record_status_enum, 'rejected'::public.record_status_enum])))
);


-- Name: get_record_by_serial(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_record_by_serial(p_serial text) RETURNS SETOF public.records
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT * FROM public.records
  WHERE serial = p_serial
    AND deleted_at IS NULL
  LIMIT 1;
$$;


-- Name: get_record_count(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_record_count() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.records
  WHERE deleted_at IS NULL;

RETURN v_count;
END;
$$;


-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, display_name, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- Name: has_role(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.has_role(required_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role = required_role
  );
$$;


-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;


-- Name: is_manager(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_manager() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
  );
END;
$$;


-- Name: jsonb_has_any_text(jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.jsonb_has_any_text(p_data jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  v_type text;
  v_key text;
  v_val jsonb;
  v_elem jsonb;
  v_text text;
  v_trimmed text;
BEGIN
  IF p_data IS NULL THEN
    RETURN false;
  END IF;

v_type := jsonb_typeof(p_data);

IF v_type = 'string' THEN
    v_text := p_data #>> '{}';
    IF v_text IS NULL THEN RETURN false; END IF;
    v_trimmed := btrim(v_text);
    IF v_trimmed = '' THEN RETURN false; END IF;
    -- Ignore 1-2 digit integers (row indices)
    IF v_trimmed ~ '^\d{1,2}$' THEN RETURN false; END IF;
    -- Ignore boolean strings
    IF lower(v_trimmed) IN ('true', 'false') THEN RETURN false; END IF;
    RETURN true;

ELSIF v_type IN ('number', 'boolean', 'null') THEN
    RETURN false;

ELSIF v_type = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF public.jsonb_has_any_text(v_val) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;

ELSIF v_type = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_data) LOOP
      IF public.jsonb_has_any_text(v_elem) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

RETURN false;
END;
$_$;


-- Name: jsonb_has_user_content(jsonb, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.jsonb_has_user_content(p_data jsonb, p_serial text DEFAULT ''::text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  v_type text;
  v_key text;
  v_val jsonb;
  v_elem jsonb;
  v_text text;
  v_trimmed text;
BEGIN
  IF p_data IS NULL THEN
    RETURN false;
  END IF;

v_type := jsonb_typeof(p_data);

-- Only strings can be genuine user content
  IF v_type = 'string' THEN
    v_text := p_data #>> '{}';
    IF v_text IS NULL THEN RETURN false; END IF;
    v_trimmed := btrim(v_text);
    IF v_trimmed = '' THEN RETURN false; END IF;
    -- Ignore if it matches the record's own serial
    IF p_serial IS NOT NULL AND p_serial != '' AND v_trimmed = p_serial THEN
      RETURN false;
    END IF;
    -- Ignore standalone row indices (1-2 digit integers as strings)
    IF v_trimmed ~ '^\d{1,2}$' THEN
      RETURN false;
    END IF;
    -- Ignore boolean string representations
    IF lower(v_trimmed) IN ('true', 'false') THEN
      RETURN false;
    END IF;
    -- Genuine user text!
    RETURN true;

ELSIF v_type = 'number' THEN
    -- Numbers are structural, NOT user content
    RETURN false;

ELSIF v_type = 'boolean' THEN
    RETURN false;

ELSIF v_type = 'null' THEN
    RETURN false;

ELSIF v_type = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF public.jsonb_has_user_content(v_val, p_serial) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;

ELSIF v_type = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_data) LOOP
      IF public.jsonb_has_user_content(v_elem, p_serial) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

RETURN false;
END;
$_$;


-- Name: log_record_change(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.log_record_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_record_id uuid;
  v_action text;
  v_changed jsonb;
  v_prev jsonb;
  v_new jsonb;
  v_form_code text;
  v_serial text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_record_id := NEW.id;
    v_changed := '{}'::jsonb;
    v_prev := '{}'::jsonb;
    v_new := to_jsonb(NEW);
    v_form_code := NEW.form_code;
    v_serial := NEW.serial;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_record_id := NEW.id;
    v_form_code := NEW.form_code;
    v_serial := NEW.serial;
    
    v_changed := '{}'::jsonb;
    v_prev := '{}'::jsonb;
    v_new := '{}'::jsonb;
    
    DECLARE
      k text;
    BEGIN
      FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
        IF to_jsonb(NEW) ->> k IS DISTINCT FROM to_jsonb(OLD) ->> k THEN
          v_changed := v_changed || jsonb_build_object(k, true);
          v_prev := v_prev || jsonb_build_object(k, to_jsonb(OLD) -> k);
          v_new := v_new || jsonb_build_object(k, to_jsonb(NEW) -> k);
        END IF;
      END LOOP;
    END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_record_id := OLD.id;
    v_changed := '{}'::jsonb;
    v_prev := to_jsonb(OLD);
    v_new := '{}'::jsonb;
    v_form_code := OLD.form_code;
    v_serial := OLD.serial;
  END IF;
  
  BEGIN
    PERFORM public.append_audit_log(
      v_record_id, v_action,
      v_changed, v_prev, v_new,
      COALESCE(current_user, 'system'),
      v_form_code, v_serial
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Audit log insert failed: %', SQLERRM;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


-- Name: notify_admins(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.notify_admins(p_title text, p_message text, p_category public.notification_category DEFAULT 'system'::public.notification_category, p_priority public.notification_priority DEFAULT 'info'::public.notification_priority, p_event_type text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_target_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_admin_ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

RETURN public.create_notifications_batch(
    v_admin_ids, p_title, p_message, p_category, p_priority,
    p_event_type, p_actor_id, p_target_id,
    p_link, p_data, auth.uid()
  );
END;
$$;


-- Name: notify_leadership(text, text, public.notification_category, public.notification_priority, text, uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.notify_leadership(p_title text, p_message text, p_category public.notification_category DEFAULT 'records'::public.notification_category, p_priority public.notification_priority DEFAULT 'important'::public.notification_priority, p_event_type text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_target_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO v_ids
  FROM public.user_roles
  WHERE role IN ('admin', 'manager');

IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

RETURN public.create_notifications_batch(
    v_ids, p_title, p_message, p_category, p_priority,
    p_event_type, p_actor_id, p_target_id,
    p_link, p_data, auth.uid()
  );
END;
$$;


-- Name: notify_on_record_decision(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.notify_on_record_decision() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_creator_user_id uuid;
  v_actor_email     text;
begin
  -- Decision edges only: pending_review → approved | rejected. Drafts,
  -- submissions, reopens and restores follow other flows and do not notify.
  if new.status = old.status then
    return new;
  end if;
  if not (old.status::text = 'pending_review'
          and new.status::text in ('approved', 'rejected')) then
    return new;
  end if;

  -- Resolve the creator to a real user (RLS on notifications requires a
  -- real user_id; a notification addressed to nobody would be an orphan —
  -- §15 forbids it).
  select p.user_id into v_creator_user_id
    from public.profiles p
   where p.email = new.created_by
   limit 1;
  if v_creator_user_id is null then
    return new;
  end if;

  -- The actor already knows the decision they just made.
  if v_creator_user_id = auth.uid() then
    return new;
  end if;

  select email into v_actor_email
    from public.profiles where user_id = auth.uid() limit 1;

  insert into public.notifications
    (user_id, category, priority, event_type, title, message, link,
     data, actor_id, target_id, read, created_by)
  values (
    v_creator_user_id,
    'records',
    case new.status::text when 'approved' then 'important' else 'critical' end,
    'approval_decision',
    case new.status::text
      when 'approved' then 'Record approved'
      else 'Record rejected'
    end,
    'Record ' || new.serial || ' was ' || new.status::text ||
      ' by ' || coalesce(v_actor_email, 'a reviewer') || '.',
    '/records/' || new.serial,
    jsonb_build_object(
      'record_id',   new.id,
      'serial',      new.serial,
      'form_code',   new.form_code,
      'from_status', old.status::text,
      'to_status',   new.status::text,
      'decided_by',  coalesce(v_actor_email, auth.uid()::text)
    ),
    auth.uid()::text,
    new.id::text,
    false,
    coalesce(v_actor_email, auth.uid()::text)
  );

  return new;
end;
$$;


-- Name: FUNCTION notify_on_record_decision(); Type: COMMENT; Schema: public; Owner: -

COMMENT ON FUNCTION public.notify_on_record_decision() IS 'Prime 20260929_05: fires on records.status decision edges (pending_review → approved|rejected); inserts one notifications row for the creator (resolved server-side by profile email). SECURITY DEFINER so the browser never writes the notifications table directly (§5); skips self-decisions and creators without a resolvable profile (no orphans, §15).';


-- Name: prevent_audit_modification(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prevent_audit_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable. % is not allowed on audit_log.', TG_OP;
  RETURN NULL;
END;
$$;


-- Name: prime_admin_user_ids(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_admin_user_ids() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(jsonb_agg(ur.user_id order by ur.user_id), '[]'::jsonb)
    from public.user_roles ur
   where ur.role = 'admin'
     and ur.user_id is not null;
$$;


-- Name: prime_current_user_email(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_current_user_email() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p.email
    from public.profiles p
   where p.user_id = auth.uid()
   limit 1;
$$;


-- Name: prime_is_admin(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role = 'admin'
  );
$$;


-- Name: prime_is_manager_or_admin(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_is_manager_or_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role in ('admin', 'dept_head', 'manager')
  );
$$;


-- Name: prime_leadership_user_ids(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_leadership_user_ids() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(jsonb_agg(ur.user_id order by ur.user_id), '[]'::jsonb)
    from public.user_roles ur
   where ur.role in ('admin', 'manager')
     and ur.user_id is not null;
$$;


-- Name: prime_record_department(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_record_department(p_form_code text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
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
    when 'F/49' then 'Management'
    else null end;
$$;


-- Name: prime_sync_record_project(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_sync_record_project() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: prime_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prime_user_role(p_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(role text, department text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select ur.role, ur.department
    from public.user_roles ur
   where ur.user_id = coalesce(p_user_id, auth.uid())
     and coalesce(ur.role, '') <> ''
   order by ur.created_at asc
   limit 1;
$$;


-- Name: purge_all_empty_records(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.purge_all_empty_records() RETURNS TABLE(deleted_count bigint, serials text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count bigint;
  v_serials text[];
BEGIN
  -- Collect serials of ghost records for audit trail
  SELECT array_agg(r.serial) INTO v_serials
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
    );

-- Hard delete all ghost records
  DELETE FROM public.records
  WHERE deleted_at IS NULL
    AND (
      form_data IS NULL
      OR form_data = '{}'::jsonb
      OR form_data = 'null'::jsonb
    );

GET DIAGNOSTICS v_count = ROW_COUNT;

RETURN QUERY SELECT v_count, COALESCE(v_serials, ARRAY[]::text[]);
END;
$$;


-- Name: purge_empty_record(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.purge_empty_record(p_record_id uuid) RETURNS TABLE(deleted_serial text, deleted_form_code text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_serial text;
  v_form_code text;
BEGIN
  -- Verify the record exists and is empty (ghost)
  SELECT r.serial, r.form_code INTO v_serial, v_form_code
  FROM public.records r
  WHERE r.id = p_record_id
    AND r.deleted_at IS NULL
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
    );

IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or is not a ghost record (has valid form_data).';
  END IF;

-- Hard delete the ghost record
  DELETE FROM public.records WHERE id = p_record_id;

RETURN QUERY SELECT v_serial, v_form_code;
END;
$$;


-- Name: record_discard_draft(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_discard_draft(p_draft_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

  -- Tombstone: the draft's trail ends with its discard, attributed to the
  -- discarder (Prime §15 — no silent loss; this row is append-only like the
  -- rest of the trail). serial/form_code are denormalized into the audit row
  -- so the event stays interpretable after the draft row itself is gone.
  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, serial)
  values
    (p_draft_id, 'discard',
     jsonb_build_object('status', true),
     jsonb_build_object('status', 'draft'),
     jsonb_build_object('status', null),
     coalesce((select email from public.profiles where user_id = auth.uid()), auth.uid()::text),
     'workflow',
     (select form_code from public.records where id = p_draft_id),
     (select serial from public.records where id = p_draft_id));

  delete from public.record_versions where record_id = p_draft_id;
  delete from public.records where id = p_draft_id;
end;
$$;


-- Name: record_draft_autosave(uuid, jsonb, integer, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_draft_autosave(p_draft_id uuid, p_form_data jsonb, p_section integer DEFAULT NULL::integer, p_section_name text DEFAULT NULL::text, p_frequency text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: record_draft_create(text, jsonb, text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_draft_create(p_form_code text, p_form_data jsonb, p_form_name text DEFAULT NULL::text, p_section integer DEFAULT NULL::integer, p_section_name text DEFAULT NULL::text, p_frequency text DEFAULT NULL::text) RETURNS public.records
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_form_number text;
  v_next integer := 1;
  v_serial text;
  v_actor_email text;
  v_existing public.records;
  v_created public.records;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_form_code is null or btrim(p_form_code) = '' then
    raise exception 'p_form_code is required' using errcode = '23514';
  end if;

  select email into v_actor_email
    from public.profiles where user_id = auth.uid() limit 1;

  -- Idempotent reopen: an unfinished draft of this form by this creator is
  -- resumed, not duplicated. The most recent own draft wins.
  select * into v_existing
    from public.records
    where form_code = p_form_code
      and status = 'draft'
      and deleted_at is null
      and created_by = coalesce(v_actor_email, auth.uid()::text)
    order by created_at desc
    limit 1;
  if found then
    return v_existing;
  end if;

  -- Server-side serial allocation across ALL rows of this form number —
  -- archived rows included, because records.serial has a unique index that
  -- spans soft-deleted rows: the serial of an archived record must never be
  -- reused (that would silently repoint audit history).
  v_form_number := regexp_replace(p_form_code, '^F/', '');
  -- ([1] is the numeric suffix as TEXT; cast before max so '009' > '10' never
  -- happens lexicographically.)
  select coalesce(max((regexp_match(r.serial, '^F/' || v_form_number || '-([0-9]+)$'))[1]::int), 0) + 1
    into v_next
    from public.records r
    where r.serial ~ ('^F/' || v_form_number || '-[0-9]+$');

  loop
    v_serial := 'F/' || v_form_number || '-'
                || case when v_next < 1000 then lpad(v_next::text, 3, '0') else v_next::text end;
    exit when not exists (select 1 from public.records x where x.serial = v_serial);
    v_next := v_next + 1;  -- backstop against historical serial gaps the regex missed
  end loop;

  insert into public.records
    (form_code, serial, form_name, form_data, status, created_by,
     section, section_name, frequency)
  values
    (p_form_code, v_serial, coalesce(p_form_name, ''),
     coalesce(p_form_data, '{}'::jsonb), 'draft',
     coalesce(v_actor_email, auth.uid()::text),
     p_section, p_section_name, p_frequency)
  returning * into v_created;
  if not found then
    raise exception 'Draft create did not apply (form_code %)', p_form_code
      using errcode = 'P0002';
  end if;

  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type, form_code, serial)
  values
    (v_created.id, 'create',
     jsonb_build_object('form_data', true),
     '{}'::jsonb,
     jsonb_build_object('form_data', coalesce(p_form_data, '{}'::jsonb)),
     -- performed_by is the stable profile email (server-derived), matching
     -- the other engine paths (Prime §15).
     coalesce(v_actor_email, auth.uid()::text),
     'workflow', p_form_code, v_created.serial);

  return v_created;
end;
$_$;


-- Name: record_restore(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_restore(p_record_id uuid) RETURNS public.records
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: record_transition(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_transition(p_record_id uuid, p_target_status text, p_reason text DEFAULT NULL::text) RETURNS public.records
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: record_version_snapshot(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_version_snapshot(p_record_id uuid, p_form_data jsonb, p_change_summary text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


-- Name: self_provision_profile(text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.self_provision_profile(p_display_name text DEFAULT NULL::text, p_department text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: set_tenant_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.set_tenant_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- Name: soft_delete_record(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.soft_delete_record(p_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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


-- Name: update_record_versioned(uuid, jsonb, integer, text, text, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_record_versioned(p_id uuid, p_form_data jsonb, p_expected_edit_count integer DEFAULT NULL::integer, p_last_modified_by text DEFAULT NULL::text, p_modification_reason text DEFAULT NULL::text, p_section integer DEFAULT NULL::integer, p_section_name text DEFAULT NULL::text, p_frequency text DEFAULT NULL::text, p_change_summary text DEFAULT NULL::text) RETURNS public.records
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


-- Name: update_record_with_lock(uuid, jsonb, integer, public.record_status_enum, text, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_record_with_lock(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_status public.record_status_enum DEFAULT NULL::public.record_status_enum, p_modification_reason text DEFAULT NULL::text, p_last_modified_by uuid DEFAULT NULL::uuid) RETURNS TABLE(out_id uuid, out_serial text, out_edit_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_current_edit_count INT;
BEGIN
  SELECT r.edit_count INTO v_current_edit_count FROM records r WHERE r.id = p_id AND r.deleted_at IS NULL;

IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or deleted';
  END IF;

IF v_current_edit_count != p_expected_edit_count THEN
    RAISE EXCEPTION 'Optimistic lock conflict: expected edit_count %, actual %', p_expected_edit_count, v_current_edit_count;
  END IF;

UPDATE records SET
    form_data = COALESCE(p_form_data, records.form_data),
    status = COALESCE(p_status, records.status),
    modification_reason = p_modification_reason,
    last_modified_by = p_last_modified_by,
    edit_count = records.edit_count + 1,
    updated_at = now()
  WHERE records.id = p_id AND records.deleted_at IS NULL AND records.edit_count = p_expected_edit_count;

IF NOT FOUND THEN
    RAISE EXCEPTION 'Update failed — record may have been modified concurrently';
  END IF;

RETURN QUERY SELECT records.id, records.serial, records.edit_count FROM records WHERE records.id = p_id;
END;
$$;


-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- Name: audit_log; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    changed_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    previous_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    performed_by text DEFAULT 'system'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    action_type text,
    form_code text,
    serial text,
    user_email text,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'status_change'::text, 'ai_assisted_create'::text, 'workflow_transition'::text, 'discard'::text, 'restore'::text, 'error_report_resolved'::text])))
);


-- Name: capas; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.capas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    capa_id text NOT NULL,
    source_of_capa text,
    type text,
    description text,
    reference text,
    root_cause_analysis text,
    corrective_action text,
    preventive_action text,
    responsible_person text,
    target_completion_date date,
    status text DEFAULT 'Open'::text,
    related_risk text,
    effectiveness text,
    verification_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


-- Name: document_metadata; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.document_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    storage_path text NOT NULL,
    bucket_id text NOT NULL,
    document_number text NOT NULL,
    version text DEFAULT '1.0'::text NOT NULL,
    previous_version text,
    revision_date date,
    author_id uuid,
    author_name text,
    reviewer_id uuid,
    reviewer_name text,
    approver_id uuid,
    approver_name text,
    approval_date date,
    approval_status text DEFAULT 'draft'::text,
    classification text DEFAULT 'internal'::text,
    department text,
    process_id text,
    retention_years integer DEFAULT 5,
    retention_until date,
    review_date date,
    archival_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    parent_document_id uuid,
    related_documents uuid[],
    title text,
    description text,
    keywords text[],
    checksum text,
    file_size bigint,
    mime_type text,
    iso_clause text,
    form_code text,
    record_type text DEFAULT 'record'::text,
    change_reason text,
    change_description text,
    CONSTRAINT document_metadata_approval_status_check CHECK ((approval_status = ANY (ARRAY['draft'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'obsolete'::text]))),
    CONSTRAINT document_metadata_classification_check CHECK ((classification = ANY (ARRAY['public'::text, 'internal'::text, 'confidential'::text, 'restricted'::text]))),
    CONSTRAINT document_metadata_record_type_check CHECK ((record_type = ANY (ARRAY['record'::text, 'procedure'::text, 'manual'::text, 'form'::text, 'template'::text])))
);


-- Name: document_reviews; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.document_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    reviewed_by uuid,
    review_status text DEFAULT 'pending'::text,
    review_notes text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_reviews_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'completed'::text, 'overdue'::text])))
);


-- Name: document_versions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version text NOT NULL,
    storage_path text NOT NULL,
    change_reason text,
    change_description text,
    changed_by uuid,
    changed_by_name text,
    created_at timestamp with time zone DEFAULT now(),
    checksum text
);


-- Name: error_reports; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.error_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    user_email text,
    page_url text NOT NULL,
    error_message text NOT NULL,
    error_stack text,
    context jsonb,
    browser_info jsonb,
    created_at timestamp with time zone DEFAULT now(),
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolution_notes text
);


-- Name: notifications; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text,
    link text,
    data jsonb,
    read boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    category public.notification_category DEFAULT 'system'::public.notification_category,
    priority public.notification_priority DEFAULT 'info'::public.notification_priority,
    event_type text,
    actor_id uuid,
    target_id uuid
);


-- Name: process_interactions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.process_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_process_id text NOT NULL,
    target_process_id text NOT NULL,
    interaction_type text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


-- Name: processes; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_id text NOT NULL,
    process_name text NOT NULL,
    category text,
    owner text,
    inputs text,
    outputs text,
    resources text,
    competence_needed text,
    controls text,
    effectiveness text,
    status text DEFAULT 'Active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


-- Name: profiles; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    password text,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    department character varying
);


-- Name: projects; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'Active'::text,
    start_date text,
    team_allocation jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_project_status CHECK ((status = ANY (ARRAY['Active'::text, 'Completed'::text, 'On Hold'::text])))
);


-- Name: record_versions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.record_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    version integer NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_by text NOT NULL,
    changed_by_user_id uuid,
    change_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: risks; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id text NOT NULL,
    process_department text NOT NULL,
    risk_description text NOT NULL,
    cause text,
    likelihood integer,
    impact integer,
    risk_score integer,
    action_control text,
    owner text,
    status text DEFAULT 'Open'::text,
    review_date date,
    linked_capa text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT risks_impact_check CHECK (((impact >= 1) AND (impact <= 5))),
    CONSTRAINT risks_likelihood_check CHECK (((likelihood >= 1) AND (likelihood <= 5)))
);


-- Name: swot_items; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.swot_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id text NOT NULL,
    quadrant text NOT NULL,
    text text NOT NULL,
    category text NOT NULL,
    risk_level text DEFAULT 'Low'::text NOT NULL,
    source text,
    action_plan text,
    responsible text,
    target_date date,
    iso_clause text,
    linked_to jsonb DEFAULT '[]'::jsonb,
    is_custom boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT swot_items_quadrant_check CHECK ((quadrant = ANY (ARRAY['strengths'::text, 'weaknesses'::text, 'opportunities'::text, 'threats'::text]))),
    CONSTRAINT swot_items_risk_level_check CHECK ((risk_level = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])))
);


-- Name: swot_strategies; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.swot_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    strategy_id text NOT NULL,
    kind text NOT NULL,
    combat text NOT NULL,
    adj text NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT swot_strategies_kind_check CHECK ((kind = ANY (ARRAY['SO'::text, 'WO'::text, 'ST'::text, 'WT'::text])))
);


-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text DEFAULT ''::text NOT NULL,
    company_logo_url text DEFAULT ''::text NOT NULL,
    theme_color text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


-- Name: user_roles; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    department character varying
);


-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


-- Name: capas capas_capa_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.capas
    ADD CONSTRAINT capas_capa_id_key UNIQUE (capa_id);


-- Name: capas capas_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.capas
    ADD CONSTRAINT capas_pkey PRIMARY KEY (id);


-- Name: document_metadata document_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_pkey PRIMARY KEY (id);


-- Name: document_metadata document_metadata_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_storage_path_key UNIQUE (storage_path);


-- Name: document_reviews document_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_reviews
    ADD CONSTRAINT document_reviews_pkey PRIMARY KEY (id);


-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


-- Name: error_reports error_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.error_reports
    ADD CONSTRAINT error_reports_pkey PRIMARY KEY (id);


-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


-- Name: process_interactions process_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.process_interactions
    ADD CONSTRAINT process_interactions_pkey PRIMARY KEY (id);


-- Name: processes processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_pkey PRIMARY KEY (id);


-- Name: processes processes_process_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_process_id_key UNIQUE (process_id);


-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


-- Name: projects projects_name_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_name_key UNIQUE (name);


-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


-- Name: record_versions record_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.record_versions
    ADD CONSTRAINT record_versions_pkey PRIMARY KEY (id);


-- Name: record_versions record_versions_record_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.record_versions
    ADD CONSTRAINT record_versions_record_id_version_key UNIQUE (record_id, version);


-- Name: records records_form_data_has_text; Type: CHECK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.records
    ADD CONSTRAINT records_form_data_has_text CHECK (public.jsonb_has_any_text(form_data)) NOT VALID;


-- Name: records records_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.records
    ADD CONSTRAINT records_pkey PRIMARY KEY (id);


-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


-- Name: risks risks_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_id_key UNIQUE (risk_id);


-- Name: swot_items swot_items_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.swot_items
    ADD CONSTRAINT swot_items_item_id_key UNIQUE (item_id);


-- Name: swot_items swot_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.swot_items
    ADD CONSTRAINT swot_items_pkey PRIMARY KEY (id);


-- Name: swot_strategies swot_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.swot_strategies
    ADD CONSTRAINT swot_strategies_pkey PRIMARY KEY (id);


-- Name: swot_strategies swot_strategies_strategy_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.swot_strategies
    ADD CONSTRAINT swot_strategies_strategy_id_key UNIQUE (strategy_id);


-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


-- Name: user_roles user_roles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


-- Name: idx_audit_log_form_code; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_audit_log_form_code ON public.audit_log USING btree (form_code);


-- Name: idx_audit_log_record_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_audit_log_record_id ON public.audit_log USING btree (record_id);


-- Name: idx_audit_log_serial; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_audit_log_serial ON public.audit_log USING btree (serial);


-- Name: idx_capas_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_capas_status ON public.capas USING btree (status);


-- Name: idx_doc_meta_approval; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_approval ON public.document_metadata USING btree (approval_status);


-- Name: idx_doc_meta_bucket; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_bucket ON public.document_metadata USING btree (bucket_id);


-- Name: idx_doc_meta_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_created ON public.document_metadata USING btree (created_at DESC);


-- Name: idx_doc_meta_dept; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_dept ON public.document_metadata USING btree (department);


-- Name: idx_doc_meta_form; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_form ON public.document_metadata USING btree (form_code);


-- Name: idx_doc_meta_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_meta_number ON public.document_metadata USING btree (document_number);


-- Name: idx_doc_reviews_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_reviews_date ON public.document_reviews USING btree (scheduled_date);


-- Name: idx_doc_reviews_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_reviews_status ON public.document_reviews USING btree (review_status);


-- Name: idx_doc_versions_doc; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_versions_doc ON public.document_versions USING btree (document_id);


-- Name: idx_doc_versions_version; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_doc_versions_version ON public.document_versions USING btree (version);


-- Name: idx_error_reports_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_error_reports_created_at ON public.error_reports USING btree (created_at DESC);


-- Name: idx_error_reports_resolved; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_error_reports_resolved ON public.error_reports USING btree (resolved);


-- Name: idx_error_reports_version; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_error_reports_version ON public.error_reports USING btree (version);


-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read) WHERE (read = false);


-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


-- Name: idx_notifications_user_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_user_category ON public.notifications USING btree (user_id, category);


-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


-- Name: idx_notifications_user_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_user_priority ON public.notifications USING btree (user_id, priority);


-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);


-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


-- Name: idx_records_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_created_at ON public.records USING btree (created_at);


-- Name: idx_records_form_code; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_form_code ON public.records USING btree (form_code);


-- Name: idx_records_form_code_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_form_code_status ON public.records USING btree (form_code, status) WHERE (deleted_at IS NULL);


-- Name: idx_records_section; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_section ON public.records USING btree (section) WHERE (deleted_at IS NULL);


-- Name: idx_records_serial; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_serial ON public.records USING btree (serial);


-- Name: idx_records_serial_unique; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_serial_unique ON public.records USING btree (serial) WHERE (deleted_at IS NULL);


-- Name: idx_records_serial_unique_active; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_records_serial_unique_active ON public.records USING btree (serial) WHERE (deleted_at IS NULL);


-- Name: idx_records_updated_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_records_updated_at ON public.records USING btree (updated_at);


-- Name: idx_risks_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_risks_status ON public.risks USING btree (status);


-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


-- Name: record_versions_record_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX record_versions_record_idx ON public.record_versions USING btree (record_id, version DESC);


-- Name: records records_sync_project; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER records_sync_project BEFORE INSERT OR UPDATE OF form_data, project_id ON public.records FOR EACH ROW EXECUTE FUNCTION public.prime_sync_record_project();


-- Name: records set_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Name: records trg_notify_on_record_decision; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trg_notify_on_record_decision AFTER UPDATE OF status ON public.records FOR EACH ROW EXECUTE FUNCTION public.notify_on_record_decision();


-- Name: tenant_settings trigger_enforce_singleton_tenant; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_enforce_singleton_tenant AFTER INSERT ON public.tenant_settings FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_singleton_tenant();


-- Name: records trigger_log_record_change; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_log_record_change AFTER INSERT OR DELETE OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.log_record_change();


-- Name: audit_log trigger_prevent_audit_delete; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_prevent_audit_delete BEFORE DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


-- Name: audit_log trigger_prevent_audit_update; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_prevent_audit_update BEFORE UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


-- Name: tenant_settings trigger_set_tenant_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_set_tenant_updated_at BEFORE UPDATE ON public.tenant_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_updated_at();


-- Name: document_metadata update_doc_meta_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_doc_meta_updated_at BEFORE UPDATE ON public.document_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: audit_log audit_log_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.records(id) ON DELETE CASCADE;


-- Name: document_metadata document_metadata_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles(user_id);


-- Name: document_metadata document_metadata_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(user_id);


-- Name: document_metadata document_metadata_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);


-- Name: document_metadata document_metadata_parent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.document_metadata(id);


-- Name: document_metadata document_metadata_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(user_id);


-- Name: document_metadata document_metadata_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(user_id);


-- Name: document_reviews document_reviews_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_reviews
    ADD CONSTRAINT document_reviews_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


-- Name: document_reviews document_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_reviews
    ADD CONSTRAINT document_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(user_id);


-- Name: document_versions document_versions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(user_id);


-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


-- Name: records fk_records_project; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.records
    ADD CONSTRAINT fk_records_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


-- Name: record_versions record_versions_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.record_versions
    ADD CONSTRAINT record_versions_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.records(id) ON DELETE CASCADE;


-- Name: swot_items swot_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.swot_items
    ADD CONSTRAINT swot_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- Name: records Admin and manager can insert records; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin and manager can insert records" ON public.records FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


-- Name: records Admin and manager can update records; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin and manager can update records" ON public.records FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


-- Name: process_interactions Authenticated can insert process_interactions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated can insert process_interactions" ON public.process_interactions FOR INSERT TO authenticated WITH CHECK (true);


-- Name: processes Authenticated can insert processes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated can insert processes" ON public.processes FOR INSERT TO authenticated WITH CHECK (true);


-- Name: processes Authenticated can read processes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated can read processes" ON public.processes FOR SELECT TO authenticated USING (true);


-- Name: processes Authenticated can update processes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated can update processes" ON public.processes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- Name: capas Authenticated users can update capas; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated users can update capas" ON public.capas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- Name: risks Authenticated users can update risks; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated users can update risks" ON public.risks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- Name: tenant_settings Only admins can insert tenant settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Only admins can insert tenant settings" ON public.tenant_settings FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'::text));


-- Name: tenant_settings Only admins can update tenant settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Only admins can update tenant settings" ON public.tenant_settings FOR UPDATE TO authenticated USING (public.has_role('admin'::text)) WITH CHECK (public.has_role('admin'::text));


-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Name: audit_log audit_log_deny_delete; Type: POLICY; Schema: public; Owner: -

CREATE POLICY audit_log_deny_delete ON public.audit_log FOR DELETE TO anon, authenticated USING (false);


-- Name: audit_log audit_log_deny_update; Type: POLICY; Schema: public; Owner: -

CREATE POLICY audit_log_deny_update ON public.audit_log FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);


-- Name: audit_log audit_log_insert_server_rpc; Type: POLICY; Schema: public; Owner: -

CREATE POLICY audit_log_insert_server_rpc ON public.audit_log FOR INSERT TO authenticated WITH CHECK (false);


-- Name: audit_log audit_log_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY audit_log_read_admin ON public.audit_log FOR SELECT TO authenticated USING (public.is_manager());


-- Name: audit_log audit_log_read_record_scope; Type: POLICY; Schema: public; Owner: -

CREATE POLICY audit_log_read_record_scope ON public.audit_log FOR SELECT TO authenticated USING ((public.is_manager() OR (EXISTS ( SELECT 1
   FROM public.records r
  WHERE (r.id = audit_log.record_id)))));


-- Name: capas; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

-- Name: capas capas_insert_authenticated; Type: POLICY; Schema: public; Owner: -

CREATE POLICY capas_insert_authenticated ON public.capas FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


-- Name: capas capas_read; Type: POLICY; Schema: public; Owner: -

CREATE POLICY capas_read ON public.capas FOR SELECT TO authenticated USING (true);


-- Name: document_metadata; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;

-- Name: document_metadata document_metadata_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_metadata_delete_admin ON public.document_metadata FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: document_metadata document_metadata_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_metadata_insert_admin ON public.document_metadata FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: document_metadata document_metadata_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_metadata_read_admin ON public.document_metadata FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: document_metadata document_metadata_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_metadata_update_admin ON public.document_metadata FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: document_reviews; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;

-- Name: document_reviews document_reviews_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_reviews_delete_admin ON public.document_reviews FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: document_reviews document_reviews_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_reviews_insert_admin ON public.document_reviews FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: document_reviews document_reviews_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_reviews_read_admin ON public.document_reviews FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: document_reviews document_reviews_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_reviews_update_admin ON public.document_reviews FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: document_versions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Name: document_versions document_versions_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_versions_delete_admin ON public.document_versions FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: document_versions document_versions_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_versions_insert_admin ON public.document_versions FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: document_versions document_versions_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_versions_read_admin ON public.document_versions FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: document_versions document_versions_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY document_versions_update_admin ON public.document_versions FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: error_reports; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Name: error_reports error_reports_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY error_reports_delete_admin ON public.error_reports FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: error_reports error_reports_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY error_reports_insert_admin ON public.error_reports FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: error_reports error_reports_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY error_reports_read_admin ON public.error_reports FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: error_reports error_reports_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY error_reports_update_admin ON public.error_reports FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Name: notifications notifications_delete; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING ((user_id = auth.uid()));


-- Name: notifications notifications_insert_system; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_insert_system ON public.notifications FOR INSERT WITH CHECK (true);


-- Name: notifications notifications_read_own; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


-- Name: process_interactions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.process_interactions ENABLE ROW LEVEL SECURITY;

-- Name: process_interactions process_interactions_insert_manager; Type: POLICY; Schema: public; Owner: -

CREATE POLICY process_interactions_insert_manager ON public.process_interactions FOR INSERT TO authenticated WITH CHECK (public.prime_is_manager_or_admin());


-- Name: process_interactions process_interactions_read; Type: POLICY; Schema: public; Owner: -

CREATE POLICY process_interactions_read ON public.process_interactions FOR SELECT TO authenticated USING (true);


-- Name: process_interactions process_interactions_update_manager; Type: POLICY; Schema: public; Owner: -

CREATE POLICY process_interactions_update_manager ON public.process_interactions FOR UPDATE TO authenticated USING (public.prime_is_manager_or_admin()) WITH CHECK (public.prime_is_manager_or_admin());


-- Name: processes; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Name: processes processes_insert_manager; Type: POLICY; Schema: public; Owner: -

CREATE POLICY processes_insert_manager ON public.processes FOR INSERT TO authenticated WITH CHECK (public.prime_is_manager_or_admin());


-- Name: processes processes_update_manager; Type: POLICY; Schema: public; Owner: -

CREATE POLICY processes_update_manager ON public.processes FOR UPDATE TO authenticated USING (public.prime_is_manager_or_admin()) WITH CHECK (public.prime_is_manager_or_admin());


-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Name: profiles profiles_delete_admin_only; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_delete_admin_only ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());


-- Name: profiles profiles_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_delete_own_or_admin ON public.profiles FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


-- Name: profiles profiles_insert_admin_only; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_insert_admin_only ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());


-- Name: profiles profiles_insert_own_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_insert_own_or_admin ON public.profiles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));


-- Name: profiles profiles_read_own_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_read_own_or_admin ON public.profiles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


-- Name: profiles profiles_update_own_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY profiles_update_own_or_admin ON public.profiles FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_admin())) WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));


-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Name: projects projects_read_active; Type: POLICY; Schema: public; Owner: -

CREATE POLICY projects_read_active ON public.projects FOR SELECT TO authenticated USING (((status <> 'archived'::text) OR public.is_admin()));


-- Name: projects projects_write_manager_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY projects_write_manager_or_admin ON public.projects TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());


-- Name: record_versions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.record_versions ENABLE ROW LEVEL SECURITY;

-- Name: record_versions record_versions_insert_system; Type: POLICY; Schema: public; Owner: -

CREATE POLICY record_versions_insert_system ON public.record_versions FOR INSERT TO authenticated WITH CHECK (false);


-- Name: record_versions record_versions_read_record_scope; Type: POLICY; Schema: public; Owner: -

CREATE POLICY record_versions_read_record_scope ON public.record_versions FOR SELECT TO authenticated USING ((public.is_manager() OR (EXISTS ( SELECT 1
   FROM public.records r
  WHERE (r.id = record_versions.record_id)))));


-- Name: records; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Name: records records_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY records_delete_admin ON public.records FOR DELETE TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: records records_insert_authenticated; Type: POLICY; Schema: public; Owner: -

CREATE POLICY records_insert_authenticated ON public.records FOR INSERT TO authenticated WITH CHECK (((deleted_at IS NULL) AND (created_by = (auth.uid())::text)));


-- Name: records records_read_dept_or_owner; Type: POLICY; Schema: public; Owner: -

CREATE POLICY records_read_dept_or_owner ON public.records FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (public.prime_is_manager_or_admin() OR (created_by = (auth.uid())::text) OR (created_by = public.prime_current_user_email()) OR (public.prime_record_department(form_code) = public.current_user_department()))));


-- Name: records records_update_owner_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY records_update_owner_or_admin ON public.records FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (public.is_admin() OR (created_by = (auth.uid())::text) OR (created_by = public.prime_current_user_email())))) WITH CHECK ((deleted_at IS NULL));


-- Name: risks; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- Name: risks risks_insert_authenticated; Type: POLICY; Schema: public; Owner: -

CREATE POLICY risks_insert_authenticated ON public.risks FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


-- Name: risks risks_read; Type: POLICY; Schema: public; Owner: -

CREATE POLICY risks_read ON public.risks FOR SELECT TO authenticated USING (true);


-- Name: audit_log rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.audit_log AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: capas rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.capas AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: notifications rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.notifications AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: process_interactions rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.process_interactions AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: profiles rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.profiles AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: records rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.records AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: risks rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.risks AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: user_roles rls_block_anon; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_block_anon ON public.user_roles AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);


-- Name: audit_log rls_deny_audit_delete; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_deny_audit_delete ON public.audit_log AS RESTRICTIVE FOR DELETE TO authenticated USING (false);


-- Name: audit_log rls_deny_audit_insert; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_deny_audit_insert ON public.audit_log AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);


-- Name: audit_log rls_deny_audit_update; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_deny_audit_update ON public.audit_log AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


-- Name: notifications rls_deny_notifications_insert; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_deny_notifications_insert ON public.notifications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);


-- Name: records rls_deny_records_delete; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_deny_records_delete ON public.records AS RESTRICTIVE FOR DELETE TO authenticated USING (false);


-- Name: document_metadata rls_lock_all; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_lock_all ON public.document_metadata AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);


-- Name: document_reviews rls_lock_all; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_lock_all ON public.document_reviews AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);


-- Name: document_versions rls_lock_all; Type: POLICY; Schema: public; Owner: -

CREATE POLICY rls_lock_all ON public.document_versions AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);


-- Name: swot_items; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.swot_items ENABLE ROW LEVEL SECURITY;

-- Name: swot_items swot_items_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_items_delete_admin ON public.swot_items FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: swot_items swot_items_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_items_insert_admin ON public.swot_items FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: swot_items swot_items_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_items_read_admin ON public.swot_items FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: swot_items swot_items_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_items_update_admin ON public.swot_items FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: swot_strategies; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.swot_strategies ENABLE ROW LEVEL SECURITY;

-- Name: swot_strategies swot_strategies_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_strategies_delete_admin ON public.swot_strategies FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: swot_strategies swot_strategies_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_strategies_insert_admin ON public.swot_strategies FOR INSERT TO authenticated WITH CHECK (public.prime_is_admin());


-- Name: swot_strategies swot_strategies_read_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_strategies_read_admin ON public.swot_strategies FOR SELECT TO authenticated USING (public.prime_is_manager_or_admin());


-- Name: swot_strategies swot_strategies_update_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY swot_strategies_update_admin ON public.swot_strategies FOR UPDATE TO authenticated USING (public.prime_is_admin()) WITH CHECK (public.prime_is_admin());


-- Name: tenant_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Name: tenant_settings tenant_settings_delete_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY tenant_settings_delete_admin ON public.tenant_settings FOR DELETE TO authenticated USING (public.prime_is_admin());


-- Name: tenant_settings tenant_settings_insert_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY tenant_settings_insert_admin ON public.tenant_settings FOR INSERT TO authenticated WITH CHECK (public.prime_is_manager_or_admin());


-- Name: tenant_settings tenant_settings_read_all; Type: POLICY; Schema: public; Owner: -

CREATE POLICY tenant_settings_read_all ON public.tenant_settings FOR SELECT TO anon, authenticated USING (true);


-- Name: tenant_settings tenant_settings_write_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY tenant_settings_write_admin ON public.tenant_settings FOR UPDATE TO authenticated USING (public.prime_is_manager_or_admin()) WITH CHECK (public.prime_is_manager_or_admin());


-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Name: user_roles user_roles_delete_admin_only; Type: POLICY; Schema: public; Owner: -

CREATE POLICY user_roles_delete_admin_only ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());


-- Name: user_roles user_roles_insert_admin_only; Type: POLICY; Schema: public; Owner: -

CREATE POLICY user_roles_insert_admin_only ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());


-- Name: user_roles user_roles_read_own_or_admin; Type: POLICY; Schema: public; Owner: -

CREATE POLICY user_roles_read_own_or_admin ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_manager()));


-- Name: user_roles user_roles_update_admin_only; Type: POLICY; Schema: public; Owner: -

CREATE POLICY user_roles_update_admin_only ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;


-- Name: FUNCTION _validate_form_required_fields(p_form_code text, p_form_data jsonb); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public._validate_form_required_fields(p_form_code text, p_form_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public._validate_form_required_fields(p_form_code text, p_form_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public._validate_form_required_fields(p_form_code text, p_form_data jsonb) TO service_role;


-- Name: FUNCTION admin_create_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_create_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_create_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.admin_create_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean) TO service_role;


-- Name: FUNCTION admin_deactivate_profile(p_user_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_deactivate_profile(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_deactivate_profile(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_deactivate_profile(p_user_id uuid) TO service_role;


-- Name: FUNCTION admin_delete_user_role(p_user_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_delete_user_role(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_user_role(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_user_role(p_user_id uuid) TO service_role;


-- Name: FUNCTION admin_list_users(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_list_users() TO authenticated;
GRANT ALL ON FUNCTION public.admin_list_users() TO service_role;


-- Name: FUNCTION admin_update_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean, p_last_login timestamp with time zone); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_update_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean, p_last_login timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_update_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean, p_last_login timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.admin_update_profile(p_user_id uuid, p_email text, p_display_name text, p_department text, p_is_active boolean, p_last_login timestamp with time zone) TO service_role;


-- Name: FUNCTION admin_upsert_tenant_settings(p_company_name text, p_company_logo_url text, p_theme_color text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_upsert_tenant_settings(p_company_name text, p_company_logo_url text, p_theme_color text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_upsert_tenant_settings(p_company_name text, p_company_logo_url text, p_theme_color text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_upsert_tenant_settings(p_company_name text, p_company_logo_url text, p_theme_color text) TO service_role;


-- Name: FUNCTION admin_upsert_user_role(p_user_id uuid, p_role text, p_department text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.admin_upsert_user_role(p_user_id uuid, p_role text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_upsert_user_role(p_user_id uuid, p_role text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_upsert_user_role(p_user_id uuid, p_role text, p_department text) TO service_role;


-- Name: FUNCTION append_audit_log(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_performed_by text, p_form_code text, p_serial text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.append_audit_log(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_performed_by text, p_form_code text, p_serial text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.append_audit_log(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_performed_by text, p_form_code text, p_serial text) TO service_role;


-- Name: FUNCTION audit_log_server_append(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_form_code text, p_serial text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.audit_log_server_append(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_form_code text, p_serial text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.audit_log_server_append(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_form_code text, p_serial text) TO authenticated;
GRANT ALL ON FUNCTION public.audit_log_server_append(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_form_code text, p_serial text) TO service_role;


-- Name: FUNCTION bulk_create_records(p_rows jsonb, p_reason text, p_skip_existing boolean, p_allow_incomplete boolean); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.bulk_create_records(p_rows jsonb, p_reason text, p_skip_existing boolean, p_allow_incomplete boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bulk_create_records(p_rows jsonb, p_reason text, p_skip_existing boolean, p_allow_incomplete boolean) TO service_role;
GRANT ALL ON FUNCTION public.bulk_create_records(p_rows jsonb, p_reason text, p_skip_existing boolean, p_allow_incomplete boolean) TO authenticated;


-- Name: FUNCTION bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text) TO service_role;
GRANT ALL ON FUNCTION public.bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text) TO authenticated;


-- Name: FUNCTION create_notification(p_user_id uuid, p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) TO service_role;


-- Name: FUNCTION create_notifications_batch(p_user_ids uuid[], p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id text, p_target_id text, p_link text, p_data jsonb, p_created_by text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.create_notifications_batch(p_user_ids uuid[], p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id text, p_target_id text, p_link text, p_data jsonb, p_created_by text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_notifications_batch(p_user_ids uuid[], p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id text, p_target_id text, p_link text, p_data jsonb, p_created_by text) TO authenticated;
GRANT ALL ON FUNCTION public.create_notifications_batch(p_user_ids uuid[], p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id text, p_target_id text, p_link text, p_data jsonb, p_created_by text) TO service_role;


-- Name: FUNCTION create_record_validated(p_form_code text, p_form_name text, p_form_data jsonb, p_status public.record_status_enum, p_serial text, p_section integer, p_section_name text, p_frequency text, p_created_by uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.create_record_validated(p_form_code text, p_form_name text, p_form_data jsonb, p_status public.record_status_enum, p_serial text, p_section integer, p_section_name text, p_frequency text, p_created_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_record_validated(p_form_code text, p_form_name text, p_form_data jsonb, p_status public.record_status_enum, p_serial text, p_section integer, p_section_name text, p_frequency text, p_created_by uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_record_validated(p_form_code text, p_form_name text, p_form_data jsonb, p_status public.record_status_enum, p_serial text, p_section integer, p_section_name text, p_frequency text, p_created_by uuid) TO service_role;


-- Name: FUNCTION current_user_department(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.current_user_department() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_user_department() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_department() TO service_role;


-- Name: FUNCTION dashboard_stats(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.dashboard_stats() FROM PUBLIC;
GRANT ALL ON FUNCTION public.dashboard_stats() TO authenticated;
GRANT ALL ON FUNCTION public.dashboard_stats() TO service_role;


-- Name: FUNCTION emit_event(p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.emit_event(p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.emit_event(p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) TO authenticated;
GRANT ALL ON FUNCTION public.emit_event(p_title text, p_message text, p_category text, p_priority text, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb, p_created_by uuid) TO service_role;


-- Name: FUNCTION enforce_singleton_tenant(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.enforce_singleton_tenant() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_singleton_tenant() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_singleton_tenant() TO service_role;


-- Name: FUNCTION error_report_resolve(p_report_id uuid, p_notes text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.error_report_resolve(p_report_id uuid, p_notes text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.error_report_resolve(p_report_id uuid, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.error_report_resolve(p_report_id uuid, p_notes text) TO service_role;


-- Name: FUNCTION error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.error_report_submit(p_error_message text, p_error_stack text, p_page_url text, p_version text, p_browser_info jsonb, p_context jsonb) TO service_role;


-- Name: FUNCTION get_empty_records(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.get_empty_records() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_empty_records() TO authenticated;
GRANT ALL ON FUNCTION public.get_empty_records() TO service_role;


-- Name: FUNCTION get_next_serial(p_form_code text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.get_next_serial(p_form_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_next_serial(p_form_code text) TO authenticated;
GRANT ALL ON FUNCTION public.get_next_serial(p_form_code text) TO service_role;


-- Name: TABLE records; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.records TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.records TO authenticated;


-- Name: FUNCTION get_record_by_serial(p_serial text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.get_record_by_serial(p_serial text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_record_by_serial(p_serial text) TO authenticated;
GRANT ALL ON FUNCTION public.get_record_by_serial(p_serial text) TO service_role;


-- Name: FUNCTION get_record_count(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.get_record_count() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_record_count() TO authenticated;
GRANT ALL ON FUNCTION public.get_record_count() TO service_role;


-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


-- Name: FUNCTION has_role(required_role text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.has_role(required_role text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(required_role text) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(required_role text) TO service_role;


-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


-- Name: FUNCTION is_manager(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_manager() TO authenticated;
GRANT ALL ON FUNCTION public.is_manager() TO service_role;


-- Name: FUNCTION jsonb_has_any_text(p_data jsonb); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.jsonb_has_any_text(p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.jsonb_has_any_text(p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_has_any_text(p_data jsonb) TO service_role;


-- Name: FUNCTION jsonb_has_user_content(p_data jsonb, p_serial text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.jsonb_has_user_content(p_data jsonb, p_serial text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.jsonb_has_user_content(p_data jsonb, p_serial text) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_has_user_content(p_data jsonb, p_serial text) TO service_role;


-- Name: FUNCTION log_record_change(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.log_record_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_record_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_record_change() TO service_role;


-- Name: FUNCTION notify_admins(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.notify_admins(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_admins(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.notify_admins(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) TO service_role;


-- Name: FUNCTION notify_leadership(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.notify_leadership(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_leadership(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.notify_leadership(p_title text, p_message text, p_category public.notification_category, p_priority public.notification_priority, p_event_type text, p_actor_id uuid, p_target_id uuid, p_link text, p_data jsonb) TO service_role;


-- Name: FUNCTION notify_on_record_decision(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.notify_on_record_decision() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_record_decision() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_record_decision() TO service_role;


-- Name: FUNCTION prevent_audit_modification(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prevent_audit_modification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prevent_audit_modification() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_modification() TO service_role;


-- Name: FUNCTION prime_admin_user_ids(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_admin_user_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_admin_user_ids() TO service_role;
GRANT ALL ON FUNCTION public.prime_admin_user_ids() TO authenticated;


-- Name: FUNCTION prime_current_user_email(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_current_user_email() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_current_user_email() TO service_role;
GRANT ALL ON FUNCTION public.prime_current_user_email() TO authenticated;


-- Name: FUNCTION prime_is_admin(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.prime_is_admin() TO service_role;


-- Name: FUNCTION prime_is_manager_or_admin(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_is_manager_or_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_is_manager_or_admin() TO authenticated;
GRANT ALL ON FUNCTION public.prime_is_manager_or_admin() TO service_role;


-- Name: FUNCTION prime_leadership_user_ids(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_leadership_user_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_leadership_user_ids() TO service_role;
GRANT ALL ON FUNCTION public.prime_leadership_user_ids() TO authenticated;


-- Name: FUNCTION prime_record_department(p_form_code text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_record_department(p_form_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_record_department(p_form_code text) TO authenticated;
GRANT ALL ON FUNCTION public.prime_record_department(p_form_code text) TO service_role;


-- Name: FUNCTION prime_sync_record_project(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_sync_record_project() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_sync_record_project() TO service_role;


-- Name: FUNCTION prime_user_role(p_user_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.prime_user_role(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.prime_user_role(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.prime_user_role(p_user_id uuid) TO service_role;


-- Name: FUNCTION purge_all_empty_records(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.purge_all_empty_records() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_all_empty_records() TO service_role;


-- Name: FUNCTION purge_empty_record(p_record_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.purge_empty_record(p_record_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_empty_record(p_record_id uuid) TO service_role;


-- Name: FUNCTION record_discard_draft(p_draft_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_discard_draft(p_draft_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_discard_draft(p_draft_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.record_discard_draft(p_draft_id uuid) TO service_role;


-- Name: FUNCTION record_draft_autosave(p_draft_id uuid, p_form_data jsonb, p_section integer, p_section_name text, p_frequency text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_draft_autosave(p_draft_id uuid, p_form_data jsonb, p_section integer, p_section_name text, p_frequency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_draft_autosave(p_draft_id uuid, p_form_data jsonb, p_section integer, p_section_name text, p_frequency text) TO authenticated;
GRANT ALL ON FUNCTION public.record_draft_autosave(p_draft_id uuid, p_form_data jsonb, p_section integer, p_section_name text, p_frequency text) TO service_role;


-- Name: FUNCTION record_draft_create(p_form_code text, p_form_data jsonb, p_form_name text, p_section integer, p_section_name text, p_frequency text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_draft_create(p_form_code text, p_form_data jsonb, p_form_name text, p_section integer, p_section_name text, p_frequency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_draft_create(p_form_code text, p_form_data jsonb, p_form_name text, p_section integer, p_section_name text, p_frequency text) TO authenticated;
GRANT ALL ON FUNCTION public.record_draft_create(p_form_code text, p_form_data jsonb, p_form_name text, p_section integer, p_section_name text, p_frequency text) TO service_role;


-- Name: FUNCTION record_restore(p_record_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_restore(p_record_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_restore(p_record_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.record_restore(p_record_id uuid) TO service_role;


-- Name: FUNCTION record_transition(p_record_id uuid, p_target_status text, p_reason text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_transition(p_record_id uuid, p_target_status text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_transition(p_record_id uuid, p_target_status text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.record_transition(p_record_id uuid, p_target_status text, p_reason text) TO service_role;


-- Name: FUNCTION record_version_snapshot(p_record_id uuid, p_form_data jsonb, p_change_summary text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.record_version_snapshot(p_record_id uuid, p_form_data jsonb, p_change_summary text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_version_snapshot(p_record_id uuid, p_form_data jsonb, p_change_summary text) TO authenticated;
GRANT ALL ON FUNCTION public.record_version_snapshot(p_record_id uuid, p_form_data jsonb, p_change_summary text) TO service_role;


-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


-- Name: FUNCTION self_provision_profile(p_display_name text, p_department text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.self_provision_profile(p_display_name text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.self_provision_profile(p_display_name text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public.self_provision_profile(p_display_name text, p_department text) TO service_role;


-- Name: FUNCTION set_tenant_updated_at(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.set_tenant_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_tenant_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_tenant_updated_at() TO service_role;


-- Name: FUNCTION soft_delete_record(p_id uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.soft_delete_record(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_record(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_record(p_id uuid) TO service_role;


-- Name: FUNCTION update_record_versioned(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_last_modified_by text, p_modification_reason text, p_section integer, p_section_name text, p_frequency text, p_change_summary text); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.update_record_versioned(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_last_modified_by text, p_modification_reason text, p_section integer, p_section_name text, p_frequency text, p_change_summary text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_record_versioned(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_last_modified_by text, p_modification_reason text, p_section integer, p_section_name text, p_frequency text, p_change_summary text) TO authenticated;
GRANT ALL ON FUNCTION public.update_record_versioned(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_last_modified_by text, p_modification_reason text, p_section integer, p_section_name text, p_frequency text, p_change_summary text) TO service_role;


-- Name: FUNCTION update_record_with_lock(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_status public.record_status_enum, p_modification_reason text, p_last_modified_by uuid); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.update_record_with_lock(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_status public.record_status_enum, p_modification_reason text, p_last_modified_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_record_with_lock(p_id uuid, p_form_data jsonb, p_expected_edit_count integer, p_status public.record_status_enum, p_modification_reason text, p_last_modified_by uuid) TO service_role;


-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT SELECT ON TABLE public.audit_log TO authenticated;


-- Name: TABLE capas; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.capas TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.capas TO authenticated;


-- Name: TABLE document_metadata; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.document_metadata TO service_role;
GRANT SELECT ON TABLE public.document_metadata TO authenticated;


-- Name: TABLE document_reviews; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.document_reviews TO service_role;
GRANT SELECT ON TABLE public.document_reviews TO authenticated;


-- Name: TABLE document_versions; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.document_versions TO service_role;
GRANT SELECT ON TABLE public.document_versions TO authenticated;


-- Name: TABLE error_reports; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.error_reports TO service_role;
GRANT SELECT ON TABLE public.error_reports TO authenticated;


-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.notifications TO service_role;
GRANT SELECT,DELETE,UPDATE ON TABLE public.notifications TO authenticated;


-- Name: TABLE process_interactions; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.process_interactions TO service_role;
GRANT SELECT ON TABLE public.process_interactions TO authenticated;


-- Name: TABLE processes; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.processes TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.processes TO authenticated;


-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT UPDATE ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.id; Type: ACL; Schema: public; Owner: -

GRANT SELECT(id) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.user_id; Type: ACL; Schema: public; Owner: -

GRANT SELECT(user_id) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.email; Type: ACL; Schema: public; Owner: -

GRANT SELECT(email) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.display_name; Type: ACL; Schema: public; Owner: -

GRANT SELECT(display_name) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.is_active; Type: ACL; Schema: public; Owner: -

GRANT SELECT(is_active) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.last_login; Type: ACL; Schema: public; Owner: -

GRANT SELECT(last_login) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.created_at; Type: ACL; Schema: public; Owner: -

GRANT SELECT(created_at) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.updated_at; Type: ACL; Schema: public; Owner: -

GRANT SELECT(updated_at) ON TABLE public.profiles TO authenticated;


-- Name: COLUMN profiles.department; Type: ACL; Schema: public; Owner: -

GRANT SELECT(department) ON TABLE public.profiles TO authenticated;


-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.projects TO service_role;
GRANT SELECT ON TABLE public.projects TO authenticated;


-- Name: TABLE record_versions; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.record_versions TO service_role;
GRANT SELECT ON TABLE public.record_versions TO authenticated;


-- Name: TABLE risks; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.risks TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.risks TO authenticated;


-- Name: TABLE swot_items; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.swot_items TO service_role;
GRANT SELECT ON TABLE public.swot_items TO authenticated;


-- Name: TABLE swot_strategies; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.swot_strategies TO service_role;
GRANT SELECT ON TABLE public.swot_strategies TO authenticated;


-- Name: TABLE tenant_settings; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.tenant_settings TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.tenant_settings TO authenticated;
GRANT SELECT ON TABLE public.tenant_settings TO anon;


-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -

GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT ON TABLE public.user_roles TO authenticated;


-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- PostgreSQL database dump complete


