-- ============================================================================
-- QBase Fix: Add missing columns and RPC
-- ============================================================================

-- 1. Add department column to user_roles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'department'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN department VARCHAR(50);
  END IF;
END $$;

-- 2. Add department column to profiles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'department'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN department VARCHAR(50);
  END IF;
END $$;

-- 3. Create notifications table (if missing)
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'system',
    priority TEXT DEFAULT 'info',
    event_type TEXT DEFAULT 'system.generic',
    actor_id UUID,
    target_id UUID,
    link TEXT,
    data JSONB DEFAULT '{}',
    created_by UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- 4. Create create_notifications_batch RPC
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
SET search_path = pg_catalog, public
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

-- 5. RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 6. Permissions
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(UUID[],TEXT,TEXT,TEXT,TEXT,TEXT,UUID,UUID,TEXT,JSONB,UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
