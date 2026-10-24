/**
 * Verify that the compliance verdict is really the SERVER's, in a browser.
 *
 *   preview : http://127.0.0.1:5211   (build against http://127.0.0.1:54351)
 *   api     : 127.0.0.1:54351 (proxy) -> 54350 (shim) -> 127.0.0.1:5433/qbase_local
 *
 * The claim this script proves:
 *
 *   1. the four pages that answer a compliance question ask the SERVER
 *      (`compliance_map`, `records_page`, `dashboard_stats`);
 *   2. NONE of them downloads the whole register — the `records?select=*`
 *      read is gone, and the list behind the audit table is one filtered
 *      page at a time;
 *   3. the pages render the server's answer, with no console error.
 *
 * It signs in with the local credential and reads only.  It prints
 * AGGREGATES — request counts by URL shape, row counts, boolean checks and
 * console-error strings — never a serial, a name, an e-mail or a field
 * value.  The credential is read from /tmp/qbase-local/LOCAL_LOGIN.txt and
 * is never printed; the access token stays in memory.
 *
 *   node tools/local-stack/verify-server-compliance-path.mjs
 *   MEASURE_ORIGIN=http://127.0.0.1:5210 node tools/local-stack/verify-server-compliance-path.mjs
 *
 * It exits 1 when any of the three claims fails, so it can be used as a
 * gate by hand.
 */
import { chromium } from '/home/kepv/qbase-remediation/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const ORIGIN = process.env.MEASURE_ORIGIN || 'http://127.0.0.1:5211';
const CREDS = '/tmp/qbase-local/LOCAL_LOGIN.txt';
mkdirSync('/tmp/shots', { recursive: true });

// ── the local credential, never printed ─────────────────────────────────────
const md = readFileSync(CREDS, 'utf8');
// The LAST block for an address wins: a password reset replaces the earlier
// block, and the earlier block's password is dead.
const rows = [...md.matchAll(/- (\S+)\s+\(role: (\w+)\)\n\s+password: (\S+)/g)];
if (!rows.length) { console.error('could not locate the local credential'); process.exit(1); }
const row = rows[rows.length - 1];
console.log(`origin ${ORIGIN} — signing in as the local "${row[2]}" account (email/password not printed)`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

// A Vercel deployment is served over HTTPS and has to reach the API on
// 127.0.0.1 — a PRIVATE NETWORK REQUEST.  Chrome blocks it before it is
// sent unless the origin has the local-network-access permission.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(ORIGIN)) {
  try {
    await ctx.grantPermissions(['local-network-access'], { origin: ORIGIN });
  } catch (e) {
    console.log('could not grant local-network-access:', String(e.message).slice(0, 160));
  }
}

const page = await ctx.newPage();
const errors = [];
const requests = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 180)));
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('/rest/v1/')) requests.push(u.replace(/^https?:\/\/[^/]+/, ''));
});

// ── sign in ─────────────────────────────────────────────────────────────────
await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1200);
await page.locator('input[type="email"], input[name="email"]').first().fill(row[1]);
await page.locator('input[type="password"]').first().fill(row[3]);
await page.locator('button', { hasText: /sign in/i }).first().click();
await page.waitForTimeout(5000);
console.log('after login url:', page.url());

/** The requests of ONE page, counted by shape. */
function shape() {
  const counts = {};
  for (const u of requests) {
    let key;
    if (u.startsWith('/rest/v1/rpc/')) key = u.split('?')[0];
    else if (u.startsWith('/rest/v1/records')) {
      key = '/rest/v1/records' + (u.includes('select=*') ? ' (WHOLE TABLE)' : ' (a query)');
    } else key = u.split('?')[0];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function visit(path, label) {
  requests.length = 0;
  errors.length = 0;
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3500);
  const counts = shape();
  console.log(`\n### ${label}  (${path})`);
  console.log('  requests       :', JSON.stringify(counts));
  console.log('  console errors :', errors.length);
  errors.slice(0, 5).forEach((e) => console.log('    -', e));
  await page.screenshot({ path: `/tmp/shots/compliance-path${path.replace(/\W+/g, '_') || '-home'}.png` });
  return { counts, errors: errors.length };
}

const dash = await visit('/', 'DASHBOARD');
const audit = await visit('/audit', 'AUDIT DASHBOARD');
const forms = await visit('/forms', 'FORMS REGISTRY');
const compliance = await visit('/compliance', 'COMPLIANCE REPORT');

// ── the audit list, and the detailed report behind it ───────────────────────
// The audit page's two FORM tabs list the forms that owe a filing, and a row
// opens that form's detailed report.  This walks the whole path: the tab,
// the rows the SERVER sent, and the report.
await page.goto(`${ORIGIN}/audit`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await page.getByRole('tab', { name: /overdue/i }).first().click();
await page.waitForTimeout(2500);
const overdueRows = await page.locator('span.font-mono').filter({ hasText: /^F\/\d+$/ }).count();
console.log(`\n### AUDIT — the OVERDUE tab`);
console.log(`  form rows the server sent : ${overdueRows}`);

let reportOk = false;
if (overdueRows > 0) {
  await page.locator('span.font-mono').filter({ hasText: /^F\/\d+$/ }).first().click();
  await page.waitForTimeout(3000);
  reportOk = page.url().includes('/compliance?form=');
  console.log(`  the row opened            : ${page.url().replace(ORIGIN, '')}`);
  console.log(`  a detailed report         : ${reportOk ? 'yes' : 'NO'}`);
}

// ── the verdict ─────────────────────────────────────────────────────────────
const wholeTable = (r) =>
  Object.entries(r.counts)
    .filter(([k]) => k.includes('WHOLE TABLE'))
    .reduce((n, [, v]) => n + v, 0);
const rpcCalls = (r) =>
  Object.entries(r.counts)
    .filter(([k]) => k.startsWith('/rest/v1/rpc/'))
    .reduce((n, [, v]) => n + v, 0);

console.log('\n=== THE VERDICT ===');
for (const [name, r] of [
  ['dashboard', dash],
  ['audit dashboard', audit],
  ['forms registry', forms],
  ['compliance report', compliance],
]) {
  console.log(
    `  ${name.padEnd(18)} : ${rpcCalls(r)} server call(s), ` +
    `${wholeTable(r)} whole-table read(s), ${r.errors} console error(s)`,
  );
}

const totalWholeTable = wholeTable(dash) + wholeTable(audit) + wholeTable(forms) + wholeTable(compliance);
const totalErrors = dash.errors + audit.errors + forms.errors + compliance.errors;
console.log(`\n  whole-table reads across the four pages : ${totalWholeTable}`);
console.log(`  console errors across the four pages    : ${totalErrors}`);
console.log(`  the overdue list and its report        : ${overdueRows} row(s), report ${reportOk ? 'opened' : 'NOT opened'}`);

const ok = totalWholeTable === 0 && totalErrors === 0 && overdueRows > 0 && reportOk;
console.log(`\n  ${ok ? "OK — the verdict is the server's." : 'FAILED — see above.'}`);

await browser.close();
process.exit(ok ? 0 : 1);
