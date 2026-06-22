// ============================================================================
// QBase - Dashboard Layout (NotionWarm Shell)
// Warm beige background + floating paper frame + soft borders
// ============================================================================

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { Menu } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col bg-background h-screen">
          <div className="px-5 pt-5 pb-0 shrink-0">
            <TopNav />
          </div>
          <div className="lg:hidden flex items-center gap-3 px-5 pt-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg bg-card border border-border hover:bg-background transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <span className="font-semibold text-foreground dark:text-foreground">QBase</span>
          </div>
          <main className="flex-1 p-5 pb-20 lg:pb-5 flex flex-col gap-5 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
    </div>
  );
}