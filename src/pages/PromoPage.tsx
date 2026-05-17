import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPromoLinkBySlug, type PromoLink, type PromoLinkPlatforms } from '../services/promoLinks';

interface PlatformInfo {
  key: keyof PromoLinkPlatforms;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformInfo[] = [
  { key: 'spotify',      label: 'Spotify',       emoji: '🎵', color: '#1DB954', bgColor: 'rgba(29,185,84,0.12)' },
  { key: 'appleMusic',   label: 'Apple Music',   emoji: '🎵', color: '#FC3C44', bgColor: 'rgba(252,60,68,0.12)' },
  { key: 'youtubeMusic', label: 'YouTube Music', emoji: '▶️', color: '#FF4444', bgColor: 'rgba(255,68,68,0.12)' },
  { key: 'amazonMusic',  label: 'Amazon Music',  emoji: '🎵', color: '#00A8E0', bgColor: 'rgba(0,168,224,0.12)' },
  { key: 'tidal',        label: 'Tidal',         emoji: '🌊', color: '#E1E1E1', bgColor: 'rgba(255,255,255,0.08)' },
  { key: 'deezer',       label: 'Deezer',        emoji: '🎵', color: '#A238FF', bgColor: 'rgba(162,56,255,0.12)' },
  { key: 'soundcloud',   label: 'SoundCloud',    emoji: '☁️', color: '#FF5500', bgColor: 'rgba(255,85,0,0.12)' },
  { key: 'napster',      label: 'Napster',       emoji: '🎵', color: '#009BDE', bgColor: 'rgba(0,155,222,0.12)' },
  { key: 'pandora',      label: 'Pandora',       emoji: '🎵', color: '#3668FF', bgColor: 'rgba(54,104,255,0.12)' },
];

export default function PromoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<PromoLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getPromoLinkBySlug(slug).then(data => {
      if (data) {
        setLink(data);
        // Set page title
        document.title = `${data.title} — Jed Vik`;
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [slug]);

  const availablePlatforms = PLATFORMS.filter(p => link?.platforms[p.key]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#000' }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
          >
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
          </span>
          <p className="font-label text-[11px] uppercase tracking-widest text-white/30">Cargando...</p>
        </div>
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-8"
        style={{ background: '#000' }}
      >
        <div className="text-center">
          <p className="font-headline font-black text-white text-4xl mb-3">404</p>
          <p className="font-body text-white/40 text-sm mb-8">Este link no existe o fue eliminado.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-label font-bold text-[11px] uppercase tracking-widest text-white"
            style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
          >
            Ir a jedvik.com
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* Blurred background from cover */}
      {link.coverUrl && !imageError && (
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${link.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) saturate(1.4)',
            opacity: 0.25,
          }}
        />
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.95) 100%)' }}
      />

      {/* Coral glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(204,78,61,0.2) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-16 pb-16 max-w-lg mx-auto">

        {/* Album cover */}
        <div className="mb-8 relative">
          {/* Glow shadow behind cover */}
          <div
            className="absolute inset-0 rounded-[22px]"
            style={{ boxShadow: '0 20px 80px rgba(204,78,61,0.4)', transform: 'scale(0.9) translateY(10px)' }}
          />
          <div
            className="w-64 h-64 rounded-[22px] overflow-hidden relative"
            style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
          >
            {link.coverUrl && !imageError ? (
              <img
                src={link.coverUrl}
                alt={link.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1c1b1b, #0e0e0e)' }}
              >
                <span className="material-symbols-outlined text-white/20 text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
              </div>
            )}
          </div>
        </div>

        {/* Song info */}
        <div className="text-center mb-10 w-full">
          <h1
            className="font-headline font-black text-white uppercase leading-none mb-3"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', letterSpacing: '-0.04em' }}
          >
            {link.title}
          </h1>
          <p
            className="font-body font-medium text-base"
            style={{ color: '#CC4E3D' }}
          >
            {link.artist}
          </p>
        </div>

        {/* Listen now label */}
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 self-start">
          ESCUCHAR EN
        </p>

        {/* Featured CTA — first platform */}
        {availablePlatforms.length > 0 && (
          <a
            href={link.platforms[availablePlatforms[0].key]}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-label font-bold text-[13px] uppercase tracking-widest text-white mb-4 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)',
              boxShadow: '0 8px 32px rgba(204,78,61,0.4)',
            }}
          >
            <span className="text-lg">{availablePlatforms[0].emoji}</span>
            Escuchar en {availablePlatforms[0].label}
          </a>
        )}

        {/* All platform buttons */}
        <div className="w-full flex flex-col gap-3">
          {availablePlatforms.slice(1).map(platform => (
            <a
              key={platform.key}
              href={link.platforms[platform.key]}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group"
              style={{ background: platform.bgColor }}
            >
              <span className="text-xl flex-shrink-0">{platform.emoji}</span>
              <span
                className="flex-1 font-label font-bold text-[12px] uppercase tracking-wider"
                style={{ color: platform.color }}
              >
                {platform.label}
              </span>
              <span
                className="material-symbols-outlined text-[18px] opacity-50 group-hover:opacity-100 transition-opacity"
                style={{ color: platform.color }}
              >
                arrow_forward
              </span>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <a
            href="/"
            className="font-label text-[11px] uppercase tracking-[0.3em] text-white/20 hover:text-white/40 transition-colors"
          >
            jedvik.com
          </a>
        </div>
      </div>
    </div>
  );
}
