-- ============================================================================
-- QBase — rollback of 20260929_08_record_draft_create_audit_fix.sql
--
-- Restores public.record_draft_create exactly as
-- 20260929_03_record_drafts.sql created it, i.e. with the explicit
-- `null::jsonb` in the audit insert.
--
-- WARNING — the pre-fix body is BROKEN: public.audit_log.previous_values is
-- NOT NULL, so the audit insert raises and the whole function rolls back.
-- The server-side draft creation path cannot create a record while this
-- rollback is in place.  Only roll back to revert the change deliberately
-- (for example to bisect it), never to "fix" a failing create.
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
     null::jsonb,
     jsonb_build_object('form_data', coalesce(p_form_data, '{}'::jsonb)),
     -- performed_by is the stable profile email (server-derived), matching
     -- the other engine paths (Prime §15).
     coalesce(v_actor_email, auth.uid()::text),
     'workflow', p_form_code, v_created.serial);

  return v_created;
end;
$$;

commit;
