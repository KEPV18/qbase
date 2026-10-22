-- ============================================================================
-- QBase — notification contract (2026-10-22)
--
-- WHY
--
-- The app could not create a single notification against the restored
-- project.  Two independent defects, both proven against the live schema:
--
--  1. The enum types were narrower than the vocabulary the app emits.
--     src/services/eventBus.ts classifies every event as one of
--     'records' | 'users' | 'security' | 'system' | 'tenant' and one of
--     'critical' | 'important' | 'info', but public.notification_category
--     held only ('system','records') and public.notification_priority only
--     ('info','important').  The surviving function casts those strings to
--     the enum types, so every 'users' / 'security' / 'tenant' / 'critical'
--     event raised:
--         invalid input value for enum notification_category: "security"
--
--  2. Two overloads of public.create_notifications_batch existed and the
--     wrong one was reached first:
--       - (... uuid,uuid,text,jsonb,uuid)  SECURITY DEFINER, but inserts
--         into a column named is_read that public.notifications does not
--         have  -> "column \"is_read\" of relation \"notifications\" does
--         not exist"
--       - (... text,text,text,jsonb,text)  the only executable one, but it
--         is NOT SECURITY DEFINER, and the table's RLS has a RESTRICTIVE
--         policy (rls_deny_notifications_insert, WITH CHECK false) that
--         refuses INSERT for the authenticated role -> every call made by
--         a signed-in user failed with a row-level-security violation.
--     The function had the default ACL as well, so EXECUTE was granted to
--     PUBLIC: the SECURITY DEFINER overload let an anonymous caller write
--     notifications for any user, because the owner role bypasses RLS.
--
-- WHAT THIS MIGRATION DOES
--
--  * adds the missing enum values (additive, no data rewritten);
--  * leaves exactly ONE public.create_notifications_batch, SECURITY
--    DEFINER with a pinned search_path, writing the columns the table
--    actually has;
--  * drops the dead overload that could never run;
--  * revokes EXECUTE from PUBLIC/anon and grants it to the two roles that
--    legitimately call it.
--
-- Idempotent: every statement is safe to re-run.
-- Reversible: 20261022_07_notification_contract.rollback.sql
-- ============================================================================

-- 1. The enum vocabulary the app emits --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e
                 JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'notification_category'
                   AND e.enumlabel = 'users') THEN
    ALTER TYPE public.notification_category ADD VALUE 'users';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e
                 JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'notification_category'
                   AND e.enumlabel = 'security') THEN
    ALTER TYPE public.notification_category ADD VALUE 'security';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e
                 JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'notification_category'
                   AND e.enumlabel = 'tenant') THEN
    ALTER TYPE public.notification_category ADD VALUE 'tenant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e
                 JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'notification_priority'
                   AND e.enumlabel = 'critical') THEN
    ALTER TYPE public.notification_priority ADD VALUE 'critical';
  END IF;
END $$;

-- 2. One function, SECURITY DEFINER, pinned search_path, real columns -----
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'system',
  p_priority TEXT DEFAULT 'info',
  p_event_type TEXT DEFAULT NULL,
  p_actor_id TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  uid UUID;
BEGIN
  FOREACH uid IN ARRAY p_user_ids LOOP
    INSERT INTO public.notifications (
      user_id, title, message, category, priority, event_type,
      actor_id, target_id, link, data, created_by, read
    ) VALUES (
      uid,
      p_title,
      p_message,
      p_category::notification_category,
      p_priority::notification_priority,
      p_event_type,
      p_actor_id::uuid,
      p_target_id::uuid,
      p_link,
      COALESCE(p_data, '{}'::jsonb),
      p_created_by::uuid,
      false
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;

-- 3. Drop the dead overload: it inserts into a column that does not exist
--    and it is the one PUBLIC could reach as a SECURITY DEFINER. -----------
DROP FUNCTION IF EXISTS public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, JSONB, UUID);

-- 4. Least privilege: the function is SECURITY DEFINER, so only the roles
--    that are supposed to notify may run it. -------------------------------
REVOKE ALL ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;
