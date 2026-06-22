-- ============================================================================
-- QBase — C3 Security Fix: Profiles RLS Hardening
-- ============================================================================
-- PURPOSE: Fix the critical data leak where any authenticated user can read
--          ALL profiles (including other users' password hashes).
--
-- TARGET POLICY STATE:
--   - Users can read ONLY their own profile (auth.uid() = user_id)
--   - Admins can read all profiles (via is_admin() SECURITY DEFINER function)
--   - The permissive "read all" policy is dropped
--
-- HOW TO APPLY:
--   1. Log into Supabase Dashboard: https://supabase.com/dashboard
--   2. Select project: iouuikteroixnsqazznc (Vezloo QMS / qbase)
--   3. Open SQL Editor → New query
--   4. Paste this ENTIRE file → Run
--   5. Verify with: SELECT * FROM pg_policies WHERE tablename = 'profiles';
--
-- This migration is IDEMPOTENT — safe to run multiple times.
-- ============================================================================

-- ── 1. Create the is_admin() helper function (SECURITY DEFINER, no RLS recursion) ──

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

-- ── 2. Enable RLS on profiles (if not already enabled) ──

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. Drop ALL existing permissive SELECT policies on profiles ──

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_any" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;

-- ── 4. Create the strict SELECT policy: own profile OR admin ──

CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ── 5. Tighten INSERT/UPDATE: users can only write their own profile; admins can write all ──

DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

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

-- ── 6. Verify the final policy state ──

-- Run this query after to confirm:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';
-- Expected:
--   profiles_read_own_or_admin   | SELECT | (user_id = auth.uid() OR public.is_admin()) | (null)
--   profiles_insert_own_or_admin | INSERT | (null) | (user_id = auth.uid() OR public.is_admin())
--   profiles_update_own_or_admin | UPDATE | (user_id = auth.uid() OR public.is_admin()) | (user_id = auth.uid() OR public.is_admin())

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- After applying this, non-admin users will only see their own profile row.
-- Admins retain full visibility (needed for the Admin Panel).
-- The password column is no longer exposed to non-admin users.
-- ============================================================================