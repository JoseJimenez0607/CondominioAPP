import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesApi } from '@/services/api';
import { BarChart2, Users, QrCode, Car } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function MetricBlock({ icon: Icon, label, value, color = 'text-gray-800' }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <Icon size={22} className={`shrink-0 ${color}`} />
      <div>
        <p className={`text-2xl font-semibold ${color}`}>{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminReportes() {
  const now = new Date();
  const [params, setParams] = useState({
    mes:  now.getMonth() + 1,
    anio: now.getFullYear()
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-visitas', params],
    queryFn:  () => reportesApi.visitas(params).then(r => r.data)
  });

  const r = data?.reporte || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Reportes</h1>
        <div className="flex gap-3">
          <select className="input w-36" value={params.mes}
            onChange={e => setParams(p => ({ ...p, mes: Number(e.target.value) }))}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-28" value={params.anio}
            onChange={e => setParams(p => ({ ...p, anio: Number(e.target.value) }))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-500">
        Visitas — {MESES[params.mes - 1]} {params.anio}
      </h2>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Cargando reporte...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBlock icon={Users}   label="Total visitas"         value={r.total}              color="text-blue-600" />
            <MetricBlock icon={Users}   label="Completadas"           value={r.completadas}        color="text-green-600" />
            <MetricBlock icon={QrCode}  label="Con QR pre-aprobado"   value={r.con_qr}             color="text-purple-600" />
            <MetricBlock icon={Car}     label="Con vehículo"          value={r.con_vehiculo}        color="text-orange-500" />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución por horario</h3>
            <div className="space-y-3">
              {[
                { label: 'Mañana (08:00–12:00)',  val: r.visitas_manana,  color: 'bg-blue-400' },
                { label: 'Tarde (12:00–18:00)',   val: r.visitas_tarde,   color: 'bg-green-400' },
                { label: 'Noche (18:00–00:00)',   val: r.visitas_noche,   color: 'bg-purple-400' },
              ].map(({ label, val, color }) => {
                const total = Number(r.total) || 1;
                const pct   = Math.round((Number(val) / total) * 100) || 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{label}</span>
                      <span className="font-mono">{val ?? 0} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Duración promedio de visita</h3>
            <p className="text-3xl font-semibold text-gray-900">
              {r.duracion_promedio_min
                ? `${Math.floor(r.duracion_promedio_min / 60)}h ${r.duracion_promedio_min % 60}m`
                : '—'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Tiempo promedio entre entrada y salida</p>
          </div>
        </>
      )}
    </div>
  );
}
