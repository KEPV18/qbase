// ============================================================================
// QBase — runtime API address tests
//
// The address used to be inlined into the bundle at build time, which meant
// a paused project could only be fixed by rebuilding and redeploying. It is
// now resolved while the app runs, and these tests hold that contract:
//
//   1. the build's own address is the default;
//   2. an operator's override wins over it;
//   3. an override that is not http(s) is IGNORED, never used — a mistyped
//      address must not be able to become a `javascript:` URL;
//   4. the session key is derived exactly the way `@supabase/supabase-js`
//      derives it, from the address in force;
//   5. the probe tells the three failures apart, because they look
//      identical in a console and need three different fixes.
// ============================================================================
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE_OVERRIDE_KEY,
  apiBaseLabel,
  probeApiBase,
  readApiBaseOverride,
  resolveApiBase,
  supabaseAuthStorageKey,
  writeApiBaseOverride,
} from "@/integrations/supabase/apiBase";

const BUILD_URL = "https://supabase.test.local";

describe("the API address", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to the address the build was made against", () => {
    expect(resolveApiBase()).toBe(BUILD_URL);
    expect(readApiBaseOverride()).toBe("");
  });

  it("lets an operator's override win over the build", () => {
    writeApiBaseOverride("http://127.0.0.1:54352");
    expect(readApiBaseOverride()).toBe("http://127.0.0.1:54352");
    expect(resolveApiBase()).toBe("http://127.0.0.1:54352");
  });

  it("strips trailing slashes, so a pasted address still works", () => {
    writeApiBaseOverride("http://127.0.0.1:54352/");
    expect(resolveApiBase()).toBe("http://127.0.0.1:54352");
  });

  it("ignores an override that is not http(s)", () => {
    writeApiBaseOverride("javascript:alert(1)");
    expect(readApiBaseOverride()).toBe("");
    expect(resolveApiBase()).toBe(BUILD_URL);
  });

  it("refuses an address the app is not allowed to talk to", () => {
    // The app sends the session token to whatever address it is given,
    // so the set of allowed addresses is closed: a Supabase project, or
    // a server on this machine.  A hostile host can be neither stored
    // nor read back.
    expect(writeApiBaseOverride("https://attacker.example.com")).toBe(false);
    expect(readApiBaseOverride()).toBe("");
    expect(resolveApiBase()).toBe(BUILD_URL);
  });

  it("allows a Supabase project and a server on this machine", () => {
    expect(writeApiBaseOverride("https://iouuikteroixnsqazznc.supabase.co")).toBe(true);
    expect(resolveApiBase()).toBe("https://iouuikteroixnsqazznc.supabase.co");
    expect(writeApiBaseOverride("http://127.0.0.1:54352")).toBe(true);
    expect(resolveApiBase()).toBe("http://127.0.0.1:54352");
    expect(writeApiBaseOverride("https://db.hkkdbxvmvvcxpgfqlrnp.supabase.co")).toBe(true);
    expect(writeApiBaseOverride("https://aws-0-eu-west-1.pooler.supabase.com")).toBe(true);
  });

  it("goes back to the build's address when the override is cleared", () => {
    writeApiBaseOverride("http://127.0.0.1:54352");
    writeApiBaseOverride(null);
    expect(resolveApiBase()).toBe(BUILD_URL);
  });

  it("shows the host, not the whole address, in the interface", () => {
    expect(apiBaseLabel("https://iouuikteroixnsqazznc.supabase.co")).toBe(
      "iouuikteroixnsqazznc.supabase.co",
    );
    expect(apiBaseLabel("http://127.0.0.1:54352")).toBe("127.0.0.1:54352");
    expect(apiBaseLabel("")).toBe("not configured");
  });
});

describe("the session key", () => {
  it("is derived the way @supabase/supabase-js derives it", () => {
    // `sb-${new URL(url).hostname.split(".")[0]}-auth-token`
    expect(supabaseAuthStorageKey("https://iouuikteroixnsqazznc.supabase.co")).toBe(
      "sb-iouuikteroixnsqazznc-auth-token",
    );
    // The local stack's URL has a port and a numeric host — the old
    // string-surgery version produced "sb-http://127-auth-token", a key
    // nothing ever writes.
    expect(supabaseAuthStorageKey("http://127.0.0.1:54351")).toBe("sb-127-auth-token");
  });

  it("follows the address in force, so a switch does not reuse a session", () => {
    writeApiBaseOverride("http://127.0.0.1:54352");
    expect(supabaseAuthStorageKey()).toBe("sb-127-auth-token");
  });
});

describe("the probe", () => {
  const stubFetch = (impl: () => Promise<unknown>) => {
    vi.stubGlobal("fetch", vi.fn(impl));
  };

  it("says 'ok' when the server answers", async () => {
    stubFetch(async () => ({ status: 200 }));
    const result = await probeApiBase(BUILD_URL);
    expect(result.status).toBe("ok");
  });

  it("names the quota when the organisation is over its limit", async () => {
    stubFetch(async () => ({ status: 402 }));
    const result = await probeApiBase(BUILD_URL);
    expect(result.status).toBe("quota");
    expect(result.detail).toMatch(/egress quota/i);
  });

  it("names a refused key", async () => {
    stubFetch(async () => ({ status: 401 }));
    const result = await probeApiBase(BUILD_URL);
    expect(result.status).toBe("unauthorized");
  });

  it("calls a request that never arrived 'unreachable'", async () => {
    stubFetch(async () => { throw new TypeError("Failed to fetch"); });
    const result = await probeApiBase(BUILD_URL);
    expect(result.status).toBe("unreachable");
    expect(result.code).toBeNull();
  });

  it("calls an empty address 'misconfigured'", async () => {
    const result = await probeApiBase("");
    expect(result.status).toBe("misconfigured");
  });

  it("asks the health endpoint, with the anon key", async () => {
    const spy = vi.fn(async () => ({ status: 200 }));
    vi.stubGlobal("fetch", spy);
    await probeApiBase("http://127.0.0.1:54352");
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:54352/auth/v1/health");
    expect((init.headers as Record<string, string>).apikey).toBeTruthy();
  });
});

describe("the override's storage", () => {
  it("is kept under one known key", () => {
    writeApiBaseOverride("http://127.0.0.1:54352");
    expect(window.localStorage.getItem(API_BASE_OVERRIDE_KEY)).toBe("http://127.0.0.1:54352");
  });
});
