import { cn } from "@/lib/utils";
import type { Risk } from "@/lib/riskRegisterService";
import type { CAPA } from "@/lib/capaRegisterService";
import { AlertTriangle, Shield, CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface RiskStatsProps {
  risks: Risk[];
  capas: CAPA[];
}

export function RiskStats({ risks, capas }: RiskStatsProps) {
  const openRisks = risks.filter(r => r.status === "Open").length;
  const highRisks = risks.filter(r => r.riskScore >= 12).length;
  const controlledRisks = risks.filter(r => r.status === "Controlled" || r.status === "Closed").length;

  const openCapas = capas.filter(c => c.status === "Open" || c.status === "In Progress").length;
  const overdueCapas = capas.filter(c => {
    if (c.status === "Closed") return false;
    if (!c.targetCompletionDate) return false;
    return new Date(c.targetCompletionDate) < new Date();
  }).length;
  const closedCapas = capas.filter(c => c.status === "Closed").length;

  const stats = [
    { label: "Total Risks", value: risks.length, icon: AlertTriangle, color: "text-foreground", bg: "bg-muted/50" },
    { label: "Open Risks", value: openRisks, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "High/Critical", value: highRisks, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-500/10" },
    { label: "Controlled", value: controlledRisks, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Active CAPAs", value: openCapas, icon: Shield, color: "text-primary", bg: "bg-primary/10" },
    { label: "Overdue CAPAs", value: overdueCapas, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-card rounded-sm border border-border p-4 flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center", s.bg)}>
            <s.icon className={cn("w-4 h-4", s.color)} />
          </div>
          <div>
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
