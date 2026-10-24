-- ============================================================================
-- Prime migration 18 — who created the record
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-24
-- ============================================================================
--
-- The problem
-- -----------
-- `create_record_validated` — the RPC the direct create path and the import
-- path call — takes its author as `p_created_by uuid`, and the CLIENT sends
-- an E-MAIL in that parameter:
--
--   src/services/recordStorage.ts
--     const currentUser = await getCurrentUserId();   // user.email || user.id
--     ...
--     p_created_by: String(data._createdBy ?? ''),     // the e-mail
--
-- So every call raised:
--
--     invalid input syntax for type uuid: "someone@example.com"
--
-- and NO record could be created through that path.  The import path wrote
-- one row at a time through this same function, so an import wrote nothing
-- either.  (The create path in the UI is a different one: the draft flow
-- calls `record_draft_create`, which stamps the author itself and works.)
--
-- The deeper problem is that the two paths disagreed about what
-- `records.created_by` holds:
--
--   * `records.created_by` is TEXT, and the register holds a person's name
--     (34 rows), an e-mail (1) and a uuid (14) in it — the column is
--     free-form;
--   * `record_draft_create` — the path the UI actually uses — stamps the
--     actor's E-MAIL:
--         created_by = coalesce(v_actor_email, auth.uid()::text)
--   * the read policy matches the e-mail:
--         created_by = auth.uid()::text OR created_by = prime_current_user_email()
--   * the app compares the e-mail in the client too:
--         src/pages/Index.tsx  — r._createdBy === user.email
--
-- The fix
-- -------
-- The author is resolved BY THE SERVER, from the session — exactly as the
-- draft path does — and the e-mail is stored, so the register shows a name
-- and the policies match it:
--
--   v_created_by := coalesce(
--     (select prof.email from public.profiles prof where prof.user_id = auth.uid() limit 1),
--     p_created_by::text,
--     auth.uid()::text
--   );
--
-- The signature is UNCHANGED (`p_created_by uuid`), so PostgREST's overload
-- resolution is untouched, and the client now sends the account's uuid
-- rather than its e-mail — the value the parameter has always wanted.
--
-- A client can no longer forge the author either: the e-mail comes from
-- the session, not from the payload.
--
-- The UPDATE policy is widened by the same e-mail branch the read policy
-- already has.  Without it, a manager (who may create records, but is not
-- an admin) would lose the right to update the records they created the
-- moment their author was stored as an e-mail instead of a uuid.  The
-- policy is widened, never narrowed: the uuid branch stays, so the 14
-- legacy rows that carry a uuid keep working.
--
-- Zero Data Loss: this migration changes a function body and a policy.  It
-- touches NO row, deletes nothing, and rewrites no existing author.
-- ============================================================================
begin;

-- ── 1. the create RPC, with the author resolved from the session ────────
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

-- ── 2. the UPDATE policy, widened by the e-mail branch ───────────────────
-- The read policy has had `created_by = prime_current_user_email()` all
-- along; the update policy only had the uuid branch.  With the author
-- stored as an e-mail, a manager could create a record and then not update
-- it.  The uuid branch stays, so the legacy rows that carry a uuid keep
-- their owner's rights.
drop policy if exists records_update_owner_or_admin on public.records;

create policy records_update_owner_or_admin on public.records
  for update to authenticated
  using (
    deleted_at is null
    and (
      is_admin()
      or created_by = (auth.uid())::text
      or created_by = prime_current_user_email()
    )
  )
  with check (deleted_at is null);

commit;
