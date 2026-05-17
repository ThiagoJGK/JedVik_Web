import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOdesli } from '../../../hooks/useOdesli';
import {
  createPromoLink, updatePromoLink, getPromoLink,
  generateSlug, type PromoLinkPlatforms
} from '../../../services/promoLinks';

interface PlatformInfo {
  key: keyof PromoLinkPlatforms;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformInfo[] = [
  { key: 'spotify',      label: 'Spotify',       icon: '🎵', color: '#1DB954', bgColor: 'rgba(29,185,84,0.12)' },
  { key: 'appleMusic',   label: 'Apple Music',   icon: '🎵', color: '#FC3C44', bgColor: 'rgba(252,60,68,0.12)' },
  { key: 'youtubeMusic', label: 'YouTube Music', icon: '▶️', color: '#FF0000', bgColor: 'rgba(255,0,0,0.10)' },
  { key: 'amazonMusic',  label: 'Amazon Music',  icon: '🎵', color: '#00A8E0', bgColor: 'rgba(0,168,224,0.12)' },
  { key: 'tidal',        label: 'Tidal',         icon: '🌊', color: '#E1E1E1', bgColor: 'rgba(255,255,255,0.08)' },
  { key: 'deezer',       label: 'Deezer',        icon: '🎵', color: '#A238FF', bgColor: 'rgba(162,56,255,0.12)' },
  { key: 'soundcloud',   label: 'SoundCloud',    icon: '🎵', color: '#FF5500', bgColor: 'rgba(255,85,0,0.12)' },
];

export default function AdminPromoLinkEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { fetchMetadata, loading: fetchLoading, error: fetchError } = useOdesli();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [platforms, setPlatforms] = useState<PromoLinkPlatforms>({});
  const [active, setActive] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [urlPasted, setUrlPasted] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (isEdit && id) {
      setLoadingEdit(true);
      getPromoLink(id).then(link => {
        if (link) {
          setYoutubeUrl(link.youtubeUrl);
          setTitle(link.title);
          setArtist(link.artist);
          setCoverUrl(link.coverUrl);
          setSlug(link.slug);
          setSlugEdited(true);
          setPlatforms(link.platforms);
          setActive(link.active);
          setPreviewReady(true);
          setUrlPasted(true);
        }
        setLoadingEdit(false);
      });
    }
  }, [isEdit, id]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugEdited]);

  async function handleUrlChange(url: string) {
    setYoutubeUrl(url);
    setUrlPasted(false);
    setPreviewReady(false);

    const trimmed = url.trim();
    if (!trimmed || !(trimmed.includes('youtube.com') || trimmed.includes('youtu.be'))) return;

    setUrlPasted(true);
    const result = await fetchMetadata(trimmed);
    if (result) {
      setTitle(result.title);
      setArtist(result.artist);
      setCoverUrl(result.coverUrl);
      setPlatforms(result.platforms);
      setPreviewReady(true);
    }
  }

  function handlePlatformChange(key: keyof PromoLinkPlatforms, value: string) {
    setPlatforms(prev => ({ ...prev, [key]: value || undefined }));
  }

  function clearPlatform(key: keyof PromoLinkPlatforms) {
    setPlatforms(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  async function handleSave() {
    if (!title || !youtubeUrl || !slug) return;
    setSaving(true);
    try {
      const data = {
        title,
        artist,
        coverUrl,
        youtubeUrl,
        slug,
        platforms,
        active,
      };
      if (isEdit && id) {
        await updatePromoLink(id, data);
      } else {
        await createPromoLink(data);
      }
      navigate('/admin/promo');
    } finally {
      setSaving(false);
    }
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#0e0e0e' }}>

      {/* Top nav */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/promo')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="font-headline font-black text-white uppercase tracking-tight text-xl">
            {isEdit ? 'Editar Link' : 'Nuevo Promo Link'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-label font-bold text-[11px] uppercase tracking-widest text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
        >
          {saving ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">save</span>
          )}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* URL Input */}
      <div className="mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 px-1">
          Link de YouTube Music
        </p>
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
          style={{
            background: '#1c1b1b',
            border: fetchLoading
              ? '1px solid rgba(204,78,61,0.5)'
              : urlPasted && previewReady
              ? '1px solid rgba(29,185,84,0.3)'
              : '1px solid transparent',
          }}
        >
          {/* YouTube icon */}
          <div
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: 'rgba(255,0,0,0.15)' }}
          >
            <span className="text-base">▶️</span>
          </div>
          <input
            type="url"
            value={youtubeUrl}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="Pegar link de YouTube Music..."
            className="flex-1 bg-transparent font-body text-sm text-white placeholder-white/30 outline-none"
          />
          {fetchLoading && (
            <span className="material-symbols-outlined text-primary text-[18px] animate-spin flex-shrink-0">progress_activity</span>
          )}
          {!fetchLoading && previewReady && (
            <span className="material-symbols-outlined flex-shrink-0 text-[18px]" style={{ color: '#1DB954' }}>check_circle</span>
          )}
        </div>

        {fetchError && (
          <p className="mt-2 px-1 font-label text-[11px] uppercase tracking-wider" style={{ color: '#CC4E3D' }}>
            ⚠ {fetchError}
          </p>
        )}
      </div>

      {/* Preview card — appears after fetch */}
      {previewReady && (
        <div
          className="mb-6 rounded-2xl overflow-hidden"
          style={{ background: '#1c1b1b' }}
        >
          <div className="flex gap-4 p-4">
            {/* Cover */}
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container">
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/20 text-3xl">music_note</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ background: 'rgba(29,185,84,0.15)', color: '#1DB954' }}
              >
                <span className="material-symbols-outlined text-[12px]">check</span>
                Completado automáticamente
              </span>

              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-transparent font-headline font-bold text-white text-base outline-none border-b border-transparent focus:border-white/10 transition-colors truncate"
                placeholder="Título de la canción"
              />
              <input
                type="text"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                className="w-full bg-transparent font-body text-sm mt-0.5 outline-none border-b border-transparent focus:border-white/10 transition-colors"
                placeholder="Artista"
                style={{ color: '#CC4E3D' }}
              />
            </div>
          </div>

          {/* Cover URL field */}
          <div className="px-4 pb-3">
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className="w-full bg-transparent font-body text-xs text-white/30 outline-none"
              placeholder="URL de portada..."
            />
          </div>
        </div>
      )}

      {/* Manual title/artist if no URL yet */}
      {!previewReady && (
        <div
          className="mb-6 rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: '#1c1b1b' }}
        >
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent font-headline font-bold text-white text-base outline-none border-b border-white/10 pb-2"
            placeholder="Título de la canción (manual)"
          />
          <input
            type="text"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            className="w-full bg-transparent font-body text-sm text-white/60 outline-none border-b border-white/10 pb-2"
            placeholder="Artista"
          />
          <input
            type="url"
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
            className="w-full bg-transparent font-body text-sm text-white/60 outline-none"
            placeholder="URL de portada (opcional)"
          />
        </div>
      )}

      {/* Slug */}
      <div className="mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 px-1">
          Slug del link — jedvik.com/p/
        </p>
        <div
          className="flex items-center gap-2 px-5 py-3.5 rounded-2xl"
          style={{ background: '#1c1b1b' }}
        >
          <span className="font-body text-sm text-white/30">/p/</span>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
            className="flex-1 bg-transparent font-body text-sm text-white outline-none"
            placeholder="mi-cancion"
          />
        </div>
      </div>

      {/* Platforms */}
      <div className="mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 px-1">
          Plataformas
        </p>
        <div className="flex flex-col gap-2">
          {PLATFORMS.map(p => {
            const val = platforms[p.key] || '';
            const detected = Boolean(val);
            return (
              <div
                key={p.key}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: detected ? p.bgColor : '#1c1b1b' }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Platform name */}
                  <span className="text-base w-5 text-center flex-shrink-0">{p.icon}</span>
                  <span
                    className="font-label font-bold text-[11px] uppercase tracking-wider w-28 flex-shrink-0"
                    style={{ color: detected ? p.color : 'rgba(255,255,255,0.4)' }}
                  >
                    {p.label}
                  </span>

                  {/* Status badge */}
                  {detected ? (
                    <span
                      className="text-[10px] font-label px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${p.color}22`, color: p.color }}
                    >
                      ✓ Detectado
                    </span>
                  ) : (
                    <span className="text-[10px] font-label text-white/20 flex-shrink-0">
                      No detectado
                    </span>
                  )}

                  {/* Clear btn */}
                  {detected && (
                    <button
                      onClick={() => clearPlatform(p.key)}
                      className="ml-auto text-white/20 hover:text-white/60 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* URL input */}
                <div className="px-4 pb-3">
                  <input
                    type="url"
                    value={val}
                    onChange={e => handlePlatformChange(p.key, e.target.value)}
                    placeholder={`URL de ${p.label}...`}
                    className="w-full bg-transparent font-body text-xs text-white/40 placeholder-white/20 outline-none"
                    style={{ color: detected ? 'rgba(255,255,255,0.6)' : undefined }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl mb-8"
        style={{ background: '#1c1b1b' }}
      >
        <div>
          <p className="font-label font-bold text-sm text-white uppercase tracking-wider">Página activa</p>
          <p className="font-body text-xs text-white/30 mt-0.5">El link público estará disponible</p>
        </div>
        <button
          onClick={() => setActive(!active)}
          className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
          style={{ background: active ? 'linear-gradient(135deg, #CC4E3D, #f68a2f)' : '#353534' }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            style={{ left: active ? '26px' : '2px' }}
          />
        </button>
      </div>

      {/* Save CTA */}
      <button
        onClick={handleSave}
        disabled={saving || !title || !slug}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-8 py-4 rounded-full shadow-2xl font-label font-bold uppercase tracking-widest text-sm text-white z-40 whitespace-nowrap disabled:opacity-40 transition-all"
        style={{
          background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)',
          boxShadow: '0 8px 32px rgba(204,78,61,0.4)',
          minWidth: '200px',
          justifyContent: 'center',
        }}
      >
        {saving ? (
          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
        )}
        {saving ? 'Guardando...' : 'GUARDAR PROMO LINK'}
      </button>
    </div>
  );
}
