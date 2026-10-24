-- ============================================================================
-- Prime migration 17 — the bulk write paths
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- The register was written ONE ROW AT A TIME:
--
--   * the import looped over the rows and called `createRecord` for each
--     one — 400 round trips for 200 rows, and the serial scan of the
--     whole form repeated for every row;
--   * the restore wrote with `supabase.from("records").upsert(...)` — a
--     direct table write that bypasses the engine, so a restored record
--     has no version history, no `edit_count` and NO audit-trail entry,
--     and an upsert on `serial` OVERWRITES a live record that happens to
--     carry the same serial;
--   * approving N records cost 2N sequential round trips, and a dropped
--     connection half-way through left a queue that is neither approved
--     nor rejected.
--
-- The fix
-- -------
-- Two functions, both of which run in ONE transaction:
--
--   * `bulk_create_records(p_rows jsonb, p_reason text, p_skip_existing bool)`
--     — validates EVERY row first, and only writes when every row has
--     passed, so a batch lands WHOLE or NOT AT ALL.  It allocates the
--     serials server-side (the same `get_next_serial` the single create
--     uses), writes the audit row the single create does not, and never
--     overwrites a live record: a serial that already exists is SKIPPED
--     and reported, never replaced.
--
--   * `bulk_transition_records(p_ids uuid[], p_target_status text, p_reason text)`
--     — moves a queue of records in one round trip, with the SAME
--     transition graph and the SAME role rules the single transition
--     enforces (`record_transition` is called, not re-implemented), and
--     a per-id result: a refused id is reported, the others still move.
--
-- Both are `SECURITY DEFINER` with the role gate INSIDE the function —
-- a gate outside it would be checked with the definer's rights and would
-- always pass.
-- ============================================================================
begin;

-- ── 1. the bulk create ────────────────────────────────────────────────────
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
    elsif v_form_data is null or v_form_data = '{}'::jsonb then
      v_error := 'form_data is empty — a record must carry at least one business field';
    elsif v_status not in ('draft', 'pending_review', 'approved', 'rejected') then
      v_error := format('unknown status: %s', v_status);
    else
      v_error := null;
      -- the server's own required-field rule, per row
      begin
        perform public._validate_form_required_fields(v_form_code, v_form_data);
      exception when others then
        v_error := sqlerrm;
      end;
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
    v_form_data := v_row -> 'form_data';
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
$$;

-- ── 2. the bulk transition ────────────────────────────────────────────────
-- The transition graph and the role rules are NOT re-implemented here:
-- `record_transition` is called, so a bulk approval can never be more
-- permissive than a single one.
create or replace function public.bulk_transition_records(
  p_ids          uuid[],
  p_target_status text,
  p_reason       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
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

-- ── 3. the grants ─────────────────────────────────────────────────────────
-- Closed to `anon` — the same shape as every other engine function — and
-- open to `authenticated`, which is the role the app writes as.
revoke execute on function public.bulk_create_records(jsonb, text, boolean) from public, anon;
revoke execute on function public.bulk_transition_records(uuid[], text, text) from public, anon;

grant execute on function public.bulk_create_records(jsonb, text, boolean) to authenticated;
grant execute on function public.bulk_transition_records(uuid[], text, text) to authenticated;

commit;
