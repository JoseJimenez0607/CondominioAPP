import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Save, RotateCcw, DollarSign, Bell, ParkingSquare, Clock } from 'lucide-react';

const fetchConfig  = () => api.get('/configuracion').then((r) => r.data.config);
const updateConfig = (data) => api.put('/configuracion', data).then((r) => r.data.config);
const generarGastos = (body) => api.post('/configuracion/generar-gastos', body).then((r) => r.data);

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Icon size={16} className="text-primary-500" /> {title}
        </h2>
      </div>
      <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function AdminConfiguracion() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });
  const [form, setForm] = useState(null);

  useEffect(() => { if (config) { setForm({ ...config }); } }, [config]);

  const saveMut = useMutation({
    mutationFn: updateConfig,
    onSuccess:  () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['config'] }); },
    onError:    () => toast.error('Error al guardar'),
  });

  const gastosMut = useMutation({
    mutationFn: generarGastos,
    onSuccess:  (d) => toast.success(d.mensaje),
    onError:    () => toast.error('Error al generar gastos'),
  });

  if (isLoading || !form) {
    return <div className="text-center text-gray-400 py-16">Cargando configuración...</div>;
  }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Configuración del Condominio</h1>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm gap-1.5"
            onClick={() => setForm({ ...config })}>
            <RotateCcw size={14} /> Descartar
          </button>
          <button className="btn-primary btn-sm gap-1.5"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(form)}>
            <Save size={14} />
            {saveMut.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Estacionamientos */}
      <Section icon={ParkingSquare} title="Estacionamientos de visitas">
        <FormField label="Tiempo máximo (horas)" hint="Los autos de visita no pueden superar este límite">
          <input type="number" className="input" min={1} max={24}
            value={form.parking_max_horas}
            onChange={(e) => set('parking_max_horas', Number(e.target.value))} />
        </FormField>
        <FormField label="Alertar (minutos antes del límite)" hint="Se notifica al conserje y al residente">
          <input type="number" className="input" min={5} max={120}
            value={form.parking_alerta_mins}
            onChange={(e) => set('parking_alerta_mins', Number(e.target.value))} />
        </FormField>
      </Section>

      {/* Horarios */}
      <Section icon={Clock} title="Horarios de operación">
        <FormField label="Apertura de áreas comunes">
          <input type="time" className="input"
            value={form.horario_inicio || '08:00'}
            onChange={(e) => set('horario_inicio', e.target.value)} />
        </FormField>
        <FormField label="Cierre de áreas comunes">
          <input type="time" className="input"
            value={form.horario_fin || '22:00'}
            onChange={(e) => set('horario_fin', e.target.value)} />
        </FormField>
      </Section>

      {/* Gastos comunes */}
      <Section icon={DollarSign} title="Gastos comunes">
        <FormField label="Monto base mensual (CLP)" hint="Valor por defecto al generar gastos del mes">
          <input type="number" className="input" min={0} step={1000}
            value={form.gasto_monto_base}
            onChange={(e) => set('gasto_monto_base', Number(e.target.value))} />
        </FormField>
        <FormField label="Día de vencimiento" hint="Día del mes en que vence el pago">
          <input type="number" className="input" min={1} max={28}
            value={form.gasto_dia_vencimiento}
            onChange={(e) => set('gasto_dia_vencimiento', Number(e.target.value))} />
        </FormField>
        <FormField label="Recordatorio (días antes del vencimiento)">
          <input type="number" className="input" min={0} max={15}
            value={form.gasto_reminder_dias}
            onChange={(e) => set('gasto_reminder_dias', Number(e.target.value))} />
        </FormField>

        {/* Acción: generar gastos del mes */}
        <div className="sm:col-span-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-3">
            Genera los cobros del mes actual para todas las unidades activas.
            Sólo crea los que aún no existen.
          </p>
          <button className="btn-secondary btn-sm gap-1.5"
            disabled={gastosMut.isPending}
            onClick={() => gastosMut.mutate({})}>
            <DollarSign size={14} />
            {gastosMut.isPending ? 'Generando...' : 'Generar gastos del mes actual'}
          </button>
        </div>
      </Section>

      {/* Notificaciones */}
      <Section icon={Bell} title="Notificaciones automáticas">
        {[
          { key: 'notif_visita_email',     label: 'Email al residente cuando llega una visita' },
          { key: 'notif_visita_push',      label: 'Push al residente cuando llega una visita' },
          { key: 'notif_encomienda_email', label: 'Email al residente cuando llega un paquete' },
          { key: 'notif_encomienda_push',  label: 'Push al residente cuando llega un paquete' },
          { key: 'notif_gasto_reminder',   label: 'Recordatorio de gasto común por email' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer col-span-1 sm:col-span-2">
            <div
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                form[key] ? 'bg-primary-500' : 'bg-gray-200'
              }`}
              onClick={() => toggle(key)}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form[key] ? 'translate-x-5' : ''
              }`} />
            </div>
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </Section>
    </div>
  );
}
