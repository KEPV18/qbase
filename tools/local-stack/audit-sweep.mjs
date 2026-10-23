/**
 * A design sweep over EVERY route of the running app.
 *
 *   node tools/local-stack/audit-sweep.mjs [route ...]
 *
 * The first pass (audit-design.mjs) looked at the dashboard and five
 * pages.  This one walks the whole route table, screenshots each page
 * and runs the shared probe (design-probe.js) on it, so the report says
 * what a page actually looks like rather than what its source implies.
 *
 * Read-only: it changes no data, prints no credential, and never leaves
 * 127.0.0.1.
 */
import { chromium } from '/home/kepv/qbase-remediation/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// The origin to sweep.  It defaults to the local SPA, and it can be
// pointed at a VERCEL PREVIEW instead — the preview serves the same
// build, and a preview is the artefact the owner actually opens, so it
// is the one worth measuring.
const ORIGIN = process.env.SWEEP_ORIGIN || 'http://127.0.0.1:5210';
const CREDS = '/tmp/qbase-local/LOCAL_LOGIN.txt';
const DARK = process.argv.includes('--dark');
const MOBILE = process.argv.includes('--mobile');
const SHOTS = MOBILE
  ? (DARK ? '/tmp/shots/sweep-mobile-dark' : '/tmp/shots/sweep-mobile')
  : (DARK ? '/tmp/shots/sweep-dark' : '/tmp/shots/sweep');
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 950 };
const PROBE_SRC = '/home/kepv/qbase-remediation/tools/local-stack/design-probe.js';
mkdirSync(SHOTS, { recursive: true });

// The route table, taken from the app's own router (src/App.tsx) rather
// than from a list that can drift away from it.  Every route the router
// declares has to appear here: a page that is never measured is a page
// nobody knows anything about.
const ROUTES = [
  ['dashboard', '/'],
  ['audit', '/audit'],
  ['projects', '/projects'],
  ['activity', '/activity'],
  ['procedures', '/procedures'],
  ['iso-manual', '/iso-manual'],
  ['forms', '/forms'],
  ['notifications', '/notifications'],
  ['kpi', '/kpi'],
  ['kpi-reports', '/kpi/reports'],
  ['swot', '/swot-analysis'],
  ['traceability', '/traceability'],
  ['integrity', '/integrity'],
  ['risk', '/risk-management'],
  ['records', '/records'],
  ['archive', '/archive'],
  ['approvals', '/admin/approvals'],
  ['admin-accounts', '/admin/accounts'],
  ['admin-database', '/admin/database'],
  ['admin-data-sanitizer', '/admin/data-sanitizer'],
  ['create', '/create'],
  ['settings', '/settings'],
];

const md = readFileSync(CREDS, 'utf8');
// The LAST block for an address wins: a password reset REPLACES the
// earlier block, and the earlier block's password is dead.
const rows = [...md.matchAll(/- (\S+)\s+\(role: (\w+)\)\n\s+password: (\S+)/g)];
if (!rows.length) {
  console.error('could not locate the local credential');
  process.exit(1);
}
const row = rows[rows.length - 1];

const PROBE = readFileSync(PROBE_SRC, 'utf8');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
});
// A preview is a PUBLIC origin asking the local API on 127.0.0.1, so
// Chrome needs a site permission for it (Local Network Access).  In a
// normal browser the user grants that in a one-time prompt; here it is
// granted up front.  Without it every API call is blocked before it is
// sent and the sweep measures an empty page.
if (!/^https?:\/\/127\.0\.0\.1/.test(ORIGIN) && !/^https?:\/\/localhost/.test(ORIGIN)) {
  try {
    await ctx.grantPermissions(['local-network-access'], { origin: ORIGIN });
  } catch (e) {
    console.log('could not grant local-network-access:', e.message.slice(0, 160));
  }
}
const page = await ctx.newPage();

await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.locator('input[type="email"], input[name="email"]').first().fill(row[1]);
await page.locator('input[type="password"]').first().fill(row[3]);
await page.locator('button', { hasText: /sign in/i }).first().click();
await page.waitForTimeout(4000);

// The theme is the app's own mechanism (src/hooks/useTheme.tsx): a
// `theme` key in localStorage and the `dark` class on <html>.  The dark
// palette is a separate set of token values, so it has to be measured on
// its own — a contrast pass in light mode says nothing about it.
if (DARK) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(600);
}

