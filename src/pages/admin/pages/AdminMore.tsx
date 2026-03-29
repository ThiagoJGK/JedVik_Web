import { Link } from 'react-router-dom';

const MORE_ITEMS = [
  { to: '/admin/lanzamiento', label: 'Lanzamiento', icon: 'rocket_launch', desc: 'Configura el track destacado' },
  { to: '/admin/perfil',      label: 'Perfil',      icon: 'person',        desc: 'Tu bio, nombre e imagen' },
  { to: '/admin/merch',       label: 'Merch',       icon: 'apparel',       desc: 'Control de la tienda' },
];

const AdminMore = () => {
  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Más</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">Opciones adicionales de administración</p>
      </header>

      <div className="space-y-4">
        {MORE_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-5 p-6 bg-surface-container-high rounded-3xl hover:bg-surface-bright active:scale-[0.98] transition-all group border border-white/5"
          >
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight">{item.label}</h3>
              <p className="font-label text-[10px] text-white/30 uppercase tracking-widest">{item.desc}</p>
            </div>
            <span className="material-symbols-outlined text-white/10 group-hover:text-white transition-all group-hover:translate-x-1">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminMore;
