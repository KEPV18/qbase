import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Priority = "critical" | "warning" | "info" | "success";

interface DecisionAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline";
}

interface DecisionStep {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface DecisionBannerProps {
  priority: Priority;
  title: string;
  description?: string;
  action?: DecisionAction;
  secondaryAction?: DecisionAction;
  className?: string;
}

const priorityConfig: Record<Priority, { border: string; bg: string; iconBg: string; text: string; bar: string }> = {
  critical: {
    border: "border-destructive/30",
    bg: "bg-destructive/[0.04]",
    iconBg: "bg-destructive/10",
    text: "text-destructive",
    bar: "bg-destructive",
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/[0.04]",
    iconBg: "bg-warning/10",
    text: "text-warning",
    bar: "bg-warning",
  },
  info: {
    border: "border-primary/20",
    bg: "bg-primary/[0.03]",
    iconBg: "bg-primary/10",
    text: "text-primary",
    bar: "bg-primary",
  },
  success: {
    border: "border-success/20",
    bg: "bg-success/[0.03]",
    iconBg: "bg-success/10",
    text: "text-success",
    bar: "bg-success",
  },
};

export function DecisionBanner({ priority, title, description, action, secondaryAction, className }: DecisionBannerProps) {
  const navigate = useNavigate();
  const config = priorityConfig[priority];

  return (
    <div className={cn(
      "rounded-sm border overflow-hidden",
      config.border,
      config.bg,
      className
    )}>
      <div className={cn("h-0.5", config.bar)} />
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("w-1 h-full min-h-[24px] rounded-full shrink-0", config.bar)} />
          <div className="min-w-0">
            <p className={cn("text-sm font-bold", config.text)}>{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action && (
            <Button
              variant={action.variant || "default"}
              size="sm"
              className={cn(
                "shrink-0 gap-2 text-xs h-9",
                priority === "critical" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                priority === "warning" && "bg-warning hover:bg-warning/90 text-warning-foreground",
                priority !== "critical" && priority !== "warning" && ""
              )}
              onClick={action.onClick || (action.href ? () => navigate(action.href!) : undefined)}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 text-xs h-9"
              onClick={secondaryAction.onClick || (secondaryAction.href ? () => navigate(secondaryAction.href!) : undefined)}
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper: determine highest priority from counts */
export function getHighestPriority(items: {
  issues?: number;
  overdue?: number;
  pending?: number;
  approved?: number;
}): Priority {
  if ((items.issues ?? 0) > 0) return "critical";
  if ((items.overdue ?? 0) > 0) return "warning";
  if ((items.pending ?? 0) > 0) return "info";
  return "success";
}

/** Helper: generate decision CTA from project stats */
export function getProjectDecision(stats: {
  rejected: number;
  pending: number;
  approved: number;
  total: number;
  projectName: string;
}): { priority: Priority; title: string; description: string; action: DecisionAction } | null {
  if (stats.rejected > 0) {
    return {
      priority: "critical",
      title: `${stats.rejected} Issue${stats.rejected > 1 ? "s" : ""} Need Attention`,
      description: "Rejected records require immediate review before your next audit.",
      action: { label: `Fix ${stats.rejected} Issue${stats.rejected > 1 ? "s" : ""}`, href: `/project/${encodeURIComponent(stats.projectName)}?tab=issues` },
    };
  }
  if (stats.pending > 0) {
    return {
      priority: "info",
      title: `${stats.pending} Record${stats.pending > 1 ? "s" : ""} Pending Review`,
      description: "Approve or review pending records to maintain compliance.",
      action: { label: `Review ${stats.pending} Pending`, href: `/project/${encodeURIComponent(stats.projectName)}?tab=pending` },
    };
  }
  if (stats.total > 0 && stats.approved === stats.total) {
    return {
      priority: "success",
      title: "All Records Compliant",
      description: "No outstanding actions needed for this project.",
      action: undefined as unknown as DecisionAction,
    };
  }
  return null;
}
