// ============================================================================
// useAuth.tsx — Thin composition layer
// Delegates to: useSupabaseAuth.ts (session/login/logout) + useUserManagement.ts (CRUD)
// Provides unified AuthContextValue — zero breaking changes for UI consumers.
// ============================================================================

import * as React from "react";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useUserManagement } from "./useUserManagement";
import { AUTH_LOCAL_DISABLED, loadUsersLocal } from "./useAuthUtils";
import type { AppUser, Role } from "@/services/userService";
// Import recordStorage's snapshot functions to keep them in sync
import { setCurrentUserSnapshot, clearCurrentUserSnapshot } from "@/services/recordStorage";

export type { AppUser, Role };

// ── Cached user snapshot for RBAC (avoids REST calls on every write) ──────
export interface CurrentUserSnapshot {
  userId: string;
  email: string;
  role: string;
  department: string | null;
}

export type AuthContextValue = {
  user: AppUser | null;
  users: AppUser[];
  // Cached profile for fast RBAC checks (synced on login/session restore)
  currentUserSnapshot: CurrentUserSnapshot | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; code: string; message: string; user?: AppUser; backend: "supabase" | "local" }>;
  logout: () => void;
  addUser: (user: Omit<AppUser, "id">) => Promise<void>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  changePassword: (id: string, oldPass: string, newPass: string) => Promise<boolean>;
  reloadUsers: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; message: string }>;
  loading: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialLocal = (() => {
    if (AUTH_LOCAL_DISABLED) return [];
    const existing = loadUsersLocal();
    return existing.length > 0 ? existing : [];
  })();

  const [users, setUsers] = React.useState<AppUser[]>(initialLocal);
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [currentUserSnapshot, setCurrentUserSnapshot] = React.useState<CurrentUserSnapshot | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [supabaseDisabled, setSupabaseDisabled] = React.useState(false);

  // ── Core auth (session, login, logout) ──────────────────────────────────
  const {
    login,
    logout,
    register,
    resetPassword,
    syncUserProfile,
  } = useSupabaseAuth({
    user, setUser, setUsers, setLoading, setSupabaseDisabled,
  });

  // ── User management (CRUD, reload) ──────────────────────────────────────
  const {
    reloadUsers,
    addUser,
    updateUser,
    removeUser,
    changePassword,
  } = useUserManagement({
    user, users, setUser, setUsers, setSupabaseDisabled,
  });

  // Wrap login to update snapshot
  const wrappedLogin = React.useCallback(async (email: string, password: string) => {
    const result = await login(email, password);
    if (result.ok && result.user) {
      const snapshot = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        department: result.user.department,
      };
      setCurrentUserSnapshot(snapshot);
      // Also sync with recordStorage for RBAC checks
      setCurrentUserSnapshot(snapshot);
    }
    return result;
  }, [login]);

  // Wrap logout to clear snapshot
  const wrappedLogout = React.useCallback(() => {
    logout();
    setCurrentUserSnapshot(null);
    // Also clear recordStorage's snapshot
    clearCurrentUserSnapshot();
  }, [logout]);

  // Sync snapshot when user changes (from syncUserProfile)
  React.useEffect(() => {
    if (user) {
      const snapshot = {
        userId: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
      };
      setCurrentUserSnapshot(snapshot);
      // Also sync with recordStorage for RBAC checks
      setCurrentUserSnapshot(snapshot);
    } else {
      setCurrentUserSnapshot(null);
      clearCurrentUserSnapshot();
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    users,
    currentUserSnapshot,
    login: wrappedLogin,
    logout: wrappedLogout,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    changePassword,
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
