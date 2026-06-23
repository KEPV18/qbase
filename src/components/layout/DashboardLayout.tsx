// ============================================================================
// QBase - Dashboard Layout (NotionWarm Shell)
// Warm beige background + floating paper frame + soft borders
// ============================================================================

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { Menu, PanelLeft } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full flex">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sidebarOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 min-w-0 flex flex-col bg-background h-screen">
          <div className="px-5 pt-5 pb-0 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors ds-press"
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <PanelLeft className="w-4 h-4 text-foreground" />
              </button>
              <TopNav />
            </div>
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
          <main className="flex-1 p-5 pb-24 lg:pb-5">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
    </div>
  );
}