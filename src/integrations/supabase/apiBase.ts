// ============================================================================
// apiBase.ts — WHICH BACKEND this build talks to
// ============================================================================
//
// The address used to come straight out of `import.meta.env`, and Vite
// inlines it at build time, so the answer was FROZEN INTO THE BUNDLE.
// That turned a backend outage into a rebuild: the live project stopped
// answering, and the only way to point a deployed build at a working
// server was to build again and deploy again — and every build made in
// the meantime pointed at a host that no longer resolved.
//
// The address is now resolved while the app RUNS:
//
//   1. an operator's override, kept in localStorage
//   2. the build's VITE_SUPABASE_URL
//
// so one deployment can be pointed at a different server without being
// rebuilt, and a server that comes back needs no new build either.
//
// The override is deliberately restricted to http(s): a mistyped
// address must never be able to become a `javascript:` URL.
//
// The anon key stays a build-time value. It is public by design — it
// ships inside the bundle already — and the servers this app talks to
// share it, so there is nothing to override and nothing to store.

/** localStorage key the operator's override is kept under. */
export const API_BASE_OVERRIDE_KEY = "qbase.apiBase";

/**
 * Where the app is ALLOWED to be pointed.
 *
 * The override is an address a person types, and the app sends the
 * session token and the anon key to whatever address it is given — so
 * an unrestricted override would let a mistyped (or malicious) address
 * receive a bearer token.  The set of allowed addresses is therefore
 * closed:
 *
 *   - a Supabase project host (`*.supabase.co`, `*.supabase.com`) —
 *     including the direct connection host and the pooler;
 *   - a loopback address (`127.0.0.1`, `localhost`, `::1`) with any
 *     port — the local stack, and only on this machine.
 *
 * Anything else is refused, and an override that is not allowed is
 * ignored rather than obeyed.
 */
const ALLOWED_HOST_SUFFIXES = [".supabase.co", ".supabase.com"];
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** Is this an address the app may be pointed at? */
export function isAllowedApiBase(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  const h = host.toLowerCase();
  if (LOOPBACK_HOSTS.has(h)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

/** The address this BUILD was made against. */
export const BUILD_API_BASE: string = (import.meta.env.VITE_SUPABASE_URL?.trim() || "").replace(/\/+$/, "");

/**
 * The anon key, in one place.
 *
 * `VITE_SUPABASE_ANON_KEY` is the name the project has always used;
 * `VITE_SUPABASE_PUBLISHABLE_KEY` is the newer name the same key is
 * published under. Both are inlined into the bundle by Vite and both
 * are public — the browser has to send the key with every request.
 */
export const ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "");

function normalise(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** The operator's override, or "" when there is none. */
export function readApiBaseOverride(): string {
  try {
    const raw = window.localStorage.getItem(API_BASE_OVERRIDE_KEY);
    if (!raw) return "";
    const value = normalise(raw);
    if (!value) return "";
    // http(s) only — anything else is a typo, not an address.
    if (!/^https?:\/\/[^\s/]+/i.test(value)) return "";
    // And only an address this app is allowed to talk to.
    if (!isAllowedApiBase(value)) return "";
    return value;
  } catch {
    // Storage disabled (private mode, blocked cookies): the build's own
    // address still works, so this is not a failure.
    return "";
  }
}

/**
 * Set (or clear, with null) the operator's override.
 *
 * Returns false when the address is not one the app may talk to — the
 * value is then NOT stored, so a refused address can never be read back
 * and used.
 */
export function writeApiBaseOverride(value: string | null): boolean {
  try {
    if (value === null || !normalise(value)) {
      window.localStorage.removeItem(API_BASE_OVERRIDE_KEY);
      return true;
    }
    const address = normalise(value);
    if (!isAllowedApiBase(address)) return false;
    window.localStorage.setItem(API_BASE_OVERRIDE_KEY, address);
    return true;
  } catch {
    // Nothing to do: the build's own address stays in force.
    return false;
  }
}

/** The address the app talks to RIGHT NOW. */
export function resolveApiBase(): string {
  return readApiBaseOverride() || BUILD_API_BASE;
}

/** The address as a human-readable host, for the interface. */
export function apiBaseLabel(base: string = resolveApiBase()): string {
  if (!base) return "not configured";
  try {
    return new URL(base).host;
  } catch {
    return base;
  }
}

/**
 * The localStorage key the Supabase client writes the session under.
 *
 * `@supabase/supabase-js` builds it as
 *   `sb-${new URL(url).hostname.split(".")[0]}-auth-token`
 * — from the parsed HOSTNAME.  This helper used to rebuild the key by
 * string surgery instead: strip a literal `"https://"`, then take the
 * text before the first `"."`.  For the production URL
 * (`https://abc.supabase.co`) that happens to produce the same string,
 * so the bug stayed invisible — but the local stack's URL is
 * `http://127.0.0.1:54351`, where the scheme is not stripped and the
 * key came out as `sb-http://127-auth-token`, a key nothing ever
 * writes.  Every profile / role / department read then failed with
 * `no_session_token`, the app fell into its "no profile" branch, and
 * every signed-in local account was downgraded to `role: "user"` with
 * the email prefix as its display name — which is why an `admin`
 * account bounced off `/admin/accounts` back to the dashboard.
 *
 * Derive the key the way the client that wrote it derives it — and
 * from the address that is in force NOW, so switching servers also
 * switches the session (a token issued by one server is meaningless
 * to another).
 */
export function supabaseAuthStorageKey(base: string = resolveApiBase()): string {
  try {
    const host = new URL(base).hostname;
    return `sb-${host.split(".")[0]}-auth-token`;
  } catch {
    // A relative or malformed URL — fall back to the old shape, but
    // strip either scheme so the fallback is at least the http case.
    const bare = base.replace(/^https?:\/\//, "");
    return `sb-${bare.split(".")[0]}-auth-token`;
  }
}

// ============================================================================
// Probing — telling the three failures apart
// ============================================================================

export type ApiProbeStatus =
  | "ok"
  | "quota"
  | "unauthorized"
  | "unreachable"
  | "misconfigured";

export interface ApiProbe {
  status: ApiProbeStatus;
  /** The HTTP status, or null when the request never arrived. */
  code: number | null;
  /** One line the operator can act on. */
  detail: string;
}

/**
 * Ask a server whether it is alive, and say WHICH failure it is.
 *
 * The three failures look identical in a browser console and need
 * three different fixes:
 *
 *   - the address does not resolve  → the project is paused or gone
 *   - 402                            → the organisation is over quota
 *   - 401/403                        → the key is refused
 *
 * `/auth/v1/health` is the endpoint the sign-in path itself uses, and
 * it is the one endpoint every server this app talks to answers.
 */
export async function probeApiBase(base: string = resolveApiBase()): Promise<ApiProbe> {
  if (!base) {
    return { status: "misconfigured", code: null, detail: "No API address is configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      headers: ANON_KEY ? { apikey: ANON_KEY } : {},
      cache: "no-store",
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || "The address did not answer.";
    return {
      status: "unreachable",
      code: null,
      detail: `${message} — the project may be paused, or the address may be wrong.`,
    };
  }

  const code = res.status;
  if (code === 200) {
    return { status: "ok", code, detail: "The API is answering." };
  }
  if (code === 402) {
    return {
      status: "quota",
      code,
      detail: "The organisation is over its egress quota. The project owner must raise the cap.",
    };
  }
  if (code === 401 || code === 403) {
    return { status: "unauthorized", code, detail: "The API answered but refused the key." };
  }
  return { status: "unreachable", code, detail: `The API answered ${code}.` };
}
