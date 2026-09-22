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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
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
