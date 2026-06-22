import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPromoLinks, deletePromoLink, updatePromoLink, createPromoLink, type PromoLink, type PromoLinkPlatforms
} from '../../../services/promoLinks';
import { useOdesli, fetchJsonp } from '../../../hooks/useOdesli';

export default function AdminPromoLinks() {
  const [links, setLinks] = useState<PromoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const { fetchMetadata } = useOdesli();
  const indexerCancelledRef = useRef(false);

  // Indexer States
  interface IndexerLogItem {
    title: string;
    artist: string;
    status: 'imported' | 'indexed' | 'omitted' | 'cleaned';
    details: string;
    platformsCount?: number;
  }

  const [showIndexerModal, setShowIndexerModal] = useState(false);
  const [indexingInProgress, setIndexingInProgress] = useState(false);
  const [indexerPhase, setIndexerPhase] = useState<'idle' | 'discovering' | 'indexing'>('idle');
  const [indexerTotalSongs, setIndexerTotalSongs] = useState(0);
  const [indexerCurrentIndex, setIndexerCurrentIndex] = useState(0);
  const [indexerOmittedCount, setIndexerOmittedCount] = useState(0);
  const [indexerCurrentSongTitle, setIndexerCurrentSongTitle] = useState('');
  const [indexerDetectedPlatforms, setIndexerDetectedPlatforms] = useState<string[]>([]);
  const [_indexerCancelled, setIndexerCancelled] = useState(false);
  const [indexerLog, setIndexerLog] = useState<IndexerLogItem[]>([]);

  function isFullyIndexed(link: PromoLink): boolean {
    if (!link.platforms) return false;
    const keys: (keyof PromoLinkPlatforms)[] = ['spotify', 'appleMusic', 'youtubeMusic', 'deezer', 'tidal', 'amazonMusic', 'soundcloud'];
    const filledCount = keys.filter(k => link.platforms[k]).length;
    // Si tiene al menos 4 plataformas, o si tiene Spotify + Apple Music que son las principales
    const hasCritical = link.platforms.spotify && link.platforms.appleMusic;
    return filledCount >= 4 || Boolean(hasCritical);
  }

  async function startIndexing() {
    if (indexingInProgress) return;

    indexerCancelledRef.current = false;
    setIndexerPhase('discovering');
    setIndexerTotalSongs(0);
    setIndexerCurrentIndex(0);
    setIndexerOmittedCount(0);
    setIndexerCurrentSongTitle('Limpiando catálogo...');
    setIndexerDetectedPlatforms([]);
    setIndexerCancelled(false);
    setIndexerLog([]);
    setShowIndexerModal(true);
    setIndexingInProgress(true);

    const tempLog: IndexerLogItem[] = [];
    let dbLinks = [...links];

    // Fase 0: Limpieza de seguridad de artistas que no sean Jed Vik (ej. Red Vok de pruebas previas)
    const cleanLinks = [];
    for (const link of dbLinks) {
      const artist = link.artist || '';
      // Debe contener Jed Vik (ignorando mayúsculas/minúsculas)
      if (!artist.toLowerCase().includes('jed vik')) {
        console.log(`Eliminando canción no relacionada: ${link.title} (${link.artist})`);
        try {
          await deletePromoLink(link.id);
          tempLog.push({
            title: link.title,
            artist: link.artist,
            status: 'cleaned',
            details: `Removida por pertenecer al artista: ${link.artist}`
          });
        } catch (e) {
          console.error(`Error eliminando ${link.title}:`, e);
        }
      } else {
        cleanLinks.push(link);
      }
    }
    dbLinks = [...cleanLinks];
    setLinks(dbLinks);
    setIndexerLog([...tempLog]);

    setIndexerCurrentSongTitle('Buscando lanzamientos de Jed Vik...');

    // Fase 1: Descubrimiento de Canciones del Artista en iTunes
    try {
      const itunesArtistRes = await fetch(`https://itunes.apple.com/search?term=Jed+Vik&entity=song&limit=50`);
      if (itunesArtistRes.ok) {
        const itunesData = await itunesArtistRes.json();
        if (itunesData.results && itunesData.results.length > 0) {
          const songsFromItunes = itunesData.results;

          for (const track of songsFromItunes) {
            if (indexerCancelledRef.current) break;

            const title = track.trackName;
            const artistName = track.artistName || '';
            if (!title) continue;

            // Filtrar para asegurar que el artista sea Jed Vik o feat
            if (!artistName.toLowerCase().includes('jed vik')) continue;

            // Comparar de forma normalizada para evitar duplicados
            const norm = (s: string) => s.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '')
              .trim();

            const titleCleaned = title.replace(/\s*\(acústico\)/gi, '').replace(/\s*\(acústica\)/gi, '').trim();
            const normalizedTitleCleaned = norm(titleCleaned);

            // Comparar de forma flexible: evitar duplicar versiones acústicas
            const exists = dbLinks.some(l => {
              const n1 = norm(l.title.replace(/\s*\(acústico\)/gi, '').replace(/\s*\(acústica\)/gi, '').trim());
              return n1.includes(normalizedTitleCleaned) || normalizedTitleCleaned.includes(n1);
            });

            if (!exists) {
              setIndexerCurrentSongTitle(`Importando canción: ${title}...`);

              const cover = track.artworkUrl100
                ? track.artworkUrl100.replace('/100x100bb.jpg', '/600x600bb.jpg')
                : '';

              const newSongData = {
                title,
                artist: track.artistName || 'Jed Vik',
                coverUrl: cover,
                youtubeUrl: '', 
                slug: norm(title).replace(/\s+/g, '-'),
                platforms: {
                  appleMusic: track.trackViewUrl || ''
                },
                active: true
              };

              const newId = await createPromoLink(newSongData);
              const newLinkObj: PromoLink = {
                id: newId,
                ...newSongData,
                createdAt: {} as any,
                updatedAt: {} as any
              };

              dbLinks.push(newLinkObj);
              setLinks([...dbLinks]); 
              tempLog.push({
                title,
                artist: newSongData.artist,
                status: 'imported',
                details: 'Importada desde iTunes'
              });
              setIndexerLog([...tempLog]);
              await new Promise(r => setTimeout(r, 400)); 
            }
          }
        }
      }
    } catch (err) {
      console.error("Error al descubrir canciones en iTunes:", err);
    }

    if (indexerCancelledRef.current) {
      setIndexerCancelled(true);
      setIndexingInProgress(false);
      return;
    }

    // Fase 2: Indexación de Plataformas
    setIndexerPhase('indexing');
    setIndexerTotalSongs(dbLinks.length);
    setIndexerCurrentIndex(0);
    setIndexerOmittedCount(0);

    let currentOmitted = 0;
    let currentProcessed = 0;

    for (let i = 0; i < dbLinks.length; i++) {
      if (indexerCancelledRef.current) {
        setIndexerCancelled(true);
        break;
      }

      const song = dbLinks[i];

      if (isFullyIndexed(song)) {
        currentOmitted++;
        setIndexerOmittedCount(currentOmitted);
        
        // Registrar en log como omitida
        const activePlatformsCount = Object.values(song.platforms || {}).filter(Boolean).length;
        // Solo agregar al log si no fue importada recién en esta ejecución
        if (!tempLog.some(item => item.title === song.title && item.status === 'imported')) {
          tempLog.push({
            title: song.title,
            artist: song.artist,
            status: 'omitted',
            details: 'Omitida por estar completamente indexada',
            platformsCount: activePlatformsCount
          });
          setIndexerLog([...tempLog]);
        }
        continue;
      }

      currentProcessed++;
      setIndexerCurrentIndex(currentProcessed);
      setIndexerCurrentSongTitle(song.title);

      const existing = Object.keys(song.platforms || {}).filter(k => song.platforms[k as keyof PromoLinkPlatforms]);
      setIndexerDetectedPlatforms(existing);

      try {
        const updatedPlatforms = { ...song.platforms };

        if (!updatedPlatforms.youtubeMusic && song.youtubeUrl) {
          updatedPlatforms.youtubeMusic = song.youtubeUrl;
        }

        // Delay to prevent rate limits
        await new Promise(r => setTimeout(r, 600));

        // Limpiar título de canción para búsquedas en APIs
        const cleanTitle = song.title
          .replace(/\s*\(acústico\)/gi, '')
          .replace(/\s*\(acústica\)/gi, '')
          .replace(/\s*\(official\s*(video|audio)?\)/gi, '')
          .trim();

        // 1. Si falta Apple Music, buscar en iTunes
        if (!updatedPlatforms.appleMusic) {
          try {
            const searchQuery = song.artist ? `${song.artist} ${cleanTitle}` : cleanTitle;
            const iTunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=1`);
            if (iTunesRes.ok) {
              const iTunesData = await iTunesRes.json();
              if (iTunesData.results && iTunesData.results.length > 0) {
                updatedPlatforms.appleMusic = iTunesData.results[0].trackViewUrl || '';
              }
            }
          } catch (e) {
            console.warn(`iTunes search failed for ${song.title}:`, e);
          }
        }

        // 2. Si falta Deezer, buscar en Deezer
        if (!updatedPlatforms.deezer) {
          try {
            const searchQuery = song.artist ? `${song.artist} ${cleanTitle}` : cleanTitle;
            const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`;
            const deezerData = await fetchJsonp(deezerUrl);
            if (deezerData && deezerData.data && deezerData.data.length > 0) {
              updatedPlatforms.deezer = deezerData.data[0].link || '';
            }
          } catch (e) {
            console.warn(`Deezer search failed for ${song.title}:`, e);
          }
        }

        // 3. Si falta Spotify, buscar en Spotify
        if (!updatedPlatforms.spotify) {
          try {
            const searchQuery = song.artist ? `${song.artist} ${cleanTitle}` : cleanTitle;
            const spClientId = localStorage.getItem('spotify_client_id');
            const spClientSecret = localStorage.getItem('spotify_client_secret');
            let spotifyApiUrl = `/api/spotify?q=${encodeURIComponent(searchQuery)}`;
            if (spClientId && spClientSecret) {
              spotifyApiUrl += `&clientId=${encodeURIComponent(spClientId)}&clientSecret=${encodeURIComponent(spClientSecret)}`;
            }
            const res = await fetch(spotifyApiUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.spotifyUrl) {
                updatedPlatforms.spotify = data.spotifyUrl;
              }
            }
          } catch (e) {
            console.warn(`Spotify search failed for ${song.title}:`, e);
          }
        }

        // 4. Si falta YouTube Music, buscar en Invidious (YouTube Music Proxy)
        if (!updatedPlatforms.youtubeMusic) {
          try {
            const searchQuery = song.artist ? `${song.artist} ${cleanTitle}` : cleanTitle;
            const ytApiUrl = `/api/youtube?q=${encodeURIComponent(searchQuery)}`;
            const res = await fetch(ytApiUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.youtubeMusicUrl) {
                updatedPlatforms.youtubeMusic = data.youtubeMusicUrl;
              }
            }
          } catch (e) {
            console.warn(`YouTube Music search failed for ${song.title}:`, e);
          }
        }

        // Auxiliar para consultar Odesli
        async function resolveViaOdesli(url: string) {
          try {
            await new Promise(r => setTimeout(r, 400));
            const odesliResult = await fetchMetadata(url);
            if (odesliResult && odesliResult.platforms) {
              const keys = Object.keys(odesliResult.platforms) as (keyof PromoLinkPlatforms)[];
              for (const key of keys) {
                if (odesliResult.platforms[key] && !updatedPlatforms[key]) {
                  updatedPlatforms[key] = odesliResult.platforms[key];
                }
              }
            }
          } catch (e) {
            console.warn(`Odesli resolve failed for url ${url}:`, e);
          }
        }

        // 3. Consultar Odesli secuencialmente con todas las URLs que tengamos
        if (song.youtubeUrl) {
          await resolveViaOdesli(song.youtubeUrl);
        }

        if (updatedPlatforms.appleMusic) {
          await resolveViaOdesli(updatedPlatforms.appleMusic);
        }

        if (updatedPlatforms.deezer) {
          await resolveViaOdesli(updatedPlatforms.deezer);
        }

        // Actualizar visualización
        const finalDetected = Object.keys(updatedPlatforms).filter(k => updatedPlatforms[k as keyof PromoLinkPlatforms]);
        setIndexerDetectedPlatforms(finalDetected);

        // Guardar cambios en Firestore
        const originalKeys = Object.keys(song.platforms || {}) as (keyof PromoLinkPlatforms)[];
        let hasChanges = false;
        const newKeys = Object.keys(updatedPlatforms) as (keyof PromoLinkPlatforms)[];

        if (newKeys.length !== originalKeys.length) {
          hasChanges = true;
        } else {
          for (const key of newKeys) {
            if (updatedPlatforms[key] !== (song.platforms || {})[key]) {
              hasChanges = true;
              break;
            }
          }
        }

        if (hasChanges) {
          await updatePromoLink(song.id, { platforms: updatedPlatforms });
          dbLinks[i] = { ...song, platforms: updatedPlatforms };
        }

        // Registrar en log
        const importedIndex = tempLog.findIndex(item => item.title === song.title && item.status === 'imported');
        if (importedIndex >= 0) {
          // Si fue importada en esta corrida, actualizamos sus plataformas finales
          tempLog[importedIndex].platformsCount = finalDetected.length;
          tempLog[importedIndex].details = `Importada e indexada en ${finalDetected.length} plataformas`;
        } else {
          tempLog.push({
            title: song.title,
            artist: song.artist,
            status: 'indexed',
            details: `Indexada en ${finalDetected.length} plataformas`,
            platformsCount: finalDetected.length
          });
        }
        setIndexerLog([...tempLog]);

      } catch (err) {
        console.error(`Error procesando canción ${song.title}:`, err);
      }
    }

    setLinks(dbLinks);
    setIndexingInProgress(false);
  }

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    setLoading(true);
    try {
      const data = await getPromoLinks();
      setLinks(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este promo link?')) return;
    setDeleting(id);
    await deletePromoLink(id);
    setLinks(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
    setMenuOpenId(null);
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
    setMenuOpenId(null);
  }

  const filtered = links.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.artist.toLowerCase().includes(search.toLowerCase())
  );

  const platformCount = (l: PromoLink) => Object.values(l.platforms).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: '#0e0e0e' }}>

      {/* Header */}
      <div className="relative px-2 pt-2 pb-6">
        {/* Subtle coral glow behind title */}
        <div
          className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 0%, rgba(204,78,61,0.18) 0%, transparent 70%)',
          }}
        />
        <div className="relative flex items-start justify-between">
          <div>
            <h1
              className="font-headline font-black uppercase tracking-tighter text-white"
              style={{ fontSize: '2.4rem', lineHeight: 1, letterSpacing: '-0.04em' }}
            >
              PROMO<br />LINKS
            </h1>
            <p className="font-label uppercase tracking-[0.2em] text-white/30 text-[10px] mt-2">
              Links personalizados por canción
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-1 flex-shrink-0">
            <button
              onClick={startIndexing}
              disabled={indexingInProgress || links.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-label font-bold text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-all border border-white/10 hover:border-primary/50 bg-white/[0.02] disabled:opacity-40"
              style={{ height: '48px' }}
            >
              <span className="material-symbols-outlined text-[16px]">dataset_linked</span>
              <span className="hidden sm:inline">Indexar Catálogo</span>
            </button>
            <Link
              to="/admin/promo/new"
              className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
            >
              <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 mb-6">
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-full"
          style={{ background: '#1c1b1b' }}
        >
          <span className="material-symbols-outlined text-white/30 text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar canción..."
            className="flex-1 bg-transparent font-body text-sm text-white placeholder-white/30 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <span className="material-symbols-outlined text-white/30 text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
          <p className="font-label text-white/30 text-[11px] uppercase tracking-widest">Cargando...</p>
        </div>
      ) : filtered.length === 0 && !search ? (
        /* Empty state */
        <div className="px-2">
          <div
            className="flex flex-col items-center justify-center py-14 rounded-3xl gap-4"
            style={{ background: '#131313', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#1c1b1b' }}
            >
              <span className="material-symbols-outlined text-white/20 text-3xl">music_note</span>
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-white/50 text-sm">Sin promo links todavía</p>
              <p className="font-body text-white/25 text-xs mt-1">Pegá un link de YouTube Music para empezar</p>
            </div>
            <Link
              to="/admin/promo/new"
              className="mt-2 px-6 py-2.5 rounded-full font-label font-bold text-[11px] uppercase tracking-widest text-white"
              style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
            >
              Crear primer link
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-label text-white/30 text-[11px] uppercase tracking-widest">Sin resultados para "{search}"</p>
        </div>
      ) : (
        <div className="px-2 flex flex-col gap-3" onClick={() => setMenuOpenId(null)}>
          {filtered.map(link => (
            <div
              key={link.id}
              className="relative rounded-2xl flex items-center gap-4 p-4"
              style={{ background: '#1c1b1b' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Coral left accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                style={{ background: 'linear-gradient(180deg, #CC4E3D 0%, #f68a2f 100%)' }}
              />

              {/* Cover */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ml-2 bg-surface-container">
                {link.coverUrl ? (
                  <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/20 text-2xl">music_note</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-white text-sm truncate">{link.title}</p>
                <p className="font-body text-white/50 text-xs truncate mt-0.5">{link.artist}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(204,78,61,0.2)', color: '#CC4E3D' }}
                  >
                    {platformCount(link)} plataformas
                  </span>
                  {!link.active && (
                    <span
                      className="px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
                    >
                      Inactivo
                    </span>
                  )}
                </div>
              </div>

              {/* Three-dot menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === link.id ? null : link.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>

                {menuOpenId === link.id && (
                  <div
                    className="absolute right-0 top-10 z-20 rounded-2xl py-2 min-w-[160px] shadow-2xl"
                    style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <button
                      onClick={() => { navigate(`/admin/promo/${link.id}/edit`); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-label text-[11px] uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Editar
                    </button>
                    <button
                      onClick={() => copyLink(link.slug)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-label text-[11px] uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      Copiar link
                    </button>
                    <button
                      onClick={() => window.open(`/p/${link.slug}`, '_blank')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-label text-[11px] uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Ver página
                    </button>
                    <div className="mx-3 my-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deleting === link.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-label text-[11px] uppercase tracking-wider hover:bg-white/5 transition-colors"
                      style={{ color: '#CC4E3D' }}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {deleting === link.id ? 'progress_activity' : 'delete'}
                      </span>
                      {deleting === link.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spacer for FAB */}
      <div className="h-28" />

      {/* FAB */}
      <Link
        to="/admin/promo/new"
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-7 py-4 rounded-full shadow-2xl font-label font-bold uppercase tracking-widest text-sm text-white z-40 whitespace-nowrap"
        style={{
          background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)',
          boxShadow: '0 8px 32px rgba(204,78,61,0.4)',
        }}
      >
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
        NUEVO PROMO LINK
      </Link>

      {/* Indexer Modal */}
      {showIndexerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl border border-white/10" style={{ background: '#171717' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline font-black text-xl text-white uppercase tracking-tight">
                Indexando Catálogo
              </h3>
              {!indexingInProgress && (
                <button
                  onClick={() => setShowIndexerModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Progress Info */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label text-[10px] uppercase tracking-wider text-white/40">
                  {indexerPhase === 'discovering'
                    ? 'Fase 1: Descubriendo canciones...'
                    : indexingInProgress
                    ? 'Fase 2: Indexando plataformas...'
                    : 'Indexación Finalizada'}
                </span>
                {indexerPhase !== 'discovering' && (
                  <span className="font-label text-[10px] uppercase tracking-wider text-primary font-bold">
                    {indexerCurrentIndex + indexerOmittedCount} / {indexerTotalSongs}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${indexerPhase === 'discovering' ? 'animate-pulse w-full' : ''}`}
                  style={{
                    width: indexerPhase === 'discovering'
                      ? '100%'
                      : `${(indexerTotalSongs ? ((indexerCurrentIndex + indexerOmittedCount) / indexerTotalSongs) * 100 : 0)}%`,
                    background: 'linear-gradient(90deg, #CC4E3D 0%, #f68a2f 100%)'
                  }}
                />
              </div>
            </div>

            {/* Current Song Card */}
            {indexingInProgress && indexerCurrentSongTitle && (
              <div className="p-4 rounded-2xl mb-6 bg-white/[0.03] border border-white/5 flex flex-col gap-2">
                <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">
                  {indexerPhase === 'discovering' ? 'Buscando catálogo público' : 'Canción Activa'}
                </span>
                <div className="flex items-center gap-3">
                  {indexerPhase === 'discovering' && (
                    <span className="material-symbols-outlined text-primary text-base animate-spin">progress_activity</span>
                  )}
                  <p className="font-headline font-bold text-white text-sm truncate flex-1">
                    {indexerCurrentSongTitle}
                  </p>
                </div>
                
                {/* Platform icons feedback */}
                {indexerPhase === 'indexing' && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {['spotify', 'appleMusic', 'deezer', 'tidal', 'amazonMusic', 'soundcloud'].map(platform => {
                      const detected = indexerDetectedPlatforms.includes(platform);
                      const colors: Record<string, string> = {
                        spotify: '#1DB954',
                        appleMusic: '#FC3C44',
                        deezer: '#A238FF',
                        tidal: '#E1E1E1',
                        amazonMusic: '#00A8E0',
                        soundcloud: '#FF5500',
                      };
                      const icons: Record<string, string> = {
                        spotify: 'spotify',
                        appleMusic: 'apple',
                        deezer: 'deezer',
                        tidal: 'tidal',
                        amazonMusic: 'amazonmusic',
                        soundcloud: 'soundcloud',
                      };
                      return (
                        <div
                          key={platform}
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all border p-2"
                          style={{
                            backgroundColor: detected ? `${colors[platform]}15` : 'rgba(255,255,255,0.02)',
                            borderColor: detected ? colors[platform] : 'rgba(255,255,255,0.05)',
                          }}
                          title={platform}
                        >
                          <img
                            src={`https://cdn.simpleicons.org/${icons[platform]}/${detected ? colors[platform].replace('#', '') : '444444'}`}
                            alt={platform}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Indexer Log Summary */}
            {!indexingInProgress && indexerLog.length > 0 && (
              <div className="max-h-48 overflow-y-auto p-4 rounded-2xl mb-6 bg-white/[0.03] border border-white/5 flex flex-col gap-2.5 text-xs text-white/60">
                <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">
                  Resumen de Operaciones
                </span>
                <div className="flex flex-col gap-2">
                  {indexerLog.map((item, idx) => {
                    const statusColors = {
                      imported: 'text-[#1DB954]', // Verde
                      indexed: 'text-primary', // Naranja/Coral
                      omitted: 'text-white/30', // Gris suave
                      cleaned: 'text-red-400', // Rojo
                    };
                    const statusLabels = {
                      imported: 'Importada',
                      indexed: 'Indexada',
                      omitted: 'Omitida',
                      cleaned: 'Removida',
                    };
                    return (
                      <div key={idx} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-headline font-bold text-white text-[13px] truncate flex-1">{item.title}</span>
                          <span className={`font-label text-[9px] uppercase tracking-wider font-bold ${statusColors[item.status]}`}>
                            {statusLabels[item.status]}
                          </span>
                        </div>
                        <p className="font-body text-white/40 text-[10px] flex justify-between">
                          <span>{item.details}</span>
                          {item.platformsCount !== undefined && item.platformsCount > 0 && (
                            <span>{item.platformsCount} plataformas</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {indexingInProgress ? (
                <button
                  onClick={() => { indexerCancelledRef.current = true; setIndexerCancelled(true); }}
                  className="px-5 py-2.5 rounded-full font-label font-bold text-[10px] uppercase tracking-widest text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  onClick={() => setShowIndexerModal(false)}
                  className="px-6 py-2.5 rounded-full font-label font-bold text-[10px] uppercase tracking-widest text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
