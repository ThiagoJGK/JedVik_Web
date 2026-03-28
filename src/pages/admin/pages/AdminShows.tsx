import { useState } from 'react';
import { useCMS, type ShowItem } from '../../../context/CMSContext';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../../../firebase';

const db = getFirestore(app);

const blank = (): ShowItem => ({ id: crypto.randomUUID(), city: '', venue: '', date: '', url: '' });

const AdminShows = () => {
  const { data, updateData } = useCMS();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ShowItem>(blank());
  const [saving, setSaving] = useState(false);

  const save = async (shows: ShowItem[]) => {
    setSaving(true);
    await updateData({ shows });
    setSaving(false);
  };

  const addShow = async () => {
    if (!form.city || !form.venue || !form.date) return;
    const updated = [...data.shows, form];
    await save(updated);
    setForm(blank());
    setAdding(false);
  };

  const deleteShow = async (id: string) => {
    await save(data.shows.filter(s => s.id !== id));
  };

  const updateField = (id: string, field: keyof ShowItem, value: string) => {
    const updated = data.shows.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateData({ shows: updated });
  };

  return (
    <div>
      <header className="mb-10 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">
            Próximos Shows
          </h1>
          <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">
            Los cambios se reflejan en tiempo real en la portada
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={adding}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar Show
        </button>
      </header>

      <div className="space-y-2">
        {data.shows.map(show => (
          <div key={show.id} className="bg-surface-container-high rounded-2xl px-6 py-5 hover:bg-surface-bright transition-colors">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Date + Venue info */}
              <div className="flex items-center gap-4 md:w-1/3">
                <div>
                  <span className="font-label text-[10px] uppercase tracking-widest text-white/40 block">{show.date}</span>
                  <span className="font-headline font-black text-lg uppercase text-white">{show.city}</span>
                </div>
                <div className="h-6 w-px bg-white/10 hidden md:block" />
                <span className="font-headline font-bold text-sm text-white/70 uppercase">{show.venue}</span>
              </div>
              {/* URL input */}
              <div className="flex-1">
                <div className="flex items-center gap-2 bg-surface-container-highest rounded-full px-5 py-2">
                  <span className="material-symbols-outlined text-white/20 text-sm">link</span>
                  <input
                    type="url"
                    value={show.url}
                    onChange={e => updateField(show.id, 'url', e.target.value)}
                    onBlur={() => updateData({ shows: data.shows })}
                    placeholder="URL de tickets"
                    className="bg-transparent border-none focus:ring-0 text-[13px] text-white/70 font-body w-full outline-none placeholder:text-white/20"
                  />
                </div>
              </div>
              {/* Badge + Delete */}
              <div className="flex items-center gap-3 md:justify-end">
                {show.url && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-primary" style={{ background: 'rgba(204,78,61,0.1)' }}>
                    Activo
                  </span>
                )}
                <button onClick={() => deleteShow(show.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Inline add form */}
        {adding && (
          <div className="bg-surface-container-low rounded-2xl px-6 py-6 border border-white/5 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { field: 'date',  label: 'Fecha',    ph: 'Oct 24' },
                { field: 'city',  label: 'Ciudad',   ph: 'CDMX' },
                { field: 'venue', label: 'Venue',    ph: 'Foro Sol' },
                { field: 'url',   label: 'URL Tickets', ph: 'https://...' },
              ].map(f => (
                <div key={f.field}>
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-1 ml-4">{f.label}</label>
                  <input
                    value={form[f.field as keyof ShowItem]}
                    onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                    placeholder={f.ph}
                    className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={addShow}
                disabled={saving}
                className="px-8 py-3 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
              >
                {saving ? 'Guardando...' : '+ Confirmar'}
              </button>
              <button
                onClick={() => { setAdding(false); setForm(blank()); }}
                className="px-6 py-3 rounded-full bg-surface-container-highest font-headline font-bold text-[11px] uppercase tracking-widest text-white/50 hover:text-white hover:bg-surface-bright transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {data.shows.length === 0 && !adding && (
          <p className="text-center text-white/20 font-label text-sm uppercase tracking-widest py-16">
            No hay shows cargados
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminShows;
