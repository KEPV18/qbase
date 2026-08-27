-- Phase 1: Database Schema & Versioning for WYSIWYG Document Editor
-- ============================================

-- Ensure pgcrypto is available for SHA256 checksums
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add new columns to records table
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS linked_project text,
  ADD COLUMN IF NOT EXISTS coverage_month date;

-- 2. Create record_versions table
CREATE TABLE IF NOT EXISTS public.record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  editor_content jsonb NOT NULL DEFAULT '{}',
  change_reason text,
  change_description text,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  checksum text,
  CONSTRAINT unique_record_version UNIQUE (record_id, version_number)
);

-- Index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_record_versions_record_id ON public.record_versions(record_id);
CREATE INDEX IF NOT EXISTS idx_record_versions_created_at ON public.record_versions(created_at);

-- 3. Enable RLS on record_versions
ALTER TABLE public.record_versions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read record versions
CREATE POLICY "Authenticated users can read record versions"
  ON public.record_versions FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert versions (RPC handles business logic)
CREATE POLICY "Authenticated users can insert record versions"
  ON public.record_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. RPC function: save_record_version
CREATE OR REPLACE FUNCTION public.save_record_version(
  p_record_id uuid,
  p_editor_content jsonb,
  p_change_reason text DEFAULT NULL,
  p_change_description text DEFAULT NULL,
  p_created_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_version integer;
  v_created_by uuid;
  v_checksum text;
  v_version_id uuid;
BEGIN
  -- Get current user
  v_created_by := auth.uid();
  IF v_created_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if record is locked by someone else
  IF EXISTS (
    SELECT 1 FROM public.records
    WHERE id = p_record_id
      AND locked_by IS NOT NULL
      AND locked_by != v_created_by
      AND locked_at > now() - interval '30 minutes'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record is locked by another user');
  END IF;

  -- Increment version number
  UPDATE public.records
  SET version_number = COALESCE(version_number, 1) + 1,
      edit_count = COALESCE(edit_count, 0) + 1,
      updated_at = now(),
      last_modified_by = v_created_by::text
  WHERE id = p_record_id
  RETURNING version_number INTO v_new_version;

  IF v_new_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- Generate simple checksum using pgcrypto
  v_checksum := encode(digest(p_editor_content::text, 'sha256'), 'hex');

  -- Insert version record
  INSERT INTO public.record_versions (
    record_id, version_number, editor_content, change_reason, change_description,
    created_by, created_by_name, checksum
  ) VALUES (
    p_record_id, v_new_version, p_editor_content, p_change_reason, p_change_description,
    v_created_by, p_created_by_name, v_checksum
  )
  RETURNING id INTO v_version_id;

  RETURN jsonb_build_object(
    'success', true,
    'version_id', v_version_id,
    'version_number', v_new_version,
    'checksum', v_checksum
  );
END;
$$;

-- 5. RPC function: lock_record_for_edit
CREATE OR REPLACE FUNCTION public.lock_record_for_edit(p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_locked_by uuid;
  v_locked_at timestamp with time zone;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT locked_by, locked_at INTO v_locked_by, v_locked_at
  FROM public.records WHERE id = p_record_id;

  IF v_locked_by IS NOT NULL AND v_locked_by != v_user_id
     AND v_locked_at > now() - interval '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record already locked by another user', 'locked_by', v_locked_by);
  END IF;

  UPDATE public.records
  SET locked_by = v_user_id,
      locked_at = now(),
      updated_at = now()
  WHERE id = p_record_id;

  RETURN jsonb_build_object('success', true, 'locked_by', v_user_id, 'locked_at', now());
END;
$$;

-- 6. RPC function: unlock_record
CREATE OR REPLACE FUNCTION public.unlock_record(p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_locked_by uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT locked_by INTO v_locked_by FROM public.records WHERE id = p_record_id;

  IF v_locked_by IS NOT NULL AND v_locked_by != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock record locked by another user');
  END IF;

  UPDATE public.records
  SET locked_by = NULL,
      locked_at = NULL,
      updated_at = now()
  WHERE id = p_record_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. RPC function: get_record_version_history
CREATE OR REPLACE FUNCTION public.get_record_version_history(p_record_id uuid)
RETURNS TABLE (
  version_id uuid,
  version_number integer,
  editor_content jsonb,
  change_reason text,
  change_description text,
  created_by uuid,
  created_by_name text,
  created_at timestamp with time zone,
  checksum text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id as version_id,
    rv.version_number,
    rv.editor_content,
    rv.change_reason,
    rv.change_description,
    rv.created_by,
    rv.created_by_name,
    rv.created_at,
    rv.checksum
  FROM public.record_versions rv
  WHERE rv.record_id = p_record_id
  ORDER BY rv.version_number DESC;
END;
$$;

-- 8. Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.save_record_version(uuid, jsonb, text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.lock_record_for_edit(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unlock_record(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_record_version_history(uuid) TO authenticated, anon;

-- 9. Enable realtime for record_versions
ALTER PUBLICATION supabase_realtime ADD TABLE public.record_versions;
