import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservasApi } from '@/services/api'; // <-- Importación corregida
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, CalendarClock } from 'lucide-react';

export default function ReservasConserjePage() {
  const qc = useQueryClient();

  // Obtener reservas pendientes usando reservasApi
  const { data, isLoading } = useQuery({
    queryKey: ['reservas-pendientes'],
  queryFn: () => reservasApi.pendientes().then(r => r.data)
  });

  // Mutación para aprobar
  const aprobarMut = useMutation({
    mutationFn: (id) => reservasApi.aprobar(id), // <-- Corregido
    onSuccess: () => {
      toast.success('Reserva aprobada');
      qc.invalidateQueries({ queryKey: ['reservas-pendientes'] });
    }
  });

  // Mutación para rechazar
  const rechazarMut = useMutation({
    mutationFn: (id) => reservasApi.rechazar(id, 'Rechazada por conserjería'), // <-- Corregido
    onSuccess: () => {
      toast.error('Reserva rechazada');
      qc.invalidateQueries({ queryKey: ['reservas-pendientes'] });
    }
  });

  const reservas = data?.reservas || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
        <CalendarClock size={20} />
        Aprobación de Reservas
        {reservas.length > 0 && <span className="badge-yellow">{reservas.length}</span>}
      </h1>

      {isLoading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : reservas.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay reservas pendientes de aprobación</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservas.map(r => (
            <div key={r.id} className="card p-4 space-y-3 border-l-4 border-l-yellow-400">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{r.area_nombre}</h3>
                  <p className="text-sm text-gray-600">Dpto. {r.unidad_numero} — {r.reservada_por}</p>
                </div>
                <span className="badge-yellow text-xs">Pendiente</span>
              </div>
              
              <div className="bg-gray-50 p-2 rounded text-sm text-gray-600">
                <p><strong>Inicio:</strong> {format(new Date(r.inicio_at), "dd MMM HH:mm", { locale: es })}</p>
                <p><strong>Fin:</strong> {format(new Date(r.fin_at), "dd MMM HH:mm", { locale: es })}</p>
                <p><strong>Personas:</strong> {r.num_personas}</p>
                {r.notas && <p className="mt-1 italic text-gray-500">Nota: "{r.notas}"</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  className="btn-success btn-sm flex-1 justify-center gap-1.5"
                  onClick={() => aprobarMut.mutate(r.id)}
                  disabled={aprobarMut.isPending}
                >
                  <CheckCircle size={15} /> Aprobar
                </button>
                <button 
                  className="btn-secondary text-red-600 btn-sm flex-1 justify-center gap-1.5"
                  onClick={() => rechazarMut.mutate(r.id)}
                  disabled={rechazarMut.isPending}
                >
                  <XCircle size={15} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}