-- ============================================================================
-- Prime migration 19 — the required-field rule follows the catalogue
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-24
-- ============================================================================
--
-- The problem
-- -----------
-- `_validate_form_required_fields` is the server's required-field gate.  It
-- is called by `create_record_validated` and by `bulk_create_records`, and
-- its LISTS were written for an EARLIER revision of the forms — the ones
-- before the unified schema was renumbered and re-fielded.  The change was
-- never carried over, so the server and the catalogue have been describing
-- two different sets of forms ever since.
--
-- Measured on the local copy of the production register (2026-10-24):
--
--   * 31 of the 36 forms could not be created through
--     `create_record_validated` at all — the server demanded fields the
--     form does not have.  F/30 wanted `employee_id`, `period`,
--     `criterion`, `score`, `overall_score`, `evaluator` and
--     `employee_signature`; the F/30 document has `total_marking`,
--     `evaluated_by` and `evaluation_done_by` instead.  A create that the
--     app can produce was refused by the server.
--
--   * 216 of the 316 live records would be REFUSED by the same gate, so a
--     RESTORE of the register's own backup — which goes through
--     `bulk_create_records` — would bring back 100 records and drop 216.
--
-- The catalogue is the source of truth the client validates against
-- (`src/schemas/unifiedSchema.ts` → the `required` flag of every field),
-- and the live data agrees with it: measured against the CATALOGUE's lists,
-- 309 of the 316 live records are complete and only 7 are not (four F/21
-- rows without `item`, three F/22 rows without `date`).
--
-- The fix
-- -------
-- The server's lists become the catalogue's lists — the same `required`
-- flags the client's Zod schema uses, minus `serial`: the serial is a
-- COLUMN, not a business field, and the create path strips it from
-- `form_data` before the write.
--
-- src/__tests__/requiredFieldsAgreeWithCatalogue.test.ts reads THIS file
-- and compares every list with the catalogue, so the two can never drift
-- apart again: a form that gains a required field in the catalogue fails
-- that test until this file is updated with it.
--
-- A RESTORE is not a CREATE
-- -------------------------
-- `bulk_create_records` gains `p_allow_incomplete`.  A restore writes back
-- a record that ALREADY EXISTED — whether it was complete is a historical
-- fact, not a mistake the restore is making — so the completeness rule (a
-- CREATE rule) does not apply to it.  With the flag the 7 incomplete
-- records come back carrying the register's own data instead of being
-- dropped.
--
-- Nothing here changes a row.  No record is read, written or modified by
-- this migration: it replaces two function bodies and one grant.
--
-- Idempotency
-- -----------
-- DROP + CREATE for `bulk_create_records` (the signature changes, and
-- Postgres keeps the old overload otherwise, which would make PostgREST's
-- overload resolution ambiguous); CREATE OR REPLACE for the validator.
--
-- Rollback: 20261024_19_required_fields_follow_the_catalogue.rollback.sql
-- ============================================================================
begin;
set local search_path = public, pg_catalog;

-- ── 1. the required-field gate, following the catalogue ────────────────────
--
-- The lists below are the catalogue's `required` flags (minus `serial`),
-- copied from src/schemas/unifiedSchema.ts.  A field is required when the
-- catalogue says it is; a form the catalogue does not know (a legacy code
-- such as "CAPA REGISTER") has no rules, exactly as before.
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

-- ── 2. the bulk create, with the restore's exemption ──────────────────────
--
-- The body is the one from migration 17, with one addition: when
-- `p_allow_incomplete` is set, the two CREATE rules — "form_data must not
-- be empty" and "the form's required fields must be present" — do not
-- apply.  A restore writes back a record that already existed; whether it
-- was complete is a fact about the past, not a mistake the restore makes.
--
-- The signature changes, so the old overload is dropped: Postgres keeps
-- both when a function is created with more arguments, and two overloads
-- with the same leading arguments make PostgREST's resolution ambiguous.
drop function if exists public.bulk_create_records(jsonb, text, boolean);

create or replace function public.bulk_create_records(
  p_rows             jsonb,
  p_reason           text   default 'import',
  p_skip_existing    boolean default true,
  p_allow_incomplete boolean default false
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
$$;

-- ── 3. the grants ─────────────────────────────────────────────────────────
-- Closed to `anon` — the same shape as every other engine function — and
-- open to `authenticated`, which is the role the app writes as.
revoke execute on function public.bulk_create_records(jsonb, text, boolean, boolean) from public, anon;

grant execute on function public.bulk_create_records(jsonb, text, boolean, boolean) to authenticated;

commit;
