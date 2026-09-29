-- ============================================================================
-- prime-local/verify.sql — TEST-ONLY assertion battery (never production)
--
-- Prerequisite: 00_replica_schema.sql + prime migrations 01/02 applied by
-- verify.sh. Every test runs in a transaction that is ALWAYS rolled back (no
-- fixtures survive), so the battery is re-runnable. Fixture data is synthetic.
-- Exit protocol: final assertion raises if ANY check failed ⇒ psql -v
-- ON_ERROR_STOP exits non-zero.
-- ============================================================================
\set ON_ERROR_STOP on

-- ══ fixtures (bypassing RLS as superuser) ════════════════════════════════════
delete from public.user_roles; delete from public.profiles;
delete from public.record_versions; delete from public.audit_log;
delete from public.records; delete from public.tenant_settings;
delete from public.error_reports;

insert into public.profiles (user_id, email, display_name, department) values
 ('11111111-1111-1111-1111-111111111111', 'admin@fixture.test',       'Admin Fixture',       'Sales'),
 ('22222222-2222-2222-2222-222222222222', 'head.sales@fixture.test',  'Head Sales Fixture',  'Sales'),
 ('33333333-3333-3333-3333-333333333333', 'head.hr@fixture.test',     'Head HR Fixture',     'HR'),
 ('44444444-4444-4444-4444-444444444444', 'emp.sales@fixture.test',   'Emp Sales Fixture',   'Sales'),
 ('55555555-5555-5555-5555-555555555555', 'emp.hr@fixture.test',      'Emp HR Fixture',      'HR'),
 ('66666666-6666-6666-6666-666666666666', 'norole@fixture.test',      'No Role Fixture',     'HR');

insert into public.user_roles (user_id, role, department) values
 ('11111111-1111-1111-1111-111111111111', 'admin',      'Sales'),
 ('22222222-2222-2222-2222-222222222222', 'dept_head',  'Sales'),
 ('33333333-3333-3333-3333-333333333333', 'dept_head',  'HR'),
 ('44444444-4444-4444-4444-444444444444', 'employee',   'Sales'),
 ('55555555-5555-5555-5555-555555555555', 'employee',   'HR');

insert into public.records (id, form_code, serial, status, edit_count, created_by, form_data, deleted_at) values
 ('aaaaaaaa-0000-0000-0000-000000000001', 'F/09', 'F/09-001', 'draft',          0, 'emp.sales@fixture.test', '{"field_a":"old_a"}', null),
 ('aaaaaaaa-0000-0000-0000-000000000002', 'F/09', 'F/09-002', 'pending_review', 0, 'emp.sales@fixture.test', '{"field_a":"old_b"}', null),
 ('aaaaaaaa-0000-0000-0000-000000000003', 'F/17', 'F/17-001', 'draft',          0, 'emp.sales@fixture.test', '{"field_c":"cross_dept"}', null),
 ('aaaaaaaa-0000-0000-0000-000000000004', 'F/09', 'F/09-004', 'approved',       1, 'emp.sales@fixture.test', '{"field_a":"archived"}', now());

insert into public.tenant_settings (company_name) values ('Fixture Co');
insert into public.error_reports (id) values ('aaaaaaaa-9999-0000-0000-000000000001');

-- CAPA fixtures (Prime D6): deterministic closure-rate/overdue math.
-- delete-first for re-runnability (no production: throwaway cluster only).
delete from public.capas;
insert into public.capas (id, capa_id, source_of_capa, type, description, root_cause_analysis, target_completion_date, status) values
 ('bbbbbbbb-0000-0000-0000-000000000001', 'CAPA-99-001', 'Fixture', 'Corrective', 'closed  cap',  'fixture', '2026-01-10', 'Closed'),
 ('bbbbbbbb-0000-0000-0000-000000000002', 'CAPA-99-002', 'Fixture', 'Corrective', 'overdue open', 'fixture', current_date - 1, 'Open'),
 ('bbbbbbbb-0000-0000-0000-000000000003', 'CAPA-99-003', 'Fixture', 'Preventive', 'future open',  'fixture', current_date + 30, 'Open'),
 ('bbbbbbbb-0000-0000-0000-000000000004', 'CAPA-99-004', 'Fixture', 'Corrective', 'no date ip',   'fixture', null, 'In Progress'),
 ('bbbbbbbb-0000-0000-0000-000000000005', 'CAPA-99-005', 'Fixture', 'Preventive', 'overdue uv',   'fixture', current_date - 2, 'Under Verification');

