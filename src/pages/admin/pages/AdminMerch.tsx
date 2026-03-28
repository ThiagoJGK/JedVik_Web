import { useState } from 'react';
import { useCMS } from '../../../context/CMSContext';

const AdminMerch = () => {
  const { data, updateData } = useCMS();
  const [shopUrl, setShopUrl] = useState(data.merch?.shopUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateData({ merch: { shopUrl } });
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

        <p className="font-label text-[10px] uppercase tracking-widest text-white/30 px-4">
          Compatible con Shopify, TiendaNube, Mercado Pago y cualquier URL pública.
        </p>

        <button
          onClick={handleSave}
          disabled={saving || !shopUrl}
          className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
        >
          {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
           saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Guardar URL de Tienda'}
        </button>
      </div>
    </div>
  );
};

export default AdminMerch;
