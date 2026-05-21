import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
    link?: string;
    data?: unknown;
    created_by?: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setNotifications(data as AppNotification[]);
        }
        setLoading(false);
    }, []);

    // Initial load + realtime subscription
    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNotifications]);

    const addNotification = async (notif: {
        type: string;
        title: string;
        message: string;
        link?: string;
        data?: unknown;
        targetUserIds: string[]; // who should receive it
    }) => {
        const { data: { user } } = await supabase.auth.getUser();
        const rows = notif.targetUserIds.map(uid => ({
            user_id: uid,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link || null,
            data: notif.data || null,
            created_by: user?.id || null,
        }));

        await supabase.from('notifications').insert(rows);
    };

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const removeNotification = async (id: string) => {
        await supabase.from('notifications').delete().eq('id', id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('notifications').delete().eq('user_id', user.id);
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        removeNotification,
        clearAll,
        refetch: fetchNotifications,
    };
}

/** Helper: fetch all admin user IDs */
export async function getAdminUserIds(): Promise<string[]> {
    const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
    return (data || []).map(r => r.user_id);
}
