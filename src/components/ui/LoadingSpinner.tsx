import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// Full screen loading overlay
export function LoadingOverlay({ 
  show, 
  message = 'Loading...' 
}: { 
  show: boolean; 
  message?: string;
}) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-sm shadow-lg">
        <Spinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Inline loading skeleton
export function LoadingSkeleton({ 
  className,
  lines = 1 
}: { 
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton h-4 rounded"
          style={{ width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="p-4 border rounded-sm space-y-3">
      <div className="skeleton h-6 w-1/2 rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-16 rounded" />
        <div className="skeleton h-8 w-16 rounded" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}