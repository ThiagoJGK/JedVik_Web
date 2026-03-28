const EnDesarrollo = ({ nombre }: { nombre: string }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
    <span className="material-symbols-outlined text-6xl text-white/10 mb-6">construction</span>
    <h1 className="font-headline font-black text-5xl tracking-tighter uppercase text-white mb-3">
      {nombre}
    </h1>
    <p className="font-label text-sm tracking-[0.3em] uppercase text-white/30">En Desarrollo</p>
    <div className="mt-8 w-24 h-1 rounded-full bg-primary-gradient" />
    <p className="mt-8 text-white/20 font-body text-xs">Pronto disponible</p>
  </div>
);

export default EnDesarrollo;
