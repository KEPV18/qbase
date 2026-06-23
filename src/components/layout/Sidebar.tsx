// ============================================================================
// QBase - Sidebar (NotionWarm)
// Warm cream sidebar with serif section headers and soft active states
// ============================================================================

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import {
  LayoutDashboard, Layers, FileText, Settings, Bell,
  Database, Shield, Users, BarChart3, Briefcase,
  CheckCircle, LogOut, BookOpen, FileCheck, ShieldCheck, Archive,
  AlertTriangle, Target,
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
    { label: "Forms", icon: FileText, path: "/forms" },
    { label: "Projects Workspace", icon: Briefcase, path: "/projects" },
    { label: "Analytics", icon: BarChart3, path: "/audit" },
    { label: "Procedures", icon: BookOpen, path: "/procedures" },
    { label: "ISO Manual", icon: FileCheck, path: "/iso-manual" },
    { label: "Risk Management", icon: AlertTriangle, path: "/risk-management" },
  ],
};

const TOOLS_NAV: NavSection = {
  title: "TOOLS",
  items: [
    { label: "Approvals", icon: CheckCircle, path: "/admin/approvals" },
    { label: "Audit Trail", icon: Shield, path: "/activity" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
    { label: "KPI Dashboard", icon: Target, path: "/kpi" },
    { label: "SWOT Analysis", icon: BarChart3, path: "/swot-analysis" },
  ],
};

const SETTINGS_NAV: NavSection = {
  title: "SETTINGS",
  items: [
    { label: "Admin", icon: Users, path: "/admin/accounts" },
    { label: "Archive", icon: Archive, path: "/archive" },
    { label: "Data Integrity", icon: ShieldCheck, path: "/admin/data-sanitizer" },
    { label: "Settings", icon: Settings, path: "/settings" },
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
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-foreground text-white dark:bg-muted dark:text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-white dark:text-foreground" : "text-muted-foreground/70")} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span className="text-[10px] font-semibold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
    </button>
  );
}

// Isolated badge component — re-renders alone when count changes
function NotificationNavItem({
  isActive,
  onClick,
}: {
  isActive: boolean;
  onClick: () => void;
}) {
  const { unreadCount } = useNotifications();
  return (
    <SidebarNavItem
      item={{ label: "Notifications", icon: Bell, path: "/notifications", badge: unreadCount || 0 }}
      isActive={isActive}
      onClick={onClick}
    />
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { displayName, logoUrl } = useTenantIdentity();

  const brandLogo = logoUrl || defaultLogo;
  const firstName = (user?.name || "User").split(" ")[0];
  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background/80 backdrop-blur-xl border-r border-border",
          "flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <button onClick={() => handleNav("/")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-foreground dark:bg-card flex items-center justify-center">
              <img src={brandLogo} alt="logo" className="w-5 h-5 object-contain invert" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground tracking-tight">
              {displayName || "QBase"}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[11px] font-heading font-semibold text-muted-foreground/70 uppercase tracking-wider">
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
            <p className="px-3 mb-2 text-[11px] font-heading font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {TOOLS_NAV.title}
            </p>
            {TOOLS_NAV.items.map((item) =>
              item.label === "Notifications" ? (
                <NotificationNavItem
                  key={item.path}
                  isActive={isActive(item.path)}
                  onClick={() => handleNav(item.path)}
                />
              ) : (
                <SidebarNavItem
                  key={item.path}
                  item={item}
                  isActive={isActive(item.path)}
                  onClick={() => handleNav(item.path)}
                />
              )
            )}
          </div>

          <div className="space-y-1">
            <p className="px-3 mb-2 text-[11px] font-heading font-semibold text-muted-foreground/70 uppercase tracking-wider">
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

        {/* User Profile */}
        <div className="px-4 pb-6 pt-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-card">
            <div className="w-9 h-9 rounded-full bg-foreground dark:bg-card flex items-center justify-center">
              <span className="text-xs font-bold text-white dark:text-foreground">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{firstName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.role || "User"}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
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