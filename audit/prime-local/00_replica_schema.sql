-- ============================================================================
-- prime-local/00_replica_schema.sql — TEST-ONLY scaffolding (never production)
--
-- Recreates a minimal-but-faithful replica of the live QBase production schema
-- (17 tables, all live columns per backup manifest 2026-09-29-prime-2) plus the
-- Supabase shims (auth schema + anon/authenticated roles + request.jwt claims)
-- so the Prime migrations can be applied and their authorization behavior
-- verified on an isolated local Postgres. NO production data is loaded here —
-- only synthetic fixtures created by verify.sql.
-- ============================================================================
-- (run as the cluster superuser "postgres")

-- ── Supabase-compatible roles & auth shim ───────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
end $$;

-- auth.uid() from the GUC Supabase/PostgREST sets per request.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Minimal auth.users replica: self_provision_profile derives the caller's
-- email from auth.users exactly as the production spine does.
create table if not exists auth.users (
  id uuid primary key,
  email text
);
do $$ begin
  if not exists (select 1 from pg_tables where schemaname = 'auth' and tablename = 'users') then
    create table auth.users (id uuid primary key, email text);
  end if;
end $$;
insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111', 'admin@fixture.test'),
 ('22222222-2222-2222-2222-222222222222', 'head.sales@fixture.test'),
 ('33333333-3333-3333-3333-333333333333', 'head.hr@fixture.test'),
 ('44444444-4444-4444-4444-444444444444', 'emp.sales@fixture.test'),
 ('55555555-5555-5555-5555-555555555555', 'emp.hr@fixture.test'),
 ('66666666-6666-6666-6666-666666666666', 'norole@fixture.test'),
 ('77777777-7777-7777-7777-777777777777', 'new.user@fixture.test')
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated;

-- ── 17 tables, live column lists (from prime-2 backup manifest) ─────────────
do $$ begin
  create type record_status_enum as enum ('draft', 'pending_review', 'approved', 'rejected');
exception when duplicate_object then null;  -- idempotent re-runs
end $$;

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  form_code text not null,
  serial text not null,
  form_name text default '',
  form_data jsonb not null default '{}'::jsonb,
  status record_status_enum not null default 'draft',
  created_by text default '',
  last_modified_by text default '',
  edit_count integer not null default 0,
  modification_reason text default '',
  section integer,
  section_name text default '',
  frequency text default '',
  deleted_at timestamptz,
  project_id uuid
);
create unique index if not exists records_serial_key on public.records (serial);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  record_id uuid,
  action text not null,
  changed_fields jsonb,
  previous_values jsonb,
  new_values jsonb,
  performed_by text,
  created_at timestamptz not null default now(),
  action_type text,
  form_code text,
  serial text,
  user_email text
);

create table if not exists public.capas (
  id uuid primary key default gen_random_uuid(),
  capa_id text,
  source_of_capa text,
  type text,
  description text,
  reference text,
  root_cause_analysis text,
  corrective_action text,
  preventive_action text,
  responsible_person text,
  target_completion_date date,
  status text,
  related_risk text,
  effectiveness text,
  verification_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  risk_id text,
  process_department text,
  risk_description text,
  cause text,
  likelihood text,
  impact text,
  risk_score integer,
  action_control text,
  owner text,
  status text,
  review_date date,
  linked_capa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  process_id text,
  process_name text,
  category text,
  owner text,
  inputs text,
  outputs text,
  resources text,
  competence_needed text,
  controls text,
  effectiveness text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.process_interactions (
  id uuid primary key default gen_random_uuid(),
  source_process_id uuid,
  target_process_id uuid,
  interaction_type text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text,
  display_name text,
  password text,                         -- live column exists; app never reads it
  is_active boolean default true,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  department text
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  role text not null,
  created_at timestamptz not null default now(),
  department text
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  message text,
  type text,
  link text,
  data jsonb,
  read boolean default false,
  created_by text,
  created_at timestamptz not null default now(),
  category text,
  priority text,
  event_type text,
  actor_id text,
  target_id text
);

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  company_logo_url text,
  theme_color text,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()  -- replica detail for 'order by created_at limit 1'
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  status text,
  start_date date,
  team_allocation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_metadata (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now()
  -- dead table per audit; identity-only columns are sufficient for RLS tests
);
create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid()
);
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid()
);
-- error_reports: full production shape (audit/schema-parity-report.json, and
-- the generated types.ts:426 mirror it) — the bare-stub here previously
-- existed only for the fail-closed RLS checks. Extended for the D7
-- error_reports UI hook (prime migration 06) which writes the real columns.
create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  version text,
  user_email text,
  page_url text,
  error_message text,
  error_stack text,
  context jsonb,
  browser_info jsonb,
  created_at timestamptz,
  resolved boolean,
  resolved_at timestamptz,
  resolution_notes text
);
create table if not exists public.swot_items (
  id uuid primary key default gen_random_uuid()
);
create table if not exists public.swot_strategies (
  id uuid primary key default gen_random_uuid()
);

-- ── baseline RLS mirrors ────────────────────────────────────────────────────
-- RLS enabled on the tables the legacy migrations claim; the baseline *policies*
-- that Prime 01 narrows (e.g. audit_log_insert_authenticated WITH CHECK(true),
-- permissive processes/risks/capas inserts) are applied below so verify.sql can
-- PROVE that Prime 01 narrows them rather than assuming.
alter table public.records enable row level security;
alter table public.audit_log enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.notifications enable row level security;

drop policy if exists audit_log_insert_authenticated on public.audit_log;
create policy audit_log_insert_authenticated on public.audit_log
  for insert to authenticated with check (true);            -- legacy claimed policy
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (true);                 -- reads kept broad in replica
drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin on public.profiles
  for select to authenticated using (true);                 -- replica-simplification: see README note
drop policy if exists user_roles_read_own_or_admin on public.user_roles;
create policy user_roles_read_own_or_admin on public.user_roles
  for select to authenticated using (true);
drop policy if exists records_select_authenticated on public.records;
create policy records_select_authenticated on public.records
  for select to authenticated using (true);	-- live records are readable in-app