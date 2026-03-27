import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservasApi } from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, DollarSign } from 'lucide-react';

export default function ResidenteReservas() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    area_comun_id: '', inicio_at: '', fin_at: '', num_personas: 2
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn:  () => reservasApi.areas().then(r => r.data)
  });

  const { data: reservasData } = useQuery({
    queryKey: ['reservas-res'],
    queryFn:  () => reservasApi.listar().then(r => r.data)
  });

  const crearMut = useMutation({
    mutationFn: reservasApi.crear,
    onSuccess:  () => {
      toast.success('✅ Reserva confirmada');
      qc.invalidateQueries({ queryKey: ['reservas-res'] });
      setForm({ area_comun_id: '', inicio_at: '', fin_at: '', num_personas: 2 });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Horario no disponible')
  });

  const areas    = areasData?.areas || [];
  const reservas = reservasData?.reservas || [];
  const areaSeleccionada = areas.find(a => a.id === form.area_comun_id);

  const estadoBadge = (estado) => ({
    confirmada: 'badge-green',
    cancelada:  'badge-red',
    completada: 'badge-gray',
    no_asistio: 'badge-yellow'
  }[estado] || 'badge-gray');

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Reservar espacio</h1>

      {/* Areas disponibles */}
      <div className="grid grid-cols-2 gap-3">
        {areas.map(a => (
          <button
            key={a.id}
            onClick={() => setForm(f => ({ ...f, area_comun_id: a.id }))}
            className={`card p-3 text-left transition-all ${
              form.area_comun_id === a.id
                ? 'ring-2 ring-primary-400 border-primary-200'
                : 'hover:border-gray-300'
            }`}
          >
            <p className="font-medium text-sm text-gray-800">{a.nombre}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={11} /> {a.aforo_max}
              </span>
              {a.costo_reserva > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign size={11} /> {a.costo_reserva.toLocaleString('es-CL')}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Formulario */}
      {form.area_comun_id && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <h2 className="text-sm font-semibold text-gray-700">
            Reservar: {areaSeleccionada?.nombre}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio</label>
              <input type="datetime-local" className="input text-xs"
                value={form.inicio_at}
                onChange={e => setForm(f => ({ ...f, inicio_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fin</label>
              <input type="datetime-local" className="input text-xs"
                value={form.fin_at}
                onChange={e => setForm(f => ({ ...f, fin_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Número de personas</label>
            <input type="number" className="input" min={1}
              max={areaSeleccionada?.aforo_max || 50}
              value={form.num_personas}
              onChange={e => setForm(f => ({ ...f, num_personas: Number(e.target.value) }))} />
          </div>
          {areaSeleccionada?.costo_reserva > 0 && (
            <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <DollarSign size={13} />
              Costo de reserva: ${areaSeleccionada.costo_reserva.toLocaleString('es-CL')} CLP
            </div>
          )}
          <button
            className="btn-primary w-full justify-center"
            disabled={crearMut.isPending || !form.inicio_at || !form.fin_at}
            onClick={() => crearMut.mutate(form)}
          >
            <Calendar size={15} />
            {crearMut.isPending ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      )}

      {/* Mis reservas */}
      {reservas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Mis reservas</h2>
          {reservas.map(r => (
            <div key={r.id} className="card p-4 flex justify-between items-center gap-3">
              <div>
                <p className="font-medium text-sm text-gray-800">{r.area_nombre}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(r.inicio_at), 'dd MMM HH:mm', { locale: es })} –{' '}
                  {format(new Date(r.fin_at), 'HH:mm')}
                </p>
                {r.costo_cobrado > 0 && (
                  <p className="text-xs text-gray-400">
                    ${r.costo_cobrado.toLocaleString('es-CL')}
                  </p>
                )}
              </div>
              <span className={`badge ${estadoBadge(r.estado)} shrink-0`}>
                {r.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
