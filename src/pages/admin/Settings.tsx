import { Settings as SettingsIcon, Shield, LogOut } from 'lucide-react';
import styles from '../AdminDashboard.module.css';

const Settings = () => {
  return (
    <main className={styles.mainContent}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Configuración</h1>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <SettingsIcon size={18} />
            <span className={styles.cardTitle}>Ajustes de la Cuenta</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Correo Electrónico Administrador</label>
            <input type="email" className={styles.input} defaultValue="admin@jedvik.com" readOnly />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Este correo se usa para iniciar sesión y recuperar credenciales.</p>
          </div>

          <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}>
            Cambiar Correo
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Shield size={18} />
            <span className={styles.cardTitle}>Seguridad</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Contraseña Actual</label>
            <input type="password" className={styles.input} placeholder="••••••••" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nueva Contraseña</label>
            <input type="password" className={styles.input} />
          </div>

          <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
            Actualizar Contraseña
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: 'var(--spacing-xl)' }}>
        <button className={styles.actionBtn} style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)' }}>
          <LogOut size={18} /> Cerrar Sesión Segura
        </button>
      </div>
    </main>
  );
};

export default Settings;
