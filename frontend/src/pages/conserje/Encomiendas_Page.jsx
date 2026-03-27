import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { encomiendas_api, unidadesApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Package, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Encomiendas_Page() {
  const qc = useQueryClient();
  const [pin, setPin]     = useState('');
  const [sel, setSel]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]   = useState({ unidad_id:'', remitente:'', codigo_barras:'' });

  const { data } = useQuery({
    queryKey: ['encomiendas'],
    queryFn:  () => encomiendas_api.listar().then(r => r.data),
    refetchInterval: 30000
  });

  const { data: unidades } = useQuery({ queryKey:['unidades'], queryFn: () => unidadesApi.listar().then(r=>r.data) });

  const regMut = useMutation({
    mutationFn: encomiendas_api.registrar,
    onSuccess:  () => { toast.success('📦 Paquete registrado — Residente notificado'); qc.invalidateQueries({queryKey:['encomiendas']}); setShowForm(false); setForm({unidad_id:'',remitente:'',codigo_barras:''}); },
    onError:    () => toast.error('Error al registrar paquete')
  });

  const entMut = useMutation({
    mutationFn: ({id, pin}) => encomiendas_api.entregar(id, {pin}),
    onSuccess:  () => { toast.success('✅ Paquete entregado'); setSel(null); setPin(''); qc.invalidateQueries({queryKey:['encomiendas']}); },
    onError:    (err) => toast.error(err.response?.data?.error || 'PIN incorrecto')
  });

  const enc = data?.encomiendas || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Encomiendas</h1>
        <button className="btn-primary btn-sm gap-1.5" onClick={() => setShowForm(v=>!v)}>
          <Plus size={15} /> Registrar paquete
        </button>
      </div>

      {showForm && (
        <div className="card animate-slide-up">
          <div className="card-header"><h2 className="text-sm font-semibold">Nuevo paquete</h2></div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Departamento *</label>
              <select className="input" value={form.unidad_id} onChange={e=>setForm(f=>({...f,unidad_id:e.target.value}))}>
                <option value="">Seleccionar...</option>
                {unidades?.unidades?.map(u=><option key={u.id} value={u.id}>Dpto. {u.numero}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Remitente / Tienda</label>
              <input className="input" placeholder="Amazon, Falabella..." value={form.remitente} onChange={e=>setForm(f=>({...f,remitente:e.target.value}))} />
            </div>
            <div>
              <label className="label">Código de barras</label>
              <input className="input font-mono" placeholder="Escanear o escribir..." value={form.codigo_barras} onChange={e=>setForm(f=>({...f,codigo_barras:e.target.value}))} />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <button className="btn-primary btn-sm" disabled={regMut.isPending} onClick={()=>regMut.mutate(form)}>
                {regMut.isPending ? 'Registrando...' : '→ Registrar y notificar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-semibold text-gray-700">Pendientes de retiro <span className="ml-2 badge-yellow">{enc.length}</span></h2></div>
        <div className="table-wrapper rounded-t-none border-0">
          <table className="table">
            <thead><tr><th>Depto.</th><th>Remitente</th><th>Recibido</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {enc.length===0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin paquetes pendientes</td></tr>}
              {enc.map(e=>(
                <tr key={e.id}>
                  <td className="font-medium">Dpto. {e.unidad_numero}</td>
                  <td>{e.remitente || '—'}</td>
                  <td className="text-xs text-gray-500">{format(new Date(e.recibido_at),'dd/MM HH:mm')}</td>
                  <td><span className="badge-yellow">Pendiente</span></td>
                  <td>
                    {sel===e.id ? (
                      <div className="flex gap-2">
                        <input className="input w-24 text-center font-mono" placeholder="PIN" maxLength={4}
                          value={pin} onChange={v=>setPin(v.target.value)} />
                        <button className="btn-success btn-sm" onClick={()=>entMut.mutate({id:e.id,pin})}>Confirmar</button>
                        <button className="btn-secondary btn-sm" onClick={()=>setSel(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="btn-success btn-sm" onClick={()=>setSel(e.id)}><Package size={13}/> Entregar</button>
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
