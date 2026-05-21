import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error");
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-4 rounded-sm">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                We encountered an unexpected error.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted p-4 rounded-sm text-left overflow-auto max-h-40 text-xs font-mono border">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                variant="default"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </Button>
              <Button
                onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
                variant="outline"
              >
                Clear Cache & Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
