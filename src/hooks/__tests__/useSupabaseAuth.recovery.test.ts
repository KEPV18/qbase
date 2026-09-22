/**
 * useSupabaseAuth.recovery.test.ts
 *
 * Regression guard for the password-recovery branch of useSupabaseAuth.
 *
 * A recovery redirect carries a REAL Supabase session, but the user is not an
 * app user yet — they must first set a new password on /reset-password. If the
 * hook routes that session into the normal profile-sync path, the user is
 * auto-provisioned and handed the app without ever resetting the password.
 *
 * These tests lock in:
 *   1. PASSWORD_RECOVERY → no profile sync / no profile creation.
 *   2. A trailing SIGNED_IN (supabase-js may emit it after recovery) is
 *      swallowed while recovery mode is latched.
 *   3. CONTROL — a normal SIGNED_IN with recovery NOT latched DOES sync, so the
 *      negative assertions above cannot pass vacuously.
 *
 * Verified by mutation: deleting the PASSWORD_RECOVERY branch makes test 1 fail
 * with `fetchUserProfile("u-recovery")` being called.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ── Mock the service layer so sync attempts are observable ──────────────────
const fetchUserProfile = vi.fn();
const fetchUserRole = vi.fn();
const fetchUserDepartment = vi.fn();
const mapProfileToAppUser = vi.fn();
const createProfile = vi.fn();
const createUserRole = vi.fn();

vi.mock("@/services/userService", () => ({
  fetchUserProfile: (...a: unknown[]) => fetchUserProfile(...a),
  fetchUserRole: (...a: unknown[]) => fetchUserRole(...a),
  fetchUserDepartment: (...a: unknown[]) => fetchUserDepartment(...a),
  mapProfileToAppUser: (...a: unknown[]) => mapProfileToAppUser(...a),
  createProfile: (...a: unknown[]) => createProfile(...a),
  createUserRole: (...a: unknown[]) => createUserRole(...a),
}));

// ── Mock the Supabase client: capture the auth callback, drive events ───────
type Handler = (event: string, session: unknown) => void | Promise<void>;
let capturedHandler: Handler | null = null;
// Session returned by getSession() — i.e. what localStorage holds. Tests flip
// this to simulate "a recovery session was already persisted".
let storedSession: unknown = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: storedSession } }),
      onAuthStateChange: (cb: Handler) => {
        capturedHandler = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const SESSION = {
  user: { id: "u-recovery", email: "recovery@example.com" },
  access_token: "tok",
};

/**
 * `src/test/setup.ts` replaces `window.sessionStorage` with a NO-OP stub
 * (`getItem` always returns null, `setItem` does nothing). The reload fix is
 * built on that storage, so these tests install a real in-memory implementation
 * for the duration of the file — otherwise the assertions could never observe
 * the marker (and would pass/fail vacuously).
 */
