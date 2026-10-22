/**
 * useSupabaseAuth.concurrent.test.ts
 *
 * Regression guard for the CONCURRENT profile sync.
 *
 * On a cold load the hook starts a profile sync from two places at once:
 * the bootstrap effect (`getSession()` → `syncUserProfile`) and the
 * `INITIAL_SESSION` auth event (`syncUserProfile`).  They overlap by
 * construction — the second one arrives while the first is still fetching
 * the profile.
 *
 * The old de-dup guard made the second caller RETURN IMMEDIATELY, and every
 * caller clears `loading` as soon as it resolves.  So `loading` was cleared
 * while `user` was still null, and `RequireAuth` — which redirects to /login
 * when `!loading && !user` — bounced the user through the login screen on
 * EVERY cold load (and dropped the deep link's query string on the way).
 *
 * These tests lock in:
 *   1. While a profile sync is in flight, `loading` is NOT cleared.
 *   2. The user is set once the profile arrives, and only then is
 *      `loading` cleared.
 *   3. CONTROL — a sync that is NOT overlapping still runs and still clears
 *      `loading`, so the assertions above cannot pass vacuously.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ── Mock the service layer so sync attempts are observable ──────────────────
const fetchUserProfile = vi.fn();
const fetchUserRole = vi.fn();
const fetchUserDepartment = vi.fn();
const mapProfileToAppUser = vi.fn();
const selfProvisionProfile = vi.fn();

vi.mock("@/services/userService", () => ({
  fetchUserProfile: (...a: unknown[]) => fetchUserProfile(...a),
  fetchUserRole: (...a: unknown[]) => fetchUserRole(...a),
  fetchUserDepartment: (...a: unknown[]) => fetchUserDepartment(...a),
  mapProfileToAppUser: (...a: unknown[]) => mapProfileToAppUser(...a),
  selfProvisionProfile: (...a: unknown[]) => selfProvisionProfile(...a),
  createProfile: vi.fn(),
  createUserRole: vi.fn(),
}));

// ── Mock the Supabase client: capture the auth callback, drive events ───────
type Handler = (event: string, session: unknown) => void | Promise<void>;
let capturedHandler: Handler | null = null;
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
  user: { id: "u-1", email: "one@example.com" },
  access_token: "tok",
};

const baseProps = () => ({
  user: null,
  setUser: vi.fn(),
  setUsers: vi.fn(),
  setLoading: vi.fn(),
  setSupabaseDisabled: vi.fn(),
});

describe("useSupabaseAuth — concurrent profile sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    storedSession = null;
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    fetchUserRole.mockResolvedValue("admin");
    fetchUserDepartment.mockResolvedValue("Quality");
    mapProfileToAppUser.mockReturnValue({ id: "u-1", name: "One" });
    selfProvisionProfile.mockResolvedValue(undefined);
  });

  it("does not clear loading while an overlapping profile sync is still in flight", async () => {
    storedSession = SESSION;

    // The profile fetch never resolves until we say so.
    let resolveProfile: (value: unknown) => void = () => {};
    fetchUserProfile.mockImplementation(
      () => new Promise((resolve) => { resolveProfile = resolve; }),
    );

    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));
    // The bootstrap's own sync is now in flight.
    await waitFor(() => expect(fetchUserProfile).toHaveBeenCalledWith("u-1"));

    // The auth event arrives while that sync is still pending.  It is fired
    // WITHOUT being awaited: with the fix it suspends on the shared
    // in-flight sync until the profile arrives.  The microtask flush lets
    // the handler run to its first suspension point, so an early return
    // would already have cleared `loading` by the time we assert.
    await act(async () => {
      void capturedHandler!("INITIAL_SESSION", SESSION);
      await Promise.resolve();
      await Promise.resolve();
    });

    // The auth gate must stay closed — `loading === false` with
    // `user === null` is exactly what makes RequireAuth redirect to /login.
    expect(props.setLoading).not.toHaveBeenCalledWith(false);

    await act(async () => {
      resolveProfile({ id: "p-1", is_active: true });
      await Promise.resolve();
    });

    // The user is set, and only then does loading clear.
    await waitFor(() =>
      expect(props.setUser).toHaveBeenCalledWith(expect.objectContaining({ id: "u-1" })),
    );
    expect(props.setLoading).toHaveBeenCalledWith(false);

    // The overlapping caller must not have started a SECOND fetch.
    expect(fetchUserProfile).toHaveBeenCalledTimes(1);
  });

  it("CONTROL: a single (non-overlapping) sync still sets the user and clears loading", async () => {
    storedSession = SESSION;
    fetchUserProfile.mockResolvedValue({ id: "p-1", is_active: true });

    const { useSupabaseAuth } = await import("@/hooks/useSupabaseAuth");
    const props = baseProps();
    renderHook(() => useSupabaseAuth(props));

    await waitFor(() => expect(capturedHandler).toBeTypeOf("function"));
    await waitFor(() =>
      expect(props.setUser).toHaveBeenCalledWith(expect.objectContaining({ id: "u-1" })),
    );
    expect(props.setLoading).toHaveBeenCalledWith(false);
    expect(fetchUserProfile).toHaveBeenCalledTimes(1);
  });
});
