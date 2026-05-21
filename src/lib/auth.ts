/**
 * auth.ts — Stub
 *
 * Google OAuth was removed during Supabase migration.
 * This stub keeps imports working without crashing.
 * Safe to remove once all callers are updated.
 */

export function getAccessToken(): string | null {
  console.warn('[AUTH] Google OAuth removed — getAccessToken() is a no-op stub');
  return null;
}

export function isAuthenticated(): boolean {
  return false;
}

export async function initiateOAuthFlow(): Promise<void> {
  console.warn('[AUTH] Google OAuth removed — initiateOAuthFlow() is a no-op stub');
}

export function revokeAccess(): void {
  console.warn('[AUTH] Google OAuth removed — revokeAccess() is a no-op stub');
}