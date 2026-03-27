import { useQuery } from '@tanstack/react-query';
import { encomiendas_api, ticketsApi } from '@/services/api';
import { Package, AlertCircle } from 'lucide-react';

export default function ResidenteDashboard() {
  const { data: enc }  = useQuery({ queryKey: ['enc-res'],     queryFn: () => encomiendas_api.listar().then(r => r.data) });
  const { data: tick } = useQuery({ queryKey: ['tickets-res'], queryFn: () => ticketsApi.listar({ estado: 'pendiente' }).then(r => r.data) });

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Mi Condominio</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><span className="stat-value text-blue-600">{enc?.encomiendas?.length || 0}</span><span className="stat-label">Paquetes</span></div>
        <div className="stat-card"><span className="stat-value text-orange-500">{tick?.tickets?.length || 0}</span><span className="stat-label">Tickets abiertos</span></div>
      </div>
      {enc?.encomiendas?.length > 0 && (
        <div className="card p-4 border-l-4 border-l-blue-400">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-blue-500 shrink-0" />
            <div>
              <p className="font-medium text-sm">Tienes {enc.encomiendas.length} paquete(s) en conserjería</p>
              <p className="text-xs text-gray-500">Retira en horario de atención</p>
            </div>
          </div>
        </div>
      )}
      {tick?.tickets?.map(t => (
        <div key={t.id} className="card p-4 border-l-4 border-l-orange-400">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-orange-500 shrink-0" />
            <div>
              <p className="font-medium text-sm">{t.titulo}</p>
              <p className="text-xs text-gray-500 capitalize">{t.estado.replace('_', ' ')} · {t.categoria}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
