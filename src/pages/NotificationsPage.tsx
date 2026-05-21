// ============================================================================
// QMS Forge — Notification Center
// Structured, priority-aware, category-filtered, timeline-grouped.
// Production observability layer, not a UI enhancement.
// ============================================================================

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useNotifications, type AppNotification, type NotificationCategory, type NotificationPriority, type SoundLevel, SOUND_LEVELS } from "@/hooks/useNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateScreen } from "@/components/ui/StateScreen";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Bell, AlertTriangle, CheckCircle, Info, Shield, FileText,
  Users, Settings, Clock, CheckCheck, Trash2, ArrowRight,
  Volume2, VolumeX, Volume1, Search, ChevronDown, Eye, EyeOff,
  Server, Building2, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============================================================================
// Config
// ============================================================================

type FilterTab = "all" | "unread" | NotificationCategory;

const CATEGORY_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  records:   { icon: FileText,      color: "text-primary",     bg: "bg-primary/10",     label: "Records" },
  users:     { icon: Users,         color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Users" },
  security:  { icon: Shield,        color: "text-destructive", bg: "bg-destructive/10", label: "Security" },
  system:    { icon: Server,        color: "text-amber-500",  bg: "bg-amber-500/10",   label: "System" },
  tenant:    { icon: Building2,     color: "text-violet-500", bg: "bg-violet-500/10",  label: "Tenant" },
  default:   { icon: Info,          color: "text-muted-foreground", bg: "bg-muted/50",  label: "Info" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  critical:  { color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive", label: "Critical" },
  important: { color: "text-amber-500",  bg: "bg-amber-500/10",   dot: "bg-amber-500",   label: "Important" },
  info:      { color: "text-muted-foreground", bg: "bg-muted/50", dot: "bg-muted-foreground/50", label: "Info" },
};

const TABS: { id: FilterTab; label: string; icon: typeof Bell }[] = [
  { id: "all",      label: "All",        icon: Bell },
  { id: "unread",   label: "Unread",     icon: Eye },
  { id: "records",  label: "Records",    icon: FileText },
  { id: "security", label: "Security",   icon: Shield },
  { id: "users",    label: "Users",      icon: Users },
  { id: "system",   label: "System",     icon: Server },
  { id: "tenant",   label: "Tenant",     icon: Building2 },
];

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.default;
}

function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.info;
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getTimeGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return "Today";
  if (hours < 48) return "Yesterday";
  if (hours < 168) return "This Week";
  return "Older";
}

