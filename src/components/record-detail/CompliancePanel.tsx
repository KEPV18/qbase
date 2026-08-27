import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface CompliancePanelProps {
  auditStatus: string;
  onStatusChange: (value: string) => void;
}

export function CompliancePanel({ auditStatus, onStatusChange }: CompliancePanelProps) {
  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    "⚪ Waiting": { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    "✅ Approved": { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    "❌ NC": { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  };

  const current = statusConfig[auditStatus] || statusConfig["⚪ Waiting"];
  const CurrentIcon = current.icon;

  return (
    <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
        Audit Status
      </h2>

      <div className={`p-3 rounded-sm ${current.bg} mb-4 flex items-center gap-3`}>
        <CurrentIcon className={`w-5 h-5 ${current.color}`} />
        <span className={`text-sm font-bold ${current.color}`}>
          {auditStatus === "✅ Approved" ? "Approved" : auditStatus === "❌ NC" ? "Non-Conforming" : "Pending Review"}
        </span>
      </div>

      <Select value={auditStatus || "⚪ Waiting"} onValueChange={onStatusChange}>
        <SelectTrigger className="h-11 rounded-sm bg-background border-border/50 focus:ring-primary/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="⚪ Waiting">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Clock className="w-4 h-4 text-warning" />
              Pending Review
            </div>
          </SelectItem>
          <SelectItem value="✅ Approved">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              Approved
            </div>
          </SelectItem>
          <SelectItem value="❌ NC">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Non-Conforming
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
