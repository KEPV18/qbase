// ============================================================================
// QBase — Settings (Dedicated Route)
// NotionWarm aesthetic: narrow settings sidebar + generous content whitespace.
// Replaces the former SettingsModal overlay.
// ============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from "@/hooks/useTheme";
import { useTenantIdentity, useUpdateTenantIdentity, useInvalidateTenantIdentity } from "@/hooks/useTenantIdentity";
import {
  useNotifications,
  SOUND_LEVELS,
  type SoundLevel,
  testNotificationSound,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  User, UserCircle, Mail, Crown, KeyRound, LogOut, Eye, EyeOff,
  Moon, Sun, Palette, Bell, Shield, Server, CheckCircle, Database, Activity,
  AlertTriangle, Loader2, Wifi, WifiOff, Monitor, Settings as SettingsIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Section config — settings-specific sidebar navigation
// ---------------------------------------------------------------------------

type SectionId = "profile" | "security" | "notifications" | "preferences";

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Palette },
];

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  return (
    <div className="flex gap-8 w-full max-w-[1100px] mx-auto">
      {/* Settings sidebar — narrow, no borders, warm bg */}
      <nav className="w-[200px] shrink-0 sticky top-0 self-start">
        <div className="pt-2">
          <div className="flex items-center gap-2 px-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-heading font-bold text-[#2d2d2d] dark:text-[#e8e3db]">Settings</h2>
          </div>
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeSection === s.id
                    ? "bg-[#2d2d2d] text-white"
                    : "text-[#7a756a] hover:text-[#2d2d2d] hover:bg-[#ece8df] dark:hover:bg-[#2a2a26]"
                )}
              >
                <s.icon className={cn("w-[17px] h-[17px]", activeSection === s.id ? "text-white" : "text-[#9f9a8f]")} />
                <span className="text-left">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content area — generous whitespace */}
      <div className="flex-1 min-w-0 pb-12">
        {activeSection === "profile" && <ProfileSection />}
        {activeSection === "security" && <SecuritySection />}
        {activeSection === "notifications" && <NotificationsSection />}
        {activeSection === "preferences" && <PreferencesSection />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header — minimal, spacious
// ---------------------------------------------------------------------------

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-heading font-bold text-[#2d2d2d] dark:text-[#e8e3db] tracking-tight">{title}</h1>
      <p className="text-sm text-[#9f9a8f] mt-1">{description}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#e8e3db] dark:border-[#3a3834] bg-white dark:bg-[#1f1f1c] p-6", className)}>
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-[#f8f6f1] dark:bg-[#2a2a26] flex items-center justify-center shrink-0 border border-[#e8e3db] dark:border-[#3a3834]">
        <Icon className="w-4 h-4 text-[#7a756a]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{title}</h3>
        {description && <p className="text-xs text-[#9f9a8f] mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROFILE SECTION — display name, avatar, email
// ---------------------------------------------------------------------------

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateUser(user.id, { name: displayName.trim() });
      setIsEditing(false);
      toast.success("Name updated", { description: "Your display name has been changed" });
    } catch {
      toast.error("Update failed", { description: "Could not save display name" });
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-destructive/10 text-destructive border-destructive/20";
      case "manager": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "auditor": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Account Information" description="Manage your profile and identity." />

      {/* Avatar + identity card */}
      <Card>
        <CardLabel icon={UserCircle} title="Profile" description="Your avatar and display name." />
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-[#f8f6f1] dark:bg-[#2a2a26] border border-[#e8e3db] dark:border-[#3a3834] flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-[#2d2d2d] dark:text-[#e8e3db]">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-9 text-sm max-w-xs"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-9" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => { setDisplayName(user?.name || ""); setIsEditing(false); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{user?.name || "User"}</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Edit
                </button>
              </div>
            )}
            {user?.role && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("text-[10px] h-5 font-bold capitalize", getRoleColor(user.role))}>
                  {user.role === "admin" && <Crown className="w-2.5 h-2.5 mr-1" />}
                  {user.role}
                </Badge>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-[#9f9a8f] font-medium">Active Session</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Email card (read-only — managed by Supabase Auth) */}
      <Card>
        <CardLabel icon={Mail} title="Email Address" description="Your login email. Managed by Supabase Auth." />
        <div className="flex items-center gap-3">
          <Input
            value={user?.email || ""}
            readOnly
            className="h-9 text-sm max-w-sm bg-[#f8f6f1] dark:bg-[#2a2a26] border-[#e8e3db] dark:border-[#3a3834]"
          />
          <Badge variant="outline" className="text-[10px] h-6 text-[#9f9a8f] border-[#e8e3db]">
            Verified
          </Badge>
        </div>
        <p className="text-xs text-[#9f9a8f] mt-3">
          To change your email, contact your administrator or use Supabase account recovery.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SECURITY SECTION — change password + active sessions + sign out
// ---------------------------------------------------------------------------

function SecuritySection() {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleChangePassword = async () => {
    if (!user || !oldPass || !newPass) return;
    setUpdating(true);
    const ok = await changePassword(user.id, oldPass, newPass);
    setUpdating(false);
    if (!ok) {
      toast.error("Password not changed", { description: "Current password may be incorrect" });
      return;
    }
    setOldPass("");
    setNewPass("");
    toast.success("Password updated", { description: "Your password has been changed" });
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Security & Password" description="Manage your password and active sessions." />

      {/* Change password */}
      <Card>
        <CardLabel icon={KeyRound} title="Change Password" description="Enter your current password and a new one." />
        <div className="space-y-3 max-w-md">
          <div>
            <Label className="text-xs text-[#9f9a8f] uppercase tracking-wider mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showOld ? "text" : "password"}
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••"
                className="h-9 pr-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9f9a8f] hover:text-[#2d2d2d]"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#9f9a8f] uppercase tracking-wider mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="h-9 pr-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9f9a8f] hover:text-[#2d2d2d]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={!oldPass || !newPass || updating}
            className="h-9"
          >
            {updating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Update Password
          </Button>
        </div>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardLabel icon={Monitor} title="Active Sessions" description="Devices currently signed in to your account." />
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-[#e8e3db] dark:border-[#3a3834] bg-[#f8f6f1] dark:bg-[#2a2a26]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">This Device</p>
                <p className="text-xs text-[#9f9a8f]">Current session · {user?.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-6 font-bold gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </Badge>
          </div>
          <p className="text-xs text-[#9f9a8f] px-1">
            Sign out below to end your current session. Other devices will be signed out on their next request.
          </p>
        </div>
      </Card>

      {/* Sign out */}
      <Card>
        <CardLabel icon={LogOut} title="Sign Out" description="End your current session." />
        <Button variant="destructive" onClick={handleSignOut} className="h-9">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS SECTION — sound intensity
// ---------------------------------------------------------------------------

function NotificationsSection() {
  const { soundLevel, setSoundLevel } = useNotifications();

  return (
    <div className="space-y-8">
      <SectionHeader title="Notifications" description="Control how you receive alerts and sounds." />

      <Card>
        <CardLabel icon={Bell} title="Notification Sound" description="Choose when to play sound alerts." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          {(Object.entries(SOUND_LEVELS) as [SoundLevel, { label: string; description: string }][]).map(([level, config]) => (
            <button
              key={level}
              onClick={() => setSoundLevel(level)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-4 rounded-lg border text-center transition-all",
                soundLevel === level
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-[#e8e3db] dark:border-[#3a3834] hover:border-primary/30 hover:bg-[#f8f6f1] dark:hover:bg-[#2a2a26]"
              )}
            >
              <span className="text-xl">
                {level === "off" ? "🔇" : level === "critical_only" ? "🔔" : "🔔🔔"}
              </span>
              <span className={cn("text-xs font-semibold", soundLevel === level ? "text-primary" : "text-[#7a756a]")}>
                {config.label}
              </span>
              <span className="text-[10px] text-[#9f9a8f] leading-tight">{config.description}</span>
            </button>
          ))}
        </div>

        {/* Test sounds */}
        {soundLevel !== "off" && (
          <div className="mt-5 pt-4 border-t border-[#e8e3db] dark:border-[#3a3834]">
            <p className="text-xs text-[#9f9a8f] mb-2">Test notification sounds:</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => testNotificationSound("critical")}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                🔴 Critical
              </button>
              <button
                onClick={() => testNotificationSound("important")}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                🟡 Important
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PREFERENCES SECTION — dark/light, language, accent color, company (admin), diagnostics (admin)
// ---------------------------------------------------------------------------

function PreferencesSection() {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const isAdmin = user?.role === "admin";

  const toggleDark = (checked: boolean) => setTheme(checked ? "dark" : "light");

  return (
    <div className="space-y-8">
      <SectionHeader title="Preferences" description="Customize appearance and behavior." />

      {/* Dark mode toggle */}
      <Card>
        <CardLabel
          icon={isDark ? Moon : Sun}
          title="Theme"
          description="Switch between light and dark appearance."
        />
        <div className="flex items-center justify-between max-w-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f8f6f1] dark:bg-[#2a2a26] border border-[#e8e3db] dark:border-[#3a3834] flex items-center justify-center">
              {isDark ? <Moon className="w-4 h-4 text-[#7a756a]" /> : <Sun className="w-4 h-4 text-[#7a756a]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">Dark Mode</p>
              <p className="text-xs text-[#9f9a8f]">Currently {isDark ? "on" : "off"}</p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleDark} />
        </div>
      </Card>

      {/* Language (English only — app is English-native) */}
      <Card>
        <CardLabel icon={Server} title="Language" description="Interface language." />
        <div className="flex items-center gap-3 max-w-md">
          <Input
            value="English"
            readOnly
            className="h-9 text-sm bg-[#f8f6f1] dark:bg-[#2a2a26] border-[#e8e3db] dark:border-[#3a3834]"
          />
          <Badge variant="outline" className="text-[10px] h-6 text-[#9f9a8f] border-[#e8e3db]">
            Default
          </Badge>
        </div>
        <p className="text-xs text-[#9f9a8f] mt-3">QBase is English-native. Additional languages coming soon.</p>
      </Card>

      {/* Company / Tenant identity — admin only */}
      {isAdmin && (
        <>
          <Separator className="bg-[#e8e3db] dark:bg-[#3a3834] my-2" />
          <CompanySettingsCard />
          <DiagnosticsCard />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Settings Card — admin-only tenant identity configuration
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Purple", value: "#a855f7" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gold", value: "#eab308" },
];

function CompanySettingsCard() {
  const identity = useTenantIdentity();
  const { updateIdentity } = useUpdateTenantIdentity();
  const invalidate = useInvalidateTenantIdentity();

  const [companyName, setCompanyName] = useState(identity.companyName);
  const [logoUrl, setLogoUrl] = useState(identity.companyLogoUrl);
  const [themeColor, setThemeColor] = useState(identity.themeColor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    companyName !== identity.companyName ||
    logoUrl !== identity.companyLogoUrl ||
    themeColor !== identity.themeColor;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateIdentity({
        companyName: companyName.trim(),
        companyLogoUrl: logoUrl.trim(),
        themeColor: themeColor.trim(),
      });
      setSaved(true);
      invalidate();
      setTimeout(() => setSaved(false), 2000);
      toast.success("Company profile updated", { description: "Tenant identity saved" });
    } catch (err) {
      setError("Failed to save. Please try again.");
      toast.error("Save failed", { description: "Could not update company profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardLabel icon={Crown} title="Company Profile" description="Tenant identity shown across the app. Admin only." />
      <div className="space-y-5">
        {/* Company name */}
        <div>
          <Label className="text-xs text-[#9f9a8f] uppercase tracking-wider mb-1.5 block">Company Name</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="QBase"
            className="h-9 text-sm max-w-md"
          />
          <p className="text-[11px] text-[#9f9a8f] mt-1">Shown in navigation and headers. Leave empty for default.</p>
        </div>

        {/* Logo URL */}
        <div>
          <Label className="text-xs text-[#9f9a8f] uppercase tracking-wider mb-1.5 block">Logo URL</Label>
          <div className="flex items-center gap-2 max-w-md">
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1 h-9 text-sm"
            />
            {logoUrl && (
              <div className="w-9 h-9 rounded border border-[#e8e3db] dark:border-[#3a3834] overflow-hidden bg-[#f8f6f1] dark:bg-[#2a2a26] shrink-0">
                <img
                  src={logoUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#9f9a8f] mt-1">Direct URL to logo image (SVG/PNG).</p>
        </div>

        {/* Theme color */}
        <div>
          <Label className="text-xs text-[#9f9a8f] uppercase tracking-wider mb-1.5 block flex items-center gap-1">
            <Palette className="w-3 h-3" /> Theme Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              placeholder="#06b6d4"
              className="w-28 font-mono h-9 text-sm"
            />
            <div
              className="w-9 h-9 rounded border border-[#e8e3db] dark:border-[#3a3834] shrink-0"
              style={{ backgroundColor: themeColor || "#06b6d4" }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setThemeColor(c.value)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                  themeColor === c.value ? "border-[#2d2d2d] dark:border-[#e8e3db] ring-2 ring-primary/20" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={!hasChanges || saving} className="h-9">
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save Changes
          </Button>
          {saved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {error && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Diagnostics Card — Supabase health checks
// ---------------------------------------------------------------------------

function DiagnosticsCard() {
  const [checks, setChecks] = useState<{
    supabase: { status: "idle" | "checking" | "ok" | "error"; latency?: number; msg?: string };
    db: { status: "idle" | "checking" | "ok" | "error"; latency?: number; msg?: string };
    auth: { status: "idle" | "checking" | "ok" | "error"; latency?: number; msg?: string };
  }>({
    supabase: { status: "idle" },
    db: { status: "idle" },
    auth: { status: "idle" },
  });

  const isChecking = checks.supabase.status === "checking" || checks.db.status === "checking" || checks.auth.status === "checking";

  const runDiagnostics = async () => {
    setChecks({ supabase: { status: "checking" }, db: { status: "checking" }, auth: { status: "checking" } });

    // 1. Supabase connectivity (ping via auth session)
    const sbStart = performance.now();
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const sbLatency = Math.round(performance.now() - sbStart);
      if (sessionErr) throw sessionErr;
      setChecks((prev) => ({
        ...prev,
        supabase: { status: "ok", latency: sbLatency, msg: sessionData.session ? "Session active" : "No session (guest)" },
      }));
    } catch (err: any) {
      setChecks((prev) => ({
        ...prev,
        supabase: { status: "error", msg: err.message || "Connection failed" },
      }));
    }

    // 2. Database query (lightweight count on tenant_settings)
    const dbStart = performance.now();
    try {
      const { count, error: dbErr } = await supabase
        .from("tenant_settings")
        .select("*", { count: "exact", head: true });
      const dbLatency = Math.round(performance.now() - dbStart);
      if (dbErr) throw dbErr;
      setChecks((prev) => ({
        ...prev,
        db: { status: "ok", latency: dbLatency, msg: `Tables accessible (${count ?? 0} rows)` },
      }));
    } catch (err: any) {
      setChecks((prev) => ({
        ...prev,
        db: { status: "error", msg: err.message || "DB unreachable" },
      }));
    }

    // 3. Auth service (get user count to verify auth API)
    const authStart = performance.now();
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const authLatency = Math.round(performance.now() - authStart);
      if (userErr && userErr.message?.includes("network")) throw userErr;
      setChecks((prev) => ({
        ...prev,
        auth: { status: "ok", latency: authLatency, msg: userData.user ? `User: ${userData.user.email}` : "Auth API ready" },
      }));
    } catch (err: any) {
      setChecks((prev) => ({
        ...prev,
        auth: { status: "error", msg: err.message || "Auth service failed" },
      }));
    }
  };

  return (
    <Card>
      <CardLabel
        icon={Activity}
        title="System Diagnostics"
        description="Supabase connectivity and health checks. Admin only."
      />
      <div className="space-y-3">
        <HealthRow
          icon={Server}
          label="Supabase API"
          sublabel="REST endpoint connectivity"
          check={checks.supabase}
        />
        <HealthRow
          icon={Database}
          label="PostgreSQL Database"
          sublabel="Query execution & response time"
          check={checks.db}
        />
        <HealthRow
          icon={Shield}
          label="Auth Service"
          sublabel="GoTrue session management"
          check={checks.auth}
        />

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={runDiagnostics} disabled={isChecking} className="h-8 text-xs">
            {isChecking && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            Run Diagnostics
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setChecks({ supabase: { status: "idle" }, db: { status: "idle" }, auth: { status: "idle" } })} className="h-8 text-xs">
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  label,
  sublabel,
  check,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  check: { status: string; latency?: number; msg?: string };
}) {
  const isOk = check.status === "ok";
  const isErr = check.status === "error";
  const isChecking = check.status === "checking";

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-[#e8e3db] dark:border-[#3a3834]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            isOk ? "bg-green-500/10" : isErr ? "bg-red-500/10" : "bg-[#f8f6f1] dark:bg-[#2a2a26]"
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              isOk ? "text-green-600" : isErr ? "text-red-500" : "text-[#7a756a]"
            )}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{label}</p>
          <p className="text-xs text-[#9f9a8f]">{sublabel}</p>
          {check.msg && <p className="text-[11px] text-[#7a756a] mt-0.5">{check.msg}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {check.latency && (
          <span className="text-[10px] text-[#9f9a8f] font-mono">{check.latency}ms</span>
        )}
        {isChecking && <Loader2 className="w-4 h-4 animate-spin text-[#9f9a8f]" />}
        {isOk && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-6 font-bold gap-1">
            <Wifi className="w-2.5 h-2.5" /> OK
          </Badge>
        )}
        {isErr && (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-6 font-bold gap-1">
            <WifiOff className="w-2.5 h-2.5" /> Failed
          </Badge>
        )}
        {!isOk && !isErr && !isChecking && (
          <Badge variant="outline" className="text-[10px] h-6 text-[#9f9a8f] border-[#e8e3db]">Not Checked</Badge>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "idle" | "checking" | "online" | "offline" }) {
  if (status === "checking") return <Loader2 className="w-4 h-4 animate-spin text-[#9f9a8f]" />;
  if (status === "online") return (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-6 font-bold gap-1">
      <Wifi className="w-2.5 h-2.5" /> Online
    </Badge>
  );
  if (status === "offline") return (
    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-6 font-bold gap-1">
      <WifiOff className="w-2.5 h-2.5" /> Offline
    </Badge>
  );
  return <Badge variant="outline" className="text-[10px] h-6 text-[#9f9a8f] border-[#e8e3db]">Not Checked</Badge>;
}