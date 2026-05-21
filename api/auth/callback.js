import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    const { code } = req.query;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
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

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
        });

        const newRefreshToken = response.data.refresh_token;

        if (newRefreshToken) {
            let localSaveMsg = '';
            if (!process.env.VERCEL) {
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
                    console.log('DEBUG: Successfully saved Refresh Token to .env');
                } catch (e) {
                    console.error('DEBUG: Failed to save to .env:', e);
                }
            }

            res.send(`
                <div style="font-family: sans-serif; padding: 20px; max-width: 800px; line-height: 1.6; direction: rtl; text-align: right;">
                    <h1 style="color: #0f5132;">✅ تم استخراج التوكن بنجاح!</h1>
                    ${localSaveMsg}
                    <p>إذا كنت تستخدم Vercel للإنتاج (Production)، يرجى نسخ هذا الكود وإضافته إلى متغيرات البيئة في إعدادات المشروع:</p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; overflow-x: auto; margin: 20px 0;">
                        <strong>Key:</strong> GOOGLE_REFRESH_TOKEN<br>
                        <strong>Value:</strong><br>
                        <code style="background: #e9ecef; padding: 5px; display: block; margin-top: 5px; word-break: break-all;">${newRefreshToken}</code>
                    </div>

                    <p>بعد ذلك، قم بإعادة تشغيل السيرفر المحلي (Local Server) ليتعرف على التوكن الجديد.</p>
                </div>
            `);
        } else {
            res.send('<h1>⚠️ Warning</h1><p>Auth successful but no refresh token returned. Try removing the app permissions from your Google account and trying again.</p>');
        }
    } catch (error) {
        const errorData = error.response?.data || {};
        console.error('OAuth callback error:', errorData);
        res.status(500).send(`
            <h1>❌ Token Exchange Failed</h1>
            <p>Error: ${errorData.error || error.message}</p>
            <p>Redirect URI used: ${REDIRECT_URI}</p>
            <hr>
            <a href="/api/auth">Try again</a>
        `);
    }
}
