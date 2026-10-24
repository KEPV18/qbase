-- ============================================================================
-- Prime migration 20 — the compliance verdict moves to the server
-- Target project: hkkdbxvmvvcxpgfqlrnp (the restored QBase copy)
-- Written:        2026-10-24
-- ============================================================================
--
-- The problem
-- -----------
-- The audit page and the dashboard downloaded the WHOLE register to answer a
-- question about 36 forms:
--
--   * `getRecords()` does `select('*')` over `records` — every row, every
--     `form_data` blob.  Measured on the register: 318 records, 379 kB of
--     `form_data`, for EVERY user, on EVERY visit.
--   * the compliance verdict was then computed IN THE BROWSER, by
--     `buildComplianceMap()` over that snapshot.
--
-- Two consequences, both of them real:
--
--   1. the page that exists to tell you your compliance state is a
--      full-table download — it scales with the register, not with the
--      36 forms it reports on;
--   2. the number it shows is computed from a snapshot THE BROWSER HOLDS.
--      Two users on two snapshots can be shown two different compliance
--      answers for the same minute, and neither of them is the server's
--      answer.
--
-- The fix
-- -------
-- Two server functions, and a client that asks for a page instead of a table:
--
--   * `compliance_map(p_forms, p_as_of, p_tz_offset_minutes)` — the WHOLE
--     compliance model, computed on the server, over the rows the CALLER may
--     see (the function is SECURITY INVOKER, so the row-level policy decides
--     the scope — a plain user still gets their slice, never the company).
--     The catalogue is passed IN (`p_forms`), so the form definitions stay
--     owned by the TypeScript catalogue and cannot drift into a second
--     source of truth in the database.
--
--   * `records_page(p_filter, p_offset, p_limit, p_sort)` — ONE page of the
--     register, filtered on the server, with the row count.  The list behind
--     the audit table now asks for a page instead of downloading the table.
--
-- WHY THE PERIOD ENGINE IS PORTED RATHER THAN REUSED
-- ---------------------------------------------------
-- The period coverage engine lives in TypeScript (`src/lib/compliancePeriods.ts`)
-- and the pages that do NOT go through this function still read it.  This
-- migration is a faithful PORT of that engine, not a different one:
--
--   * the same grace days (monthly 5, quarterly 10, semi-annual 15,
--     annual 14);
--   * the same window — anchored to the DATA (the earliest month any record
--     covers), capped one year back, running to the end of the calendar year;
--   * the same "a period is a gap when its deadline has passed and no
--     record covers it";
--   * the same "the day a deadline passes the period disappears" bug is
--     fixed the same way — a period whose deadline falls in January is still
--     on the table when January comes.
--
-- The two engines are compared against each other over the whole register
-- by `tools/local-stack/verify-compliance-parity.mjs`, which fails loudly
-- when they disagree.
--
-- THE CLOCK
-- ---------
-- `p_as_of` is the caller's instant and `p_tz_offset_minutes` is the
-- caller's UTC offset.  Both are needed: the engine's period arithmetic is
-- done in the CALLER's local calendar (a form due on the 5th is due on the
-- 5th where the caller is), while the lateness is measured in real elapsed
-- time.  Passing the offset — rather than letting the server use its own
-- timezone — is what keeps "overdue by N days" the same number in Cairo and
-- in Los Angeles.
--
-- ZERO DATA LOSS
-- ---------------
-- This migration creates functions and grants.  It touches NO row, inserts
-- NO row, and alters NO table.  The compliance answer is a READ.
-- ============================================================================
begin;

-- ── 1. the month a record covers ────────────────────────────────────────────
-- The TypeScript engine reads the covered month out of the record's business
-- fields, in this order: `record_month`, then `coverage_period`, then
-- `date`, and finally the creation date.  The functions below are the same
-- three rules, so a record is filed under the same month on both sides.
-- ============================================================================

create or replace function public.qbase_month_from_label(p_value text)
returns text
language plpgsql
immutable
set search_path = '' as $$
declare
  v_value text := btrim(coalesce(p_value, ''));
  v_month_name text;
  v_year text;
  v_month integer;
  v_first integer;
  v_second integer;
  v_year4 integer;
