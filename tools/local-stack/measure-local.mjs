/**
 * Verify the LOCAL Supabase-like stack end to end.
 *
 *   preview : http://127.0.0.1:5211   (build against http://127.0.0.1:54351)
 *   api     : 127.0.0.1:54351 (proxy) -> 54350 (shim) -> 127.0.0.1:5433/qbase_local
 *
 * It signs in with the local credential, then reports from the rendered DOM:
 *   • the dashboard header's overdue count
 *   • the Compliance Radar card
 *   • the Audit page counters
 *   • the Forms Registry "missing" badges
 *   • console errors
 *   • every network request the page made (proving the app only talks to
 *     the local API, never to a hosted Supabase project)
 *
 * The credential is read from /tmp/qbase-local/LOCAL_LOGIN.txt at runtime and
 * is never printed; the access token stays in memory.
 */
import { chromium } from '/home/kepv/qbase-remediation/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const ORIGIN = 'http://127.0.0.1:5211';
const CREDS = '/tmp/qbase-local/LOCAL_LOGIN.txt';
mkdirSync('/tmp/shots', { recursive: true });

const md = readFileSync(CREDS, 'utf8');
const row = md.match(/- (\S+)\s+\(role: (\w+)\)\n\s+password: (\S+)/);
if (!row) { console.error('could not locate the local credential'); process.exit(1); }
const EMAIL = row[1];
const PASSWORD = row[3];
console.log(`signing in as the local "${row[2]}" account (email/password not printed)`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
const hosts = new Set();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
page.on('request', (r) => { try { hosts.add(new URL(r.url()).host); } catch {} });

await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1200);
await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page.locator('button', { hasText: /sign in/i }).first().click();
await page.waitForTimeout(5000);
console.log('after login url:', page.url());

const bodyText = async () =>
  (await page.locator('body').innerText()).replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();

// ── 1. Dashboard ───────────────────────────────────────────────────────────
await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
const dash = await bodyText();
await page.screenshot({ path: '/tmp/shots/local-dashboard.png', fullPage: false });

console.log('\n### DASHBOARD');
const headerOverdue = dash.match(/·\s*(\d+)\s*overdue forms/i);
console.log('header overdue line :', headerOverdue ? headerOverdue[0].trim() : '<not found>');
const radarIdx = dash.search(/Compliance Radar|All Recurring Forms Are Up to Date|No compliance gaps/i);
console.log('radar block          :', radarIdx >= 0
  ? dash.slice(radarIdx, radarIdx + 700).split('\n').slice(0, 12).join(' | ')
  : '<not found>');

// ── 2. Audit page ──────────────────────────────────────────────────────────
await page.goto(`${ORIGIN}/audit`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const audit = await bodyText();
await page.screenshot({ path: '/tmp/shots/local-audit.png', fullPage: false });
console.log('\n### AUDIT (first lines)');
console.log(audit.split('\n').slice(0, 14).join('\n'));

// ── 3. Forms registry ──────────────────────────────────────────────────────
await page.goto(`${ORIGIN}/forms`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const reg = await bodyText();
await page.screenshot({ path: '/tmp/shots/local-registry.png', fullPage: false });
const missingBadges = [...reg.matchAll(/(\d+)\s*missing/g)].map(m => m[0]);
console.log('\n### FORMS REGISTRY');
console.log('missing badges       :', missingBadges.length ? missingBadges.join(', ') : '<none>');

console.log('\n### CONSOLE ERRORS:', errors.length);
errors.slice(0, 10).forEach(e => console.log('  -', e));

console.log('\n### HOSTS THE BROWSER TALKED TO');
[...hosts].sort().forEach(h => console.log('  -', h));

await browser.close();
