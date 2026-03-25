import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Link as LinkIcon, 
  Ticket, 
  Users, 
  Palette, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Panel de Control' },
    { path: '/admin/links', icon: <LinkIcon size={18} />, label: 'Links y Contenido' },
    { path: '/admin/tickets', icon: <Ticket size={18} />, label: 'Entradas y Shows' },
    { path: '/admin/fans', icon: <Users size={18} />, label: 'Base de Fans' },
    { path: '/admin/appearance', icon: <Palette size={18} />, label: 'Apariencia' },
    { path: '/admin/settings', icon: <Settings size={18} />, label: 'Ajustes' },
  ];

  return (
    <div className={styles.adminContainer}>
      
      {/* Mobile Top Navbar */}
      <div className={styles.mobileNav}>
        <div className={styles.brand}>
          <div className={styles.brandCircle}></div>
          <h2 className={styles.brandText}>JED VIK CMS</h2>
        </div>
        <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile when menu is open */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`
        ${styles.sidebar} 
        ${isSidebarCollapsed ? styles.sidebarCollapsed : ''} 
        ${isMobileMenuOpen ? styles.mobileSidebarOpen : ''}
      `}>
        <div className={styles.brandDesktop}>
          <div className={styles.brandCircle}></div>
          <h2 className={styles.brandText}>JED VIK CMS</h2>
        </div>

        <nav className={styles.navMenu}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                <span className={styles.navText}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button 
            className={styles.toggleBtn} 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expandir" : "Contraer"}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area via Outlet */}
      <div className={styles.contentWrapper}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminDashboard;
;
