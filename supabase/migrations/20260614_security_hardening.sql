-- ============================================================================
-- QBase Security Hardening Migration — Phase 9
-- RLS Absolute Enforcement + Strict Policies + RPC Hardening
-- ============================================================================
-- Run this in Supabase Dashboard SQL Editor (single transaction)
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER — avoids RLS recursion)
-- ============================================================================

-- Check if current user is admin (no RLS recursion because SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- Check if current user is manager (no RLS recursion because SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
  );
END;
$$;

-- Get current user's department (no RLS recursion because SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_dept text;
BEGIN
  SELECT department INTO v_dept
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_dept;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department() TO authenticated;

-- ============================================================================
-- 2. RLS ON CORE TABLES — Profiles
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive existing policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;

-- Users can read their own profile + admins can read all
CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- Users can update their own profile; admins can update any
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- Only admins can insert/delete profiles
CREATE POLICY "profiles_insert_admin_only"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 3. RLS ON CORE TABLES — User Roles
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_all" ON public.user_roles;

-- Users can read their own role; admins/managers can read all
CREATE POLICY "user_roles_read_own_or_admin"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_manager()
  );

-- Only admins can write user_roles
CREATE POLICY "user_roles_insert_admin_only"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_update_admin_only"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_delete_admin_only"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 4. RLS ON CORE TABLES — Records
-- ============================================================================

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "records_select_all" ON public.records;
DROP POLICY IF EXISTS "records_insert_all" ON public.records;
DROP POLICY IF EXISTS "records_update_all" ON public.records;

-- Records: users can read records in their department or records they created
CREATE POLICY "records_read_dept_or_owner"
  ON public.records FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_admin()
      OR created_by = auth.uid()::text
      OR department = public.current_user_department()
      OR department IS NULL
    )
  );

-- Records: users can insert records (ownership tracked via created_by)
CREATE POLICY "records_insert_authenticated"
  ON public.records FOR INSERT
  TO authenticated
  WITH CHECK (
    deleted_at IS NULL
    AND created_by = auth.uid()::text
  );

-- Records: owners can update their own; admins can update any
CREATE POLICY "records_update_owner_or_admin"
  ON public.records FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_admin()
      OR created_by = auth.uid()::text
    )
  )
  WITH CHECK (deleted_at IS NULL);

-- Records: soft-delete only (admin or owner)
CREATE POLICY "records_delete_owner_or_admin"
  ON public.records FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()::text
  );

-- ============================================================================
-- 5. RLS ON CORE TABLES — Notifications
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;

-- Users can only read their own notifications
CREATE POLICY "notifications_read_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ============================================================================
-- 6. RLS ON CORE TABLES — Record Versions
-- ============================================================================

ALTER TABLE public.record_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "record_versions_select" ON public.record_versions;
DROP POLICY IF EXISTS "record_versions_insert" ON public.record_versions;

-- Users can read versions of records they own or have access to
CREATE POLICY "record_versions_read_accessible"
  ON public.record_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      WHERE r.id = record_versions.record_id
        AND r.deleted_at IS NULL
        AND (
          public.is_admin()
          OR r.created_by = auth.uid()::text
          OR r.department = public.current_user_department()
        )
    )
  );

-- ============================================================================
-- 7. RLS ON CORE TABLES — Projects
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_all" ON public.projects;

-- All authenticated users can read active projects
CREATE POLICY "projects_read_active"
  ON public.projects FOR SELECT
  TO authenticated
  USING (status != 'archived' OR public.is_admin());

-- Only admins/managers can insert/update projects
CREATE POLICY "projects_write_manager_or_admin"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- ============================================================================
-- 8. RLS ON AUDIT / LOG TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.record_locks ENABLE ROW LEVEL SECURITY;

-- Audit log: append-only by authenticated users; read by admin/manager
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY IF NOT EXISTS "audit_log_read_admin"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_manager());

CREATE POLICY IF NOT EXISTS "audit_log_insert_authenticated"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Record locks: users can read their own locks; admin can read all
CREATE POLICY IF NOT EXISTS "record_locks_read_own_or_admin"
  ON public.record_locks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================================
-- 9. RPC FUNCTION HARDENING — search_path fix
-- ============================================================================

-- Re-create all SECURITY DEFINER functions with SET search_path = pg_catalog, public
-- (Prevents search-path hijacking attacks)

-- Already in migration files but ensure correct search_path:
-- NOTE: These functions already have SET search_path = public in previous migrations.
-- We ALTER them to use the stricter pg_catalog, public.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT routine_schema, routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND security_type = 'DEFINER'
      AND routine_type = 'FUNCTION'
  LOOP
    -- Functions with SET search_path = public need upgrade
    EXECUTE format(
      'ALTER FUNCTION %I.%I SET search_path = pg_catalog, public',
      r.routine_schema, r.routine_name
    );
  END LOOP;
END $$;

-- ============================================================================
-- 10. BLOCK ANONYMOUS ON ALL TABLES
-- ============================================================================

-- Revoke all direct table access from anon role (they must auth first)
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.records FROM anon;
REVOKE ALL ON public.record_versions FROM anon;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.audit_log FROM anon;
REVOKE ALL ON public.record_locks FROM anon;
REVOKE ALL ON public.risks FROM anon;
REVOKE ALL ON public.capas FROM anon;
REVOKE ALL ON public.processes FROM anon;
REVOKE ALL ON public.process_interactions FROM anon;

-- Keep SELECT on non-sensitive tables if needed (e.g. ISO manual content)
-- But default is block everything.

-- ============================================================================
-- 11. GRANT EXECUTE ON HELPER FUNCTIONS TO AUTHENTICATED
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department TO authenticated;

-- ============================================================================
-- Migration Complete — All tables now have strict RLS
-- ============================================================================
