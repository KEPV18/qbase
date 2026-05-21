import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { emitEvent } from "@/services/eventBus";

type ProfileRow = Tables<'profiles'>;

type Role = "admin" | "manager" | "auditor" | "user" | "moderator";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  lastLoginAt?: number;
  needsApprovalNotification?: boolean;
};

type AuthContextValue = {
  user: AppUser | null;
  users: AppUser[];
  login: (email: string, password: string) => Promise<{ ok: boolean; code: string; message: string; user?: AppUser; backend: "supabase" | "local" }>;

  logout: () => void;
  addUser: (user: Omit<AppUser, "id">) => Promise<void>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  changePassword: (id: string, oldPass: string, newPass: string) => boolean;
  reloadUsers: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; message: string }>;
  loading: boolean;
};

const USERS_KEY = "qms_users";
const SESSION_KEY = "qms_session";
const ACTIVATED_KEY = "qms_activated_emails";

const AUTH_LOCAL_DISABLED = (((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_AUTH_LOCAL_DISABLED) ?? "true") === "true";

// Simple hash function for local password storage (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = (((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_AUTH_SALT) as string) || "qms-salt-2026-v1";
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function loadUsersLocal(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveUsersLocal(users: AppUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch { /* non-critical */ }
}

function loadSession(): { userId: string; role: Role; displayName?: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { userId: string; role?: Role; displayName?: string };
    if (!s.userId) return null;
    return { userId: s.userId, role: s.role || "user", displayName: s.displayName };
  } catch {
    return null;
  }
}

function saveSession(userId: string | null, role?: Role, displayName?: string) {
  if (!userId) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role, displayName }));
}

