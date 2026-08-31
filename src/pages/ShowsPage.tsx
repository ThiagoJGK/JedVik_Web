import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCMS, type ShowItem, getActiveTanda } from '../context/CMSContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// ── Matrix scramble effect ──
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?';
const MatrixText = ({ text, className }: { text: string; className?: string }) => {
  const [display, setDisplay] = useState('');
  React.useEffect(() => {
    if (!text) return;
    const upper = text.toUpperCase();
    const letters = upper.split('');
    let iter = 0;
    const id = setInterval(() => {
      setDisplay(
        letters.map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor(iter)) return ch;
          return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }).join('')
      );
      iter += 0.3;
      if (iter > letters.length) { clearInterval(id); setDisplay(upper); }
    }, 45);
    return () => clearInterval(id);
  }, [text]);
  return <span className={className}>{display || text.toUpperCase()}</span>;
};

// ── Date parsing helper ──
const parseShowDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(' ');
      return {
        day: parts[0] || '--',
        month: parts[1] || '---',
        monthFull: 'Fecha por confirmar',
        year: parts[2] || '',
        monthYearKey: 'PRÓXIMAS FECHAS',
        time: '',
        full: dateStr,
        rawDate: new Date()
      };
    }
    const day = d.getDate().toString().padStart(2, '0');
    let month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    month = month.charAt(0).toUpperCase() + month.slice(1);
    const monthFull = d.toLocaleDateString('es-ES', { month: 'long' });
    const year = d.getFullYear().toString();
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const monthYearKey = `${monthFull.toUpperCase()} ${year}`;

    return {
      day,
      month,
      monthFull,
      year,
      monthYearKey,
      time,
      full: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ` a las ${time} hs`,
      rawDate: d
    };
  } catch {
    return {
      day: '--',
      month: '---',
      monthFull: 'Próximamente',
      year: '',
      monthYearKey: 'FECHAS DE GIRA',
      time: '',
      full: dateStr,
      rawDate: new Date()
    };
  }
};

