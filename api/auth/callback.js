import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Minimal axios-compatible JSON POST built on the global fetch API.
// fetch resolves on non-2xx responses, so we throw explicitly (as axios does)
// with `error.response.data` populated, keeping the existing catch block intact.
async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : undefined;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const error = new Error(`Request failed with status code ${response.status}`);
        error.response = { status: response.status, data };
        throw error;
    }

    return { data };
}

function parseCookies(req) {
    const header = req.headers.cookie;
    const out = {};
    if (!header) return out;
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return out;
}

// Constant-time comparison (hash-first so lengths never leak).
function safeEqual(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
    const { code, state } = req.query;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const cookies = parseCookies(req);

    // CSRF state binding (Prime P0-1 hardening): fail CLOSED before any token
    // exchange unless the browser returns the exact nonce /api/auth set.
    // Both cookies are cleared on every response (single use, 10-minute TTL).
    res.setHeader('Set-Cookie', 'gauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
    const flowState = cookies['gauth_state'];
    if (!code || !state || !flowState || !safeEqual(state, flowState)) {
        return res.status(400).send(
            'Invalid or expired OAuth state. Restart the flow from /api/auth.'
        );
    }

    // UPDATED: Dynamic Redirect URI Logic to match api/auth/index.js
    // This is CRITICAL: The URI sent here MUST match the one sent in the initial auth request.
    const PROD_HOST = 'qms-git-main-kepv18s-projects.vercel.app';
    let REDIRECT_URI;

    // 1. If running locally (dev), use localhost
    if (!process.env.VERCEL) {
        REDIRECT_URI = 'http://localhost:3001/api/auth/callback';
    }
    // 2. Otherwise, check if the current request host is one of the allowed redirect URIs
    else {
        const ALLOWED_HOSTS = [
            'qms-zeta.vercel.app',
            'qms-820dunivc-kepv18s-projects.vercel.app',
            'qms-git-main-kepv18s-projects.vercel.app'
        ];

        const host = req.headers.host;

        if (ALLOWED_HOSTS.includes(host)) {
            REDIRECT_URI = `https://${host}/api/auth/callback`;
        } else {
            REDIRECT_URI = `https://${PROD_HOST}/api/auth/callback`;
        }
    }

    try {
        const response = await postJson('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
        });

        const newRefreshToken = response.data.refresh_token;

        if (newRefreshToken) {
            if (!process.env.VERCEL) {
                // Local dev: persist to .env on the operator's own machine and
                // confirm WITHOUT printing the token to the response or logs.
                let localSaveMsg = '';
                try {
                    const envPath = path.join(process.cwd(), '.env');
                    let envContent = '';
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, 'utf8');
                    } else {
                        const examplePath = path.join(process.cwd(), '.env.example');
                        if (fs.existsSync(examplePath)) {
                            envContent = fs.readFileSync(examplePath, 'utf8');
                        }
                    }

                    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
                        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${newRefreshToken}`);
                    } else {
                        envContent += `\nGOOGLE_REFRESH_TOKEN=${newRefreshToken}\n`;
                    }

                    fs.writeFileSync(envPath, envContent);
                    localSaveMsg = '<p style="color: #2e7d32; font-weight: bold;">✅ تم حفظ التوكن تلقائياً في ملف .env الخاص بك! لا داعي لنسخه يدوياً.</p>';
                    console.log('OAuth callback: refresh token persisted to local .env');
                } catch (e) {
                    console.error('OAuth callback: failed to persist refresh token to .env');
                }

                res.send(`
                    <div style="font-family: sans-serif; padding: 20px; max-width: 800px; line-height: 1.6; direction: rtl; text-align: right;">
                        <h1 style="color: #0f5132;">✅ تم استخراج التوكن بنجاح!</h1>
                        ${localSaveMsg}
                    </div>
                `);
            } else {
                // PRODUCTION (Prime P0-1 hardening): the refresh token is NEVER
                // rendered in an unauthenticated response. Reveal requires the
                // operator to have armed QMS_SETUP_KEY and appended it to the
                // initiator flow (bound via the gauth_key HttpOnly cookie from
                // /api/auth?key=...). Fail closed when unset or mismatched: the
                // token is discarded, never displayed, never logged.
                const setupCookie = cookies['gauth_key'];
                const setupKey = process.env.QMS_SETUP_KEY;
                const revealAllowed = !!setupKey && !!setupCookie && safeEqual(setupKey, setupCookie);

                res.setHeader('Set-Cookie', 'gauth_key=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');

                if (revealAllowed) {
                    res.send(`
                        <div style="font-family: sans-serif; padding: 20px; max-width: 800px; line-height: 1.6; direction: rtl; text-align: right;">
                            <h1 style="color: #0f5132;">✅ تم استخراج التوكن بنجاح!</h1>
                            <p>انسخ هذا الرمز مرة واحدة وأضفه إلى متغيرات البيئة في إعدادات المشروع:</p>
                            <div style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; overflow-x: auto; margin: 20px 0;">
                                <strong>Key:</strong> GOOGLE_REFRESH_TOKEN<br>
                                <strong>Value:</strong><br>
                                <code style="background: #e9ecef; padding: 5px; display: block; margin-top: 5px; word-break: break-all;">${newRefreshToken}</code>
                            </div>
                            <p>هذه الصفحة تُعرض مرة واحدة فقط لحامل مفتاح التهيئة الصحيح. احذر من مشاركة هذه الصفحة.</p>
                        </div>
                    `);
                } else {
                    console.warn('OAuth callback in production withheld refresh token (setup key gate not satisfied)');
                    res.status(200).send(`
                        <div style="font-family: sans-serif; padding: 20px; max-width: 800px; line-height: 1.6; direction: rtl; text-align: right;">
                            <h1 style="color: #0f5132;">✅ تم الموافقة على الوصول بنجاح</h1>
                            <p>لأسباب أمنية، لا يتم عرض التوكن على هذه الصفحة العامة.</p>
                            <p>لتسليم التوكن على Vercel: قم بتهيئة المتغير <strong>QMS_SETUP_KEY</strong> في إعدادات المشروع، ثم أعد المفتاح مع رابط البدء كما يلي: <code>/api/auth?key=&lt;قيمة QMS_SETUP_KEY&gt;</code></p>
                        </div>
                    `);
                }
            }
        } else {
            res.send('<h1>⚠️ Warning</h1><p>Auth successful but no refresh token returned. Try removing the app permissions from your Google account and trying again.</p>');
        }
    } catch (error) {
        const errorData = error.response?.data || {};
        console.error('OAuth callback error:', errorData.error || 'token exchange failed');
        res.status(500).send(`
            <h1>❌ Token Exchange Failed</h1>
            <p>Error: ${errorData.error || error.message}</p>
            <hr>
            <a href="/api/auth">Try again</a>
        `);
    }
}