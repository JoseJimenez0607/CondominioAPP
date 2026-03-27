import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIAS = ['luminaria', 'ascensor', 'agua', 'gas', 'seguridad', 'limpieza', 'otro'];

const ESTADO_COLOR = {
  pendiente:   'badge-red',
  en_revision: 'badge-yellow',
  resuelto:    'badge-green',
  cerrado:     'badge-gray',
};

export default function ResidenteTickets() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descripcion: '', categoria: 'otro', prioridad: 2
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tickets-res'],
    queryFn:  () => ticketsApi.listar().then(r => r.data),
    refetchInterval: 30000
  });

  const crearMut = useMutation({
    mutationFn: ticketsApi.crear,
    onSuccess:  () => {
      toast.success('📋 Reporte enviado a la administración');
      setShow(false);
      setForm({ titulo: '', descripcion: '', categoria: 'otro', prioridad: 2 });
      qc.invalidateQueries({ queryKey: ['tickets-res'] });
    },
    onError: () => toast.error('Error al enviar reporte')
  });

  const tickets = data?.tickets || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Mis reportes</h1>
        <button className="btn-primary btn-sm gap-1.5" onClick={() => setShow(v => !v)}>
          <Plus size={14} /> Reportar
        </button>
      </div>

      {show && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Wrench size={15} /> Nueva incidencia
          </h2>
          <div>
            <label className="label">Título *</label>
            <input className="input" placeholder="Ej: Luminaria quemada pasillo 3"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input h-20 resize-none"
              placeholder="Describe el problema con el mayor detalle posible..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select className="input" value={form.prioridad}
                onChange={e => setForm(f => ({ ...f, prioridad: Number(e.target.value) }))}>
                <option value={1}>🔴 Alta</option>
                <option value={2}>🟡 Media</option>
                <option value={3}>🟢 Baja</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm flex-1 justify-center"
              onClick={() => setShow(false)}>Cancelar</button>
            <button
              className="btn-primary btn-sm flex-1 justify-center"
              disabled={crearMut.isPending || !form.titulo}
              onClick={() => crearMut.mutate(form)}
            >
              {crearMut.isPending ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-center text-gray-400 py-8">Cargando...</div>}

      {!isLoading && tickets.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Wrench size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes reportes activos</p>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm text-gray-800 leading-tight">{t.titulo}</p>
              <span className={`badge ${ESTADO_COLOR[t.estado] || 'badge-gray'} shrink-0`}>
                {t.estado.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="capitalize">{t.categoria}</span>
              <span>·</span>
              <span>{format(new Date(t.created_at), "d MMM yyyy", { locale: es })}</span>
            </div>
            {t.descripcion && (
              <p className="text-xs text-gray-500 line-clamp-2">{t.descripcion}</p>
            )}
            {t.respuesta_admin && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-blue-700 mb-0.5">Respuesta de administración:</p>
                <p className="text-xs text-blue-600">{t.respuesta_admin}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
