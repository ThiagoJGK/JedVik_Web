import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/admin');
    } catch (err: any) {
      setError('Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary/30">
      {/* Terracota glow */}
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(circle at center, rgba(204,78,61,0.08) 0%, transparent 70%)' }} />

      {/* Hero name */}
      <header className="relative z-10 text-center mb-16 px-6 flex flex-col items-center">
        {/* Lock icon above title */}
        <span className="material-symbols-outlined text-white/20 text-2xl mb-4">lock</span>
        
        <h1 className="font-headline font-black text-7xl md:text-8xl tracking-tighter text-white uppercase leading-none">
          JED
        </h1>
        <div
          className="font-headline font-black text-7xl md:text-8xl tracking-tighter uppercase leading-none"
          style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent', marginTop: '-0.2em' }}
        >
          VIK
        </div>
        <div className="flex flex-col items-center mt-8">
          <div className="w-12 h-px bg-white/10 mb-4" />
          <span className="font-label text-[10px] uppercase tracking-[0.4em] text-white/30 font-medium">
            ADMIN ACCESS
          </span>
        </div>
      </header>

      {/* Form */}
      <main className="relative z-10 w-full max-w-[400px] px-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="EMAIL (thiagojgk@gmail.com)"
            className="w-full h-14 px-8 bg-surface-container-highest border-none text-white font-body text-sm rounded-full placeholder:text-white/20 focus:ring-2 focus:ring-white/10 outline-none transition-all"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="CONTRASEÑA (admin1234)"
            className="w-full h-14 px-8 bg-surface-container-highest border-none text-white font-body text-sm rounded-full placeholder:text-white/20 focus:ring-2 focus:ring-white/10 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-sm tracking-widest text-white uppercase active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #CC4E3D 0%, #f68a2f 100%)' }}
          >
            {loading ? (
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            ) : (
              <>ACCEDER <span className="material-symbols-outlined text-lg">arrow_right_alt</span></>
            )}
          </button>

          <div className="flex items-center gap-4 my-2">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] text-white/20 font-label uppercase tracking-widest">o bien</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-14 rounded-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 font-headline font-bold text-sm tracking-widest uppercase transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google Login
          </button>

          {error && (
            <p className="text-center text-xs text-red-400/80 font-body pt-1">{error}</p>
          )}
        </form>
      </main>

      <footer className="fixed bottom-12 z-10">
        <p className="font-label text-[10px] uppercase tracking-[0.15em] text-white/20">
          © 2024 Jed Vik. Panel Privado.
        </p>
      </footer>
    </div>
  );
};

export default AdminLogin;
