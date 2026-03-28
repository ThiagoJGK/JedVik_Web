import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase';

const db = getFirestore(app);

interface Fan { email: string; createdAt: Timestamp; source: string; }

const AdminFans = () => {
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  useEffect(() => {
    getDocs(query(collection(db, 'fans'), orderBy('createdAt', 'desc')))
      .then(snap => setFans(snap.docs.map(d => d.data() as Fan)))
      .catch(e => console.warn('Fans load error', e))
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (ts: Timestamp) => {
    if (!ts?.toMillis) return '—';
    const diff = Math.floor((Date.now() - ts.toMillis()) / 60000);
    if (diff < 60) return `hace ${diff} min`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)} días`;
  };

  const exportCSV = () => {
    const csv = ['email,fecha,fuente', ...fans.map(f => `${f.email},${f.createdAt?.toDate().toISOString() ?? ''},${f.source ?? 'landing'}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'jed-vik-fans.csv';
    a.click();
  };

  const paged = fans.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(fans.length / PER_PAGE);

  return (
    <div>
      <header className="mb-10 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">
            Base de Fans
          </h1>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline font-black text-3xl text-white">{fans.length.toLocaleString('es')}</span>
            <span className="font-label text-[11px] uppercase tracking-widest text-white/40">registrados</span>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-high font-headline font-bold text-[11px] uppercase tracking-widest text-white hover:bg-surface-bright active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-white/60">download</span>
          Exportar CSV
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr] px-6 py-3">
            {['Email', 'Fecha de Registro', 'Fuente'].map(h => (
              <span key={h} className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{h}</span>
            ))}
          </div>

          <div className="space-y-px">
            {paged.map((f, i) => (
              <div
                key={i}
                className={`grid grid-cols-[2fr_1.5fr_1fr] px-6 py-4 items-center rounded-xl hover:bg-surface-bright transition-colors ${i % 2 === 0 ? 'bg-surface-container' : 'bg-surface'}`}
              >
                <span className="font-body text-sm text-white">{f.email}</span>
                <span className="font-body text-sm text-white/50">{f.createdAt ? timeAgo(f.createdAt) : '—'}</span>
                <div>
                  <span className="px-3 py-1 bg-surface-container-highest rounded-full font-label text-[10px] text-white/60 uppercase tracking-widest">
                    {f.source ?? 'landing'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {fans.length === 0 && (
            <p className="text-center text-white/20 font-label text-sm uppercase tracking-widest py-16">Sin fans registrados aún</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 px-2">
              <span className="font-label text-[11px] text-white/30 uppercase tracking-widest">
                Mostrando {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, fans.length)} de {fans.length}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-6 py-2 rounded-full border border-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-surface-container hover:text-white transition-all disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="px-6 py-2 rounded-full border border-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-surface-container hover:text-white transition-all disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminFans;