function installMemorySessionStorage(): void {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
  };
  Object.defineProperty(window, "sessionStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

const baseProps = () => ({
  user: null,
  setUser: vi.fn(),
  setUsers: vi.fn(),
  setLoading: vi.fn(),
  setSupabaseDisabled: vi.fn(),
});

describe("useSupabaseAuth — PASSWORD_RECOVERY handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    storedSession = null;
    installMemorySessionStorage();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    // No pre-existing profile → the sync path would create one. This makes an
    // accidental sync unmistakable (createProfile would fire).
    fetchUserProfile.mockResolvedValue(null);
    fetchUserRole.mockResolvedValue(null);
    fetchUserDepartment.mockResolvedValue(null);
    mapProfileToAppUser.mockReturnValue({ id: "u-recovery" });
    createProfile.mockResolvedValue(undefined);
    createUserRole.mockResolvedValue(undefined);
  });

  it("PASSWORD_RECOVERY does not sync/create a profile, and a later SIGNED_IN is swallowed", async () => {
    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));
    await waitFor(() => expect(props.setLoading).toHaveBeenCalled());

    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(createProfile).not.toHaveBeenCalled();

    // ── The recovery redirect event ───────────────────────────────────────
    await act(async () => {
      await capturedHandler!("PASSWORD_RECOVERY", SESSION);
    });

    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(createProfile).not.toHaveBeenCalled();
    expect(createUserRole).not.toHaveBeenCalled();
    expect(props.setUser).toHaveBeenCalledWith(null);

    // ── A trailing SIGNED_IN must not sneak past the latch ────────────────
    await act(async () => {
      await capturedHandler!("SIGNED_IN", SESSION);
    });

    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(createProfile).not.toHaveBeenCalled();
    expect(createUserRole).not.toHaveBeenCalled();
  });

  it("CONTROL: a normal SIGNED_IN does sync the profile", async () => {
    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));

    // Without a preceding recovery event, a signed-in session must sync.
    await act(async () => {
      await capturedHandler!("SIGNED_IN", SESSION);
    });

    await waitFor(() => expect(fetchUserProfile).toHaveBeenCalledWith("u-recovery"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reload coverage. The guard above is in-memory; it dies with the page.
// Supabase (`detectSessionInUrl: true`) consumes and ERASES the
// `#...type=recovery` fragment, then keeps the recovery session in
// localStorage. So on F5 there is no fragment and no PASSWORD_RECOVERY event,
// yet getSession() returns the recovery session. Only the persisted
// sessionStorage marker can hold the guard across that reload.
// ─────────────────────────────────────────────────────────────────────────────
describe("useSupabaseAuth — recovery guard survives a page reload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    storedSession = null;
    installMemorySessionStorage();
    window.sessionStorage.clear();
    // Simulate "already reloaded at /reset-password": no recovery fragment in
    // the URL, no recovery event will fire.
    window.history.replaceState({}, "", "/reset-password");
    fetchUserProfile.mockResolvedValue(null);
    fetchUserRole.mockResolvedValue(null);
    fetchUserDepartment.mockResolvedValue(null);
    mapProfileToAppUser.mockReturnValue({ id: "u-recovery" });
    createProfile.mockResolvedValue(undefined);
    createUserRole.mockResolvedValue(undefined);
  });

  it("persisted marker + stored recovery session (no fragment) => no sync/create", async () => {
    // A fresh page load with the marker written by the previous load.
    window.sessionStorage.setItem("qbase:recovery-pending", "1");
    storedSession = SESSION;

    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));
    await waitFor(() => expect(props.setLoading).toHaveBeenCalled());

    // The recovery session must NOT be turned into an app session.
    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(createProfile).not.toHaveBeenCalled();
    expect(createUserRole).not.toHaveBeenCalled();
    expect(props.setUser).toHaveBeenCalledWith(null);
    // Marker is re-armed so the guard also survives the *next* reload.
    expect(window.sessionStorage.getItem("qbase:recovery-pending")).toBe("1");
  });

  it("marker persists through PASSWORD_RECOVERY and clears on SIGNED_OUT", async () => {
    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));

    await act(async () => {
      await capturedHandler!("PASSWORD_RECOVERY", SESSION);
    });
    expect(window.sessionStorage.getItem("qbase:recovery-pending")).toBe("1");

    // ResetPassword.tsx calls signOut() after a successful updateUser — that
    // SIGNED_OUT is what releases the guard (no permanent lock-out).
    await act(async () => {
      await capturedHandler!("SIGNED_OUT", null);
    });
    expect(window.sessionStorage.getItem("qbase:recovery-pending")).toBeNull();
    expect(createProfile).not.toHaveBeenCalled();
  });

  it("CONTROL: stored session WITHOUT the marker still provisions/logs in", async () => {
    // No marker → this is an ordinary reload of an authenticated user.
    storedSession = SESSION;

    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));

    // Regression guard: the fix must not turn every reload into "no session".
    await waitFor(() => expect(fetchUserProfile).toHaveBeenCalledWith("u-recovery"));
  });
});
