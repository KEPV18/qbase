import { useEffect } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
  className?: string;
  maxWidth?: string;
}

export function AppShell({ children, breadcrumbs, className, maxWidth = "max-w-[1400px]" }: AppShellProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className={cn("mx-auto w-full", maxWidth, className)}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <div className="page-transition">
          {children}
        </div>
      </div>
    </div>
  );
}