import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="relative">
          <div className="w-20 h-20 rounded-sm bg-primary/20 animate-pulse" />
          <Loader2 className="w-12 h-12 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };
  
  return (
    <div className={`${sizes[size]} rounded-sm bg-primary/20 flex items-center justify-center`}>
      <Loader2 className={`${sizes[size]} text-primary animate-spin`} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-sm border border-border/30 bg-card p-6 space-y-3">
      <div className="h-4 w-20 bg-muted rounded-sm shimmer" />
      <div className="h-8 w-32 bg-muted rounded-sm shimmer" />
      <div className="h-4 w-full bg-muted rounded-sm shimmer" />
      <div className="h-4 w-3/4 bg-muted rounded-sm shimmer" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-sm bg-primary/10 flex items-center justify-center mb-4 animate-bounce">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
