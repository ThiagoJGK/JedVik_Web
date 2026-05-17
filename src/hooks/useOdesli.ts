import { useState } from 'react';
import type { PromoLinkPlatforms } from '../services/promoLinks';

interface OdesliResult {
  title: string;
  artist: string;
  coverUrl: string;
  platforms: PromoLinkPlatforms;
}

// Maps Odesli platform keys to our internal keys
const PLATFORM_MAP: Record<string, keyof PromoLinkPlatforms> = {
  spotify: 'spotify',
  appleMusic: 'appleMusic',
  youtubeMusic: 'youtubeMusic',
  deezer: 'deezer',
  tidal: 'tidal',
  amazonMusic: 'amazonMusic',
  soundcloud: 'soundcloud',
  napster: 'napster',
  pandora: 'pandora',
};

/** Normalize YouTube Music URLs to standard YouTube format for oEmbed */
function normalizeYouTubeUrl(url: string): string {
  // music.youtube.com/watch?v=XXX → youtube.com/watch?v=XXX
  return url.replace('music.youtube.com', 'www.youtube.com');
}

export function useOdesli() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetadata(url: string): Promise<OdesliResult | null> {
    setLoading(true);
    setError(null);

    try {
      const normalizedUrl = normalizeYouTubeUrl(url);

      // 1. Odesli API — gets all platform links + base metadata
      const odesliRes = await fetch(
        `https://api.odesli.co/v1/links?url=${encodeURIComponent(url)}&userCountry=AR`
      );
      if (!odesliRes.ok) throw new Error('No se pudo encontrar la canción en Odesli');
      const odesliData = await odesliRes.json();

      // Extract platform links
      const platforms: PromoLinkPlatforms = {};
      const linksByPlatform: Record<string, string> = {};

      if (odesliData.linksByPlatform) {
        for (const [key, value] of Object.entries(odesliData.linksByPlatform)) {
          const internalKey = PLATFORM_MAP[key];
          if (internalKey && (value as any).url) {
            platforms[internalKey] = (value as any).url;
            linksByPlatform[key] = (value as any).url;
          }
        }
      }

      // Extract title and artist from Odesli entity data
      let title = '';
      let artist = '';
      let coverUrl = '';

      if (odesliData.entitiesByUniqueId) {
        const entities = Object.values(odesliData.entitiesByUniqueId) as any[];
        const song = entities.find(e => e.type === 'song') || entities[0];
        if (song) {
          title = song.title || '';
          artist = song.artistName || '';
          coverUrl = song.thumbnailUrl || '';
        }
      }

      // 2. YouTube oEmbed as fallback/supplement for better thumbnail
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          // Use oEmbed title if we didn't get one from Odesli
          if (!title && oembedData.title) title = oembedData.title;
          if (!artist && oembedData.author_name) artist = oembedData.author_name;
          // Prefer high-res thumbnail from oEmbed
          if (oembedData.thumbnail_url) {
            // Try to get maxresdefault
            const videoId = new URL(normalizedUrl).searchParams.get('v');
            if (videoId) {
              coverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            } else {
              coverUrl = oembedData.thumbnail_url;
            }
          }
        }
      } catch {
        // oEmbed is a supplement — don't fail if it errors
      }

      if (!title) throw new Error('No se pudo extraer el nombre de la canción');

      return { title, artist, coverUrl, platforms };
    } catch (err: any) {
      setError(err.message || 'Error al procesar el link');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { fetchMetadata, loading, error };
}
