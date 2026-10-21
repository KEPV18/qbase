import React from 'react';
import { reportError } from '@/services/errorReportService';
import { log } from '@/services/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Prime §D7: the previously-orphaned error_reports hook — the crash is
    // reported through the audited RPC (migration 20260929_06; identity
    // server-derived). Fire-and-forget: never blocks or breaks a UI that is
    // already failing, and a failed delivery is logged, never silent.
    reportError(error, {
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context: { componentStack: errorInfo.componentStack ?? null },
    }).then(delivered => {
      if (!delivered) log.system.warn('errorReport', 'crash report undelivered (evidence kept in local log buffer)');
    }).catch((err) => {
      // Defensive only — reportError never throws; a throw here would mean
      // the promise chain itself broke, and THAT must not be silent (§20).
      log.system.warn('errorReport', `crash report chain threw: ${(err as Error).message}`);
    });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <div className="text-center space-y-4">
            <div className="text-destructive-tint text-lg font-semibold">
              Something went wrong
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => setError(null), []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { error, setError, resetError };
}

// Simple fallback component
export function ErrorFallback({ 
  title = 'Something went wrong',
  message,
  onRetry 
}: { 
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-destructive-tint mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {message && <p className="text-muted-foreground text-sm mb-4">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-full"
        >
          Try Again
        </button>
      )}
    </div>
  );
}