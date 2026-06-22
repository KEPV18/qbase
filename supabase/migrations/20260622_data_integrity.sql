-- ============================================================================
-- QBase — Data Integrity Engine & Retrofitting Hub (v3 — Deep Scalar Check)
-- Migration: 20260622_data_integrity.sql
-- Purpose: Database-level diagnostics for empty/ghost records + future
--          empty-insert prevention. Deep scalar check: a record is flagged
--          as empty if NO scalar value anywhere in the JSONB payload contains
--          user-typed text (non-empty, non-null string).
-- Batman must run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ============================================================================
-- 1. Helper function: jsonb_has_nonempty_scalar(jsonb)
--    Recursively walks the JSONB tree (objects, arrays, nested).
--    Returns true if AT LEAST ONE scalar (text/number/boolean) value is
--    non-empty and non-null. Returns false otherwise.
--    - null JSON values        → ignored (empty)
--    - "" empty strings        → ignored (empty)
--    - "   " whitespace-only   → ignored (empty)
--    - numbers (any)           → counts as non-empty (real data)
--    - booleans true/false     → counts as non-empty (real data)
--    - objects/arrays          → recursed into
-- ============================================================================

DROP FUNCTION IF EXISTS public.jsonb_has_nonempty_scalar(p_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.jsonb_has_nonempty_scalar(p_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text;
  v_key text;
  v_val jsonb;
  v_elem jsonb;
  v_text text;
BEGIN
  IF p_data IS NULL THEN
    RETURN false;
  END IF;

  v_type := jsonb_typeof(p_data);

  -- Scalar types
  IF v_type = 'string' THEN
    v_text := p_data #>> '{}';
    RETURN (v_text IS NOT NULL AND btrim(v_text) != '');
  ELSIF v_type = 'number' THEN
    RETURN true;   -- any number is real data
  ELSIF v_type = 'boolean' THEN
    RETURN true;   -- any boolean is real data
  ELSIF v_type = 'null' THEN
    RETURN false;
  END IF;

  -- Object: recurse into each value
  IF v_type = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF public.jsonb_has_nonempty_scalar(v_val) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  -- Array: recurse into each element
  IF v_type = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_data) LOOP
      IF public.jsonb_has_nonempty_scalar(v_elem) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jsonb_has_nonempty_scalar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_has_nonempty_scalar(jsonb) TO service_role;

-- ============================================================================
-- 2. RPC: get_empty_records()
--    Returns all active records whose form_data has NO non-empty scalar
--    value anywhere in the payload (NULL, '{}', 'null', {k:""}, {k:null},
--    nested empties — all flagged as empty).
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
    NOT public.jsonb_has_nonempty_scalar(r.form_data) AS is_empty
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND NOT public.jsonb_has_nonempty_scalar(r.form_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_empty_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_empty_records() TO service_role;

-- ============================================================================
-- 3. RPC: get_record_count()
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
-- 4. CHECK CONSTRAINT: records_form_data_has_content (NOT VALID)
--    Prevents FUTURE inserts/updates with empty payloads at the DB level.
--    Deep scalar check via the helper function — blocks:
--      NULL, '{}', 'null', {"k":""}, {"k":null}, nested-empty templates.
--    NOT VALID = existing ghost records can still be UPDATED into populated
--    records (the constraint is only checked on new writes, not retroactively).
-- ============================================================================

ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_has_content;

ALTER TABLE public.records
  ADD CONSTRAINT records_form_data_has_content
  CHECK (public.jsonb_has_nonempty_scalar(form_data)) NOT VALID;

-- ============================================================================
-- Verification (run after applying):
--   SELECT count(*) FROM get_empty_records();         -- true ghost count (deep)
--   SELECT get_record_count();                         -- total active records
--   SELECT serial, form_data FROM get_empty_records() ORDER BY serial;
-- ============================================================================