begin
  if v_value = '' then
    return null;
  end if;

  -- "January 2026" — the month NAME wins over everything else.
  v_month_name := case
    when v_value like 'January%'   then 'January'
    when v_value like 'February%'  then 'February'
    when v_value like 'March%'     then 'March'
    when v_value like 'April%'     then 'April'
    when v_value like 'May%'       then 'May'
    when v_value like 'June%'      then 'June'
    when v_value like 'July%'      then 'July'
    when v_value like 'August%'    then 'August'
    when v_value like 'September%' then 'September'
    when v_value like 'October%'   then 'October'
    when v_value like 'November%'  then 'November'
    when v_value like 'December%'  then 'December'
    else null
  end;
  if v_month_name is not null then
    v_year := split_part(v_value, ' ', 2);
    if v_year ~ '^\d{4}$' then
      v_month := case v_month_name
        when 'January' then 1 when 'February' then 2 when 'March' then 3
        when 'April' then 4 when 'May' then 5 when 'June' then 6
        when 'July' then 7 when 'August' then 8 when 'September' then 9
        when 'October' then 10 when 'November' then 11 when 'December' then 12
      end;
      return v_year || '-' || lpad(v_month::text, 2, '0');
    end if;
    return null;
  end if;

  -- 'YYYY-MM…'
  if v_value ~ '^\d{4}-\d{2}' then
    v_month := substring(v_value from '^\d{4}-(\d{2})')::integer;
    if v_month between 1 and 12 then
      return substring(v_value from '^(\d{4})') || '-' || lpad(v_month::text, 2, '0');
    end if;
    return null;
  end if;

  -- 'MM/YYYY' — the spelling the `record_month` field uses ("03/2026").
  if v_value ~ '^\d{1,2}/\d{4}$' then
    v_month := split_part(v_value, '/', 1)::integer;
    if v_month between 1 and 12 then
      return split_part(v_value, '/', 2) || '-' || lpad(v_month::text, 2, '0');
    end if;
    return null;
  end if;

  -- 'DD/MM/YYYY' or 'MM/DD/YYYY'.  DD/MM is the house order: the stored
  -- data is ISO and the forms are filled in by hand in DD/MM/YYYY, and the
  -- values that disambiguate themselves (15/07, 31/07) are all DD/MM.  The
  -- unambiguous cases are still resolved exactly, so a genuine MM/DD value
  -- such as 03/15/2026 is not thrown away.
  if v_value ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
    v_first  := split_part(v_value, '/', 1)::integer;
    v_second := split_part(v_value, '/', 2)::integer;
    v_year4  := split_part(v_value, '/', 3)::integer;
    if v_first > 12 and v_second between 1 and 12 then
      v_month := v_second;                       -- DD/MM
      if v_first not between 1 and 31 then return null; end if;
    elsif v_second > 12 and v_first between 1 and 12 then
      v_month := v_first;                        -- MM/DD
      if v_second not between 1 and 31 then return null; end if;
    elsif v_first between 1 and 12 and v_second between 1 and 12 then
      v_month := v_second;                       -- DD/MM — the house order
      if v_first not between 1 and 31 then return null; end if;
    else
      return null;                               -- neither part can be a month
    end if;
    return lpad(v_year4::text, 4, '0') || '-' || lpad(v_month::text, 2, '0');
  end if;

  return null;
end;
$$;

comment on function public.qbase_month_from_label(text) is
  'The month a date-ish string names, as YYYY-MM. The port of the TypeScript dateToMonthLabel().';

-- ── 2. the normalised month key ─────────────────────────────────────────────
create or replace function public.qbase_normalize_year_month(p_value text)
returns text
language plpgsql
immutable
set search_path = '' as $$
declare
  v_value text := btrim(coalesce(p_value, ''));
  v_month integer;
