import { Ticket, Plus, Calendar, MapPin, ExternalLink, Trash2 } from 'lucide-react';
import styles from '../AdminDashboard.module.css';
import { useCMS } from '../../context/CMSContext';

const TicketsShows = () => {
  const { data, updateData } = useCMS();

  return (
    <main className={styles.mainContent}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Entradas y Shows</h1>
        <button className={styles.actionBtn}>
          <Plus size={18} /> Nueva Fecha
        </button>
      </header>

      <div className={styles.grid}>
        {/* Formulario para agregar show */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Calendar size={18} />
            <span className={styles.cardTitle}>Añadir Nuevo Show</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ciudad</label>
            <input type="text" className={styles.input} placeholder="Ej: Madrid, España" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Lugar / Venue</label>
            <input type="text" className={styles.input} placeholder="Ej: WiZink Center" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Fecha</label>
            <input type="date" className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Link de Entradas</label>
            <input type="url" className={styles.input} placeholder="https://..." />
          </div>

          <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
            Guardar Fecha
          </button>
        </div>

        {/* Listado de shows */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Ticket size={18} />
            <span className={styles.cardTitle}>Próximas Fechas</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {data.shows.map((show) => (
              <div 
                key={show.id} 
                style={{ 
                  backgroundColor: 'var(--surface-container-high)', 
                  padding: 'var(--spacing-md)', 
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--primary)" /> {show.city}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {show.venue} • {show.date}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button 
                    title="Ver Venta"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button 
                    title="Eliminar"
                    onClick={() => updateData({ shows: data.shows.filter(s => s.id !== show.id) })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {data.shows.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'var(--spacing-lg) 0' }}>
                No hay shows programados actualmente.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default TicketsShows;
