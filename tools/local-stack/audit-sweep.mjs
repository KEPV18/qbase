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

const ORIGIN = 'http://127.0.0.1:5210';
const CREDS = '/tmp/qbase-local/LOCAL_LOGIN.txt';
const DARK = process.argv.includes('--dark');
const MOBILE = process.argv.includes('--mobile');
const SHOTS = MOBILE
  ? (DARK ? '/tmp/shots/sweep-mobile-dark' : '/tmp/shots/sweep-mobile')
  : (DARK ? '/tmp/shots/sweep-dark' : '/tmp/shots/sweep');
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 950 };
const PROBE_SRC = '/home/kepv/qbase-remediation/tools/local-stack/design-probe.js';
mkdirSync(SHOTS, { recursive: true });

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
const routes = list.length
  ? list.map((r) => [r.replace(/[^\w-]/g, '_') || 'route', r])
  : ROUTES;

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
