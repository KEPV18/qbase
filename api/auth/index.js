import axios from 'axios';

export default async function handler(req, res) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    // UPDATED: Use the actual Vercel domain assigned to your project
    const PROD_HOST = 'qms-git-main-kepv18s-projects.vercel.app';

    // Health check logic inside the auth handler for debugging env vars
    if (req.query.health === 'true') {
        return res.json({
            status: 'ok',
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasClientSecret: !!GOOGLE_CLIENT_SECRET,
            hasRedirectUri: !!REDIRECT_URI,
            envKeys: Object.keys(process.env).filter(k => !k.startsWith('VERCEL_')),
        });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Env Vars:', {
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasClientSecret: !!GOOGLE_CLIENT_SECRET
        });
        return res.status(500).send('Configuration Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Vercel Environment Variables.');
    }

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
    const encodedScopes = encodeURIComponent(SCOPES.join(' '));
    
    // Force use of the registered Production URL for Google OAuth Redirect
    // This prevents "URI mismatch" errors when deploying to Vercel Preview URLs
    // Google Console only lists the Production URL, so we must match it exactly.
    let finalRedirectUri;
    
    // 1. If running locally (dev), use localhost
    if (!process.env.VERCEL) {
        finalRedirectUri = 'http://localhost:3001/api/auth/callback';
    } 
    // 2. Otherwise, check if the current request host is one of the allowed redirect URIs
    else {
        // Define allowed hosts based on what you registered in Google Console
        const ALLOWED_HOSTS = [
            'qms-zeta.vercel.app',
            'qms-820dunivc-kepv18s-projects.vercel.app',
            'qms-git-main-kepv18s-projects.vercel.app'
        ];

        const host = req.headers.host; // e.g. "qms-zeta.vercel.app"
        
        // If the current host is in our allowed list, use it. 
        // Otherwise, fallback to the main PROD_HOST (qms-git-main...)
        if (ALLOWED_HOSTS.includes(host)) {
            finalRedirectUri = `https://${host}/api/auth/callback`;
        } else {
            finalRedirectUri = `https://${PROD_HOST}/api/auth/callback`;
        }
    }
    
    console.log('DEBUG: OAuth Init', {
        env_redirect_uri: REDIRECT_URI,
        vercel_url: process.env.VERCEL_URL,
        using_uri: finalRedirectUri
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${finalRedirectUri}&response_type=code&scope=${encodedScopes}&access_type=offline&prompt=consent`;
    
    res.redirect(authUrl);
}
