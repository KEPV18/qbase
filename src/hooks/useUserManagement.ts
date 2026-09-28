// ============================================================================
// useUserManagement.ts — User CRUD + reloadUsers (admin/management operations)
// Depends on: userService.ts (pure DB layer)
// Receives shared state setters from useAuth.tsx composition layer.
// ============================================================================
import { log } from "@/services/logger";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEvent, invalidateRoleCache } from "@/services/eventBus";
import { safeEmit } from "@/lib/safeEmit";
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
    // NOTE: Do NOT call saveSession(null) here — it wipes the current user's
    // qms_session cache, forcing recordStorage.getCurrentUser() into the
    // .from().select().maybeSingle() fallback which hangs on Vercel production.
  }, [setUsers, setSupabaseDisabled]);

  /* ── Add User ───────────────────────────────────────────────────────────── */

  // Legacy hash scheme — used ONLY by the no-Supabase local fallback of
  // changePassword, over in-memory/localStorage state. The profiles.password
  // column is never read or written: passwords live exclusively in Supabase
  // Auth (GoTrue), and storing temporary passwords in the database is
  // forbidden (decision 2026-09-28).
  const hashLegacyPassword = React.useCallback(async (plain: string): Promise<string> => {
    const salt = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_SALT as string) || "qms-salt-2026-v1";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain + salt));
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const addUser = React.useCallback(async (userInput: Omit<AppUser, "id">): Promise<boolean> => {
    const newUser: AppUser = { ...userInput, id: crypto.randomUUID() };
    const previousUsers = [...users];
    const updated = [...users, newUser];
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) saveUsersLocal(updated);

    if (supabase) {
      let failed = false;

      // Profile. No password is written: passwords live in Supabase Auth
      // (GoTrue); the temp password is communicated to the admin out of band.
      const profileRes = await createProfile({
        id: newUser.id,
        user_id: newUser.id,
        display_name: newUser.name,
        email: newUser.email,
        is_active: !!newUser.active,
        last_login: null,
      });
      if (!profileRes.ok) {
        log.system.error("useUserManagement:addUser_profile_failed", String(profileRes.error));
        failed = true;
      }

      // Role
      if (!failed) {
        const roleRes = await createUserRole({
          id: crypto.randomUUID(),
          user_id: newUser.id,
          role: newUser.role,
        });
        if (!roleRes.ok) {
          log.system.error("useUserManagement:addUser_role_failed", String(roleRes.error));
          failed = true;
        }
      }

      if (failed) {
        log.system.error("useUserManagement:addUser_revert", "optimistic add reverted");
        setUsers(previousUsers);
        if (!AUTH_LOCAL_DISABLED) saveUsersLocal(previousUsers);
        return false;
      }

      // The new user's role enters the admin/leadership audience caches.
      invalidateRoleCache();
      await reloadUsers();
    }

    return true;
  }, [users, reloadUsers, hashLegacyPassword]);

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
          // The role change alters the admin/leadership audience caches.
          invalidateRoleCache();
          safeEmit(
            emitEvent({
              action: 'role_change' as const, category: 'security', priority: 'critical',
              eventType: 'user.role_changed', title: 'User Role Changed',
              message: `${targetName}: ${previousRole} → ${updates.role}`,
              targetId: id, metadata: { previousRole, newRole: updates.role, changedBy: user?.name },
            }),
            'emitEvent:user.role_changed'
          );
        }
        await reloadUsers();
      }
    }
  }, [users, user, reloadUsers]);

  /* ── Remove User ────────────────────────────────────────────────────────── */

  const removeUser = React.useCallback(async (id: string) => {
    const previousUsers = [...users];
    const previousUser = user ? { ...user } : null;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    if (!AUTH_LOCAL_DISABLED) saveUsersLocal(updated);

    if (user && user.id === id) {
      setUser(null);
      saveSession(null);
    }

    if (supabase) {
      let failed = false;

      const roleRes = await deleteUserRole(id);
      if (!roleRes.ok) {
        log.system.error("useUserManagement:removeUser_role_delete_failed", String(roleRes.error));
        failed = true;
      }

      const profRes = await deleteUserProfile(id);
      if (!profRes.ok) {
        log.system.error("useUserManagement:removeUser_profile_delete_failed", String(profRes.error));
        failed = true;
      }

      if (failed) {
        log.system.error("useUserManagement:removeUser_revert", "optimistic removal reverted");
        setUsers(previousUsers);
        if (!AUTH_LOCAL_DISABLED) saveUsersLocal(previousUsers);
        if (previousUser && user?.id === id) {
          setUser(previousUser);
          saveSession(previousUser.id, previousUser.role, previousUser.name);
        }
        throw new Error("Remove failed on server. The user was not deleted.");
      }

      // The removed user's role may have been in the admin/leadership caches.
      invalidateRoleCache();
      await reloadUsers();
    }
  }, [users, user, reloadUsers]);

  /* ── Change Password ────────────────────────────────────────────────────── */

  const changePassword = React.useCallback(async (id: string, oldPass: string, newPass: string): Promise<boolean> => {
    const u = users.find(x => x.id === id);
    if (!u) return false;

    if (supabase) {
      // Passwords live in Supabase Auth (GoTrue). profiles.password is a
      // write-only legacy column the client never reads (userService always
      // maps it to ""), so the previous SHA-256 comparison against u.password
      // compared against "" and changePassword always failed in production.
      // Verify the current password by re-authenticating, then update. Only
      // the session's own password may be changed this way.
      if (user && user.id !== id) return false;
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: u.email, password: oldPass });
      if (verifyErr) return false;
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPass });
      if (updateErr) return false;
      return true;
    }

    // Local fallback (no Supabase): the legacy hash comparison.
    const hashedOld = await hashLegacyPassword(oldPass);
    if (hashedOld !== u.password) return false;
    const hashedNew = await hashLegacyPassword(newPass);
    await updateUser(id, { password: hashedNew });
    return true;
  }, [users, user, updateUser, hashLegacyPassword]);

  return {
    reloadUsers,
    addUser,
    updateUser,
    removeUser,
    changePassword,
  };
}
