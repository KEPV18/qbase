// ============================================================================
// QMS Forge — Activity Page (Supabase-connected)
// Shows recent audit log entries from the database.
// ============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAllAuditLogs } from "@/hooks/useAuditLog";
import { StateScreen } from "@/components/ui/StateScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Activity, Clock, CheckCircle, AlertTriangle,
  Pencil, PlusCircle, RefreshCw, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isoToDisplay } from "@/schemas";

type AuditAction = 'create' | 'update' | 'delete';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  create: { icon: PlusCircle, color: "text-emerald-400", label: "Created" },
  update: { icon: Pencil, color: "text-blue-400", label: "Updated" },
  delete: { icon: AlertTriangle, color: "text-red-400", label: "Deleted" },
};

export default function ActivityPage() {
  const navigate = useNavigate();
  const { data: logEntries, isLoading, error, refetch } = useAllAuditLogs(50);

  const entries = useMemo(() => {
    if (!logEntries) return [];
    return logEntries
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 50);
  }, [logEntries]);

  if (isLoading) return <StateScreen state="loading" title="Loading activity…" />;
  if (error) return <StateScreen state="error" title="Failed to load" message={error.message} />;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Activity Log" }]}>
      <PageHeader
        icon={Activity}
        title="Activity Log"
        description={`${entries.length} recent record changes`}
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        }
      />

      {entries.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Changes to records will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 mt-4">
          {entries.map((entry, idx) => {
            const config = ACTION_CONFIG[entry.action as string] || ACTION_CONFIG.update;
            const Icon = config.icon;

            return (
              <Card
                key={entry.id || idx}
                className="border-border/30 hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => entry.serial && navigate(`/records/${encodeURIComponent(entry.serial as string)}`)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border",
                    entry.action === 'create' ? "bg-emerald-500/10 border-emerald-500/20" :
                    entry.action === 'delete' ? "bg-red-500/10 border-red-500/20" :
                    "bg-blue-500/10 border-blue-500/20"
                  )}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{entry.serial || 'Unknown'}</span>
                      <Badge variant="outline" className={cn("text-[10px]", config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">
                        {isoToDisplay(entry.timestamp || '')}
                      </span>
                      {entry.user && (
                        <span className="text-[10px] text-muted-foreground">by {entry.user}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}