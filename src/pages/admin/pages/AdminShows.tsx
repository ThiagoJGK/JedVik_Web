import { useState, useEffect } from 'react';
import { useCMS, type ShowItem, type TandaItem, type MediaItem, getActiveTanda } from '../../../context/CMSContext';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

interface Attendee {
  name: string;
  dni: string;
}

interface Booking {
  id: string;
  showId: string;
  showName: string;
  email: string;
  ticketsCount: number;
  attendees: Attendee[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentMethod?: 'transferencia' | 'mercadopago' | 'manual';
  origin?: 'web' | 'manual';
  createdAt: Timestamp;
}

const blank = (): ShowItem => ({
  id: crypto.randomUUID(),
  name: '',
  city: '',
  venue: '',
  date: '',
  address: '',
  gmapsUrl: '',
  price: 15000,
  alias: '',
  whatsapp: '',
  url: '',
  paymentType: 'both',
  totalCapacity: 100,
  manualSalesCount: 0,
  tandas: [],
  media: [],
  bankDetails: { alias: '', cbu: '', bankName: '', holderName: '' }
});

const AdminShows = () => {
  const { data, updateData } = useCMS();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShowItem>(blank());
  const [saving, setSaving] = useState(false);

  // States for Bookings Modal
  const [selectedShow, setSelectedShow] = useState<ShowItem | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // State for Manual Sale Modal
  const [manualSaleShow, setManualSaleShow] = useState<ShowItem | null>(null);
  const [manualTickets, setManualTickets] = useState(1);
  const [manualNote, setManualNote] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // State for Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Stats per show
  const [showsStats, setShowsStats] = useState<Record<string, { tickets: number; confirmed: number; totalEarnings: number }>>({});

  // Fetch stats for all shows
  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const stats: Record<string, { tickets: number; confirmed: number; totalEarnings: number }> = {};
      snap.docs.forEach(docSnap => {
        const b = docSnap.data() as Booking;
        if (!stats[b.showId]) {
          stats[b.showId] = { tickets: 0, confirmed: 0, totalEarnings: 0 };
        }
        if (b.status !== 'cancelled') {
          stats[b.showId].tickets += b.ticketsCount;
          if (b.status === 'confirmed') {
            stats[b.showId].confirmed += b.ticketsCount;
            stats[b.showId].totalEarnings += b.totalPrice;
          }
        }
      });
      setShowsStats(stats);
    }, (err) => {
      console.warn("Error cargando estadísticas de reservas:", err);
    });

    return () => unsubscribe();
  }, []);

  // Listen to bookings for the selected show
  useEffect(() => {
    if (!selectedShow) {
      setBookings([]);
      return;
    }

    setBookingsLoading(true);
    const q = query(collection(db, 'bookings'), where('showId', '==', selectedShow.id));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const loaded: Booking[] = [];
      snap.docs.forEach(d => {
        loaded.push({ id: d.id, ...d.data() } as Booking);
      });
      loaded.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setBookings(loaded);
      setBookingsLoading(false);
    }, (err) => {
      console.error("Error al escuchar reservas del show:", err);
      setBookingsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedShow]);

  const save = async (shows: ShowItem[]) => {
    setSaving(true);
    await updateData({ shows });
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.venue || !form.date) return;
    
    let updated: ShowItem[];
    if (editingId) {
      updated = data.shows.map(s => s.id === editingId ? { ...form, id: editingId } : s);
      setEditingId(null);
    } else {
      updated = [...data.shows, form];
    }
    
    await save(updated);
    setForm(blank());
    setAdding(false);
    showToast(editingId ? 'Show actualizado con éxito' : 'Nuevo show registrado');
  };

  const startEdit = (show: ShowItem) => {
    setForm({
      ...blank(),
      ...show,
      tandas: show.tandas || [],
      media: show.media || [],
      bankDetails: show.bankDetails || { alias: show.alias || '', cbu: '', bankName: '', holderName: '' }
    });
    setEditingId(show.id);
    setAdding(true);
  };

  const deleteShow = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este show?')) {
      await save(data.shows.filter(s => s.id !== id));
      showToast('Show eliminado');
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, { status: newStatus });
      showToast(`Reserva actualizada a ${newStatus}`);
    } catch (err) {
      console.error("Error al actualizar estado de reserva:", err);
      alert("No se pudo actualizar el estado.");
    }
  };

  // Tandas Handlers
  const addTanda = () => {
    const newTanda: TandaItem = {
      id: crypto.randomUUID(),
      name: `Tanda ${(form.tandas?.length || 0) + 1}`,
      price: form.price || 15000,
      type: 'quantity',
      ticketLimit: 20
    };
    setForm(prev => ({ ...prev, tandas: [...(prev.tandas || []), newTanda] }));
  };

  const updateTanda = (index: number, updated: Partial<TandaItem>) => {
    setForm(prev => {
      const list = [...(prev.tandas || [])];
      list[index] = { ...list[index], ...updated };
      return { ...prev, tandas: list };
    });
  };

  const removeTanda = (index: number) => {
    setForm(prev => ({ ...prev, tandas: (prev.tandas || []).filter((_, i) => i !== index) }));
  };

  // Media Handlers
  const addMediaItem = (type: 'image' | 'video') => {
    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      type,
      url: '',
      caption: ''
    };
    setForm(prev => ({ ...prev, media: [...(prev.media || []), newItem] }));
  };

  const updateMediaItem = (index: number, updated: Partial<MediaItem>) => {
    setForm(prev => {
      const list = [...(prev.media || [])];
      list[index] = { ...list[index], ...updated };
      return { ...prev, media: list };
    });
  };

  const removeMediaItem = (index: number) => {
    setForm(prev => ({ ...prev, media: (prev.media || []).filter((_, i) => i !== index) }));
  };

  // Manual Sale Handler
  const handleSaveManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSaleShow || manualTickets <= 0) return;
    
    setManualSaving(true);
    try {
      const bookingId = `MANUAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const activeTandaInfo = getActiveTanda(manualSaleShow, (showsStats[manualSaleShow.id]?.tickets || 0));

      await setDoc(doc(db, 'bookings', bookingId), {
        id: bookingId,
        showId: manualSaleShow.id,
        showName: manualSaleShow.name,
        email: 'venta-manual@puerta.jedvik',
        ticketsCount: manualTickets,
        attendees: Array.from({ length: manualTickets }).map((_, i) => ({
          name: `Venta Presencial #${i + 1} (${manualNote || 'Puerta/Efectivo'})`,
          dni: '00000000'
        })),
        totalPrice: activeTandaInfo.currentPrice * manualTickets,
        paymentMethod: 'manual',
        origin: 'manual',
        status: 'confirmed',
        createdAt: serverTimestamp()
      });

      // Actualizar contador manual en el show
      const updatedShows = data.shows.map(s => {
        if (s.id === manualSaleShow.id) {
          return {
            ...s,
            manualSalesCount: (s.manualSalesCount || 0) + manualTickets
          };
        }
        return s;
      });
      await updateData({ shows: updatedShows });

      showToast(`¡Se registraron ${manualTickets} entradas manuales exitosamente!`);
      setManualSaleShow(null);
      setManualTickets(1);
      setManualNote('');
    } catch (err) {
      console.error('Error registrando venta manual:', err);
      alert('Error al registrar la venta manual');
    } finally {
      setManualSaving(false);
    }
  };

  const copyDirectLink = (showId: string) => {
    const url = `${window.location.origin}/show/${showId}`;
    navigator.clipboard.writeText(url);
    showToast('¡Link directo copiado al portapapeles!');
  };

  const exportCSV = (show: ShowItem) => {
    const headers = ['ID Reserva', 'Origen', 'Email de Contacto', 'Nombre Asistente', 'DNI Asistente', 'Estado Pago', 'Total Abonado', 'Fecha de Creacion'];
    
    const rows = bookings
      .filter(b => b.status !== 'cancelled')
      .flatMap(b => 
        (b.attendees || []).map(a => [
          b.id,
          b.origin === 'manual' ? 'PRESENCIAL/MANUAL' : 'WEB',
          b.email,
          a.name,
          a.dni,
          b.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE',
          b.totalPrice,
          b.createdAt?.toDate().toLocaleString('es-AR') ?? ''
        ])
      );

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lista-puerta-${show.name.toLowerCase().replace(/\s+/g, '-')}-${show.city.toLowerCase().replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupBookingsByEmail = () => {
    const groups: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      if (!groups[b.email]) {
        groups[b.email] = [];
      }
      groups[b.email].push(b);
    });
    return groups;
  };

  const grouped = groupBookingsByEmail();

  return (
    <div className="space-y-8 relative">

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-primary text-black font-headline font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full shadow-[0_10px_30px_rgba(0,255,65,0.4)] flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      <header className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">
            Shows & Entradas
          </h1>
          <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">
            Gestiona flujos de pago (Transferencia / Mercado Pago), tandas, capacidad total y ventas manuales
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => { setForm(blank()); setEditingId(null); setAdding(true); }}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-[0_4px_20px_rgba(255,142,125,0.25)]"
            style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo Show
          </button>
        )}
      </header>

      {/* Add / Edit Form */}
      {adding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-3xl p-6 md:p-8 border border-white/10 space-y-8 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
              {editingId ? 'Editar Show' : 'Registrar Nuevo Show'}
            </h2>
            <button
              type="button"
              onClick={() => { setAdding(false); setEditingId(null); setForm(blank()); }}
              className="p-2 text-white/40 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="font-label text-[11px] uppercase tracking-widest text-primary font-bold">1. Información del Show</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Nombre del Show / Tour</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ej: Tour 2026 / Jed Vik Live"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Ciudad / Región</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="ej: Buenos Aires, CABA"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Lugar / Venue</label>
                <input
                  type="text"
                  required
                  value={form.venue}
                  onChange={e => setForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="ej: Teatro Vórterix"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Dirección Física</label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ej: Av. Federico Lacroze 3455"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Enlace Mapa Google Maps (Iframe o URL)</label>
                <input
                  type="text"
                  value={form.gmapsUrl}
                  onChange={e => setForm(prev => ({ ...prev, gmapsUrl: e.target.value }))}
                  placeholder="Pegar link de compartir o iframe <iframe>"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Imagen de Vista Previa / Flyer (URL / Cloudinary)</label>
                <input
                  type="url"
                  value={form.imageUrl || ''}
                  onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://res.cloudinary.com/.../flyer.jpg"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Capacidad Total de Entradas Disponibles</label>
                <input
                  type="number"
                  min="1"
                  value={form.totalCapacity || 100}
                  onChange={e => setForm(prev => ({ ...prev, totalCapacity: Number(e.target.value) }))}
                  placeholder="ej: 100"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Flow Decision */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="font-label text-[11px] uppercase tracking-widest text-primary font-bold">2. Método de Pago del Show</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                form.paymentType === 'transferencia' ? 'bg-primary/10 border-primary text-white' : 'bg-surface-container border-white/5 text-white/50'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="transferencia"
                  checked={form.paymentType === 'transferencia'}
                  onChange={() => setForm(prev => ({ ...prev, paymentType: 'transferencia' }))}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
                <div>
                  <p className="font-headline font-bold text-xs uppercase">Solo Transferencia</p>
                  <p className="font-label text-[9px] text-white/40">Prereserva pendiente a confirmación manual vía WhatsApp</p>
                </div>
              </label>

              <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                form.paymentType === 'mercadopago' ? 'bg-blue-500/10 border-blue-400 text-white' : 'bg-surface-container border-white/5 text-white/50'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="mercadopago"
                  checked={form.paymentType === 'mercadopago'}
                  onChange={() => setForm(prev => ({ ...prev, paymentType: 'mercadopago' }))}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[24px]">credit_card</span>
                <div>
                  <p className="font-headline font-bold text-xs uppercase">Solo Mercado Pago API</p>
                  <p className="font-label text-[9px] text-white/40">Pasarela automatizada con confirmación instantánea</p>
                </div>
              </label>

              <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                form.paymentType === 'both' || !form.paymentType ? 'bg-green-500/10 border-green-400 text-white' : 'bg-surface-container border-white/5 text-white/50'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="both"
                  checked={form.paymentType === 'both' || !form.paymentType}
                  onChange={() => setForm(prev => ({ ...prev, paymentType: 'both' }))}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[24px]">payments</span>
                <div>
                  <p className="font-headline font-bold text-xs uppercase">Ambos Métodos</p>
                  <p className="font-label text-[9px] text-white/40">El cliente elige Transferencia o Mercado Pago</p>
                </div>
              </label>
            </div>

            {/* Bank Details Config */}
            {(form.paymentType === 'transferencia' || form.paymentType === 'both' || !form.paymentType) && (
              <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-white/60">Datos Bancarios para Transferencia</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-label text-[9px] uppercase tracking-widest text-white/40 block mb-1">Alias Bancario</label>
                    <input
                      type="text"
                      value={form.alias || form.bankDetails?.alias || ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        alias: e.target.value,
                        bankDetails: { ...(prev.bankDetails || { alias: '' }), alias: e.target.value }
                      }))}
                      placeholder="ej: jedvik.musica"
                      className="w-full bg-surface-container-highest rounded-full px-4 py-2.5 text-xs text-white border-none outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-label text-[9px] uppercase tracking-widest text-white/40 block mb-1">CBU / CVU (Opcional)</label>
                    <input
                      type="text"
                      value={form.bankDetails?.cbu || ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        bankDetails: { ...(prev.bankDetails || { alias: '' }), cbu: e.target.value }
                      }))}
                      placeholder="00000031000..."
                      className="w-full bg-surface-container-highest rounded-full px-4 py-2.5 text-xs text-white border-none outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-label text-[9px] uppercase tracking-widest text-white/40 block mb-1">Nombre del Titular de la Cuenta</label>
                    <input
                      type="text"
                      value={form.bankDetails?.holderName || ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        bankDetails: { ...(prev.bankDetails || { alias: '' }), holderName: e.target.value }
                      }))}
                      placeholder="ej: Thiago Jed Vik"
                      className="w-full bg-surface-container-highest rounded-full px-4 py-2.5 text-xs text-white border-none outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-label text-[9px] uppercase tracking-widest text-white/40 block mb-1">WhatsApp receptor de comprobantes</label>
                    <input
                      type="text"
                      value={form.whatsapp || ''}
                      onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="ej: 5491112345678"
                      className="w-full bg-surface-container-highest rounded-full px-4 py-2.5 text-xs text-white border-none outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tandas System Config */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-label text-[11px] uppercase tracking-widest text-primary font-bold">3. Tandas y Precios de Venta</h3>
                <p className="font-label text-[9px] text-white/40">Define precios por cantidad acumulativa de entradas o por rangos de fecha</p>
              </div>
              <button
                type="button"
                onClick={addTanda}
                className="px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-headline font-bold text-[10px] uppercase tracking-widest border border-primary/20 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                + Agregar Tanda
              </button>
            </div>

            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Precio Base / General ($ ARS)</label>
              <input
                type="number"
                required
                min="0"
                value={form.price || ''}
                onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="ej: 15000"
                className="w-full md:w-1/2 bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white border-none outline-none"
              />
            </div>

            {form.tandas && form.tandas.length > 0 && (
              <div className="space-y-3">
                {form.tandas.map((tanda, idx) => (
                  <div key={tanda.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex-1 space-y-2 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={tanda.name}
                          onChange={e => updateTanda(idx, { name: e.target.value })}
                          placeholder="Nombre (ej: Preventa 1)"
                          className="bg-surface-container-highest rounded-xl px-4 py-2 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={tanda.price}
                          onChange={e => updateTanda(idx, { price: Number(e.target.value) })}
                          placeholder="Precio ($)"
                          className="bg-surface-container-highest rounded-xl px-4 py-2 text-xs text-white"
                        />
                        <select
                          value={tanda.type}
                          onChange={e => updateTanda(idx, { type: e.target.value as 'quantity' | 'date' })}
                          className="bg-surface-container-highest rounded-xl px-4 py-2 text-xs text-white"
                        >
                          <option value="quantity">Por Cantidad de Entradas</option>
                          <option value="date">Por Rango de Fechas</option>
                        </select>
                      </div>

                      {tanda.type === 'quantity' ? (
                        <div className="flex items-center gap-2">
                          <label className="font-label text-[9px] text-white/40 uppercase">Hasta completar entradas N°:</label>
                          <input
                            type="number"
                            value={tanda.ticketLimit || 20}
                            onChange={e => updateTanda(idx, { ticketLimit: Number(e.target.value) })}
                            className="bg-surface-container-highest rounded-xl px-3 py-1.5 text-xs text-white w-28"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="datetime-local"
                            value={tanda.startDate || ''}
                            onChange={e => updateTanda(idx, { startDate: e.target.value })}
                            className="bg-surface-container-highest rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                          <input
                            type="datetime-local"
                            value={tanda.endDate || ''}
                            onChange={e => updateTanda(idx, { endDate: e.target.value })}
                            className="bg-surface-container-highest rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTanda(idx)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-all self-end md:self-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media Gallery Config */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-label text-[11px] uppercase tracking-widest text-primary font-bold">4. Galería Multimedia del Show</h3>
                <p className="font-label text-[9px] text-white/40">Sube o vincula imágenes y videos de Cloudinary (.mp4 / enlaces directos) o YouTube</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addMediaItem('image')}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-headline font-bold text-[9px] uppercase tracking-widest border border-white/10 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">image</span>
                  + Imagen
                </button>
                <button
                  type="button"
                  onClick={() => addMediaItem('video')}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-headline font-bold text-[9px] uppercase tracking-widest border border-white/10 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">videocam</span>
                  + Video
                </button>
              </div>
            </div>

            {form.media && form.media.length > 0 && (
              <div className="space-y-3">
                {form.media.map((item, idx) => (
                  <div key={item.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-white/40">
                      {item.type === 'video' ? 'movie' : 'photo'}
                    </span>
                    <input
                      type="url"
                      required
                      value={item.url}
                      onChange={e => updateMediaItem(idx, { url: e.target.value })}
                      placeholder={item.type === 'video' ? "URL de Video Cloudinary / MP4 o Link de YouTube" : "URL de Imagen (Cloudinary / Directo)"}
                      className="flex-1 bg-surface-container-highest rounded-xl px-4 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={item.caption || ''}
                      onChange={e => updateMediaItem(idx, { caption: e.target.value })}
                      placeholder="Título / Descripción corta"
                      className="w-1/3 bg-surface-container-highest rounded-xl px-4 py-2 text-xs text-white hidden md:block"
                    />
                    <button
                      type="button"
                      onClick={() => removeMediaItem(idx)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
            >
              {saving ? 'Guardando...' : (editingId ? 'Guardar Cambios' : '+ Registrar Show')}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setEditingId(null); setForm(blank()); }}
              className="px-6 py-3.5 rounded-full bg-surface-container-highest font-headline font-bold text-[11px] uppercase tracking-widest text-white/50 hover:text-white hover:bg-surface-bright transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Shows List */}
      <div className="space-y-4">
        {data.shows.map(show => {
          const stats = showsStats[show.id] || { tickets: 0, confirmed: 0, totalEarnings: 0 };
          const totalOccupancy = stats.confirmed + (show.manualSalesCount || 0);
          const capacity = show.totalCapacity || 100;
          const percentage = Math.min(100, Math.round((totalOccupancy / capacity) * 100));
          const activeTandaInfo = getActiveTanda(show, totalOccupancy);

          return (
            <div key={show.id} className="bg-surface-container-high rounded-3xl p-6 md:p-7 border border-white/10 hover:border-white/20 transition-all space-y-5 shadow-lg">
              {/* Row 1: Badges + Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Date badge */}
                  <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-headline font-bold text-white uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px] text-primary">calendar_today</span>
                    {new Date(show.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || show.date} hs
                  </span>

                  {/* Payment type badge */}
                  <span className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider border ${
                    show.paymentType === 'mercadopago' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    show.paymentType === 'transferencia' ? 'bg-primary/10 text-primary border-primary/20' :
                    'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    <span className="material-symbols-outlined text-[14px]">payments</span>
                    {show.paymentType === 'mercadopago' ? 'Mercado Pago API' :
                     show.paymentType === 'transferencia' ? 'Transferencia' :
                     'Ambos Métodos'}
                  </span>

                  {/* Active Tanda badge */}
                  <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20 font-headline font-bold text-[10px] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">local_offer</span>
                    {activeTandaInfo.tandaName}: ${activeTandaInfo.currentPrice.toLocaleString('es-AR')}
                  </span>
                </div>

                {/* Buttons row */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                  <button
                    onClick={() => setManualSaleShow(show)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-full font-headline font-bold text-[10px] uppercase tracking-widest transition-all border border-yellow-500/20 active:scale-95"
                    title="Cargar venta manual/efectivo"
                  >
                    <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
                    + Venta Manual
                  </button>

                  <button
                    onClick={() => copyDirectLink(show.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-full font-headline font-bold text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                    title="Copiar enlace directo al show"
                  >
                    <span className="material-symbols-outlined text-[15px]">link</span>
                    Link Directo
                  </button>

                  <button
                    onClick={() => setSelectedShow(show)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-highest hover:bg-surface-container text-white rounded-full font-headline font-bold text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[15px]">groups</span>
                    Reservas ({stats.tickets})
                  </button>

                  <button
                    onClick={() => startEdit(show)}
                    className="p-2 bg-surface-container-highest hover:bg-surface-container text-white/70 hover:text-white rounded-full transition-all border border-white/10 active:scale-95"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  
                  <button
                    onClick={() => deleteShow(show.id)}
                    className="p-2 bg-surface-container-highest hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-full transition-all border border-white/10 active:scale-95"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Show Details + Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Show Details (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tight text-white leading-tight">
                    {show.name || 'Sin nombre'}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-white/70">
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                      {show.venue} ({show.city})
                    </span>
                    {show.address && (
                      <>
                        <span className="text-white/20 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1 text-white/60">
                          <span className="material-symbols-outlined text-[16px]">map</span>
                          {show.address}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-label uppercase tracking-widest text-white/50">
                      <span>Ocupación del evento</span>
                      <span className="font-bold text-white">{totalOccupancy} de {capacity} entradas ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-500 ${percentage >= 90 ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Box (5 cols) */}
                <div className="lg:col-span-5 bg-black/30 rounded-2xl p-4 border border-white/5 grid grid-cols-3 gap-2 text-center">
                  <div className="px-2">
                    <p className="font-headline font-black text-xl text-white">{stats.tickets}</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Reservas Web</p>
                  </div>
                  <div className="px-2 border-x border-white/10">
                    <p className="font-headline font-black text-xl text-yellow-400">{show.manualSalesCount || 0}</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Presenciales</p>
                  </div>
                  <div className="px-2">
                    <p className="font-headline font-black text-xl text-green-400">${stats.totalEarnings?.toLocaleString('es-AR')}</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Recaudación</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {data.shows.length === 0 && !adding && (
          <p className="text-center text-white/20 font-label text-sm uppercase tracking-widest py-16 bg-surface-container rounded-3xl border border-white/5">
            No hay shows registrados
          </p>
        )}
      </div>

      {/* Manual Sale Entry Modal */}
      {manualSaleShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="bg-surface-container-high w-full max-w-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <span className="font-label text-[9px] uppercase tracking-widest text-yellow-400 font-bold block">Venta Presencial / Offline</span>
                <h3 className="font-headline font-black text-xl uppercase tracking-tight text-white">{manualSaleShow.name}</h3>
              </div>
              <button onClick={() => setManualSaleShow(null)} className="p-2 text-white/40 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveManualSale} className="space-y-4">
              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2">Cantidad de Entradas Vendidas</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualTickets}
                  onChange={e => setManualTickets(Number(e.target.value))}
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white border-none outline-none"
                />
              </div>

              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2">Nota / Cliente (Opcional)</label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={e => setManualNote(e.target.value)}
                  placeholder="ej: Pago en efectivo puerta / Juan Pérez"
                  className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setManualSaleShow(null)}
                  className="px-5 py-2.5 rounded-full bg-surface-container-highest text-white/50 font-headline font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={manualSaving}
                  className="px-6 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-headline font-bold text-xs uppercase tracking-wider"
                >
                  {manualSaving ? 'Guardando...' : 'Confirmar Venta Manual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookings Drawer/Modal */}
      {selectedShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="bg-surface-container-high w-full max-w-4xl max-h-[85vh] rounded-3xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <header className="p-6 md:p-8 border-b border-white/5 flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-primary block mb-1">Listado de Reservas</span>
                <h2 className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tight text-white">{selectedShow.name}</h2>
                <p className="font-label text-xs text-white/40 mt-1 uppercase tracking-wider">{selectedShow.venue} — {selectedShow.city}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportCSV(selectedShow)}
                  disabled={bookings.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded-full font-headline font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Lista Puerta (CSV)
                </button>
                <button
                  onClick={() => setSelectedShow(null)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {bookingsLoading ? (
                <div className="flex justify-center py-20">
                  <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-center text-white/20 font-label text-sm uppercase tracking-widest py-20">
                  No hay reservas registradas para este show
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.keys(grouped).map(email => {
                    const groupBookings = grouped[email];
                    return (
                      <div key={email} className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
                        
                        {/* Group Header */}
                        <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex justify-between items-center flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white/40 text-[18px]">
                              {email.includes('manual') ? 'point_of_sale' : 'mail'}
                            </span>
                            <span className="font-body text-sm font-bold text-white">{email}</span>
                          </div>
                          <span className="font-label text-[10px] uppercase tracking-widest text-white/30">
                            {groupBookings.length} {groupBookings.length === 1 ? 'reserva' : 'reservas'}
                          </span>
                        </div>

                        {/* Group Bookings List */}
                        <div className="divide-y divide-white/5">
                          {groupBookings.map(b => (
                            <div key={b.id} className="p-6 space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                
                                {/* Booking Info */}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-headline font-bold text-sm text-primary tracking-wider">{b.id}</span>
                                    <span className="text-white/20">•</span>
                                    <span className="font-label text-[10px] text-white/40 uppercase">
                                      {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('es-AR') : ''}
                                    </span>
                                    <span className="text-white/20">•</span>
                                    <span className="font-body text-xs text-white/70">
                                      {b.ticketsCount} {b.ticketsCount === 1 ? 'entrada' : 'entradas'} (${b.totalPrice?.toLocaleString('es-AR')})
                                    </span>
                                    {b.paymentMethod && (
                                      <span className="font-label text-[9px] uppercase tracking-widest px-2 py-0.5 bg-white/5 text-white/60 rounded">
                                        {b.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Status + Action Buttons */}
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                    b.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                    b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                    'bg-yellow-500/10 text-yellow-500'
                                  }`}>
                                    {b.status === 'confirmed' ? 'Pago Confirmado' :
                                     b.status === 'cancelled' ? 'Cancelado' :
                                     'A revisión'}
                                  </span>

                                  <div className="flex items-center bg-black/40 rounded-full p-1 border border-white/5">
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                      className={`p-1.5 rounded-full transition-all ${b.status === 'confirmed' ? 'bg-green-500 text-white' : 'text-white/30 hover:text-white'}`}
                                      title="Confirmar Pago"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">check</span>
                                    </button>
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'pending')}
                                      className={`p-1.5 rounded-full transition-all ${b.status === 'pending' ? 'bg-yellow-500 text-black' : 'text-white/30 hover:text-white'}`}
                                      title="Poner a revisión"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">history</span>
                                    </button>
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                      className={`p-1.5 rounded-full transition-all ${b.status === 'cancelled' ? 'bg-red-500 text-white' : 'text-white/30 hover:text-white'}`}
                                      title="Cancelar Reserva"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                  </div>
                                </div>

                              </div>

                              {/* Attendees Names & DNIs */}
                              <div className="bg-black/25 rounded-xl p-4 border border-white/5">
                                <p className="font-label text-[9px] uppercase tracking-widest text-white/30 mb-2">Asistentes registrados</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {(b.attendees || []).map((attendee, index) => (
                                    <div key={index} className="flex justify-between items-center border-b border-white/5 pb-1 md:pb-0 md:border-none">
                                      <span className="font-body text-xs text-white/80">{attendee.name}</span>
                                      <span className="font-label text-[10px] text-white/40">DNI: {attendee.dni}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminShows;