-- ══ verdict pipeline ═════════════════════════════════════════════════════════
-- dblink loopback target for record_result (see below). The extension is
-- created OUTSIDE any explicit transaction ⇒ committed immediately, before
-- any impersonation begins. public.dblink_connstr (with the per-run random
-- loopback password) is created by verify.sh's bootstrap_loopback step.
create extension if not exists dblink with schema public;
drop table if exists public.verify_results;
create table public.verify_results (name text, ok boolean, detail text);
-- Only the loopback's verify_writer role records verdicts; the report section
-- reads it back as postgres.
grant insert on public.verify_results to verify_writer;
grant select on public.verify_results, public.dblink_connstr to public;

-- ══ results table + helpers ══════════════════════════════════════════════════
create temp table test_results (name text, ok boolean, detail text);

-- Temp objects are owned by the session's login user (postgres); when tests
-- impersonate anon/authenticated those roles must be able to record results.
grant all on pg_temp.test_results to anon, authenticated;

-- ROLLBACK-SURVIVING RECORDING. Each check runs inside its own
-- `begin; … rollback;` transaction so fixtures never bleed between checks —
-- but that rollback also discards any INSERT into test_results made inside
-- the check. Verdicts therefore travel over a dblink LOOPBACK connection,
-- whose transaction is independent of the caller's: the insert commits
-- immediately on the loopback and survives the local rollback. Unlike a
-- superuser-only COPY … TO PROGRAM, dblink_exec is callable by every
-- impersonated role, so the impersonation is never disturbed mid-block —
-- resetting roles here would silently let later same-block checks run as
-- superuser and bypass RLS (that failure mode produced vacuous passes).
create or replace function pg_temp.record_result(p_name text, p_ok boolean, p_detail text)
returns void language plpgsql as $$
declare v_conn text;
begin
  -- The loopback connstring (with its per-run random password) is injected by
  -- verify.sh's bootstrap_loopback into public.dblink_connstr; it is never
  -- stored in source. Reading it here keeps record_result callable by every
  -- impersonated role — no role switching mid-block, so multi-check blocks
  -- keep testing under the role they set.
  select connstr into v_conn from public.dblink_connstr limit 1;
  perform dblink_exec(v_conn,
    format('insert into public.verify_results values (%L, %s, %L)',
           p_name,
           case when p_ok then 'true' else 'false' end,
           p_detail));
end $$;

-- expect_error: statement must fail with EXACTLY the given SQLSTATE.
create or replace function pg_temp.expect_error(p_name text, p_sqlstate text, p_sql text)
returns void language plpgsql as $$
declare st text; msg text;
begin
  execute p_sql;
  perform pg_temp.record_result(p_name, false, 'expected error ' || p_sqlstate || ' but statement succeeded');
exception when others then
  get stacked diagnostics st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
  if st = p_sqlstate then
    perform pg_temp.record_result(p_name, true, 'denied as expected (' || msg || ')');
  else
    perform pg_temp.record_result(p_name, false, 'wrong error: expected ' || p_sqlstate || ' got ' || st || ' — ' || msg);
  end if;
end $$;

-- expect_ok: statement must succeed.
create or replace function pg_temp.expect_ok(p_name text, p_sql text)
returns void language plpgsql as $$
declare st text; msg text;
begin
  execute p_sql;
  perform pg_temp.record_result(p_name, true, 'succeeded as expected');
exception when others then
  get stacked diagnostics st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
  perform pg_temp.record_result(p_name, false, 'expected success, got ' || st || ' — ' || msg);
end $$;

-- expect_untouched: statement must succeed with 0 rows affected. RLS
-- using(false) policies silently FILTER update/delete targets (no error), so
-- immutability is observed via row-count = 0.
create or replace function pg_temp.expect_untouched(p_name text, p_sql text)
returns void language plpgsql as $$
declare rc bigint := 0; st text; msg text;
begin
  execute p_sql;
  get diagnostics rc = row_count;
  if rc = 0 then
    perform pg_temp.record_result(p_name, true, 'no rows affected (filtered as expected)');
  else
    perform pg_temp.record_result(p_name, false, 'rows affected: ' || rc);
  end if;
