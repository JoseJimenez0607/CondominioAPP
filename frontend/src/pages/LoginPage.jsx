import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react';
import { authApi } from '@/services/api';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const navigate  = useNavigate();
  const login     = useAuthStore((s) => s.login);
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data.user, data.token);
      const routes = { admin: '/admin', conserje: '/conserje', guardia: '/conserje', residente: '/residente' };
      navigate(routes[data.user.rol] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Condominio App</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión inteligente de tu condominio</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="nombre@edificio.cl"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-500">Credenciales de prueba:</p>
            <p>Admin: <span className="font-mono">admin@edificioaurora.cl</span></p>
            <p>Conserje: <span className="font-mono">conserje@edificioaurora.cl</span></p>
            <p>Residente: <span className="font-mono">ana.rodriguez@gmail.com</span></p>
            <p className="italic">Password: <span className="font-mono">123456</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Condominio App · SaaS v1.0
        </p>
      </div>
    </div>
  );
}