// ── Google Maps URL Helpers ──
export const getGmapsDirectUrl = (show: { gmapsUrl?: string; venue?: string; address?: string; city?: string }) => {
  if (show.gmapsUrl && !show.gmapsUrl.includes('/maps/embed') && !show.gmapsUrl.includes('src=')) {
    return show.gmapsUrl;
  }
  const query = [show.venue, show.address, show.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Buenos Aires')}`;
};

export const getGmapsEmbedSrc = (input?: string, address?: string, venue?: string, city?: string) => {
  if (input && input.includes('src=')) {
    const match = input.match(/src=["']([^"']+)["']/);
    if (match && match[1]) return match[1];
  }
  if (input && input.includes('/maps/embed')) {
    return input;
  }
  const query = [venue, address, city].filter(Boolean).join(', ') || address || 'Buenos Aires';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
};

const ShowsPage: React.FC = () => {
  const { data, loading } = useCMS();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  // Booking Modal State
  const [selectedShow, setSelectedShow] = useState<ShowItem | null>(null);
  const [ticketsCount, setTicketsCount] = useState<number>(1);
  const [bookingEmail, setBookingEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerDni, setBuyerDni] = useState('');
  const [bookingStep, setBookingStep] = useState<'details' | 'success'>('details');
  const [createdBookingId, setCreatedBookingId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Available unique cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    data.shows.forEach(s => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [data.shows]);

  // Filtered shows
  const filteredShows = useMemo(() => {
    return data.shows.filter(show => {
      const matchesCity = selectedCity === 'all' || show.city?.toLowerCase() === selectedCity.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        show.name?.toLowerCase().includes(query) ||
        show.city?.toLowerCase().includes(query) ||
        show.venue?.toLowerCase().includes(query) ||
        show.address?.toLowerCase().includes(query);
      return matchesCity && matchesSearch;
    });
  }, [data.shows, selectedCity, searchQuery]);

  // Grouped shows by Month & Year
  const groupedShows = useMemo(() => {
    const groups: Record<string, ShowItem[]> = {};
    filteredShows.forEach(show => {
      const parsed = parseShowDate(show.date);
      const key = parsed.monthYearKey;
      if (!groups[key]) groups[key] = [];
      groups[key].push(show);
    });
    return groups;
  }, [filteredShows]);

  const showsHeading = data.tourConcept?.name && data.tourConcept.name !== 'TOUR 2026' 
    ? data.tourConcept.name 
    : 'SHOWS EN VIVO';
  
  const showsSubtitle = data.tourConcept?.subtitle && data.tourConcept.subtitle !== 'GIRA EN VIVO'
    ? data.tourConcept.subtitle
    : 'PRÓXIMAS FECHAS';

  const showsTagline = data.tourConcept?.tagline || 'Entradas oficiales, ubicaciones y detalles de cada presentación.';

  const openBookingModal = (show: ShowItem) => {
    setSelectedShow(show);
    setTicketsCount(1);
    setBookingEmail('');
    setBuyerName('');
    setBuyerDni('');
    setBookingStep('details');
    setCreatedBookingId('');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShow || bookingLoading) return;
    
    if (!bookingEmail.trim() || !buyerName.trim() || !buyerDni.trim()) {
      alert('Por favor completa todos los datos del comprador (Nombre, DNI y Email).');
      return;
    }
    
    setBookingLoading(true);
    try {
      const bookingId = `JED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const activeTanda = getActiveTanda(selectedShow);
      const totalPrice = activeTanda.currentPrice * ticketsCount;

      await setDoc(doc(db, 'bookings', bookingId), {
        id: bookingId,
        showId: selectedShow.id,
        showName: selectedShow.name || showsHeading,
        email: bookingEmail.trim().toLowerCase(),
        buyerName: buyerName.trim(),
        buyerDni: buyerDni.trim(),
        ticketsCount,
        attendees: [{ name: buyerName.trim(), dni: buyerDni.trim() }],
        tandaName: activeTanda.tandaName,
        totalPrice,
        paymentMethod: 'transferencia',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setCreatedBookingId(bookingId);
      setBookingStep('success');
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Hubo un error al registrar tu reserva. Inténtalo nuevamente.");
    } finally {
      setBookingLoading(false);
    }
  };

  const getWhatsAppMessage = () => {
    if (!selectedShow) return '';
    const dateParsed = parseShowDate(selectedShow.date);
    const activeTanda = getActiveTanda(selectedShow);
    const totalPrice = activeTanda.currentPrice * ticketsCount;
    const text = `¡Hola! Acabo de hacer la prereserva *${createdBookingId}* para el show de Jed Vik en *${selectedShow.city}*.

*Detalles:*
- *Reserva ID:* ${createdBookingId}
- *Titular:* ${buyerName} (DNI: ${buyerDni})
- *Show:* ${selectedShow.name || showsHeading} (${selectedShow.venue})
- *Fecha:* ${dateParsed.full}
- *Entradas:* ${ticketsCount} (Tanda: ${activeTanda.tandaName})
- *Importe Total:* $${totalPrice.toLocaleString('es-AR')}
- *Email:* ${bookingEmail}

Adjunto por aquí mi comprobante de transferencia para confirmarla.`;
    return encodeURIComponent(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-body selection:bg-primary selection:text-black overflow-x-hidden pb-32">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] blur-[150px] opacity-25 rounded-full"
          style={{ backgroundColor: data.featuredVideo?.highlightColor || '#CC4E3D' }}
        />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-black/70 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 group text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="font-headline font-black text-sm tracking-widest uppercase">Inicio</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              En Vivo
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 md:pt-12">
        
        {/* Desktop Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Shows Info & Filters (4 cols in desktop) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Shows Header Card */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-surface-container/60 backdrop-blur-2xl p-6 md:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">confirmation_number</span>
                <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary font-black">
                  {showsSubtitle}
                </span>
              </div>

              <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-white leading-none">
                <MatrixText text={showsHeading} />
              </h1>

              <p className="font-body text-xs text-white/60 leading-relaxed">
                {showsTagline}
              </p>
            </div>

            {/* Filter & Search Box - Only if multiple cities or shows */}
            {(cities.length > 1 || data.shows.length > 2) && (
              <div className="rounded-3xl border border-white/10 bg-surface-container/40 backdrop-blur-xl p-5 space-y-4 shadow-lg">
                {/* Search input */}
                {data.shows.length > 2 && (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-[18px]">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar ciudad, sala o fecha..."
                      className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                )}

                {/* City selector chips */}
                {cities.length > 1 && (
                  <div>
                    <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mb-2 px-1">Filtrar por ciudad</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCity('all')}
                        className={`px-3.5 py-1.5 rounded-full font-headline font-bold text-[10px] uppercase tracking-wider transition-all ${
                          selectedCity === 'all'
                            ? 'bg-primary text-black font-black shadow-[0_0_15px_rgba(204,78,61,0.4)]'
                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        Todas ({data.shows.length})
                      </button>

                      {cities.map(city => {
                        const count = data.shows.filter(s => s.city?.toLowerCase() === city.toLowerCase()).length;
                        return (
                          <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`px-3.5 py-1.5 rounded-full font-headline font-bold text-[10px] uppercase tracking-wider transition-all ${
                              selectedCity.toLowerCase() === city.toLowerCase()
                                ? 'bg-primary text-black font-black shadow-[0_0_15px_rgba(204,78,61,0.4)]'
                                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            {city} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Shows Timeline Grouped by Month (8 cols in desktop) */}
          <div className="lg:col-span-8 space-y-8">
            
            {filteredShows.length === 0 ? (
              <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center space-y-4">
                <span className="material-symbols-outlined text-5xl text-white/20">event_busy</span>
                <h3 className="font-headline font-black text-xl uppercase text-white">No se encontraron fechas</h3>
                <p className="font-body text-xs text-white/40 max-w-sm mx-auto">
                  No hay shows que coincidan con los filtros seleccionados.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCity('all'); }}
                  className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-headline text-xs uppercase"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              Object.keys(groupedShows).map((monthKey) => {
                const showsInMonth = groupedShows[monthKey];

                return (
                  <section key={monthKey} className="space-y-4">
                    {/* Month Section Header */}
                    <div className="flex items-center gap-3 px-2">
                      <h2 className="font-headline font-black text-lg md:text-xl uppercase tracking-widest text-primary">
                        {monthKey}
                      </h2>
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="font-label text-[10px] uppercase tracking-widest text-white/30">
                        {showsInMonth.length} {showsInMonth.length === 1 ? 'Show' : 'Shows'}
                      </span>
                    </div>

                    {/* Shows List in this Month */}
                    <div className="space-y-3">
                      {showsInMonth.map((show, idx) => {
                        const dateParsed = parseShowDate(show.date);
                        const activeTanda = getActiveTanda(show);
                        const isClosest = idx === 0;

                        return (
                          <div
                            key={show.id}
                            className="group relative rounded-3xl border border-white/10 bg-surface-container/60 hover:bg-surface-container/90 transition-all duration-300 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 overflow-hidden shadow-xl"
                          >
                            {/* Hover Ambient Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* Left: Date + Info */}
                            <div className="flex items-center gap-5">
                              {/* Date Block */}
                              <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center">
                                <span className="font-headline font-black text-2xl leading-none text-white">{dateParsed.day}</span>
                                <span className="font-label text-[9px] tracking-widest uppercase text-primary font-bold">{dateParsed.month}</span>
                              </div>

                              {/* Title & Venue */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-headline font-black text-lg md:text-xl uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                                    {show.city}
                                  </h3>
                                  {isClosest && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-label text-[8px] uppercase tracking-widest font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      Próximo Show
                                    </span>
                                  )}
                                </div>

                                <p className="font-body text-xs text-white/70 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                                  <span className="font-bold text-white">{show.venue}</span>
                                  {show.address && <span className="text-white/40 hidden md:inline">({show.address})</span>}
                                </p>

                                <div className="flex items-center gap-3 pt-0.5">
                                  <span className="font-label text-[9px] uppercase tracking-wider text-white/50">
                                    {activeTanda.tandaName}: <strong className="text-white">${activeTanda.currentPrice.toLocaleString('es-AR')}</strong>
                                  </span>
                                  {activeTanda.limitInfo && (
                                    <span className="font-label text-[8px] uppercase tracking-wider text-primary/80 hidden sm:inline">
                                      • {activeTanda.limitInfo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <a
                                href={getGmapsDirectUrl(show)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5"
                                title="Ver ubicación en Google Maps"
                              >
                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                              </a>

                              <button
                                onClick={() => openBookingModal(show)}
                                className="px-6 py-3 rounded-full font-headline font-bold text-[10px] tracking-[0.2em] text-white uppercase active:scale-95 transition-all shadow-lg flex items-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
                              >
                                <span>{show.url ? 'Comprar Tickets' : 'Reservar'}</span>
                                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}

          </div>

        </div>

      </main>

      {/* ── Mobile Floating Bottom HUD ── */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-12 items-center z-[70] bg-[#1a1a1a]/80 backdrop-blur-2xl w-auto rounded-full px-8 py-3 shadow-[0_0_40px_rgba(204,78,61,0.2)] md:hidden border border-white/10">
        <Link to="/" className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all">
          <span className="material-symbols-outlined">audiotrack</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MUSIC</span>
        </Link>
        <Link to="/shows" className="flex flex-col items-center justify-center text-[#CC4E3D]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">SHOWS</span>
        </Link>
        <Link to="/#merch" className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all">
          <span className="material-symbols-outlined">apparel</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MERCH</span>
        </Link>
      </nav>

      {/* ── Modal de Reserva Simplificado ── */}
      {selectedShow && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }}
        >
          <div className="bg-surface-container-high w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 flex flex-col shadow-[0_0_50px_rgba(204,78,61,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <header className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black/25">
              <div>
                <span className="font-headline font-black text-xs tracking-[0.2em] text-primary uppercase">Detalles del Show</span>
                <h3 className="font-headline font-black text-xl text-white uppercase">{selectedShow.name || showsHeading}</h3>
              </div>
              <button 
                onClick={() => setSelectedShow(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1: Show Info & Map */}
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline font-black text-3xl text-white uppercase tracking-tight leading-none">{selectedShow.city}</h2>
                    <p className="font-label text-xs text-white/40 uppercase tracking-widest mt-2">{selectedShow.venue}</p>
                  </div>

                  <div className="space-y-3 font-body text-sm text-white/80">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">calendar_today</span>
                      <div>
                        <p className="font-bold text-white uppercase">Fecha y Hora</p>
                        <p className="text-white/60 text-xs">{parseShowDate(selectedShow.date).full}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">pin_drop</span>
                      <div>
                        <p className="font-bold text-white uppercase">Dirección</p>
                        <p className="text-white/60 text-xs">{selectedShow.address || 'Se informará próximamente'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">payments</span>
                      <div>
                        <p className="font-bold text-white uppercase">Tanda Activa</p>
                        <p className="text-white/60 text-xs">{getActiveTanda(selectedShow).tandaName} — ${getActiveTanda(selectedShow).currentPrice.toLocaleString('es-AR')} ARS</p>
                      </div>
                    </div>
                  </div>

                  {/* Maps Embed */}
                  {(selectedShow.address || selectedShow.venue) && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black/40">
                      <iframe
                        src={getGmapsEmbedSrc(selectedShow.gmapsUrl, selectedShow.address, selectedShow.venue, selectedShow.city)}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </div>

                {/* Column 2: Booking Form or Success */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                  {selectedShow.url ? (
                    <div className="text-center py-10 space-y-6">
                      <span className="material-symbols-outlined text-6xl text-primary animate-pulse">confirmation_number</span>
                      <div className="space-y-2">
                        <h4 className="font-headline font-black text-xl text-white uppercase tracking-tight">Venta de Entradas Externa</h4>
                        <p className="font-body text-xs text-white/50 px-4">Este show gestiona la venta oficial de entradas a través de una plataforma externa.</p>
                      </div>
                      <a
                        href={selectedShow.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block w-full py-4 rounded-full font-headline font-bold text-xs tracking-[0.2em] text-white uppercase text-center active:scale-95 transition-all shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
                      >
                        Comprar Entradas
                      </a>
                    </div>
                  ) : bookingStep === 'details' ? (
                    <form onSubmit={handleConfirmBooking} className="space-y-5">
                      <h3 className="font-headline font-bold text-lg text-white uppercase tracking-tight border-b border-white/5 pb-2">Reservar Entradas</h3>
                      
                      {/* Selector de personas */}
                      <div>
                        <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2">Cantidad de Entradas</label>
                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setTicketsCount(num)}
                              className={`w-9 h-9 rounded-full font-headline font-bold text-xs flex items-center justify-center transition-all ${
                                ticketsCount === num 
                                  ? 'bg-primary text-black font-black scale-110 shadow-[0_0_15px_rgba(204,78,61,0.4)]' 
                                  : 'bg-white/5 text-white hover:bg-white/10'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Datos del Comprador */}
                      <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <p className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">Datos del Titular / Quien Paga</p>
                        
                        <div>
                          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-1">Nombre y Apellido</label>
                          <input
                            type="text"
                            required
                            value={buyerName}
                            onChange={e => setBuyerName(e.target.value)}
                            placeholder="Nombre y Apellido completo"
                            className="w-full bg-surface-container-highest rounded-full px-5 py-2.5 text-xs font-body text-white border-none outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div>
                          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-1">DNI / Documento</label>
                          <input
                            type="text"
                            required
                            value={buyerDni}
                            onChange={e => setBuyerDni(e.target.value)}
                            placeholder="Número de DNI"
                            className="w-full bg-surface-container-highest rounded-full px-5 py-2.5 text-xs font-body text-white border-none outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div>
                          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-1">Email de Contacto</label>
                          <input
                            type="email"
                            required
                            value={bookingEmail}
                            onChange={e => setBookingEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="w-full bg-surface-container-highest rounded-full px-5 py-2.5 text-xs font-body text-white border-none outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>

                      {/* Total */}
                      <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                        <span className="font-label text-[10px] uppercase tracking-widest text-white/40">Total a Transferir</span>
                        <span className="font-headline font-black text-xl text-primary">
                          ${(getActiveTanda(selectedShow).currentPrice * ticketsCount).toLocaleString('es-AR')} ARS
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="w-full py-3.5 rounded-full font-headline font-bold text-[10px] tracking-[0.2em] text-white uppercase active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
                      >
                        {bookingLoading ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                            Procesando...
                          </>
                        ) : 'Confirmar Pre-Reserva'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="space-y-2">
                        <span className="material-symbols-outlined text-5xl text-green-400">check_circle</span>
                        <h4 className="font-headline font-black text-2xl text-white uppercase tracking-tight">¡Pre-Reserva Registrada!</h4>
                        <p className="font-label text-[10px] text-primary font-bold tracking-widest uppercase">ID: {createdBookingId}</p>
                      </div>

                      <div className="bg-black/40 rounded-xl p-5 border border-white/5 space-y-3 text-left">
                        <p className="font-label text-[9px] uppercase tracking-widest text-white/40 text-center border-b border-white/5 pb-2">Instrucciones de Pago</p>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/50">Monto total:</span>
                          <span className="font-headline font-black text-white text-sm">
                            ${(getActiveTanda(selectedShow).currentPrice * ticketsCount).toLocaleString('es-AR')} ARS
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/50">Alias CBU/CVU:</span>
                          <span className="font-mono text-white font-bold select-all bg-white/5 px-2 py-0.5 rounded text-[11px]">
                            {selectedShow.alias || 'jedvik.musica'}
                          </span>
                        </div>

                        <p className="text-[10px] text-white/40 text-center pt-2">Realiza la transferencia por el total y envía el comprobante por WhatsApp para validar tu entrada.</p>
                      </div>

                      <a
                        href={`https://wa.me/${selectedShow.whatsapp || '5491112345678'}?text=${getWhatsAppMessage()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#20ba56] rounded-full font-headline font-bold text-xs tracking-[0.2em] text-white uppercase active:scale-95 transition-all shadow-[0_4px_25px_rgba(37,211,102,0.3)]"
                      >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                        Enviar Comprobante
                      </a>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ShowsPage;
