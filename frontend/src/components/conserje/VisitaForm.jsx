import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { visitasApi, unidadesApi } from '@/services/api';
import { formatRut } from '@/utils';
import toast from 'react-hot-toast';
import { UserPlus, QrCode, X } from 'lucide-react';

const EMPTY = {
  nombre_visita:    '',
  rut_dni:          '',
  patente:          '',
  unidad_destino_id:'',
  codigo_qr:        '',
};

/**
 * Formulario de registro de visita para el panel del conserje.
 * Se puede usar como drawer o como sección expandible.
 *
 * @param {Function} onSuccess  — callback al registrar exitosamente
 * @param {Function} onClose    — callback para cerrar/colapsar
 */
export default function VisitaForm({ onSuccess, onClose }) {
  const qc              = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [rutError, setRutError] = useState('');

  const { data: unidades } = useQuery({
    queryKey: ['unidades'],
    queryFn:  () => unidadesApi.listar().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: visitasApi.entrada,
    onSuccess: (res) => {
      toast.success('✅ Visita registrada — residente notificado');
      qc.invalidateQueries({ queryKey: ['visitas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setForm(EMPTY);
      onSuccess?.(res.data);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al registrar');
    },
  });

  function handleRutBlur() {
    if (!form.rut_dni) { return; }
    const fmt = formatRut(form.rut_dni);
    setForm((f) => ({ ...f, rut_dni: fmt }));
    setRutError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre_visita.trim()) { toast.error('Ingresa el nombre'); return; }
    if (!form.rut_dni.trim())       { toast.error('Ingresa el RUT'); return; }
    if (!form.unidad_destino_id)    { toast.error('Selecciona el departamento'); return; }

    mutation.mutate({
      nombre_visita:     form.nombre_visita.trim(),
      rut_dni:           form.rut_dni.trim(),
      patente:           form.patente.trim() || undefined,
      unidad_destino_id: form.unidad_destino_id,
      codigo_qr:         form.codigo_qr.trim() || undefined,
    });
  }

  const field = (id, label, props) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        {...props}
        value={form[id]}
        onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="card-header">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserPlus size={15} /> Registrar nueva visita
        </h2>
        {onClose && (
          <button className="btn-icon text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('nombre_visita', 'Nombre completo *', { placeholder: 'María González', autoFocus: true })}

            <div>
              <label className="label" htmlFor="rut_dni">RUT / DNI *</label>
              <input
                id="rut_dni"
                className={`input ${rutError ? 'input-error' : ''}`}
                placeholder="12.345.678-9"
                value={form.rut_dni}
                onChange={(e) => setForm((f) => ({ ...f, rut_dni: e.target.value }))}
                onBlur={handleRutBlur}
              />
              {rutError && <p className="text-xs text-red-500 mt-0.5">{rutError}</p>}
            </div>

            {field('patente', 'Patente vehículo', { placeholder: 'ABCD12 (opcional)' })}

            <div>
              <label className="label" htmlFor="unidad_destino_id">Departamento destino *</label>
              <select
                id="unidad_destino_id"
                className="input"
                value={form.unidad_destino_id}
                onChange={(e) => setForm((f) => ({ ...f, unidad_destino_id: e.target.value }))}
              >
                <option value="">Seleccionar departamento...</option>
                {unidades?.unidades?.map((u) => (
                  <option key={u.id} value={u.id}>
                    Dpto. {u.numero}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="codigo_qr">
                <QrCode size={12} className="inline mr-1" /> Código QR pre-aprobado
              </label>
              <input
                id="codigo_qr"
                className="input font-mono"
                placeholder="Escanear o escribir código QR..."
                value={form.codigo_qr}
                onChange={(e) => setForm((f) => ({ ...f, codigo_qr: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setForm(EMPTY)}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  Registrando...
                </span>
              ) : (
                '→ Registrar entrada'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
