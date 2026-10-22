-- ============================================================================
-- QBase — rollback of 20261022_07_notification_contract.sql
--
-- Restores public.create_notifications_batch to the two overloads that
-- existed before the migration, with the bodies and the access rights they
-- had.  Run this only if the migration has to be undone.
--
-- The four enum values the migration added ('users', 'security', 'tenant'
-- on notification_category, 'critical' on notification_priority) are NOT
-- removed: PostgreSQL cannot drop a value from an enum without recreating
-- the type, which would rewrite public.notifications.  Leaving them in
-- place is additive and harmless — no row can hold a value that the
-- pre-migration code did not already allow.
--
-- A verified copy of everything this migration touches was taken before it
-- ran:  /home/kepv/QMS_BACKUP/pre-migration-20261022/
-- ============================================================================

-- The overload that was executable before (NOT security definer) -----------
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
AS $$
DECLARE
  inserted_count integer := 0;
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY p_user_ids
  LOOP
    INSERT INTO PUBLIC.notifications (
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

-- The dead overload that existed before (inserts into a column that does
-- not exist — recreated verbatim so the schema matches the backup) --------
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'system',
  p_priority TEXT DEFAULT 'info',
  p_event_type TEXT DEFAULT 'system.generic',
  p_actor_id UUID DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO notifications (
      user_id, title, message, category, priority,
      event_type, actor_id, target_id, link, data, created_by, is_read
    ) VALUES (
      v_user_id, p_title, p_message, p_category, p_priority,
      p_event_type, p_actor_id, p_target_id, p_link, p_data, p_created_by, false
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- The default ACL (EXECUTE to PUBLIC) that both overloads carried before --
REVOKE ALL ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, JSONB, UUID) TO PUBLIC;
