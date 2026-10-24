-- ============================================================================
-- Prime migration 11 — The records table was still world-readable
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-23
-- ============================================================================
--
-- The problem
-- -----------
-- Migration 10 removed the legacy blanket policies from six tables and
-- listed `records` under "What is NOT changed — untouched".  That left the
-- one table the whole application is built on with this:
--
--   select policyname, cmd, qual
--     from pg_policies where tablename = 'records';
--
--   records_read_dept_or_owner     SELECT  (deleted_at IS NULL) AND (is_admin() OR …)
--   records_read                   SELECT  true          <-- blanket
--   "Authenticated users can read
--    records"                      SELECT  true          <-- blanket
--
-- Postgres ORs the PERMISSIVE policies of a table together, so a single
-- `USING (true)` policy decides the whole table: EVERY signed-in user read
-- EVERY record, in every department.  The two blanket policies made the
-- department/owner rule dead code — and that rule was broken as well:
--
--   ((section)::text = current_user_department())
--
-- `records.section` is an INTEGER (0–7) and `current_user_department()`
-- returns a text department ('HR', 'Sales', …), so the comparison could
-- never be true.  The only part of the rule that ever fired was
--
--   OR (section IS NULL)
--
-- which is what let the 31 rows with no section through to everyone.
--
-- So the intended rule ("your department, your own records, or admin")
-- was never in force.  The 191 HR rows (F/28–F/44, section 5) were
-- readable by any account, including the one plain 'user' role account.
--
-- The fix
-- -------
--   * The two blanket SELECT policies are dropped.
--   * records_read_dept_or_owner is recreated with a predicate that can
--     actually work:
--       - prime_is_manager_or_admin()  — admins, managers and dept heads
--         keep the full register (this is what the application expects of
--         them: the archive, the register, the audit trail).
--       - created_by = auth.uid()       — your own records.
--       - prime_record_department(form_code) = current_user_department()
--         — your department's records.  `records` has no `department`
--         column; the department of a record is derived from its form
--         code, exactly as the client does (src/services/recordStorage.ts
--         FORM_DEPT_MAP), so the policy and the application can no longer
--         disagree about which department owns a form.
--   * `section IS NULL` is gone: a row with no section is not a row
--     everybody may read.
--   * prime_record_department gains 'F/49' (Document Master List, section
--     7 — Management & Documentation), which the client's FORM_DEPT_MAP
--     also gained.  Without it a F/49 record resolved to no department at
--     all and belonged to nobody.
--
-- What this changes for the accounts that exist
-- ---------------------------------------------
--   user_roles in the restored copy:
--     admin     × 3   (c634003e…, 8f5fd452…, 2967e3a8…)
--     dept_head × 2   (a90d6520…, eabcebc3…)
--     user      × 1   (e8c46543…)
--
--   * admins and dept heads: unchanged — they read the whole register
--     through prime_is_manager_or_admin().
--   * the plain 'user' account: it now sees only the records it created
--     plus the records of the department it is assigned to.  No account
--     has a department set (user_roles.department is NULL for all six),
--     so today that account sees only its own rows.  The record list is
--     therefore no longer a way for it to read the HR register.
--
--   Assigning a department makes the rule bite:
--
--     update public.user_roles set department = 'HR'
--      where user_id = '<the account>';
--
--   No table data is read or written by this migration, and no privilege
--   changes: the policies only decide which rows a SELECT returns.
--
-- Idempotency
-- -----------
-- Every statement is DROP POLICY IF EXISTS / CREATE OR REPLACE; re-running
-- changes nothing.
--
-- Rollback: 20261023_11_records_read_policy.rollback.sql
-- ============================================================================

begin;
set local search_path = public, pg_catalog;

-- ── 1. The form → department map ───────────────────────────────────────────
-- F/49 (Document Master List) was missing on both sides: the client's
-- FORM_DEPT_MAP and this function.  The function is the authority the
-- row-level policy below uses, so it has to know every form.
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
    when 'F/49' then 'Management'
    else null end;
$$;

-- ── 2. The blanket read policies go ───────────────────────────────────────
-- Either of these on its own decides the table: permissive policies are
-- OR-ed, and both say `USING (true)`.
drop policy if exists records_read on public.records;
drop policy if exists "Authenticated users can read records" on public.records;

-- ── 3. The one policy that decides ────────────────────────────────────────
drop policy if exists records_read_dept_or_owner on public.records;

create policy records_read_dept_or_owner
  on public.records
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      prime_is_manager_or_admin()
      or created_by = (auth.uid())::text
      or prime_record_department(form_code) = current_user_department()
    )
  );

commit;
