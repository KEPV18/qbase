// ============================================================================
// useSupabaseAuth.ts — Core authentication lifecycle (login, logout, session)
// Uses NATIVE GoTrue auth. No RPC workarounds, no cached session hacks.
// ============================================================================

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEvent } from "@/services/eventBus";
import { log } from "@/services/logger";
import {
  fetchUserProfile,
  fetchUserRole,
  fetchUserDepartment,
  mapProfileToAppUser,
  createProfile,
  createUserRole,
} from "@/services/userService";
import type { AppUser } from "@/services/userService";
import { saveSession } from "./useAuthUtils";

interface UseSupabaseAuthProps {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSupabaseDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSupabaseAuth({
  setUser,
  setUsers,
  setLoading,
  setSupabaseDisabled,
}: UseSupabaseAuthProps) {

  const isFetchingRef = React.useRef<string | null>(null);
  const lastSyncTimestampRef = React.useRef<number>(0);

  /* ── Profile Sync ───────────────────────────────────────────────────────── */

  const syncUserProfile = React.useCallback(async (session: { user: { id: string; email?: string } }) => {
    if (!session?.user) {
      setUser(null);
      saveSession(null);
      return;
    }

    const authUserId = session.user.id;
    const email = session.user.email || "";

    const now = Date.now();
    if (isFetchingRef.current === authUserId && (now - lastSyncTimestampRef.current < 5000)) {
      return;
    }
    isFetchingRef.current = authUserId;
    lastSyncTimestampRef.current = now;

    try {
      const [profile, role, department] = await Promise.all([
        fetchUserProfile(authUserId),
        fetchUserRole(authUserId),
        fetchUserDepartment(authUserId),
      ]);

      if (profile) {
        const isActive = !!(profile.is_active ?? false);
        if (!isActive) {
          await supabase.auth.signOut();
          saveSession(null);
          setUser(null);
          return;
        }
        const appUser = mapProfileToAppUser(profile, role, department);
        setUser(appUser);
        saveSession(appUser.id, appUser.role, appUser.name, appUser.department);
        setUsers(prev => prev.some(u => u.id === appUser.id) ? prev : [appUser, ...prev]);
      } else {
        // No profile — auto-create one so bootstrap completes and the user is usable.
        // Create profile + role in parallel (non-blocking; failures fall back to basic user).
        const emailName = email.split("@")[0] || "User";
        try {
          await Promise.all([
            createProfile({
              id: crypto.randomUUID(),
              user_id: authUserId,
              display_name: emailName,
              email,
              is_active: true,
              last_login: new Date().toISOString(),
            }),
            createUserRole({ id: crypto.randomUUID(), user_id: authUserId, role: "user" }),
          ]);
        } catch {
          // Non-fatal: profile creation may be blocked by RLS; fall back to basic user.
          log.auth.unauthorized("profile_autocreate_failed", authUserId);
        }
        // Set minimal user so UI doesn't hang; setLoading guaranteed in finally below.
        setUser({
          id: authUserId,
          name: emailName,
          email, password: "", role: "user", department: null, active: true, lastLoginAt: Date.now(),
        });
      }
    } catch (err: unknown) {
      // Auth OK but profile fetch failed — set basic user so loading stops.
      // The finally block guarantees setLoading(false) is called in every path.
      log.auth.unauthorized("profile_sync_fallback", authUserId);
      setUser({
        id: authUserId,
        name: email.split("@")[0] || "User",
        email, password: "", role: "user", department: null, active: true, lastLoginAt: Date.now(),
      });
    } finally {
      // CRITICAL: setLoading(false) must run in every path — including exceptions —
      // so the UI never hangs on a spinner if profile sync rejects or hangs.
      setLoading(false);
      isFetchingRef.current = null;
    }
  }, [setUser, setUsers, setLoading]);

  /* ── Bootstrap Effect ─────────────────────────────────────────────────── */

  const bootstrapInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (bootstrapInitializedRef.current) return;
    bootstrapInitializedRef.current = true;

    let mounted = true;
    let loadingCleared = false;

    const clearLoading = () => {
      if (!loadingCleared && mounted) {
        loadingCleared = true;
        setLoading(false);
      }
    };

    // SAFETY NET: Force clear loading after 6 seconds regardless
    const safetyTimer = setTimeout(clearLoading, 6000);

    const bootstrap = async () => {
      try {
        // getSession reads from localStorage — should be fast
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (mounted && session) {
          // Session found immediately — sync profile
          await syncUserProfile(session as { user: { id: string; email?: string } });
        } else {
          // No session — stop blocking UI immediately
          setUser(null);
          saveSession(null);
        }
        clearLoading();
      } catch (err: unknown) {
        log.auth.unauthorized("bootstrap_getsession_failed");
        clearLoading();
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'INITIAL_SESSION') {
        if (session) {
          await syncUserProfile(session as { user: { id: string; email?: string } });
        } else {
          setUser(null);
          saveSession(null);
        }
        clearLoading();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          await syncUserProfile(session as { user: { id: string; email?: string } });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        saveSession(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  /* ── Storage Sync ───────────────────────────────────────────────────────── */

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("sb-") || e.key === "qms_session") {
        if (!e.newValue) setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setUser]);

  /* ── Login ──────────────────────────────────────────────────────────────── */

  const login = React.useCallback(async (email: string, password: string) => {
    const backend = "supabase" as const;
    if (!email.trim()) {
      setLoading(false);
      return { ok: false, code: "email_empty", message: "Email is required", backend };
    }
    if (!password.trim()) {
      setLoading(false);
      return { ok: false, code: "password_empty", message: "Password is required", backend };
    }

    try {
      // Native GoTrue signIn — creates sb-*-auth-token in localStorage
      const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr || !authRes?.user?.id) {
        setLoading(false);
        return { ok: false, code: "failed", message: authErr?.message || "Invalid credentials", backend };
      }

      const authUserId = authRes.user.id;
      const emailName = email.split("@")[0] || "User";

      // Parallel fetch: profile, role, department
      const [profile, role, department] = await Promise.all([
        fetchUserProfile(authUserId),
        fetchUserRole(authUserId),
        fetchUserDepartment(authUserId),
      ]);

      // Set guard so onAuthStateChange SIGNED_IN doesn't re-sync
      isFetchingRef.current = authUserId;
      lastSyncTimestampRef.current = Date.now();

      if (!profile) {
        // Create profile + role in parallel if missing
        const newProfileId = crypto.randomUUID();
        await Promise.all([
          createProfile({
            id: newProfileId,
            user_id: authUserId,
            display_name: emailName,
            email,
            is_active: true,
            last_login: new Date().toISOString(),
          }),
          createUserRole({ id: crypto.randomUUID(), user_id: authUserId, role: "user" }),
        ]);
        // Construct AppUser directly — no re-fetch needed
        const newUser: AppUser = {
          id: authUserId,
          name: emailName,
          email,
          password: "",
          role: "user",
          department: null,
          active: true,
          lastLoginAt: Date.now(),
        };
        setUser(newUser);
        saveSession(newUser.id, newUser.role, newUser.name, null);
        setUsers(prev => prev.some(u => u.id === newUser.id) ? prev : [newUser, ...prev]);
        setSupabaseDisabled(false);
        setLoading(false);

        emitEvent({
          action: 'login', category: 'security', priority: 'important',
          eventType: 'user.login', title: 'User Login',
          message: `${newUser.name} logged in (${newUser.role})`, targetId: newUser.id,
          metadata: { role: newUser.role, backend },
        }).catch(() => {});
        return { ok: true, code: "ok", message: "Logged in successfully", user: newUser, backend };
      }

      const isActive = !!(profile.is_active ?? true);
      if (!isActive) {
        setLoading(false);
        await supabase.auth.signOut();
        return { ok: false, code: "inactive", message: "Account not activated", backend };
      }

      // Update last_login in background (don't await)
      supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("user_id", authUserId).then(() => {}, () => {});

      const appUser = mapProfileToAppUser(profile, role, department);

      setUsers(prev => {
        const idx = prev.findIndex(x => x.id === appUser.id || x.email.toLowerCase() === appUser.email.toLowerCase());
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...appUser };
          return copy;
        }
        return [...prev, appUser];
      });
      setUser(appUser);
      saveSession(appUser.id, appUser.role, appUser.name, appUser.department);
      setSupabaseDisabled(false);
      setLoading(false); // <-- CRITICAL: clear loading on SUCCESS

      emitEvent({
        action: 'login', category: 'security', priority: 'important',
        eventType: 'user.login', title: 'User Login',
        message: `${appUser.name} logged in (${appUser.role})`, targetId: appUser.id,
        metadata: { role: appUser.role, backend },
      }).catch(() => {});

      return { ok: true, code: "ok", message: "Logged in successfully", user: appUser, backend };
    } catch (err: unknown) {
      setLoading(false); // <-- CRITICAL: clear loading on catch
      return { ok: false, code: "failed", message: (err as Error).message || "Invalid credentials", backend };
    }
  }, [setUser, setUsers, setSupabaseDisabled, setLoading]);

  /* ── Logout ─────────────────────────────────────────────────────────────── */

  const logout = React.useCallback(async () => {
    try { await supabase.auth.signOut(); }
    catch { supabase.auth.stopAutoRefresh(); }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key === "qms_session")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    setUser(null);
    saveSession(null);
    window.location.replace("/login?t=" + Date.now());
  }, [setUser]);

  /* ── Register ───────────────────────────────────────────────────────────── */

  const register = React.useCallback(async (email: string, password: string, _name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { ok: false, message: error.message };
      if (!data.user) return { ok: false, message: "Could not create user account" };
      return { ok: true, message: "Registration successful. Pending admin approval." };
    } catch (err: unknown) {
      return { ok: false, message: (err as Error).message || "Unexpected error" };
    }
  }, []);

  /* ── Reset Password ─────────────────────────────────────────────────────── */

  const resetPassword = React.useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: `Password reset link sent to ${email}` };
    } catch (err: unknown) {
      return { ok: false, message: "An unexpected error occurred" };
    }
  }, []);

  return { login, logout, register, resetPassword, syncUserProfile };
}