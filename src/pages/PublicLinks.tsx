import { Music, Instagram, Video, ShoppingBag, Headphones, Youtube, Twitter, ExternalLink } from 'lucide-react';
import styles from './PublicLinks.module.css';
import { useCMS } from '../context/CMSContext';

const iconMap: Record<string, React.ReactNode> = {
  'Spotify': <Music size={20} />,
  'Instagram': <Instagram size={20} />,
  'YouTube': <Youtube size={20} />,
  'Twitter / X': <Twitter size={20} />
};

const PublicLinks = () => {
  const { data } = useCMS();

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : '';
  };
  const embedUrl = data.featuredVideo.url ? `https://www.youtube.com/embed/${getVideoId(data.featuredVideo.url)}${data.featuredVideo.autoplay ? '?autoplay=1' : ''}` : '';

  return (
    <div className={styles.container} style={{ '--primary': data.appearance.themeColor } as React.CSSProperties}>
      {/* Profile Section */}
      <header className={styles.profile}>
        <img 
          src="https://images.unsplash.com/photo-1549490349-8643362247b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
          alt="Jed Vik" 
          className={styles.profileImage} 
        />
        <h1 className={styles.name}>{data.profile.name}</h1>
        <p className={styles.bio}>{data.profile.bio}</p>
      </header>

      {/* Featured Video */}
      <section className={styles.videoSection}>
        {embedUrl ? (
          <div className={styles.videoContainer}>
            <iframe 
              className={styles.videoIframe}
              src={embedUrl} 
              title="Reproductor de video de YouTube" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className={styles.videoContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'var(--text-muted)' }}>
            Sin Video Destacado
          </div>
        )}
      </section>

      {/* Merch CTA */}
      <section className={styles.linksSection}>
        <a href="#merch" className={`${styles.linkButton} ${styles.merchButton}`}>
          <ShoppingBag className={styles.icon} size={20} />
          TIENDA OFICIAL DE MERCH
        </a>
      </section>

      {/* Streaming & Social Links */}
      <section className={styles.linksSection}>
        <h2 className={styles.sectionTitle}>Escucha y Conecta</h2>
        
        {data.links.filter(l => l.active).sort((a,b) => a.order - b.order).map(link => (
          <a key={link.id} href={link.url} className={`${styles.linkButton} glass`} target="_blank" rel="noreferrer">
            <span className={styles.icon}>{iconMap[link.platform] || <ExternalLink size={20} />}</span>
            {link.platform}
          </a>
        ))}
      </section>

      {/* Tour Dates */}
      <section className={styles.ticketsSection}>
        <h2 className={styles.sectionTitle}>Próximos Shows</h2>
        
        {data.shows.length > 0 ? (
          data.shows.map(show => (
            <div key={show.id} className={`${styles.ticketCard} glass`}>
              <div className={styles.ticketInfo}>
                <h3>{show.venue}</h3>
                <p>{show.date} • {show.city}</p>
              </div>
              <a href={show.url} target="_blank" rel="noreferrer" className={styles.buyButton}>ENTRADAS</a>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay fechas de gira anunciadas por ahora.</p>
        )}
      </section>
    </div>
  );
};

export default PublicLinks;
