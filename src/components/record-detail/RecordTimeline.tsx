import { QMSRecord } from "@/lib/googleSheets";
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface RecordTimelineProps {
  record: QMSRecord;
}

export function RecordTimeline({ record }: RecordTimelineProps) {
  const events = buildTimeline(record);

  if (events.length === 0) {
    return (
      <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          Activity Timeline
        </h2>
        <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        Activity Timeline
      </h2>

      <div className="relative space-y-0">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        {events.map((event, i) => (
          <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
            <div className={`relative z-10 w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${event.bg}`}>
              <event.icon className={`w-3.5 h-3.5 ${event.color}`} />
            </div>
            <div className="pt-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineEvent {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  detail: string;
}

function buildTimeline(record: QMSRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Record created
  events.push({
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Template Created",
    detail: `${record.code} — ${record.recordName}`,
  });

  // Last file date
  if (record.lastFileDate) {
    events.push({
      icon: Clock,
      color: "text-info",
      bg: "bg-info/10",
      title: "Last Record Filed",
      detail: `${record.lastFileDate} (${record.daysAgo || "?"} days ago)`,
    });
  }

  // Audit status
  if (record.auditStatus === "✅ Approved") {
    events.push({
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      title: "Audit Approved",
      detail: "Record passed compliance check",
    });
  } else if (record.auditStatus === "❌ NC") {
    events.push({
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      title: "Non-Conformance Raised",
      detail: "Action required",
    });
  }

  // Review
  if (record.reviewed && record.reviewedBy) {
    events.push({
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      title: "Review Completed",
      detail: `By ${record.reviewedBy}${record.reviewDate ? ` on ${record.reviewDate}` : ""}`,
    });
  }

  return events;
}
