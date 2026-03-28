import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';
import ImageUpload from '../../../components/admin/ImageUpload';

const AdminPerfil = () => {
  const { data, updateData } = useCMS();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: data.profile.name, bio: data.profile.bio, imageUrl: data.profile.imageUrl });

  const handleSave = async () => {
    setSaving(true);
    await updateData({ profile: { ...data.profile, ...form } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Perfil</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">Información del artista visible en la portada</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Nombre del Artista</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="JED VIK"
              className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
            />
          </div>

          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Bio / Subtítulo</label>
            <input
              type="text"
              value={form.bio}
              onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Artista y Productor"
              className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
            />
          </div>

          <ImageUpload
            label="Foto de Perfil (Hero)"
            currentImage={form.imageUrl}
            onUploadSuccess={(url) => setForm(prev => ({ ...prev, imageUrl: url }))}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
          >
            {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
             saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Guardar Perfil'}
          </button>
        </div>

        {/* Live preview */}
        <div className="bg-surface-container rounded-3xl overflow-hidden relative h-64 lg:h-auto">
          {form.imageUrl ? (
            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover grayscale brightness-50 contrast-125" />
          ) : (
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-white/10 text-6xl">person</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-6 left-6">
            <p className="font-headline font-black text-3xl text-white tracking-tighter uppercase">{form.name || 'JED VIK'}</p>
            <p className="font-label text-[10px] tracking-widest text-white/50 uppercase">{form.bio || 'Bio aquí'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPerfil;
