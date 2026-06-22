-- ============================================================================
-- QBase — Data Integrity Engine & Retrofitting Hub (v4 — User Content Check)
-- Migration: 20260622_data_integrity.sql
-- Purpose: Deep scalar check that ignores structural defaults (serial numbers,
--          row indices, booleans, N/A placeholders) and only counts genuine
--          user-typed text as evidence of population.
-- Batman must run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ============================================================================
-- 1. Helper: jsonb_has_user_content(p_data jsonb, p_serial text)
--    Recursively walks JSONB. Returns true if AT LEAST ONE genuine user-typed
--    text string exists anywhere in the payload.
--
--    What counts as GENUINE user content:
--      • String that is non-empty, non-whitespace
--      • Does NOT match the record's own serial (p_serial)
--      • Is NOT a standalone row index ("1", "2", "3", ... "99")
--      • Is NOT a boolean "true"/"false" string
--
--    What does NOT count:
--      • Numbers (any) — structural, not user text
--      • Booleans — structural flags
--      • null — absence
--      • "" / "   " — empty/whitespace
--      • Strings matching p_serial — system metadata
--      • Strings that are just 1-2 digit integers — row indices
-- ============================================================================

DROP FUNCTION IF EXISTS public.jsonb_has_user_content(p_data jsonb, p_serial text) CASCADE;

CREATE OR REPLACE FUNCTION public.jsonb_has_user_content(p_data jsonb, p_serial text DEFAULT '')
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
  v_trimmed text;
BEGIN
  IF p_data IS NULL THEN
    RETURN false;
  END IF;

  v_type := jsonb_typeof(p_data);

  -- Only strings can be genuine user content
  IF v_type = 'string' THEN
    v_text := p_data #>> '{}';
    IF v_text IS NULL THEN RETURN false; END IF;
    v_trimmed := btrim(v_text);
    IF v_trimmed = '' THEN RETURN false; END IF;
    -- Ignore if it matches the record's own serial
    IF p_serial IS NOT NULL AND p_serial != '' AND v_trimmed = p_serial THEN
      RETURN false;
    END IF;
    -- Ignore standalone row indices (1-2 digit integers as strings)
    IF v_trimmed ~ '^\d{1,2}$' THEN
      RETURN false;
    END IF;
    -- Ignore boolean string representations
    IF lower(v_trimmed) IN ('true', 'false') THEN
      RETURN false;
    END IF;
    -- Genuine user text!
    RETURN true;

  ELSIF v_type = 'number' THEN
    -- Numbers are structural, NOT user content
    RETURN false;

  ELSIF v_type = 'boolean' THEN
    RETURN false;

  ELSIF v_type = 'null' THEN
    RETURN false;

  ELSIF v_type = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF public.jsonb_has_user_content(v_val, p_serial) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;

  ELSIF v_type = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_data) LOOP
      IF public.jsonb_has_user_content(v_elem, p_serial) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jsonb_has_user_content(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_has_user_content(jsonb, text) TO service_role;

-- ============================================================================
-- 2. Helper: jsonb_has_any_text(p_data jsonb)
--    Simpler check for the CHECK constraint — does form_data contain at
--    least one non-empty string that isn't just a row index?
--    (No serial parameter — used in table-level constraint.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.jsonb_has_any_text(p_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.jsonb_has_any_text(p_data jsonb)
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
  v_trimmed text;
BEGIN
  IF p_data IS NULL THEN
    RETURN false;
  END IF;

  v_type := jsonb_typeof(p_data);

  IF v_type = 'string' THEN
    v_text := p_data #>> '{}';
    IF v_text IS NULL THEN RETURN false; END IF;
    v_trimmed := btrim(v_text);
    IF v_trimmed = '' THEN RETURN false; END IF;
    -- Ignore 1-2 digit integers (row indices)
    IF v_trimmed ~ '^\d{1,2}$' THEN RETURN false; END IF;
    -- Ignore boolean strings
    IF lower(v_trimmed) IN ('true', 'false') THEN RETURN false; END IF;
    RETURN true;

  ELSIF v_type IN ('number', 'boolean', 'null') THEN
    RETURN false;

  ELSIF v_type = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF public.jsonb_has_any_text(v_val) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;

  ELSIF v_type = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_data) LOOP
      IF public.jsonb_has_any_text(v_elem) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jsonb_has_any_text(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_has_any_text(jsonb) TO service_role;

-- ============================================================================
-- 3. RPC: get_empty_records()
--    Returns all active records where form_data has NO genuine user content
--    (ignoring serial, row indices, numbers, booleans, empty strings).
--    Now passes each record's serial to the deep check function.
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
    NOT public.jsonb_has_user_content(r.form_data, r.serial) AS is_empty
  FROM public.records r
  WHERE r.deleted_at IS NULL
    AND NOT public.jsonb_has_user_content(r.form_data, r.serial);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_empty_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_empty_records() TO service_role;

-- ============================================================================
-- 4. RPC: get_record_count()
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
-- 5. CHECK CONSTRAINT: records_form_data_has_text (NOT VALID)
--    Uses jsonb_has_any_text (no serial param — constraint-level).
--    Blocks future inserts/updates where form_data has no genuine text.
--    NOT VALID = existing records can be updated freely.
-- ============================================================================

-- Drop old constraints
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_has_content;
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_not_empty;
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_form_data_has_text;

ALTER TABLE public.records
  ADD CONSTRAINT records_form_data_has_text
  CHECK (public.jsonb_has_any_text(form_data)) NOT VALID;

-- ============================================================================
-- Cleanup: drop old v3 helper if exists
-- ============================================================================
DROP FUNCTION IF EXISTS public.jsonb_has_nonempty_scalar(p_data jsonb) CASCADE;

-- ============================================================================
-- Verification (run after applying):
--   SELECT count(*) FROM get_empty_records();         -- true ghost count (v4)
--   SELECT get_record_count();                         -- total active records
--   SELECT serial, form_code, form_data FROM get_empty_records() ORDER BY serial;
-- ============================================================================