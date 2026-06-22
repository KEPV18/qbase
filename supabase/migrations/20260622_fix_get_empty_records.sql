-- ============================================================================
-- QBase — Fix get_empty_records: remove non-existent department column
-- ============================================================================
-- The records table has NO department column. This migration recreates
-- get_empty_records() without referencing r.department.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_empty_records() CASCADE;

CREATE OR REPLACE FUNCTION public.get_empty_records()
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
    r.section,
    r.section_name,
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