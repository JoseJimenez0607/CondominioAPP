import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Building2, LayoutDashboard, DollarSign,
  BarChart2, Users, Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import useAuthStore from '@/store/authStore';

const nav = [
  { to: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: 'finanzas',     icon: DollarSign,      label: 'Finanzas' },
  { to: 'reportes',     icon: BarChart2,        label: 'Reportes' },
  { to: 'configuracion',icon: Settings,         label: 'Configuración' },
  { to: 'reservas', icon: Calendar, label: 'Reservas' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white border-r border-gray-100
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Administración</p>
            <p className="text-xs text-gray-400 truncate">{user?.condominio_nombre}</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setOpen(false)}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="ml-auto opacity-30" />
            </NavLink>
          ))}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <NavLink to="/conserje" className="nav-link text-gray-500">
              <Users size={18} />
              <span>Panel Conserjería</span>
            </NavLink>
          </div>
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
              {user?.nombre?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400">Administrador</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="btn-icon text-gray-400 hover:text-red-500">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button className="btn-icon lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} className="text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-600">Panel de Administración</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
