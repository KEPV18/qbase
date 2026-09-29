// ============================================================================
// QBase — AsyncBoundary (Prime §D7)
// ---------------------------------------------------------------------------
// ONE consistent mapping from react-query state to the design system:
//   loading  → skeleton (never a bare spinner dropped into layout)
//   error    → honest error state (message surfaced, optional retry)
//   empty    → "no data" state (never fabricated numbers)
//   ready    → children rendered
//
// Usage:
//   <AsyncBoundary isLoading={q.isLoading} error={q.error}
//                  isEmpty={(q.data ?? []).length === 0}>
//     <RecordsTable records={q.data!} />
//   </AsyncBoundary>
//
// The boundary renders children when `isLoading` is false and `error` is
// null — it is the caller's job to guarantee `data` is defined (or that
// children tolerate undefined) whenever `isEmpty` is false.
// ============================================================================

import type { ReactNode } from "react";
import { StateScreen } from "./StateScreen";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export interface AsyncBoundaryProps {
  /** True while the query is fetching with no data yet (initial load). */
  isLoading: boolean;
  /** Query error; takes precedence over empty/children. */
  error?: Error | null;
  /** Loaded but produced nothing — renders the empty state. */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Optional retry action shown on the error state (e.g. refetch). */
  onRetry?: () => void;
  errorActionLabel?: string;
  /** Override the default loading skeleton. */
  skeleton?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Default loading skeleton — stacked rows, no spinner-in-a-void. */
function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function AsyncBoundary({
  isLoading,
  error,
  isEmpty = false,
  emptyTitle,
  emptyMessage,
  onRetry,
  errorActionLabel = "Try again",
  skeleton,
  className,
  children,
}: AsyncBoundaryProps) {
  if (isLoading) {
    return (
      <div className={className}>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    );
  }

  if (error) {
    return (
      <StateScreen
        state="error"
        title="Something went wrong"
        message={error.message || "An unexpected error occurred while loading data."}
        action={onRetry ? { label: errorActionLabel, onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  if (isEmpty) {
    return (
      <StateScreen
        state="empty"
        title={emptyTitle || "No data yet"}
        message={emptyMessage}
        className={className}
      />
    );
  }

  return <div className={cn(className)}>{children}</div>;
}