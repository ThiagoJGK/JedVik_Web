export default async function handler(req, res) {
  // Allow CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, clientId, clientSecret } = req.query;

  if (!q || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'Missing parameters q, clientId, or clientSecret' });
  }

  try {
    // 1. Authenticate with Spotify Client Credentials flow server-side (ignores browser CORS!)
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
      const errText = await tokenRes.text();
      return res.status(tokenRes.status).json({ error: 'Spotify authentication failed', details: errText });
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // 2. Search Spotify track catalogue
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(searchRes.status).json({ error: 'Spotify search query failed', details: errText });
    }

    const searchData = await searchRes.json();
    if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
      const spotifyUrl = searchData.tracks.items[0].external_urls.spotify;
      return res.status(200).json({ spotifyUrl });
    }

    return res.status(404).json({ error: 'Track not found on Spotify' });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
