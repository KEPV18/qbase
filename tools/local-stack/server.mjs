/**
 * QBase — LOCAL PREVIEW SERVER
 *
 * Serves the production build of the app AND a stub of the Supabase API on
 * the same origin, so the UI can be opened in a real browser and driven by
 * hand.  The stub is deliberately EMPTY: it holds no records, no users and
 * no credentials, and it is not connected to any real project.  Every list
 * renders empty, every metric renders zero, and nothing that is not
 * explicitly written below is invented.
 *
 * It binds to 127.0.0.1 only — a local address, not the LAN.
 *
 *   node /tmp/qbase-local/server.mjs [--port 5210] [--root /tmp/qbase-local/dist]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const PORT = Number(arg('port', '5210'));
const ROOT = resolve(arg('root', '/tmp/qbase-local/dist'));
const LABEL = arg('label', '');
const NOTE = arg('note', '');

// A banner so the two previews can never be confused: one talks to the live
// project, the other to the local database — and each has its own login.
const banner = (label, note) => {
  if (!label && !note) return '';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<style id="qbase-stack-banner-style">
  #qbase-stack-banner{position:fixed;top:10px;right:10px;z-index:2147483647;max-width:380px;
    padding:10px 14px;border-radius:12px;background:rgba(20,20,24,.92);color:#fff;
    font:600 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    box-shadow:0 8px 28px rgba(0,0,0,.35);letter-spacing:-.01em}
  #qbase-stack-banner .b-t{font-size:13px;color:#fff !important;opacity:1 !important;
    font-weight:600 !important;text-shadow:0 1px 2px rgba(0,0,0,.5)}
  #qbase-stack-banner .b-n{margin-top:4px;font-weight:400;font-size:12px;color:#b9b9c4 !important;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
</style>
<div id="qbase-stack-banner"><div class="b-t">${esc(label)}</div>${note ? `<div class="b-n">${esc(note)}</div>` : ''}</div>`;
};

const injectBanner = (html) => {
  const b = banner(LABEL, NOTE);
  if (!b) return html;
  if (html.includes('</head>')) return html.replace('</head>', `${b}\n</head>`);
  return b + html;
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// ── the stub identity ────────────────────────────────────────────────────
const UID = '00000000-0000-0000-0000-0000000000aa';
const EMAIL = 'preview@local.test';
const USER = {
  id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL,
  email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Local Preview' },
  identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  is_anonymous: false,
};
const PROFILE = {
  id: '11111111-1111-1111-1111-1111111111aa', user_id: UID, display_name: 'Local Preview',
  email: EMAIL, is_active: true, last_login: null, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', department: 'Quality',
};
const ROLES = [{ user_id: UID, role: 'admin', department: null }];

const session = () => ({
  access_token: 'local-preview-token-not-a-real-credential',
  token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'local-preview-refresh-not-a-real-credential',
  user: USER,
});

// ── stub responses for the RPCs the app calls ────────────────────────────
const zeroStats = {
  records_total: 0, records_by_status: { draft: 0, pending_review: 0, approved: 0, rejected: 0 },
  records_last_30d: 0, capa_total: 0, capa_closed: 0, capa_open: 0, capa_closure_rate: null,
  capa_overdue: 0, pending_review_aging: { under_7d: 0, from_7_to_30d: 0, over_30d: 0 },
};
const DRAFT = {
  id: '33333333-3333-3333-3333-3333333333aa', serial: 'F/08-0001', form_code: 'F/08',
  form_name: 'Local Preview Draft', form_data: { serial: 'F/08-0001' }, section: 1,
  status: 'draft', created_by: EMAIL, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', deleted_at: null, version: 1,
};
const RPC = {
  dashboard_stats: zeroStats,
  record_draft_create: [DRAFT],
  create_record_validated: { id: '44444444-4444-4444-4444-4444444444aa', serial: 'F/08-0002', version: 1 },
  record_transition: [{ id: '44444444-4444-4444-4444-4444444444aa', status: 'draft', version: 1 }],
  record_restore: [{ id: '44444444-4444-4444-4444-4444444444aa', status: 'draft', version: 1 }],
  update_record_versioned: [{ id: '44444444-4444-4444-4444-4444444444aa', version: 2 }],
  soft_delete_record: { id: '44444444-4444-4444-4444-4444444444aa', deleted: true },
  audit_log_server_append: '44444444-4444-4444-4444-4444444444aa',
  create_notifications_batch: [],
  admin_list_users: [],
  error_report_submit: { id: '55555555-5555-5555-5555-5555555555aa' },
  error_report_resolve: { id: '55555555-5555-5555-5555-5555555555aa', resolved: true },
};

const send = (res, status, body, headers = {}) => {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    ...headers,
  });
  res.end(payload);
};

const readBody = (req) => new Promise((done) => {
  let b = '';
  req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => done(b));
});

async function handleApi(req, res, url) {
  const path = url.pathname;
  const method = req.method || 'GET';

  if (method === 'OPTIONS') return send(res, 204, '');

  // ── GoTrue ──
  if (path === '/auth/v1/token') {
    const body = await readBody(req);
    let email = EMAIL;
    try { email = JSON.parse(body || '{}').email || EMAIL; } catch { /* keep the default */ }
    const s = session();
    s.user = { ...USER, email };
    return send(res, 200, s);
  }
  if (path === '/auth/v1/user') return send(res, 200, USER);
  if (path === '/auth/v1/logout') return send(res, 204, '');
  if (path === '/auth/v1/recover' || path === '/auth/v1/signup') return send(res, 200, { user: USER });

  // ── PostgREST ──
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = decodeURIComponent(path.slice('/rest/v1/rpc/'.length));
    if (fn in RPC) return send(res, 200, RPC[fn]);
    return send(res, 200, {});
  }
  if (path.startsWith('/rest/v1/')) {
    const table = path.slice('/rest/v1/'.length).split('?')[0];
    if (table === 'profiles') return send(res, 200, [PROFILE]);
    if (table === 'user_roles') return send(res, 200, ROLES);
    return send(res, 200, []);
  }
  if (path.startsWith('/storage/v1/')) return send(res, 200, []);

  return send(res, 404, { message: 'not found in the local stub' });
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = resolve(join(ROOT, normalize(rel)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  let target = file;
  try {
    const s = await stat(target);
    if (s.isDirectory()) target = join(target, 'index.html');
  } catch {
    target = join(ROOT, 'index.html'); // SPA fallback
  }
  try {
    let data = await readFile(target);
    const type = MIME[extname(target)] || 'application/octet-stream';
    if (type.startsWith('text/html')) {
      const html = injectBanner(data.toString('utf8'));
      data = Buffer.from(html, 'utf8');
    }
    const immutable = /\/assets\//.test(url.pathname);
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const isApi = /^\/(auth|rest|storage)\//.test(url.pathname);
  const p = isApi ? handleApi(req, res, url) : serveStatic(req, res, url);
  Promise.resolve(p).catch((e) => {
    if (!res.headersSent) send(res, 500, { message: String(e) });
    else res.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`QBase local preview → http://127.0.0.1:${PORT}  (stub backend, no data)`);
});
