// ============================================================================
// QBase - Mobile Bottom Navigation (NotionWarm)
// Shows on mobile only — 5 main tabs + hamburger for full sidebar
// ============================================================================

import { useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-[#1a1a18] border-t border-[#e8e3db] dark:border-[#3a3834] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors",
              isActive(item.path)
                ? "text-[#2d2d2d] dark:text-[#e8e3db]"
                : "text-[#9f9a8f] hover:text-[#7a756a]"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              isActive(item.path) ? "text-[#2d2d2d] dark:text-[#e8e3db]" : "text-[#9f9a8f]"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              isActive(item.path) ? "font-semibold" : ""
            )}>
              {item.label}
            </span>
          </button>
        ))}

        {/* Menu button — opens the full sidebar drawer */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-[#9f9a8f] hover:text-[#7a756a] transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
