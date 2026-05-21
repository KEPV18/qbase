import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive" | "ghost";
  className?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive";
  onBack?: string;
  actions?: PageHeaderAction[];
  children?: React.ReactNode;
  className?: string;
}

const badgeVariantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

const iconContainerVariantStyles: Record<string, string> = {
  default: "bg-primary/10 shadow-primary/10",
  success: "bg-success/10 shadow-success/10",
  warning: "bg-warning/10 shadow-warning/10",
  destructive: "bg-destructive/10 shadow-destructive/10",
};

export function PageHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  badge,
  badgeVariant = "default",
  onBack,
  actions,
  children,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-col md:flex-row md:items-start justify-between gap-4 animate-fade-in", className)}>
      <div className="flex items-start gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(onBack)}
            className="mt-1 hover:text-primary transition-colors rounded-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        {Icon && (
          <div className={cn(
            "w-12 h-12 rounded-sm flex items-center justify-center shrink-0",
            iconContainerVariantStyles[badgeVariant]
          )}>
            <Icon className={cn("w-6 h-6", iconClassName || "text-accent")} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            {badge && (
              <span className={cn(
                "text-[10px] font-mono font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border",
                badgeVariantStyles[badgeVariant]
              )}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions.map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={i}
                variant={action.variant || "outline"}
                size="sm"
                className={cn("h-9 gap-2 text-xs", action.className)}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
