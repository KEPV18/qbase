// ============================================================================
// useUserManagement.ts — User CRUD + reloadUsers (admin/management operations)
// Depends on: userService.ts (pure DB layer)
// Receives shared state setters from useAuth.tsx composition layer.
// ============================================================================
import { log } from "@/services/logger";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEvent } from "@/services/eventBus";
import {
  fetchAllUserProfiles,
  mapProfileToAppUser,
  createProfile,
  createUserRole,
  updateProfile,
  upsertUserRole,
  deleteUserRole,
  deleteUserProfile,
  isValidRole,
} from "@/services/userService";
import type { AppUser, Role } from "@/services/userService";
import { saveSession, saveUsersLocal, AUTH_LOCAL_DISABLED } from "./useAuthUtils";

interface UseUserManagementProps {
  user: AppUser | null;
  users: AppUser[];
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  setSupabaseDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useUserManagement({
  user,
  users,
  setUser,
  setUsers,
  setSupabaseDisabled,
}: UseUserManagementProps) {

  /* ── Reload Users ───────────────────────────────────────────────────────── */

  const reloadUsers = React.useCallback(async () => {
    const { profiles, roles, error } = await fetchAllUserProfiles();

    if (error) {
      log.system.error("useUserManagement:reloadUsers_failed", String(error));
      setSupabaseDisabled(true);
      if (!AUTH_LOCAL_DISABLED) {
        const local = saveUsersLocal([]);
        setUsers([]);
      }
      return;
    }

    const roleByUserId = new Map<string, string>();
    roles.forEach(r => {
      if (r && typeof r.user_id === "string" && typeof r.role === "string") {
        roleByUserId.set(r.user_id, r.role.toLowerCase());
      }
    });

    const mapped = profiles.map(p => mapProfileToAppUser(p, roleByUserId.get(p.user_id || p.id)));
    setUsers(mapped);
    setSupabaseDisabled(false);

    const sessionData = saveSession(null);
  }, [setUsers, setSupabaseDisabled]);

  /* ── Add User ───────────────────────────────────────────────────────────── */

  const addUser = React.useCallback(async (userInput: Omit<AppUser, "id">) => {
    const newUser: AppUser = { ...userInput, id: crypto.randomUUID() };
    const updated = [...users, newUser];
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) saveUsersLocal(updated);

    if (supabase) {
      // Profile
      const profileRes = await createProfile({
        id: newUser.id,
        user_id: newUser.id,
        display_name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        is_active: !!newUser.active,
        last_login: null,
      });
      if (!profileRes.ok) {
        log.system.error("useUserManagement:addUser_profile_failed", String(profileRes.error));
      }

      // Role
      const roleRes = await createUserRole({
        id: crypto.randomUUID(),
        user_id: newUser.id,
        role: newUser.role,
      });
      if (!roleRes.ok) {
        log.system.error("useUserManagement:addUser_role_failed", String(roleRes.error));
      }

      await reloadUsers();
    }
  }, [users, reloadUsers]);

  /* ── Update User ────────────────────────────────────────────────────────── */

  const updateUser = React.useCallback(async (id: string, updates: Partial<AppUser>) => {
    const previousUsers = [...users];
    const previousUser = user ? { ...user } : null;

    const updated = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) saveUsersLocal(updated);

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
      if (typeof updates.active === "boolean") payload.is_active = updates.active;
      if (typeof updates.lastLoginAt === "number") payload.last_login = new Date(updates.lastLoginAt).toISOString();

      if (Object.keys(payload).length > 0) {
        const res = await updateProfile(id, payload);
        if (!res.ok) {
          log.system.error("useUserManagement:updateUser_profile_failed", String(res.error));
          failed = true;
        }
      }

      const previousRole = users.find(u => u.id === id)?.role;

      if (typeof updates.role === "string" && !failed) {
        const roleToSave = updates.role.toLowerCase();
        if (!isValidRole(roleToSave)) {
          log.system.error("useUserManagement:updateUser_invalid_role", String(roleToSave));
          failed = true;
        } else {
          const roleRes = await upsertUserRole(id, roleToSave);
          if (!roleRes.ok) {
            log.system.error("useUserManagement:updateUser_role_upsert_failed", String(roleRes.error));
            failed = true;
          }
        }
      }

      if (failed) {
        log.system.error("useUserManagement:updateUser_revert", "optimistic update reverted");
        setUsers(previousUsers);
        if (!AUTH_LOCAL_DISABLED) saveUsersLocal(previousUsers);
        if (previousUser && user?.id === id) setUser(previousUser);
        throw new Error("Update failed on server. Please check your permissions or network.");
      } else {
        if (typeof updates.role === "string" && previousRole && updates.role !== previousRole) {
          const targetName = users.find(u => u.id === id)?.name || id;
          emitEvent({
            action: 'role_change' as const, category: 'security', priority: 'critical',
            eventType: 'user.role_changed', title: 'User Role Changed',
            message: `${targetName}: ${previousRole} → ${updates.role}`,
            targetId: id, metadata: { previousRole, newRole: updates.role, changedBy: user?.name },
          }).catch(() => {});
        }
        await reloadUsers();
      }
    }
  }, [users, user, reloadUsers]);

  /* ── Remove User ────────────────────────────────────────────────────────── */

  const removeUser = React.useCallback(async (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) saveUsersLocal(updated);

    if (user && user.id === id) {
      setUser(null);
      saveSession(null);
    }

    if (supabase) {
      const roleRes = await deleteUserRole(id);
      if (!roleRes.ok) log.system.error("useUserManagement:removeUser_role_delete_failed", String(roleRes.error));

      const profRes = await deleteUserProfile(id);
      if (!profRes.ok) log.system.error("useUserManagement:removeUser_profile_delete_failed", String(profRes.error));

      await reloadUsers();
    }
  }, [users, user, reloadUsers]);

  /* ── Change Password ────────────────────────────────────────────────────── */

  const changePassword = React.useCallback(async (id: string, oldPass: string, newPass: string): Promise<boolean> => {
    const u = users.find(x => x.id === id);
    if (!u) return false;
    // Note: In production, password changes should go through Supabase Auth admin API
    // This local-only fallback is kept for backward compatibility
    const encoder = new TextEncoder();
    const salt = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_SALT as string) || "qms-salt-2026-v1";
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(oldPass + salt));
    const hashedOld = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (hashedOld !== u.password) return false;

    const hashNew = await crypto.subtle.digest("SHA-256", encoder.encode(newPass + salt));
    const hashedNew = Array.from(new Uint8Array(hashNew)).map(b => b.toString(16).padStart(2, "0")).join("");

    await updateUser(id, { password: hashedNew });
    return true;
  }, [users, updateUser]);

  return {
    reloadUsers,
    addUser,
    updateUser,
    removeUser,
    changePassword,
  };
}
