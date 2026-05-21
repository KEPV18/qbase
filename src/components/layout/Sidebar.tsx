import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Menu, X,
  Layers, Wrench, Briefcase, Shield, UsersCog, Activity,
} from "lucide-react";
import { useRecords } from "@/hooks/useRecordStorage";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenantIdentity } from "@/hooks/useTenantIdentity";
import defaultLogo from "@/assets/qms-logo.png";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODULE_NAV_ITEMS, DOCS_NAV_ITEMS, TOOL_NAV_ITEMS, type NavItem } from "@/config/modules";
import { BookOpen } from "lucide-react";

const moduleItems = MODULE_NAV_ITEMS;
const docsItems = DOCS_NAV_ITEMS;
const toolItems = TOOL_NAV_ITEMS;

interface SidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { displayName, logoUrl } = useTenantIdentity();
  const brandLogo = logoUrl || defaultLogo;
  const { user, loading } = useAuth();
  const { data: records } = useRecords();

  // Extract unique project names from Supabase records
  const projects = useMemo(() => {
    if (!records) return [];
    const projs = new Set<string>();
    records.forEach(r => {
      const name = r.formData?.project_name || r.formData?.client_name;
      if (name && typeof name === 'string') projs.add(name);
    });
    return Array.from(projs).sort();
  }, [records]);

  useEffect(() => {
    const pathModule = location.pathname.split("/module/")[1];
    if (pathModule && !expandedItems.includes(pathModule)) {
      setExpandedItems(prev => [...prev, pathModule]);
    }
  }, [location.pathname, expandedItems]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  if (loading) return null;

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    window.dispatchEvent(new CustomEvent('qms-sidebar-toggle', { detail: next }));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNavClick = (path: string, id: string) => {
    navigate(path);
    if (!isCollapsed) toggleExpand(id);
    onModuleChange(id);
  };

  const handleChildClick = (parentId: string, childCode: string) => {
    if (parentId === "projects-all" && childCode) {
      navigate(`/project/${encodeURIComponent(childCode)}`);
      onModuleChange("projects-all");
    } else {
      navigate(childCode);
    }
  };

  const collapsed = isCollapsed;

  interface NavChild {
    id: string;
    label: string;
    code?: string;
  }

  interface NavItemWithChildren extends NavItem {
    children?: NavChild[];
  }

  function NavItemButton({ item }: { item: NavItemWithChildren }) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path));
    const childActive = hasChildren && item.children!.some(c =>
      location.pathname === `/project/${encodeURIComponent(c.code || c.label)}`);

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => item.path ? handleNavClick(item.path, item.id) : toggleExpand(item.id)}
                className={cn(
                  "w-full flex items-center justify-center h-9 rounded-md transition-all duration-200",
                  "hover:bg-accent/10",
                  (isActive || childActive) ? "bg-accent/15 text-accent" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4.5 h-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div>
        <button
          onClick={() => hasChildren ? toggleExpand(item.id) : handleNavClick(item.path, item.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-200",
            "hover:bg-accent/10",
            (isActive || childActive) ? "bg-accent/15 text-accent font-medium" : "text-muted-foreground"
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {hasChildren && (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 shrink-0 transition-transform",
              isExpanded && "rotate-90"
            )} />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border/50 pl-2.5">
            {item.children!.map(child => (
              <button
                key={child.id}
                onClick={() => handleChildClick(item.id, child.code || child.label)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-all",
                  "hover:bg-accent/10",
                  location.pathname === `/project/${encodeURIComponent(child.code || child.label)}`
                    ? "text-accent font-medium"
                    : "text-muted-foreground"
                )}
              >
                <span className="truncate">{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    if (collapsed) {
      return (
        <div className="flex items-center justify-center my-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full bg-surface/80 backdrop-blur-md border-r border-border/30 z-50 transition-all duration-300 flex flex-col",
        collapsed ? "w-[58px]" : "w-[240px]",
        "lg:relative lg:z-auto",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center h-14 border-b border-border/30",
          collapsed ? "px-3 justify-center" : "px-4 justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={brandLogo} alt={displayName} className="w-6 h-6" />
              <span className="text-sm font-semibold text-foreground">{displayName}</span>
            </div>
          )}
          {collapsed && <img src={brandLogo} alt={displayName} className="w-6 h-6" />}

          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-accent/10 text-muted-foreground hidden lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", collapsed ? "px-1.5 py-2" : "px-3 py-1")}>
          <NavItemButton item={{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" }} />

          <SectionLabel icon={Layers} label="Modules" />
          <div className="space-y-0.5">
            {moduleItems.map(item => <NavItemButton key={item.id} item={item} />)}
          </div>

          {projects.length > 0 && (
            <>
              <SectionLabel icon={Briefcase} label="Projects" />
              <div className="space-y-0.5 px-0.5">
                <NavItemButton 
                  item={{ 
                    id: "projects-all", 
                    label: "All Projects", 
                    icon: Briefcase,
                    path: "/projects",
                    children: projects.map(p => ({ 
                      id: `proj-${p}`, 
                      label: p,
                      code: p
                    })) 
                  }} 
                />
              </div>
            </>
          )}

          {/* Manual & Procedures — expandable */}
          <NavItemButton
            item={{
              id: "docs",
              label: "Manual & Procedures",
              icon: BookOpen,
              path: "",
              children: docsItems
                .filter(item => item.id === "iso-manual" || item.id === "procedures")
                .map(item => ({
                  id: item.id,
                  label: item.label,
                  code: item.path,
                }))
            }}
          />

          <SectionLabel icon={Wrench} label="Tools" />
          <div className="space-y-0.5">
            {toolItems.map(item => <NavItemButton key={item.id} item={item} />)}
          </div>

          {/* Admin — only visible to admins */}
          {user?.role === "admin" && (
            <>
              <SectionLabel icon={Shield} label="Admin" />
              <div className="space-y-0.5">
                <NavItemButton item={{ id: "admin-panel", label: "Admin Panel", icon: Shield, path: "/admin/accounts" }} />
                <NavItemButton item={{ id: "admin-activity", label: "Activity Log", icon: Activity, path: "/activity" }} />
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-border/30 py-3",
          collapsed ? "px-2" : "px-4"
        )}>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden w-full p-2 rounded hover:bg-accent/10 text-muted-foreground"
          >
            <Menu className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </aside>

      {/* Mobile trigger button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-3 left-3 z-30 p-2 rounded-md bg-surface/80 backdrop-blur-sm border border-border/30 lg:hidden"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );
}