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

interface PresetTrack {
  isrc?: string;
  youtubeId?: string;
  platforms: {
    tidal?: string;
    amazonMusic?: string;
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

const PRESET_CATALOG: Record<string, PresetTrack> = {
  'no-me-alcanza-mas': {
    isrc: 'AR1S22600001',
    youtubeId: 'xsbgs08ADk0',
    platforms: {
      tidal: 'https://tidal.com/track/502610235/u',
      amazonMusic: 'https://music.amazon.com/albums/B0GQDB663L?trackAsin=B0GQCP15ZT'
    }
  }
};

function findPresetPlatforms(videoId: string | null, isrc: string | null, title: string, _artist: string): Record<string, string> {
  const normalizedTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  // 1. Match by YouTube Video ID
  if (videoId) {
    const matched = Object.values(PRESET_CATALOG).find(p => p.youtubeId === videoId);
    if (matched) return matched.platforms;
  }

  // 2. Match by ISRC
  if (isrc) {
    const matched = Object.values(PRESET_CATALOG).find(p => p.isrc === isrc);
    if (matched) return matched.platforms;
  }

  // 3. Match by normalized key slug (e.g. 'no-me-alcanza-mas')
  for (const [slug, preset] of Object.entries(PRESET_CATALOG)) {
    if (normalizedTitle.includes(slug) || slug.includes(normalizedTitle)) {
      return preset.platforms;
    }
  }

  return {};
}

/** Normalize YouTube Music URLs to standard YouTube format for oEmbed */
function normalizeYouTubeUrl(url: string): string {
  // music.youtube.com/watch?v=XXX → youtube.com/watch?v=XXX
  return url.replace('music.youtube.com', 'www.youtube.com');
}

/** Extracts the video ID from a YouTube/YouTube Music URL */
function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.substring(1);
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

/** Helper to make JSONP requests in the browser to bypass CORS */
export function fetchJsonp(url: string, callbackParam: string = 'callback'): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackId = `jsonp_cb_${Math.round(1000000 * Math.random())}`;
    const script = document.createElement('script');
    
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}output=jsonp&${callbackParam}=${callbackId}`;
    
    (window as any)[callbackId] = (data: any) => {
      resolve(data);
      cleanup();
    };
    
    script.onerror = () => {
      reject(new Error('JSONP request failed'));
      cleanup();
    };
    
    function cleanup() {
      delete (window as any)[callbackId];
      script.remove();
    }
    
    document.body.appendChild(script);
  });
}

async function searchSpotifyTrack(queryStr: string, clientId?: string | null, clientSecret?: string | null): Promise<{ spotifyUrl: string | null; error?: string }> {
  try {
    let url = `/api/spotify?q=${encodeURIComponent(queryStr)}`;
    if (clientId && clientSecret) {
      url += `&clientId=${encodeURIComponent(clientId)}&clientSecret=${encodeURIComponent(clientSecret)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return { spotifyUrl: data.spotifyUrl || null };
    }
    const errData = await res.json().catch(() => ({}));
    return { spotifyUrl: null, error: errData.details || errData.error || 'Failed to search track' };
  } catch (err: any) {
    console.error('Error searching Spotify track via proxy:', err);
    return { spotifyUrl: null, error: err.message || 'Network error' };
  }
}

async function searchYouTubeTrack(queryStr: string): Promise<{ youtubeMusicUrl: string | null; error?: string }> {
  try {
    const res = await fetch(`/api/youtube?q=${encodeURIComponent(queryStr)}`);
    if (res.ok) {
      const data = await res.json();
      return { youtubeMusicUrl: data.youtubeMusicUrl || null };
    }
    const errData = await res.json().catch(() => ({}));
    return { youtubeMusicUrl: null, error: errData.error || 'Failed to search YouTube Music' };
  } catch (err: any) {
    console.error('Error searching YouTube Music via proxy:', err);
    return { youtubeMusicUrl: null, error: err.message || 'Network error' };
  }
}


