import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, QrCode, LogOut, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { visitasApi, unidadesApi } from '@/services/api';
import { useSocket } from '@/services/socket';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const EMPTY_FORM = {
  nombre_visita: '', rut_dni: '', patente: '',
  unidad_destino_id: '', calzo_id: '', codigo_qr: ''
};

function StatCard({ value, label, color = 'text-gray-800' }) {
  return (
    <div className="stat-card">
      <span className={`stat-value ${color}`}>{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const map = {
    dentro:    <span className="badge-green">Dentro</span>,
    salio:     <span className="badge-gray">Salió</span>,
    esperando: <span className="badge-yellow">Esperando</span>,
    rechazada: <span className="badge-red">Rechazada</span>,
  };
  return map[estado] || <span className="badge-gray">{estado}</span>;
}

export default function VisitasPage() {
  const qc   = useQueryClient();
  const [form, setForm]   = useState(EMPTY_FORM);
  const [buscar, setBuscar] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => visitasApi.dashboard().then(r => r.data),
    refetchInterval: 30000
  });

  const { data: visitasData, isLoading } = useQuery({
    queryKey: ['visitas'],
    queryFn:  () => visitasApi.listar().then(r => r.data),
    refetchInterval: 20000
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades'],
    queryFn:  () => unidadesApi.listar().then(r => r.data)
  });

  // Actualizar en tiempo real
  useSocket({
    'visita:entrada': () => qc.invalidateQueries({ queryKey: ['visitas'] }),
    'visita:salida':  () => qc.invalidateQueries({ queryKey: ['visitas'] }),
  });

  const entradaMutation = useMutation({
    mutationFn: visitasApi.entrada,
    onSuccess: () => {
      toast.success('✅ Visita registrada — Residente notificado');
      setForm(EMPTY_FORM);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['visitas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al registrar')
  });

  const salidaMutation = useMutation({
    mutationFn: visitasApi.salida,
    onSuccess: () => {
      toast.success('👋 Salida registrada');
      qc.invalidateQueries({ queryKey: ['visitas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Error al registrar salida')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre_visita || !form.rut_dni || !form.unidad_destino_id) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    entradaMutation.mutate({
      nombre_visita:    form.nombre_visita,
      rut_dni:          form.rut_dni,
      patente:          form.patente || undefined,
      unidad_destino_id: form.unidad_destino_id,
      calzo_id:         form.calzo_id || undefined,
      codigo_qr:        form.codigo_qr || undefined,
    });
  };

  const visitas = visitasData?.visitas || [];
  const stats   = dashData?.stats || {};
  const alertas = dashData?.alertas_parking || [];

  const filtradas = visitas.filter(v =>
    !buscar ||
    v.nombre_visita.toLowerCase().includes(buscar.toLowerCase()) ||
    v.rut_dni.includes(buscar) ||
    v.unidad_destino?.includes(buscar)
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={stats.visitas_dentro}  label="Dentro ahora"     color="text-green-600" />
        <StatCard value={stats.visitas_hoy}     label="Visitas hoy"      />
        <StatCard value={stats.paquetes_pendientes} label="Paquetes" color="text-blue-600" />
        <StatCard value={stats.tickets_pendientes}  label="Tickets abiertos" color="text-orange-500" />
      </div>

      {/* Alertas parking */}
      {alertas.map(a => (
        <div key={a.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={16} className="shrink-0 text-yellow-600" />
          <span>
            <strong>{a.nombre_visita}</strong> en calzo <strong>{a.calzo}</strong> — {Math.floor(a.minutos / 60)}h {a.minutos % 60}m (máx. {a.max_minutos / 60}h)
          </span>
          <button className="ml-auto btn-secondary btn-sm" onClick={() => toast('Notificación enviada al residente')}>
            Avisar
          </button>
        </div>
      ))}

      {/* Header con acciones */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">Control de Visitas</h1>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm gap-1.5" onClick={() => toast('Escáner QR activado')}>
            <QrCode size={15} /> Escanear QR
          </button>
          <button className="btn-primary btn-sm gap-1.5" onClick={() => setShowForm(v => !v)}>
            <UserPlus size={15} /> Nueva visita
          </button>
        </div>
      </div>

      {/* Formulario nueva visita */}
      {showForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-700">Registrar nueva visita</h2>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" placeholder="María González"
                    value={form.nombre_visita}
                    onChange={e => setForm(f => ({ ...f, nombre_visita: e.target.value }))} />
                </div>
                <div>
                  <label className="label">RUT / DNI *</label>
                  <input className="input" placeholder="12.345.678-9"
                    value={form.rut_dni}
                    onChange={e => setForm(f => ({ ...f, rut_dni: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Departamento destino *</label>
                  <select className="input" value={form.unidad_destino_id}
                    onChange={e => setForm(f => ({ ...f, unidad_destino_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {unidades?.unidades?.map(u => (
                      <option key={u.id} value={u.id}>Dpto. {u.numero}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Patente vehículo</label>
                  <input className="input" placeholder="AB-CD-12 (opcional)"
                    value={form.patente}
                    onChange={e => setForm(f => ({ ...f, patente: e.target.value }))} />
                </div>
                <div>
                  <label className="label">QR pre-aprobado</label>
                  <input className="input font-mono" placeholder="Código QR..."
                    value={form.codigo_qr}
                    onChange={e => setForm(f => ({ ...f, codigo_qr: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setForm(EMPTY_FORM)}>
                  Limpiar
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={entradaMutation.isPending}>
                  {entradaMutation.isPending ? 'Registrando...' : '→ Registrar entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de visitas */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-700">
            Visitas de hoy
            <span className="ml-2 badge-gray">{filtradas.length}</span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 w-48 text-xs py-1.5" placeholder="Buscar..."
              value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
        </div>

        <div className="table-wrapper rounded-t-none border-t-0 border-x-0 border-b-0">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Destino</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Cargando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Sin visitas registradas hoy</td></tr>
              ) : filtradas.map(v => (
                <tr key={v.id}>
                  <td>
                    <p className="font-medium text-gray-800">{v.nombre_visita}</p>
                    {v.patente && <p className="text-xs text-gray-400 font-mono">{v.patente}</p>}
                  </td>
                  <td className="text-gray-500 text-xs font-mono">{v.rut_dni}</td>
                  <td className="text-gray-700">Dpto. {v.unidad_destino}</td>
                  <td className="font-mono text-sm">
                    {v.entrada_at ? format(new Date(v.entrada_at), 'HH:mm') : '—'}
                  </td>
                  <td className="font-mono text-sm text-gray-500">
                    {v.salida_at ? format(new Date(v.salida_at), 'HH:mm') : '—'}
                  </td>
                  <td><EstadoBadge estado={v.estado} /></td>
                  <td>
                    {v.estado === 'dentro' && (
                      <button
                        className="btn-danger btn-sm gap-1"
                        onClick={() => salidaMutation.mutate(v.id)}
                        disabled={salidaMutation.isPending}
                      >
                        <LogOut size={13} /> Salida
                      </button>
                    )}
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