begin
  if v_value = '' then
    return null;
  end if;

  -- already 'YYYY-MM'
  if v_value ~ '^\d{4}-\d{2}$' then
    return v_value;
  end if;

  -- 'YYYY-M' → 'YYYY-0M'.  The key has to be EXACTLY YYYY-MM: the engine
  -- compares it as a string, so '2026-1' is not a shorter spelling of
  -- January, it is a key that matches nothing.
  if v_value ~ '^\d{4}-\d{1}$' then
    v_month := substring(v_value from '^\d{4}-(\d)$')::integer;
    if v_month between 1 and 12 then
      return substring(v_value from '^(\d{4})') || '-' || lpad(v_month::text, 2, '0');
    end if;
    return null;
  end if;

  -- 'MM/YYYY' → 'YYYY-MM'
  if v_value ~ '^\d{1,2}/\d{4}$' then
    v_month := split_part(v_value, '/', 1)::integer;
    if v_month between 1 and 12 then
      return split_part(v_value, '/', 2) || '-' || lpad(v_month::text, 2, '0');
    end if;
    return null;
  end if;

  -- 'Month YYYY' / a date
  return public.qbase_month_from_label(v_value);
end;
$$;

comment on function public.qbase_normalize_year_month(text) is
  'The YYYY-MM month key, or NULL when the value does not name a month. The port of the TypeScript normalizeYearMonth().';

-- ── 3. the month ONE record covers ──────────────────────────────────────────
create or replace function public.qbase_record_month(
  p_form_data  jsonb,
  p_created_at timestamptz
)
returns text
language plpgsql
immutable
set search_path = '' as $$
declare
  v_record_month text;
  v_coverage_period text;
  v_date text;
  v_month text;
begin
  -- 1. record_month
  v_record_month := nullif(btrim(coalesce(p_form_data ->> 'record_month', '')), '');
  if v_record_month is not null then
    v_month := public.qbase_normalize_year_month(v_record_month);
    if v_month is not null then
      return v_month;
    end if;
    -- The engine keeps the raw value when it cannot parse it.  It matches
    -- no period, and the window start rejects it too, so it is harmless.
    return v_record_month;
  end if;

  -- 2. coverage_period — a named month.  A value that is not a month
  --    ("Continuous / Open-Ended") falls through to the date.
  v_coverage_period := nullif(btrim(coalesce(p_form_data ->> 'coverage_period', '')), '');
  if v_coverage_period is not null then
    v_month := public.qbase_normalize_year_month(v_coverage_period);
    if v_month is not null then
      return v_month;
    end if;
  end if;

  -- 3. the form's own date field
  v_date := nullif(btrim(coalesce(p_form_data ->> 'date', '')), '');
  if v_date is not null then
    v_month := public.qbase_month_from_label(v_date);
    if v_month is not null then
      return v_month;
    end if;
  end if;

  -- 4. the creation date — the same UTC reading the client does, because
  --    the record's timestamp arrives as an ISO string in UTC.
  if p_created_at is not null then
    return to_char(p_created_at at time zone 'UTC', 'YYYY-MM');
  end if;

  return null;
end;
$$;

comment on function public.qbase_record_month(jsonb, timestamptz) is
  'The month a record covers, as YYYY-MM. The port of the TypeScript getRecordMonth().';

-- ── 4. the cadence of a form ────────────────────────────────────────────────
create or replace function public.qbase_periodic_frequency(p_frequency text)
returns text
language sql
immutable
set search_path = '' as $$
  select case
    when lower(btrim(coalesce(p_frequency, ''))) like 'monthly%'   then 'monthly'
    when lower(btrim(coalesce(p_frequency, ''))) like 'quarterly%'  then 'quarterly'
    -- 'semi-annual' also contains 'annual' — it has to be tested first.
    when position('semi-annual' in lower(coalesce(p_frequency, ''))) > 0
      or position('semi annual' in lower(coalesce(p_frequency, ''))) > 0 then 'semi-annual'
    when position('annual' in lower(coalesce(p_frequency, ''))) > 0
      or position('yearly' in lower(coalesce(p_frequency, ''))) > 0 then 'annual'
    else null
  end;
$$;

comment on function public.qbase_periodic_frequency(text) is
  'monthly | quarterly | semi-annual | annual | NULL. The port of the TypeScript toPeriodicFrequency().';

