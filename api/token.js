import axios from 'axios';

export default async function handler(req, res) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token found. Please set GOOGLE_REFRESH_TOKEN in Vercel Environment Variables.' });
    }

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
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