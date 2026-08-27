-- ============================================================================
-- QBase — Incomplete Records Detection (v1)
-- Migration: 20260623_incomplete_records.sql
-- Purpose: Detect records where schema-required fields are empty/missing.
-- Run in Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ============================================================================
-- 1. RPC: get_incomplete_records()
--    Returns records where form_data has content BUT some schema-required
--    fields are empty or missing. These are "partially populated" records
--    that need retrofitting.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_incomplete_records() CASCADE;

CREATE OR REPLACE FUNCTION public.get_incomplete_records()
RETURNS TABLE (
  id uuid,
  form_code text,
  serial text,
  form_name text,
  section integer,
  section_name text,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  form_data jsonb,
  empty_fields text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH required_fields AS (
    SELECT unnest(ARRAY['nc_description', 'root_cause', 'corrective_action', 'responsible', 'identified_by']) AS fk
  ),
  records_with_empty AS (
    SELECT
      r.id,
      r.form_code,
      r.serial,
      r.form_name,
      r.section,
      r.section_name,
      r.created_by,
      r.created_at,
      r.updated_at,
      r.form_data,
      ARRAY(
        SELECT rf.fk
        FROM required_fields rf
        WHERE r.form_code = 'F/22'
          AND (
            r.form_data->>rf.fk IS NULL
            OR btrim(r.form_data->>rf.fk) = ''
          )
      ) AS empty_fields
    FROM public.records r
    WHERE r.deleted_at IS NULL
      AND r.form_code = 'F/22'
  )
  SELECT *
  FROM records_with_empty
  WHERE array_length(empty_fields, 1) > 0
  ORDER BY serial;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_incomplete_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incomplete_records() TO service_role;

-- ============================================================================
-- Verification:
--   SELECT serial, form_code, empty_fields FROM get_incomplete_records() ORDER BY serial;
-- ============================================================================
