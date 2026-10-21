// ============================================================================
// QBase — Mobile Bottom Navigation
// Shows on mobile only — 5 main tabs + hamburger for full sidebar
// ============================================================================

import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Briefcase, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Forms", icon: FileText, path: "/forms" },
  { label: "Projects", icon: Briefcase, path: "/projects" },
];

export function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav aria-label="Primary mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            aria-current={isActive(item.path) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors",
              isActive(item.path)
                ? "text-foreground dark:text-foreground"
                : "text-ink-3 hover:text-ink-2"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              isActive(item.path) ? "text-foreground dark:text-foreground" : "text-ink-3"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              isActive(item.path) ? "font-semibold" : ""
            )}>
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* Menu button — opens the full sidebar drawer */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-ink-3 hover:text-ink-2 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
