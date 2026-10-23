// ============================================================================
// QBase — Admin Panel
// Tabs: User Accounts | Company Branding | Activity Log
// Admin-only page. Full control over users, identity, and system monitoring.
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth, AppUser } from "@/hooks/useAuth";
import type { Role } from "@/services/userService";
import { useTenantIdentity, useUpdateTenantIdentity, useInvalidateTenantIdentity } from "@/hooks/useTenantIdentity";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield, UserPlus, Loader2, Save, Mail, User, Trash2,
  CheckCircle, XCircle, Clock, Users, KeyRound, RefreshCw, Search,
  Building2, Image, Palette, Activity, Paintbrush, Eye, Upload,
  Clipboard, Check, ArrowUp, ArrowDown, ChevronsUpDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BRAND_COLORS, DEFAULT_BRAND_COLOR, pickReadableForeground, readableAccentOnWhite } from "@/config/brandColors";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Tab Configuration
// ============================================================================

type AdminTab = "accounts" | "branding" | "activity";

const TABS: { id: AdminTab; label: string; icon: typeof Shield }[] = [
  { id: "accounts", label: "User Accounts", icon: Users },
  { id: "branding", label: "Company Branding", icon: Building2 },
  { id: "activity", label: "Activity Log", icon: Activity },
];

// ============================================================================
// Role Config
// ============================================================================

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive-tint border-destructive/20", icon: Shield },
  dept_head: { label: "Dept Head", color: "bg-primary/10 text-primary-tint border-primary/20", icon: Clipboard },
  employee: { label: "Employee", color: "bg-muted text-muted-foreground border-border", icon: User },
};

/** The role's line icon. Grayscale by default — the badge carries the colour. */
function RoleIcon({ role }: { role: string }) {
  const Icon = ROLE_CONFIG[role]?.icon;
  return Icon ? <Icon className="w-3 h-3 mr-1" aria-hidden="true" /> : null;
}

const DEPARTMENTS = [
  "Sales & Customer Service",
  "HR & Training",
  "Procurement",
  "Quality Control",
  "R&D & Design",
  "Operations",
  "Management",
];

type SortField = "name" | "email" | "role" | "lastLoginAt";
type SortDir = "asc" | "desc";

// ============================================================================
// Main Component
// ============================================================================

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("accounts");

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive-tint" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">System administration and configuration</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-border/50 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary-tint"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "branding" && <BrandingTab />}
        {activeTab === "activity" && <ActivityTab />}
      </div>
    </AppShell>
  );
}

// ============================================================================
// Tab 1: User Accounts (existing functionality)
// ============================================================================

function AccountsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { users, addUser, updateUser, removeUser, resetPassword, user, reloadUsers } = useAuth();
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: AppUser["role"] }>({
    name: "", email: "", role: "employee",
  });
  const [resettingPw, setResettingPw] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<Record<string, Partial<AppUser>>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  /**
   * The user pending deletion.  Removing an account is genuinely
   * irreversible — the auth role is deleted and the profile deactivated —
   * so it earns a confirmation.  The design system's rule: "reserve
   * confirmations for genuinely destructive, irreversible actions".
   *
   * `pending` distinguishes rejecting a not-yet-approved registration
   * from removing an active account; the copy has to name the real
   * consequence, or the dialog is just a speed bump.
   */
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string; email: string; pending: boolean } | null>(null);

  const isProtectedAdmin = (u: AppUser): boolean => {
    const isSelf = user?.id === u.id;
    const isBuiltInAdmin = u.role === "admin" && (u.email === "admin@local" || u.name.toLowerCase() === "administrator");
    return isSelf || isBuiltInAdmin;
  };

  useEffect(() => { reloadUsers(); }, [reloadUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reloadUsers();
    setIsRefreshing(false);
    toast.success("Refreshed", { description: "User list has been updated." });
  };

  const handleAdd = async () => {
    if (!newUser.name || !newUser.email) return;
    const tempPassword = crypto.randomUUID().slice(0, 12).replace(/-/g, "");
    // addUser now returns false and reverts when the profile/role inserts fail,
    // so the temp password is only revealed for a row that actually exists.
    const { name, email, role } = newUser;
    const ok = await addUser({ name, email, role, password: tempPassword, department: null, active: user?.role === "admin", needsApprovalNotification: false });
    if (!ok) {
      toast.error("Account not created", { description: "The user could not be saved. Check your permissions and try again." });
      return;
    }
    setNewUser({ name: "", email: "", role: "employee" });
    toast.success("Account Created", { description: `${name} created. Temporary password: ${tempPassword}` });
  };

  const handleRowEdit = (userId: string, field: keyof AppUser, value: AppUser[keyof AppUser]) => {
    setEditState(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), [field]: value } }));
  };

  const handleSave = async (u: AppUser) => {
    const updates = editState[u.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast("No Changes", { description: "No data was modified." });
      return;
    }
    setSavingRows(prev => ({ ...prev, [u.id]: true }));
    try {
      if (updates.password && typeof updates.password === "string" && updates.password.trim().length > 0) {
        const newPassword = updates.password.trim();
        if (newPassword.length < 6) {
          toast.error("Error", { description: "Password must be at least 6 characters." });
          setSavingRows(prev => ({ ...prev, [u.id]: false }));
          return;
        }
        const { data, error } = await supabase.functions.invoke("admin-update-password", {
          body: { target_user_id: u.id, new_password: newPassword },
        });
        if (error || (data && data.error)) {
          toast.error("Password Change Failed", { description: data?.error || error?.message || "Failed" });
          setSavingRows(prev => ({ ...prev, [u.id]: false }));
          return;
        }
        toast.success("Password Changed", { description: `Password for ${u.name} has been updated.` });
      }
      const otherUpdates = { ...updates }; delete otherUpdates.password;
      if (Object.keys(otherUpdates).length > 0) await updateUser(u.id, otherUpdates);
      toast.success("Saved", { description: `${updates.name || u.name} has been updated.` });
      setEditState(prev => { const s = { ...prev }; delete s[u.id]; return s; });
    } catch {
      toast.error("Error", { description: "Update failed. Please try again." });
    } finally {
      setSavingRows(prev => ({ ...prev, [u.id]: false }));
    }
  };

  const pendingUsers = users.filter(u => !u.active);
  const activeUsers = users.filter(u => u.active);

  const filteredUsers = useMemo(() => {
    const list = users.filter(u => {
      const matchesSearch = searchQuery === "" ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "active" && u.active) ||
        (filterStatus === "pending" && !u.active);
      return matchesSearch && matchesRole && matchesStatus;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "email": cmp = a.email.localeCompare(b.email); break;
        case "role": cmp = a.role.localeCompare(b.role); break;
        case "lastLoginAt": cmp = (a.lastLoginAt || 0) - (b.lastLoginAt || 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [users, searchQuery, filterRole, filterStatus, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex align-middle text-muted-foreground">
      {sortField === field
        ? (sortDir === "asc"
            ? <ArrowUp className="w-3 h-3" aria-hidden="true" />
            : <ArrowDown className="w-3 h-3" aria-hidden="true" />)
        : <ChevronsUpDown className="w-3 h-3 opacity-50" aria-hidden="true" />}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning-tint" />
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-sm bg-background">
                <span className="text-sm font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
                <Badge variant="outline" className={ROLE_CONFIG[u.role]?.color || ""}>
                  <RoleIcon role={u.role} />
                  {u.role}
                </Badge>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => updateUser(u.id, { active: true })} className="h-7 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() =>
                  setPendingRemoval({ id: u.id, name: u.name, email: u.email, pending: true })
                } className="h-7 text-xs">
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" />
            </div>
            <div className="space-y-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v as AppUser["role"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                    <SelectItem key={role} value={role}><RoleIcon role={role} />{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!newUser.name || !newUser.email}>
              <UserPlus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters + Search */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <SelectItem key={role} value={role}><RoleIcon role={role} />{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="ml-auto">
          <RefreshCw className={cn("w-4 h-4 mr-1", isRefreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* User Table */}
      <div className="border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-display font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>Name <SortIcon field="name" /></th>
                <th className="text-left px-4 py-3 font-display font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("email")}>Email <SortIcon field="email" /></th>
                <th className="text-left px-4 py-3 font-display font-semibold">Department</th>
                <th className="text-left px-4 py-3 font-display font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("role")}>Role <SortIcon field="role" /></th>
                <th className="text-left px-4 py-3 font-display font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-display font-semibold">Last Login</th>
                <th className="text-right px-4 py-3 font-display font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className={cn(
                  "border-b border-border/70 hover:bg-muted/50 transition-colors",
                  !u.active && "opacity-50"
                )}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{u.name}</div>
                        {isProtectedAdmin(u) && <div className="text-[9px] text-muted-foreground">Protected</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={u.department || "none"}
                      onValueChange={(val) => {
                        const deptVal = val === "none" ? null : val;
                        updateUser(u.id, { department: deptVal });
                      }}
                      disabled={!u.active}
                    >
                      <SelectTrigger className="h-9 text-xs border-border bg-muted min-w-[140px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {DEPARTMENTS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={u.role}
                      onValueChange={(val) => updateUser(u.id, { role: val as Role })}
                      disabled={!u.active}
                    >
                      <SelectTrigger className="h-9 text-xs border-border bg-muted min-w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                          <SelectItem key={role} value={role}><RoleIcon role={role} />{cfg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.active}
                        onCheckedChange={(checked) => updateUser(u.id, { active: checked })}
                        className={cn(
                          "data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted border-0"
                        )}
                      />
                      <span className={cn(
                        "text-xs font-medium",
                        u.active ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {u.active ? "Active" : "Suspended"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex gap-2 justify-end">
                      {!isProtectedAdmin(u) && (
                        <>
                          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={async () => {
                            /* The old implementation opened a native `prompt()`
                               asking for a new password and then THREW IT AWAY —
                               `resetPassword(email)` only sends a recovery link.
                               The admin believed they had set the password; nobody
                               did.  This now does what it says: it sends the
                               recovery link and tells the admin what happens
                               next.  The user sets their own password on the
                               Set-New-Password page, which is the only path
                               Supabase's recovery flow actually supports. */
                            setResettingPw(p => ({ ...p, [u.id]: true }));
                            try {
                              const res = await resetPassword(u.email);
                              if (res.ok) {
                                toast.success("Reset link sent", {
                                  description: `${u.email} will receive a link to set a new password.`,
                                });
                              } else {
                                toast.error("Reset failed", { description: res.message });
                              }
                            } finally {
                              setResettingPw(p => ({ ...p, [u.id]: false }));
                            }
                          }} disabled={resettingPw[u.id]}>
                            {resettingPw[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs text-destructive-tint hover:text-destructive" onClick={() =>
                            setPendingRemoval({ id: u.id, name: u.name, email: u.email, pending: false })
                          }>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Removal confirmation ──
          Removing an account deletes its auth role and deactivates its
          profile.  That is not undoable, so it is the one action in this
          panel that earns a confirmation.  The copy names the real
          consequence rather than asking a generic "are you sure". */}
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => { if (!open) setPendingRemoval(null); }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              {pendingRemoval?.pending ? "Reject this registration?" : "Remove this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval?.pending
                ? `${pendingRemoval.name} (${pendingRemoval.email}) will be rejected and the account will not be created.`
                : `${pendingRemoval?.name} (${pendingRemoval?.email}) will lose their role and their profile will be deactivated. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingRemoval?.pending ? buttonVariants({ variant: "destructive" }) : buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (!pendingRemoval) return;
                removeUser(pendingRemoval.id)
                  .then(() => {
                    toast.success(pendingRemoval.pending ? "Registration rejected" : "Account removed");
                    setPendingRemoval(null);
                  })
                  .catch(err => {
                    toast.error("Remove failed", { description: err.message });
                    setPendingRemoval(null);
                  });
              }}
            >
              {pendingRemoval?.pending ? "Reject registration" : "Remove account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Tab 2: Company Branding
// ============================================================================

function BrandingTab() {
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
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Configure your company's branding. Changes apply across the entire application — sidebar, top nav, headers, and documents.
      </p>

      {/* Company Name */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-tint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company Name</h3>
              <p className="text-xs text-muted-foreground">Displayed in the sidebar, page headers, and formal documents</p>
            </div>
          </div>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Vizzlo Labs"
            className="font-medium"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave empty to use the default name "QBase".
          </p>
        </CardContent>
      </Card>

      {/* Company Logo */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
              <Image className="w-4 h-4 text-primary-tint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company Logo</h3>
              <p className="text-xs text-muted-foreground">Used in the sidebar header, login page, and exported documents</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-3">
              {/* File Upload */}
              <div className="relative">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setError("Image must be ≤ 2MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setLogoUrl(ev.target?.result as string);
                      setError(null);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-md border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {logoUrl ? "Change Logo" : "Upload Logo"}
                </label>
              </div>
              {/* Or paste URL */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or paste URL</span>
                </div>
              </div>
              <Input
                value={logoUrl.startsWith("data:") ? "" : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports PNG, JPG, SVG. Max 2MB. Transparent backgrounds work best.
              </p>
            </div>
            {/* Logo Preview */}
            <div className="w-16 h-16 rounded-sm border border-border/50 bg-muted/20 flex items-center justify-center shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Building2 className="w-6 h-6 text-ink-4" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary-tint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Accent Color</h3>
              <p className="text-xs text-muted-foreground">Brand color used for buttons, links, highlights, and active states</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder={DEFAULT_BRAND_COLOR}
                className="font-mono"
              />
            </div>
            {themeColor && (
              <div className="w-9 h-9 rounded-lg border border-border shrink-0" style={{ backgroundColor: themeColor }} />
            )}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {BRAND_COLORS.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setThemeColor(color.value)}
                aria-label={color.name}
                aria-pressed={themeColor === color.value}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all",
                  themeColor === color.value ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/50"
                )}
              >
                <div
                  className="w-6 h-6 rounded-sm ring-1 ring-border"
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-[9px] text-muted-foreground">{color.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
              <Paintbrush className="w-4 h-4 text-primary-tint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Preview</h3>
              <p className="text-xs text-muted-foreground">How your branding will appear in the application</p>
            </div>
          </div>
          <div className="border border-border/30 rounded-sm overflow-hidden">
            {/* Simulated Sidebar Header */}
            <div className={cn("flex items-center gap-2.5 px-4 py-3", themeColor ? "" : "bg-muted/30")} style={themeColor ? { backgroundColor: `${themeColor}10` } : {}}>
              <div className="w-7 h-7 rounded-sm overflow-hidden flex items-center justify-center shrink-0" style={themeColor ? { backgroundColor: `${themeColor}20` } : {}}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <Building2 className="w-4 h-4" style={themeColor ? { color: themeColor } : {}} />
                )}
              </div>
              <span
                className="text-sm font-semibold"
                style={themeColor ? { color: readableAccentOnWhite(themeColor) } : {}}
              >
                {companyName || "QBase"}
              </span>
            </div>
            {/* Simulated Button */}
            <div className="px-4 py-3 bg-background flex gap-2">
              {/* The tenant may type any hex, so the label colour on the
                  filled chip is chosen from the fill's own luminance rather
                  than assumed to be white.  On the old raw-500 presets
                  (`#06b6d4` 2.43:1, `#eab308` 1.92:1) white text simply
                  could not be read. */}
              <div
                className="px-3 py-1 rounded-sm text-xs font-medium"
                style={themeColor
                  ? { backgroundColor: themeColor, color: pickReadableForeground(themeColor) }
                  : {}}
              >
                Primary Action
              </div>
              <div
                className="px-3 py-1 rounded-sm text-xs font-medium border"
                style={themeColor
                  ? { borderColor: themeColor, color: readableAccentOnWhite(themeColor) }
                  : {}}
              >
                Secondary
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="min-w-[120px]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" aria-hidden="true" /> Saved
            </>
          ) : "Save Changes"}
        </Button>
        {error && <p className="text-sm text-destructive-tint">{error}</p>}
        {!hasChanges && !saving && <p className="text-xs text-muted-foreground">No changes to save</p>}
      </div>
    </div>
  );
}

// ============================================================================
// Tab 3: Activity Log (placeholder — links to /activity)
// ============================================================================

function ActivityTab() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-tint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">System Activity</h3>
              <p className="text-xs text-muted-foreground">Full audit trail with filtering, search, and export</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The Activity Log tracks all system events — record creation, edits, deletions, user actions, and security events. It includes category-based filtering and real-time updates.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/activity"}>
            <Eye className="w-4 h-4 mr-2" /> Open Full Activity Log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}