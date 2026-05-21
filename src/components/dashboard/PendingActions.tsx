import { QMSRecord, normalizeCategory } from "@/lib/googleSheets";
import { AlertCircle, CalendarClock, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PendingActionsProps {
  records: QMSRecord[];
  isLoading?: boolean;
}

export function PendingActions({ records = [], isLoading = false }: PendingActionsProps) {
  const navigate = useNavigate();
  const overdueRecords = records.filter(r => r.isOverdue);
  const upcomingRecords = records.filter(r => !r.isOverdue && typeof r.daysUntilNextFill === "number" && r.daysUntilNextFill > 0 && r.daysUntilNextFill <= 5);

  if (isLoading || (overdueRecords.length === 0 && upcomingRecords.length === 0)) return null;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive/20 to-warning/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Pending Actions</h3>
          <p className="text-[10px] text-muted-foreground">Requires attention</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Overdue — red left bar */}
        {overdueRecords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Overdue</span>
              <span className="bg-destructive/10 text-destructive text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md">{overdueRecords.length}</span>
            </div>
            {overdueRecords.slice(0, 4).map(record => (
              <div
                key={record.rowIndex}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-destructive/[0.04] border border-destructive/10 border-l-[3px] border-l-destructive hover:bg-destructive/[0.08] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarClock className="w-4 h-4 text-destructive flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.recordName}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{record.code}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 px-2.5 rounded-lg" onClick={() => { const mod = normalizeCategory(record.category); if (mod?.id) navigate(`/module/${mod.id}`); }}>
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Due Soon — amber left bar */}
        {upcomingRecords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-warning" />
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Due Soon</span>
              <span className="bg-warning/10 text-warning text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md">{upcomingRecords.length}</span>
            </div>
            {upcomingRecords.slice(0, 4).map(record => (
              <div
                key={record.rowIndex}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-warning/[0.03] border border-warning/10 border-l-[3px] border-l-warning hover:bg-warning/[0.07] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarClock className="w-4 h-4 text-warning flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.recordName}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{record.daysUntilNextFill}d left</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 px-2.5 rounded-lg" onClick={() => { const mod = normalizeCategory(record.category); if (mod?.id) navigate(`/module/${mod.id}`); }}>
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}