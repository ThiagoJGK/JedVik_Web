import React from 'react';
import { PlayCircle, Music, Instagram, Video, ShoppingBag, Music2, Headphones } from 'lucide-react';
import styles from './PublicLinks.module.css';

const PublicLinks = () => {
  return (
    <div className={styles.container}>
      {/* Profile Section */}
      <header className={styles.profile}>
        <img 
          src="https://images.unsplash.com/photo-1549490349-8643362247b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
          alt="Jed Vik" 
          className={styles.profileImage} 
        />
        <h1 className={styles.name}>JED VIK</h1>
        <p className={styles.bio}>Artist • Singer • Music Producer</p>
      </header>

      {/* Featured Video */}
      <section className={styles.videoSection}>
        <div className={styles.videoContainer}>
          <iframe 
            className={styles.videoIframe}
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=j2T6K9Qf9wL8" 
            title="YouTube video player" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Merch CTA */}
      <section className={styles.linksSection}>
        <a href="#merch" className={`${styles.linkButton} ${styles.merchButton}`}>
          <ShoppingBag className={styles.icon} size={20} />
          OFFICIAL MERCH STORE
        </a>
      </section>

      {/* Streaming & Social Links */}
      <section className={styles.linksSection}>
        <h2 className={styles.sectionTitle}>Listen & Connect</h2>
        <a href="#spotify" className={`${styles.linkButton} glass`}>
          <Music className={styles.icon} size={20} />
          Spotify
        </a>
        <a href="#apple" className={`${styles.linkButton} glass`}>
          <Headphones className={styles.icon} size={20} />
          Apple Music
        </a>
        <a href="#instagram" className={`${styles.linkButton} glass`}>
          <Instagram className={styles.icon} size={20} />
          Instagram
        </a>
        <a href="#tiktok" className={`${styles.linkButton} glass`}>
          <Video className={styles.icon} size={20} />
          TikTok
        </a>
      </section>

      {/* Tour Dates */}
      <section className={styles.ticketsSection}>
        <h2 className={styles.sectionTitle}>Upcoming Shows</h2>
        
        <div className={`${styles.ticketCard} glass`}>
          <div className={styles.ticketInfo}>
            <h3>Neon Nights Festival</h3>
            <p>Oct 24 • Buenos Aires, ARG</p>
          </div>
          <button className={styles.buyButton}>TICKETS</button>
        </div>
        
        <div className={`${styles.ticketCard} glass`}>
          <div className={styles.ticketInfo}>
            <h3>Club Underground</h3>
            <p>Nov 12 • Santiago, CHL</p>
          </div>
          <button className={styles.buyButton}>TICKETS</button>
        </div>

      </section>
    </div>
  );
};

export default PublicLinks;
