async function getPublicInstances() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=api,type');
    if (res.ok) {
      const data = await res.json();
      // Data is an array of [instanceName, instanceInfo]
      const urls = data
        .filter(item => item[1].api === true && item[1].type === 'https')
        .map(item => item[1].uri);
      return urls;
    }
  } catch (e) {
    console.error('Error fetching Invidious instances:', e);
  }
  return [];
}

async function searchInvidious(query, instances) {
  // Try up to 5 instances
  const testInstances = instances.slice(0, 5);
  for (const uri of testInstances) {
    const url = `${uri.replace(/\/$/, '')}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
    try {
      console.log(`Trying Invidious instance: ${uri}...`);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000) // 4 seconds timeout
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data[0].videoId; // Return first search result videoId
        }
      }
    } catch (e) {
      console.warn(`Instance ${uri} failed:`, e.message);
    }
  }
  return null;
}

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query parameter q' });
  }

  try {
    const instances = await getPublicInstances();
    const videoId = await searchInvidious(q, instances);

    if (videoId) {
      const youtubeMusicUrl = `https://music.youtube.com/watch?v=${videoId}`;
      return res.status(200).json({ youtubeMusicUrl, videoId });
    }

    return res.status(404).json({ error: 'Track not found on YouTube Music' });
  } catch (err) {
    console.error('YouTube API error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
