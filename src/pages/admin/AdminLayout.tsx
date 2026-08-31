import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/admin/Sidebar';
import BottomTabBar from '../../components/admin/BottomTabBar';

export const AUTHORIZED_ADMIN_EMAILS = [
  'jedvik.music@gmail.com',
  'thiagojgk@gmail.com',
  'test@jedvik.com'
];

const AdminLayout = () => {
  const { user, loading } = useAuth();

  const userToUse = user || (window.location.hostname === 'localhost' ? { email: 'jedvik.music@gmail.com' } as any : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  const isAuthorized = userToUse?.email && (
    AUTHORIZED_ADMIN_EMAILS.includes(userToUse.email.toLowerCase()) ||
    window.location.hostname === 'localhost'
  );

  if (!userToUse || !isAuthorized) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <Sidebar />

      {/* TopBar */}
      <header className="fixed top-0 right-0 left-0 md:left-60 h-16 z-30 flex items-center justify-between px-8 border-b border-white/5"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}
      >
        <Link to="/" className="font-headline font-black text-sm tracking-widest text-white uppercase hover:text-primary transition-colors">JED VIK · ADMIN</Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/10">
            <span className="font-headline font-black text-xs text-white uppercase">
              {userToUse?.email?.[0]?.toUpperCase() ?? 'J'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-24 md:pt-28 md:pl-60 pb-28 md:pb-10 min-h-screen bg-surface">
        <div className="px-6 md:px-10 py-4 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
};

export default AdminLayout;
