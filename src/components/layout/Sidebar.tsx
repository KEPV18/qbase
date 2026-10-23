// ============================================================================
// QBase — Sidebar
// One unified surface with hairline dividers. The active item is a filled
// foreground pill; everything else stays grayscale.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import { useRecords } from "@/hooks/useRecordStorage";
import {
  LayoutDashboard, Layers, FileText, Settings, Bell,
  Database, Shield, Users, BarChart3, Briefcase,
  CheckCircle, LogOut, BookOpen, FileCheck, ShieldCheck, Archive,
  AlertTriangle, Target, X, Calendar, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { getMonthsFromRecords, monthLabel } from "@/lib/temporalUtils";
import { PROJECTS } from "@/data/projectsData";
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
    <NavLink
      to={item.path}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        // A nav row is 44px tall, not 40px.  `text-sm` sets a 20px line
        // box and `py-3` adds 12px above and 12px below, so the row is
        // 20 + 12 + 12 = 44px exactly.  The 40px row it replaces reached
        // 44px only through the shared `::before` extension, which paints
        // 2px of overhang above and below the row: worth nothing once the
        // row is clipped by the nav's scroll viewport (the last four rows
        // sit below the fold at a 950px window), and worth less where a
        // later sibling paints over the band.  A row that is 44px tall on
        // its own IS the target, with no paint order left to contest.
        //
        // The list grows by 4px per row — 16 rows, so 830px of content
        // becomes 894px.  The rail's nav area already scrolls (see the
        // `lg:h-screen` note on the `<aside>`), so the extra 64px is
        // absorbed by that scroll viewport; the filters and the profile
        // card below it are `shrink-0` and keep their space.
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
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
    </NavLink>
  );
}

