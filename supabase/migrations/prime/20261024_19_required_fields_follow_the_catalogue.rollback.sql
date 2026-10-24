-- ============================================================================
-- Rollback of Prime migration 19 — the required-field rule follows the
-- catalogue.
--
-- Puts the server back exactly as it was: the OLD required-field lists
-- (the ones written for an earlier revision of the forms) and the
-- three-argument `bulk_create_records` without the restore's exemption.
--
-- Warning: rolling back re-introduces the two defects migration 19
-- measured — 31 of the 36 forms cannot be created through
-- `create_record_validated`, and a restore of the register's own backup
-- drops 216 of the 316 live records.
--
-- No row is read, written or modified by this script either.
-- ============================================================================
begin;
set local search_path = public, pg_catalog;

-- ── 1. the old required-field gate ─────────────────────────────────────────
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

-- ── 2. the three-argument bulk create ─────────────────────────────────────
drop function if exists public.bulk_create_records(jsonb, text, boolean, boolean);

create or replace function public.bulk_create_records(
  p_rows             jsonb,
  p_reason           text   default 'import',
  p_skip_existing    boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
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
  if not (public.has_role('admin') or public.has_role('manager')) then
    raise exception 'Insufficient role: admin or manager required' using errcode = '42501';
  end if;

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
    elsif v_form_data is null or v_form_data = '{}'::jsonb then
      v_error := 'form_data is empty — a record must carry at least one business field';
    elsif v_status not in ('draft', 'pending_review', 'approved', 'rejected') then
      v_error := format('unknown status: %s', v_status);
    else
      v_error := null;
      begin
        perform public._validate_form_required_fields(v_form_code, v_form_data);
      exception when others then
        v_error := sqlerrm;
      end;
    end if;

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
        'original_created_by', v_row ->> 'original_created_by'));
    end if;
  end loop;

  if jsonb_array_length(v_failures) > 0 then
    return jsonb_build_object(
      'committed', false,
      'created', 0,
      'skipped', v_skipped,
      'failed', jsonb_array_length(v_failures),
      'rows', v_results,
      'failures', v_failures);
  end if;

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
$$;

revoke execute on function public.bulk_create_records(jsonb, text, boolean) from public, anon;
grant execute on function public.bulk_create_records(jsonb, text, boolean) to authenticated;

commit;