-- ── 5. the periods of a cadence ─────────────────────────────────────────────
create or replace function public.qbase_periods(
  p_freq       text,
  p_from_year  integer,
  p_to_year    integer
)
returns table (
  period_key   text,
  period_label text,
  start_month  text,
  end_month    text,
  due_date     date
)
language plpgsql
immutable
set search_path = '' as $$
declare
  v_names constant text[] := array[
    'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  v_grace integer;
  v_year integer;
  v_i integer;
  v_start text;
  v_end text;
  v_last_day date;
begin
  -- The same grace days as the TypeScript engine: days after a period
  -- closes before the filing counts as late.
  v_grace := case p_freq
    when 'monthly'    then 5
    when 'quarterly'  then 10
    when 'semi-annual' then 15
    when 'annual'     then 14
    else 0
  end;

  for v_year in p_from_year..p_to_year loop
    if p_freq = 'monthly' then
      for v_i in 1..12 loop
        v_start := format('%s-%s', v_year, lpad(v_i::text, 2, '0'));
        v_last_day := (date_trunc('month', (v_start || '-01')::date) + interval '1 month' - interval '1 day')::date;
        return query
          select v_start, v_names[v_i] || ' ' || v_year::text,
                 v_start, v_start, v_last_day + v_grace;
      end loop;

    elsif p_freq = 'quarterly' then
      for v_i in 1..4 loop
        v_start := format('%s-%s', v_year, lpad(((v_i - 1) * 3 + 1)::text, 2, '0'));
        v_end   := format('%s-%s', v_year, lpad((v_i * 3)::text, 2, '0'));
        v_last_day := (date_trunc('month', (v_end || '-01')::date) + interval '1 month' - interval '1 day')::date;
        return query
          select format('%s-Q%s', v_year, v_i), 'Q' || v_i::text || ' ' || v_year::text,
                 v_start, v_end, v_last_day + v_grace;
      end loop;

    elsif p_freq = 'semi-annual' then
      for v_i in 1..2 loop
        v_start := format('%s-%s', v_year, lpad(((v_i - 1) * 6 + 1)::text, 2, '0'));
        v_end   := format('%s-%s', v_year, lpad((v_i * 6)::text, 2, '0'));
        v_last_day := (date_trunc('month', (v_end || '-01')::date) + interval '1 month' - interval '1 day')::date;
        return query
          select format('%s-H%s', v_year, v_i), 'H' || v_i::text || ' ' || v_year::text,
                 v_start, v_end, v_last_day + v_grace;
      end loop;

    elsif p_freq = 'annual' then
      v_start := format('%s-01', v_year);
      v_end   := format('%s-12', v_year);
      v_last_day := (date_trunc('month', (v_end || '-01')::date) + interval '1 month' - interval '1 day')::date;
      return query
        select v_year::text, v_year::text, v_start, v_end, v_last_day + v_grace;
    end if;
  end loop;
  return;
end;
$$;

comment on function public.qbase_periods(text, integer, integer) is
  'Every period of a cadence between two years, with its deadline. The port of the TypeScript getPeriodsForYear().';

-- ── 6. the compliance map ───────────────────────────────────────────────────
-- SECURITY INVOKER on purpose: the row-level policy decides what the caller
-- sees, exactly as it does when the client selects the table.  A SECURITY
-- DEFINER read would hand a plain user the whole register's compliance
-- answer, which is the one thing the scoped-viewer banner exists to
-- prevent.
-- ============================================================================
create or replace function public.compliance_map(
  p_forms              jsonb,
  p_as_of              timestamptz default now(),
  p_tz_offset_minutes  integer default 0
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = '' as $$
declare
  v_offset integer := coalesce(p_tz_offset_minutes, 0);
  v_local timestamp;
  v_year integer;
  v_current_month text;
  v_since text;
  v_total integer := 0;
  v_status_counts jsonb := '{"draft":0,"pending_review":0,"approved":0,"rejected":0}'::jsonb;
  v_months jsonb := '[]'::jsonb;
  v_agg jsonb := '{}'::jsonb;
  v_result jsonb := '{}'::jsonb;
  v_form jsonb;
  v_code text;
  v_name text;
  v_frequency text;
  v_periodic text;
  v_entry jsonb;
  v_count integer;
  v_issues integer;
  v_last timestamptz;
  v_month_list text[];
  v_floor_month text;
  v_ceiling_month text;
  v_window_start text;
  v_window_year integer;
  v_period record;
  v_covered boolean;
  v_due boolean;
  v_expected boolean;
  v_due_at timestamptz;
  v_due_midnight timestamptz;
  v_state text;
  v_days_late integer;
  v_states jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_missing_count integer := 0;
  v_covered_count integer := 0;
  v_first_missing_due timestamptz;
  v_next_due date;
  v_next_due_at timestamptz;
  v_days_until integer;
  v_days_since_last integer;
  v_overdue_days integer := 0;
  v_is_overdue boolean := false;
begin
  v_local := (p_as_of at time zone 'UTC') + make_interval(mins => v_offset);
  v_year := extract(year from v_local)::integer;
  v_current_month := to_char(v_local, 'YYYY-MM');

  -- ── the visible register, summarised ───────────────────────────────────
  -- One pass over the rows the caller may see.  The month of a record is
  -- derived the same way the client derives it, so both sides file a
  -- record under the same month.
  with rec as (
    select r.form_code,
           r.status::text as status,
           r.created_at,
           public.qbase_record_month(r.form_data, r.created_at) as month,
           lower(coalesce(r.form_data ->> 'status', '')) as business_status
    from public.records r
    where r.deleted_at is null
  )
  select count(*)::int,
         min(month collate "C"),
         coalesce(jsonb_agg(distinct month order by month) filter (where month is not null), '[]'::jsonb)
    into v_total, v_since, v_months
    from rec;

  with rec as (
    select r.status::text as status
    from public.records r
    where r.deleted_at is null
  )
  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
    into v_status_counts
    from (select status, count(*)::int as n from rec group by status) s;

  with rec as (
    select r.form_code,
           r.created_at,
           public.qbase_record_month(r.form_data, r.created_at) as month,
           lower(coalesce(r.form_data ->> 'status', '')) as business_status
    from public.records r
    where r.deleted_at is null
  )
  select coalesce(jsonb_object_agg(form_code, jsonb_build_object(
           'recordCount', cnt,
           'lastRecordDate', last_at,
           'months', months,
           'issueCount', issues)), '{}'::jsonb)
    into v_agg
    from (
      select form_code,
             count(*)::int as cnt,
             max(created_at) as last_at,
             coalesce(jsonb_agg(distinct month) filter (where month is not null), '[]'::jsonb) as months,
             count(*) filter (
               where business_status in ('open', 'rejected')
                  or strpos(business_status, 'nc') > 0
             )::int as issues
      from rec group by form_code
    ) g;

  -- ── the model, one form at a time ──────────────────────────────────────
  for v_form in select * from jsonb_array_elements(coalesce(p_forms, '[]'::jsonb)) loop
    v_code := nullif(btrim(coalesce(v_form ->> 'code', '')), '');
    if v_code is null then
      continue;
    end if;
    v_name := coalesce(nullif(btrim(coalesce(v_form ->> 'name', '')), ''), v_code);
    v_frequency := coalesce(v_form ->> 'frequency', '');
    v_periodic := public.qbase_periodic_frequency(v_frequency);

    v_entry := v_agg -> v_code;
    v_count := coalesce((v_entry ->> 'recordCount')::integer, 0);
    v_issues := coalesce((v_entry ->> 'issueCount')::integer, 0);
    v_last := nullif(v_entry ->> 'lastRecordDate', '')::timestamptz;
    v_month_list := coalesce(
      array(select jsonb_array_elements_text(coalesce(v_entry -> 'months', '[]'::jsonb))),
      '{}'::text[]);

    v_states := '[]'::jsonb;
    v_missing := '[]'::jsonb;
    v_missing_count := 0;
    v_covered_count := 0;
    v_next_due := null;
    v_days_until := null;
    v_overdue_days := 0;
    v_is_overdue := false;
    v_first_missing_due := null;

    if v_periodic is not null then
      -- The reporting window, anchored to the DATA: it starts at the month
      -- the organisation was first using these forms, so a period that ended
      -- before that was never owed and is not a gap; and it runs to the end
      -- of the current calendar year, so a period whose deadline falls in
      -- January is still on the table when January comes.  The look-back is
      -- capped at one extra year.
      v_floor_month := format('%s-01', v_year - 1);
      v_ceiling_month := format('%s-01', v_year);
      v_window_start := case
        when v_since ~ '^\d{4}-\d{2}$' then v_since
        else v_floor_month
      end;
      if v_window_start > v_ceiling_month then v_window_start := v_ceiling_month; end if;
      if v_window_start < v_floor_month then v_window_start := v_floor_month; end if;
      v_window_year := substring(v_window_start from '^(\d{4})')::integer;

      for v_period in
        select * from public.qbase_periods(v_periodic, v_window_year, v_year)
      loop
        -- A period that ended before the organisation started using these
        -- forms was never owed.
        if v_period.end_month < v_window_start then
          continue;
        end if;

        v_expected := v_period.start_month <= v_current_month;
        v_covered := exists (
          select 1 from unnest(v_month_list) as m
          where m >= v_period.start_month and m <= v_period.end_month
        );
        -- The deadline is the END of its day, in the caller's own calendar.
        v_due_at := ((v_period.due_date::timestamp + time '23:59:59')
                     - make_interval(mins => v_offset))::timestamptz;
        v_due_midnight := (v_period.due_date::timestamp
                     - make_interval(mins => v_offset))::timestamptz;
        v_due := v_due_at < p_as_of;

        if v_covered then
          v_state := 'covered';
          v_days_late := 0;
          v_covered_count := v_covered_count + 1;
        elsif v_due then
          v_state := 'missing';
          v_days_late := floor(extract(epoch from (p_as_of - v_due_midnight)) / 86400)::integer;
          v_missing_count := v_missing_count + 1;
          if v_first_missing_due is null then
            v_first_missing_due := v_due_midnight;
          end if;
          v_missing := v_missing || jsonb_build_object(
            'key', v_period.period_key,
            'label', v_period.period_label,
            'startMonth', v_period.start_month,
            'endMonth', v_period.end_month,
            'dueDate', v_period.due_date::text);
        elsif v_expected then
          v_state := 'open';
          v_days_late := 0;
        else
          v_state := 'upcoming';
          v_days_late := 0;
        end if;

        v_states := v_states || jsonb_build_object(
          'key', v_period.period_key,
          'label', v_period.period_label,
          'startMonth', v_period.start_month,
          'endMonth', v_period.end_month,
          'dueDate', v_period.due_date::text,
          'state', v_state,
          'daysLate', v_days_late);

        -- The next deadline: the first expected period that no record
        -- covers — a gap counts, because a gap IS the next thing owed.
        if v_next_due is null and v_expected and not v_covered then
          v_next_due := v_period.due_date;
        end if;
      end loop;

      -- No expected period is owed: the next deadline is the first period
      -- that has not begun yet.
      if v_next_due is null then
        select p.due_date into v_next_due
        from public.qbase_periods(v_periodic, v_year, v_year + 1) p
        where p.start_month > v_current_month
        order by p.start_month
        limit 1;
      end if;

      if v_next_due is not null then
        v_next_due_at := ((v_next_due::timestamp + time '23:59:59')
                          - make_interval(mins => v_offset))::timestamptz;
        v_days_until := floor(extract(epoch from (v_next_due_at - p_as_of)) / 86400)::integer;
      end if;

      if v_first_missing_due is not null then
        v_overdue_days := floor(extract(epoch from (p_as_of - v_first_missing_due)) / 86400)::integer;
        v_is_overdue := true;
      end if;
    end if;

    v_days_since_last := case
      when v_last is not null
        then floor(extract(epoch from (p_as_of - v_last)) / 86400)::integer
      else null
    end;

    v_result := v_result || jsonb_build_object(v_code, jsonb_build_object(
      'code', v_code,
      'name', v_name,
      'frequency', v_frequency,
      'periodic', v_periodic,
      'recordCount', v_count,
      'issueCount', v_issues,
      'lastRecordDate', v_last,
      -- The months this form's records cover, so a page can show "last
      -- covered month" without downloading the table to work it out.
      'months', to_jsonb(v_month_list),
      'daysSinceLast', v_days_since_last,
      'isOverdue', v_is_overdue,
      'overdueDays', v_overdue_days,
      'missingCount', v_missing_count,
      'missingPeriods', v_missing,
      'periodStates', v_states,
      'coveredCount', v_covered_count,
      'nextDueDate', v_next_due,
      'daysUntilDue', v_days_until));
  end loop;

  return jsonb_build_object(
    'asOf', p_as_of,
    'localAsOf', v_local,
    'datasetStart', v_since,
    'totalRecords', v_total,
    'statusCounts', v_status_counts,
    'months', v_months,
    'forms', v_result);
end;
$$;

comment on function public.compliance_map(jsonb, timestamptz, integer) is
  'The whole compliance model, computed on the server over the rows the caller may see. The catalogue is passed in, so the form definitions stay owned by the TypeScript catalogue.';

-- ── 7. one page of the register ─────────────────────────────────────────────
-- The list behind the audit table and the dashboard asks for a PAGE now,
-- not the whole table.  The filters are the ones the UI already had; they
-- are applied on the server, where the row-level policy applies too.
-- ============================================================================
create or replace function public.records_page(
  p_filter jsonb   default '{}'::jsonb,
  p_offset integer default 0,
  p_limit  integer default 50,
  p_sort   text    default 'form_code'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = '' as $$
declare
  v_where text := 'r.deleted_at is null';
  v_workflow text := nullif(btrim(coalesce(p_filter ->> 'workflow_status', '')), '');
  v_business text := nullif(btrim(coalesce(p_filter ->> 'business', '')), '');
  v_form_code text := nullif(btrim(coalesce(p_filter ->> 'form_code', '')), '');
  -- A SET of form codes — the department view asks for "the records of
  -- every form in this department", which is a list, not one code.
  v_form_codes text[] := coalesce(
    (select array_agg(x)
       from jsonb_array_elements_text(
         case when jsonb_typeof(p_filter -> 'form_codes') = 'array'
              then p_filter -> 'form_codes' else '[]'::jsonb end) as x),
    '{}'::text[]);
  v_department text := nullif(btrim(coalesce(p_filter ->> 'department', '')), '');
  v_project_id text := nullif(btrim(coalesce(p_filter ->> 'project_id', '')), '');
  v_month text := nullif(btrim(coalesce(p_filter ->> 'month', '')), '');
  v_search text := nullif(btrim(coalesce(p_filter ->> 'search', '')), '');
  v_mine boolean := coalesce((p_filter ->> 'mine')::boolean, false);
  v_mine_drafts boolean := coalesce((p_filter ->> 'mine_drafts')::boolean, false);
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 500));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_order text;
  v_total integer;
  v_status_counts jsonb := '{}'::jsonb;
  v_rows jsonb;
begin
  if v_workflow is not null then
    if v_workflow not in ('draft', 'pending_review', 'approved', 'rejected') then
      raise exception 'Invalid workflow status: %', v_workflow using errcode = '22023';
    end if;
    v_where := v_where || format(' and r.status = %L::public.record_status_enum', v_workflow);
  end if;

  -- The BUSINESS status of a record — a non-conformity's own state — lives
  -- in its form_data, not in the workflow column.  It is the same rule the
  -- client used: open, rejected, or a status that mentions "nc".
  if v_business = 'issue' then
    v_where := v_where || format(
      ' and (lower(coalesce(r.form_data ->> %L, %L)) in (%L, %L)'
      ' or strpos(lower(coalesce(r.form_data ->> %L, %L)), %L) > 0)',
      'status', '', 'open', 'rejected', 'status', '', 'nc');
  elsif v_business = 'ok' then
    v_where := v_where || format(
      ' and not (lower(coalesce(r.form_data ->> %L, %L)) in (%L, %L)'
      ' or strpos(lower(coalesce(r.form_data ->> %L, %L)), %L) > 0)',
      'status', '', 'open', 'rejected', 'status', '', 'nc');
  end if;

  if v_form_code is not null then
    v_where := v_where || format(' and r.form_code = %L', v_form_code);
  end if;

  if v_form_codes is not null and array_length(v_form_codes, 1) > 0 then
    v_where := v_where || format(' and r.form_code = any(%L::text[])', v_form_codes);
  end if;

  if v_department is not null then
    v_where := v_where || format(' and public.prime_record_department(r.form_code) = %L', v_department);
  end if;

  if v_project_id is not null then
    v_where := v_where || format(' and r.project_id::text = %L', v_project_id);
  end if;

  if v_month is not null then
    v_where := v_where || format(
      ' and public.qbase_record_month(r.form_data, r.created_at) = %L', v_month);
  end if;

  if v_search is not null then
    v_where := v_where || format(
      ' and (r.serial ilike %L or r.form_name ilike %L or r.form_code ilike %L)',
      '%' || v_search || '%', '%' || v_search || '%', '%' || v_search || '%');
  end if;

  if v_mine then
    v_where := v_where || format(
      ' and (r.created_by = auth.uid()::text or r.created_by = public.prime_current_user_email())');
  end if;

  if v_mine_drafts then
    v_where := v_where || format(
      ' and r.status = %L::public.record_status_enum'
      ' and (r.created_by = auth.uid()::text or r.created_by = public.prime_current_user_email())',
      'draft');
  end if;

  v_order := case coalesce(p_sort, 'form_code')
    when 'serial_asc'   then 'r.serial asc, r.created_at asc, r.id asc'
    when 'serial_desc'  then 'r.serial desc, r.created_at desc, r.id desc'
    when 'created_desc' then 'r.created_at desc, r.id desc'
    when 'created_asc'  then 'r.created_at asc, r.id asc'
    else 'r.form_code asc, r.serial asc, r.id asc'
  end;

  execute format('select count(*)::int from public.records r where %s', v_where)
    into v_total;

  -- The status breakdown OF THE FILTERED SET — the dashboard's header shows
  -- "N records · M approved", and that M has to describe the same rows
  -- the list shows, not the whole table.
  execute format(
    'select coalesce(jsonb_object_agg(status, n), ''{}''::jsonb)
       from (select r.status::text as status, count(*)::int as n
               from public.records r where %s group by r.status) s', v_where)
    into v_status_counts;

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id,
             'serial', r.serial,
             'form_code', r.form_code,
             'form_name', r.form_name,
             'status', r.status::text,
             'business_status', r.form_data ->> 'status',
             'created_at', r.created_at,
             'created_by', r.created_by,
             'updated_at', r.updated_at,
             'last_modified_by', r.last_modified_by,
             'edit_count', r.edit_count,
             'section', r.section,
             'section_name', r.section_name,
             'frequency', r.frequency,
             'project_id', r.project_id,
             'month', public.qbase_record_month(r.form_data, r.created_at),
             'client_name', r.form_data ->> 'client_name',
             'project_name', r.form_data ->> 'project_name'
           ) order by %s), '[]'::jsonb)
    from (
      select r.* from public.records r
      where %s
      order by %s
      limit %s offset %s
    ) r
  $q$, v_order, v_where, v_order, v_limit, v_offset)
    into v_rows;

  return jsonb_build_object(
    'total', v_total,
    'offset', v_offset,
    'limit', v_limit,
    'statusCounts', v_status_counts,
    'rows', v_rows);