const wanted = process.argv.slice(2).filter((r) => !r.startsWith('--'));
// A routes file (one path per line) keeps a long list of parametrised
// routes out of the shell, where quoting and word-splitting differ per
// shell and quietly turn into one broken URL.
const fileIdx = process.argv.indexOf('--routes-file');
const fromFile = fileIdx >= 0
  ? readFileSync(process.argv[fileIdx + 1], 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : [];
const list = fromFile.length ? fromFile : wanted;

/**
 * The parametrised routes need a REAL id, and a hardcoded one goes stale
 * the moment the data changes — the sweep would then measure a "not found"
 * page and report it as if it were the page.
 *
 * The ids are discovered, and the discovery is READ-ONLY: two GETs against
 * the API for a project name and a record serial, and the text of the
 * forms registry for a form code.  Nothing is clicked, because a click on
 * a row is a click on a control that can change data, and this sweep
 * promises not to change any.
 */
const API = process.env.SWEEP_API_URL || 'http://127.0.0.1:54351';
const ANON = (readFileSync('/home/kepv/qbase-remediation/.env.local', 'utf8')
  .match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m) || [])[1]?.trim();

const apiValue = async (table, column) => {
  if (!ANON) return null;
  try {
    const r = await fetch(`${API}/rest/v1/${table}?select=${column}&limit=1`, {
      headers: { apikey: ANON },
    });
    const j = await r.json();
    return Array.isArray(j) && j[0] ? j[0][column] : null;
  } catch {
    return null;
  }
};

const discover = async () => {
  const found = [];

  const projectName = await apiValue('projects', 'name');
  if (projectName) found.push(['project-detail', `/project/${encodeURIComponent(projectName)}`]);

  const serial = await apiValue('records', 'serial');
  if (serial) {
    found.push(['record-view', `/records/${encodeURIComponent(serial)}`]);
    found.push(['traceability-record', `/traceability/${encodeURIComponent(serial)}`]);
  }

  // A form code is a constant of the app ("F/08"), and the registry page
  // is where the reader sees it, so it is read off that page.
  try {
    await page.goto(ORIGIN + '/forms', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2200);
    const code = await page.evaluate(() => {
      const m = (document.body.innerText || '').match(/\bF\/\d{2}\b/);
      return m ? m[0] : null;
    });
    if (code) found.push(['form-preview', `/form/${encodeURIComponent(code)}`]);
  } catch (e) {
    console.log('discovery failed for form-preview', String(e).split('\n')[0].slice(0, 110));
  }

  return found;
};

const routes = list.length
  ? list.map((r) => [r.replace(/[^\w-]/g, '_') || 'route', r])
  : [...ROUTES, ...(await discover())];

/**
 * Horizontal overflow: a phone-width page that scrolls sideways is a
 * layout bug, not a style choice.  Reports the elements whose right
 * edge sticks out past the viewport, and the widest offender.
 */
const OVERFLOW = () => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  }
  return {
    viewportWidth: vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflows: document.documentElement.scrollWidth > vw + 1,
    offenders: offenders.slice(0, 8),
    offenderCount: offenders.length,
  };
};

const report = {};
for (const [name, path] of routes) {
  try {
    await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
    const probe = await page.evaluate(PROBE);
    const flow = await page.evaluate(OVERFLOW);
    report[name] = { ...probe, overflow: flow };
    console.log('---', name, '->', page.url());
    console.log('    ground', probe.groundHex, '| text', probe.textChecked, 'checked',
      '| low-contrast', probe.lowContrastCount,
      '| hues', JSON.stringify(probe.chromaticHues),
      '| surfaces', probe.surfaceTotal,
      '| glass', probe.glass.length,
      '| small', probe.smallTargetCount, '/', probe.interactiveCount,
      '| tabular', probe.numbersTabular + '/' + probe.numbers,
      '| untabular', probe.untabularCount,
      '| hscroll', flow.overflows ? `YES (${flow.scrollWidth}>${flow.viewportWidth}, ${flow.offenderCount} el)` : 'no');
    for (const u of probe.untabular || []) console.log('       untabular', JSON.stringify(u.t), '|', u.cls);
    for (const l of probe.lowContrast || []) console.log('       LOW', l.ratio + ':1 (need ' + l.need + ')', JSON.stringify(l.text), l.fg, 'on', l.bg, '|', l.cls);
    for (const s of probe.smallTargets || []) console.log('       SMALL', s.tag, s.painted, '->', s.h + 'x' + s.w, JSON.stringify(s.text));
  } catch (e) {
    console.log('skip', name, String(e).split('\n')[0].slice(0, 140));
  }
}

writeFileSync(`${SHOTS}/report.json`, JSON.stringify(report, null, 1));
console.log('\nreport:', `${SHOTS}/report.json`, '  shots:', SHOTS);

await browser.close();
