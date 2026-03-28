import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';
import ImageUpload from '../../../components/admin/ImageUpload';

const AdminLanzamiento = () => {
  const { data, updateData } = useCMS();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [form, setForm] = useState({
    url: data.featuredVideo.url || '',
    title: data.featuredVideo.title || '',
    artists: data.featuredVideo.artists || '',
    coverUrl: data.featuredVideo.coverUrl || '',
    highlightColor: data.featuredVideo.highlightColor || '#CC4E3D',
  });

  const handleSave = async () => {
    setSaving(true);
    await updateData({ 
      featuredVideo: { 
        ...data.featuredVideo,
        url: form.url, 
        title: form.title,
        artists: form.artists,
        coverUrl: form.coverUrl,
        highlightColor: form.highlightColor
      } 
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Lanzamiento</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">Personaliza el track destacado de la portada</p>
      </header>

      <div className="space-y-6 max-w-xl pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUpload
            label="Portada del Álbum"
            currentImage={form.coverUrl}
            onUploadSuccess={(url) => setForm(prev => ({ ...prev, coverUrl: url }))}
          />
          
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Color del Glow</label>
            <div className="flex items-center gap-4 bg-surface-container-highest rounded-2xl px-4 py-3">
              <input
                type="color"
                value={form.highlightColor}
                onChange={e => setForm(prev => ({ ...prev, highlightColor: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
              />
              <input
                type="text"
                value={form.highlightColor}
                onChange={e => setForm(prev => ({ ...prev, highlightColor: e.target.value }))}
                className="bg-transparent border-none text-white font-label text-xs uppercase tracking-widest w-full outline-none"
              />
            </div>
            <p className="text-[9px] text-white/20 mt-2 ml-4 uppercase tracking-tighter">Este color generará el aura vibrante en la portada</p>
          </div>
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Título del Track</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título de la canción"
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Artista(s)</label>
          <input
            type="text"
            value={form.artists}
            onChange={e => setForm(prev => ({ ...prev, artists: e.target.value }))}
            placeholder="Jed Vik feat. ..."
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">URL del Track (Spotify / YouTube)</label>
          <input
            type="url"
            value={form.url}
            onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://..."
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-xl shadow-primary/10"
          style={{ background: `linear-gradient(135deg, ${form.highlightColor}, #000)` }}
        >
          {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
           saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Actualizar Lanzamiento'}
        </button>
      </div>
    </div>
  );
};

export default AdminLanzamiento;
