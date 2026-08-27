// ============================================================================
// useAuthUtils.ts - Shared localStorage helpers for auth hooks
// No React. No Supabase. Just localStorage utilities.
// ============================================================================

import type { AppUser, Role } from "@/services/userService";

export { type AppUser, type Role };

export const USERS_KEY = "qms_users";
export const SESSION_KEY = "qms_session";

export function loadUsersLocal(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveUsersLocal(users: AppUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch { /* non-critical */ }
}

export function loadSession(): { userId: string; role: Role; displayName?: string; department?: string | null } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { userId: string; role?: Role; displayName?: string; department?: string | null };
    if (!s.userId) return null;
    return { userId: s.userId, role: s.role || "user", displayName: s.displayName, department: s.department ?? null };
  } catch {
    return null;
  }
}

export function saveSession(userId: string | null, role?: Role, displayName?: string, department?: string | null) {
  if (!userId) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role, displayName, department }));
}

export const AUTH_LOCAL_DISABLED = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_LOCAL_DISABLED === "true") || true;
