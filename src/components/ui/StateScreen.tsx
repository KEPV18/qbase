import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, Inbox, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type StateType = "loading" | "empty" | "error" | "success" | "critical";

interface StateScreenProps {
  state: StateType;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const stateConfig: Record<StateType, { icon: typeof Loader2; iconClass: string; titleDefault: string }> = {
  loading: { icon: Loader2, iconClass: "animate-spin text-muted-foreground", titleDefault: "Loading..." },
  empty: { icon: Inbox, iconClass: "text-muted-foreground/40", titleDefault: "No data yet" },
  error: { icon: AlertTriangle, iconClass: "text-destructive", titleDefault: "Something went wrong" },
  success: { icon: CheckCircle, iconClass: "text-success", titleDefault: "All good" },
  critical: { icon: AlertTriangle, iconClass: "text-destructive", titleDefault: "Action required" },
};

export function StateScreen({ state, title, message, action, className }: StateScreenProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      state === "loading" && "opacity-60",
      className
    )}>
      <div className={cn(
        "w-16 h-16 rounded-sm flex items-center justify-center mb-4",
        state === "critical" && "bg-destructive/10",
        state === "error" && "bg-destructive/10",
        state === "success" && "bg-success/10",
        (state === "empty" || state === "loading") && "bg-muted/30"
      )}>
        <Icon className={cn("w-8 h-8", config.iconClass)} />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">
        {title || config.titleDefault}
      </h3>
      {message && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      )}
      {action && (
        <Button
          size="sm"
          variant={state === "critical" || state === "error" ? "default" : "outline"}
          onClick={action.onClick}
          className={cn(
            state === "critical" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          )}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
