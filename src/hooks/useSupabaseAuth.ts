// ============================================================================
// useSupabaseAuth.ts — Core authentication lifecycle (login, logout, session)
// Uses NATIVE GoTrue auth. No RPC workarounds, no cached session hacks.
// ============================================================================

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEvent } from "@/services/eventBus";
import { log } from "@/services/logger";
import { safeEmit } from "@/lib/safeEmit";
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

/* ── Password-recovery redirect detection ─────────────────────────────────── */

/**
 * True when the current URL carries a Supabase password-recovery redirect
 * (`#access_token=...&type=recovery` for the implicit flow, `?type=recovery`
 * for PKCE). Evaluated ONCE at module load, which happens after
 * `integrations/supabase/client.ts` is imported but before its async
 * `_getSessionFromURL()` finishes and erases the fragment — so the marker is
 * still readable here. Reading it later (inside an effect) would be unreliable.
 */
const RECOVERY_REDIRECT_DETECTED = (() => {
  if (typeof window === "undefined") return false;
  // Defensive: some environments (SSR shims, test runners, hardened embeds)
  // expose a `location` without `hash`/`search`. A throw here would happen at
  // module-evaluation time and take down the entire bundle, so never assume
  // these are strings.
  const hash = window.location?.hash;
  const search = window.location?.search;
  const marker = "type=recovery";
  return (
    (typeof hash === "string" && hash.includes(marker)) ||
    (typeof search === "string" && search.includes(marker))
  );
})();

/* ── Persisted recovery marker ────────────────────────────────────────────── */

/**
 * sessionStorage key that keeps "a password recovery is in flight" alive across
 * a page reload (F5).
 *
 * The in-memory `recoveryModeRef` alone is NOT enough: the Supabase client
 * (`detectSessionInUrl: true`) consumes the `#...type=recovery` fragment and
 * erases it, then stores the recovery session in localStorage. On F5 there is
 * no fragment, no fresh `PASSWORD_RECOVERY` event, and a brand-new hook with
 * `recoveryModeRef === false` — while `getSession()` still returns the stored
 * recovery session. Without a durable marker the session would fall through to
 * `syncUserProfile` → `createProfile` + `createUserRole`, i.e. the user gets
 * handed the app before choosing a new password.
 *
 * `sessionStorage` (not localStorage) is deliberate: it is per-tab and dies
 * with the tab, so an abandoned recovery flow cannot lock a user out forever.
 */
export const RECOVERY_PENDING_KEY = "qbase:recovery-pending";

/**
 * Reads the persisted recovery marker. Never assume `sessionStorage` exists —
 * SSR shims, hardened embeds and test runners may omit it or throw on access
 * (Safari private mode quota errors). A throw here would happen during module
 * evaluation or inside the auth bootstrap and take down the whole bundle /
 * hang the UI, so every access is guarded.
 */