// Icon-only nav item (collapsed sidebar)
function SidebarIconItem({
  item,
  isActive,
  onClick,
}: {
  item: { label: string; icon: React.ElementType; path: string };
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      title={item.label}
      className={cn(
        "w-full min-h-11 flex items-center justify-center px-2 py-2.5 rounded-lg transition-all duration-200",
        isActive
          ? "bg-foreground text-white dark:bg-muted dark:text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-white dark:text-foreground" : "text-muted-foreground/70")} />
    </NavLink>
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

/** Project filter dropdown for the sidebar */
function ProjectFilterDropdown() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const currentProject = params.get("project") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(location.search);
    if (val) {
      newParams.set("project", val);
    } else {
      newParams.delete("project");
    }
    const search = newParams.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };

  return (
    <div className="relative">
      <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <select
        value={currentProject}
        onChange={handleChange}
        className="w-full h-11 pl-9 pr-4 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
      >
        <option value="">All Projects</option>
        {PROJECTS.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

/** Month filter dropdown for the sidebar */
function MonthFilterDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: records } = useRecords();
  const availableMonths = useMemo(() => getMonthsFromRecords(records || []), [records]);

  // Read current month from URL query param
  const params = new URLSearchParams(location.search);
  const currentMonth = params.get("month") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(location.search);
    if (val) {
      newParams.set("month", val);
    } else {
      newParams.delete("month");
    }
    const search = newParams.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };

  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <select
        value={currentMonth}
        onChange={handleChange}
        className="w-full h-11 pl-9 pr-4 rounded-lg bg-background dark:bg-card border border-border dark:border-border text-sm text-foreground dark:text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
      >
        <option value="">All Months</option>
        {availableMonths.map(m => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose, sidebarOpen, onToggle }: { mobileOpen: boolean; onClose: () => void; sidebarOpen: boolean; onToggle: () => void }) {
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

  // ── Scroll-edge affordance ────────────────────────────────────────────
  // The nav list is taller than the rail, so the last visible row used to be
  // sliced flat against the FILTERS block below it and read as a broken
  // layout rather than as a list that continues.  The fade is drawn only
  // while there is more of the list below the fold, so the bottom row
  // dissolves into the rail instead of being cut, and nothing is faded once
  // the list is scrolled to its end.
  const navRef = useRef<HTMLDivElement>(null);
  const [navHasMore, setNavHasMore] = useState(false);

  const syncNavOverflow = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setNavHasMore(el.scrollHeight - el.clientHeight - el.scrollTop > 2);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    syncNavOverflow();
    const observer = new ResizeObserver(syncNavOverflow);
    observer.observe(el);
    // The list changes height when the rail expands/collapses or when the
    // notification badge appears, so watch the children too.
    Array.from(el.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [syncNavOverflow, sidebarOpen]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          // Glass only where the rail actually overlaps something.  Below
          // `lg` the rail is a `fixed` drawer: it covers the page and its
          // own `bg-black/20` scrim, so the translucency and the blur read
          // as depth.  From `lg` up the rail is `static` — in normal flow,
          // overlapping nothing — so the blur had no layer to refract and
          // the 80% background just let the page show through the rail
          // for no reason.  The desktop rail is therefore a solid surface
          // with the filter removed outright: `lg:backdrop-filter-none`
          // rather than `lg:backdrop-blur-0`, which would leave a
          // `backdrop-filter` in place on a surface that must not have
          // one.  Same reasoning as the TopNav bar beside it.
          "fixed lg:static inset-y-0 left-0 z-50 bg-background/80 backdrop-blur-xl lg:backdrop-filter-none lg:bg-background border-r border-border",
          "flex flex-col transition-all duration-300 ease-spring",
          // `lg:h-screen` keeps the rail exactly one viewport tall.  The
          // rail's content (16 nav items + the filters + the profile card)
          // is ~1137px, so without a bound the STATIC rail stretched the
          // whole document to 1137px: the page scrolled 369px at
          // 1024x768 while the content column beside it stayed put, and
          // the last nav item's 44px target ended up below the fold with
          // the window itself as the only thing that could clip it.  Bounding
          // the rail lets the nav scroll inside itself, which is what its
          // `overflow-y-auto` was always meant to do.
          "lg:h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarOpen ? "w-64" : "w-0 lg:w-16 overflow-hidden lg:overflow-visible"
        )}
      >
        {/* Logo + Toggle */}
        <div className={cn("px-6 pt-8 pb-6 flex items-center shrink-0", sidebarOpen ? "justify-between" : "justify-center")}>
          {sidebarOpen ? (
            <button onClick={() => handleNav("/")} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-foreground dark:bg-card flex items-center justify-center">
                <img src={brandLogo} alt="logo" className="w-5 h-5 object-contain invert" />
              </div>
              <span className="text-lg font-display font-bold text-foreground tracking-tight">
                {displayName || "QBase"}
              </span>
            </button>
          ) : (
            <button onClick={() => handleNav("/")} className="w-9 h-9 rounded-lg bg-foreground dark:bg-card flex items-center justify-center shrink-0">
              <img src={brandLogo} alt="logo" className="w-5 h-5 object-contain invert" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors shrink-0 ds-hit-44"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        {/*
          `min-h-0` on the wrapper lets the rail's scroll area shrink below
          its content (a flex item's automatic minimum size is its content
          height unless it is zeroed), and `py-2` gives the first and the
          last item room: a scroll container clips at its padding box, so the
          2px of overhang a 44px target needs would otherwise be thrown
          away at either end of the list.
        */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={navRef}
            onScroll={syncNavOverflow}
            className={cn("h-full space-y-6 overflow-y-auto py-2", sidebarOpen ? "px-4" : "px-2")}
          >
            <div className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[11px] font-display font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {MAIN_NAV.title}
                </p>
              )}
              {MAIN_NAV.items.map((item) => (
                sidebarOpen ? (
                  <SidebarNavItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path)}
                    onClick={() => handleNav(item.path)}
                  />
                ) : (
                  <SidebarIconItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path)}
                    onClick={() => handleNav(item.path)}
                  />
                )
              ))}
            </div>

            <div className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[11px] font-display font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {TOOLS_NAV.title}
                </p>
              )}
              {TOOLS_NAV.items.map((item) =>
                sidebarOpen ? (
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
                ) : (
                  <SidebarIconItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path)}
                    onClick={() => handleNav(item.path)}
                  />
                )
              )}
            </div>

            <div className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[11px] font-display font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {SETTINGS_NAV.title}
                </p>
              )}
              {SETTINGS_NAV.items.map((item) => (
                sidebarOpen ? (
                  <SidebarNavItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path)}
                    onClick={() => handleNav(item.path)}
                  />
                ) : (
                  <SidebarIconItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path)}
                    onClick={() => handleNav(item.path)}
                  />
                )
              ))}
            </div>
          </div>
          {navHasMore && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-background to-transparent"
            />
          )}
        </div>

        {/* Filters */}
        {sidebarOpen && (
          <div className="px-4 pb-2 space-y-2 shrink-0">
            <p className="px-3 mb-2 text-[11px] font-display font-semibold text-muted-foreground/70 uppercase tracking-wider">
              FILTERS
            </p>
            <ProjectFilterDropdown />
            <MonthFilterDropdown />
          </div>
        )}

        {/* User Profile */}
        <div className={cn("pb-6 pt-4 shrink-0", sidebarOpen ? "px-4" : "px-2")}>
          <div className={cn("flex items-center rounded-lg border border-border bg-card", sidebarOpen ? "gap-3 px-3 py-3" : "gap-2 p-2 justify-center")}>
            <div className="w-9 h-9 rounded-full bg-foreground dark:bg-card flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white dark:text-foreground">{userInitials}</span>
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{firstName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.role || "User"}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors ds-hit-44"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}