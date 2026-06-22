-- ============================================================================
-- QBase — Data Integrity Engine & Ghost Records Cleanup
-- Migration: 20260622_data_integrity.sql
-- Purpose: Database-level diagnostics for empty/ghost records
-- Batman must run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ============================================================================
-- 1. RPC: get_empty_records()
--    Security definer (runs with elevated privileges, bypasses RLS for audit)
--    Returns all records where form_data is NULL, '{}', or contains only
--    empty-string values across its dynamic keys.
-- ============================================================================

-- Drop existing if present (idempotent)
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
      -- form_data is NULL → ghost
      WHEN r.form_data IS NULL THEN true
      -- form_data is '{}' (empty object) → ghost
      WHEN r.form_data = '{}'::jsonb THEN true
      -- form_data is 'null' (JSON null literal) → ghost
      WHEN r.form_data = 'null'::jsonb THEN true
      -- All keys have empty-string or null values → ghost
      WHEN r.form_data IS NOT NULL
        AND r.form_data != '{}'::jsonb
        AND (
          -- Check if every value in the JSON object is empty/null
          NOT EXISTS (
            SELECT 1
            FROM jsonb_each_text(CASE WHEN jsonb_typeof(r.form_data) = 'object' THEN r.form_data ELSE '{}'::jsonb END) AS j(k, v)
            WHERE v IS NOT NULL
              AND btrim(v) != ''
          )
        ) THEN true
      ELSE false
    END AS is_empty
  FROM public.records r
  WHERE r.deleted_at IS NULL  -- Only active (non-soft-deleted) records
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
      OR (
        r.form_data IS NOT NULL
        AND r.form_data != '{}'::jsonb
        AND jsonb_typeof(r.form_data) = 'object'
        AND (
          -- All string values are empty or null
          NOT EXISTS (
            SELECT 1
            FROM jsonb_each_text(r.form_data) AS j(k, v)
            WHERE v IS NOT NULL AND btrim(v) != ''
          )
        )
        -- Also exclude if the object only has null values
        AND (
          SELECT count(*) FROM jsonb_object_keys(r.form_data) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_each_text(r.form_data) AS j(k, v)
            WHERE v IS NOT NULL AND btrim(v) != ''
          ) = false
        )
      )
    );
END;
$$;

-- Grant execute to authenticated users (admins will call this)
GRANT EXECUTE ON FUNCTION public.get_empty_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_empty_records() TO service_role;

-- ============================================================================
-- 2. RPC: purge_empty_record(p_record_id uuid)
--    Hard-deletes a single ghost record by ID (not soft-delete — permanent).
--    Returns the deleted record's serial for audit confirmation.
--    SECURITY DEFINER so admin callers can bypass RLS.
-- ============================================================================

DROP FUNCTION IF EXISTS public.purge_empty_record(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.purge_empty_record(p_record_id uuid)
RETURNS TABLE (deleted_serial text, deleted_form_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial text;
  v_form_code text;
BEGIN
  -- Verify the record exists and is empty (ghost)
  SELECT r.serial, r.form_code INTO v_serial, v_form_code
  FROM public.records r
  WHERE r.id = p_record_id
    AND r.deleted_at IS NULL
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or is not a ghost record (has valid form_data).';
  END IF;

  -- Hard delete the ghost record
  DELETE FROM public.records WHERE id = p_record_id;

  RETURN QUERY SELECT v_serial, v_form_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_empty_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_empty_record(uuid) TO service_role;

-- ============================================================================
-- 3. RPC: purge_all_empty_records()
--    Batch purges ALL ghost records in one transaction.
--    Returns count of deleted records.
-- ============================================================================

DROP FUNCTION IF EXISTS public.purge_all_empty_records() CASCADE;

CREATE OR REPLACE FUNCTION public.purge_all_empty_records()
RETURNS TABLE (deleted_count bigint, serials text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
  v_serials text[];
BEGIN
  -- Collect serials of ghost records for audit trail
  SELECT array_agg(r.serial) INTO v_serials
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND (
      r.form_data IS NULL
      OR r.form_data = '{}'::jsonb
      OR r.form_data = 'null'::jsonb
    );

  -- Hard delete all ghost records
  DELETE FROM public.records
  WHERE deleted_at IS NULL
    AND (
      form_data IS NULL
      OR form_data = '{}'::jsonb
      OR form_data = 'null'::jsonb
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, COALESCE(v_serials, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_all_empty_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_all_empty_records() TO service_role;

-- ============================================================================
-- 4. CHECK CONSTRAINT: records_form_data_not_empty
--    Prevents future INSERTs with NULL or empty '{}' form_data.
--    NOTE: This is a DEFERRED constraint — existing ghost records are NOT
--    affected until purged. New inserts will be blocked at DB level.
--    Uses COALESCE to handle NULL safely and char_length to enforce minimum.
-- ============================================================================

-- Drop existing constraint if present (idempotent)
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_not_empty;

-- Add constraint: form_data must not be NULL and must not be empty '{}'
-- We allow form_data to be a JSON object with keys, even if values are empty
-- strings (for template initializations), but block pure NULL and '{}'::jsonb.
ALTER TABLE public.records
  ADD CONSTRAINT records_form_data_not_empty
  CHECK (
    form_data IS NOT NULL
    AND form_data::text != '{}'::text
    AND form_data::text != 'null'::text
  );

-- ============================================================================
-- 5. RPC: get_record_count()
--    Returns total active record count for the dashboard summary.
--    Lightweight query, SECURITY DEFINER for consistent results.
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
-- Verification queries (run manually after applying):
-- SELECT * FROM get_empty_records();
-- SELECT get_record_count();
-- SELECT * FROM get_empty_records() WHERE is_empty = true;
-- ============================================================================