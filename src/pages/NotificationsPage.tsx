import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateScreen } from "@/components/ui/StateScreen";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCircle, AlertTriangle, Info, Shield,
  Clock, CheckCheck, Trash2, ArrowRight, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NotifType = "all" | "unread" | "issue" | "approval" | "system";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string; label: string; priority: "critical" | "info" | "success" | "default" }> = {
  issue: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Issue", priority: "critical" },
  approval: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Approval", priority: "info" },
  system: { icon: Shield, color: "text-primary", bg: "bg-primary/10", label: "System", priority: "default" },
  default: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/50", label: "Info", priority: "default" },
};

function getNotifType(type: string) {
  return typeConfig[type] || typeConfig.default;
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

/** Derive an action from notification type + data */
function getNotificationAction(notif: AppNotification, navigate: (path: string) => void) {
  const data = notif.data as Record<string, string> | undefined;

  // Direct link provided
  if (notif.link) {
    return {
      label: "Open",
      icon: ArrowRight,
      onClick: () => navigate(notif.link!),
    };
  }

  // Type-based action inference
  switch (notif.type) {
    case "issue":
      if (data?.project) {
        return {
          label: `Fix in ${data.project}`,
          icon: Wrench,
          onClick: () => navigate(`/project/${encodeURIComponent(data.project!)}?tab=issues`),
        };
      }
      return {
        label: "Go to Audit",
        icon: ArrowRight,
        onClick: () => navigate("/audit?tab=issues"),
      };
    case "approval":
      if (data?.project) {
        return {
          label: "Review",
          icon: CheckCircle,
          onClick: () => navigate(`/project/${encodeURIComponent(data.project!)}?tab=pending`),
        };
      }
      return {
        label: "Review in Audit",
        icon: ArrowRight,
        onClick: () => navigate("/audit?tab=pending"),
      };
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, clearAll } = useNotifications();
  const [filter, setFilter] = useState<NotifType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  // Priority breakdown for DecisionBanner
  const issueCount = notifications.filter(n => n.type === "issue" && !n.read).length;
  const approvalCount = notifications.filter(n => n.type === "approval" && !n.read).length;

  const handleMarkAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markAsRead(n.id);
    }
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Notifications" }]}>
      <div className="space-y-5">
        <PageHeader
          icon={Bell}
          iconClassName="text-primary"
          title="Notifications"
          description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          actions={[
            ...(unreadCount > 0 ? [{ label: "Mark All Read", icon: CheckCheck, onClick: handleMarkAllRead }] : []),
            ...(notifications.length > 0 ? [{ label: "Clear All", icon: Trash2, onClick: clearAll, variant: "outline" as const }] : []),
          ]}
        />

        {/* Priority Decision Banner */}
        {issueCount > 0 && (
          <DecisionBanner
            priority="critical"
            title={`${issueCount} Unread Issue${issueCount > 1 ? "s" : ""}`}
            description="Issues require immediate attention. Resolve them to restore compliance."
            action={{ label: `Fix ${issueCount} Issue${issueCount > 1 ? "s" : ""}`, onClick: () => navigate("/audit?tab=issues") }}
          />
        )}
        {issueCount === 0 && approvalCount > 0 && (
          <DecisionBanner
            priority="info"
            title={`${approvalCount} Pending Approval${approvalCount > 1 ? "s" : ""}`}
            description="Approve pending records to complete the review cycle."
            action={{ label: `Review ${approvalCount} Pending`, onClick: () => navigate("/audit?tab=pending") }}
          />
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all", label: "All", count: notifications.length },
            { key: "unread", label: "Unread", count: unreadCount },
            { key: "issue", label: "Issues", count: notifications.filter(n => n.type === "issue").length },
            { key: "approval", label: "Approvals", count: notifications.filter(n => n.type === "approval").length },
            { key: "system", label: "System", count: notifications.filter(n => n.type === "system").length },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as NotifType)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-xs font-bold transition-colors border flex items-center gap-1.5",
                filter === f.key
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-sm",
                  filter === f.key ? "bg-primary/20" : "bg-muted/50"
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <StateScreen state="loading" title="Loading notifications" />
        ) : filtered.length === 0 ? (
          <StateScreen
            state="empty"
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            message={filter !== "all" ? "No items match this filter." : "You'll see system alerts and updates here."}
          />
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden divide-y divide-border/50">
            {filtered.map(notif => {
              const config = getNotifType(notif.type);
              const Icon = config.icon;
              const action = getNotificationAction(notif, navigate);
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors group",
                    !notif.read ? "bg-primary/[0.02]" : "bg-card",
                    "hover:bg-muted/20"
                  )}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  {/* Unread dot */}
                  <div className="flex items-center justify-center w-2 mt-4 shrink-0">
                    {!notif.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>

                  {/* Type icon */}
                  <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm", config.bg, config.color)}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className={cn("text-sm font-semibold", !notif.read ? "text-foreground" : "text-foreground/70")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>

                  {/* Action button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); action.onClick(); markAsRead(notif.id); }}
                      >
                        <action.icon className="w-3 h-3" />
                        {action.label}
                      </Button>
                    )}
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-primary transition-all"
                      >
                        Mark read
                      </button>
                    )}
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
