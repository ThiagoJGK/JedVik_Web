import { Link } from 'react-router-dom';

const Proximamente = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 space-y-8 max-w-md">
        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-5xl text-white/20 animate-pulse">construction</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="font-headline font-black text-6xl tracking-tighter uppercase text-white leading-none">
            En<br />Proceso
          </h1>
          <p className="font-label text-xs uppercase tracking-[0.4em] text-white/40 leading-relaxed font-bold">
            Esta sección estará disponible próximamente con todo lo nuevo de Jed Vik
          </p>
        </div>
        
        <div className="h-px bg-white/5 w-1/2 mx-auto" />
        
        <Link 
          to="/" 
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-headline font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Regresar al inicio
        </Link>
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <h2 className="font-headline font-black tracking-tighter text-white/10 uppercase text-3xl">JED VIK</h2>
      </div>
    </div>
  );
};

export default Proximamente;
