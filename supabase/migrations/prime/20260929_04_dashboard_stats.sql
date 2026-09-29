-- ============================================================================
-- Prime §D6 — dashboard_stats(): real-table KPIs for the dashboard, ONE RPC.
-- ---------------------------------------------------------------------------
-- Every field below IS its widget's exact query (Prime D6: "each widget
-- documents its exact query"). The function returns AGGREGATE COUNTS ONLY —
-- no serials, descriptions, or personal data — so a security-definer read
-- over all rows never leaks row-level content to the caller beyond what the
-- aggregate itself communicates. There is no fabricated fallback: a zero
-- population yields 0 counts and a NULL closure rate, which the client MUST
-- render as "no data" (src/services/dashboardStats.ts).
-- ============================================================================

begin;

create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return jsonb_build_object(
    -- ── Records: total / status counts / last-30-days volume ──────────────
    -- Widget: "Records KPI". Exact query: count(*) over public.records
    -- excluding soft-deleted (archived) rows — archived totals are surfaced
    -- by the archive screen, not the dashboard.
    'records_total', (
      select count(*)::int from public.records where deleted_at is null
    ),
    -- Exact query: group count by the workflow status column.
    'records_by_status', (
      select jsonb_build_object(
        'draft',          count(*) filter (where status = 'draft')::int,
        'pending_review', count(*) filter (where status = 'pending_review')::int,
        'approved',       count(*) filter (where status = 'approved')::int,
        'rejected',       count(*) filter (where status = 'rejected')::int
      )
      from public.records
      where deleted_at is null
    ),
    -- Exact query: records created in the last 30 days.
    'records_last_30d', (
      select count(*)::int from public.records
      where deleted_at is null
        and created_at >= now() - interval '30 days'
    ),

    -- ── CAPA register: closure rate / overdue (ISO 9001 §10.2) ───────────
    -- Widget: "CAPA health". Exact query: counts over public.capas.
    -- capa_closure_rate is deliberately NULL when there are no CAPAs —
    -- "0%" would fabricate an achievement from an empty register; the
    -- client renders "no data".
    'capa_total', (
      select count(*)::int from public.capas
    ),
    'capa_closed', (
      select count(*)::int from public.capas where status = 'Closed'
    ),
    'capa_open', (
      select count(*)::int from public.capas where status = 'Open'
    ),
    'capa_closure_rate', (
      select case
        when count(*) = 0 then null::int
        else round(
          (count(*) filter (where status = 'Closed'))::numeric
          * 100 / count(*)
        )::int
      end
      from public.capas
    ),
    -- Exact query: non-closed CAPAs whose target completion date has passed.
    'capa_overdue', (
      select count(*)::int from public.capas
      where status <> 'Closed'
        and target_completion_date is not null
        and target_completion_date < now()::date
    ),

    -- ── Pending-review aging: how long approvals have sat ─────────────────
    -- Widget: "Overdue reviews". Exact query: pending_review records bucketed
    -- on their last update time (7d / 7-30d / >30d).
    'pending_review_aging', (
      select jsonb_build_object(
        'under_7d',      count(*) filter (where updated_at >= now() - interval '7 days')::int,
        'from_7_to_30d', count(*) filter (where updated_at < now() - interval '7 days'
                                             and updated_at >= now() - interval '30 days')::int,
        'over_30d',      count(*) filter (where updated_at < now() - interval '30 days')::int
      )
      from public.records
      where status = 'pending_review' and deleted_at is null
    )
  );
end;
$$;

-- Same revocation discipline as the rest of the Prime surface: never callable
-- by anon/public; authenticated only.
revoke execute on function public.dashboard_stats()
  from public, anon;
grant execute on function public.dashboard_stats()
  to authenticated;

comment on function public.dashboard_stats() is
  'Prime D6: org-level aggregate KPIs for the dashboard (counts only, no row data). One RPC; each JSON field pairs 1:1 with a dashboard widget whose rendered tooltip cites this exact query.';

commit;