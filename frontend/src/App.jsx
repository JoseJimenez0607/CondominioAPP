import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

// Páginas
import LoginPage         from '@/pages/LoginPage';
import ConserjeLayout    from '@/pages/conserje/ConserjeLayout';
import VisitasPage       from '@/pages/conserje/VisitasPage';
import EstacionamientosPage from '@/pages/conserje/EstacionamientosPage';
import Encomiendas_Page  from '@/pages/conserje/Encomiendas_Page';
import TicketsPage       from '@/pages/conserje/TicketsPage';
import ResidenteLayout   from '@/pages/residente/ResidenteLayout';
import ResidenteDashboard from '@/pages/residente/ResidenteDashboard';
import ResidenteReservas from '@/pages/residente/ResidenteReservas';
import ResidenteTickets  from '@/pages/residente/ResidenteTickets';
import ResidenteQR       from '@/pages/residente/ResidenteQR';
import AdminLayout       from '@/pages/admin/AdminLayout';
import AdminDashboard    from '@/pages/admin/AdminDashboard';
import AdminFinanzas     from '@/pages/admin/AdminFinanzas';
import AdminReportes     from '@/pages/admin/AdminReportes';
import AdminConfiguracion from '@/pages/admin/AdminConfiguracion';
import NotFound          from '@/pages/NotFound';

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.rol)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const routes = { admin: '/admin', conserje: '/conserje', guardia: '/conserje', residente: '/residente' };
  return <Navigate to={routes[user.rol] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"      element={<RoleRedirect />} />

      {/* Conserje / Guardia */}
      <Route path="/conserje" element={
        <ProtectedRoute roles={['conserje','guardia','admin']}>
          <ConserjeLayout />
        </ProtectedRoute>
      }>
        <Route index                     element={<Navigate to="visitas" replace />} />
        <Route path="visitas"            element={<VisitasPage />} />
        <Route path="estacionamientos"   element={<EstacionamientosPage />} />
        <Route path="encomiendas"        element={<Encomiendas_Page />} />
        <Route path="tickets"            element={<TicketsPage />} />
      </Route>

      {/* Residente */}
      <Route path="/residente" element={
        <ProtectedRoute roles={['residente']}>
          <ResidenteLayout />
        </ProtectedRoute>
      }>
        <Route index              element={<Navigate to="inicio" replace />} />
        <Route path="inicio"      element={<ResidenteDashboard />} />
        <Route path="reservas"    element={<ResidenteReservas />} />
        <Route path="tickets"     element={<ResidenteTickets />} />
        <Route path="qr"          element={<ResidenteQR />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"      element={<AdminDashboard />} />
        <Route path="finanzas"       element={<AdminFinanzas />} />
        <Route path="reportes"       element={<AdminReportes />} />
        <Route path="configuracion"  element={<AdminConfiguracion />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