exception when others then
  get stacked diagnostics st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
  perform pg_temp.record_result(p_name, false, 'unexpected error ' || st || ' — ' || msg);
end $$;

-- ══ A. Authorization spine ═══════════════════════════════════════════════════
begin;
  select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  do $$ begin
    if public.prime_is_admin() then
      perform pg_temp.record_result ('A1 admin prime_is_admin=true', true, 'true');
    else
      perform pg_temp.record_result ('A1 admin prime_is_admin=true', false, 'returned false');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  do $$ begin
    if public.prime_is_admin() then
      perform pg_temp.record_result ('A2 employee prime_is_admin=false', false, 'returned true for employee');
    else
      perform pg_temp.record_result ('A2 employee prime_is_admin=false', true, 'false');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('A3 employee cannot upsert role', '42501',
    $$select public.admin_upsert_user_role('44444444-4444-4444-4444-444444444444'::uuid, 'admin')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  select pg_temp.expect_ok('A4 admin assigns employee role',
    $$select public.admin_upsert_user_role('44444444-4444-4444-4444-444444444444'::uuid, 'dept_head')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  select pg_temp.expect_error('A5 invalid role rejected', '22P02',
    $$select public.admin_upsert_user_role('44444444-4444-4444-4444-444444444444'::uuid, 'superadmin')$$);
rollback;

begin;
  set local role anon;
  select pg_temp.expect_error('A6 anon cannot call admin_upsert_user_role', '42501',
    $$select public.admin_upsert_user_role('44444444-4444-4444-4444-444444444444'::uuid, 'admin')$$);
rollback;

begin;
  set local role authenticated;
  -- No jwt claim → auth.uid() null; a session with no derived role is refused.
  select pg_temp.expect_error('A7 session without role cannot transition', '42501',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'pending_review')$$);
rollback;

-- A8: authenticated session whose user has NO user_roles row → fail closed
-- (exercises the 'Insufficient role: no role assigned' branch, distinct from
-- the unauthenticated C6 path).
begin;
  select set_config('request.jwt.claim.sub','66666666-6666-6666-6666-666666666666', true);
  set local role authenticated;
  select pg_temp.expect_error('A8 role-less session cannot transition', '42501',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'pending_review')$$);
rollback;

-- A9: self-provisioning creates the caller's OWN profile, email derived from
-- auth.users (never client-asserted).
begin;
  select set_config('request.jwt.claim.sub','77777777-7777-7777-7777-777777777777', true);
  set local role authenticated;
  select pg_temp.expect_ok('A9 self-provision profile',
    $$select public.self_provision_profile('New User Fixture', 'Sales')$$);
  do $$ begin
    if (select email from public.profiles where user_id = '77777777-7777-7777-7777-777777777777'::uuid) <> 'new.user@fixture.test' then
      perform pg_temp.record_result ('A10 self-provision derives email from auth.users', false, 'email mismatch/null');
    elsif (select display_name from public.profiles where user_id = '77777777-7777-7777-7777-777777777777'::uuid) <> 'New User Fixture' then
      perform pg_temp.record_result ('A10 self-provision derives email from auth.users', false, 'display_name mismatch');
    else
      perform pg_temp.record_result ('A10 self-provision derives email from auth.users', true, 'new.user@fixture.test');
    end if;
  end $$;
rollback;

begin;
  set local role anon;
  select pg_temp.expect_error('A11 anon cannot self-provision', '42501',
    $$select public.self_provision_profile('Anon Fixture')$$);
rollback;

-- ══ B. Audit immutability ════════════════════════════════════════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('B1 direct audit_log INSERT denied', '42501',
    $$insert into public.audit_log (action) values ('forged')$$);
rollback;

