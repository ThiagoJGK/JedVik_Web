import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin',       label: 'Stats',         icon: 'leaderboard',       end: true },
  { to: '/admin/links', label: 'Links',         icon: 'link' },
  { to: '/admin/shows', label: 'Shows',         icon: 'confirmation_number' },
  { to: '/admin/fans',  label: 'Fans',          icon: 'groups' },
];

const BottomTabBar = () => (
  <nav className="flex md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/80 backdrop-blur-2xl rounded-full px-6 py-3 gap-8 shadow-[0_0_40px_rgba(204,78,61,0.12)]">
    {TABS.map(tab => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.end}
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-white/40 hover:text-white/70'}`
        }
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
              {tab.icon}
            </span>
            <span className="font-label text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
          </>
        )}
      </NavLink>
    ))}
    <NavLink
      to="/admin/more"
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-white/40 hover:text-white/70'}`
      }
    >
      <span className="material-symbols-outlined text-[22px]">more_horiz</span>
      <span className="font-label text-[8px] font-bold uppercase tracking-widest">Más</span>
    </NavLink>
  </nav>
);

export default BottomTabBar;
