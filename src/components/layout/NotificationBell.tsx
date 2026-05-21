import { Bell, X, Check, Trash2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, removeNotification, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="relative" ref={ref}>
            <button
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-sm flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-sm shadow-xl overflow-hidden z-50 animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-bold">Notifications</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-destructive font-medium">
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={cn(
                                        "px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
                                        !n.read && "bg-primary/5 border-l-2 border-l-primary"
                                    )}
                                    onClick={() => {
                                        if (!n.read) markAsRead(n.id);
                                        if (n.link) {
                                            navigate(n.link);
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{n.title}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.created_at)}</p>
                                        </div>
                                        <button
                                            aria-label="Dismiss notification"
                                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                                            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
