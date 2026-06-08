import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spotify-api-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/spotify')) {
            try {
              const urlObj = new URL(req.url, 'http://localhost');
              const q = urlObj.searchParams.get('q');
              const clientId = urlObj.searchParams.get('clientId');
              const clientSecret = urlObj.searchParams.get('clientSecret');

              res.setHeader('Content-Type', 'application/json');

              if (!q || !clientId || !clientSecret) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing parameters q, clientId, or clientSecret' }));
                return;
              }

              // 1. Get Access Token from Spotify server-side
              const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
              const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${creds}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
              });

              if (!tokenRes.ok) {
                res.statusCode = tokenRes.status;
                res.end(JSON.stringify({ error: 'Spotify authentication failed' }));
                return;
              }

              const tokenData: any = await tokenRes.json();
              const token = tokenData.access_token;

              // 2. Search track on Spotify API
              const searchRes = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (!searchRes.ok) {
                res.statusCode = searchRes.status;
                const errText = await searchRes.text();
                res.end(JSON.stringify({ error: 'Spotify search query failed', details: errText }));
                return;
              }

              const searchData: any = await searchRes.json();
              if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
                const spotifyUrl = searchData.tracks.items[0].external_urls.spotify;
                res.statusCode = 200;
                res.end(JSON.stringify({ spotifyUrl }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Track not found on Spotify' }));
              }

            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
})
