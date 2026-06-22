async function searchSpotifyScraper(q) {
  try {
    const embedUrl = 'https://open.spotify.com/embed/artist/4BtlARcenR11DQTH6p65z3';
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch Spotify embed page: status ${res.status}`);
      return null;
    }
    
    const html = await res.text();
    const scriptMatch = /<script\s+[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!scriptMatch) {
      console.warn('__NEXT_DATA__ script block not found');
      return null;
    }
    
    const jsonData = JSON.parse(scriptMatch[1]);
    const trackList = jsonData.props?.pageProps?.state?.data?.entity?.trackList || [];
    
    const tracks = trackList.map(t => {
      const id = t.uri.split(':').pop();
      return {
        name: t.title,
        url: `https://open.spotify.com/track/${id}`,
        id
      };
    });
    
    // Match query
    const norm = s => s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
      
    const queryNorm = norm(q.replace(/jed\s*vik/gi, ''));
    
    for (const track of tracks) {
      const trackNorm = norm(track.name);
      if (trackNorm.includes(queryNorm) || queryNorm.includes(trackNorm)) {
        return track.url;
      }
    }
  } catch (err) {
    console.error('Spotify scraper error:', err);
  }
  return null;
}

export default async function handler(req, res) {
  // Allow CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, clientId, clientSecret } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query parameter q' });
  }

  // If credentials are provided, try the official API first
  if (clientId && clientSecret) {
    try {
      const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const token = tokenData.access_token;

        const searchRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
            const spotifyUrl = searchData.tracks.items[0].external_urls.spotify;
            return res.status(200).json({ spotifyUrl });
          }
        }
      }
    } catch (err) {
      console.warn('Official Spotify API search failed, falling back to scraper:', err.message);
    }
  }

  // Fallback: Run scraper on public artist page
  console.log(`Running Spotify artist page scraper fallback for query: "${q}"`);
  const scrapedUrl = await searchSpotifyScraper(q);
  if (scrapedUrl) {
    return res.status(200).json({ spotifyUrl: scrapedUrl });
  }

  return res.status(404).json({ error: 'Track not found on Spotify' });
}
