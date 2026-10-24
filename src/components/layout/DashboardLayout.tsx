// ============================================================================
// QBase — Dashboard Layout
// Cool #f5f5f7 ground + a single white content surface. The sidebar and
// top nav are the only layers that overlap, so they carry the blur.
// ============================================================================

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { CommandPalette } from "./CommandPalette";
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
          <div className="px-pad pt-pad pb-0 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors ds-press ds-hit-44"
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={sidebarOpen}
              >
                <PanelLeft className="w-4 h-4 text-foreground" />
              </button>
              <TopNav />
            </div>
          </div>
          <div className="lg:hidden flex items-center gap-3 px-pad pt-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg bg-card border border-border hover:bg-background transition-colors ds-hit-44"
              aria-label="Open the navigation menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <span className="font-semibold text-foreground dark:text-foreground">QBase</span>
          </div>
          {/* The scroll container and the content inside it.

              The bottom clearance for the fixed tab bar has to live at the
              END OF THE CONTENT FLOW, not on the scroll container.  A
              scroll container's own `padding-bottom` does not lengthen its
              scrollable area once the content overflows: the padding sits
              inside the content box, and the overflow — which is what the
              scroll area is made of — runs past it.  Measured at 390x844 on
              /create: `main` computed `padding-bottom: 96px`, and the last
              control of the page still ended up UNDER the 65px tab bar at
              maximum scroll, unreachable.

              So the clearance is an in-flow box: it sits after the
              content, and the content ends above it.  `min-h-full` (not
              `h-full`) is what lets the box grow with the page — a fixed
              height would put the padding back inside the overflow. */}
          <main className="flex-1 overflow-y-auto px-pad pt-pad pb-24 lg:pb-pad">
            <div className="min-h-full pb-24 lg:pb-0">
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
      <CommandPalette />
    </div>
  );
}