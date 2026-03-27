import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Wrench, QrCode, LogOut, Building2 } from 'lucide-react';
import useAuthStore from '@/store/authStore';

const nav = [
  { to:'inicio',   icon:Home,     label:'Inicio' },
  { to:'reservas', icon:Calendar, label:'Reservas' },
  { to:'tickets',  icon:Wrench,   label:'Reportar' },
  { to:'qr',       icon:QrCode,   label:'Mi QR' },
];

export default function ResidenteLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Dpto. {user?.unidad_numero}</p>
          <p className="text-xs text-gray-400">{user?.nombre}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="ml-auto btn-icon text-gray-400">
          <LogOut size={16} />
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 text-xs gap-1 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`
          }>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
