import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ESTADOS = ['pendiente','en_revision','resuelto'];
const ESTADO_COLOR = { pendiente:'badge-red', en_revision:'badge-yellow', resuelto:'badge-green' };
const PRIORIDAD_LABEL = { 1:'Alta', 2:'Media', 3:'Baja' };

export default function TicketsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn:  () => ticketsApi.listar().then(r => r.data),
    refetchInterval: 30000
  });

  const updateMut = useMutation({
    mutationFn: ({id, estado}) => ticketsApi.actualizar(id, {estado}),
    onSuccess:  () => { toast.success('Ticket actualizado'); qc.invalidateQueries({queryKey:['tickets']}); },
    onError:    () => toast.error('Error')
  });

  const tickets = data?.tickets || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Tickets de Incidencias</h1>
      <div className="grid grid-cols-3 gap-3">
        {ESTADOS.map(e=>(
          <div key={e} className="stat-card">
            <span className="stat-value">{tickets.filter(t=>t.estado===e).length}</span>
            <span className="stat-label capitalize">{e.replace('_',' ')}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="table-wrapper border-0">
          <table className="table">
            <thead><tr><th>Título</th><th>Categoría</th><th>Depto.</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center text-gray-400 py-8">Cargando...</td></tr>}
              {tickets.map(t=>(
                <tr key={t.id}>
                  <td className="font-medium max-w-xs truncate">{t.titulo}</td>
                  <td className="capitalize text-gray-500">{t.categoria}</td>
                  <td>Dpto. {t.unidad_numero}</td>
                  <td><span className={`badge ${t.prioridad===1?'badge-red':t.prioridad===2?'badge-yellow':'badge-gray'}`}>{PRIORIDAD_LABEL[t.prioridad]}</span></td>
                  <td><span className={ESTADO_COLOR[t.estado]+' badge'}>{t.estado.replace('_',' ')}</span></td>
                  <td className="text-xs text-gray-400">{format(new Date(t.created_at),'dd/MM/yy')}</td>
                  <td>
                    <select className="input text-xs py-1 w-32" value={t.estado}
                      onChange={e=>updateMut.mutate({id:t.id, estado:e.target.value})}>
                      {ESTADOS.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
