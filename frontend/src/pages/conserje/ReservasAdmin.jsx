import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fetchPendientes = () => api.get('/reservas/pendientes').then(r => r.data);
const fetchTodas      = (estado) => api.get('/reservas', { params: estado ? { estado } : {} }).then(r => r.data);
const aprobar  = (id)          => api.put(`/reservas/${id}/aprobar`).then(r => r.data);
const rechazar = (id, motivo)  => api.put(`/reservas/${id}/rechazar`, { motivo }).then(r => r.data);

function EstadoBadge({ estado }) {
  const map = {
    pendiente_aprobacion: <span className="badge badge-yellow">Pendiente</span>,
    confirmada:           <span className="badge badge-green">Confirmada</span>,
    cancelada:            <span className="badge badge-red">Cancelada</span>,
    completada:           <span className="badge badge-gray">Completada</span>,
    no_asistio:           <span className="badge badge-yellow">No asistió</span>,
  };
  return map[estado] || <span className="badge badge-gray">{estado}</span>;
}

export default function ReservasAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pendientes');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazandoId, setRechazandoId]   = useState(null);

  const { data: pendData, isLoading: loadPend } = useQuery({
    queryKey: ['reservas-pendientes'],
    queryFn:  fetchPendientes,
    refetchInterval: 20000
  });

  const { data: todasData, isLoading: loadTodas } = useQuery({
    queryKey: ['reservas-todas'],
    queryFn:  () => fetchTodas(),
    refetchInterval: 30000
  });

  const aprobarMut = useMutation({
    mutationFn: aprobar,
    onSuccess: () => {
      toast.success('✅ Reserva aprobada');
      qc.invalidateQueries({ queryKey: ['reservas-pendientes'] });
      qc.invalidateQueries({ queryKey: ['reservas-todas'] });
    },
    onError: () => toast.error('Error al aprobar')
  });

  const rechazarMut = useMutation({
    mutationFn: ({ id, motivo }) => rechazar(id, motivo),
    onSuccess: () => {
      toast.success('Reserva rechazada');
      setRechazandoId(null);
      setMotivoRechazo('');
      qc.invalidateQueries({ queryKey: ['reservas-pendientes'] });
      qc.invalidateQueries({ queryKey: ['reservas-todas'] });
    },
    onError: () => toast.error('Error al rechazar')
  });

  const pendientes = pendData?.reservas || [];
  const todas      = todasData?.reservas || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Reservas de Espacios</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('pendientes')}
            className={`btn-sm ${tab === 'pendientes' ? 'btn-primary' : 'btn-secondary'} relative`}
          >
            <Clock size={14} /> Pendientes
            {pendientes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {pendientes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('todas')}
            className={`btn-sm ${tab === 'todas' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Calendar size={14} /> Todas
          </button>
        </div>
      </div>

      {/* TAB: Pendientes de aprobación */}
      {tab === 'pendientes' && (
        <div className="space-y-3">
          {loadPend && <div className="text-center text-gray-400 py-8">Cargando...</div>}
          {!loadPend && pendientes.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Sin solicitudes pendientes</p>
            </div>
          )}
          {pendientes.map(r => (
            <div key={r.id} className="card overflow-hidden">
              <div className="card-body">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{r.area_nombre}</span>
                      <EstadoBadge estado={r.estado} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> {r.reservada_por} — Dpto. {r.unidad_numero}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        {format(new Date(r.inicio_at), "d MMM yyyy", { locale: es })}
                      </span>
                      <span className="text-xs">
                        {format(new Date(r.inicio_at), 'HH:mm')} – {format(new Date(r.fin_at), 'HH:mm')}
                      </span>
                      <span className="text-xs">{r.num_personas} persona{r.num_personas !== 1 ? 's' : ''}</span>
                    </div>
                    {r.notas && (
                      <p className="text-xs text-gray-400 mt-2 italic">"{r.notas}"</p>
                    )}
                    {r.costo_cobrado > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Costo: ${r.costo_cobrado.toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                {rechazandoId === r.id ? (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Motivo del rechazo (opcional)..."
                      value={motivoRechazo}
                      onChange={e => setMotivoRechazo(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-danger btn-sm flex-1 justify-center"
                        disabled={rechazarMut.isPending}
                        onClick={() => rechazarMut.mutate({ id: r.id, motivo: motivoRechazo })}
                      >
                        <XCircle size={14} /> Confirmar rechazo
                      </button>
                      <button className="btn-secondary btn-sm"
                        onClick={() => { setRechazandoId(null); setMotivoRechazo(''); }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      className="btn-success btn-sm flex-1 justify-center gap-1.5"
                      disabled={aprobarMut.isPending}
                      onClick={() => aprobarMut.mutate(r.id)}
                    >
                      <CheckCircle size={14} /> Aprobar reserva
                    </button>
                    <button
                      className="btn-danger btn-sm flex-1 justify-center gap-1.5"
                      onClick={() => setRechazandoId(r.id)}
                    >
                      <XCircle size={14} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Todas las reservas */}
      {tab === 'todas' && (
        <div className="card">
          <div className="table-wrapper border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Espacio</th>
                  <th>Residente</th>
                  <th>Depto.</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th>Costo</th>
                </tr>
              </thead>
              <tbody>
                {loadTodas && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">Cargando...</td></tr>
                )}
                {!loadTodas && todas.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">Sin reservas registradas</td></tr>
                )}
                {todas.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.area_nombre}</td>
                    <td className="text-sm text-gray-600">{r.reservada_por}</td>
                    <td className="text-sm">Dpto. {r.unidad_numero}</td>
                    <td className="text-sm text-gray-600">
                      {format(new Date(r.inicio_at), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="text-sm font-mono text-gray-500">
                      {format(new Date(r.inicio_at), 'HH:mm')}–{format(new Date(r.fin_at), 'HH:mm')}
                    </td>
                    <td className="text-sm text-center">{r.num_personas}</td>
                    <td><EstadoBadge estado={r.estado} /></td>
                    <td className="text-sm font-mono">
                      {r.costo_cobrado > 0 ? `$${r.costo_cobrado.toLocaleString('es-CL')}` : 'Gratis'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
