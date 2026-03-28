import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';
import ImageUpload from '../../../components/admin/ImageUpload';

const AdminLanzamiento = () => {
  const { data, updateData } = useCMS();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    url: data.featuredVideo.url,
    title: 'Echos In The Void',
    artists: `${data.profile.name} feat. LUNA`,
    coverUrl: '',
  });

  const handleSave = async () => {
    setSaving(true);
    await updateData({ featuredVideo: { url: form.url, autoplay: data.featuredVideo.autoplay } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Lanzamiento</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">Track destacado en la card de la portada</p>
      </header>

      <div className="space-y-6 max-w-xl">
        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">URL del Track (Spotify / YouTube)</label>
          <input
            type="url"
            value={form.url}
            onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://open.spotify.com/..."
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Título del Track</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Echos In The Void"
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Artista(s)</label>
          <input
            type="text"
            value={form.artists}
            onChange={e => setForm(prev => ({ ...prev, artists: e.target.value }))}
            placeholder="Jed Vik feat. LUNA"
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <ImageUpload
          label="Portada del Álbum"
          currentImage={form.coverUrl}
          onUploadSuccess={(url) => setForm(prev => ({ ...prev, coverUrl: url }))}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
        >
          {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
           saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Guardar Lanzamiento'}
        </button>
      </div>
    </div>
  );
};

export default AdminLanzamiento;
