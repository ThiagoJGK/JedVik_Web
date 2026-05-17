import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCMS } from '../context/CMSContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PLATFORM_DATA: Record<string, { icon: string; color: string }> = {
  Spotify: { icon: 'spotify', color: '1DB954' },
  Instagram: { icon: 'instagram', color: 'E4405F' },
  YouTube: { icon: 'youtube', color: 'FF0000' },
  'YouTube Music': { icon: 'youtubemusic', color: 'FF0000' },
  TikTok: { icon: 'tiktok', color: 'FFFFFF' },
  'Apple Music': { icon: 'applemusic', color: 'FA243C' },
  SoundCloud: { icon: 'soundcloud', color: 'FF3300' },
  'Twitter/X': { icon: 'x', color: 'FFFFFF' },
  Facebook: { icon: 'facebook', color: '1877F2' },
  Otro: { icon: 'link', color: 'CCCCCC' },
};

// ── Cloudinary URL optimizer: auto WebP + compresión + resize ──
const cloudinaryUrl = (url: string, width = 1200): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

// ── Matrix scramble effect ──
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?';
const MatrixText = ({ text, className }: { text: string; className?: string }) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!text) return;
    const upper = text.toUpperCase();
    const letters = upper.split('');
    let iter = 0;
    const id = setInterval(() => {
      setDisplay(
        letters.map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor(iter)) return ch;
          return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }).join('')
      );
      iter += 0.3;
      if (iter > letters.length) { clearInterval(id); setDisplay(upper); }
    }, 45);
    return () => clearInterval(id);
  }, [text]);
  return <span className={className}>{display || text.toUpperCase()}</span>;
};

// ── Fondo: grilla de cuadrados en CSS (sin canvas, cero JS) ──
const GridBackground = () => (
  <div
    className="fixed inset-0 z-0 pointer-events-none"
    style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
      backgroundSize: '48px 48px',
    }}
  />
);

// ── Plasma blob — sigue el mouse con lerp, solo GPU transform ──
const PlasmaBlob = () => {
  const blobRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -600, y: -600 });
  const tgt = useRef({ x: -600, y: -600 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => { tgt.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    let raf: number;
    const loop = () => {
      pos.current.x += (tgt.current.x - pos.current.x) * 0.055;
      pos.current.y += (tgt.current.y - pos.current.y) * 0.055;
      if (blobRef.current)
        blobRef.current.style.transform = `translate(${pos.current.x - 220}px, ${pos.current.y - 220}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      ref={blobRef}
      className="fixed top-0 left-0 w-[520px] h-[520px] pointer-events-none z-[50] hidden md:block"
      style={{
        background: 'radial-gradient(circle at center, rgba(220,95,70,0.65) 0%, rgba(204,78,61,0.3) 38%, transparent 68%)',
        filter: 'blur(50px)',
        willChange: 'transform',
        mixBlendMode: 'screen',
      }}
    />
  );
};

// ── Título con efecto matrix al entrar en viewport ──
const MatrixTitle = ({ children, className }: { children: string; className?: string }) => {
  const [go, setGo] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGo(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <span ref={ref} className={className}>{go ? <MatrixText text={children} /> : children}</span>;
};

// ── Pantalla de Carga ──
const LoadingScreen = ({ loading }: { loading: boolean }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (!loading) {
      const t1 = setTimeout(() => setFading(true), 100);
      const t2 = setTimeout(() => setVisible(false), 900);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [loading]);
  if (!visible) return null;
  return (
    <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-700 ease-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="text-center select-none px-8">
        <p className="font-label text-[9px] tracking-[0.5em] uppercase text-white/20 mb-8 animate-pulse">Cargando</p>
        <h1 className="font-headline font-black text-[13vw] tracking-tighter uppercase leading-none text-white whitespace-nowrap">
          <MatrixText text="JED VIK" />
        </h1>
        <div className="mt-10 w-32 h-px mx-auto bg-white/30 animate-pulse" />
      </div>
    </div>
  );
};

// ── Índice de secciones (solo desktop) ──
const SECTIONS = [
  { id: 'inicio',      label: 'Inicio'      },
  { id: 'plataformas', label: 'Plataformas' },
  { id: 'shows',       label: 'Shows'       },
  { id: 'merch',       label: 'Merch'       },
  { id: 'comunidad',   label: 'Comunidad'   },
];
const SectionNav = () => {
  const [active, setActive] = useState('inicio');
  useEffect(() => {
    const check = () => {
      if (window.scrollY < window.innerHeight * 0.7) { setActive('inicio'); return; }
      const pivot = window.scrollY + window.innerHeight * 0.35;
      let current = 'inicio';
      SECTIONS.filter(s => s.id !== 'inicio').forEach(s => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= pivot) current = s.id;
      });
      setActive(current);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => window.removeEventListener('scroll', check);
  }, []);
  const scrollTo = (id: string) => {
    if (id === 'inicio') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <nav className="hidden md:flex fixed right-8 top-1/2 -translate-y-1/2 z-[70] flex-col items-end gap-6">
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`group flex items-center gap-3 transition-all duration-300 ${active === s.id ? 'opacity-100' : 'opacity-25 hover:opacity-70'}`}
        >
          <span className={`font-label text-[8px] tracking-[0.2em] uppercase text-white transition-all duration-300 ${active === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {s.label}
          </span>
          <div className={`rounded-full transition-all duration-300 ${active === s.id ? 'w-6 h-[2px] bg-primary' : 'w-[5px] h-[5px] bg-white'}`} />
        </button>
      ))}
    </nav>
  );
};

