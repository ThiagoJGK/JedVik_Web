import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPromoLinks, deletePromoLink, type PromoLink
} from '../../../services/promoLinks';

export default function AdminPromoLinks() {
  const [links, setLinks] = useState<PromoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

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
          {/* New button */}
          <Link
            to="/admin/promo/new"
            className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg flex-shrink-0 mt-1"
            style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
          >
            <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          </Link>
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
              className="relative rounded-2xl overflow-hidden flex items-center gap-4 p-4"
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
    </div>
  );
}
