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
import { normalizeDepartment, type ApprovalRole } from "@/services/userService";
// Import recordStorage's snapshot functions to keep them in sync.
//
// The setter is ALIASED here.  It used to be imported under the same name
// as the React state setter below, and the state setter — declared later
// in this very function body — shadowed the import for the whole body.
// Every `setCurrentUserSnapshot(snapshot)` in this file therefore called
// React's `useState` setter, and recordStorage's module-level snapshot was
// NEVER written: it stayed `null` for the life of the session.  That
// snapshot is what the storage layer reads to decide the approval
// workflow, so `approveRecord` answered "Unauthorized: please sign in" for
// every record, every new record was stamped `pending_review` no matter
// who created it, and the employee edit guard never fired.
import {
  setCurrentUserSnapshot as setRecordStorageSnapshot,
  clearCurrentUserSnapshot,
  type CurrentUserSnapshot as RecordStorageSnapshot,
} from "@/services/recordStorage";

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
  // Resolves false when the profile/role inserts failed and the optimistic add
  // was reverted, so callers can surface the failure instead of toasting a
  // success for a row that was never written.
  addUser: (user: Omit<AppUser, "id">) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  changePassword: (id: string, oldPass: string, newPass: string) => Promise<boolean>;
  reloadUsers: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; message: string }>;
  loading: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Map the app's user onto the storage layer's RBAC snapshot.
 *
 * The two layers speak different vocabularies.  `userService` knows SEVEN
 * roles ("admin" | "manager" | "auditor" | "user" | "moderator" |
 * "dept_head" | "employee") and keeps the department as a free-form
 * string; `recordStorage` decides the approval workflow from THREE roles
 * and from the six canonical departments.
 *
 * The APPROVAL mapping is deliberately narrow: only a real `admin` and a
 * real `dept_head` carry authority, and everyone else is an `employee` —
 * which is exactly how `resolveApprovalStatus` already treated them.  A
 * `manager` gains no approval right it did not have before, and the server
 * agrees: `record_transition` refuses an approval from anyone who is not
 * an `admin` or the owning `dept_head`.
 *
 * The server's READ and EDIT rules are wider, though: `prime_is_manager_or_admin()`
 * counts a `manager` (so a manager reads the whole register) and
 * `update_record_versioned` lets a `manager` edit a record that is not a
 * draft.  Collapsing the two into one field made the browser show a manager
 * and a department head LESS than the database had already granted them, so
 * the server's own role travels along in `serverRole`.
 */
function toRecordStorageSnapshot(user: {
  id: string;
  email: string;
  role: Role;
  department: string | null;
}): RecordStorageSnapshot {
  const role: ApprovalRole =
    user.role === 'admin' ? 'admin'
      : user.role === 'dept_head' ? 'dept_head'
        : 'employee';
  return {
    userId: user.id,
    email: user.email,
    role,
    // The role the server sees — `public.user_roles.role`.  It is the same
    // value the app shows, but it is kept separately because the server's
    // read and edit rules are wider than its approval rules.
    serverRole: user.role,
    department: normalizeDepartment(user.department),
  };
}

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
      setRecordStorageSnapshot(toRecordStorageSnapshot(result.user));
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
      setRecordStorageSnapshot(toRecordStorageSnapshot(user));
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
