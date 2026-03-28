// @ts-ignore
import { Users, Link as LinkIcon, Youtube, Plus, GripVertical, MoreVertical, Music2 as Music, Instagram } from 'lucide-react';
import styles from '../AdminDashboard.module.css';
import { useCMS } from '../../context/CMSContext';

const Overview = () => {
  const { data, updateData } = useCMS();

  const handleVideoUpdate = () => {
    // Optimistic / local update simulation since we already bind inputs
    // In a real scenario we might have state for the form, but here let's trigger a toast or just let it auto-save
  };

  const activeLinksAccount = data.links.filter(l => l.active).length;

  return (
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
          {/* This would be real data if we count fan signups from Firestore */}
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
            <input 
              type="text" 
              className={styles.input} 
              value={data.featuredVideo.url}
              onChange={(e) => updateData({ featuredVideo: { ...data.featuredVideo, url: e.target.value } })}
              title="URL del Video de YouTube" 
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Autoplay activado</label>
            <div 
              className={styles.toggleSwitch} 
              style={{ backgroundColor: data.featuredVideo.autoplay ? 'var(--primary)' : 'var(--surface-container-high)', cursor: 'pointer' }}
              onClick={() => updateData({ featuredVideo: { ...data.featuredVideo, autoplay: !data.featuredVideo.autoplay } })}
            >
              <div className={styles.toggleKnob} style={{ transform: data.featuredVideo.autoplay ? 'translateX(20px)' : 'translateX(0)', backgroundColor: data.featuredVideo.autoplay ? '#000' : 'var(--text-muted)' }}></div>
            </div>
          </div>

          <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`} onClick={handleVideoUpdate}>
            Guardado Automático
          </button>
        </div>

        {/* Core Links Manager */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <LinkIcon size={18} />
            <span className={styles.cardTitle}>Links Activos ({activeLinksAccount})</span>
          </div>
          
          <div className={styles.linkList}>
            {data.links.filter(l => l.active).slice(0, 3).map((link) => (
              <div className={styles.linkItem} key={link.id}>
                <div className={styles.linkInfo}>
                  <GripVertical size={16} color="var(--text-muted)" style={{cursor: 'grab'}} />
                  <span>{link.platform}</span>
                </div>
                <MoreVertical size={16} color="var(--text-muted)" style={{cursor: 'pointer'}} />
              </div>
            ))}
            
            <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
              Gestionar Links
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Overview;
