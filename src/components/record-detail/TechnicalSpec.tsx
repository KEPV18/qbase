import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QMSRecord } from "@/lib/googleSheets";
import { Clock, Hash, Calendar, FileText } from "lucide-react";

interface TechnicalSpecProps {
  record: QMSRecord;
}

export function TechnicalSpec({ record }: TechnicalSpecProps) {
  const specItems = [
    {
      icon: FileText,
      label: "Fulfillment Protocol",
      value: record.whenToFill || "Not specified",
      full: true,
    },
    {
      icon: Hash,
      label: "Last Serial",
      value: record.lastSerial || "N/A",
    },
    {
      icon: Hash,
      label: "Next Serial",
      value: record.nextSerial || "—",
      highlight: true,
    },
    {
      icon: Calendar,
      label: "Last Updated",
      value: record.lastFileDate || "No records",
    },
    {
      icon: Clock,
      label: "Days Ago",
      value: record.daysAgo ? `${record.daysAgo} days` : "—",
    },
  ];

  return (
    <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        Technical Specification
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {specItems.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3.5 rounded-sm bg-muted/40 border border-border/30 ${item.full ? "sm:col-span-2" : ""}`}
          >
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {item.label}
              </Label>
              <p className={`text-sm font-semibold mt-0.5 truncate ${item.highlight ? "text-primary font-mono" : "text-foreground"}`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {record.fillFrequency && (
        <div className="mt-4 flex items-center gap-2">
          <Badge variant={record.isOverdue ? "destructive" : "secondary"} className="text-[10px] font-bold uppercase tracking-wider">
            {record.fillFrequency}
          </Badge>
          {record.isOverdue && (
            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Overdue</span>
          )}
        </div>
      )}
    </div>
  );
}
