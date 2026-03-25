import { Palette, Info } from 'lucide-react';
import styles from '../AdminDashboard.module.css';
import { useCMS } from '../../context/CMSContext';

const Appearance = () => {
  const { data, updateData } = useCMS();

  return (
    <main className={styles.mainContent}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Apariencia</h1>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Palette size={18} />
            <span className={styles.cardTitle}>Diseño y Colores</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tema de Color</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              {['#00FF41', '#00E5FF', '#7000FF', '#FF0055'].map(color => (
                <div 
                  key={color}
                  onClick={() => updateData({ appearance: { themeColor: color } })}
                  style={{ 
                    width: 40, height: 40, borderRadius: '50%', backgroundColor: color, 
                    border: data.appearance.themeColor === color ? '2px solid #fff' : '2px solid transparent', 
                    cursor: 'pointer' 
                  }}
                ></div>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Selecciona el color de acento principal para tu página.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Logotipo o Foto de Perfil</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--surface-container-high)', border: '1px dashed var(--border-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>+</span>
              </div>
              <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}>Subir Imagen</button>
            </div>
          </div>

          <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
            Guardar Cambios
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Info size={18} />
            <span className={styles.cardTitle}>Información del Artista</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre a mostrar</label>
            <input 
              type="text" 
              className={styles.input} 
              value={data.profile.name}
              onChange={(e) => updateData({ profile: { ...data.profile, name: e.target.value } })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Biografía breve</label>
            <textarea 
              className={styles.input} 
              rows={4} 
              style={{ resize: 'vertical' }}
              value={data.profile.bio}
              onChange={(e) => updateData({ profile: { ...data.profile, bio: e.target.value } })}
            />
          </div>

          <button className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
            Guardar Modificación
          </button>
        </div>
      </div>
    </main>
  );
};

export default Appearance;

