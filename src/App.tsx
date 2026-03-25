import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLinks from './pages/PublicLinks';
import AdminDashboard from './pages/AdminDashboard';
import Overview from './pages/admin/Overview';
import LinksMedia from './pages/admin/LinksMedia';
import TicketsShows from './pages/admin/TicketsShows';
import FanDatabase from './pages/admin/FanDatabase';
import Appearance from './pages/admin/Appearance';
import Settings from './pages/admin/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLinks />} />
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="links" element={<LinksMedia />} />
          <Route path="tickets" element={<TicketsShows />} />
          <Route path="fans" element={<FanDatabase />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
