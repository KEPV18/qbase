// ============================================================================
// PageHeader — Reusable page title bar with icon, badge, description
// ============================================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  description?: string;
  badge?: { text: string; variant?: "default" | "secondary" | "destructive" | "outline" };
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  action?: React.ReactNode;
  onBack?: string;
  actions?: Array<{ label: string; icon?: LucideIcon; onClick: () => void; variant?: "default" | "outline"; disabled?: boolean }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  icon: Icon,
  iconClassName,
  description,
  badge,
  badgeVariant,
  action,
  onBack,
  actions,
  className,
}) => {
  const navigate = useNavigate();

  // The header has three right-hand affordances — a back link, one `action`
  // node and a list of `actions`.  All three used to be declared and then
  // never rendered, so a caller that asked for a "Refresh" button silently
  // got no button at all: the Audit page's Sync, the Notifications page's
  // Mark All Read / Clear All and the Compliance Report's Refresh were all
  // invisible.  They are rendered now.
  const hasRightSide = !!onBack || !!action || !!(actions && actions.length > 0);

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className={cn("w-5 h-5 text-primary-tint", iconClassName)} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {badge && (
              <Badge variant={badge.variant ?? badgeVariant ?? "default"}>
                {badge.text}
              </Badge>
            )}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {hasRightSide && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onBack && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(onBack)}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          {action}
          {actions?.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant === "outline" ? "outline" : "default"}
              disabled={a.disabled}
              onClick={a.onClick}
              className="gap-1.5"
            >
              {a.icon && <a.icon className="h-3.5 w-3.5" />}
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
