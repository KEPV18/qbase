// QBase — server-side AI endpoint (Prime §D5)
// ---------------------------------------------------------------------------
// AI → AI Tools → Domain Services → Authorization → Database (Prime §5):
// the provider key lives ONLY in server-side env; the browser never sees it
// and never talks to the provider directly. This function is a narrow relay:
// it takes an allow-listed tool name + provider prompt and returns generated
// text. It NEVER touches the database — persisting an AI artifact is always a
// normal user action performed by the client through the same validated
// domain-service paths as a manual edit (proposal-gated).
//
// Fail closed:
//   - no provider key configured          → 503 { code: 'AI_DISABLED' }
//   - no/unknown provider                 → 503 { code: 'AI_DISABLED' }
//   - missing or invalid session token    → 401
//
// The provider request never echoes the key anywhere (no logging of secrets).
// ---------------------------------------------------------------------------

const ALLOWED_TOOLS = new Set([
    'draft_record_content',
    'classify_document',
    'suggest_corrective_action',
    'summarize_audit_trail',
]);

const PROVIDER_ENDPOINTS = {
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        keyEnv: 'AI_PROVIDER_API_KEY',
        headers: (key) => ({
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        }),
        body: (prompt, system, maxTokens, model) => ({
            model,
            max_tokens: maxTokens,
            system: system || undefined,
            messages: [{ role: 'user', content: prompt }],
        }),
        extract: (data) => {
            // Anthropic Messages content: [{type: 'text', text: '...'}, ...]
            if (!Array.isArray(data.content)) return null;
            return data.content
                .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
                .map((c) => c.text)
                .join('\n') || null;
        },
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        keyEnv: 'AI_PROVIDER_API_KEY',
        headers: (key) => ({
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        }),
        body: (prompt, system, maxTokens, model) => ({
            model,
            max_completion_tokens: maxTokens,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
        }),
        extract: (data) => data?.choices?.[0]?.message?.content || null,
    },
};

// Default models per provider (overridable via AI_PROVIDER_MODEL env so the
// user can switch models by env var without a code change).
const DEFAULT_MODELS = {
    anthropic: 'claude-sonnet-5-5',
    openai: 'gpt-5.2',
};

// Verifies a Supabase access token is a real, current session. Uses the
// public anon key + the caller's bearer token — no service_role involvement.
async function verifySession(req) {
    const sbUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!sbUrl || !anonKey) return null; // fail closed: env not configured

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return null;

    try {
        const res = await fetch(`${sbUrl}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
        });
        if (!res.ok) return null;
        const user = await res.json();
        return user?.id ? String(user.id) : null;
    } catch {
        return null; // network/verification failure → deny
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST only' });
    }

    // --- Auth gate (fail closed) -------------------------------------------
    const userId = await verifySession(req);
    if (!userId) {
        return res
            .status(401)
            .json({ error: 'Sign in to use AI assistance.', code: 'AUTH_REQUIRED' });
    }

    // --- Fail-closed provider gate -----------------------------------------
    const providerName = (process.env.AI_PROVIDER || '').trim().toLowerCase();
    const provider = PROVIDER_ENDPOINTS[providerName];
    const apiKey = provider ? process.env[provider.keyEnv] : undefined;
    if (!provider || !apiKey) {
        return res.status(503).json({
            error: 'AI assistance is disabled — no AI provider key is configured for this deployment.',
            code: 'AI_DISABLED',
        });
    }

    // --- Input validation ----------------------------------------------------
    let payload;
    try {
        payload = typeof req.body === 'object' && req.body !== null
            ? req.body
            : JSON.parse(req.body || '{}');
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { tool, prompt, system } = payload || {};
    if (!tool || !ALLOWED_TOOLS.has(tool)) {
        return res
            .status(400)
            .json({ error: `Unknown tool. Allowed: ${[...ALLOWED_TOOLS].join(', ')}` });
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'prompt (non-empty string) is required' });
    }
    // Keep prompts bounded — provider payloads are billed per token and
    // oversized client payloads must never become a cost/DoS surprise.
    if (prompt.length > 128_000) {
        return res.status(413).json({ error: 'Prompt too large (128k char cap)' });
    }
    const maxTokens =
        typeof payload.max_tokens === 'number' &&
        payload.max_tokens >= 16 && payload.max_tokens <= 8_000
            ? Math.floor(payload.max_tokens)
            : 2_000;

    const model = process.env.AI_PROVIDER_MODEL || DEFAULT_MODELS[providerName];

    try {
        const providerRes = await fetch(provider.url, {
            method: 'POST',
            headers: provider.headers(apiKey),
            body: JSON.stringify(provider.body(prompt, system, maxTokens, model)),
        });

        const text = await providerRes.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }

        if (!providerRes.ok) {
            // Forward the provider's status for rate limits/overload so the
            // client can retry sensibly — but NEVER the key or request ids.
            const raw = providerRes.status;
            const status = raw >= 400 && raw <= 599 ? raw : 502;
            return res.status(status).json({
                error: `AI provider request failed (${providerRes.status})`,
                code: 'PROVIDER_ERROR',
                retryable: providerRes.status === 429 || providerRes.status >= 500,
            });
        }

        const content = provider.extract(data);
        if (!content) {
            return res.status(502).json({
                error: 'AI provider returned an empty or unparseable response.',
                code: 'PROVIDER_ERROR',
            });
        }

        return res.status(200).json({ tool, model, content });
    } catch (error) {
        console.error('ai:endpoint_failed', error.message || String(error));
        return res.status(502).json({
            error: 'AI request failed upstream.',
            code: 'PROVIDER_ERROR',
        });
    }
}