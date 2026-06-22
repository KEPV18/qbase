-- ============================================================================
-- QBase — PENDING BATCH: Apply in Supabase Dashboard SQL Editor
-- ============================================================================
-- This file combines 2 pending migrations that need manual application.
--
-- HOW TO APPLY:
--   1. Log into Supabase Dashboard: https://supabase.com/dashboard
--   2. Select project: iouuikteroixnsqazznc (Vezloo QMS / qbase)
--   3. Open SQL Editor → New query
--   4. Paste this ENTIRE file → Run
--   5. Verify with the queries at the bottom
--
-- IDEMPOTENT — safe to run multiple times.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 1: user_roles unique constraint (user_id)
-- ════════════════════════════════════════════════════════════════════════════
-- PURPOSE: Prevent duplicate user_roles rows for the same user.
--          The app's upsert logic fails without this constraint.

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 2: Profiles RLS Hardening (from 20260617_c3_profiles_rls_fix.sql)
-- ════════════════════════════════════════════════════════════════════════════
-- PURPOSE: Fix data leak where any authenticated user can read ALL profiles.
--          After this: users read ONLY their own profile; admins read all.

-- 1. Ensure is_admin() exists (SECURITY DEFINER, no RLS recursion)

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Enable RLS on profiles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing SELECT policies on profiles

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_any" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;

-- 4. Create strict SELECT policy: own profile OR admin

CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- 5. Tighten INSERT/UPDATE: own profile only, admins can write all

DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "profiles_insert_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

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

-- 6. DELETE: own profile only, admin can delete all

DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_delete_own_or_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after, check output)
-- ════════════════════════════════════════════════════════════════════════════

-- Check constraint exists:
-- SELECT conname FROM pg_constraint WHERE conname = 'user_roles_user_id_unique';

-- Check profiles policies:
-- SELECT polname, polcmd, polqual, polwithcheck FROM pg_policies WHERE tablename = 'profiles';

-- Check is_admin function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'is_admin';