end;
$$;

comment on function public.records_page(jsonb, integer, integer, text) is
  'One page of the register, filtered and sorted on the server, with the total row count. The list behind the audit table and the dashboard.';

-- ── 8. the grants ───────────────────────────────────────────────────────────
-- The same discipline as the rest of the Prime surface: never callable by
-- anon/public; authenticated only.
revoke execute on function public.qbase_month_from_label(text) from public, anon;
revoke execute on function public.qbase_normalize_year_month(text) from public, anon;
revoke execute on function public.qbase_record_month(jsonb, timestamptz) from public, anon;
revoke execute on function public.qbase_periodic_frequency(text) from public, anon;
revoke execute on function public.qbase_periods(text, integer, integer) from public, anon;
revoke execute on function public.compliance_map(jsonb, timestamptz, integer) from public, anon;
revoke execute on function public.records_page(jsonb, integer, integer, text) from public, anon;

grant execute on function public.qbase_month_from_label(text) to authenticated;
grant execute on function public.qbase_normalize_year_month(text) to authenticated;
grant execute on function public.qbase_record_month(jsonb, timestamptz) to authenticated;
grant execute on function public.qbase_periodic_frequency(text) to authenticated;
grant execute on function public.qbase_periods(text, integer, integer) to authenticated;
grant execute on function public.compliance_map(jsonb, timestamptz, integer) to authenticated;
grant execute on function public.records_page(jsonb, integer, integer, text) to authenticated;

commit;
