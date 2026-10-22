import { useEffect } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
  className?: string;
  /**
   * The container tier.  The design system names two columns — a 720px
   * reading column and a 1080px grid/dense column — plus a document
   * tier for the QMS form facsimiles, whose Word-origin tables run up
   * to 18 columns wide and would be unreadable in either.
   *
   * Default is the grid column: most QBase routes are scannable
   * (dashboards, indexes, queues), not read top-to-bottom.
   */
  maxWidth?: string;
}

export function AppShell({ children, breadcrumbs, className, maxWidth = "max-w-grid" }: AppShellProps) {
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
        {/* No entrance keyframe here.  This wrapper is the ONE place every
            route's content is mounted, and the content is async — a
            re-render could restart a keyframe and leave the page at
            opacity 0.  The design system's rule is explicit: "no
            opacity-fade entrance keyframes on async-rendered content". */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}