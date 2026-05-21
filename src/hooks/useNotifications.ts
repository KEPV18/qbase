// ============================================================================
// QMS Forge — Notification Intelligence Hook
// Structured categories, priority, real-time, filtering, sound.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      log.error('notifications', `Fetch failed: ${error.message}`);
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
  }, []);

  // Notification refresh — polling-based (Realtime WebSocket disabled)
  // Supabase Realtime WebSocket fails with "HTTP Authentication failed" when
  // connecting through Cloudflare. The __cf_bm cookie rejection and auth
  // errors in console come from WebSocket connection attempts.
  // Using polling until Realtime auth is properly configured.
  useEffect(() => {
    fetchNotifications();

    // Poll every 30s for notification updates
    const pollInterval = setInterval(fetchNotifications, 30_000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchNotifications]);

  // ─── Actions ───────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select('id');

    if (error) {
      log.error('notifications', `markAsRead failed: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      log.warn('notifications', `markAsRead had no effect (RLS?) for id: ${id}`);
      await fetchNotifications();
      return;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAsUnread = async (id: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: false })
      .eq('id', id)
      .select('id');

    if (error) {
      log.error('notifications', `markAsUnread failed: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await fetchNotifications();
      return;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select('id');

    if (error) {
      log.error('notifications', `markAllRead failed: ${error.message}`);
      return;
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = async (id: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      log.error('notifications', `removeNotification failed: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await fetchNotifications();
      return;
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      log.error('notifications', `clearAll failed: ${error.message}`);
      return;
    }
    setNotifications([]);
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

export async function getAdminUserIds(): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  return (data || []).map(r => r.user_id);
}

export async function getLeadershipUserIds(): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'manager']);
  return (data || []).map(r => r.user_id);
}