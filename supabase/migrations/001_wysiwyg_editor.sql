-- ============================================================================
-- QBase WYSIWYG Document Editor — Database Migration
-- Run this in Supabase Dashboard SQL Editor (or psql)
-- ============================================================================

-- 1. Extend records table with new columns
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS version_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS latest_version_id UUID,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS linked_project TEXT,
  ADD COLUMN IF NOT EXISTS coverage_month TEXT,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;

-- 2. Initialize version_number for existing records
UPDATE records SET version_number = 1 WHERE version_number IS NULL;

-- 3. Create record_versions table for audit trail
CREATE TABLE IF NOT EXISTS record_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT,
  change_type TEXT CHECK (change_type IN ('create', 'edit', 'save', 'copy', 'delete', 'approve', 'reject')),
  diff_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_record_versions_record_id ON record_versions(record_id);
CREATE INDEX IF NOT EXISTS idx_record_versions_version_number ON record_versions(record_id, version_number);
CREATE INDEX IF NOT EXISTS idx_record_versions_changed_at ON record_versions(changed_at DESC);

-- 5. RLS policies for record_versions
ALTER TABLE record_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "record_versions_select" ON record_versions;
CREATE POLICY "record_versions_select" ON record_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_versions.record_id
      AND (
        r.created_by = auth.uid()
        OR r.status = 'approved'
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'qa_manager', 'auditor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "record_versions_insert" ON record_versions;
CREATE POLICY "record_versions_insert" ON record_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_versions.record_id
      AND (
        r.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'editor', 'qa_manager')
        )
      )
    )
  );

-- 6. RPC: Save a new version atomically
DROP FUNCTION IF EXISTS save_record_version(UUID, JSONB, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION save_record_version(
  p_record_id UUID,
  p_form_data JSONB,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_change_type TEXT DEFAULT 'edit'
) RETURNS UUID AS $$
DECLARE
  v_new_version_id UUID;
  v_new_version_number INT;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_changed_by;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version_number
  FROM record_versions
  WHERE record_id = p_record_id;

  -- Insert version
  INSERT INTO record_versions (
    record_id, version_number, form_data,
    changed_by, change_reason, change_type
  ) VALUES (
    p_record_id, v_new_version_number, p_form_data,
    p_changed_by, p_change_reason, p_change_type
  )
  RETURNING id INTO v_new_version_id;

  -- Update record with new version info
  UPDATE records SET
    form_data = p_form_data,
    version_number = v_new_version_number,
    latest_version_id = v_new_version_id,
    edit_count = COALESCE(edit_count, 0) + 1,
    updated_at = NOW(),
    last_modified_by = v_user_email
  WHERE id = p_record_id;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Lock record for editing (prevents concurrent edits)
DROP FUNCTION IF EXISTS lock_record_for_edit(UUID, UUID);
CREATE OR REPLACE FUNCTION lock_record_for_edit(
  p_record_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock UUID;
  v_current_lock_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check current lock
  SELECT locked_by, locked_at
  INTO v_current_lock, v_current_lock_time
  FROM records WHERE id = p_record_id;

  -- If locked by someone else and less than 30 min ago, fail
  IF v_current_lock IS NOT NULL
     AND v_current_lock != p_user_id
     AND v_current_lock_time > NOW() - INTERVAL '30 minutes' THEN
    RETURN FALSE;
  END IF;

  -- Lock the record
  UPDATE records SET
    locked_by = p_user_id,
    locked_at = NOW()
  WHERE id = p_record_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Unlock record after editing
DROP FUNCTION IF EXISTS unlock_record(UUID, UUID);
CREATE OR REPLACE FUNCTION unlock_record(
  p_record_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE records SET
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_record_id
    AND (locked_by = p_user_id OR locked_by IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Get paginated version history
DROP FUNCTION IF EXISTS get_record_version_history(UUID, INT, INT);
CREATE OR REPLACE FUNCTION get_record_version_history(
  p_record_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  version_id UUID,
  version_number INT,
  changed_by_email TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,
  change_reason TEXT,
  change_type TEXT,
  diff_summary JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id AS version_id,
    rv.version_number,
    u.email AS changed_by_email,
    rv.changed_at,
    rv.change_reason,
    rv.change_type,
    rv.diff_summary
  FROM record_versions rv
  LEFT JOIN auth.users u ON rv.changed_by = u.id
  WHERE rv.record_id = p_record_id
  ORDER BY rv.version_number DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 10. RPC: Restore a previous version (creates new version with copy of old data)
DROP FUNCTION IF EXISTS restore_record_version(UUID, UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION restore_record_version(
  p_record_id UUID,
  p_version_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_old_data JSONB;
  v_new_version_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the old version's data
  SELECT form_data INTO v_old_data
  FROM record_versions
  WHERE id = p_version_id AND record_id = p_record_id;

  IF v_old_data IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

  -- Save as new version
  v_new_version_id := save_record_version(
    p_record_id,
    v_old_data,
    p_user_id,
    COALESCE(p_reason, 'Restored from version ' || p_version_id),
    'copy'
  );

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant execute permissions
GRANT EXECUTE ON FUNCTION save_record_version(UUID, JSONB, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION lock_record_for_edit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_record(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_version_history(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_record_version(UUID, UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
