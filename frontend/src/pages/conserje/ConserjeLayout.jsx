import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Building2, Users, Car, Package, Wrench,
  LogOut, Bell, ChevronRight, Menu, X
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { useSocket } from '@/services/socket';
import toast from 'react-hot-toast';

const nav = [
  { to: 'visitas',          icon: Users,   label: 'Visitas' },
  { to: 'estacionamientos', icon: Car,     label: 'Estacionamientos' },
  { to: 'encomiendas',      icon: Package, label: 'Encomiendas' },
  { to: 'tickets',          icon: Wrench,  label: 'Tickets' },
  { to: 'reservas',         icon: Calendar, label: 'Reservas' },
];

function Clock() {
  const [time, setTime] = useState(() => new Date());
  useState(() => { // mini clock
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  });
  return (
    <span className="font-mono text-sm text-gray-500 tabular-nums">
      {time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function ConserjeLayout() {
  const { user, logout }  = useAuthStore();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);

  // Notificaciones en tiempo real
  useSocket({
    'visita:entrada': (data) => {
      toast.success(`🚪 Nueva visita: ${data.nombre_visita} → Dpto. ${data.unidad_destino_id?.slice(0,6)}`);
    },
    'parking:liberado': () => {
      toast('🅿️ Calzo liberado', { icon: '✅' });
    }
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white border-r border-gray-100
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Conserjería</p>
            <p className="text-xs text-gray-400 truncate">{user?.condominio_nombre}</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setOpen(false)}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.rol}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-icon text-gray-400 hover:text-red-500">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button className="btn-icon lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-xs text-gray-500 font-medium">En vivo</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Clock />
            <button className="btn-icon relative text-gray-500">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
