-- ============================================================================
-- QBase — Data Integrity Engine & Retrofitting Hub
-- Migration: 20260622_data_integrity.sql  (v2 — Retrofit pivot)
-- Purpose: Database-level diagnostics for empty/ghost records + future
--          empty-insert prevention. NO purge functions — records preserved.
-- Batman must run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ============================================================================
-- 1. RPC: get_empty_records()
--    Security definer (bypasses RLS for admin audit).
--    Returns all active records where form_data is NULL, '{}', 'null', or
--    contains only empty-string values across its keys.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_empty_records() CASCADE;

CREATE OR REPLACE FUNCTION public.get_empty_records()
RETURNS TABLE (
  id uuid,
  form_code text,
  serial text,
  form_name text,
  department text,
  section integer,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  form_data jsonb,
  is_empty boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_code,
    r.serial,
    r.form_name,
    r.department,
    r.section,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.form_data,
    CASE
      WHEN r.form_data IS NULL THEN true
      WHEN r.form_data = '{}'::jsonb THEN true
      WHEN r.form_data = 'null'::jsonb THEN true
      WHEN r.form_data IS NOT NULL
        AND r.form_data != '{}'::jsonb
        AND jsonb_typeof(r.form_data) = 'object'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_each_text(r.form_data) AS j(k, v)
          WHERE v IS NOT NULL AND btrim(v) != ''
        ) THEN true
      ELSE false
    END AS is_empty
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
      OR (
        r.form_data IS NOT NULL
        AND r.form_data != '{}'::jsonb
        AND jsonb_typeof(r.form_data) = 'object'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_each_text(r.form_data) AS j(k, v)
          WHERE v IS NOT NULL AND btrim(v) != ''
        )
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_empty_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_empty_records() TO service_role;

-- ============================================================================
-- 2. RPC: get_record_count()
--    Returns total active record count for the dashboard summary.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_record_count() CASCADE;

CREATE OR REPLACE FUNCTION public.get_record_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.records
  WHERE deleted_at IS NULL;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_record_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_record_count() TO service_role;

-- ============================================================================
-- 3. CHECK CONSTRAINT: records_form_data_not_empty (NOT VALID)
--    Prevents FUTURE inserts with NULL or empty '{}' form_data.
--    NOT VALID = existing ghost records are NOT checked (migration won't fail),
--    but any new INSERT or UPDATE must satisfy the constraint.
--    This allows us to UPDATE existing empties into populated records,
--    while blocking any new empty inserts going forward.
-- ============================================================================

ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_not_empty;

ALTER TABLE public.records
  ADD CONSTRAINT records_form_data_not_empty
  CHECK (
    form_data IS NOT NULL
    AND form_data::text != '{}'::text
    AND form_data::text != 'null'::text
  ) NOT VALID;

-- ============================================================================
-- Verification (run after applying):
--   SELECT count(*) FROM get_empty_records();  -- ghost count
--   SELECT get_record_count();                 -- total active records
-- ============================================================================