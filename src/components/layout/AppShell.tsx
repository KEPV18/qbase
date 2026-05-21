import { useEffect } from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
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
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className={cn("flex-1 px-4 md:px-6 lg:px-8 py-6 mx-auto w-full", maxWidth, className)}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <div className="page-transition">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