const PublicLinks = () => {
  const { data, loading } = useCMS();

  // Navbar visibility on scroll
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > window.innerHeight * 0.5);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Community signup state
  const [email, setEmail] = useState('');
  const [signupState, setSignupState] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');

  useState(() => {
    const trackVisit = async () => {
      const hasVisited = sessionStorage.getItem('jv_visited');
      if (hasVisited) return;

      try {
        await addDoc(collection(db, 'analytics'), {
          type: 'visit',
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          platform: navigator.platform
        });
        sessionStorage.setItem('jv_visited', 'true');
      } catch (e) {
        console.warn('Analytics error:', e);
      }
    };
    trackVisit();
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setSignupState('loading');
    try {
      // Check if already exists
      const q = query(collection(db, 'fans'), where('email', '==', email.toLowerCase()));
      const existing = await getDocs(q);
      if (!existing.empty) {
        setSignupState('exists');
        return;
      }
      await addDoc(collection(db, 'fans'), {
        email: email.toLowerCase(),
        source: 'landing',
        createdAt: serverTimestamp(),
      });
      setSignupState('success');
    } catch {
      setSignupState('error');
    }
  };

  const handlePlayClick = () => {
    if (data.featuredVideo.url) {
      window.open(data.featuredVideo.url, '_blank');
    }
  };

  const handleMerchClick = (e: React.MouseEvent) => {
    if (!data.merch?.shopUrl) {
      e.preventDefault();
      alert('Tienda próximamente disponible.');
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body selection:bg-primary selection:text-on-primary-fixed overflow-x-hidden">
      <LoadingScreen loading={loading} />
      <GridBackground />
      <PlasmaBlob />
      <SectionNav />
      {/* TopAppBar — oculto sobre el hero, visible al hacer scroll */}
      <nav
        className={`fixed top-0 w-full z-[70] backdrop-blur-xl flex justify-center items-center px-8 py-4 transition-all duration-300 ${
          navVisible
            ? 'bg-black/70 opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <span className="font-headline font-black tracking-tighter text-white uppercase text-2xl">{data.profile.name}</span>
      </nav>

      <main id="inicio" className="relative pb-32 z-[60]">
        {/* ── Hero ── */}

        {/* MÓVIL: imagen arriba + nombre debajo */}
        <section className="md:hidden w-full flex flex-col bg-black">
          {/* Imagen con gradiente alto y suave — el nombre flota dentro del degradado */}
          <div className="relative w-full h-[72vh]">
            {loading ? (
              <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-black animate-pulse" />
            ) : data.profile.imageUrl ? (
              <img
                className="w-full h-full object-cover object-top"
                alt={data.profile.name}
                src={cloudinaryUrl(data.profile.imageUrl, 800)}
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-black" />
            )}
            {/* Degradado alto y suave: cubre 70% desde abajo */}
            <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-gradient-to-t from-black via-black/75 to-transparent" />
            {/* Nombre dentro del degradado */}
            <div className="absolute bottom-4 left-0 right-0 px-6">
              <h2 className="font-headline font-black text-[20vw] tracking-tighter uppercase leading-[0.9] text-white w-full text-center drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
                <MatrixText text={data.profile.name} />
              </h2>
            </div>
          </div>
        </section>

        {/* DESKTOP: h-screen con imagen + nombre + release card integrada */}
        <section className="hidden md:block relative h-screen w-full overflow-hidden bg-black">
          {/* Imagen a color completo, scrollea con la página */}
          {!loading && data.profile.imageUrl && (
            <img
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
              src={cloudinaryUrl(data.profile.imageUrl, 1920)}
              fetchPriority="high"
            />
          )}
          {/* Gradient base bajo la silueta */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Nombre del artista + intro breve — DETRÁS de la silueta (z-1) */}
          <div className="absolute top-[18%] left-0 right-0 px-16 flex items-start" style={{zIndex: 1}}>
            <h2 className="font-headline font-black text-[10vw] tracking-tighter uppercase leading-none text-white drop-shadow-[0_4px_60px_rgba(0,0,0,0.7)] select-none flex-shrink-0">
              <MatrixText text={data.profile.name} />
            </h2>
            <div className="ml-[4vw] mr-auto pt-[2.2vw] text-left flex-shrink-0">
              <p className="font-label text-xs md:text-base lg:text-lg tracking-[0.25em] uppercase text-white/60 whitespace-nowrap">
                <MatrixText text={data.profile.bio?.replace('.', '') || 'ARTISTA & PRODUCTOR'} />
              </p>
              <p className="font-label text-[9px] md:text-xs tracking-[0.3em] uppercase text-white/25 mt-2 whitespace-nowrap">
                ↓ SCROLL PARA DESCUBRIR
              </p>
            </div>
          </div>

          {/* Silhouette si existe — DELANTE del texto (z-2) */}
          {data.profile.silhouetteUrl && (
            <div className="absolute inset-0 pointer-events-none" style={{zIndex: 2}}>
              <img
                src={data.profile.silhouetteUrl}
                alt={data.profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Gradient SOBRE la silueta para funde inferior (z-3) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" style={{zIndex: 3}} />

          {/* Release card compacta horizontal — fijada al fondo del hero (z-4) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-12" style={{zIndex: 4}}>
            <div
              className="bg-surface-container/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-5 flex items-center gap-5 relative overflow-hidden shadow-2xl"
            >
              {/* Glow adaptativo */}
              <div
                className="absolute -top-16 -left-16 w-48 h-48 rounded-full blur-[60px] opacity-30 pointer-events-none"
                style={{ backgroundColor: data.featuredVideo.highlightColor || '#CC4E3D' }}
              />
              {/* Cover */}
              <div
                className="w-20 h-20 flex-shrink-0 rounded-[14px] overflow-hidden relative z-10"
                style={{ boxShadow: `0 0 30px ${data.featuredVideo.highlightColor || '#CC4E3D'}55` }}
              >
                {data.featuredVideo.coverUrl && (
                  <img
                    className="w-full h-full object-cover"
                    alt="Latest Release"
                    src={cloudinaryUrl(data.featuredVideo.coverUrl, 200)}
                  />
                )}
              </div>
              {/* Info + barra */}
              <div className="flex-1 min-w-0 relative z-10">
                <span className="font-label text-[9px] tracking-widest font-bold uppercase block mb-0.5" style={{ color: data.featuredVideo.highlightColor || '#CC4E3D' }}>Último Lanzamiento</span>
                <h3 className="font-headline font-black text-xl uppercase tracking-tight text-white truncate">{data.featuredVideo.title || 'NUEVO SENCILLO'}</h3>
                <p className="text-white/50 text-sm truncate mt-0.5">{data.featuredVideo.artists || data.profile.name}</p>
                <div className="mt-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '33%', animation: 'pulse-bar 4s ease-in-out infinite alternate', background: `linear-gradient(90deg, ${data.featuredVideo.highlightColor || '#CC4E3D'}, transparent)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-label text-white/30 tracking-widest mt-1">
                  <span>01:24</span>
                  <span>{data.featuredVideo.duration || '04:12'}</span>
                </div>
              </div>
              {/* Botón play */}
              <button
                onClick={handlePlayClick}
                className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 relative z-10 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${data.featuredVideo.highlightColor || '#CC4E3D'}, ${data.featuredVideo.highlightColor2 || '#000'})` }}
              >
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Priority Release (solo móvil) ── */}
        <section className="md:hidden px-6 mt-6 relative z-20">
          <div className="bg-surface-container rounded-xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Adaptive Glow */}
            <div 
              className="absolute -top-24 -left-24 w-64 h-64 blur-[80px] rounded-full opacity-40 transition-colors duration-500"
              style={{ backgroundColor: data.featuredVideo.highlightColor || '#CC4E3D' }}
            />
            
            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div 
                className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-500"
                style={{ 
                  boxShadow: `0 0 40px ${data.featuredVideo.highlightColor}44`,
                  border: `1px solid ${data.featuredVideo.highlightColor}22`
                }}
              >
                {data.featuredVideo.coverUrl && (
                  <img className="w-full h-full object-cover" alt="Latest Release"
                    src={cloudinaryUrl(data.featuredVideo.coverUrl, 256)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label text-[10px] tracking-widest font-bold uppercase" style={{ color: data.featuredVideo.highlightColor || '#CC4E3D' }}>Último Lanzamiento</span>
                <h3 className="font-headline text-2xl font-black leading-tight uppercase">
                  {data.featuredVideo.title || 'ECHOS IN THE VOID'}
                </h3>
                <p className="text-on-surface-variant text-sm">
                  {data.featuredVideo.artists || `${data.profile.name} feat. LUNA`}
                </p>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="space-y-4 relative z-10 mb-8">
              <div className="h-1 bg-surface-variant rounded-full w-full overflow-hidden">
                <div 
                  className="h-full rounded-full animate-[progress_8s_ease-in-out_infinite]" 
                  style={{ 
                    width: '33%', 
                    animation: 'pulse-bar 4s ease-in-out infinite alternate',
                    background: `linear-gradient(90deg, ${data.featuredVideo.highlightColor || '#CC4E3D'}, #000)`
                  }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-label text-white/40 tracking-widest">
                <span>01:24</span>
                <span>{data.featuredVideo.duration || '04:12'}</span>
              </div>
            </div>

            <button
              onClick={handlePlayClick}
              className="w-full py-5 rounded-full flex items-center justify-center gap-3 font-headline font-bold text-sm tracking-wider uppercase active:scale-95 transition-transform hover:opacity-90 shadow-lg text-white"
              style={{ background: `linear-gradient(135deg, ${data.featuredVideo.highlightColor || '#CC4E3D'}, ${data.featuredVideo.highlightColor2 || '#000000'})` }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Escuchar el Nuevo Sencillo
            </button>
          </div>
        </section>

        {/* Bio Overlay Removed as per request */}

        {/* ── Links Centralizados ── */}
        <section id="plataformas" className="px-6 mt-16 md:max-w-2xl md:mx-auto">
          <h4 className="font-label text-[10px] text-center tracking-[0.4em] text-white/30 uppercase mb-8">
            <MatrixTitle>Conecta con el sonido</MatrixTitle>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.links.filter(l => l.active).sort((a, b) => a.order - b.order).map(link => {
            const platformInfo = PLATFORM_DATA[link.platform] || PLATFORM_DATA.Otro;

            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-6 py-5 bg-surface-container-high rounded-3xl hover:bg-surface-bright active:scale-[0.98] transition-all group border border-white/5"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-full bg-black/40 p-2.5 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <img
                      src={`https://cdn.simpleicons.org/${platformInfo.icon}/${platformInfo.color}`}
                      alt={link.platform}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-headline font-bold text-sm tracking-[0.15em] uppercase">{link.platform}</span>
                </div>
                <span className="material-symbols-outlined text-white/10 group-hover:text-white transition-all group-hover:translate-x-1">arrow_forward</span>
              </a>
            );
          })}
          </div>
        </section>

        {/* ── Shows ── */}
        <section id="shows" className="mt-20 md:max-w-2xl md:mx-auto">
          <div className="px-8 mb-8 flex justify-between items-end">
            <h2 className="font-headline font-black text-4xl tracking-tighter uppercase">
              <MatrixTitle>Proximos Shows</MatrixTitle>
            </h2>
          </div>

          <div className="px-6 flex flex-col gap-3">
            {data.shows.length > 0 ? (
              data.shows.map(show => {
                const parts = show.date.split(' ');
                const day = parts[0] || '--';
                const mon = parts[1] || '---';
                return (
                  <div key={show.id} className="group relative rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 p-5 flex items-center gap-5 overflow-hidden">
                    {/* Glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Date block */}
                    <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                      <span className="font-headline font-black text-2xl leading-none" style={{ color: '#ff8e7d' }}>{day}</span>
                      <span className="font-label text-[8px] tracking-widest uppercase" style={{ color: 'rgba(255,142,125,0.6)' }}>{mon}</span>
                    </div>
                    {/* Info */}
                    <div className="relative flex-1 min-w-0">
                      <p className="font-headline font-bold text-base tracking-wide uppercase truncate">{show.venue}</p>
                      <p className="font-label text-xs text-white/40 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] opacity-60">location_on</span>
                        {show.city}
                      </p>
                    </div>
                    {/* CTA */}
                    <div className="relative flex-shrink-0">
                      {show.url && show.url !== '#' ? (
                        <a
                          href={show.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 bg-primary-gradient rounded-full font-headline font-bold text-[9px] tracking-widest uppercase active:scale-95 transition-all shadow-[0_0_20px_rgba(204,78,61,0.3)]"
                        >
                          Entradas
                        </a>
                      ) : (
                        <span className="px-5 py-2.5 border border-white/10 rounded-full font-headline font-bold text-[9px] tracking-widest uppercase text-white/25">
                          Pronto
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-8 py-6 text-center text-white/30 font-body text-sm">No hay fechas de gira anunciadas.</p>
            )}
          </div>
        </section>

        {/* ── Merch Carousel ── */}
        <section id="merch" className="mt-20 md:max-w-2xl md:mx-auto">
          <div className="flex justify-between items-center px-8 mb-8">
            <h2 className="font-headline font-black text-3xl md:text-4xl tracking-tighter uppercase whitespace-nowrap">
              <MatrixTitle>Merch Oficial</MatrixTitle>
            </h2>
            <a
              href={data.merch?.shopUrl || '#'}
              onClick={!data.merch?.shopUrl ? handleMerchClick : undefined}
              target={data.merch?.shopUrl ? '_blank' : undefined}
              rel="noreferrer"
              className="font-label text-[10px] text-primary font-bold tracking-[0.2em] hover:opacity-70 transition-opacity uppercase"
            >
              Ver más
            </a>
          </div>
          {/* Carousel con fades en los laterales */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-8 w-12 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-8 w-12 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            <div className="flex gap-4 overflow-x-auto pb-8 pl-8 pr-8 snap-x scrollbar-hide">
              {[
                { name: 'Monolith Hoodie', price: '$85.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOFpocouiaf1-Tz8gQblk3JuYJ8VVQSrYjh3J8gxett3rAz-WZ4HyJbnkMkhNfjKjKQh9CSw8j4-AqTDWRVZb8VooY5awPjoXJc22esgFm4DkUvXH9k2Jt5hoMimXon8wI-YSBjU8NHEg8OLileoyxM0l5h-MuKlo-j-GTWz8Cca_FB8CqiWmld9F7QGtuM5J-cgP5pgZPuisOal1sDWZM2RH0m_DIi4sTDcWky-w7a7boq2GWEsDU1HFsbtWgYbJDIfFDU4W2_r0' },
                { name: 'Echos Tee', price: '$45.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQPXWL5U2MD7siZXAwTn80cbOQuXCh1nWw9_DYo-J0PyRVh33xScLF_8wBWfRUeHX0fEISPcv-nm4wtJWVcPIO03dEpAv7iBssFOI27JiCny-RGJzBLYjnP7d-jxZQ7TleFszkOqQ6v6VTAXBuEmiPhi770KjL5WAgr4JAVWYIBu17-ggHxfwLg6rJjemnSY31gj0lgIf-TRvwozqzBR9eiEmYXgC3Dr_iRL-XoajS8Hka98c0GqzGLPZxzPPTNI2D2K0gZ_zQ4vU' },
                { name: 'Echos Vinyl LE', price: '$38.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6FdOrTBO0dTyoFjdrm5bk-MElx72J1jsB_cyoMsbzErvG-N3A5yoL3vuym3GUwjBvG_Zd02uat-0YtSDNRrNJmPPrI-40OM07767O_TF-eNC0ZeOd32_W7z1Q0RtVO3tNr_NT4Ju_7OjhRaVuWpqQdULcJcgoK1sCKQGzt67bJuK2ZoaYVMO9AeYAsvzkcZw3vAPVTzsD9wAaT1TuX_o2abAWtG3TFJjDC5bro65DeilpUcVWVK25kGj-j19TzIK0aeQ9ngFKr8o' },
              ].map(item => (
                <a
                  key={item.name}
                  href={data.merch?.shopUrl || '#'}
                  onClick={!data.merch?.shopUrl ? handleMerchClick : undefined}
                  target={data.merch?.shopUrl ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex-shrink-0 w-56 snap-start group cursor-pointer"
                >
                  <div className="aspect-[4/5] bg-surface-container rounded-xl overflow-hidden mb-4 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} src={item.img} />
                  </div>
                  <h5 className="font-headline font-bold text-sm tracking-wider uppercase mb-1">{item.name}</h5>
                  <p className="font-label text-xs text-primary font-bold">{item.price}</p>
                </a>
              ))}
            </div>
            {/* Overlay blur cuando merch está ofuscado */}
            {data.merch?.blurred && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.25)' }}>
                <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>lock</span>
                <p className="font-label text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Próximamente</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Community Signup ── */}
        <section id="comunidad" className="px-6 mt-20 md:max-w-2xl md:mx-auto">
          <div className={`rounded-xl p-10 text-center relative overflow-hidden transition-all duration-500 ${signupState === 'success' ? 'bg-green-900/80' : 'bg-primary-gradient'}`}>
            <div className="absolute inset-0 bg-black/10" />

            {signupState === 'success' ? (
              <div className="relative z-10">
                <span className="material-symbols-outlined text-6xl text-green-400 mb-4 block">check_circle</span>
                <h2 className="font-headline font-black text-3xl tracking-tighter uppercase leading-none text-white">¡Ya eres parte!</h2>
                <p className="text-sm text-white/70 mt-4">Te avisaremos sobre preventas y contenido exclusivo.</p>
              </div>
            ) : (
              <>
                <h2 className="relative z-10 font-headline font-black text-3xl tracking-tighter uppercase mb-4 leading-none">
                  Únete a la comunidad de {data.profile.name}
                </h2>
                <p className="relative z-10 text-sm font-medium text-black/80 mb-8 px-4">
                  Acceso exclusivo a preventas, demos inéditos y contenido detrás de escena.
                </p>

                {signupState === 'exists' && (
                  <p className="relative z-10 text-xs font-bold text-black/60 mb-4 bg-black/10 rounded-full px-4 py-2 inline-block">
                    ¡Ya eres parte de la comunidad!
                  </p>
                )}
                {signupState === 'error' && (
                  <p className="relative z-10 text-xs font-bold text-red-900 mb-4 bg-red-200/30 rounded-full px-4 py-2 inline-block">
                    Algo salió mal. Intenta nuevamente.
                  </p>
                )}

                <form onSubmit={handleSignup} className="relative z-10 flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setSignupState('idle'); }}
                    required
                    className="w-full bg-black/20 border-none rounded-full py-4 px-8 text-white placeholder:text-black/40 font-headline font-bold text-xs tracking-widest focus:ring-2 focus:ring-white/20 uppercase outline-none"
                    placeholder="TU CORREO ELECTRÓNICO"
                  />
                  <button
                    type="submit"
                    disabled={signupState === 'loading'}
                    className="w-full bg-black text-white py-4 rounded-full font-headline font-bold text-xs tracking-[0.2em] uppercase active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signupState === 'loading' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Enviando...
                      </>
                    ) : 'Unirse'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-black w-full py-20 border-t border-white/5 flex flex-col items-center gap-8 max-w-7xl mx-auto px-8">
        <div className="flex gap-8">
          {data.links.filter(l => l.active).slice(0, 3).map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium tracking-[0.2em] uppercase text-white/40 hover:text-[#CC4E3D] transition-colors font-label"
            >
              {link.platform}
            </a>
          ))}
        </div>
        <p className="font-label text-xs font-medium tracking-[0.2em] uppercase text-white/40">
          © 2024 {data.profile.name}. Todos los derechos reservados.
        </p>
      </footer>

      {/* ── Bottom NavBar ── */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-12 items-center z-[70] bg-[#1a1a1a]/80 backdrop-blur-2xl w-auto rounded-full px-8 py-3 shadow-[0_0_40px_rgba(204,78,61,0.15)] md:hidden">
        <a href="#" className="flex flex-col items-center justify-center text-[#CC4E3D]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>audiotrack</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MUSIC</span>
        </a>
        <Link
          to="/proximamente"
          className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">confirmation_number</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">SHOWS</span>
        </Link>
        <Link
          to="/proximamente"
          className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">apparel</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MERCH</span>
        </Link>
      </nav>
    </div>
  );
};

export default PublicLinks;
