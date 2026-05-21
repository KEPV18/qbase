import {
  Bell, Moon, Sun, Settings, LogOut, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface UserDropdownProps {
  onOpenSettings: () => void;
  onNavigate: (path: string) => void;
}

export function UserDropdown({ onOpenSettings, onNavigate }: UserDropdownProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const firstName = (user?.name || "User").split(" ")[0];
  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const handleThemeToggle = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const themeLabel = resolvedTheme === "dark" ? "Light Mode" : "Dark Mode";
  const ThemeIcon = resolvedTheme === "dark" ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors outline-none">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-[11px] font-bold text-primary">{userInitials}</span>
          </div>
          {/* Name + Chevron */}
          <span className="hidden sm:inline text-[13px] font-medium text-foreground">
            {firstName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            <p className="text-[10px] text-muted-foreground/60 capitalize">{user?.role || "user"}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account */}
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer py-2"
          onClick={() => onNavigate("/notifications")}
        >
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs font-medium text-destructive">{unreadCount}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer py-2"
          onClick={onOpenSettings}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* System */}
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          System
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer py-2"
          onClick={handleThemeToggle}
        >
          <ThemeIcon className="w-4 h-4" />
          <span>{themeLabel}</span>
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">
            {theme === "system" ? "Auto" : resolvedTheme}
          </span>
        </DropdownMenuItem>

        {/* Admin - only for admin users */}
        {user?.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Admin
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer py-2"
              onClick={() => onNavigate("/admin/accounts")}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={() => {
            logout();
            onNavigate("/login");
          }}
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}