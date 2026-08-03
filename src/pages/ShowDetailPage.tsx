import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCMS, getActiveTanda, type MediaItem } from '../context/CMSContext';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const parseShowDate = (dateStr: string) => {
  if (!dateStr) return { day: '', month: '', full: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '', month: '', full: dateStr };
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const month = months[d.getMonth()];
    const full = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' hs';
    return { day, month, full };
  } catch {
    return { day: '', month: '', full: dateStr };
  }
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : null;
};

const ShowDetailPage: React.FC = () => {
  const { showId } = useParams<{ showId: string }>();
  const { data, loading: cmsLoading } = useCMS();
  const show = data.shows.find(s => s.id === showId);

  // States
  const [confirmedSales, setConfirmedSales] = useState(0);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [ticketsCount, setTicketsCount] = useState<number>(1);
  const [bookingEmail, setBookingEmail] = useState('');
  const [attendees, setAttendees] = useState<{ name: string; dni: string }[]>([{ name: '', dni: '' }]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'transferencia' | 'mercadopago'>('transferencia');
  const [bookingStep, setBookingStep] = useState<'details' | 'success' | 'mp_redirect'>('details');
  const [createdBookingId, setCreatedBookingId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Listen to bookings stats for this show
  useEffect(() => {
    if (!showId) return;
    const q = query(collection(db, 'bookings'), where('showId', '==', showId));
    const unsubscribe = onSnapshot(q, (snap) => {
      let count = 0;
      snap.docs.forEach(d => {
        const b = d.data();
        if (b.status === 'confirmed' || b.paymentMethod === 'manual') {
          count += (b.ticketsCount || 1);
        }
      });
      setConfirmedSales(count);
    }, (err) => {
      console.warn("Error leyendo estadísticas del show:", err);
    });
    return () => unsubscribe();
  }, [showId]);

  // Default payment selection based on show configuration
  useEffect(() => {
    if (show) {
      if (show.paymentType === 'mercadopago') {
        setSelectedPaymentMethod('mercadopago');
      } else {
        setSelectedPaymentMethod('transferencia');
      }
    }
  }, [show]);

  if (cmsLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest text-white flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-surface-container-lowest text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-headline font-black text-4xl uppercase mb-4">Show No Encontrado</h1>
        <p className="font-body text-white/50 mb-6">El show que buscas no está disponible o ha sido retirado.</p>
        <Link to="/" className="px-6 py-3 rounded-full bg-primary text-black font-headline font-bold text-xs uppercase">
          Volver a Inicio
        </Link>
      </div>
    );
  }

  const totalOccupancy = confirmedSales + (show.manualSalesCount || 0);
  const capacity = show.totalCapacity || 100;
  const isSoldOut = totalOccupancy >= capacity;
  const activeTanda = getActiveTanda(show, totalOccupancy);
  const dateInfo = parseShowDate(show.date);
  const unitPrice = activeTanda.currentPrice;
  const totalPrice = unitPrice * ticketsCount;

  const handleTicketsCountChange = (count: number) => {
    setTicketsCount(count);
    setAttendees(prev => {
      const next = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push({ name: '', dni: '' });
        }
      } else if (count < prev.length) {
        next.splice(count);
      }
      return next;
    });
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show || bookingLoading || isSoldOut) return;

    if (!bookingEmail) {
      alert('Por favor ingresa tu email de contacto.');
      return;
    }

    for (const a of attendees) {
      if (!a.name.trim() || !a.dni.trim()) {
        alert('Por favor completa el Nombre y DNI de todos los asistentes.');
        return;
      }
    }

    setBookingLoading(true);
    try {
      const bookingId = `JED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      if (selectedPaymentMethod === 'transferencia') {
        await setDoc(doc(db, 'bookings', bookingId), {
          id: bookingId,
          showId: show.id,
          showName: show.name || 'Tour Jed Vik',
          email: bookingEmail,
          ticketsCount,
          attendees,
          tandaName: activeTanda.tandaName,
          totalPrice,
          paymentMethod: 'transferencia',
          status: 'pending',
          createdAt: serverTimestamp()
        });

        setCreatedBookingId(bookingId);
        setBookingStep('success');
      } else {
        // Mercado Pago API payment flow
        const response = await fetch('/api/mercadopago-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            showId: show.id,
            showName: show.name,
            email: bookingEmail,
            ticketsCount,
            unitPrice,
            attendees,
            originUrl: window.location.origin
          })
        });

        if (!response.ok) {
          throw new Error('Error al generar la pasarela de pago');
        }

        const resData = await response.json();
        setCreatedBookingId(resData.bookingId || bookingId);

        if (resData.init_point) {
          setMpInitPoint(resData.init_point);
          setBookingStep('mp_redirect');
        } else {
          alert('No se pudo inicializar Mercado Pago. Inténtalo nuevamente.');
        }
      }
    } catch (err) {
      console.error("Error al registrar reserva:", err);
      alert("Hubo un error al registrar tu reserva. Inténtalo nuevamente.");
    } finally {
      setBookingLoading(false);
    }
  };

  const getWhatsAppMessage = () => {
    if (!show) return '';
    const text = `¡Hola! Acabo de hacer la prereserva *${createdBookingId}* para el show de Jed Vik en *${show.city}*.

*Detalles:*
- *Reserva ID:* ${createdBookingId}
- *Show:* ${show.name} (${show.venue})
- *Entradas:* ${ticketsCount} (Tanda: ${activeTanda.tandaName})
- *Importe Total:* $${totalPrice.toLocaleString('es-AR')}
- *Email:* ${bookingEmail}

Adjunto por aquí mi comprobante de transferencia para confirmarla.`;
    return encodeURIComponent(text);
  };

  const whatsappPhone = show.whatsapp || '5491112345678';
  const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${getWhatsAppMessage()}`;

  return (
    <div className="min-h-screen bg-surface-container-lowest text-white flex flex-col font-body selection:bg-primary selection:text-black">
      
      {/* Background Glow Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 p-6 max-w-6xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="material-symbols-outlined text-white/50 group-hover:text-primary transition-colors">arrow_back</span>
          <span className="font-headline font-black text-xl tracking-tighter text-white">JED VIK</span>
        </Link>
        <span className="font-label text-[10px] uppercase tracking-widest text-primary px-3.5 py-1.5 bg-primary/10 rounded-full border border-primary/20">
          Entradas Oficiales
        </span>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Image & Media Gallery */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-container group">
            {show.imageUrl ? (
              <img src={show.imageUrl} alt={show.name} className="w-full h-80 md:h-[420px] object-cover" />
            ) : (
              <div className="w-full h-80 md:h-[420px] bg-gradient-to-br from-surface-container to-black flex items-center justify-center p-8 text-center">
                <div>
                  <span className="material-symbols-outlined text-primary text-6xl mb-3">confirmation_number</span>
                  <h2 className="font-headline font-black text-3xl uppercase">{show.name}</h2>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-6 md:p-8 flex flex-col justify-end">
              <span className="font-label text-xs uppercase tracking-[0.25em] text-primary font-bold mb-1">
                {show.city} • {show.venue}
              </span>
              <h1 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tight text-white">
                {show.name}
              </h1>
            </div>
          </div>

          {/* Media Gallery (Cloudinary Video HTML5 / YouTube / Photos) */}
          {show.media && show.media.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-headline font-bold text-lg uppercase tracking-wider text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">perm_media</span>
                Galería del Show
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {show.media.map(m => {
                  const ytEmbed = m.type === 'video' ? getYouTubeEmbedUrl(m.url) : null;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMedia(m)}
                      className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/10 cursor-pointer group hover:border-primary transition-all"
                    >
                      {m.type === 'video' ? (
                        ytEmbed ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <span className="material-symbols-outlined text-red-500 text-3xl group-hover:scale-110 transition-transform">play_circle</span>
                          </div>
                        ) : (
                          <video src={m.url} className="w-full h-full object-cover" muted />
                        )
                      ) : (
                        <img src={m.url} alt={m.caption || 'Galería'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl drop-shadow">
                          {m.type === 'video' ? 'play_arrow' : 'zoom_in'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Maps Location */}
          {show.gmapsUrl && (
            <div className="bg-surface-container rounded-3xl p-6 border border-white/5 space-y-3">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-white/80 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">map</span>
                Ubicación del Evento
              </h3>
              <p className="font-body text-xs text-white/60">{show.address} ({show.venue})</p>
              
              {show.gmapsUrl.includes('iframe') ? (
                <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10" dangerouslySetInnerHTML={{ __html: show.gmapsUrl }} />
              ) : (
                <a
                  href={show.gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full font-headline text-xs text-primary transition-all border border-primary/20"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Ver en Google Maps
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Ticket Buying Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-high rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 sticky top-8">
            
            {/* Tanda Header Badge */}
            <div className="bg-gradient-to-r from-primary/20 to-emerald-500/20 p-4 rounded-2xl border border-primary/30 flex justify-between items-center">
              <div>
                <span className="font-label text-[9px] uppercase tracking-widest text-primary font-black block">Tanda Vigente</span>
                <p className="font-headline font-black text-xl text-white uppercase">{activeTanda.tandaName}</p>
                {activeTanda.limitInfo && (
                  <p className="font-label text-[10px] text-white/60 mt-0.5">{activeTanda.limitInfo}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-headline font-black text-3xl text-primary">${activeTanda.currentPrice.toLocaleString('es-AR')}</p>
                <p className="font-label text-[9px] uppercase tracking-widest text-white/40">por entrada</p>
              </div>
            </div>

            {/* Event Summary Details */}
            <div className="space-y-3 border-y border-white/5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10 text-center">
                  <span className="font-headline font-black text-sm text-primary leading-none">{dateInfo.day}</span>
                  <span className="font-label text-[8px] uppercase tracking-widest text-white/60">{dateInfo.month}</span>
                </div>
                <div>
                  <p className="font-body text-sm font-bold text-white">{dateInfo.full}</p>
                  <p className="font-label text-xs text-white/50">{show.venue} — {show.city}</p>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            {isSoldOut ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <span className="font-headline font-black text-2xl uppercase text-red-400 block mb-1">¡ENTRADAS AGOTADAS!</span>
                <p className="font-label text-xs uppercase text-white/50">Este show ha alcanzado su capacidad máxima</p>
              </div>
            ) : (
              <button
                onClick={() => setBookingModalOpen(true)}
                className="w-full py-4 rounded-full font-headline font-black text-sm uppercase tracking-widest text-black shadow-[0_4px_25px_rgba(0,255,65,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00FF41, #00D637)' }}
              >
                <span className="material-symbols-outlined">confirmation_number</span>
                Reservar / Comprar Entradas
              </button>
            )}

            <p className="text-center font-label text-[10px] uppercase tracking-widest text-white/30">
              🔒 Compra y reserva 100% segura para Jed Vik Live
            </p>
          </div>
        </div>

      </main>

      {/* Media Lightbox Viewer Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
          <div className="max-w-4xl w-full max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMedia(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            
            {selectedMedia.type === 'video' ? (
              getYouTubeEmbedUrl(selectedMedia.url) ? (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
                  <iframe src={getYouTubeEmbedUrl(selectedMedia.url)!} className="w-full h-full" allowFullScreen />
                </div>
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="w-full max-h-[75vh] rounded-2xl" />
              )
            ) : (
              <img src={selectedMedia.url} alt="Media" className="w-full max-h-[75vh] object-contain rounded-2xl" />
            )}
          </div>
        </div>
      )}

      {/* Booking Checkout Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="bg-surface-container-high w-full max-w-lg rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <span className="font-label text-[9px] uppercase tracking-widest text-primary font-bold block">{activeTanda.tandaName}</span>
                <h3 className="font-headline font-black text-2xl uppercase text-white">{show.name}</h3>
              </div>
              <button onClick={() => setBookingModalOpen(false)} className="p-2 text-white/40 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {bookingStep === 'details' && (
              <form onSubmit={handleConfirmBooking} className="space-y-5">
                
                {/* Tickets Selector */}
                <div>
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/50 block mb-2">Cantidad de Entradas</label>
                  <div className="flex items-center gap-4 bg-surface-container-highest rounded-full p-2 w-fit">
                    <button
                      type="button"
                      onClick={() => handleTicketsCountChange(Math.max(1, ticketsCount - 1))}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-headline font-black text-lg px-4 text-white">{ticketsCount}</span>
                    <button
                      type="button"
                      onClick={() => handleTicketsCountChange(Math.min(10, ticketsCount + 1))}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/50 block mb-1.5 ml-2">Email de Contacto</label>
                  <input
                    type="email"
                    required
                    value={bookingEmail}
                    onChange={e => setBookingEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Attendees Info */}
                <div className="space-y-3">
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/50 block ml-2">Datos de los Asistentes</label>
                  {attendees.map((attendee, index) => (
                    <div key={index} className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
                      <p className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">Asistente #{index + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={attendee.name}
                          onChange={e => {
                            const val = e.target.value;
                            setAttendees(prev => prev.map((a, i) => i === index ? { ...a, name: val } : a));
                          }}
                          placeholder="Nombre Completo"
                          className="bg-surface-container-highest rounded-full px-4 py-2 text-xs text-white placeholder:text-white/20"
                        />
                        <input
                          type="text"
                          required
                          value={attendee.dni}
                          onChange={e => {
                            const val = e.target.value;
                            setAttendees(prev => prev.map((a, i) => i === index ? { ...a, dni: val } : a));
                          }}
                          placeholder="DNI"
                          className="bg-surface-container-highest rounded-full px-4 py-2 text-xs text-white placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Flow Selection */}
                {(show.paymentType === 'both' || !show.paymentType) && (
                  <div className="space-y-2 pt-2">
                    <label className="font-label text-[10px] uppercase tracking-widest text-white/50 block ml-2">Selecciona Método de Pago</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('transferencia')}
                        className={`p-3 rounded-2xl border font-headline font-bold text-xs uppercase transition-all flex flex-col items-center gap-1 ${
                          selectedPaymentMethod === 'transferencia' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container border-white/5 text-white/40'
                        }`}
                      >
                        <span className="material-symbols-outlined">account_balance</span>
                        Transferencia
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('mercadopago')}
                        className={`p-3 rounded-2xl border font-headline font-bold text-xs uppercase transition-all flex flex-col items-center gap-1 ${
                          selectedPaymentMethod === 'mercadopago' ? 'bg-blue-500/10 border-blue-400 text-blue-400' : 'bg-surface-container border-white/5 text-white/40'
                        }`}
                      >
                        <span className="material-symbols-outlined">credit_card</span>
                        Mercado Pago API
                      </button>
                    </div>
                  </div>
                )}

                {/* Total & Submit */}
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <div>
                    <span className="font-label text-[10px] uppercase text-white/40 block">Total a Pagar</span>
                    <span className="font-headline font-black text-2xl text-primary">${totalPrice.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="px-8 py-3.5 rounded-full font-headline font-black text-xs uppercase tracking-widest text-black shadow-lg disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #00FF41, #00D637)' }}
                  >
                    {bookingLoading ? 'Procesando...' : selectedPaymentMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar Prereserva'}
                  </button>
                </div>

              </form>
            )}

            {/* Success Screen: Transferencia Flow */}
            {bookingStep === 'success' && (
              <div className="space-y-6 text-center py-2">
                <div className="w-16 h-16 bg-primary/20 border border-primary text-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">check</span>
                </div>

                <div>
                  <h4 className="font-headline font-black text-2xl uppercase text-white">¡Prereserva Registrada!</h4>
                  <p className="font-label text-xs uppercase text-primary font-bold mt-1">ID: {createdBookingId}</p>
                </div>

                <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-left space-y-2">
                  <p className="font-label text-[10px] uppercase tracking-widest text-white/40">Datos para la Transferencia</p>
                  <p className="font-body text-sm font-bold text-white">Alias: <span className="text-primary">{show.alias || show.bankDetails?.alias || 'jedvik.musica'}</span></p>
                  {show.bankDetails?.cbu && <p className="font-body text-xs text-white/70">CBU: {show.bankDetails.cbu}</p>}
                  {show.bankDetails?.holderName && <p className="font-body text-xs text-white/70">Titular: {show.bankDetails.holderName}</p>}
                  <p className="font-headline font-black text-lg text-white mt-2">Monto Total: ${totalPrice.toLocaleString('es-AR')}</p>
                </div>

                <p className="font-body text-xs text-white/70">
                  Envíanos el comprobante de transferencia a WhatsApp para que Jed Vik valide el pago y confirme tu entrada.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-full font-headline font-bold text-xs uppercase tracking-widest bg-green-500 hover:bg-green-400 text-black flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Enviar Comprobante por WhatsApp
                </a>
              </div>
            )}

            {/* MP Redirect Screen */}
            {bookingStep === 'mp_redirect' && mpInitPoint && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-blue-500/20 border border-blue-400 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">credit_card</span>
                </div>
                <div>
                  <h4 className="font-headline font-black text-2xl uppercase text-white">Pasarela Mercado Pago</h4>
                  <p className="font-label text-xs uppercase text-white/50 mt-1">ID Reserva: {createdBookingId}</p>
                </div>
                <a
                  href={mpInitPoint}
                  className="w-full py-4 rounded-full font-headline font-black text-xs uppercase tracking-widest bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center gap-2 shadow-lg"
                >
                  Abrir Mercado Pago
                </a>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default ShowDetailPage;
