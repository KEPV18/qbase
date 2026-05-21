import { QMSRecord } from "@/lib/googleSheets";
import { Files, FileCheck, FileWarning } from "lucide-react";

interface FileStatsProps {
  record: QMSRecord;
}

export function FileStats({ record }: FileStatsProps) {
  const totalFiles = record.actualRecordCount || 0;
  const reviewed = record.reviewed;

  const stats = [
    {
      icon: Files,
      label: "Total Files",
      value: totalFiles,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: FileCheck,
      label: "Review Status",
      value: reviewed ? "Reviewed" : "Pending",
      color: reviewed ? "text-success" : "text-warning",
      bg: reviewed ? "bg-success/10" : "bg-warning/10",
    },
    {
      icon: FileWarning,
      label: "Audit",
      value: record.auditStatus === "✅ Approved" ? "Passed" : record.auditStatus === "❌ NC" ? "NC" : "Pending",
      color: record.auditStatus === "✅ Approved" ? "text-success" : record.auditStatus === "❌ NC" ? "text-destructive" : "text-warning",
      bg: record.auditStatus === "✅ Approved" ? "bg-success/10" : record.auditStatus === "❌ NC" ? "bg-destructive/10" : "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-sm border border-border/50 bg-card p-4 text-center shadow-sm">
          <div className={`w-9 h-9 rounded-sm ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
            <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
          </div>
          <p className="text-lg font-bold text-foreground">{stat.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
