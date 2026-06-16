import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface PipelineItemProps {
  label: string;
  count: number;
  pct: number;
  variant: "success" | "warning" | "destructive" | "default";
  onClick: () => void;
}

const variantStyles = {
  success: { bar: "bg-gradient-to-r from-success/60 to-success", text: "text-success", bg: "bg-success/10" },
  warning: { bar: "bg-gradient-to-r from-warning/60 to-warning", text: "text-warning", bg: "bg-warning/10" },
  destructive: { bar: "bg-gradient-to-r from-destructive/60 to-destructive", text: "text-destructive", bg: "bg-destructive/10" },
  default: { bar: "bg-gradient-to-r from-primary/60 to-primary", text: "text-foreground", bg: "bg-primary/10" },
};

export function PipelineItem({ label, count, pct, variant, onClick }: PipelineItemProps) {
  const v = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 group text-left"
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", v.bg)}>
        <span className={cn("text-xs font-bold font-mono", v.text)}>{pct}%</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <span className={cn("text-sm font-extrabold font-mono tabular-nums", v.text)}>{count}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700 ease-out", v.bar)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
    </button>
  );
}