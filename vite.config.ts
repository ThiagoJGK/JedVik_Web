import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-mock-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/spotify')) {
            try {
              const urlObj = new URL(req.url, 'http://localhost');
              const q = urlObj.searchParams.get('q');
              const clientId = urlObj.searchParams.get('clientId');
              const clientSecret = urlObj.searchParams.get('clientSecret');

              res.setHeader('Content-Type', 'application/json');

              if (!q) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing search query parameter q' }));
                return;
              }

              // scraper function
              const searchSpotifyScraper = async (queryStr: string) => {
                try {
                  const embedUrl = 'https://open.spotify.com/embed/artist/4BtlARcenR11DQTH6p65z3';
                  const response = await fetch(embedUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
                    }
                  });
                  if (!response.ok) {
                    console.warn(`Failed to fetch Spotify embed page: status ${response.status}`);
                    return null;
                  }
                  const html = await response.text();
                  const scriptMatch = /<script\s+[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
                  if (!scriptMatch) {
                    console.warn('__NEXT_DATA__ script block not found');
                    return null;
                  }
                  
                  const jsonData = JSON.parse(scriptMatch[1]);
                  const trackList = jsonData.props?.pageProps?.state?.data?.entity?.trackList || [];
                  
                  const tracks = trackList.map((t: any) => {
                    const id = t.uri.split(':').pop();
                    return {
                      name: t.title,
                      url: `https://open.spotify.com/track/${id}`,
                      id
                    };
                  });
                  
                  const norm = (s: string) => s.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '')
                    .trim();
                  const queryNorm = norm(queryStr.replace(/jed\s*vik/gi, ''));
                  
                  for (const track of tracks) {
                    const trackNorm = norm(track.name);
                    if (trackNorm.includes(queryNorm) || queryNorm.includes(trackNorm)) {
                      return track.url;
                    }
                  }
                } catch (e) {
                  console.error('Local Spotify scraper error:', e);
                }
                return null;
              };

              // 1. Try credentials API search if credentials exist
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
                    const tokenData: any = await tokenRes.json();
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
                      const searchData: any = await searchRes.json();
                      if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
                        const spotifyUrl = searchData.tracks.items[0].external_urls.spotify;
                        res.statusCode = 200;
                        res.end(JSON.stringify({ spotifyUrl }));
                        return;
                      }
                    }
                  }
                } catch (err: any) {
                  console.warn('Local Spotify API credentials fetch failed, trying scraper:', err.message);
                }
              }

              // 2. Scraper fallback
              console.log(`Running local Spotify scraper fallback for query: "${q}"`);
              const scrapedUrl = await searchSpotifyScraper(q);
              if (scrapedUrl) {
                res.statusCode = 200;
                res.end(JSON.stringify({ spotifyUrl: scrapedUrl }));
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

          if (req.url && req.url.startsWith('/api/youtube')) {
            try {
              const urlObj = new URL(req.url, 'http://localhost');
              const q = urlObj.searchParams.get('q');
              res.setHeader('Content-Type', 'application/json');

              if (!q) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing search query parameter q' }));
                return;
              }

              console.log(`Running local YouTube search for query: "${q}"`);
              
              const getPublicInstances = async () => {
                try {
                  const response = await fetch('https://api.invidious.io/instances.json?sort_by=api,type');
                  if (response.ok) {
                    const data: any = await response.json();
                    return data
                      .filter((item: any) => item[1].api === true && item[1].type === 'https')
                      .map((item: any) => item[1].uri);
                  }
                } catch (e) {
                  console.error('Error fetching Invidious instances:', e);
                }
                return [];
              };

              const searchInvidious = async (queryStr: string, instances: string[]) => {
                const testInstances = instances.slice(0, 5);
                for (const uri of testInstances) {
                  const url = `${uri.replace(/\/$/, '')}/api/v1/search?q=${encodeURIComponent(queryStr)}&type=video`;
                  try {
                    const response = await fetch(url, {
                      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
                    });
                    if (response.ok) {
                      const data: any = await response.json();
                      if (Array.isArray(data) && data.length > 0) {
                        return data[0].videoId;
                      }
                    }
                  } catch (e: any) {
                    console.warn(`Instance ${uri} failed:`, e.message);
                  }
                }
                return null;
              };

              const instances = await getPublicInstances();
              const videoId = await searchInvidious(q, instances);

              if (videoId) {
                res.statusCode = 200;
                res.end(JSON.stringify({ youtubeMusicUrl: `https://music.youtube.com/watch?v=${videoId}`, videoId }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Track not found on YouTube Music' }));
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
