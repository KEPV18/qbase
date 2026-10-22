-- ============================================================================
-- QBase — record_draft_create: the audit row must not violate NOT NULL
-- (2026-10-22)
--
-- WHY
--
-- 20260929_03_record_drafts.sql creates public.record_draft_create, and its
-- audit insert writes an explicit NULL into public.audit_log.previous_values:
--
--     insert into public.audit_log
--       (record_id, action, changed_fields, previous_values, new_values, ...)
--     values
--       (v_created.id, 'create',
--        jsonb_build_object('form_data', true),
--        null::jsonb,                      <-- here
--        ...)
--
-- but the column is declared
--
--     previous_values jsonb DEFAULT '{}'::jsonb NOT NULL
--
-- The DEFAULT only applies when the column is omitted; an explicit NULL is
-- still a NULL, so the insert raises
--
--     null value in column "previous_values" of relation "audit_log"
--     violates not-null constraint
--
-- and the violation rolls the WHOLE function back — the draft insert included.
-- The server-side draft creation path (Prime D4) therefore could not create a
-- single record.  This was found by the zero-residue write-path test, which
-- runs the real chain as a signed-in admin inside a rolled-back transaction.
--
-- WHAT IT DOES
--
-- Replaces the function with the same body, with the audit insert writing an
-- empty object instead of NULL: a new record genuinely has no previous
-- values, and '{}' is what the column's own DEFAULT says.
--
-- Nothing else changes — same signature, same return type, same
-- SECURITY DEFINER / search_path, same behaviour everywhere else.
--
-- Idempotent: safe to re-run.
-- Reversible: 20260929_08_record_draft_create_audit_fix.rollback.sql
-- ============================================================================

begin;

create or replace function public.record_draft_create(
  p_form_code text,
  p_form_data jsonb,
  p_form_name text default null,
  p_section integer default null,
  p_section_name text default null,
  p_frequency text default null
)
returns records
language plpgsql security definer set search_path = '' as $$
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
$$;

commit;