export function readRecoveryPending(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const store = window.sessionStorage;
    if (!store) return false;
    return store.getItem(RECOVERY_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persists the recovery marker. Best-effort — a failure must never break auth. */
export function writeRecoveryPending(): void {
  try {
    if (typeof window === "undefined") return;
    const store = window.sessionStorage;
    if (!store) return;
    store.setItem(RECOVERY_PENDING_KEY, "1");
  } catch {
    // Ignore: storage unavailable (private mode / quota / sandboxed iframe).
  }
}

/** Clears the persisted recovery marker. Best-effort, same rationale as above. */
export function clearRecoveryPending(): void {
  try {
    if (typeof window === "undefined") return;
    const store = window.sessionStorage;
    if (!store) return;
    store.removeItem(RECOVERY_PENDING_KEY);
  } catch {
    // Ignore: storage unavailable.
  }
}

export function useSupabaseAuth({
  setUser,
  setUsers,
  setLoading,
  setSupabaseDisabled,
}: UseSupabaseAuthProps) {

  const isFetchingRef = React.useRef<string | null>(null);
  const lastSyncTimestampRef = React.useRef<number>(0);
  // Guards against SIGNED_IN event racing with login() — prevents
  // syncUserProfile from wiping user state set by login().
  const loginInProgressRef = React.useRef<boolean>(false);
  // A password-recovery redirect carries a REAL Supabase session, but the user
  // is NOT an app user yet: they must first choose a new password on
  // /reset-password. While this flag is set we must never run syncUserProfile
  // (that would auto-provision a profile and hand the recovery user the app).
  // It is latched from the redirect URL / PASSWORD_RECOVERY event AND mirrored
  // into sessionStorage (RECOVERY_PENDING_KEY) so it survives an F5 reload —
  // the URL fragment is gone by then while the recovery session persists in
  // localStorage. Cleared on login(), on PASSWORD_RECOVERY completion
  // (USER_UPDATED) and on SIGNED_OUT.
  const recoveryModeRef = React.useRef<boolean>(false);

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

    // Latch recovery mode. Three sources, in order of reliability:
    //   1. the persisted sessionStorage marker (survives an F5 reload — the
    //      Supabase client has already consumed/erased the URL fragment);
    //   2. the module-load fragment marker (first arrival on the redirect);
    //   3. the in-memory ref (already latched by a PASSWORD_RECOVERY event).
    if (readRecoveryPending() || RECOVERY_REDIRECT_DETECTED || recoveryModeRef.current) {
      recoveryModeRef.current = true;
      // Re-persist so the guard is still armed after the *next* reload.
      writeRecoveryPending();
    }

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

        if (recoveryModeRef.current) {
          // Recovery redirect: a session exists but it is NOT an app session.
          // Never sync a profile here — the user must set a new password first.
          setUser(null);
          saveSession(null);
        } else if (mounted && session) {
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

      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via a password-reset link. This event fires INSTEAD of
        // SIGNED_IN for a recovery redirect, but supabase-js may also emit
        // SIGNED_IN right after — so latch recovery mode and return early to
        // keep the recovery session away from syncUserProfile (which would
        // auto-provision a profile and sign the user into the app).
        recoveryModeRef.current = true;
        writeRecoveryPending();
        setUser(null);
        saveSession(null);
        clearLoading();
        return;
      }

      if (recoveryModeRef.current) {
        // Still mid-recovery (or the user abandoned the flow on /reset-password):
        // swallow every auth event that would otherwise start a profile sync.
        if (event === 'SIGNED_OUT') {
          // Recovery finished (ResetPassword calls signOut after updateUser) or
          // was abandoned — release the guard everywhere so the next sign-in is
          // a normal one and the user is not locked out.
          recoveryModeRef.current = false;
          clearRecoveryPending();
        }
        setUser(null);
        saveSession(null);
        clearLoading();
        return;
      }

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
        // Skip re-sync when login() just set the user — prevents the SIGNED_IN
        // event (fired by signInWithPassword) from racing with login() and
        // clobbering the AppUser state via a stale syncUserProfile call.
        if (loginInProgressRef.current) return;
        if (session) {
          await syncUserProfile(session as { user: { id: string; email?: string } });
        }
      } else if (event === 'SIGNED_OUT') {
        clearRecoveryPending();
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
    // An explicit sign-in attempt always abandons any pending recovery flow.
    recoveryModeRef.current = false;
    clearRecoveryPending();
    if (!email.trim()) {
      setLoading(false);
      return { ok: false, code: "email_empty", message: "Email is required", backend };
    }
    if (!password.trim()) {
      setLoading(false);
      return { ok: false, code: "password_empty", message: "Password is required", backend };
    }

    loginInProgressRef.current = true;
    try {
      const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr || !authRes?.user?.id) {
        setLoading(false);
        loginInProgressRef.current = false;
        return { ok: false, code: "failed", message: authErr?.message || "Invalid credentials", backend };
      }

      const authUserId = authRes.user.id;
      const emailName = email.split("@")[0] || "User";

      // Parallel fetch: profile, role, department
      // Uses raw REST (see userService.ts) — bypasses Supabase JS client
      // query builder which hangs on Vercel after signInWithPassword.
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

        safeEmit(
          emitEvent({
            action: 'login', category: 'security', priority: 'important',
            eventType: 'user.login', title: 'User Login',
            message: `${newUser.name} logged in (${newUser.role})`, targetId: newUser.id,
            metadata: { role: newUser.role, backend },
          }),
          'emitEvent:user.login'
        );
        loginInProgressRef.current = false;
        return { ok: true, code: "ok", message: "Logged in successfully", user: newUser, backend };
      }

      const isActive = !!(profile.is_active ?? true);
      if (!isActive) {
        setLoading(false);
        loginInProgressRef.current = false;
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

      safeEmit(
        emitEvent({
          action: 'login', category: 'security', priority: 'important',
          eventType: 'user.login', title: 'User Login',
          message: `${appUser.name} logged in (${appUser.role})`, targetId: appUser.id,
          metadata: { role: appUser.role, backend },
        }),
        'emitEvent:user.login'
      );

      loginInProgressRef.current = false;
      return { ok: true, code: "ok", message: "Logged in successfully", user: appUser, backend };
    } catch (err: unknown) {
      setLoading(false); // <-- CRITICAL: clear loading on catch
      loginInProgressRef.current = false;
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
        // Recovery links must land on the in-app Set-New-Password page, not on
        // /login — the user arrives with a recovery session and needs the form.
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: `Password reset link sent to ${email}` };
    } catch (err: unknown) {
      return { ok: false, message: "An unexpected error occurred" };
    }
  }, []);

  return { login, logout, register, resetPassword, syncUserProfile };
}