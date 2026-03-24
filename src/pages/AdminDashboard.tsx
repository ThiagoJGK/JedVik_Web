import { useState } from 'react';
import { 
  LayoutDashboard, 
  Link as LinkIcon, 
  Ticket, 
  Users, 
  Palette, 
  Settings, 
  Youtube,
  Plus,
  GripVertical,
  MoreVertical,
  Music,
  Instagram,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandCircle}></div>
          {!isSidebarCollapsed && <h2 className={styles.brandText}>JED VIK CMS</h2>}
        </div>

        <nav className={styles.navMenu}>
          <button className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={18} /> {!isSidebarCollapsed && "Panel de Control"}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'links' ? '' : ''}`}>
            <LinkIcon size={18} /> {!isSidebarCollapsed && "Links y Contenido"}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'tickets' ? '' : ''}`}>
            <Ticket size={18} /> {!isSidebarCollapsed && "Entradas y Shows"}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'fans' ? '' : ''}`}>
            <Users size={18} /> {!isSidebarCollapsed && "Base de Fans"}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'appearance' ? '' : ''}`}>
            <Palette size={18} /> {!isSidebarCollapsed && "Apariencia"}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'settings' ? '' : ''}`}>
            <Settings size={18} /> {!isSidebarCollapsed && "Ajustes"}
          </button>
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

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Vista General</h1>
          <button className={styles.actionBtn}>
            <Plus size={18} /> Nueva Campaña
          </button>
        </header>

        {/* Top Cards Grid */}
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Users size={18} />
              <span className={styles.cardTitle}>Total de Fans Registrados</span>
            </div>
            <div className={styles.statValue}>12,458</div>
            <div className={styles.statTrend}>+340 esta semana</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <LinkIcon size={18} />
              <span className={styles.cardTitle}>Clicks en Linktree</span>
            </div>
            <div className={styles.statValue}>84,201</div>
            <div className={styles.statTrend}>+12% vs el mes pasado</div>
          </div>
        </div>

        {/* Content Management Grid */}
        <div className={styles.grid}>
          {/* YouTube Embed Manager */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Youtube size={18} color="#ff0000" />
              <span className={styles.cardTitle}>Video Destacado</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>URL del Video de YouTube</label>
              <input type="text" className={styles.input} defaultValue="https://youtu.be/dQw4w9WgXcQ" title="URL del Video de YouTube" />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Autoplay activado</label>
              <div className={styles.toggleSwitch}>
                <div className={styles.toggleKnob}></div>
              </div>
            </div>

            <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}>
              Actualizar Video
            </button>
          </div>

          {/* Core Links Manager */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <LinkIcon size={18} />
              <span className={styles.cardTitle}>Links Activos</span>
            </div>
            
            <div className={styles.linkList}>
              <div className={styles.linkItem}>
                <div className={styles.linkInfo}>
                  <GripVertical size={16} color="var(--text-muted)" style={{cursor: 'grab'}} />
                  <Music size={16} />
                  <span>Perfil de Spotify</span>
                </div>
                <MoreVertical size={16} color="var(--text-muted)" style={{cursor: 'pointer'}} />
              </div>

              <div className={styles.linkItem}>
                <div className={styles.linkInfo}>
                  <GripVertical size={16} color="var(--text-muted)" style={{cursor: 'grab'}} />
                  <Instagram size={16} />
                  <span>Instagram</span>
                </div>
                <MoreVertical size={16} color="var(--text-muted)" style={{cursor: 'pointer'}} />
              </div>
              
              <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
                <Plus size={16} /> Añadir Link
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
