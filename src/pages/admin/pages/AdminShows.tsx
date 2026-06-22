import { useState, useEffect } from 'react';
import { useCMS, type ShowItem } from '../../../context/CMSContext';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
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
  price: 0,
  alias: '',
  whatsapp: '',
  url: ''
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
      // Sort by date created desc
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
  };

  const startEdit = (show: ShowItem) => {
    setForm(show);
    setEditingId(show.id);
    setAdding(true);
  };

  const deleteShow = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este show?')) {
      await save(data.shows.filter(s => s.id !== id));
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.error("Error al actualizar estado de reserva:", err);
      alert("No se pudo actualizar el estado.");
    }
  };

  const exportCSV = (show: ShowItem) => {
    // Generate check-in door list: one line per attendee
    const headers = ['ID Reserva', 'Email de Contacto', 'Nombre Asistente', 'DNI Asistente', 'Estado Pago', 'Total Abonado', 'Fecha de Creacion'];
    
    const rows = bookings
      .filter(b => b.status !== 'cancelled')
      .flatMap(b => 
        b.attendees.map(a => [
          b.id,
          b.email,
          a.name,
          a.dni,
          b.status === 'confirmed' ? 'CONFIRMADO' : 'A REVISION',
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

  // Group bookings by email helper
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
    <div className="space-y-8">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">
            Shows
          </h1>
          <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">
            Administra las fechas del tour, precios, alias y revisa las reservas
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
        <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-white">
            {editingId ? 'Editar Show' : 'Registrar Nuevo Show'}
          </h2>
          
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
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Precio por persona ($ ARS)</label>
              <input
                type="number"
                required
                min="0"
                value={form.price || ''}
                onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="ej: 15000"
                className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Alias Bancario para Transferencias</label>
              <input
                type="text"
                value={form.alias}
                onChange={e => setForm(prev => ({ ...prev, alias: e.target.value }))}
                placeholder="ej: jedvik.transfer"
                className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">WhatsApp receptor de comprobantes</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="ej: 5491112345678 (código de país sin + ni espacios)"
                className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">URL Externa de Venta Opcional (ej: Passline)</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://... (dejar vacío para usar reserva por transferencia local)"
                className="w-full bg-surface-container-highest rounded-full px-5 py-3 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
            >
              {saving ? 'Guardando...' : (editingId ? 'Confirmar Edición' : '+ Registrar Show')}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setEditingId(null); setForm(blank()); }}
              className="px-6 py-3 rounded-full bg-surface-container-highest font-headline font-bold text-[11px] uppercase tracking-widest text-white/50 hover:text-white hover:bg-surface-bright transition-all"
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
          return (
            <div key={show.id} className="bg-surface-container-high rounded-3xl p-6 border border-white/5 hover:bg-surface-bright/70 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Basic Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-label text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-white/5 rounded-full text-white/60">
                      {new Date(show.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || show.date} hs
                    </span>
                    {show.url ? (
                      <span className="font-label text-[9px] uppercase tracking-widest px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/10">URL Externa</span>
                    ) : (
                      <span className="font-label text-[9px] uppercase tracking-widest px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/10">Reserva Local</span>
                    )}
                  </div>
                  <h3 className="font-headline font-black text-2xl uppercase tracking-tight text-white truncate">{show.name || 'Sin nombre'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-label text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                      {show.venue} ({show.city})
                    </span>
                    <span className="text-white/10 hidden md:inline">•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">payments</span>
                      ${show.price?.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Reservation Stats */}
                {!show.url && (
                  <div className="grid grid-cols-3 gap-6 bg-black/20 rounded-2xl px-5 py-3 border border-white/5">
                    <div className="text-center">
                      <p className="font-headline font-black text-lg text-white">{stats.tickets}</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Reservas</p>
                    </div>
                    <div className="text-center border-x border-white/10 px-4">
                      <p className="font-headline font-black text-lg text-green-400">{stats.confirmed}</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Pagos Conf.</p>
                    </div>
                    <div className="text-center">
                      <p className="font-headline font-black text-lg text-primary">${stats.totalEarnings?.toLocaleString('es-AR')}</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Recaudado</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 lg:self-center">
                  {!show.url && (
                    <button
                      onClick={() => setSelectedShow(show)}
                      className="flex items-center gap-2 px-5 py-3 bg-surface-container-highest hover:bg-surface-container hover:text-white rounded-full text-white/70 font-headline font-bold text-[10px] uppercase tracking-widest transition-all border border-white/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">groups</span>
                      Reservas
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(show)}
                    className="p-3 bg-surface-container-highest hover:bg-surface-container hover:text-white rounded-full text-white/50 transition-all border border-white/5"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => deleteShow(show.id)}
                    className="p-3 bg-surface-container-highest hover:bg-red-500/10 hover:text-red-400 rounded-full text-white/30 transition-all border border-white/5"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
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
                        
                        {/* Group Header (Email info) */}
                        <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex justify-between items-center flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white/40 text-[18px]">mail</span>
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
                                      {b.createdAt?.toDate().toLocaleDateString('es-AR') ?? ''}
                                    </span>
                                    <span className="text-white/20">•</span>
                                    <span className="font-body text-xs text-white/70">
                                      {b.ticketsCount} {b.ticketsCount === 1 ? 'entrada' : 'entradas'} (${b.totalPrice?.toLocaleString('es-AR')})
                                    </span>
                                  </div>
                                </div>

                                {/* Status + Action Buttons */}
                                <div className="flex items-center gap-3">
                                  {/* Status badge */}
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                    b.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                    b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                    'bg-yellow-500/10 text-yellow-500'
                                  }`}>
                                    {b.status === 'confirmed' ? 'Pago Confirmado' :
                                     b.status === 'cancelled' ? 'Cancelado' :
                                     'A revisión'}
                                  </span>

                                  {/* Actions */}
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
                                  {b.attendees.map((attendee, index) => (
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
