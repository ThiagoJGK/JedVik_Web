import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin',           label: 'Stats',         icon: 'leaderboard', end: true },
  { to: '/admin/links',     label: 'Links',         icon: 'link' },
  { to: '/admin/shows',     label: 'Shows',         icon: 'confirmation_number' },
  { to: '/admin/perfil',    label: 'Perfil',        icon: 'person' },
  { to: '/admin/lanzamiento', label: 'Lanzamiento', icon: 'rocket_launch' },
  { to: '/admin/merch',     label: 'Merch',         icon: 'shopping_bag' },
  { to: '/admin/fans',      label: 'Fans',          icon: 'groups' },
];

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 h-screen fixed left-0 top-0 z-40 flex-col bg-black">
      {/* Brand */}
      <Link to="/" className="px-8 pt-8 pb-6 block group">
        <span className="font-headline font-black text-white text-lg tracking-tighter uppercase group-hover:text-primary transition-colors">Jed Vik</span>
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-white/30 mt-0.5 group-hover:text-white/50 transition-colors">Panel de Control</p>
      </Link>

      {/* Divisor */}
      <div className="mx-6 h-px bg-white/5 mb-4" />

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-4 py-3 rounded-full text-white font-headline font-bold text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(204,78,61,0.25)]'
                : 'flex items-center gap-3 px-4 py-3 rounded-full text-white/50 font-headline font-bold text-[11px] uppercase tracking-widest hover:bg-white/5 hover:text-white/80 transition-all'
            }
            style={({ isActive }) => isActive
              ? { background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }
              : {}
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 transition-all font-label text-[11px] uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Salir
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
