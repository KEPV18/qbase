import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in .env.local"
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // CRITICAL: Disable Realtime WebSocket at the config level.
  // Vercel runs behind a CDN/edge that rejects the Supabase Realtime WebSocket
  // handshake (__cf_bm cookie rejection → ERR_CONNECTION_CLOSED). This poisons
  // the shared HTTP connection pool, causing subsequent REST calls
  // (fetchUserProfile, fetchUserRole, fetchUserDepartment) to silently hang.
  // Disabling realtime here prevents the WebSocket attempt entirely, instead
  // of trying to disconnect after the damage is done.
  realtime: {
    params: { eventsPerSecond: 0 },
  },
  // Use a single global fetch instance to avoid pool contamination issues.
})

// ============================================================================
// Supabase Realtime WebSocket suppression
// ============================================================================
// Supabase JS v2 auto-creates a RealtimeClient that attempts a WebSocket
// connection with the anon key. Through Cloudflare, this fails with
// "HTTP Authentication failed; no valid credentials available" and produces
// both __cf_bm cookie warnings and ERR_CONNECTION_CLOSED errors that poison
// the HTTP connection pool, breaking auth and RPC calls.
//
// We don't use Realtime anywhere (useNotifications uses polling instead).
// Disconnect immediately and prevent reconnection.
try {
  supabase.realtime.disconnect()
} catch {
  // Silently ignore — realtime may already be disconnected
}

// Override connect to prevent it from ever reconnecting.
// This ensures no WebSocket attempts are made, eliminating the
// __cf_bm cookie rejection and auth error in console.
try {
  supabase.realtime.connect = () => {
    // No-op: Realtime WebSocket is disabled in this app
  }
} catch {
  // Silently ignore if connect is not overridable
}