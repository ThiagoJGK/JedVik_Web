import { Users, Download } from 'lucide-react';
import styles from '../AdminDashboard.module.css';

const FanDatabase = () => {
  const fans = [
    { id: 1, name: 'Lucas Martinez', email: 'lucasm@gmail.com', date: '21 Mar 2026', origin: 'Linktree' },
    { id: 2, name: 'Sofia Rodriguez', email: 'sofiarod@hotmail.com', date: '20 Mar 2026', origin: 'Sorteo Instagram' },
    { id: 3, name: 'Martin Lopez', email: 'mlopez99@yahoo.com', date: '19 Mar 2026', origin: 'Website' },
    { id: 4, name: 'Julia Sanchez', email: 'juliasound@gmail.com', date: '19 Mar 2026', origin: 'Tickets' },
    { id: 5, name: 'Camila Perez', email: 'camiperez@gmail.com', date: '18 Mar 2026', origin: 'Linktree' },
  ];

  return (
    <main className={styles.mainContent}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Base de Datos de Fans</h1>
        <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`} style={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--border-ghost)' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </header>

      <div className={styles.grid}>
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.cardHeader}>
            <Users size={18} />
            <span className={styles.cardTitle}>Contactos Registrados ({fans.length})</span>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 'var(--spacing-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-ghost)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 'var(--spacing-sm)', fontWeight: 'normal' }}>Nombre</th>
                  <th style={{ padding: 'var(--spacing-sm)', fontWeight: 'normal' }}>Email</th>
                  <th style={{ padding: 'var(--spacing-sm)', fontWeight: 'normal' }}>Origen</th>
                  <th style={{ padding: 'var(--spacing-sm)', fontWeight: 'normal' }}>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {fans.map((fan) => (
                  <tr key={fan.id} style={{ borderBottom: '1px solid var(--border-ghost)' }}>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', color: 'var(--text-main)', fontWeight: 500 }}>{fan.name}</td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', color: 'var(--text-muted)' }}>{fan.email}</td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}>
                      <span style={{ backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                        {fan.origin}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', color: 'var(--text-muted)' }}>{fan.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FanDatabase;
