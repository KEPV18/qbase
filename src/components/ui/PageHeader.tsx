// ============================================================================
// PageHeader — Reusable page title bar with icon, badge, description
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";
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
  action,
  onBack,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {badge && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                badge.variant === "secondary" ? "bg-secondary text-secondary-foreground" :
                badge.variant === "destructive" ? "bg-destructive text-destructive-foreground" :
                badge.variant === "outline" ? "border border-input text-foreground" :
                "bg-primary text-primary-foreground"
              )}>
                {badge.text}
              </span>
            )}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default PageHeader;