function loadActivatedEmails(): string[] {
  try {
    const raw = localStorage.getItem(ACTIVATED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((e: string) => String(e).toLowerCase()) : [];
  } catch {
    return [];
  }
}

function saveActivatedEmails(emails: string[]) {
  try {
    const norm = emails.map(e => e.toLowerCase());
    localStorage.setItem(ACTIVATED_KEY, JSON.stringify(norm));
  } catch { /* non-critical */ }
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialLocal = (() => {
    if (AUTH_LOCAL_DISABLED) return [];
    const existing = loadUsersLocal();
    if (existing.length === 0) {
      const seeded: AppUser = {
        id: crypto.randomUUID(),
        name: "admin",
        email: "admin@local",
        password: "SET_ON_FIRST_LOGIN", // Will be hashed on first login comparison
        role: "admin",
        active: true,
        lastLoginAt: 0,
      };
      const merged = [seeded];
      saveUsersLocal(merged);
      return merged;
    }
    return existing;
  })();
  const [users, setUsers] = React.useState<AppUser[]>(initialLocal);
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [supabaseDisabled, setSupabaseDisabled] = React.useState(false);
  const isFetchingRef = React.useRef<string | null>(null);
  const syncUserProfileRef = React.useRef<(session: unknown) => Promise<void>>();
  const lastSyncTimestampRef = React.useRef<number>(0);

  // Helper for timeouts with retry
  const withTimeout = async <T,>(promise: Promise<unknown>, timeoutMs: number = 5000): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    );
    return Promise.race([promise, timeout]) as Promise<T>;
  };

  const withRetry = async <T,>(fn: () => Promise<T>, retries: number = 1, delayMs: number = 1000, abortOnTimeout: boolean = false): Promise<T> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err: unknown) {
        if (i === retries || (abortOnTimeout && err.message === "Timeout")) throw err;
        console.warn(`[AUTH] Retry ${i + 1}/${retries} after error:`, err.message);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw new Error("Unreachable");
  };

  const fetchFullUsersList = React.useCallback(async () => {
    if (!supabase || supabaseDisabled) return;

    try {
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
      const roleMap = new Map();
      if (!rErr && roles) {
        roles.forEach(r => roleMap.set(r.user_id, r.role?.toLowerCase()));
      }

      const mapped = (profiles || []).map((r: ProfileRow) => ({
        id: r.user_id || r.id,
        name: r.display_name || (typeof r.email === "string" ? String(r.email).split("@")[0] : "user"),
        email: r.email || "",
        password: "", // SECURITY: Never expose password hashes to frontend
        role: (roleMap.get(r.user_id || r.id) || "user") as Role,
        active: !!(r.is_active ?? false),
        lastLoginAt: r.last_login ? new Date(r.last_login).getTime() : 0,
        needsApprovalNotification: false,
      }));

      setUsers(mapped);
      if (!AUTH_LOCAL_DISABLED) saveUsersLocal(mapped);
    } catch (e) {
      console.error("Error");
    }
  }, [supabaseDisabled]);

  // Internal helper to sync user profile and role from Supabase
  const syncUserProfile = React.useCallback(async (session: unknown) => {
    if (!session?.user) {
      setUser(null);
      saveSession(null);
      return;
    }

    const authUserId = session.user.id;
    const email = session.user.email || "";

    // Debounce: skip if synced within last 10 seconds for same user
    const now = Date.now();
    if (isFetchingRef.current === authUserId || (now - lastSyncTimestampRef.current < 10000)) {
      // Still use cache optimistically
      const cached = loadSession();
      if (cached && cached.userId === authUserId && !user) {
        setUser({
          id: authUserId,
          name: cached.displayName || email.split("@")[0] || "User",
          email, password: "", role: cached.role, active: true, lastLoginAt: Date.now(),
        });
      }
      return;
    }
    isFetchingRef.current = authUserId;
    lastSyncTimestampRef.current = now;

    // OPTIMISTIC: Use cached role immediately
    const cached = loadSession();
    if (cached && cached.userId === authUserId) {
      setUser({
        id: authUserId,
        name: cached.displayName || email.split("@")[0] || "User",
        email, password: "", role: cached.role, active: true, lastLoginAt: Date.now(),
      });
    }

    try {
      const [profileRes, roleRes] = await withRetry(() => Promise.all([
        withTimeout<ProfileRow | null>(supabase!.from("profiles").select("*").eq("user_id", authUserId).maybeSingle(), 15000),
        withTimeout<ProfileRow | null>(supabase!.from("user_roles").select("role").eq("user_id", authUserId).maybeSingle(), 15000),
      ]), 1, 1500, false);

      const profile = profileRes?.data;
      const roleData = roleRes?.data;

      if (profile) {
        const isActive = !!(profile.is_active ?? false);
        if (!isActive) {
          console.warn("[AUTH] User is inactive, signing out.");
          await supabase!.auth.signOut();
          saveSession(null);
          setUser(null);
          return;
        }

        const appRole = (roleData?.role as Role) || "user";
        const appUser: AppUser = {
          id: authUserId,
          name: profile.display_name || email.split("@")[0] || "User",
          email, password: "", role: appRole, active: isActive,
          lastLoginAt: profile.last_login ? new Date(profile.last_login).getTime() : Date.now(),
        };

        setUser(appUser);
        saveSession(appUser.id, appUser.role, appUser.name);
        setUsers(prev => prev.some(u => u.id === appUser.id) ? prev : [appUser, ...prev]);
        fetchFullUsersList();
      } else {
        const fallbackUser: AppUser = {
          id: authUserId,
          name: email.split("@")[0] || "User",
          email, password: "", role: "user", active: true,
        };
        setUser(fallbackUser);
      }
    } catch (err: unknown) {
      console.warn("[AUTH] Profile sync failed, using cache:", err.message);
    } finally {
      isFetchingRef.current = null;
    }
  }, [fetchFullUsersList, user]);

  // Keep ref in sync
  syncUserProfileRef.current = syncUserProfile;

  React.useEffect(() => {
    let mounted = true;
    let bootstrapDone = false;

    const bootstrap = async () => {
      if (!supabase || supabaseDisabled) {
        const local = loadUsersLocal();
        const sessionData = loadSession();
        if (sessionData && local.length > 0) {
          const found = local.find(x => x.id === sessionData.userId);
          if (found) setUser(found);
        }
        setUsers(local);
        setLoading(false);
        return;
      }

      try {
        const cached = loadSession();
        if (cached) {
          setUser({
            id: cached.userId,
            name: cached.displayName || "User",
            email: "", password: "", role: cached.role, active: true,
          });
          setLoading(false);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          await syncUserProfileRef.current?.(session).catch(() => {});
        } else if (mounted && !session) {
          setUser(null);
          saveSession(null);
        }
        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Error");
        if (mounted) setLoading(false);
      }
      bootstrapDone = true;
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      if (!bootstrapDone && event === 'SIGNED_IN') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await syncUserProfileRef.current?.(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        saveSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
   
  }, [supabaseDisabled]);

  const reloadUsers = React.useCallback(async () => {
    const run = async () => {
      if (supabase && !supabaseDisabled) {
        try {
          const { data, error, status } = await supabase.from("profiles").select("*");
          if (error) {
            if (status === 403 || status === 401) {
              console.warn(`Supabase ${status} error on reload. Falling back.`);
            }
            setSupabaseDisabled(true);
            if (!AUTH_LOCAL_DISABLED) {
              const local = loadUsersLocal();
              setUsers(local);
              const sessionData = loadSession();
              if (sessionData) {
                const currentId = sessionData.userId;
                const u = local.find(x => x.id === currentId) || null;
                setUser(u);
              }
            } else {
              setUsers([]);
            }
            return;
          }
          const rows = Array.isArray(data) ? data : [];
          let rolesRows: unknown[] = [];
          try {
            const { data: rolesData } = await supabase.from("user_roles").select("*");
            rolesRows = Array.isArray(rolesData) ? rolesData : [];
          } catch { /* non-critical */ }
          const roleByUserId = new Map<string, string>();
          rolesRows.forEach((r: ProfileRow) => {
            if (r && typeof r.user_id === "string" && typeof r.role === "string") {
              roleByUserId.set(r.user_id, r.role.toLowerCase());
            }
          });
          const mapped = rows.map((r: ProfileRow) => {
            const lastLogin = r.last_login ? new Date(r.last_login).getTime() : 0;
            const role = roleByUserId.get(r.user_id || r.id) || "user";
            return {
              id: r.user_id || r.id,
              name: r.display_name || (typeof r.email === "string" ? String(r.email).split("@")[0] : "user"),
              email: r.email || "",
              password: "", // SECURITY: Never expose password hashes to frontend
              role: role as Role,
              active: !!(r.is_active ?? false),
              lastLoginAt: lastLogin,
              needsApprovalNotification: false,
            } as AppUser;
          });
          setUsers(mapped);
          setSupabaseDisabled(false);
          const sessionData = loadSession();
          if (sessionData) {
            const currentId = sessionData.userId;
            const u = mapped.find(x => x.id === currentId) || null;
            setUser(u);
          }
        } catch (e) {
          console.error("Error");
          setSupabaseDisabled(true);
        }
      } else {
        if (!AUTH_LOCAL_DISABLED) {
          const local = loadUsersLocal();
          setUsers(local);
          const sessionData = loadSession();
          if (sessionData) {
            const currentId = sessionData.userId;
            const u = local.find(x => x.id === currentId) || null;
            setUser(u);
          }
        } else {
          setUsers([]);
        }
      }
    };
    await run();
  }, [supabaseDisabled]);

  const register = React.useCallback(async (email: string, password: string, name: string): Promise<{ ok: boolean; message: string }> => {
    if (!supabase) return { ok: false, message: "Supabase connection unavailable" };

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { ok: false, message: error.message };
      if (!data.user) return { ok: false, message: "Could not create user account" };

      const authUserId = data.user.id;

      // Profile + user_roles are auto-created by the database trigger (handle_new_user)
      // No client-side INSERT needed — RLS blocks non-admin writes to profiles/user_roles

      return { ok: true, message: "Registration successful. Pending admin approval." };
    } catch (err: unknown) {
      return { ok: false, message: err.message || "An unexpected error occurred during registration" };
    }
  }, []);

  // NOTE: The onAuthStateChange listener is already set up in the bootstrap useEffect above (line ~303).
  // Do NOT add a second listener here — it causes race conditions and double-fetching.

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        const sessionData = loadSession();
        if (!sessionData) {
          setUser(null);
        } else {
          const currentId = sessionData.userId;
          const u = users.find(x => x.id === currentId) || null;
          setUser(u);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [users]);

  const login = React.useCallback(async (email: string, password: string): Promise<{ ok: boolean; code: string; message: string; user?: AppUser; backend: "supabase" | "local" }> => {
    const backend: "supabase" | "local" = supabase ? "supabase" : "local";
    if (!email.trim()) {
      return { ok: false, code: "email_empty", message: "Email is required", backend };
    }
    if (!password.trim()) {
      return { ok: false, code: "password_empty", message: "Password is required", backend };
    }

    if (backend === "supabase") {
      try {
        const { data: authRes, error: authErr } = await supabase!.auth.signInWithPassword({ email, password });
        if (authErr || !authRes?.user?.id) {
          console.warn("[AUTH] Supabase Auth rejected:", authErr?.message);
          throw new Error("Supabase Auth failed");
        }

        const authUserId = authRes.user.id;
        let profileRow: ProfileRow | null = null;
        try {
          const { data: profRows } = await supabase!
            .from("profiles")
            .select("*")
            .eq("user_id", authUserId)
            .maybeSingle();
          profileRow = profRows as ProfileRow;
        } catch { /* non-critical */ }

        if (!profileRow) {
          const { error: upErr } = await supabase!.from("profiles").insert({
            id: crypto.randomUUID(),
            user_id: authUserId,
            email,
            is_active: true,
            last_login: new Date().toISOString(),
          }).select().maybeSingle();

          if (!upErr) {
            try {
              const { data: profRows2 } = await supabase!
                .from("profiles")
                .select("*")
                .eq("user_id", authUserId)
                .maybeSingle();
              profileRow = profRows2 as ProfileRow;

              await supabase.from("user_roles").insert({
                id: crypto.randomUUID(),
                user_id: authUserId,
                role: "user",
              });
            } catch { /* non-critical */ }
          }
        }

        let role = "user";
        let is_active = true;
        if (profileRow) is_active = !!(profileRow.is_active ?? true);

        // Role Fetch Fallback from Supabase
        if (role === "user") {
          try {
            const { data: rolesRows } = await supabase!
              .from("user_roles")
              .select("role")
              .eq("user_id", authUserId)
              .maybeSingle();
            if (rolesRows?.role) role = String(rolesRows.role).toLowerCase();
          } catch { /* non-critical */ }
        }

        if (!is_active) {
          await supabase!.auth.signOut();
          return { ok: false, code: "inactive", message: "Account not activated", backend };
        }

        const finalLastLogin = profileRow?.last_login ? new Date(profileRow.last_login).getTime() : Date.now();
        const u: AppUser = {
          id: authUserId,
          name: profileRow?.display_name || email.split("@")[0],
          email,
          password: "",
          role: role as Role,
          active: is_active,
          lastLoginAt: finalLastLogin,
          needsApprovalNotification: false,
        };

        setUsers(prev => {
          const idx = prev.findIndex(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...u };
            return copy;
          }
          return [...prev, u];
        });

        setUser(u);
        saveSession(u.id, u.role, u.name);
        setSupabaseDisabled(false);
        // Event: user login (non-blocking)
        emitEvent({
          action: 'login', category: 'security', priority: 'important',
          eventType: 'user.login', title: 'User Login',
          message: `${u.name} logged in (${u.role})`,
          targetId: u.id, metadata: { role: u.role, backend },
        }).catch(() => {});
        return { ok: true, code: "ok", message: "Logged in successfully", user: u, backend };

      } catch (err) {
        console.warn("[AUTH] Supabase Auth rejected, trying custom password column fallback...");
        try {
          const { data: prof, error: pErr } = await supabase!
            .from("profiles")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          // SECURITY: Compare hashed password instead of plain text
          const hashedInput = await hashPassword(password);
          if (!pErr && prof && prof.password === hashedInput) {
            const authUserId = prof.user_id || prof.id;

            let role = "user";
            try {
              const { data: rolesRows } = await supabase!
                .from("user_roles")
                .select("role")
                .eq("user_id", authUserId)
                .maybeSingle();
              if (rolesRows?.role) role = String(rolesRows.role).toLowerCase();
            } catch { /* non-critical */ }

            const isActive = !!(prof.is_active ?? true);
            if (!isActive) return { ok: false, code: "inactive", message: "Account not activated", backend };

            const u: AppUser = {
              id: authUserId,
              name: prof.display_name || email.split("@")[0],
              email,
              password: prof.password || "",
              role: role as Role,
              active: isActive,
              lastLoginAt: prof.last_login ? new Date(prof.last_login).getTime() : Date.now(),
              needsApprovalNotification: false,
            };

            setUser(u);
            saveSession(u.id, u.role, u.name);
            setSupabaseDisabled(false);
            emitEvent({
              action: 'login', category: 'security', priority: 'important',
              eventType: 'user.login_fallback', title: 'User Login (Fallback)',
              message: `${u.name} logged in via password fallback (${u.role})`,
              targetId: u.id, metadata: { role: u.role, backend },
            }).catch(() => {});
            return { ok: true, code: "ok", message: "Logged in successfully", user: u, backend };
          }
        } catch (fallbackErr) {
          console.error("Error");
        }
        console.error("Error");
      }
    }

    // Browser-local fallback (Last resort)
    if (!AUTH_LOCAL_DISABLED) {
      const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (found) {
        const hashedInput = await hashPassword(password);
        if (hashedInput === found.password) {
          const u = { ...found, lastLoginAt: Date.now(), needsApprovalNotification: false };
          setUsers(users.map(x => (x.id === u.id ? u : x)));
          setUser(u);
          saveSession(u.id, u.role, u.name);
          emitEvent({
            action: 'login', category: 'security', priority: 'important',
            eventType: 'user.login_local', title: 'User Login (Local)',
            message: `${u.name} logged in locally (${u.role})`,
            targetId: u.id, metadata: { role: u.role, backend: 'local' },
          }).catch(() => {});
          return { ok: true, code: "ok", message: "Logged in successfully", user: u, backend: "local" };
        }
      }
    }

    return { ok: false, code: "failed", message: "Invalid credentials", backend };
  }, [users, supabaseDisabled]);



  const logout = React.useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[AUTH] Supabase signOut error:", err);
      }
    }
    // Event: user logout (fire before page reload)
    if (user) {
      emitEvent({
        action: 'logout', category: 'security', priority: 'info',
        eventType: 'user.logout', title: 'User Logout',
        message: `${user.name} logged out`,
        targetId: user.id, metadata: { role: user.role },
      }).catch(() => {});
    }
    setUser(null);
    saveSession(null);
    // Clear all potential auth data from localStorage
    localStorage.removeItem(SESSION_KEY);
    // Force a full reload to clear any remaining in-memory state/listeners
    window.location.href = "/login";
  }, []);

  const addUser = React.useCallback(async (userInput: Omit<AppUser, "id">) => {
    const newUser: AppUser = { ...userInput, id: crypto.randomUUID() };
    const updated = [...users, newUser];
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) {
      saveUsersLocal(updated);
    }
    if (supabase) {
      // SECURITY: Hash password before storing in profiles table
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUser.id,
        user_id: newUser.id,
        display_name: newUser.name,
        email: newUser.email,
        password: await hashPassword(newUser.password),
        is_active: !!newUser.active,
        last_login: null,
      });
      if (profileErr) {
        console.error("Error");
      } else {
      }
      try {
        const { error: roleErr } = await supabase.from("user_roles").insert({
          id: crypto.randomUUID(),
          user_id: newUser.id,
          role: newUser.role,
        });
        if (roleErr) {
          console.error("Error");
        } else {
        }
      } catch (e) {
        console.error("Error");
      }

      await reloadUsers();
    }
  }, [users, reloadUsers]);

  const updateUser = React.useCallback(async (id: string, updates: Partial<AppUser>) => {
    // 1. Optimistic update
    const previousUsers = [...users];
    const previousUser = user ? { ...user } : null;

    const updated = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    setUsers(updated);

    // Crucial: Persistence for Local Auth Password Changes
    if (!AUTH_LOCAL_DISABLED) {
      saveUsersLocal(updated);
    }

    if (user && user.id === id) {
      const newUser = { ...user, ...updates };
      setUser(newUser);
      saveSession(newUser.id, newUser.role, newUser.name);
    }

    if (supabase) {
      let failed = false;
      const payload: Record<string, unknown> = {};

      if (typeof updates.name === "string") payload.display_name = updates.name;
      if (typeof updates.email === "string") payload.email = updates.email;
      // SECURITY: Do NOT store plain-text password in profiles table.
      // Password changes go through the admin-update-password Edge Function instead.
      // if (typeof updates.password === "string") payload.password = updates.password;
      if (typeof updates.active === "boolean") payload.is_active = updates.active;
      if (typeof updates.lastLoginAt === "number") payload.last_login = new Date(updates.lastLoginAt).toISOString();

      // Note: updates.password is NOT stored in profiles for Supabase (security).
      // We rely on Supabase Auth for passwords. 
      // If we are in Supabase mode, the "Password" field in AdminAccounts 
      // is primarily for Local Fallback or if they add a custom Edge Function later.

      // Update Profiles
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from("profiles").update(payload).eq("user_id", id);

        if (error) {
          console.error("Error");
          const { error: err2 } = await supabase.from("profiles").update(payload).eq("id", id);
          if (err2) {
            console.error("Error");
            failed = true;
          }
        }
      }

      // Update Roles
      if (typeof updates.role === "string" && !failed) {
        const roleToSave = updates.role.toLowerCase();
        const previousRole = users.find(u => u.id === id)?.role;
        try {
          // Check if it's one of the supported roles
          const validRoles = ["admin", "manager", "auditor", "user", "moderator"];
          if (!validRoles.includes(roleToSave)) {
            console.error("Error");
            failed = true;
          } else {
            const { error: roleErr } = await supabase.from("user_roles").upsert(
              { user_id: id, role: roleToSave },
              { onConflict: "user_id" }
            );

            if (roleErr) {
              console.warn("[AUTH] role upsert FAILED:", roleErr.message, "- trying delete/insert fallback");
              await supabase.from("user_roles").delete().eq("user_id", id);
              const { error: insErr } = await supabase.from("user_roles").insert({
                user_id: id,
                role: roleToSave,
                id: crypto.randomUUID()
              });
              if (insErr) {
                console.error("Error");
                failed = true;
              }
            }
          }
        } catch (e) {
          console.error("Error");
          failed = true;
        }
      }

      if (failed) {
        console.warn("[AUTH] Reverting optimistic update due to failure.");
        setUsers(previousUsers);
        if (!AUTH_LOCAL_DISABLED) saveUsersLocal(previousUsers);
        if (previousUser && user?.id === id) setUser(previousUser);
        throw new Error("Update failed on server. Please check your permissions or network.");
      } else {
        // Event: role change (non-blocking)
        if (typeof updates.role === "string" && previousRole && updates.role !== previousRole) {
          const targetName = users.find(u => u.id === id)?.name || id;
          emitEvent({
            action: 'role_change', category: 'security', priority: 'critical',
            eventType: 'user.role_changed', title: 'User Role Changed',
            message: `${targetName}: ${previousRole} → ${updates.role}`,
            targetId: id, metadata: { previousRole, newRole: updates.role, changedBy: user?.name },
          }).catch(() => {});
        }
        await reloadUsers();
      }
    }
  }, [users, user, reloadUsers]);

  const removeUser = React.useCallback(async (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) {
      saveUsersLocal(updated);
    }
    if (user && user.id === id) {
      setUser(null);
      saveSession(null);
    }
    if (supabase) {
      const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", id);
      if (roleErr) console.error("Error");
      const { error: profErr } = await supabase.from("profiles").delete().eq("user_id", id);
      if (profErr) {
        console.error("Error");
        // Fallback to id column
        const { error: profErr2 } = await supabase.from("profiles").delete().eq("id", id);
        if (profErr2) console.error("Error");
      }
      await reloadUsers();
    }
  }, [users, user, reloadUsers]);

  const resetPassword = React.useCallback(async (email: string): Promise<{ ok: boolean; message: string }> => {
    if (!supabase) {
      return { ok: false, message: "Authentication service unavailable" };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        console.error("Error");
        return { ok: false, message: error.message };
      }
      return { ok: true, message: `Password reset link sent to ${email}` };
    } catch (e) {
      console.error("Error");
      return { ok: false, message: "An unexpected error occurred" };
    }
  }, []);

  const value: AuthContextValue = {
    user,
    users,
    login,

    logout,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    changePassword: async (id, oldPass, newPass) => {
      const u = users.find(x => x.id === id);
      if (!u) return false;
      const hashedOld = await hashPassword(oldPass);
      if (hashedOld !== u.password) return false;
      const hashedNew = await hashPassword(newPass);
      updateUser(id, { password: hashedNew });
      return true;
    },
    reloadUsers,
    register,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
