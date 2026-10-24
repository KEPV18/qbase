// ============================================================================
// userService.ts — Pure data access layer for user/profile/role operations
// NO React. NO hooks. Just Supabase queries with typed interfaces.
// ============================================================================
import { log } from "@/services/logger";

import { supabase } from "@/integrations/supabase/client";
import { ANON_KEY, resolveApiBase, supabaseAuthStorageKey } from "@/integrations/supabase/apiBase";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<'profiles'>;
export type RoleRow    = Tables<'user_roles'>;

export type Role = "admin" | "manager" | "auditor" | "user" | "moderator" | "dept_head" | "employee";
export type Department = "HR" | "Sales" | "Operations" | "Quality" | "RD" | "Management";
export type ApprovalRole = "admin" | "dept_head" | "employee";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  /** Department is stored as a free-form string (DB values vary from the canonical type above). */
  department: string | null;
  active: boolean;
  lastLoginAt?: number;
  needsApprovalNotification?: boolean;
}

// ============================================================================
// Raw REST helpers — bypass the Supabase JS client query builder which can
// hang on Vercel's edge runtime after signInWithPassword fires onAuthStateChange.
// We read the session token from localStorage and call the REST API directly.
// ============================================================================

// The API address and the anon key are resolved at CALL time, not at
// build time — see `apiBase.ts`.  A module-level constant froze the
// address into the bundle, which meant a server that moved or a
// project that was paused could only be fixed by a new build.
const SUPABASE_ANON_KEY = ANON_KEY;

/**
 * The session token, read from the key the Supabase client actually
 * wrote it under.
 *
 * The key is derived by `supabaseAuthStorageKey()` in `apiBase.ts` —
 * from the HOSTNAME of the address in force, exactly the way
 * `@supabase/supabase-js` derives it.  Deriving it any other way gave
 * a key nothing ever writes, and every profile / role / department
 * read then failed with `no_session_token`; the full account of that
 * is in the comment on the helper itself.
 */
function getStoredAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(supabaseAuthStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

export async function restGet<T>(path: string, opts?: { allowAnon?: boolean }): Promise<{ data: T | null; error: string | null }> {
  const token = getStoredAccessToken();
  if (!token && !opts?.allowAnon) return { data: null, error: "no_session_token" };
  try {
    // Use session token if available, otherwise fall back to anon key (for
    // anon-readable tables like tenant_settings)
    const bearer = token || SUPABASE_ANON_KEY;
    const res = await fetch(`${resolveApiBase()}${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { data: null, error: `HTTP ${res.status}: ${txt.substring(0, 200)}` };
    }
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error)?.message || String(err) };
  }
}

/**
 * Call a Supabase RPC via raw fetch (bypasses JS client hang on edge/CDN).
 * @param fnName - RPC function name (e.g. "get_empty_records")
 * @param params - optional params object sent as JSON body
 * @param opts.allowAnon - fall back to anon key if no session token
 */
export async function restRpc<T>(
  fnName: string,
  params?: Record<string, unknown>,
  opts?: { allowAnon?: boolean },
): Promise<{ data: T | null; error: string | null }> {
  const token = getStoredAccessToken();
  if (!token && !opts?.allowAnon) return { data: null, error: "no_session_token" };
  try {
    const bearer = token || SUPABASE_ANON_KEY;
    const headers: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json",
    };
    const options: RequestInit = { method: "POST", headers };
    if (params) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(params);
    }
    const res = await fetch(`${resolveApiBase()}/rest/v1/rpc/${fnName}`, options);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { data: null, error: `HTTP ${res.status}: ${txt.substring(0, 200)}` };
    }
    // Void RPCs return 204/empty bodies — only parse JSON when content exists.
    const txt = await res.text().catch(() => "");
    let data: unknown = null;
    if (txt) {
      try {
        data = JSON.parse(txt);
      } catch {
        data = txt;
      }
    }
    return { data: data as T, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error)?.message || String(err) };
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */

export async function fetchAllUserProfiles(): Promise<{ profiles: ProfileRow[]; roles: RoleRow[]; error?: string }> {
  // Try RPC first (works even when GoTrue is broken since it's security definer)
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_list_users");
    if (!rpcErr && rpcData && Array.isArray(rpcData)) {
      const profiles: ProfileRow[] = rpcData.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        user_id: item.user_id as string,
        email: item.email as string,
        display_name: item.display_name as string,
        password: "",
        is_active: item.is_active as boolean,
        last_login: item.last_login as string | null,
        department: (item.department as string | null) ?? null,
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
      }));
      const roles: RoleRow[] = rpcData
        .filter((item: Record<string, unknown>) => item.role)
        .map((item: Record<string, unknown>) => ({
          id: crypto.randomUUID(),
          user_id: item.user_id as string,
          role: item.role as string,
          created_at: new Date().toISOString(),
          department: null,
        }));
      return { profiles, roles };
    }
  } catch { /* RPC failed, fall back to standard query */ }

  // Fallback: standard query (requires working GoTrue)
  // SECURITY: never select the password column
  const pRes = await supabase.from("profiles").select("id,user_id,display_name,email,is_active,last_login,created_at,updated_at,department");
  let roles: RoleRow[] = [];
  try {
    const rRes = await supabase.from("user_roles").select("*");
    if (!rRes.error && rRes.data) roles = rRes.data as RoleRow[];
  } catch { /* non-critical */ }

  if (pRes.error) return { profiles: [], roles: [], error: pRes.error.message };
  return {
    profiles: (pRes.data || []) as unknown as ProfileRow[],
    roles,
  };
}

export async function fetchUserProfile(userId: string): Promise<ProfileRow | null> {
  // SECURITY: never select the password column from the client
  // Use raw REST to avoid Supabase JS client query builder hanging on Vercel
  // (see note at top of file about the production auth-state race condition)
  const { data, error } = await restGet<ProfileRow[]>(
    `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,display_name,email,is_active,last_login,created_at,updated_at,department`
  );
  if (error) {
    log.system.error("userService:fetchUserProfile_failed", error);
    return null;
  }
  return (data && data.length > 0) ? data[0] : null;
}

export async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await restGet<{ role?: string }[]>(
    `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role`
  );
  if (error || !data || data.length === 0) return null;
  return data[0].role?.toLowerCase() || null;
}

export async function fetchUserDepartment(userId: string): Promise<string | null> {
  const { data, error } = await restGet<{ department?: string }[]>(
    `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=department`
  );
  if (error || !data || data.length === 0) return null;
  return data[0].department || null;
}

/* ─── Mutations ───────────────────────────────────────────────────────────── */

// ============================================================================
// PRIME SPINE CUTOVER (D1): every privileged write rides a SECURITY DEFINER
// RPC (authorization enforced server-side on every action — Prime §13–14).
// The browser never inserts/updates/deletes user_roles or profiles rows
// directly anymore; all spine RPCs raise 42501 when the caller is not an
// admin server-side.
// ============================================================================

// First-signup self-provisioning: creates the caller's OWN profile (email is
// derived from auth.users server-side, never client-asserted) and self-assigns
// the employee-class 'user' role server-side on first provisioning only.
export async function selfProvisionProfile(
  displayName?: string,
  department?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await restRpc<string | null>("self_provision_profile", {
    p_display_name: displayName ?? null,
    p_department: department ?? null,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function createProfile(payload: {
  user_id: string;
  display_name: string;
  email: string;
  department?: string | null;
  is_active?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await restRpc<string | null>("admin_create_profile", {
    p_user_id: payload.user_id,
    p_email: payload.email,
    p_display_name: payload.display_name,
    p_department: payload.department ?? null,
    p_is_active: payload.is_active ?? true,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function createUserRole(
  userId: string,
  role: string,
  department?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await restRpc<void>("admin_upsert_user_role", {
    p_user_id: userId,
    p_role: role,
    p_department: department ?? null,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function updateProfile(
  userId: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  // Only fields known to the spine are forwarded; role changes ride
  // admin_upsert_user_role (separate).
  const body: Record<string, unknown> = { p_user_id: userId };
  if (typeof payload.email === "string") body.p_email = payload.email;
  if (typeof payload.display_name === "string") body.p_display_name = payload.display_name;
  if (payload.department !== undefined) body.p_department = payload.department;
  if (typeof payload.is_active === "boolean") body.p_is_active = payload.is_active;
  if (typeof payload.last_login === "string") body.p_last_login = payload.last_login;

  const { error } = await restRpc<void>("admin_update_profile", body);
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function upsertUserRole(
  userId: string,
  role: string
): Promise<{ ok: boolean; error?: string }> {
  // The server upserts on user_id; there is NO delete-then-insert fallback —
  // that legacy fallback existed to slip past RLS and is gone.
  const { error } = await restRpc<void>("admin_upsert_user_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function deleteUserRole(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await restRpc<void>("admin_delete_user_role", { p_user_id: userId });
  if (error) return { ok: false, error };
  return { ok: true };
}

// "Remove user" = deactivate through the spine (Prime data-preservation rule:
// the production profile row is never hard-DELETEd from the browser).
export async function deactivateUserProfile(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await restRpc<void>("admin_deactivate_profile", { p_user_id: userId });
  if (error) return { ok: false, error };
  return { ok: true };
}

/* ─── Mapping ───────────────────────────────────────────────────────────── */

export function mapProfileToAppUser(profile: ProfileRow, role?: string | null, department?: string | null): AppUser {
  const email = profile.email || "";
  return {
    id: profile.user_id || profile.id,
    name: profile.display_name || (email ? email.split("@")[0] : "User"),
    email,
    password: "",
    role: (role?.toLowerCase() || "user") as Role,
    department: normalizeDepartment(department),
    // The column is NULLABLE with a default of `true`: a missing value means
    // "not deactivated", not "deactivated".  Reading it as false here made
    // the user list disagree with the auth path, which treats the same NULL
    // as active.
    active: !!(profile.is_active ?? true),
    lastLoginAt: profile.last_login ? new Date(profile.last_login).getTime() : 0,
    needsApprovalNotification: false,
  };
}

/** Normalize raw department string to canonical Department */
export function normalizeDepartment(raw: string | null | undefined): Department | null {
  if (!raw) return null;
  const dept = raw.trim();
  switch (dept.toLowerCase()) {
    case 'hr': case 'human resources': return 'HR';
    case 'sales': return 'Sales';
    case 'operations': case 'ops': return 'Operations';
    case 'quality': case 'qa': case 'qc': return 'Quality';
    case 'rd': case 'r&d': case 'research': case 'development': case 'design': return 'RD';
    case 'management': case 'mgmt': case 'admin': return 'Management';
    default: return null;
  }
}

export const VALID_ROLES: Role[] = ["admin", "manager", "auditor", "user", "moderator", "dept_head", "employee"];

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}