-- B2/B3: seed one real audit row via the server RPC first (an empty table
-- would make "0 rows affected" vacuously true).
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select public.audit_log_server_append('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'seed', null, null, null, 'F/09', 'F/09-001');
  select pg_temp.expect_untouched('B2 audit_log UPDATE filters to 0 rows',
    $$update public.audit_log set action = 'forged'$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  select public.audit_log_server_append('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'seed', null, null, null, 'F/09', 'F/09-001');
  select pg_temp.expect_untouched('B3 audit_log DELETE filters to 0 rows (even admin)',
    $$delete from public.audit_log$$);
rollback;

-- B4/B5: server append derives the actor from auth.uid() (no actor parameter).
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_ok('B4 audit_log_server_append by authenticated user',
    $$select public.audit_log_server_append('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'test', null, null, null, 'F/09', 'F/09-001')$$);
  do $$ begin
    if (select performed_by from public.audit_log order by created_at desc limit 1) <> 'emp.sales@fixture.test' then
      perform pg_temp.record_result ('B5 audit derives actor from auth.uid()', false,
        'performed_by=' || coalesce((select performed_by from public.audit_log order by created_at desc limit 1), 'null'));
    else
      perform pg_temp.record_result ('B5 audit derives actor from auth.uid()', true, 'emp.sales@fixture.test');
    end if;
  end $$;
rollback;

begin;
  set local role anon;
  select pg_temp.expect_error('B6 anon cannot call audit_log_server_append', '42501',
    $$select public.audit_log_server_append('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'test')$$);
rollback;

-- ══ C. Workflow transitions ══════════════════════════════════════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_ok('C1 employee submits draft→pending_review',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'pending_review')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', true);
  set local role authenticated;
  select pg_temp.expect_error('C2 HR head cannot approve Sales record', '42501',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'approved')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_ok('C3 Sales head approves Sales record',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'approved')$$);
rollback;

begin;
  update public.records set status = 'approved' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_error('C4 invalid transition approved→pending_review', '23514',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'pending_review')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('C5 employee cannot approve', '42501',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'approved')$$);
rollback;

begin;
  set local role authenticated;
  select pg_temp.expect_error('C6 unauthenticated record_transition denied', '42501',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'approved')$$);
rollback;

begin;
  update public.records set status = 'approved' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_ok('C7 owning dept_head reopens approved→draft',
    $$select public.record_transition('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'draft')$$);
rollback;

-- ══ D. Versioned updates (record 0002 is pending_review ⇒ snapshot pre-save) ═
begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_ok('D1 owning dept_head versioned update',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"new_b"}'::jsonb, 0)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  do $$ begin
    perform public.update_record_versioned(
      'aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"new_b"}'::jsonb, 0);
  end $$;
  do $$ begin
    if (select count(*) from public.record_versions
         where record_id = 'aaaaaaaa-0000-0000-0000-000000000002'::uuid and version = 1) <> 1 then
      perform pg_temp.record_result ('D2 version snapshot pre-save', false, 'snapshot v1 missing');
    elsif (select form_data->>'field_a' from public.record_versions
            where record_id = 'aaaaaaaa-0000-0000-0000-000000000002'::uuid and version = 1) <> 'old_b' then
      perform pg_temp.record_result ('D2 version snapshot pre-save', false, 'v1 does not hold pre-save form_data');
    else
      perform pg_temp.record_result ('D2 version snapshot pre-save', true, 'v1 holds old_b');
    end if;
    if (select count(*) from public.audit_log
         where record_id = 'aaaaaaaa-0000-0000-0000-000000000002'::uuid and action = 'update') <> 1 then
      perform pg_temp.record_result ('D3 update audited', false, 'no audit row');
    else
      perform pg_temp.record_result ('D3 update audited', true, '1 row');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_error('D4 stale edit_count conflict', '23509',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"x"}'::jsonb, 5)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', true);
  set local role authenticated;
  select pg_temp.expect_error('D5 cross-department edit denied', '42501',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000003'::uuid, '{"field_c":"evil"}'::jsonb, 0)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('D6 employee edits non-draft denied', '42501',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"evil"}'::jsonb, 0)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_error('D7 non-draft update without conflict check refused', '23509',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"x"}'::jsonb)$$);
rollback;

-- D8: legacy self-provisioned class 'user' is employee-class (draft-only) —
-- editing a submitted record is denied, never silently allowed.
begin;
  insert into public.user_roles (user_id, role, department)
    values ('77777777-7777-7777-7777-777777777777', 'user', 'Sales');
  select set_config('request.jwt.claim.sub','77777777-7777-7777-7777-777777777777', true);
  set local role authenticated;
  select pg_temp.expect_error('D8 legacy user-role edits non-draft denied', '42501',
    $$select public.update_record_versioned('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"escalated"}'::jsonb, 0)$$);
rollback;

-- ══ E. Drafts (record 0001: draft, created_by emp.sales) ═════════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_ok('E1 creator autosaves own draft',
    $$select public.record_draft_autosave('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '{"field_a":"draft_saved"}'::jsonb)$$);
  do $$ begin
    if (select edit_count from public.records where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 0 then
      perform pg_temp.record_result ('E2 draft autosave keeps edit_count', false, 'bumped');
    else
      perform pg_temp.record_result ('E2 draft autosave keeps edit_count', true, '0');
    end if;
    if (select count(*) from public.record_versions where record_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid) <> 0 then
      perform pg_temp.record_result ('E3 draft autosave creates no version', false, 'snapshot created');
    else
      perform pg_temp.record_result ('E3 draft autosave creates no version', true, 'none');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('E4 autosave refused on non-draft', '23514',
    $$select public.record_draft_autosave('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '{"field_a":"drift"}'::jsonb)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555', true);
  set local role authenticated;
  select pg_temp.expect_error('E5 other-user draft autosave denied', '42501',
    $$select public.record_draft_autosave('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '{"field_a":"hijack"}'::jsonb)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_ok('E6 creator discards own draft',
    $$select public.record_discard_draft('aaaaaaaa-0000-0000-0000-000000000001'::uuid)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('E7 discard refused on submitted record', '23514',
    $$select public.record_discard_draft('aaaaaaaa-0000-0000-0000-000000000002'::uuid)$$);
rollback;

-- ══ F. Tenant settings ═══════════════════════════════════════════════════════
begin;
  set local role anon;
  select pg_temp.expect_ok('F1 anon reads tenant settings',
    $$select count(*) from public.tenant_settings$$);
  select pg_temp.expect_error('F2 anon cannot insert tenant settings', '42501',
    $$insert into public.tenant_settings (company_name) values ('Evil Co')$$);
  select pg_temp.expect_error('F3 anon cannot manage settings via RPC', '42501',
    $$select public.admin_upsert_tenant_settings('Evil Co')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_ok('F4 dept_head manages tenant settings',
    $$select public.admin_upsert_tenant_settings('Fixture Co v2')$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('F5 employee denied tenant settings write', '42501',
    $$select public.admin_upsert_tenant_settings('Evil Co')$$);
rollback;

-- ══ G. Fail-closed on dead tables (row-visibility via RLS) ══════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  do $$ begin
    if (select count(*) from public.error_reports) <> 0 then
      perform pg_temp.record_result ('G1 employee sees 0 rows of error_reports', false, 'rows visible');
    else
      perform pg_temp.record_result ('G1 employee sees 0 rows of error_reports', true, 'filtered');
    end if;
  end $$;
  select pg_temp.expect_error('G2 employee cannot insert swot_items', '42501',
    $$insert into public.swot_items default values$$);
  set local role anon;
  do $$ begin
    if (select count(*) from public.error_reports) <> 0 then
      perform pg_temp.record_result ('G4 anon sees 0 rows of error_reports', false, 'rows visible');
    else
      perform pg_temp.record_result ('G4 anon sees 0 rows of error_reports', true, '0');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  do $$ begin
    if (select count(*) from public.error_reports) = 1 then
      perform pg_temp.record_result ('G3 dept_head (manager class) reads error_reports', true, '1 row visible');
    else
      perform pg_temp.record_result ('G3 dept_head (manager class) reads error_reports', false,
        'count=' || (select count(*) from public.error_reports));
    end if;
  end $$;
rollback;

-- ══ H. records hard DELETE (soft-delete RPC path stays) ══════════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_untouched('H1 employee hard DELETE filtered to 0 rows',
    $$delete from public.records where id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid$$);
  do $$ begin
    if (select count(*) from public.records where id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid) <> 1 then
      perform pg_temp.record_result ('H2 employee delete preserves record', false, 'row vanished');
    else
      perform pg_temp.record_result ('H2 employee delete preserves record', true, 'row intact');
    end if;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  select pg_temp.expect_ok('H3 admin hard DELETE permitted',
    $$delete from public.records where id = 'aaaaaaaa-0000-0000-0000-000000000003'::uuid$$);
rollback;

-- ══ I. Archive restore (Prime §6 — record_restore) ══════════════════════════
begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  select pg_temp.expect_error('I1 employee restore denied', '42501',
    $$select public.record_restore('aaaaaaaa-0000-0000-0000-000000000004'::uuid)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  select pg_temp.expect_ok('I2 owning dept_head restores archived record',
    $$select public.record_restore('aaaaaaaa-0000-0000-0000-000000000004'::uuid)$$);
  do $$ begin
    if (select count(*) from public.audit_log
         where record_id = 'aaaaaaaa-0000-0000-0000-000000000004'::uuid
           and action = 'restore' and performed_by = 'head.sales@fixture.test') <> 1 then
      perform pg_temp.record_result ('I3 restore audited (actor server-derived)', false, 'no/extra audit row or forged actor');
    else
      perform pg_temp.record_result ('I3 restore audited', true, '1 row, actor server-derived');
    end if;
  end $$;
rollback;

-- ══ J. Server-side draft creation (Prime §D4 — record_draft_create) ═════════
-- Fixture recap: F/09 serials F/09-001 .. F/09-004 exist, with F/09-004
-- ARCHIVED (deleted_at set) and F/09-001 an UNFINISHED DRAFT owned by
-- emp.sales — so dept_head (sub 2222, no existing F/09 draft) must receive a
-- NEW draft with serial F/09-005: allocation spans archived rows, and the
-- idempotent resume must NOT return another user's draft.

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  do $$ declare
    v_row public.records;
    v_again public.records;
  begin
    select * into v_row from public.record_draft_create(
      'F/09', '{"field_a":""}'::jsonb, 'Test Form', 9, 'Section Nine', 'Monthly');
    if v_row.status = 'draft'
       and v_row.serial = 'F/09-005'
       and v_row.created_by = 'head.sales@fixture.test'
       and v_row.form_name = 'Test Form'
       and v_row.frequency = 'Monthly' then
      perform pg_temp.record_result ('J1 draft created (server-allocated serial incl. archived, draft status)',
        true, format('serial=%s by=%s', v_row.serial, v_row.created_by));
    else
      perform pg_temp.record_result ('J1 draft created (server-allocated serial incl. archived, draft status)',
        false, format('status=%s serial=%s by=%s', v_row.status, v_row.serial,
                      coalesce(v_row.created_by, 'null')));
    end if;

    -- Idempotent reopen: same (creator, form) returns the SAME draft —
    -- even though the reopened payload differs (reopening resumes content,
    -- it does not fork a second draft).
    select * into v_again from public.record_draft_create('F/09', '{"field_a":"newer"}'::jsonb);
    if v_again.id = v_row.id then
      perform pg_temp.record_result ('J2 reopen resumes own draft (no duplicate)', true, v_again.serial);
    else
      perform pg_temp.record_result ('J2 reopen resumes own draft (no duplicate)', false,
        format('new id %s serial %s', v_again.id, v_again.serial));
    end if;

    if (select count(*) from public.audit_log
         where record_id = v_row.id and action = 'create'
           and performed_by = 'head.sales@fixture.test') = 1 then
      perform pg_temp.record_result ('J3 draft creation audited (actor server-derived)',
        true, '1 row');
    else
      perform pg_temp.record_result ('J3 draft creation audited (actor server-derived)', false,
        format('%s rows', (select count(*) from public.audit_log where record_id = v_row.id)));
    end if;
  end $$;
rollback;

begin;
  set local role anon;
  select pg_temp.expect_error('J4 anon cannot create draft', '42501',
    $$select public.record_draft_create('F/09', '{}'::jsonb)$$);
rollback;

begin;
  select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  do $$ declare
    v_row public.records;
  begin
    select * into v_row from public.record_draft_create('F/17', '{"field_c":""}'::jsonb);
    begin
      perform public.record_transition(v_row.id, 'approved');
      perform pg_temp.record_result ('J5 employee cannot self-approve own draft', false, 'transition succeeded');
    exception when insufficient_privilege then
      perform pg_temp.record_result ('J5 employee cannot self-approve own draft',
        true, 'denied 42501');
    when others then
      perform pg_temp.record_result ('J5 employee cannot self-approve own draft', false,
        'unexpected SQLSTATE ' || SQLSTATE);
    end;
  end $$;
rollback;

begin;
  select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  set local role authenticated;
  do $$ declare
    v_row public.records;
    v_gone integer;
    v_tombstones integer;
    v_recreated public.records;
  begin
    select * into v_row from public.record_draft_create('F/09', '{"field_a":"to_discard"}'::jsonb);
    perform public.record_discard_draft(v_row.id);

    select count(*) into v_gone from public.records where id = v_row.id;
    if v_gone = 0 then
      perform pg_temp.record_result ('J6 own draft discarded (row removed)', true, '0 rows');
    else
      perform pg_temp.record_result ('J6 own draft discarded (row removed)', false,
        format('%s rows remain', v_gone));
    end if;

    select count(*) into v_tombstones from public.audit_log
      where record_id = v_row.id and action = 'discard'
        and performed_by = 'head.sales@fixture.test'
        and serial = v_row.serial;
    if v_tombstones = 1 then
      perform pg_temp.record_result ('J7 discard tombstone audited (no silent loss)', true, '1 row');
    else
      perform pg_temp.record_result ('J7 discard tombstone audited (no silent loss)', false,
        format('%s tombstone rows', v_tombstones));
    end if;

    -- Serial the discard freed is reusable — allocation sees the freed number
    -- only after the hard delete, and the next draft takes it again.
    select * into v_recreated from public.record_draft_create('F/09', '{"field_a":"again"}'::jsonb);
    if v_recreated.id <> v_row.id and v_recreated.serial = 'F/09-005' then
      perform pg_temp.record_result ('J8 reallocation after discard', true, v_recreated.serial);
    else
      perform pg_temp.record_result ('J8 reallocation after discard', false,
        format('serial=%s', v_recreated.serial));
    end if;
  end $$;
rollback;

-- ══ K — dashboard_stats (Prime D6) ═══════════════════════════════════════════
-- ONE RPC computes org-level aggregates. The traceability core (§9): every
-- emitted count equals a plain SQL baseline computed in the same battery, AND
-- equals the deterministic fixture math. Empty register → NULL closure rate
-- (proven via rollback-delete; the client renders "no data", never 0%).
begin;
  do $$ declare v_stats jsonb; begin
    select public.dashboard_stats() into v_stats;
    if v_stats ? 'records_total' and v_stats ? 'capa_closure_rate'
       and v_stats ? 'pending_review_aging' then
      perform pg_temp.record_result ('K1 dashboard_stats shape', true, 'all expected keys present');
    else
      perform pg_temp.record_result ('K1 dashboard_stats shape', false,
        format('keys: %s', (select string_agg(k, ',') from jsonb_object_keys(v_stats) k)));
    end if;
  end $$;
  -- K1b — the granted role (authenticated) can execute it (analogous to the
  -- B-section grant checks; postgres executing it proves nothing about grants).
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  set local role authenticated;
  do $$ declare v_stats jsonb; begin
    select public.dashboard_stats() into v_stats;
    if v_stats ? 'records_total' then
      perform pg_temp.record_result ('K1b authenticated can execute dashboard_stats', true, 'executed');
    else
      perform pg_temp.record_result ('K1b authenticated can execute dashboard_stats', false, 'malformed result');
    end if;
  end $$;
rollback;

-- K2/K3/K4 — every emitted count equals the plain SQL baseline in the same
-- transaction AND the deterministic fixture numbers (3 non-archived records:
-- 2 draft + 1 pending_review, all created "now"; 5 CAPAs: 1 closed, 2 open,
-- closure rate 20%, 2 overdue beyond target date; aging: 1 under 7d).
begin;
  do $$ declare
    v_stats        jsonb;
    v_rec_total    int;
    v_by_status    jsonb;
    v_last30       int;
    v_capa_total   int; v_capa_closed int; v_capa_open int;
    v_capa_rate    int; v_capa_overdue int;
    v_aging        jsonb;
  begin
    select public.dashboard_stats() into v_stats;

    select count(*)::int into v_rec_total from public.records where deleted_at is null;
    select jsonb_build_object(
             'draft',          count(*) filter (where status = 'draft')::int,
             'pending_review', count(*) filter (where status = 'pending_review')::int,
             'approved',       count(*) filter (where status = 'approved')::int,
             'rejected',       count(*) filter (where status = 'rejected')::int)
      into v_by_status from public.records where deleted_at is null;
    select count(*)::int into v_last30 from public.records
      where deleted_at is null and created_at >= now() - interval '30 days';

    select count(*)::int, count(*) filter (where status = 'Closed')::int,
           count(*) filter (where status = 'Open')::int
      into v_capa_total, v_capa_closed, v_capa_open from public.capas;
    select case when count(*) = 0 then null::int
                else round((count(*) filter (where status = 'Closed'))::numeric * 100 / count(*))::int end
      into v_capa_rate from public.capas;
    select count(*)::int into v_capa_overdue from public.capas
      where status <> 'Closed' and target_completion_date is not null
        and target_completion_date < now()::date;

    select jsonb_build_object(
             'under_7d',      count(*) filter (where updated_at >= now() - interval '7 days')::int,
             'from_7_to_30d', count(*) filter (where updated_at < now() - interval '7 days'
                                                 and updated_at >= now() - interval '30 days')::int,
             'over_30d',      count(*) filter (where updated_at < now() - interval '30 days')::int)
      into v_aging from public.records
      where status = 'pending_review' and deleted_at is null;

    if (v_stats->>'records_total')::int            = v_rec_total
       and (v_stats->'records_by_status')          = v_by_status
       and (v_stats->>'records_last_30d')::int     = v_last30
       and (v_stats->>'capa_total')::int           = v_capa_total
       and (v_stats->>'capa_closed')::int          = v_capa_closed
       and (v_stats->>'capa_open')::int            = v_capa_open
       and (v_stats->>'capa_closure_rate')::int is not distinct from v_capa_rate
       and (v_stats->>'capa_overdue')::int         = v_capa_overdue
       and (v_stats->'pending_review_aging')       = v_aging
    then
      perform pg_temp.record_result ('K2 dashboard_stats equals SQL baseline', true,
        format('%s records, rate %s, aging %s', v_stats->>'records_total',
               v_stats->>'capa_closure_rate', v_stats->'pending_review_aging'));
    else
      perform pg_temp.record_result ('K2 dashboard_stats equals SQL baseline', false,
        format('rpc=%s baseline={total=%s,by_status=%s,last30=%s,capa=%s/%s/%s,rate=%s,overdue=%s,aging=%s}',
               v_stats, v_rec_total, v_by_status, v_last30, v_capa_total, v_capa_closed,
               v_capa_open, v_capa_rate, v_capa_overdue, v_aging));
    end if;

    -- Deterministic fixture math (guards a silently-empty baseline).
    if (v_stats->>'records_total')::int = 3
       and (v_stats->'records_by_status'->>'draft')::int = 2
       and (v_stats->>'capa_total')::int = 5
       and (v_stats->>'capa_closure_rate')::int = 20
       and (v_stats->>'capa_overdue')::int = 2
    then
      perform pg_temp.record_result ('K3 fixture math (3 records, 2 draft, 5 CAPAs, rate 20, 2 overdue)', true, 'true');
    else
      perform pg_temp.record_result ('K3 fixture math', false, format('stats=%s', v_stats));
    end if;
  end $$;
rollback;

-- K4 — empty CAPA register must yield a NULL closure rate (no fabricated 0%).
begin;
  delete from public.capas;
  do $$ declare v_stats jsonb; begin
    select public.dashboard_stats() into v_stats;
    if (v_stats->>'capa_total')::int = 0
       and (v_stats->>'capa_closure_rate') is null
    then
      perform pg_temp.record_result ('K4 empty register → closure_rate NULL (no-data, never 0%)', true, 'null');
    else
      perform pg_temp.record_result ('K4 empty register → closure_rate NULL (no-data, never 0%)', false,
        format('total=%s rate=%s', v_stats->>'capa_total', v_stats->>'capa_closure_rate'));
    end if;
  end $$;
rollback;

-- K5 — anon must be refused (revocation discipline: D6 surface is
-- authenticated-only like the rest of the Prime function set).
begin;
  set local role anon;
  select pg_temp.expect_error('K5 anon denied dashboard_stats', '42501',
    $$select public.dashboard_stats()$$);
rollback;

-- ══ report ═══════════════════════════════════════════════════════════════════
-- Load the rollback-proof verdict stream back into test_results, then report.
insert into test_results select name, ok, detail from public.verify_results;
select name, ok, detail from test_results order by name;

do $$ begin
  if not exists (select 1 from pg_temp.test_results) then
    raise exception 'PRIME VERIFY FAILED: 0 checks recorded — battery is vacuous';
  end if;
  if exists (select 1 from pg_temp.test_results where ok = false) then
    raise exception 'PRIME VERIFY FAILED: % failed check(s) of % total',
      (select count(*) from pg_temp.test_results where ok = false),
      (select count(*) from pg_temp.test_results);
  end if;
  raise notice 'PRIME VERIFY: ALL % CHECKS PASSED', (select count(*) from pg_temp.test_results);
end $$;