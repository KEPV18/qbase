// ============================================================================
// QBase — the local API shim's CORS preflight
//
// The browser is the strictest client of the local stack, and the shim's
// preflight is where it is satisfied or refused.
//
// `@supabase/postgrest-js` puts `Accept-Profile: public` on every GET and
// `Content-Profile: public` on every POST/PATCH/DELETE, because supabase-js's
// default schema is `public`.  The shim's allow-list did not name either of
// them, so Chrome refused the PREFLIGHT and the request was never sent — the
// page called the server and the server never heard of it.  The CORS proxy in
// front of the shim answers its own preflight with `*` and hid the gap; a
// build pointed straight at a shim port (which the runtime address override
// allows, and which the local stack does) hit it.
//
// This file pins the allow-list.  It reads the shim as text — the same way
// `serverComplianceParity.test.ts` reads the migration — so it needs no
// database, no Python and no running server, and CI runs it on every push.
//
// It also cross-checks the list against the INSTALLED client: if a
// postgrest-js upgrade starts sending a header the shim does not allow, the
// failure belongs here, in the build, rather than in a browser console.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// The shim, as text
// ---------------------------------------------------------------------------

const SHIM_PATH = path.resolve(process.cwd(), 'tools/local-stack/qbase_api.py');
const shim = readFileSync(SHIM_PATH, 'utf8');

/** The allow-list the shim sends on its preflight. */
function allowedRequestHeaders(): string[] {
  const match = shim.match(/ALLOWED_REQUEST_HEADERS\s*=\s*\(([\s\S]*?)\)/);
  expect(match, 'the shim must declare ALLOWED_REQUEST_HEADERS').not.toBeNull();
  return (match![1].match(/"([^"]+)"/g) ?? [])
    .map((quoted) => quoted.replace(/"/g, ''))
    .join(', ')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// The installed client, as text
// ---------------------------------------------------------------------------

const POSTGREST_DIST = path.resolve(
  process.cwd(),
  'node_modules/@supabase/postgrest-js/dist/index.mjs',
);
const postgrest = existsSync(POSTGREST_DIST) ? readFileSync(POSTGREST_DIST, 'utf8') : '';

// ---------------------------------------------------------------------------
// The tests
// ---------------------------------------------------------------------------

describe("the local shim's CORS preflight", () => {
  it('allows the headers the Supabase client sends on every request', () => {
    const allowed = allowedRequestHeaders();

    // The baseline every request carries.
    for (const header of ['apikey', 'authorization', 'content-type', 'x-client-info']) {
      expect(allowed, `the preflight must allow "${header}"`).toContain(header);
    }
  });

  it('allows the schema headers — the two that were missing', () => {
    const allowed = allowedRequestHeaders();

    // `Accept-Profile` on a read, `Content-Profile` on a write.  Without
    // these the browser's preflight fails and the request is never sent.
    expect(allowed, 'the preflight must allow "accept-profile"').toContain('accept-profile');
    expect(allowed, 'the preflight must allow "content-profile"').toContain('content-profile');
  });

  it('allows every header the installed client actually sends', () => {
    if (!postgrest) {
      // node_modules is not installed — the check needs the client to know
      // what the client sends.  The two assertions above still hold.
      expect(allowedRequestHeaders()).toContain('content-profile');
      return;
    }

    const sent = new Set<string>();
    for (const match of postgrest.matchAll(/\.headers\.set\(\s*"([^"]+)"/g)) {
      sent.add(match[1].toLowerCase());
    }
    expect(sent.size, 'the installed client must set some headers').toBeGreaterThan(0);

    const allowed = allowedRequestHeaders();
    for (const header of sent) {
      expect(allowed, `the preflight must allow the client's "${header}"`).toContain(header);
    }
  });

  it('answers the preflight with an origin, the methods and the list', () => {
    expect(shim).toContain('def do_OPTIONS(self):');
    expect(shim).toContain('"Access-Control-Allow-Origin", "*"');
    expect(shim).toContain('"Access-Control-Allow-Methods"');
    // The list must be the one that was declared — a second, hand-written
    // list would drift from the constant the test above reads.
    expect(shim).toContain('"Access-Control-Allow-Headers", self.ALLOWED_REQUEST_HEADERS');
  });
});
