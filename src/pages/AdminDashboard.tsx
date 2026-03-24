import React, { useState } from 'react';
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
  Instagram
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandCircle}></div>
          <h2>JED VIK CMS</h2>
        </div>

        <nav className={styles.navMenu}>
          <button className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`${styles.navItem} ${activeTab === 'links' ? '' : ''}`}>
            <LinkIcon size={18} /> Links & Media
          </button>
          <button className={`${styles.navItem} ${activeTab === 'tickets' ? '' : ''}`}>
            <Ticket size={18} /> Tickets & Shows
          </button>
          <button className={`${styles.navItem} ${activeTab === 'fans' ? '' : ''}`}>
            <Users size={18} /> Fan Database
          </button>
          <button className={`${styles.navItem} ${activeTab === 'appearance' ? '' : ''}`}>
            <Palette size={18} /> Appearance
          </button>
          <button className={`${styles.navItem} ${activeTab === 'settings' ? '' : ''}`}>
            <Settings size={18} /> Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Dashboard Overview</h1>
          <button className={styles.actionBtn}>
            <Plus size={18} /> New Campaign
          </button>
        </header>

        {/* Top Cards Grid */}
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Users size={18} />
              <span className={styles.cardTitle}>Total Fans Registered</span>
            </div>
            <div className={styles.statValue}>12,458</div>
            <div className={styles.statTrend}>+340 this week</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <LinkIcon size={18} />
              <span className={styles.cardTitle}>Linktree Clicks</span>
            </div>
            <div className={styles.statValue}>84,201</div>
            <div className={styles.statTrend}>+12% vs last month</div>
          </div>
        </div>

        {/* Content Management Grid */}
        <div className={styles.grid}>
          {/* YouTube Embed Manager */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Youtube size={18} color="#ff0000" />
              <span className={styles.cardTitle}>Featured Video</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>YouTube Video URL</label>
              <input type="text" className={styles.input} defaultValue="https://youtu.be/dQw4w9WgXcQ" title="YouTube Video URL" />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Autoplay enabled</label>
              <div className={styles.toggleSwitch}>
                <div className={styles.toggleKnob}></div>
              </div>
            </div>

            <button className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}>
              Update Video
            </button>
          </div>

          {/* Core Links Manager */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <LinkIcon size={18} />
              <span className={styles.cardTitle}>Active Links</span>
            </div>
            
            <div className={styles.linkList}>
              <div className={styles.linkItem}>
                <div className={styles.linkInfo}>
                  <GripVertical size={16} color="var(--text-muted)" style={{cursor: 'grab'}} />
                  <Music size={16} />
                  <span>Spotify Profile</span>
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
                <Plus size={16} /> Add Link
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
