import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle, XCircle, Shield, Server, User, Loader2, LogOut,
    Settings as SettingsIcon, AlertTriangle, Moon, Sun, Palette,
    KeyRound, Bell, Monitor, Wifi, WifiOff, HardDrive, Eye, EyeOff,
    Mail, UserCircle, Crown
} from "lucide-react";

import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantIdentity, useUpdateTenantIdentity, useInvalidateTenantIdentity } from "@/hooks/useTenantIdentity";
import { useNotifications, SOUND_LEVELS, type SoundLevel, testNotificationSound, type NotificationPriority } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ACCENT_COLORS = [
    { id: 'cyan', label: 'Cyan', hsl: '186 100% 50%' },
    { id: 'blue', label: 'Blue', hsl: '221 83% 53%' },
    { id: 'green', label: 'Green', hsl: '142 71% 45%' },
    { id: 'purple', label: 'Purple', hsl: '262 83% 58%' },
    { id: 'red', label: 'Red', hsl: '0 84% 60%' },
    { id: 'orange', label: 'Orange', hsl: '25 95% 53%' },
    { id: 'pink', label: 'Pink', hsl: '330 81% 60%' },
    { id: 'gold', label: 'Gold', hsl: '45 93% 47%', adminOnly: true },
];

type TabId = 'account' | 'appearance' | 'company' | 'diagnostics';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, logout, changePassword, updateUser } = useAuth();
    const { theme, setTheme, resolvedTheme } = useTheme();

    const [activeTab, setActiveTab] = useState<TabId>(user?.role === 'admin' ? 'diagnostics' : 'account');
    const [driveStatus, setDriveStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('success');
    const [driveMessage, setDriveMessage] = useState("Supabase is the data backend — no Drive integration required.");
    const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [displayName, setDisplayName] = useState(user?.name || "");
    const [isEditingName, setIsEditingName] = useState(false);
    const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || 'cyan');

    const isDarkMode = resolvedTheme === 'dark';

    useEffect(() => {
        if (user?.name) setDisplayName(user.name);
    }, [user?.name]);

    useEffect(() => {
        const savedAccent = localStorage.getItem('accentColor') || 'cyan';
        setAccentColor(savedAccent);
        document.documentElement.setAttribute('data-accent', savedAccent);
    }, []);

    const toggleDarkMode = (checked: boolean) => {
        setTheme(checked ? 'dark' : 'light');
    };

    const handleCheckDrive = async () => {
        // Drive integration removed — always reports success (Supabase backend)
        setDriveStatus('success');
        setDriveMessage("Connected to Supabase — no Drive required.");
        toast.success("Backend Verified", { description: "Supabase is the data source." });
    };

    const handleGoogleSignIn = () => {
        const isDev = import.meta.env.DEV;
        window.location.href = isDev ? "http://localhost:3001/api/auth" : "/api/auth";
    };

    const handleCheckServer = async () => {
        setServerStatus('checking');
        try {
            const response = await fetch('/api/auth?health=true');
            setServerStatus(response.ok ? 'online' : 'offline');
            if (response.ok) {
                toast.success("Server Online", { description: "Backend connection active." });
            } else {
                toast.error("Server Error", { description: "Could not reach backend." });
            }
        } catch {
            setServerStatus('offline');
            toast.error("Server Offline", { description: "Network error." });
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleChangePassword = async () => {
        if (!user) return;
        const ok = await changePassword(user.id, oldPass, newPass);
        if (!ok) {
            toast.error("Password not changed", { description: "Old password incorrect" });
            return;
        }
        setOldPass(""); setNewPass("");
        toast.success("Password updated", { description: "Your password has been changed" });
    };

    const handleSaveName = () => {
        if (!user || !displayName.trim()) return;
        updateUser(user.id, { name: displayName.trim() });
        setIsEditingName(false);
        toast.success("Name updated", { description: "Your display name has been changed" });
    };

    const handleAccentColorChange = (color: string) => {
        setAccentColor(color);
        localStorage.setItem('accentColor', color);
        document.documentElement.setAttribute('data-accent', color);
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
        { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
        { id: 'company', label: 'Company', icon: <Crown className="w-4 h-4" />, adminOnly: true },
        { id: 'diagnostics', label: 'Diagnostics', icon: <Monitor className="w-4 h-4" />, adminOnly: true },
    ];

    const visibleTabs = tabs.filter(t => !t.adminOnly || user?.role === 'admin');

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'manager': return 'bg-warning/10 text-warning border-warning/20';
            case 'auditor': return 'bg-info/10 text-info border-info/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5 text-lg">
                            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                                <SettingsIcon className="w-4 h-4 text-primary" />
                            </div>
                            Settings
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Manage your account, preferences, and system diagnostics.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 border-b border-border">
                    <div className="flex gap-1">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px",
                                    activeTab === tab.id
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 max-h-[calc(85vh-180px)]">
                    {/* ===== ACCOUNT TAB ===== */}
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            {user && (
                                <div className="flex items-start gap-4 p-4 rounded-sm bg-muted/30 border border-border/50">
                                    <div className="w-14 h-14 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <UserCircle className="w-7 h-7 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isEditingName ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    className="h-8 text-sm"
                                                    autoFocus
                                                />
                                                <Button size="sm" className="h-8 text-xs" onClick={handleSaveName}>Save</Button>
                                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDisplayName(user.name); setIsEditingName(false); }}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm">{user.name}</h3>
                                                <button
                                                    onClick={() => setIsEditingName(true)}
                                                    className="text-[10px] text-primary hover:underline font-medium"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className={cn("text-[10px] h-5 font-bold capitalize", getRoleColor(user.role))}>
                                                {user.role === 'admin' && <Crown className="w-2.5 h-2.5 mr-1" />}
                                                {user.role}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                <span className="text-[10px] text-muted-foreground font-medium">Active Session</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Password Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                                    <Label className="text-sm font-semibold">Change Password</Label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Input
                                            placeholder="Current password"
                                            type={showOldPass ? "text" : "password"}
                                            value={oldPass}
                                            onChange={(e) => setOldPass(e.target.value)}
                                            className="pr-9 h-9 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPass(!showOldPass)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            placeholder="New password"
                                            type={showNewPass ? "text" : "password"}
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            className="pr-9 h-9 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPass(!showNewPass)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleChangePassword}
                                    disabled={!oldPass || !newPass}
                                    className="text-xs"
                                >
                                    Update Password
                                </Button>
                            </div>

                            <Separator />

                            {/* Logout */}
                            <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full sm:w-auto">
                                <LogOut className="w-3.5 h-3.5 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    )}

                    {/* ===== APPEARANCE TAB ===== */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-sm bg-muted/30 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
                                        {isDarkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold">Dark Mode</Label>
                                        <p className="text-[11px] text-muted-foreground">Switch between light and dark theme</p>
                                    </div>
                                </div>
                                <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                            </div>

                            {/* Accent Color */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-muted-foreground" />
                                    <Label className="text-sm font-semibold">Accent Color</Label>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {ACCENT_COLORS.map((color) => {
                                        if (color.adminOnly && user?.role !== 'admin') return null;
                                        const isSelected = accentColor === color.id;
                                        return (
                                            <button
                                                key={color.id}
                                                onClick={() => handleAccentColorChange(color.id)}
                                                className={cn(
                                                    "group relative flex flex-col items-center gap-1.5 p-2 rounded-sm transition-all",
                                                    isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/50"
                                                )}
                                                title={color.label}
                                            >
                                                <div
                                                    className={cn(
                                                        "w-7 h-7 rounded-sm transition-transform",
                                                        isSelected && "scale-110 ring-2 ring-offset-2 ring-offset-background"
                                                    )}
                                                    style={{ backgroundColor: `hsl(${color.hsl})`, boxShadow: isSelected ? `0 0 12px hsl(${color.hsl} / 0.4)` : undefined }}
                                                />
                                                <span className="text-[9px] font-medium text-muted-foreground">{color.label}</span>
                                                {color.adminOnly && (
                                                    <Crown className="w-2.5 h-2.5 text-warning absolute -top-0.5 -right-0.5" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notification Sound */}
                            <NotificationSoundSettings />
                        </div>
                    )}

                    {/* ===== COMPANY TAB ===== */}
                    {activeTab === 'company' && user?.role === 'admin' && (
                        <CompanySettingsTab />
                    )}

                    {/* ===== DIAGNOSTICS TAB ===== */}
                    {activeTab === 'diagnostics' && user?.role === 'admin' && (
                        <div className="space-y-4">
                            {/* Google Drive */}
                            <div className="rounded-sm border border-border overflow-hidden">
                                <div className="flex items-center justify-between p-4 bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-sm flex items-center justify-center",
                                            driveStatus === 'success' ? "bg-success/10" : driveStatus === 'error' ? "bg-destructive/10" : "bg-muted"
                                        )}>
                                            <HardDrive className={cn(
                                                "w-4 h-4",
                                                driveStatus === 'success' ? "text-success" : driveStatus === 'error' ? "text-destructive" : "text-muted-foreground"
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold">Google Drive</h4>
                                            <p className="text-[11px] text-muted-foreground">Read & write permission status</p>
                                        </div>
                                    </div>
                                    <StatusIndicator status={driveStatus === 'success' ? 'online' : driveStatus === 'error' ? 'offline' : driveStatus === 'checking' ? 'checking' : 'idle'} />
                                </div>

                                {(driveStatus === 'error' || driveStatus === 'success') && (
                                    <div className={cn(
                                        "px-4 py-3 text-xs flex items-start gap-2 border-t border-border",
                                        driveStatus === 'error' ? "bg-destructive/5 text-destructive" : "bg-success/5 text-success"
                                    )}>
                                        {driveStatus === 'error' ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                                        <span>{driveMessage}</span>
                                    </div>
                                )}

                                <div className="p-3 border-t border-border flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handleCheckDrive} disabled={driveStatus === 'checking'} className="text-xs h-8">
                                        {driveStatus === 'checking' && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                                        Test Permissions
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={handleGoogleSignIn} className="text-xs h-8">
                                        Reconnect
                                    </Button>
                                </div>
                            </div>

                            {/* Server */}
                            <div className="rounded-sm border border-border overflow-hidden">
                                <div className="flex items-center justify-between p-4 bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-sm flex items-center justify-center",
                                            serverStatus === 'online' ? "bg-success/10" : serverStatus === 'offline' ? "bg-destructive/10" : "bg-muted"
                                        )}>
                                            <Server className={cn(
                                                "w-4 h-4",
                                                serverStatus === 'online' ? "text-success" : serverStatus === 'offline' ? "text-destructive" : "text-muted-foreground"
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold">Backend Server</h4>
                                            <p className="text-[11px] text-muted-foreground">API server connectivity</p>
                                        </div>
                                    </div>
                                    <StatusIndicator status={serverStatus === 'online' ? 'online' : serverStatus === 'offline' ? 'offline' : serverStatus === 'checking' ? 'checking' : 'idle'} />
                                </div>

                                {serverStatus === 'offline' && (
                                    <div className="px-4 py-3 text-xs flex items-start gap-2 border-t border-border bg-destructive/5 text-destructive">
                                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>Could not reach backend server. Check your connection.</span>
                                    </div>
                                )}

                                <div className="p-3 border-t border-border">
                                    <Button size="sm" variant="outline" onClick={handleCheckServer} disabled={serverStatus === 'checking'} className="text-xs h-8">
                                        {serverStatus === 'checking' && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                                        Test Connection
                                    </Button>
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="rounded-sm border border-border p-4 bg-muted/10">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">System Info</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Platform', value: 'QMS v2.0' },
                                        { label: 'Standard', value: 'ISO 9001:2015' },
                                        { label: 'Theme', value: isDarkMode ? 'Dark' : 'Light' },
                                        { label: 'Accent', value: accentColor.charAt(0).toUpperCase() + accentColor.slice(1) },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                                            <p className="text-xs font-semibold">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Notification Sound */}
                            <NotificationSoundSettings />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatusIndicator({ status }: { status: 'idle' | 'checking' | 'online' | 'offline' }) {
    if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (status === 'online') return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] h-5 font-bold gap-1">
            <Wifi className="w-2.5 h-2.5" /> Online
        </Badge>
    );
    if (status === 'offline') return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] h-5 font-bold gap-1">
            <WifiOff className="w-2.5 h-2.5" /> Offline
        </Badge>
    );
    return <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Not Checked</Badge>;
}

// ============================================================================
// Company Settings Tab — Admin-only tenant identity configuration
// ============================================================================

function CompanySettingsTab() {
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const PRESET_COLORS = [
        { name: 'Cyan', value: '#06b6d4' },
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Emerald', value: '#10b981' },
        { name: 'Amber', value: '#f59e0b' },
        { name: 'Rose', value: '#f43f5e' },
        { name: 'Violet', value: '#8b5cf6' },
        { name: 'Sky', value: '#0ea5e9' },
        { name: 'Lime', value: '#84cc16' },
    ];

    return (
        <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
                Configure company branding displayed across the application. Changes apply immediately.
            </p>

            {/* Company Name */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Company Name</Label>
                <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Vizzlo Labs"
                    className="font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                    Shown in navigation and headers. Leave empty for default "QMS Forge".
                </p>
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Logo URL</Label>
                <div className="flex items-center gap-2">
                    <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                    />
                    {logoUrl && (
                        <div className="w-8 h-8 rounded border border-border overflow-hidden bg-muted flex-shrink-0">
                            <img
                                src={logoUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Direct URL to logo image (SVG/PNG). Leave empty for default logo.
                </p>
            </div>

            {/* Theme Color */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Accent Color
                </Label>
                <div className="flex items-center gap-2">
                    <Input
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        placeholder="#06b6d4"
                        className="w-28 font-mono"
                    />
                    <div
                        className="w-8 h-8 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: themeColor || '#06b6d4' }}
                    />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => setThemeColor(c.value)}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                themeColor === c.value
                                    ? "border-foreground ring-2 ring-foreground/20"
                                    : "border-transparent"
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Primary accent color. Leave empty for default cyan.
                </p>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={!hasChanges || saving}>
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : saved ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                    ) : null}
                    {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
                </Button>
                {error && <span className="text-xs text-destructive">{error}</span>}
            </div>

            {/* Preview */}
            <div className="rounded border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Preview</p>
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">Q</div>
                    )}
                    <span className="text-sm font-semibold" style={{ color: themeColor || undefined }}>
                        {companyName || 'QMS Forge'}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Notification Sound Settings — embedded in Appearance tab
// ============================================================================

function NotificationSoundSettings() {
    const { soundLevel, setSoundLevel } = useNotifications();

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Notification Sound</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {(Object.entries(SOUND_LEVELS) as [SoundLevel, { label: string; description: string }][]).map(([level, config]) => (
                    <button
                        key={level}
                        onClick={() => setSoundLevel(level)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-sm border text-center transition-all",
                            soundLevel === level
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
                        )}
                    >
                        <span className="text-lg">
                            {level === 'off' ? '🔇' : level === 'critical_only' ? '🔔' : '🔔🔔'}
                        </span>
                        <span className={cn("text-xs font-semibold", soundLevel === level ? "text-primary" : "text-muted-foreground")}>
                            {config.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground leading-tight">{config.description}</span>
                    </button>
                ))}
            </div>
            {/* Test Sounds */}
            {soundLevel !== 'off' && (
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground">Test:</span>
                    <button
                        onClick={() => testNotificationSound('critical')}
                        className="text-[10px] px-2 py-1 rounded-sm bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                        🔴 Critical
                    </button>
                    <button
                        onClick={() => testNotificationSound('important')}
                        className="text-[10px] px-2 py-1 rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                        🟡 Important
                    </button>
                </div>
            )}
        </div>
    );
}
