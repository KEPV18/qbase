// ============================================================================
// QBase - Dashboard Layout (Dual-Theme Glassmorphism Shell)
// Atmospheric canvas + floating master frame + translucent panels
// ============================================================================

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Menu } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-300 via-sky-100 to-indigo-200 dark:bg-gradient-to-tr dark:from-zinc-950 dark:via-slate-900 dark:to-zinc-900 p-4 lg:p-6 flex items-start justify-center">
      <div className="w-full max-w-7xl mx-auto rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 flex bg-transparent">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col bg-slate-100/40 dark:bg-zinc-900/30 backdrop-blur-xl h-[calc(100vh-48px)]">
          <div className="px-6 pt-6 pb-0 shrink-0">
            <TopNav />
          </div>
          <div className="lg:hidden flex items-center gap-3 px-6 pt-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-slate-200/50 dark:border-zinc-800/60 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Menu className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">QBase</span>
          </div>
          <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}