/** Derive an action link from notification metadata */
function getNotificationAction(notif: AppNotification) {
  if (notif.link) {
    return { label: "Open", path: notif.link };
  }
  // Category-based defaults
  if (notif.category === 'records' && notif.data?.serial) {
    return { label: "View Record", path: `/records/${encodeURIComponent(notif.data.serial as string)}` };
  }
  if (notif.category === 'security') {
    return { label: "Audit Log", path: "/audit" };
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, criticalCount, loading,
    markAsRead, markAsUnread, markAllRead, clearAll,
    soundLevel, setSoundLevel,
    getByCategory, getUnreadByCategory,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // ─── Filtered + searched notifications ────────────────
  const filtered = useMemo(() => {
    let items = notifications;

    if (filter === "unread") {
      items = items.filter(n => !n.read);
    } else if (filter !== "all") {
      items = getByCategory(filter as NotificationCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.event_type || "").toLowerCase().includes(q) ||
        (n.data?.serial as string || "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [notifications, filter, search, getByCategory]);

  // ─── Group by time ────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    for (const n of filtered) {
      const group = getTimeGroup(n.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }
    return groups;
  }, [filtered]);

  // ─── Tab counts ───────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length, unread: unreadCount };
    for (const cat of ['records', 'users', 'security', 'system', 'tenant'] as NotificationCategory[]) {
      counts[cat] = getUnreadByCategory(cat).length;
    }
    return counts;
  }, [notifications, unreadCount, getUnreadByCategory]);

  const SoundIcon = soundLevel === 'off' ? VolumeX : soundLevel === 'critical_only' ? Volume1 : Volume2;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Notifications" }]}>
      <div className="space-y-5">
        {/* ─── Header ──────────────────────────────────── */}
        <PageHeader
          icon={Bell}
          iconClassName="text-primary"
          title="Notifications"
          description={unreadCount > 0 ? `${unreadCount} unread · ${criticalCount} critical` : "All caught up"}
          actions={[
            ...(unreadCount > 0 ? [{ label: "Mark All Read", icon: CheckCheck, onClick: markAllRead }] : []),
            ...(notifications.length > 0 ? [{ label: "Clear All", icon: Trash2, onClick: clearAll, variant: "outline" as const }] : []),
          ]}
        />

        {/* ─── Filter Tabs ──────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(tab => {
            const count = tabCounts[tab.id] || 0;
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && tab.id !== 'all' && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Sound toggle */}
          <button
            onClick={() => {
              const levels: SoundLevel[] = ['off', 'critical_only', 'all_important'];
              const next = levels[(levels.indexOf(soundLevel) + 1) % levels.length];
              setSoundLevel(next);
            }}
            className="ml-auto flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={`Sound: ${SOUND_LEVELS[soundLevel].label}`}
          >
            <SoundIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{SOUND_LEVELS[soundLevel].label}</span>
          </button>
        </div>

        {/* ─── Search ──────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, message, serial, or event type..."
            className="pl-9"
          />
        </div>

        {/* ─── Content ──────────────────────────────────── */}
        {loading ? (
          <StateScreen state="loading" icon={Bell} title="Loading..." />
        ) : filtered.length === 0 ? (
          <StateScreen
            state="empty"
            icon={Bell}
            title={search ? "No matches" : "No notifications"}
            message={search ? "Try a different search term." : filter !== "all" ? "No notifications in this category." : "You'll see system alerts and updates here."}
          />
        ) : (
          <div className="space-y-6">
            {/* Timeline Groups */}
            {["Today", "Yesterday", "This Week", "Older"].map(group => {
              const items = grouped[group];
              if (!items || items.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {group}
                    <span className="text-muted-foreground/50">({items.length})</span>
                  </h3>
                  <div className="bg-card border border-border rounded-sm overflow-hidden divide-y divide-border/50">
                    {items.map(notif => {
                      const catConfig = getCategoryConfig(notif.category);
                      const priConfig = getPriorityConfig(notif.priority);
                      const CatIcon = catConfig.icon;
                      const action = getNotificationAction(notif);

                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            "flex items-start gap-4 px-5 py-4 transition-colors group",
                            !notif.read ? "bg-primary/[0.03]" : "bg-card",
                            "hover:bg-muted/20"
                          )}
                        >
                          {/* Priority dot */}
                          <div className="flex items-center justify-center w-2 mt-4 shrink-0">
                            {!notif.read && (
                              <div className={cn("w-2 h-2 rounded-full", priConfig.dot)} />
                            )}
                          </div>

                          {/* Category icon */}
                          <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center shrink-0", catConfig.bg)}>
                            <CatIcon className={cn("w-4 h-4", catConfig.color)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
                                priConfig.bg, priConfig.color
                              )}>
                                {priConfig.label}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
                                catConfig.bg, catConfig.color
                              )}>
                                {catConfig.label}
                              </span>
                              {notif.event_type && (
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  {notif.event_type}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                                {formatTimeAgo(notif.created_at)}
                              </span>
                            </div>
                            <p className={cn(
                              "text-sm font-semibold",
                              !notif.read ? "text-foreground" : "text-foreground/70"
                            )}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {action && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1"
                                onClick={() => { navigate(action.path); markAsRead(notif.id); }}
                              >
                                <ArrowRight className="w-3 h-3" />
                                {action.label}
                              </Button>
                            )}
                            <button
                              onClick={() => notif.read ? markAsUnread(notif.id) : markAsRead(notif.id)}
                              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              title={notif.read ? "Mark as unread" : "Mark as read"}
                            >
                              {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}