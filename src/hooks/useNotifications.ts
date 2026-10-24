// ============================================================================
// QBase — Notification Intelligence Hook
// Structured categories, priority, real-time, filtering, sound.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { log } from '@/services/logger';

// ============================================================================
// Types
// ============================================================================

export type NotificationCategory = 'records' | 'users' | 'security' | 'system' | 'tenant';
export type NotificationPriority = 'critical' | 'important' | 'info';

export interface AppNotification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  event_type: string | null;
  title: string;
  message: string;
  link: string | null;
  data: Record<string, unknown> | null;
  actor_id: string | null;
  target_id: string | null;
  read: boolean;
  created_by: string | null;
  created_at: string;
  // Legacy compat
  type?: string;
}

export type NotificationFilter = 'all' | 'unread' | NotificationCategory;

// ============================================================================
// Sound Configuration
// ============================================================================

export type SoundLevel = 'off' | 'critical_only' | 'all_important';

const SOUND_LEVELS: Record<SoundLevel, { label: string; description: string }> = {
  off: { label: 'Off', description: 'No sound notifications' },
  critical_only: { label: 'Critical Only', description: 'Sound for critical events only' },
  all_important: { label: 'All Important', description: 'Sound for critical and important events' },
};

export { SOUND_LEVELS };

function getStoredSoundLevel(): SoundLevel {
  return (localStorage.getItem('notificationSoundLevel') as SoundLevel) || 'critical_only';
}

function shouldPlaySound(priority: NotificationPriority, level: SoundLevel): boolean {
  if (level === 'off') return false;
  if (level === 'critical_only') return priority === 'critical';
  if (level === 'all_important') return priority === 'critical' || priority === 'important';
  return false;
}

// Browser audio using Web Audio API — different tones per priority
function playNotificationSound(priority: NotificationPriority) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (priority === 'critical') {
      // Urgent double-beep: two short high-pitched tones
      oscillator.frequency.value = 932; // Bb5
      oscillator.type = 'square';
      gain.gain.value = 0.12;
      oscillator.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscillator.stop(ctx.currentTime + 0.4);
    } else if (priority === 'important') {
      // Single clean chime: sine wave descending
      oscillator.frequency.value = 660; // E5
      oscillator.type = 'sine';
      gain.gain.value = 0.1;
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Audio not supported or blocked — silent fail
  }
}

