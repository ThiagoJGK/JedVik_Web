import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase';
import { useCMS } from '../../../context/CMSContext';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const db = getFirestore(app);

interface FanEntry { email: string; createdAt: Timestamp; }
interface ChartPoint { date: string; fans: number; visits: number; }

const AdminStats = () => {
  const { data } = useCMS();
  const [totalFans, setTotalFans] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [weekFans, setWeekFans] = useState(0);
  const [recent, setRecent] = useState<FanEntry[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const today = new Date();
    const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 30);
    const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);

    // 1. Listen for ALL Fans
    const unsubFans = onSnapshot(collection(db, 'fans'), (snap) => {
      setTotalFans(snap.size);
      
      const lastWeek = snap.docs.filter(d => (d.data().createdAt as Timestamp)?.toDate() >= weekAgo);
      setWeekFans(lastWeek.length);

      const recentOnes = [...snap.docs]
        .sort((a, b) => (b.data().createdAt as Timestamp)?.toMillis() - (a.data().createdAt as Timestamp)?.toMillis())
        .slice(0, 8)
        .map(d => d.data() as FanEntry);
      setRecent(recentOnes);
    });

    // 2. Listen for ALL Visits
    const qVisits = query(collection(db, 'analytics'), where('type', '==', 'visit'));
    const unsubVisits = onSnapshot(qVisits, (snap) => {
      setTotalVisits(snap.size);
    });

    // 3. Build Chart Data (Combined)
    const unsubChart = onSnapshot(collection(db, 'fans'), (fansSnap) => {
      onSnapshot(qVisits, (visitsSnap) => {
        const byDay: Record<string, { fans: number; visits: number }> = {};
        
        // Initialize last 7 days at least
        for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
          byDay[key] = { fans: 0, visits: 0 };
        }

        fansSnap.docs.forEach(d => {
          const dt = (d.data().createdAt as Timestamp)?.toDate();
          if (dt && dt >= thirtyAgo) {
            const key = dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            if (byDay[key]) byDay[key].fans++;
          }
        });

        visitsSnap.docs.forEach(d => {
          const dt = (d.data().timestamp as Timestamp)?.toDate();
          if (dt && dt >= thirtyAgo) {
            const key = dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            if (byDay[key]) byDay[key].visits++;
          }
        });

        setChartData(Object.entries(byDay).map(([date, val]) => ({ date, ...val })));
      });
    });

    return () => { unsubFans(); unsubVisits(); unsubChart(); };
  }, []);

  const timeAgo = (ts: Timestamp) => {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - ts.toMillis()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `hace ${diff}m`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)}d`;
  };

  const conversionRate = totalVisits > 0 ? ((totalFans / totalVisits) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Visitas Totales', value: totalVisits, trend: 'En tiempo real', icon: 'visibility' },
    { label: 'Fans Totales', value: totalFans, trend: `+${weekFans} esta semana`, icon: 'groups' },
    { label: 'Tasa de Conversión', value: `${conversionRate}%`, trend: 'Visitas vs. Fans', icon: 'Ads_Click', highlight: true },
    { label: 'Shows', value: data.shows.length, trend: 'Fechas activas', icon: 'confirmation_number' },
  ];

  return (
    <div className="pb-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">
            Estadísticas
          </h1>
          <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Analytics
          </p>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className={`bg-surface-container rounded-3xl p-5 md:p-6 border border-white/5 transition-all hover:bg-surface-container-high`}>
            <span className={`material-symbols-outlined mb-3 block text-2xl ${s.highlight ? 'text-primary' : 'text-white/20'}`}>{s.icon}</span>
            <div className={`font-headline font-black text-3xl md:text-4xl tracking-tighter mb-1 ${s.highlight ? 'text-white' : 'text-white/90'}`}>
              {s.value}
            </div>
            <div className="font-label text-[9px] md:text-[10px] uppercase tracking-widest text-white/40">{s.label}</div>
            <div className="font-label text-[10px] text-white/20 mt-3 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/20" /> {s.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <section className="lg:col-span-2 bg-surface-container rounded-3xl p-8 border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-white/40 mb-1">Crecimiento de Audiencia</p>
              <h3 className="font-headline font-bold text-lg text-white/80 uppercase">Últimos 30 días</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[9px] font-label text-white/40 uppercase tracking-widest">Fans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <span className="text-[9px] font-label text-white/40 uppercase tracking-widest">Visitas</span>
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CC4E3D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#CC4E3D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '12px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="visits" stroke="rgba(255,255,255,0.1)" fill="transparent" strokeWidth={1} />
                <Area type="monotone" dataKey="fans" stroke="#CC4E3D" fillOpacity={1} fill="url(#colorFans)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Audience Activity */}
        <section className="bg-surface-container rounded-3xl p-8 border border-white/5">
          <div className="flex justify-between items-center mb-8">
            <p className="font-label text-[10px] uppercase tracking-widest text-white/40">Feed en vivo</p>
            <span className="material-symbols-outlined text-primary text-xl">bolt</span>
          </div>
          
          <div className="space-y-3">
            {recent.length > 0 ? recent.map((f, i) => (
              <div key={i} className="bg-surface-container-high/50 rounded-2xl px-5 py-4 flex items-center justify-between border border-white/[0.02]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontSize: 16 }}>person_add</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] text-white/80 font-bold truncate leading-none mb-1">{f.email.split('@')[0]}</p>
                    <p className="text-[9px] text-white/30 truncate leading-none">Se unió a la comunidad</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase whitespace-nowrap ml-4">
                  {f.createdAt ? timeAgo(f.createdAt) : '—'}
                </span>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <span className="material-symbols-outlined text-4xl mb-2">sensor_occupied</span>
                <p className="text-[10px] font-label uppercase tracking-widest">Esperando audiencia...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminStats;
