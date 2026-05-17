import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';

const AdminMerch = () => {
  const { data, updateData } = useCMS();
  const [shopUrl, setShopUrl] = useState(data.merch?.shopUrl ?? '');
  const [blurred, setBlurred] = useState(data.merch?.blurred ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateData({ merch: { shopUrl, blurred } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const domain = (() => { try { return new URL(shopUrl).hostname; } catch { return null; } })();

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Merch</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">
          URL de tu tienda externa — se abre al tocar cualquier producto o el ícono de carrito
        </p>
      </header>

      <div className="space-y-6 max-w-xl">
        {/* URL de la tienda */}
        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">URL de la Tienda</label>
          <input
            type="url"
            value={shopUrl}
            onChange={e => setShopUrl(e.target.value)}
            placeholder="https://tu-tienda.com"
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        {domain && (
          <div className="flex items-center gap-3 px-6 py-3 bg-surface-container rounded-2xl">
            <span className="material-symbols-outlined text-primary">store</span>
            <span className="font-body text-sm text-white/70">{domain}</span>
            <a href={shopUrl} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-lg">open_in_new</span>
            </a>
          </div>
        )}

        {/* ── Toggle: Modo Ofuscado ── */}
        <div className={`rounded-2xl border p-5 transition-all duration-300 ${blurred ? 'border-primary/40 bg-primary/5' : 'border-white/8 bg-white/[0.03]'}`}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="font-headline font-bold text-sm uppercase tracking-wide text-white">Modo Misterio</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-white/40 mt-1 leading-relaxed">
                Activa para ocultar el merch con blur. La gente verá que hay algo, pero no qué.
              </p>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={() => setBlurred(v => !v)}
              className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 ${blurred ? 'bg-primary' : 'bg-white/15'}`}
              style={{ background: blurred ? 'linear-gradient(135deg, #CC4E3D, #f68a2f)' : undefined }}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${blurred ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>

          {/* Preview del efecto */}
          {blurred && (
            <div className="mt-4 rounded-xl overflow-hidden relative h-20">
              <div className="absolute inset-0 bg-white/5 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md bg-black/20 rounded-xl">
                <span className="material-symbols-outlined text-3xl text-white/30 mr-2">lock</span>
                <p className="font-label text-[9px] uppercase tracking-[0.3em] text-white/30">Próximamente</p>
              </div>
            </div>
          )}
        </div>

        <p className="font-label text-[10px] uppercase tracking-widest text-white/30 px-4">
          Compatible con Shopify, TiendaNube, Mercado Pago y cualquier URL pública.
        </p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
        >
          {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
           saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
};

export default AdminMerch;
