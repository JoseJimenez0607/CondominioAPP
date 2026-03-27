import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estacionamientosApi } from '@/services/api';
import { useSocket } from '@/services/socket';
import toast from 'react-hot-toast';
import { Car, Unlock } from 'lucide-react';

function CalzoCard({ calzo, onLiberar }) {
  const mins = calzo.minutos_estacionado || 0;
  const pct  = calzo.max_horas ? Math.min((mins / (calzo.max_horas * 60)) * 100, 100) : 0;
  const estado = calzo.estado;

  const colors = {
    libre:   'border-green-200 bg-green-50',
    ocupado: calzo.en_alerta ? 'border-yellow-300 bg-yellow-50' : 'border-blue-200 bg-blue-50',
    reservado: 'border-purple-200 bg-purple-50',
    bloqueado: 'border-gray-200 bg-gray-50',
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${colors[estado] || colors.libre}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg">{calzo.codigo}</span>
        {calzo.en_alerta && <span className="text-xs text-yellow-600 font-medium animate-pulse">⚠ Tiempo</span>}
        {estado === 'libre' && <span className="text-xs text-green-600 font-medium">Libre</span>}
      </div>
      {estado !== 'libre' && estado !== 'bloqueado' ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-800 truncate">{calzo.nombre_visita}</p>
          <p className="text-xs text-gray-500">Dpto. {calzo.unidad_destino}</p>
          <p className="text-xs text-gray-500 font-mono">
            {Math.floor(mins/60)}h {mins%60}m / {calzo.max_horas}h máx
          </p>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-yellow-500' : 'bg-blue-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <button onClick={() => onLiberar(calzo.id)} className="btn-secondary btn-sm w-full gap-1 mt-1">
            <Unlock size={12} /> Liberar
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center h-12">
          <Car size={24} className="text-green-400" />
        </div>
      )}
    </div>
  );
}

export default function EstacionamientosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['estacionamientos'],
    queryFn:  () => estacionamientosApi.listar().then(r => r.data),
    refetchInterval: 15000
  });

  useSocket({ 'parking:liberado': () => qc.invalidateQueries({ queryKey: ['estacionamientos'] }) });

  const liberarMutation = useMutation({
    mutationFn: estacionamientosApi.liberar,
    onSuccess:  () => { toast.success('Calzo liberado'); qc.invalidateQueries({ queryKey: ['estacionamientos'] }); },
    onError:    () => toast.error('Error al liberar calzo')
  });

  const calzos   = data?.calzos || [];
  const libres   = calzos.filter(c => c.estado === 'libre').length;
  const ocupados = calzos.filter(c => c.estado !== 'libre').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Estacionamientos de Visitas</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card"><span className="stat-value text-green-600">{libres}</span><span className="stat-label">Libres</span></div>
        <div className="stat-card"><span className="stat-value text-blue-600">{ocupados}</span><span className="stat-label">Ocupados</span></div>
        <div className="stat-card"><span className="stat-value">{calzos.length}</span><span className="stat-label">Total</span></div>
      </div>
      {isLoading ? (
        <div className="text-center text-gray-400 py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {calzos.map(c => (
            <CalzoCard key={c.id} calzo={c} onLiberar={liberarMutation.mutate} />
          ))}
        </div>
      )}
    </div>
  );
}
