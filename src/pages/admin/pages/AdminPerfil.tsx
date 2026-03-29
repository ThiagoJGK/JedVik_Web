import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';
import ImageUpload from '../../../components/admin/ImageUpload';

const AdminPerfil = () => {
  const { data, updateData } = useCMS();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ 
    name: data.profile.name, 
    bio: data.profile.bio, 
    imageUrl: data.profile.imageUrl,
    silhouetteUrl: data.profile.silhouetteUrl || ''
  });

  const getAutoSilhouette = (url: string) => {
    if (!url.includes('cloudinary.com')) return url;
    // Cloudinary path: .../upload/v12345/...
    if (url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/e_background_removal,f_png/');
    }
    return url;
  };

  const handleMainImageUpload = (url: string) => {
    const autoSilhouette = getAutoSilhouette(url);
    setForm(prev => ({ 
      ...prev, 
      imageUrl: url,
      // Only auto-update silhouette if not already set or if it's currently an auto-generated one
      silhouetteUrl: (!prev.silhouetteUrl || prev.silhouetteUrl.includes('e_background_removal')) ? autoSilhouette : prev.silhouetteUrl
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateData({ 
      profile: { 
        ...data.profile, 
        name: form.name,
        bio: form.bio,
        imageUrl: form.imageUrl,
        silhouetteUrl: form.silhouetteUrl
      } 
    });
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
            label="Foto de Fondo (Main)"
            currentImage={form.imageUrl}
            onUploadSuccess={handleMainImageUpload}
          />

          <div className="bg-surface-container-highest/50 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 ml-4">Corte de Silueta (PNG)</label>
              <button 
                onClick={() => setForm(prev => ({ ...prev, silhouetteUrl: getAutoSilhouette(form.imageUrl) }))}
                className="font-label text-[9px] uppercase tracking-widest text-primary hover:underline transition-all"
              >
                Resetear a Recorte IA
              </button>
            </div>
            
            <ImageUpload
              label=""
              currentImage={form.silhouetteUrl}
              onUploadSuccess={(url) => setForm(prev => ({ ...prev, silhouetteUrl: url }))}
            />
            
            <p className="text-[9px] text-white/20 uppercase tracking-tighter px-4 leading-relaxed">
              El sistema intenta recortar el fondo automáticamente. Si el resultado es malo, sube aquí un PNG transparente hecho por ti.
            </p>
          </div>

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
        <div className="space-y-4">
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block ml-4">Vista Previa de Capas</label>
          <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl h-[450px] border border-white/10 group">
            {/* Capa 1: Fondo */}
            <div className="absolute inset-0">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Preview BG" className="w-full h-full object-cover grayscale brightness-[0.3] contrast-125 blur-[1px]" />
              ) : (
                <div className="w-full h-full bg-surface-container-high" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>

            {/* Capa 2: Texto */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <h2 className="font-headline font-black text-[12vw] tracking-tighter uppercase leading-[0.7] text-white/10 text-center">
                {form.name.split(' ')[0]}<br />
                {form.name.split(' ').slice(1).join(' ')}
              </h2>
            </div>

            {/* Capa 3: Silueta */}
            {form.silhouetteUrl && (
              <div className="absolute inset-0 flex justify-center items-end pointer-events-none">
                <img 
                  src={form.silhouetteUrl} 
                  alt="Preview Silhouette" 
                  className="h-[90%] w-auto object-contain object-bottom drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
            )}
            
            {/* Bio Overlay */}
            <div className="absolute bottom-10 left-0 right-0 text-center px-4">
              <p className="font-label text-[8px] tracking-[0.4em] text-white/40 uppercase mb-1 font-bold">
                {form.bio || 'Bio aquí'}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center uppercase tracking-widest italic">Simulación de profundidad 3D</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPerfil;
