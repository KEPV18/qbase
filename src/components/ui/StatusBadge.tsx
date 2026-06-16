import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, getStatusBadgeClass } from "@/lib/statusService";
import type { RecordStatus } from "@/lib/googleSheets";
import { CheckCircle, Clock, FileEdit, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: RecordStatus;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const STATUS_ICONS = {
    draft: FileEdit,
    pending_review: Clock,
    approved: CheckCircle,
    rejected: XCircle,
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
    const label = STATUS_LABELS[status];
    const Icon = STATUS_ICONS[status];

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const pillClasses = {
        draft: 'status-pill-info',
        pending_review: 'status-pill-warning',
        approved: 'status-pill-success',
        rejected: 'status-pill-destructive',
    };

    return (
        <div className={cn(
            "status-pill inline-flex items-center gap-1.5",
            pillClasses[status] || 'status-pill-info',
            size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
        )}>
            {showIcon && <Icon className={cn("w-3 h-3", size === 'lg' && 'w-4 h-4')} />}
            <span className="font-bold uppercase tracking-wider">{label.en}</span>
        </div>
    );
}
