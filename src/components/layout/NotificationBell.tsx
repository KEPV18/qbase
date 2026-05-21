// ============================================================================
// QMS Forge — Notification Bell (TopNav)
// Priority-aware badge, category-aware dropdown, sound integration.
// ============================================================================

import { Bell, CheckCheck, EyeOff, Trash2, Shield, FileText, Users, Server, Building2, Info, ArrowRight } from "lucide-react";
import { useNotifications, type AppNotification, type NotificationCategory, type SoundLevel, SOUND_LEVELS } from "@/hooks/useNotifications";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  records: FileText,
  users: Users,
  security: Shield,
  system: Server,
  tenant: Building2,
  default: Info,
};

const PRIORITY_STYLES: Record<string, { dot: string; bg: string }> = {
  critical:  { dot: "bg-destructive", bg: "bg-destructive/10" },
  important: { dot: "bg-amber-500",   bg: "bg-amber-500/10" },
  info:     { dot: "bg-muted-foreground/50", bg: "bg-muted/50" },
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell() {
  const { notifications, unreadCount, criticalCount, markAsRead, markAllRead, clearAll, soundLevel, setSoundLevel } = useNotifications();
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

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px] font-bold rounded-sm flex items-center justify-center",
            criticalCount > 0
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          )}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-sm shadow-xl overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Notifications</h3>
              {criticalCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive">
                  {criticalCount} critical
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded-sm hover:bg-muted/50">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-destructive font-medium px-1.5 py-0.5 rounded-sm hover:bg-muted/50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Sound toggle */}
              <button
                onClick={() => {
                  const levels: SoundLevel[] = ['off', 'critical_only', 'all_important'];
                  setSoundLevel(levels[(levels.indexOf(soundLevel) + 1) % levels.length]);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded-sm hover:bg-muted/50"
                title={`Sound: ${SOUND_LEVELS[soundLevel].label}`}
              >
                🔔
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="max-h-[400px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              recent.map(n => {
                const CatIcon = CATEGORY_ICONS[n.category] || CATEGORY_ICONS.default;
                const priStyle = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer",
                      !n.read && "bg-primary/[0.02]"
                    )}
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                      if (n.link) { setOpen(false); navigate(n.link); }
                    }}
                  >
                    <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center shrink-0", priStyle.bg)}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!n.read && <div className={cn("w-1.5 h-1.5 rounded-full", priStyle.dot)} />}
                        <p className={cn("text-xs font-semibold truncate", !n.read && "text-foreground", n.read && "text-muted-foreground")}>
                          {n.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.message}</p>
                      <span className="text-[9px] text-muted-foreground/60">{formatTimeAgo(n.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border bg-muted/20">
              <Button
                variant="ghost"
                className="w-full text-xs font-medium py-2"
                onClick={() => { setOpen(false); navigate("/notifications"); }}
              >
                View All Notifications
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}