export function useOdesli() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetadata(url: string): Promise<OdesliResult | null> {
    setLoading(true);
    setError(null);

    // Decode URL to avoid double-encoding issues
    const decodedUrl = decodeURIComponent(url);

    const normalizedUrl = normalizeYouTubeUrl(decodedUrl);
    const videoId = getYouTubeVideoId(normalizedUrl);

    try {
      // 1. Try Odesli API first
      try {
        const odesliRes = await fetch(
          `https://api.odesli.co/v1/links?url=${encodeURIComponent(decodedUrl)}&userCountry=AR`
        );
        if (odesliRes.ok) {
          const odesliData = await odesliRes.json();
          const platforms: PromoLinkPlatforms = {};

          if (odesliData.linksByPlatform) {
            for (const [key, value] of Object.entries(odesliData.linksByPlatform)) {
              const internalKey = PLATFORM_MAP[key];
              if (internalKey && (value as any).url) {
                platforms[internalKey] = (value as any).url;
              }
            }
          }

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

          if (title) {
            // Apply preset overrides if any
            const presetPlatforms = findPresetPlatforms(videoId, null, title, artist);
            Object.assign(platforms, presetPlatforms);

            // Success with Odesli
            return { title, artist, coverUrl, platforms };
          }
        }
      } catch (odesliError) {
        console.warn('Odesli fetch failed, attempting fallback:', odesliError);
      }

      // 2. Fallback to YouTube oEmbed + iTunes Search API
      console.log('Using YouTube oEmbed + iTunes API fallback flow...');
      
      let title = '';
      let artist = '';
      let coverUrl = '';
      const platforms: PromoLinkPlatforms = {};
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        platforms.youtubeMusic = url;
      }

      // A. Query YouTube oEmbed
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          title = oembedData.title || '';
          artist = oembedData.author_name || '';
          
          // Clean artist name (remove " - Topic")
          artist = artist.replace(/\s*-\s*Topic$/, '').trim();
          
          // Clean title (remove "Official Video", "Official Audio", etc.)
          title = title
            .replace(/\s*\(Official\s*(Video|Audio|Lyric\s*Video|Music\s*Video)?\)/gi, '')
            .replace(/\s*\[Official\s*(Video|Audio|Lyric\s*Video|Music\s*Video)?\]/gi, '')
            .trim();

          // If title contains "Artist - SongName", split it
          if (title.toLowerCase().startsWith(artist.toLowerCase())) {
            title = title.substring(artist.length).replace(/^\s*-\s*/, '').trim();
          }

          // Initial cover fallback from YouTube thumbnail
          if (videoId) {
            coverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          } else if (oembedData.thumbnail_url) {
            coverUrl = oembedData.thumbnail_url;
          }
        }
      } catch (oembedError) {
        console.error('oEmbed fetch failed:', oembedError);
      }

      // If we couldn't even get oEmbed data, construct bare minimum from URL
      if (!title && videoId) {
        title = `YouTube Track (${videoId})`;
        coverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }

      // B. Query iTunes Search API to get perfect metadata + Apple Music link + High-Res Artwork
      if (title) {
        try {
          const searchQuery = artist ? `${artist} ${title}` : title;
          const iTunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=1`
          );
          if (iTunesRes.ok) {
            const iTunesData = await iTunesRes.json();
            if (iTunesData.results && iTunesData.results.length > 0) {
              const track = iTunesData.results[0];
              title = track.trackName || title;
              artist = track.artistName || artist;
              if (track.trackViewUrl) {
                platforms.appleMusic = track.trackViewUrl;
              }
              // Replace 100x100 with 600x600 for HD cover quality
              if (track.artworkUrl100) {
                coverUrl = track.artworkUrl100.replace('/100x100bb.jpg', '/600x600bb.jpg');
              }
            }
          }
        } catch (itunesError) {
          console.error('iTunes Search API failed:', itunesError);
        }
      }

      // C. Query Deezer Search API using JSONP to bypass CORS
      let isrcFromDeezer: string | null = null;
      if (title) {
        try {
          const searchQuery = artist ? `${artist} ${title}` : title;
          const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`;
          const deezerData = await fetchJsonp(deezerUrl);
          if (deezerData && deezerData.data && deezerData.data.length > 0) {
            const track = deezerData.data[0];
            if (track.link) {
              platforms.deezer = track.link;
            }
            if (track.isrc) {
              isrcFromDeezer = track.isrc;
            }
          }
        } catch (deezerError) {
          console.error('Deezer Search API via JSONP failed:', deezerError);
        }
      }

      // D. Query Spotify Search API
      if (title) {
        try {
          console.log('Attempting automated Spotify Search via proxy...');
          const searchQuery = artist ? `${artist} ${title}` : title;
          const spClientId = localStorage.getItem('spotify_client_id');
          const spClientSecret = localStorage.getItem('spotify_client_secret');
          const spotifyResult = await searchSpotifyTrack(searchQuery, spClientId, spClientSecret);
          if (spotifyResult.spotifyUrl) {
            platforms.spotify = spotifyResult.spotifyUrl;
            console.log('Successfully auto-detected Spotify link:', spotifyResult.spotifyUrl);
          } else if (spotifyResult.error) {
            console.warn('Spotify search failed via proxy:', spotifyResult.error);
          }
        } catch (spotifyError) {
          console.error('Spotify API search flow failed:', spotifyError);
        }
      }

      // E. Query YouTube Music Search API (if not already set because of starting URL)
      if (title && !platforms.youtubeMusic) {
        try {
          console.log('Attempting automated YouTube Search via proxy...');
          const searchQuery = artist ? `${artist} ${title}` : title;
          const youtubeResult = await searchYouTubeTrack(searchQuery);
          if (youtubeResult.youtubeMusicUrl) {
            platforms.youtubeMusic = youtubeResult.youtubeMusicUrl;
            console.log('Successfully auto-detected YouTube Music link:', youtubeResult.youtubeMusicUrl);
          }
        } catch (youtubeError) {
          console.error('YouTube API search flow failed:', youtubeError);
        }
      }

      // Apply preset overrides if any (e.g. Tidal and Amazon Music links)
      const presetPlatforms = findPresetPlatforms(videoId, isrcFromDeezer, title, artist);
      Object.assign(platforms, presetPlatforms);

      if (!title) {
        throw new Error('No se pudo extraer la información del link. Por favor ingresa los datos manualmente.');
      }

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

