// ============================================================================
// userService.ts — Pure data access layer for user/profile/role operations
// NO React. NO hooks. Just Supabase queries with typed interfaces.
// ============================================================================
import { log } from "@/services/logger";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<'profiles'>;
export type RoleRow    = Tables<'user_roles'>;

export type Role = "admin" | "manager" | "auditor" | "user" | "moderator";
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
    profiles: (pRes.data || []) as ProfileRow[],
    roles,
  };
}

export async function fetchUserProfile(userId: string): Promise<ProfileRow | null> {
  // SECURITY: never select the password column from the client
  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,display_name,email,is_active,last_login,created_at,updated_at,department")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    log.system.error("userService:fetchUserProfile_failed", (error as Error)?.message || String(error));
    return null;
  }
  return data as ProfileRow | null;
}

export async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { role?: string }).role?.toLowerCase() || null;
}

/* ─── Mutations ───────────────────────────────────────────────────────────── */

export async function createProfile(payload: {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  password?: string;
  is_active: boolean;
  last_login?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("profiles").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createUserRole(payload: {
  id: string;
  user_id: string;
  role: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("user_roles").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProfile(
  userId: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
  if (error) {
    // Fallback to id column
    const { error: err2 } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (err2) return { ok: false, error: err2.message };
  }
  return { ok: true };
}

export async function upsertUserRole(
  userId: string,
  role: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (error) {
    // Fallback: delete + insert
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error: insErr } = await supabase.from("user_roles").insert({
      user_id: userId,
      role,
      id: crypto.randomUUID(),
    });
    if (insErr) return { ok: false, error: insErr.message };
  }
  return { ok: true };
}

export async function deleteUserRole(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteUserProfile(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
  if (error) {
    const { error: err2 } = await supabase.from("profiles").delete().eq("id", userId);
    if (err2) return { ok: false, error: err2.message };
  }
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
    active: !!(profile.is_active ?? false),
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

/** Get department for a given user_id */
export async function fetchUserDepartment(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("department")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { department?: string }).department || null;
}

export const VALID_ROLES: Role[] = ["admin", "manager", "auditor", "user", "moderator", "dept_head", "employee"];

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}
