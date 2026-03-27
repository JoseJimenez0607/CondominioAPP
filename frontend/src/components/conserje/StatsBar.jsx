import { useQuery } from '@tanstack/react-query';
import { visitasApi } from '@/services/api';
import { useSocket } from '@/services/socket';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Package, Wrench, ParkingSquare } from 'lucide-react';

function Stat({ icon: Icon, label, value, color = 'text-gray-800' }) {
  return (
    <div className="stat-card flex-row items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className={`text-xl font-semibold leading-none ${color}`}>{value ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/**
 * Barra de estadísticas en tiempo real para el panel del conserje.
 * Se auto-actualiza cada 30 segundos y via WebSocket.
 */
export default function StatsBar() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey:       ['dashboard'],
    queryFn:        () => visitasApi.dashboard().then((r) => r.data),
    refetchInterval: 30000,
  });

  useSocket({
    'visita:entrada': () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    'visita:salida':  () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const s = data?.stats || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat icon={Users}          label="Dentro ahora"      value={s.visitas_dentro}       color="text-green-600" />
      <Stat icon={Users}          label="Visitas hoy"        value={s.visitas_hoy}          color="text-blue-600"  />
      <Stat icon={Package}        label="Paquetes pendientes" value={s.paquetes_pendientes}  color="text-indigo-500" />
      <Stat icon={Wrench}         label="Tickets abiertos"   value={s.tickets_pendientes}   color="text-orange-500" />
    </div>
  );
}
