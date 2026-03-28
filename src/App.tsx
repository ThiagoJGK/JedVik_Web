import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLinks from './pages/PublicLinks';
import EnDesarrollo from './pages/EnDesarrollo';

// Admin - currently being redesigned from scratch
const AdminPlaceholder = () => <EnDesarrollo nombre="Panel de Administración" />;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLinks />} />

        {/* Admin - En Desarrollo */}
        <Route path="/admin" element={<AdminPlaceholder />} />
        <Route path="/admin/*" element={<AdminPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
