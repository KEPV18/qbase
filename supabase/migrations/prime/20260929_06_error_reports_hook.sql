-- ============================================================================
-- 20260929_06_error_reports_hook.sql — wire the orphaned error_reports table
-- (Prime §D7: "Wire orphaned real features: error_reports UI hook …")
-- ---------------------------------------------------------------------------
-- error_reports exists in production but NO app code references it — the
-- spine (20260929_01) deliberately left it fail-closed. This migration
-- wires it as a real feature through the Prime pattern (§5: the browser
-- never writes tables directly; §13: server-side checks on every action):
--
--   error_report_submit  — any authenticated user reports a client-side
--                          crash/error. Server-derives user_email from the
--                          JWT (never from the payload); the version and
--                          page URL are client context, sanitized by length.
--   error_report_resolve — manager-or-admin marks a report resolved with
--                          notes; writes one audit_log row (§15 — the
--                          resolution itself is audited, actor server-
--                          derived).
--
-- The table's admin-only INSERT policy (migration 01) is untouched — these
-- SECURITY DEFINER RPCs are the only user-reachable write paths.
--
-- Additive/idempotent: two create-or-replace functions + grants.
-- Rollback: drop function public.error_report_submit(text,text,text,text,
--           jsonb,jsonb); drop function public.error_report_resolve(uuid, text);
-- Verified by the local battery (M-section, verify.sql) on the throwaway
-- test cluster — production is NOT touched here.
-- ============================================================================

create or replace function public.error_report_submit(
  p_error_message text,
  p_error_stack   text default null,
  p_page_url      text default null,
  p_version       text default null,
  p_browser_info  jsonb default null,
  p_context       jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_email     text;
begin
  -- Fail closed: only a signed-in user may report (§13).
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select email into v_email
    from public.profiles where user_id = auth.uid() limit 1;

  -- Sanitize: the client context is free-form, so bound every text field
  -- before it reaches the table (a report must never be a vector for an
  -- oversized payload).
  insert into public.error_reports
    (error_message, error_stack, page_url, version, browser_info,
     context, user_email, resolved)
  values (
    left(p_error_message, 2000),
    left(p_error_stack, 8000),
    left(p_page_url, 500),
    left(p_version, 64),
    p_browser_info,
    p_context,
    coalesce(v_email, auth.uid()::text),
    false
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.error_report_resolve(
  p_report_id uuid,
  p_notes     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_email text;
begin
  -- Server-checked authorization (§13): manager-or-admin only.
  if not public.prime_is_manager_or_admin() then
    raise exception 'Insufficient role: manager or admin required'
      using errcode = '42501';
  end if;

  select email into v_actor_email
    from public.profiles where user_id = auth.uid() limit 1;

  update public.error_reports
     set resolved         = true,
         resolved_at      = now(),
         resolution_notes = left(p_notes, 2000)
   where id = p_report_id
     and coalesce(resolved, false) = false;
  if not found then
    raise exception 'Error report % not found or already resolved', p_report_id
      using errcode = 'P0002';
  end if;

  -- Audit the resolution (§15: server-derived actor; the trail must not be
  -- forgeable, and a resolution must not happen silently).
  insert into public.audit_log
    (record_id, action, changed_fields, previous_values, new_values,
     performed_by, action_type)
  values
    (p_report_id, 'error_report_resolved',
     jsonb_build_object('resolved', true, 'resolution_notes', true),
     jsonb_build_object('resolved', false),
     jsonb_build_object('resolved', true, 'resolution_notes', left(p_notes, 2000)),
     coalesce(v_actor_email, auth.uid()::text),
     'system');
end;
$$;

revoke execute on function public.error_report_submit(text, text, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.error_report_submit(text, text, text, text, jsonb, jsonb)
  to authenticated;
revoke execute on function public.error_report_resolve(uuid, text)
  from public, anon;
grant execute on function public.error_report_resolve(uuid, text)
  to authenticated;

comment on function public.error_report_submit(text, text, text, text, jsonb, jsonb) is
  'Prime 20260929_06: authenticated client error reports into public.error_reports; identity server-derived from the JWT, text fields length-bounded. The browser never writes the table directly (no client insert policy).';
comment on function public.error_report_resolve(uuid, text) is
  'Prime 20260929_06: manager-or-admin resolves an error report; sets resolved/resolved_at/resolution_notes and writes an audit_log row. Server-checked authorization; refuses double-resolution (P0002).';