// ============================================================================
// QBase - Sidebar (Dual-Theme Translucent Glassmorphism)
// Dark/muted glass sidebar with light & dark variants
// ============================================================================

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import {
  LayoutDashboard, Layers, FileText, Settings, Bell,
  Database, Shield, Users, BarChart3,
  CheckCircle, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import defaultLogo from "@/assets/qms-logo.png";

interface NavSection {
  title: string;
  items: { label: string; icon: React.ElementType; path: string; badge?: number }[];
}

const MAIN_NAV: NavSection = {
  title: "MAIN",
  items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Modules", icon: Layers, path: "/modules" },
    { label: "Forms", icon: FileText, path: "/forms" },
    { label: "Records", icon: Database, path: "/records" },
    { label: "Analytics", icon: BarChart3, path: "/audit" },
  ],
};

const TOOLS_NAV: NavSection = {
  title: "TOOLS",
  items: [
    { label: "Approvals", icon: CheckCircle, path: "/approvals" },
    { label: "Audit Trail", icon: Shield, path: "/activity" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
};

const SETTINGS_NAV: NavSection = {
  title: "SETTINGS",
  items: [
    { label: "Admin", icon: Users, path: "/admin" },
    { label: "Settings", icon: Settings, path: "#settings" },
  ],
};

function SidebarNavItem({
  item,
  isActive,
  onClick,
}: {
  item: { label: string; icon: React.ElementType; path: string; badge?: number };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-white/10 dark:bg-white/5 text-white font-medium"
          : "text-zinc-400 dark:text-zinc-500 hover:text-white hover:bg-white/5 dark:hover:bg-white/5"
      )}
    >
      <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-white" : "text-zinc-500 dark:text-zinc-600")} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span className="text-[10px] font-semibold bg-white/15 text-white px-1.5 py-0.5 rounded-full">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
    </button>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { displayName, logoUrl } = useTenantIdentity();
  const { unreadCount } = useNotifications();

  const brandLogo = logoUrl || defaultLogo;
  const firstName = (user?.name || "User").split(" ")[0];
  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const handleNav = (path: string) => {
    if (path === "#settings") { onClose(); return; }
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const toolsItems = TOOLS_NAV.items.map((item) =>
    item.label === "Notifications" ? { ...item, badge: unreadCount || 0 } : item
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-950/20 dark:bg-black/40 backdrop-blur-2xl border-r border-white/5",
          "flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <button onClick={() => handleNav("/")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <img src={brandLogo} alt="logo" className="w-5 h-5 object-contain invert" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {displayName || "QBase"}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">
              {MAIN_NAV.title}
            </p>
            {MAIN_NAV.items.map((item) => (
              <SidebarNavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                onClick={() => handleNav(item.path)}
              />
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">
              {TOOLS_NAV.title}
            </p>
            {toolsItems.map((item) => (
              <SidebarNavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                onClick={() => handleNav(item.path)}
              />
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">
              {SETTINGS_NAV.title}
            </p>
            {SETTINGS_NAV.items.map((item) => (
              <SidebarNavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                onClick={() => handleNav(item.path)}
              />
            ))}
          </div>
        </div>

        {/* User Profile Capsule */}
        <div className="px-4 pb-6 pt-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-white/10 dark:border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-xs font-bold text-white">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{firstName}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{user?.role || "User"}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}