// Test function — plays sound for each priority (used by settings)
export function testNotificationSound(priority: NotificationPriority) {
  playNotificationSound(priority);
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundLevel, setSoundLevelState] = useState<SoundLevel>(getStoredSoundLevel());
  const previousCountRef = useRef(0);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      log.system.error('notifications', `Fetch failed: ${error.message}`);
      // The spinner must come down on the failure path too.  It used to be
      // left spinning for ever: the error branch returned before the
      // `setLoading(false)` below, and the page waited on a fetch that had
      // already failed.
      setLoading(false);
      return;
    }

    if (data) {
      const newNotifications = data as AppNotification[];

      // Sound: only play for NEW notifications (not initial load)
      const prevCount = previousCountRef.current;
      if (prevCount > 0 && newNotifications.length > prevCount) {
        const newest = newNotifications[0];
        const level = getStoredSoundLevel();
        if (shouldPlaySound(newest.priority, level)) {
          playNotificationSound(newest.priority);
        }
      }
      previousCountRef.current = newNotifications.length;

      setNotifications(newNotifications);
    }
    setLoading(false);
  }, [user?.id]); // stable refetch when user changes

  // Notification refresh — polling-based (Realtime WebSocket disabled)
  // Supabase Realtime WebSocket fails with "HTTP Authentication failed" when
  // connecting through Cloudflare. The __cf_bm cookie rejection and auth
  // errors in console come from WebSocket connection attempts.
  // Using polling until Realtime auth is properly configured.
  useEffect(() => {
    fetchNotifications();

    // Poll every 60s for notification updates (reduced from 30s to save quota)
    const pollInterval = setInterval(fetchNotifications, 60_000);

    // Refetch immediately when user returns to the tab
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications]);

  // ─── Actions ───────────────────────────────────────────────

  const markAsRead = async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select('id');

    if (error) {
      log.system.error('notifications', `markAsRead failed: ${error.message}`);
      return false;
    }
    if (!data || data.length === 0) {
      log.system.warn('notifications', `markAsRead had no effect (RLS?) for id: ${id}`);
      await fetchNotifications();
      return false;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    return true;
  };

  const markAsUnread = async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: false })
      .eq('id', id)
      .select('id');

    if (error) {
      log.system.error('notifications', `markAsUnread failed: ${error.message}`);
      return false;
    }
    if (!data || data.length === 0) {
      await fetchNotifications();
      return false;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    return true;
  };

  const markAllRead = async (): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select('id');

    if (error) {
      log.system.error('notifications', `markAllRead failed: ${error.message}`);
      return false;
    }
    // An update RLS refuses still answers 200 with zero rows.  Marking
    // every notification read locally anyway showed a clean inbox that the
    // server did not have — the next poll brought the unread ones straight
    // back with no explanation.
    if (!data || data.length === 0) {
      log.system.warn('notifications', 'markAllRead had no effect (RLS?)');
      await fetchNotifications();
      return false;
    }
    const updated = new Set((data as { id: string }[]).map(r => r.id));
    setNotifications(prev => prev.map(n => (updated.has(n.id) ? { ...n, read: true } : n)));
    return true;
  };

  const removeNotification = async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      log.system.error('notifications', `removeNotification failed: ${error.message}`);
      return false;
    }
    if (!data || data.length === 0) {
      await fetchNotifications();
      return false;
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    return true;
  };

  const clearAll = async (): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      log.system.error('notifications', `clearAll failed: ${error.message}`);
      return false;
    }
    // Same as markAllRead: zero rows means the delete was refused, not
    // that the inbox was already empty.
    if (!data || data.length === 0) {
      log.system.warn('notifications', 'clearAll had no effect (RLS?)');
      await fetchNotifications();
      return false;
    }
    setNotifications([]);
    return true;
  };

  // ─── Sound Configuration ───────────────────────────────────

  const setSoundLevel = useCallback((level: SoundLevel) => {
    localStorage.setItem('notificationSoundLevel', level);
    setSoundLevelState(level);
  }, []);

  // ─── Computed ──────────────────────────────────────────────

  const unreadCount = notifications.filter(n => !n.read).length;

  const criticalCount = notifications.filter(n => !n.read && n.priority === 'critical').length;
  const importantCount = notifications.filter(n => !n.read && n.priority === 'important').length;

  const getByCategory = useCallback((category: NotificationCategory) =>
    notifications.filter(n => n.category === category),
    [notifications]
  );

  const getByPriority = useCallback((priority: NotificationPriority) =>
    notifications.filter(n => n.priority === priority),
    [notifications]
  );

  const getUnreadByCategory = useCallback((category: NotificationCategory) =>
    notifications.filter(n => n.category === category && !n.read),
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    criticalCount,
    importantCount,
    loading,
    markAsRead,
    markAsUnread,
    markAllRead,
    removeNotification,
    clearAll,
    refetch: fetchNotifications,
    getByCategory,
    getByPriority,
    getUnreadByCategory,
    soundLevel,
    setSoundLevel,
  };
}

// ============================================================================
// Helper: Get admin user IDs (for event targeting)
// ============================================================================

// These two lists come from SECURITY DEFINER RPCs rather than from a read
// of the whole `user_roles` table.  That table's SELECT policy was
// `USING (true)`, so reading it exposed every user's role and department
// to every signed-in account; migration 12 dropped that policy and added
// these two functions in its place.  They return the same ids.
export async function getAdminUserIds(): Promise<string[]> {
  const { data } = await supabase.rpc('prime_admin_user_ids');
  return Array.isArray(data) ? (data as string[]) : [];
}

export async function getLeadershipUserIds(): Promise<string[]> {
  const { data } = await supabase.rpc('prime_leadership_user_ids');
  return Array.isArray(data) ? (data as string[]) : [];
}