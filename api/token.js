// Minimal axios-compatible JSON POST built on the global fetch API.
// fetch resolves on non-2xx responses, so we throw explicitly (as axios does)
// with `error.response.data` populated, keeping the existing catch blocks intact.
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

export default async function handler(req, res) {
    // SECURITY: this endpoint exchanges the stored GOOGLE_REFRESH_TOKEN for a
    // live Google access token, so an anonymous caller must never be able to
    // trigger it. A shared secret must be supplied as the `X-Api-Key` header
    // (Vercel env var TOKEN_API_KEY). Fail closed when the secret is not
    // configured so a misconfigured deployment 403s instead of minting tokens
    // for anyone.
    const apiKey = process.env.TOKEN_API_KEY;
    const provided = req.headers['x-api-key'];
    if (!apiKey || !provided || provided !== apiKey) {
        return res.status(403).json({ error: 'Forbidden. Send the shared secret in the X-Api-Key header.' });
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token found. Please set GOOGLE_REFRESH_TOKEN in Vercel Environment Variables.' });
    }

    try {
        const response = await postJson('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        res.status(200).json({
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
        });
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token: ' + (error.response?.data?.error || error.message) });
    }
}