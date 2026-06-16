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

export type { AppUser, Role };

export type AuthContextValue = {
  user: AppUser | null;
  users: AppUser[];
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
  const [loading, setLoading] = React.useState<boolean>(true);
  const [supabaseDisabled, setSupabaseDisabled] = React.useState(false);

  // ── Core auth (session, login, logout) ──────────────────────────────────
  const {
    login,
    logout,
    register,
    resetPassword,
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

  const value: AuthContextValue = {
    user,
    users,
    login,
    logout,
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
