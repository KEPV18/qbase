-- ============================================================================
-- Prime migration 11 — ROLLBACK
-- Restores the record read policies exactly as they were before
-- 20261023_11_records_read_policy.sql.
--
-- WARNING: this puts back the world-readable state.  `records_read` and
-- "Authenticated users can read records" are `USING (true)`, so every
-- signed-in user can read every record in every department again, and the
-- department clause of records_read_dept_or_owner compares an integer
-- `section` against a text department, so it never fires.
--
-- Rollback of 20261023_11_records_read_policy.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- The two blanket policies, exactly as they were.
drop policy if exists records_read_dept_or_owner on public.records;

create policy records_read_dept_or_owner
  on public.records
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      is_admin()
      or created_by = (auth.uid())::text
      or (section)::text = current_user_department()
      or section is null
    )
  );

create policy records_read
  on public.records
  for select
  to authenticated
  using (true);

create policy "Authenticated users can read records"
  on public.records
  for select
  to authenticated
  using (true);

-- The form → department map without F/49, as it was.
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

commit;
