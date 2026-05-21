let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string | null> | null = null;
let tokenUnavailableUntil: number = 0;

/**
 * Common helper to get a fresh access token from the local OAuth proxy.
 * Deduplicates concurrent calls so only one network request is in-flight at a time.
 * Caches 401 failures for 5 minutes to avoid spamming the console with errors
 * when the refresh token isn't configured.
 */
export async function getAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    // If the token endpoint returned 401 recently, don't retry
    if (Date.now() < tokenUnavailableUntil) {
        return null;
    }

    // Deduplicate: if a request is already in-flight, wait for it
    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/token', { signal: controller.signal });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Cache failures (401 no-token or 500 refresh-fail) for 5 minutes
                if (response.status === 401 || response.status === 500) {
                    tokenUnavailableUntil = Date.now() + 300000;
                    return null;
                }
                throw new Error(`Proxy error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.access_token) return null;

            cachedAccessToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
            return cachedAccessToken;
        } catch {
            return null;
        } finally {
            tokenPromise = null;
        }
    })();

    return tokenPromise;
}