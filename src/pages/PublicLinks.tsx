import { useState } from 'react';
import { useCMS } from '../context/CMSContext';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase';

const db = getFirestore(app);

const PublicLinks = () => {
  const { data } = useCMS();

  // Community signup state
  const [email, setEmail] = useState('');
  const [signupState, setSignupState] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setSignupState('loading');
    try {
      // Check if already exists
      const q = query(collection(db, 'fans'), where('email', '==', email.toLowerCase()));
      const existing = await getDocs(q);
      if (!existing.empty) {
        setSignupState('exists');
        return;
      }
      await addDoc(collection(db, 'fans'), {
        email: email.toLowerCase(),
        source: 'landing',
        createdAt: serverTimestamp(),
      });
      setSignupState('success');
    } catch {
      setSignupState('error');
    }
  };

  const handlePlayClick = () => {
    if (data.featuredVideo.url) {
      window.open(data.featuredVideo.url, '_blank');
    }
  };

  const handleMerchClick = (e: React.MouseEvent) => {
    if (!data.merch?.shopUrl) {
      e.preventDefault();
      alert('Tienda próximamente disponible.');
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body selection:bg-primary selection:text-on-primary-fixed overflow-x-hidden">
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/60 dark:bg-black/60 backdrop-blur-xl flex justify-between items-center px-8 py-4">
        <a href="#" className="material-symbols-outlined text-white/70">menu</a>
        <h1 className="font-headline font-black tracking-tighter text-white uppercase text-2xl">{data.profile.name}</h1>
        <a
          href={data.merch?.shopUrl || '#'}
          onClick={handleMerchClick}
          target={data.merch?.shopUrl ? '_blank' : undefined}
          rel="noreferrer"
          className="material-symbols-outlined text-white/70 hover:text-primary transition-colors"
        >
          shopping_bag
        </a>
      </nav>

      <main className="relative pb-32">
        {/* ── Hero ── */}
        <section className="relative h-[795px] w-full flex flex-col justify-end items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover grayscale brightness-50 contrast-125"
              alt={data.profile.name}
              src={data.profile.imageUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuAfnhq2V3O7ArD6xEf0LtG25vEF16kfQa5klXM945PThYbjhto6AFkqE5vZeBYdOyW9NtjVVNsOoqXByKl3zZ7_5cyOSdUG9mwfaFkFc8q4lcuACGG516o-TrV9WzUpjWQJEbXSNfIbpj-Vrz2dVYwJvIZ_iDjKiqzQwKQYu97QNJeylLPKBNJZqHDbMHnrUe-OI0oA4oy0LRaG-lFxceVgdj56zsxFsgq3red9EV9SpdHb96XX-nuIPnCKvHcOSJzMhfAZIAk38bM"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 px-6 text-center mb-12">
            <h2 className="font-headline font-black text-7xl md:text-9xl tracking-tighter uppercase leading-[0.8] mb-4">
              {data.profile.name.split(' ')[0]}<br />
              <span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)' }}>
                {data.profile.name.split(' ').slice(1).join(' ')}
              </span>
            </h2>
            <p className="font-label text-xs tracking-[0.3em] text-white/60 uppercase">
              {data.profile.bio || 'The Sonic Monolith Tour 2024'}
            </p>
          </div>
        </section>

        {/* ── Priority Release ── */}
        <section className="px-6 -mt-20 relative z-20">
          <div className="bg-surface-container rounded-xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full" />
            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(204,78,61,0.3)]">
                <img className="w-full h-full object-cover" alt="Latest Release"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9zCHoNr8ciyN7wHTbkT6OdbYft_AzzI8Zg7QsgC8Ruc-jZvTNN6Pd-vc6KoClB9sT95-sOzr4rN4ONzfWz5ONCv_mS20yf155nn9w6WKIWTQEMCSBColq0ILWOCsphtRzmqlkvbinGbOueecCLGl4lIlzpIeLIK8pKNM8kSLPZr4AOkD0xUzJAgC7nGpmmeYClrKxAq-OnOY6zhAn00e208q0zsaiEBYE2Z6e0Ca29k3rMCL_2iXZKwZgvuB1Gj868c7e5ZvosiQ"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label text-[10px] tracking-widest text-primary font-bold uppercase">Latest Release</span>
                <h3 className="font-headline text-2xl font-black leading-tight">ECHOS IN THE VOID</h3>
                <p className="text-on-surface-variant text-sm">{data.profile.name} feat. LUNA</p>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="space-y-4 relative z-10 mb-8">
              <div className="h-1 bg-surface-variant rounded-full w-full overflow-hidden">
                <div className="h-full bg-primary-gradient rounded-full animate-[progress_8s_ease-in-out_infinite]" style={{ width: '33%', animation: 'pulse-bar 4s ease-in-out infinite alternate' }} />
              </div>
              <div className="flex justify-between text-[10px] font-label text-white/40 tracking-widest">
                <span>01:24</span>
                <span>04:12</span>
              </div>
            </div>

            <button
              onClick={handlePlayClick}
              className="w-full bg-primary-gradient py-5 rounded-full flex items-center justify-center gap-3 font-headline font-bold text-sm tracking-wider uppercase active:scale-95 transition-transform hover:opacity-90"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Escuchar el Nuevo Sencillo
            </button>
          </div>
        </section>

        {/* ── Centralized Links ── */}
        <section className="px-6 mt-16 space-y-3">
          <h4 className="font-label text-[10px] text-center tracking-[0.4em] text-white/30 uppercase mb-6">Connect with the sound</h4>
          {data.links.filter(l => l.active).sort((a, b) => a.order - b.order).map(link => {
            let icon = 'link';
            if (link.platform.toLowerCase().includes('spotify')) icon = 'podcasts';
            if (link.platform.toLowerCase().includes('apple')) icon = 'brand_awareness';
            if (link.platform.toLowerCase().includes('youtube')) icon = 'videocam';
            if (link.platform.toLowerCase().includes('instagram')) icon = 'photo_camera';
            if (link.platform.toLowerCase().includes('tiktok')) icon = 'music_video';

            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-8 py-5 bg-surface-container-high rounded-full hover:bg-surface-bright active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                  <span className="font-headline font-bold text-sm tracking-widest uppercase">{link.platform}</span>
                </div>
                <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-colors">arrow_forward</span>
              </a>
            );
          })}
        </section>

        {/* ── Shows ── */}
        <section id="shows" className="mt-20">
          <div className="px-8 mb-8 flex justify-between items-end">
            <h2 className="font-headline font-black text-4xl tracking-tighter uppercase">Próximos<br />Shows</h2>
            <a href="#shows" className="font-label text-[10px] text-primary font-bold tracking-[0.2em] hover:opacity-70 transition-opacity">
              View All
            </a>
          </div>

          <div className="space-y-1">
            {data.shows.length > 0 ? (
              data.shows.map(show => (
                <div key={show.id} className="px-8 py-6 bg-surface-container-low flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label text-[10px] text-white/40 uppercase tracking-widest">{show.date} / {show.city}</span>
                    <h4 className="font-headline font-bold text-lg uppercase tracking-tight">{show.venue}</h4>
                  </div>
                  {show.url && show.url !== '#' ? (
                    <a
                      href={show.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-2 bg-primary-gradient rounded-full font-headline font-bold text-[10px] tracking-widest uppercase active:scale-95 transition-all"
                    >
                      Tickets
                    </a>
                  ) : (
                    <span className="px-6 py-2 border border-white/10 rounded-full font-headline font-bold text-[10px] tracking-widest uppercase text-white/30">
                      Pronto
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="px-8 py-6 text-center text-white/40 font-body">No hay fechas de gira anunciadas.</p>
            )}
          </div>
        </section>

        {/* ── Merch Carousel ── */}
        <section id="merch" className="mt-20 pl-8 overflow-hidden">
          <div className="flex justify-between items-center pr-8 mb-8">
            <h2 className="font-headline font-black text-4xl tracking-tighter uppercase">Merch Oficial</h2>
            {data.merch?.shopUrl && (
              <a href={data.merch.shopUrl} target="_blank" rel="noreferrer" className="font-label text-[10px] text-primary font-bold tracking-[0.2em] hover:opacity-70 transition-opacity">
                Ver Todo
              </a>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-8 pr-8 snap-x">
            {[
              { name: 'Monolith Hoodie', price: '$85.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOFpocouiaf1-Tz8gQblk3JuYJ8VVQSrYjh3J8gxett3rAz-WZ4HyJbnkMkhNfjKjKQh9CSw8j4-AqTDWRVZb8VooY5awPjoXJc22esgFm4DkUvXH9k2Jt5hoMimXon8wI-YSBjU8NHEg8OLileoyxM0l5h-MuKlo-j-GTWz8Cca_FB8CqiWmld9F7QGtuM5J-cgP5pgZPuisOal1sDWZM2RH0m_DIi4sTDcWky-w7a7boq2GWEsDU1HFsbtWgYbJDIfFDU4W2_r0' },
              { name: 'Echos Tee', price: '$45.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQPXWL5U2MD7siZXAwTn80cbOQuXCh1nWw9_DYo-J0PyRVh33xScLF_8wBWfRUeHX0fEISPcv-nm4wtJWVcPIO03dEpAv7iBssFOI27JiCny-RGJzBLYjnP7d-jxZQ7TleFszkOqQ6v6VTAXBuEmiPhi770KjL5WAgr4JAVWYIBu17-ggHxfwLg6rJjemnSY31gj0lgIf-TRvwozqzBR9eiEmYXgC3Dr_iRL-XoajS8Hka98c0GqzGLPZxzPPTNI2D2K0gZ_zQ4vU' },
              { name: 'Echos Vinyl LE', price: '$38.00 USD', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6FdOrTBO0dTyoFjdrm5bk-MElx72J1jsB_cyoMsbzErvG-N3A5yoL3vuym3GUwjBvG_Zd02uat-0YtSDNRrNJmPPrI-40OM07767O_TF-eNC0ZeOd32_W7z1Q0RtVO3tNr_NT4Ju_7OjhRaVuWpqQdULcJcgoK1sCKQGzt67bJuK2ZoaYVMO9AeYAsvzkcZw3vAPVTzsD9wAaT1TuX_o2abAWtG3TFJjDC5bro65DeilpUcVWVK25kGj-j19TzIK0aeQ9ngFKr8o' },
            ].map(item => (
              <a
                key={item.name}
                href={data.merch?.shopUrl || '#'}
                onClick={!data.merch?.shopUrl ? handleMerchClick : undefined}
                target={data.merch?.shopUrl ? '_blank' : undefined}
                rel="noreferrer"
                className="flex-shrink-0 w-64 snap-start group cursor-pointer"
              >
                <div className="aspect-[4/5] bg-surface-container rounded-xl overflow-hidden mb-4 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} src={item.img} />
                </div>
                <h5 className="font-headline font-bold text-sm tracking-wider uppercase mb-1">{item.name}</h5>
                <p className="font-label text-xs text-primary font-bold">{item.price}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Community Signup ── */}
        <section className="px-6 mt-20">
          <div className={`rounded-xl p-10 text-center relative overflow-hidden transition-all duration-500 ${signupState === 'success' ? 'bg-green-900/80' : 'bg-primary-gradient'}`}>
            <div className="absolute inset-0 bg-black/10" />

            {signupState === 'success' ? (
              <div className="relative z-10">
                <span className="material-symbols-outlined text-6xl text-green-400 mb-4 block">check_circle</span>
                <h2 className="font-headline font-black text-3xl tracking-tighter uppercase leading-none text-white">¡Ya eres parte!</h2>
                <p className="text-sm text-white/70 mt-4">Te avisaremos sobre preventas y contenido exclusivo.</p>
              </div>
            ) : (
              <>
                <h2 className="relative z-10 font-headline font-black text-3xl tracking-tighter uppercase mb-4 leading-none">
                  Únete a la comunidad de {data.profile.name}
                </h2>
                <p className="relative z-10 text-sm font-medium text-black/80 mb-8 px-4">
                  Acceso exclusivo a preventas, demos inéditos y contenido detrás de escena.
                </p>

                {signupState === 'exists' && (
                  <p className="relative z-10 text-xs font-bold text-black/60 mb-4 bg-black/10 rounded-full px-4 py-2 inline-block">
                    ¡Ya eres parte de la comunidad!
                  </p>
                )}
                {signupState === 'error' && (
                  <p className="relative z-10 text-xs font-bold text-red-900 mb-4 bg-red-200/30 rounded-full px-4 py-2 inline-block">
                    Algo salió mal. Intenta nuevamente.
                  </p>
                )}

                <form onSubmit={handleSignup} className="relative z-10 flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setSignupState('idle'); }}
                    required
                    className="w-full bg-black/20 border-none rounded-full py-4 px-8 text-white placeholder:text-black/40 font-headline font-bold text-xs tracking-widest focus:ring-2 focus:ring-white/20 uppercase outline-none"
                    placeholder="TU CORREO ELECTRÓNICO"
                  />
                  <button
                    type="submit"
                    disabled={signupState === 'loading'}
                    className="w-full bg-black text-white py-4 rounded-full font-headline font-bold text-xs tracking-[0.2em] uppercase active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signupState === 'loading' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Enviando...
                      </>
                    ) : 'Unirse'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-black w-full py-20 border-t border-white/5 flex flex-col items-center gap-8 max-w-7xl mx-auto px-8">
        <div className="flex gap-8">
          {data.links.filter(l => l.active).slice(0, 3).map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium tracking-[0.2em] uppercase text-white/40 hover:text-[#CC4E3D] transition-colors font-label"
            >
              {link.platform}
            </a>
          ))}
        </div>
        <p className="font-label text-xs font-medium tracking-[0.2em] uppercase text-white/40">
          © 2024 {data.profile.name}. ALL RIGHTS RESERVED.
        </p>
      </footer>

      {/* ── Bottom NavBar ── */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-12 items-center z-50 bg-[#1a1a1a]/80 backdrop-blur-2xl w-auto rounded-full px-8 py-3 shadow-[0_0_40px_rgba(204,78,61,0.15)] md:hidden">
        <a href="#" className="flex flex-col items-center justify-center text-[#CC4E3D]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>audiotrack</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MUSIC</span>
        </a>
        <a
          href="#shows"
          onClick={e => { e.preventDefault(); document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' }); }}
          className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">confirmation_number</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">SHOWS</span>
        </a>
        <a
          href="#merch"
          onClick={e => { e.preventDefault(); document.getElementById('merch')?.scrollIntoView({ behavior: 'smooth' }); }}
          className="flex flex-col items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">payments</span>
          <span className="font-label text-[8px] font-bold tracking-widest uppercase mt-1">MERCH</span>
        </a>
      </nav>
    </div>
  );
};

export default PublicLinks;
