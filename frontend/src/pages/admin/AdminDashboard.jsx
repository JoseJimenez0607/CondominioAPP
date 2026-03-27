import { useQuery } from '@tanstack/react-query';
import { visitasApi, finanzasApi, ticketsApi, unidadesApi } from '@/services/api';
import { Users, DollarSign, AlertCircle, Home } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'text-gray-800', bg = 'bg-blue-50' }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn:  () => visitasApi.dashboard().then(r => r.data),
    refetchInterval: 30000
  });

  const { data: morosidad } = useQuery({
    queryKey: ['morosidad'],
    queryFn:  () => finanzasApi.morosidad().then(r => r.data)
  });

  const { data: tickets } = useQuery({
    queryKey: ['tickets-admin'],
    queryFn:  () => ticketsApi.listar({ estado: 'pendiente' }).then(r => r.data)
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades'],
    queryFn:  () => unidadesApi.listar().then(r => r.data)
  });

  const stats   = dashboard?.stats || {};
  const morosos = morosidad?.morosidad || [];
  const tks     = tickets?.tickets || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard General</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Visitas hoy"        value={stats.visitas_hoy}          icon={Users}       color="text-blue-600"   bg="bg-blue-50" />
        <StatCard label="Dentro ahora"       value={stats.visitas_dentro}       icon={Users}       color="text-green-600"  bg="bg-green-50" />
        <StatCard label="Unidades totales"   value={unidades?.unidades?.length} icon={Home}        color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Tickets pendientes" value={tks.length}                 icon={AlertCircle} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Morosidad */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <DollarSign size={16} className="text-red-500" /> Unidades morosas
            </h2>
            <span className="badge-red badge">{morosos.length}</span>
          </div>
          <div className="table-wrapper border-0 rounded-t-none">
            <table className="table">
              <thead>
                <tr><th>Unidad</th><th>Meses</th><th>Deuda total</th></tr>
              </thead>
              <tbody>
                {morosos.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-6 text-sm">Sin morosidad 🎉</td></tr>
                )}
                {morosos.map((m, i) => (
                  <tr key={i}>
                    <td className="font-medium">Dpto. {m.unidad}</td>
                    <td><span className="badge-red badge">{m.meses_morosos}</span></td>
                    <td className="font-mono text-sm text-red-600">
                      ${Number(m.deuda_total).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tickets recientes */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" /> Tickets pendientes
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tks.length === 0 && (
              <p className="text-center text-gray-400 py-6 text-sm">Sin tickets pendientes ✓</p>
            )}
            {tks.slice(0, 6).map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  t.prioridad === 1 ? 'bg-red-500' : t.prioridad === 2 ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{t.titulo}</p>
                  <p className="text-xs text-gray-400 capitalize">{t.categoria} · Dpto. {t.unidad_numero}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
