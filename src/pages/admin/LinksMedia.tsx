import { Plus, GripVertical, MoreVertical, Music, Instagram, Youtube, Twitter, ExternalLink } from 'lucide-react';
import styles from '../AdminDashboard.module.css';
import { useCMS } from '../../context/CMSContext';

const iconMap: Record<string, React.ReactNode> = {
  'Spotify': <Music size={16} />,
  'Instagram': <Instagram size={16} />,
  'YouTube': <Youtube size={16} />,
  'Twitter / X': <Twitter size={16} />
};

const LinksMedia = () => {
  const { data, updateData } = useCMS();

  const toggleLink = (id: string) => {
    const newLinks = data.links.map(l => l.id === id ? { ...l, active: !l.active } : l);
    updateData({ links: newLinks });
  };

  return (
    <main className={styles.mainContent}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Links y Contenido</h1>
        <button className={styles.actionBtn}>
          <Plus size={18} /> Nuevo Link
        </button>
      </header>

      <div className={styles.grid}>
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.cardHeader}>
            <ExternalLink size={18} />
            <span className={styles.cardTitle}>Tus Enlaces Principales</span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9rem' }}>
            Arrastra para reordenar cómo aparecerán en tu página pública. Activa o desactiva con el interruptor.
          </p>

          <div className={styles.linkList} style={{ gap: 'var(--spacing-md)' }}>
            {data.links.map((link) => (
              <div 
                key={link.id} 
                className={styles.linkItem} 
                style={{ 
                  opacity: link.active ? 1 : 0.5,
                  padding: 'var(--spacing-md)',
                  backgroundColor: 'var(--surface)'
                }}
              >
                <div className={styles.linkInfo} style={{ flex: 1 }}>
                  <GripVertical size={16} color="var(--text-muted)" style={{ cursor: 'grab' }} />
                  {iconMap[link.platform] || <ExternalLink size={16} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{link.platform}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {link.url || 'Sin configurar'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div 
                    className={styles.toggleSwitch} 
                    style={{ 
                      backgroundColor: link.active ? 'var(--primary)' : 'var(--surface-container-high)',
                      cursor: 'pointer' 
                    }}
                    onClick={() => toggleLink(link.id)}
                  >
                    <div 
                      className={styles.toggleKnob} 
                      style={{ 
                        transform: link.active ? 'translateX(20px)' : 'translateX(0)',
                        backgroundColor: link.active ? '#000' : 'var(--text-muted)'
                      }}
                    ></div>
                  </div>
                  <MoreVertical size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default LinksMedia;
