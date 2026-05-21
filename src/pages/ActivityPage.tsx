import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import { QMSRecord, formatTimeAgo, getModuleForCategory } from "@/lib/googleSheets";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateScreen } from "@/components/ui/StateScreen";
import {
  FileText, CheckCircle, AlertTriangle, Clock, User, ExternalLink,
  ArrowLeft, Activity, Inbox, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function getActivityType(record: QMSRecord): "new" | "approved" | "pending" | "issue" | "empty" {
  const reviews = record.fileReviews || {};
  const reviewValues = Object.values(reviews) as Array<{ status?: string }>;
  const statuses = reviewValues.map(r => (r?.status || "").toLowerCase());
  const approvedCount = statuses.filter(s => s === "approved" || s === "✅" || s.includes("approved")).length;
  const rejectedCount = statuses.filter(s => s === "rejected" || s.includes("invalid") || s === "❌").length;
  const hasPending = reviewValues.length > 0 && statuses.some(s => s === "" || s === "pending" || s === "pending_review" || s.includes("under"));
  const auditStatus = (record.auditStatus || "").toLowerCase();

  // Only flag as issue if audit status explicitly says NC/issue, or rejected outnumber approved
  if (auditStatus.includes("nc") || auditStatus.includes("issue")) return "issue";
  if (rejectedCount > 0 && rejectedCount >= approvedCount) return "issue";

  if (record.reviewed || approvedCount > 0) return "approved";

  const hasFiles = (record.actualRecordCount || 0) > 0 || (record.lastSerial && record.lastSerial !== "No Files Yet");
  if (!hasFiles) return "empty";
  if (hasPending || reviewValues.length === 0) return "pending";
  return "new";
}

const typeConfig: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  new:      { icon: FileText,       color: "text-info",        bg: "bg-info/10",        label: "New" },
  approved: { icon: CheckCircle,    color: "text-success",     bg: "bg-success/10",     label: "Approved" },
  pending:  { icon: Clock,          color: "text-warning",     bg: "bg-warning/10",     label: "Pending" },
  issue:    { icon: AlertTriangle,  color: "text-destructive", bg: "bg-destructive/10", label: "Issue" },
  empty:    { icon: Inbox,          color: "text-muted-foreground", bg: "bg-muted/30",  label: "No Files" },
};

type FilterType = "all" | "new" | "approved" | "pending" | "issue" | "empty";

export default function ActivityPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: records, isLoading, isError, error, refetch } = useQMSData();

  // Sort all records by last file date, most recent first
  const allActivity = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => {
      const dA = a.lastFileDate ? new Date(a.lastFileDate).getTime() : 0;
      const dB = b.lastFileDate ? new Date(b.lastFileDate).getTime() : 0;
      return dB - dA;
    });
  }, [records]);

  // Count per type
  const counts = useMemo(() => {
    const c: Record<FilterType, number> = { all: allActivity.length, new: 0, approved: 0, pending: 0, issue: 0, empty: 0 };
    allActivity.forEach(r => { c[getActivityType(r)]++; });
    return c;
  }, [allActivity]);

  // Only show filters that have items
  const visibleFilters: FilterType[] = useMemo(() => {
    const available: FilterType[] = ["all"];
    (["issue", "pending", "approved", "new", "empty"] as FilterType[]).forEach(f => {
      if (counts[f] > 0) available.push(f);
    });
    return available;
  }, [counts]);

  // Reset filter if it becomes empty
  useEffect(() => {
    if (filter !== "all" && counts[filter] === 0) setFilter("all");
  }, [counts, filter]);

  const filteredActivity = filter === "all"
    ? allActivity
    : allActivity.filter(r => getActivityType(r) === filter);

  // Group activity by time period
  const groupedActivity = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: typeof filteredActivity }[] = [];
    const todayItems = filteredActivity.filter(r => {
      const d = r.lastFileDate ? new Date(r.lastFileDate) : null;
      return d && d >= today;
    });
    const yesterdayItems = filteredActivity.filter(r => {
      const d = r.lastFileDate ? new Date(r.lastFileDate) : null;
      return d && d >= yesterday && d < today;
    });
    const thisWeekItems = filteredActivity.filter(r => {
      const d = r.lastFileDate ? new Date(r.lastFileDate) : null;
      return d && d >= thisWeek && d < yesterday;
    });
    const olderItems = filteredActivity.filter(r => {
      const d = r.lastFileDate ? new Date(r.lastFileDate) : null;
      return !d || d < thisWeek;
    });

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (thisWeekItems.length > 0) groups.push({ label: 'This Week', items: thisWeekItems });
    if (olderItems.length > 0) groups.push({ label: 'Older', items: olderItems });

    return groups;
  }, [filteredActivity]);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Recent Activity" }]}>
      <div className="space-y-5">
        {/* Header */}
        <PageHeader
          icon={Activity}
          iconClassName="text-primary"
          title="Recent Activity"
          description={`${allActivity.length} records across all modules`}
          onBack="/"
        />

        {/* Filter tabs — only show those with data */}
        <div className="flex items-center gap-2 flex-wrap">
          {visibleFilters.map(f => {
            const config = f === "all" ? null : typeConfig[f];
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-semibold transition-all border flex items-center gap-1.5",
                  isActive
                    ? f === "all"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : cn(config?.bg, config?.color, config?.bg.replace("/10", "/20").replace("bg-", "border-"))
                    : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                )}
              >
                {f === "all" ? "All" : config?.label}
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm", isActive ? "bg-background/50" : "bg-muted/50")}>
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Activity list */}
        <div className="bg-card rounded-sm border border-border overflow-hidden">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load activity</h3>
              <p className="text-muted-foreground text-sm mb-4">{error?.message || "An error occurred while fetching data."}</p>
              <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity text-sm"><RefreshCw className="w-4 h-4 mr-2 inline" />Try Again</button>
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-4 flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivity.length === 0 ? (
            <StateScreen state="empty" title="No activity yet" message="Records will appear here once data is synced" />
          ) : (
            groupedActivity.map(group => (
                <div key={group.label}>
                  <div className="px-5 py-2 bg-muted/30 border-b border-border/30">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-[0.15em]">{group.label}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                  {group.items.map((record, i) => {
                const type = getActivityType(record);
                const config = typeConfig[type];
                const Icon = config.icon;
                const module = getModuleForCategory(record.category);

                return (
                  <div
                    key={`${record.code}-${i}`}
                    className={cn(
                    "px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer group",
                    type === "approved" && "bg-success/[0.02]",
                    type === "issue" && "bg-destructive/[0.02]"
                  )}
                    onClick={() => navigate(`/record/${encodeURIComponent(record.code)}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0", config.bg)}>
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{record.recordName}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-sm", config.bg, config.color)}>{config.label}</span>
                          {module && (
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm capitalize">{module}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                          <span className="font-mono text-[10px]">{record.code}</span>
                          {record.lastFileDate && (
                            <>
                              <span>·</span>
                              <span>{formatTimeAgo(record.lastFileDate)}</span>
                            </>
                          )}
                          {record.reviewedBy && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{record.reviewedBy}</span>
                            </>
                          )}
                          {(record.actualRecordCount ?? 0) > 0 && (
                            <>
                              <span>·</span>
                              <span>{record.actualRecordCount} files</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {record.folderLink && (
                          <a href={record.folderLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="text-muted-foreground/50 hover:text-primary p-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
                  })}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </AppShell>
  );
}