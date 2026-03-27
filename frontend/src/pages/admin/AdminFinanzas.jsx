import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function AdminFinanzas() {
  const qc = useQueryClient();
  const now = new Date();
  const [filtros, setFiltros] = useState({
    mes:    now.getMonth() + 1,
    anio:   now.getFullYear(),
    estado: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['gastos', filtros],
    queryFn:  () => finanzasApi.gastos(filtros).then(r => r.data)
  });

  const { data: morData } = useQuery({
    queryKey: ['morosidad'],
    queryFn:  () => finanzasApi.morosidad().then(r => r.data)
  });

  const pagarMut = useMutation({
    mutationFn: (id) => finanzasApi.pagar(id, {}),
    onSuccess:  () => {
      toast.success('Pago registrado');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['morosidad'] });
    },
    onError: () => toast.error('Error al registrar pago')
  });

  const gastos  = data?.gastos || [];
  const morosos = morData?.morosidad || [];

  const totalPendiente = gastos
    .filter(g => g.estado_pago !== 'pagado')
    .reduce((s, g) => s + Number(g.monto_total), 0);

  const totalPagado = gastos
    .filter(g => g.estado_pago === 'pagado')
    .reduce((s, g) => s + Number(g.monto_total), 0);

  const estadoBadge = (e) => ({
    pagado:   'badge-green',
    pendiente:'badge-yellow',
    moroso:   'badge-red',
    exento:   'badge-gray'
  }[e] || 'badge-gray');

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Finanzas y Gastos Comunes</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-value text-green-600">
            ${totalPagado.toLocaleString('es-CL')}
          </span>
          <span className="stat-label">Recaudado</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-orange-500">
            ${totalPendiente.toLocaleString('es-CL')}
          </span>
          <span className="stat-label">Pendiente</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-red-500">{morosos.length}</span>
          <span className="stat-label">Morosos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div>
          <label className="label">Mes</label>
          <select className="input w-36" value={filtros.mes}
            onChange={e => setFiltros(f => ({ ...f, mes: Number(e.target.value) }))}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Año</label>
          <select className="input w-28" value={filtros.anio}
            onChange={e => setFiltros(f => ({ ...f, anio: Number(e.target.value) }))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input w-36" value={filtros.estado}
            onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="moroso">Moroso</option>
          </select>
        </div>
      </div>

      {/* Tabla gastos */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-700">
            Gastos {MESES[filtros.mes - 1]} {filtros.anio}
          </h2>
          <span className="text-xs text-gray-400">{gastos.length} unidades</span>
        </div>
        <div className="table-wrapper border-0 rounded-t-none">
          <table className="table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Monto base</th>
                <th>Extra</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Pagado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Cargando...</td></tr>
              )}
              {!isLoading && gastos.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Sin registros</td></tr>
              )}
              {gastos.map(g => (
                <tr key={g.id}>
                  <td className="font-medium">Dpto. {g.unidad_numero}</td>
                  <td className="font-mono text-sm">${Number(g.monto_base).toLocaleString('es-CL')}</td>
                  <td className="font-mono text-sm text-gray-500">
                    {g.monto_extra > 0 ? `+$${Number(g.monto_extra).toLocaleString('es-CL')}` : '—'}
                  </td>
                  <td className="font-mono text-sm font-medium">
                    ${Number(g.monto_total).toLocaleString('es-CL')}
                  </td>
                  <td><span className={`badge ${estadoBadge(g.estado_pago)}`}>{g.estado_pago}</span></td>
                  <td className="text-xs text-gray-500">
                    {g.pagado_at
                      ? new Date(g.pagado_at).toLocaleDateString('es-CL')
                      : '—'}
                  </td>
                  <td>
                    {g.estado_pago !== 'pagado' && g.estado_pago !== 'exento' && (
                      <button
                        className="btn-success btn-sm gap-1"
                        onClick={() => pagarMut.mutate(g.id)}
                        disabled={pagarMut.isPending}
                      >
                        <CheckCircle size={13} /> Marcar pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Morosos */}
      {morosos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" /> Resumen de morosidad
            </h2>
          </div>
          <div className="table-wrapper border-0 rounded-t-none">
            <table className="table">
              <thead>
                <tr><th>Unidad</th><th>Meses adeudados</th><th>Deuda total</th><th>Último mes</th></tr>
              </thead>
              <tbody>
                {morosos.map((m, i) => (
                  <tr key={i}>
                    <td className="font-medium">Dpto. {m.unidad}</td>
                    <td><span className="badge-red badge">{m.meses_morosos} meses</span></td>
                    <td className="font-mono font-semibold text-red-600">
                      ${Number(m.deuda_total).toLocaleString('es-CL')}
                    </td>
                    <td className="text-sm text-gray-500">
                      {MESES[(m.ultimo_mes_moroso % 100) - 1]} {Math.floor(m.ultimo_mes_moroso / 100)}
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
