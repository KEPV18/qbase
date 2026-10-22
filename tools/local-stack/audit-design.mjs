/**
 * Apple Liquid Glass audit of the RUNNING app.
 *
 *   node tools/local-stack/audit-design.mjs
 *
 * Signs in to the local preview, screenshots every major surface, and reads
 * the computed styles of the live DOM (ground colour, font stack, radius,
 * shadow, backdrop-filter, letter-spacing, tabular-nums, touch target
 * heights) — then does the same for the skill's reference.html so the two
 * can be compared. Read-only: it changes no data and prints no credential.
 */
import { chromium } from '/home/kepv/qbase-remediation/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const ORIGIN = 'http://127.0.0.1:5210';
const CREDS = '/tmp/qbase-local/LOCAL_LOGIN.txt';
const SHOTS = '/tmp/shots/design-audit';
mkdirSync(SHOTS, { recursive: true });

const md = readFileSync(CREDS, 'utf8');
// The LAST block for an address wins: a password reset replaces the earlier
// block, and the earlier block's password is dead.
const rows = [...md.matchAll(/- (\S+)\s+\(role: (\w+)\)\n\s+password: (\S+)/g)];
if (!rows.length) { console.error('could not locate the local credential'); process.exit(1); }
let row = rows[rows.length - 1];

// QBASE_AUDIT_EMAIL picks a different account from the same file (the admin
// view is the surface worth auditing). The password is never printed.
if (process.env.QBASE_AUDIT_EMAIL) {
  const want = process.env.QBASE_AUDIT_EMAIL.toLowerCase();
  const hit = rows.filter(r => r[1].toLowerCase() === want).pop();
  if (!hit) { console.error('no such local account in the credential file'); process.exit(1); }
  row = hit;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/01-login.png` });

await page.locator('input[type="email"], input[name="email"]').first().fill(row[1]);
await page.locator('input[type="password"]').first().fill(row[3]);
await page.locator('button', { hasText: /sign in/i }).first().click();
await page.waitForTimeout(5000);

// ── the probe ─────────────────────────────────────────────────────────────
// Runs in the page: samples the live computed styles.
const PROBE = `(() => {
  const out = {};
  const cs = (el) => getComputedStyle(el);

  out.body = { bg: cs(document.body).backgroundColor, fg: cs(document.body).color,
               font: cs(document.body).fontFamily, ls: cs(document.body).letterSpacing,
               lh: cs(document.body).lineHeight };

  // every element that actually paints a backdrop-filter
  const blurs = [];
  for (const el of document.querySelectorAll('*')) {
    const f = cs(el).backdropFilter || cs(el).webkitBackdropFilter;
    if (f && f !== 'none') {
      const r = el.getBoundingClientRect();
      blurs.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 90),
        filter: f,
        pos: cs(el).position,
        w: Math.round(r.width), h: Math.round(r.height),
        bg: cs(el).backgroundColor,
      });
    }
  }
  out.backdropElements = blurs;

  // distinct border-radius values in use
  const radii = new Map();
  const shadows = new Map();
  for (const el of document.querySelectorAll('*')) {
    const s = cs(el);
    const br = s.borderRadius;
    if (br && br !== '0px' && el.getBoundingClientRect().width > 0) {
      const key = br.split(' ')[0];
      radii.set(key, (radii.get(key) || 0) + 1);
    }
    const sh = s.boxShadow;
    if (sh && sh !== 'none') {
      const layers = sh.split(/,(?![^()]*\\))/).length;
      shadows.set(layers, (shadows.get(layers) || 0) + 1);
    }
  }
  out.radii = [...radii.entries()].sort((a, b) => b[1] - a[1]);
  out.shadowLayerCounts = [...shadows.entries()].sort((a, b) => b[1] - a[1]);

  // hard-coded colours that are NOT greyscale-ish (i.e. chromatic)
  const chromatic = new Map();
  for (const el of document.querySelectorAll('*')) {
    for (const prop of ['backgroundColor', 'color', 'borderTopColor']) {
      const v = cs(el)[prop];
      const m = v && v.match(/rgba?\\((\\d+), (\\d+), (\\d+)/);
      if (!m) continue;
      const r = +m[1], g = +m[2], b = +m[3];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min > 26) {
        const key = v + ' @ ' + prop;
        chromatic.set(key, (chromatic.get(key) || 0) + 1);
      }
    }
  }
  out.chromaticColours = [...chromatic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);

  // numbers: do they use tabular-nums?
  const nums = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || !/^\\d[\\d.,]*\\s*[%\\w]?$/.test(t)) continue;
    const s = cs(el);
    nums.push({ text: t.slice(0, 24), tabular: s.fontVariantNumeric, cls: (el.className || '').toString().slice(0, 70), size: s.fontSize });
  }
  out.numbers = nums.slice(0, 40);
  out.numbersTotal = nums.length;
  out.numbersTabular = nums.filter(n => /tabular-nums/.test(n.tabular)).length;

  // headings: negative letter-spacing?
  const heads = [];
  for (const el of document.querySelectorAll('h1,h2,h3')) {
    const s = cs(el);
    heads.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40),
                 size: s.fontSize, ls: s.letterSpacing, weight: s.fontWeight });
  }
  out.headings = heads;

  // interactive target heights
  const small = [];
  const inter = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
  for (const el of inter) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 44) small.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) });
  }
  out.smallTargets = small.slice(0, 40);
  out.smallTargetCount = small.length;
  out.interactiveCount = inter.length;

  return out;
})()`;

const PAGES = [
  ['02-dashboard', '/'],
  ['03-records', '/records'],
  ['04-forms-registry', '/forms'],
  ['05-procedures', '/procedures'],
  ['06-iso-manual', '/iso-manual'],
  ['07-kpi', '/kpi'],
];

for (const [name, path] of PAGES) {
  try {
    await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
    console.log('shot', name, '->', page.url());
  } catch (e) {
    console.log('skip', name, String(e).slice(0, 120));
  }
}

// ── the probe on the dashboard ────────────────────────────────────────────
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const probe = await page.evaluate(PROBE);
console.log('\n================ LIVE DOM PROBE (dashboard) ================');
console.log(JSON.stringify(probe, null, 1));

// ── the reference, for comparison ─────────────────────────────────────────
const ref = await ctx.newPage();
await ref.goto('file:///home/kepv/.claude/skills/apple-liquid-glass/reference.html', { waitUntil: 'load' });
await ref.waitForTimeout(800);
await ref.screenshot({ path: `${SHOTS}/90-reference.png`, fullPage: false });
await ref.screenshot({ path: `${SHOTS}/91-reference-full.png`, fullPage: true });
const refProbe = await ref.evaluate(PROBE);
console.log('\n================ REFERENCE PROBE ================');
console.log(JSON.stringify({
  body: refProbe.body,
  radii: refProbe.radii,
  shadowLayerCounts: refProbe.shadowLayerCounts,
  backdropElements: refProbe.backdropElements.length,
  chromaticColours: refProbe.chromaticColours.slice(0, 12),
}, null, 1));

await browser.close();
console.log('\nshots in', SHOTS);
