import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CMSProvider } from './context/CMSContext';
import { AuthProvider } from './context/AuthContext';
import PublicLinks from './pages/PublicLinks';
import Proximamente from './pages/Proximamente';
import PromoPage from './pages/PromoPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminStats from './pages/admin/pages/AdminStats';
import AdminLinks from './pages/admin/pages/AdminLinks';
import AdminPerfil from './pages/admin/pages/AdminPerfil';
import AdminLanzamiento from './pages/admin/pages/AdminLanzamiento';
import AdminFans from './pages/admin/pages/AdminFans';
import AdminMore from './pages/admin/pages/AdminMore';
import AdminEnDesarrollo from './pages/admin/pages/AdminEnDesarrollo';
import AdminPromoLinks from './pages/admin/pages/AdminPromoLinks';
import AdminPromoLinkEditor from './pages/admin/pages/AdminPromoLinkEditor';

function App() {
  return (
    <AuthProvider>
      <CMSProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing */}
            <Route path="/" element={<PublicLinks />} />

            {/* Public promo pages */}
            <Route path="/p/:slug" element={<PromoPage />} />

            {/* Admin login (public) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/proximamente" element={<Proximamente />} />

            {/* Admin panel (protected via AdminLayout) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminStats />} />
              <Route path="links" element={<AdminLinks />} />
              <Route path="shows" element={<AdminEnDesarrollo />} />
              <Route path="perfil" element={<AdminPerfil />} />
              <Route path="lanzamiento" element={<AdminLanzamiento />} />
              <Route path="promo" element={<AdminPromoLinks />} />
              <Route path="promo/new" element={<AdminPromoLinkEditor />} />
              <Route path="promo/:id/edit" element={<AdminPromoLinkEditor />} />
              <Route path="merch" element={<AdminEnDesarrollo />} />
              <Route path="fans" element={<AdminFans />} />
              <Route path="more" element={<AdminMore />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CMSProvider>
    </AuthProvider>
  );
}

export default App;

