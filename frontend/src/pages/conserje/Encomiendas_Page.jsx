import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { encomiendas_api, unidadesApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Package, Plus, Camera, X, CheckCircle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Convierte imagen a base64 data URL
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Encomiendas_Page() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [pin, setPin]       = useState('');
  const [sel, setSel]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({
    unidad_id: '', remitente: '', codigo_barras: '', descripcion: '', foto_url: ''
  });
  const [fotoPreview, setFotoPreview] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const { data } = useQuery({
    queryKey: ['encomiendas'],
    queryFn:  () => encomiendas_api.listar().then(r => r.data),
    refetchInterval: 30000
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades'],
    queryFn:  () => unidadesApi.listar().then(r => r.data)
  });

  const regMut = useMutation({
    mutationFn: encomiendas_api.registrar,
    onSuccess: (res) => {
      const n = res.data?.notificaciones_enviadas || 0;
      toast.success(`📦 Paquete registrado${n > 0 ? ` — Notificación enviada (${n} residente${n > 1 ? 's' : ''})` : ''}`);
      qc.invalidateQueries({ queryKey: ['encomiendas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      setForm({ unidad_id: '', remitente: '', codigo_barras: '', descripcion: '', foto_url: '' });
      setFotoPreview('');
    },
    onError: () => toast.error('Error al registrar paquete')
  });

  const entMut = useMutation({
    mutationFn: ({ id, pin }) => encomiendas_api.entregar(id, { pin }),
    onSuccess: () => {
      toast.success('✅ Paquete entregado correctamente');
      setSel(null); setPin('');
      qc.invalidateQueries({ queryKey: ['encomiendas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'PIN incorrecto')
  });

  // Manejar selección de foto
  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) { return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La foto no puede superar 5MB'); return; }

    setSubiendoFoto(true);
    try {
      const base64 = await toBase64(file);
      setFotoPreview(base64);
      setForm(f => ({ ...f, foto_url: base64 }));
    } catch {
      toast.error('Error al procesar la foto');
    } finally {
      setSubiendoFoto(false);
    }
  }

  function quitarFoto() {
    setFotoPreview('');
    setForm(f => ({ ...f, foto_url: '' }));
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  }

  const enc = data?.encomiendas || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Encomiendas
          {enc.length > 0 && <span className="ml-2 badge-yellow badge">{enc.length}</span>}
        </h1>
        <button className="btn-primary btn-sm gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Registrar paquete
        </button>
      </div>

      {/* Formulario nuevo paquete */}
      {showForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Package size={15} /> Registrar nuevo paquete
            </h2>
            <button className="btn-icon text-gray-400" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="card-body space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Departamento destino *</label>
                <select className="input" value={form.unidad_id}
                  onChange={e => setForm(f => ({ ...f, unidad_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {unidades?.unidades?.map(u => (
                    <option key={u.id} value={u.id}>Dpto. {u.numero}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Remitente / Tienda</label>
                <input className="input" placeholder="Amazon, Falabella, Mercado Libre..."
                  value={form.remitente}
                  onChange={e => setForm(f => ({ ...f, remitente: e.target.value }))} />
              </div>
              <div>
                <label className="label">Código de barras</label>
                <input className="input font-mono" placeholder="Escanear o escribir..."
                  value={form.codigo_barras}
                  onChange={e => setForm(f => ({ ...f, codigo_barras: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input" placeholder="Caja grande, sobre, etc."
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>

            {/* Foto del paquete */}
            <div>
              <label className="label">Foto del paquete</label>
              {fotoPreview ? (
                <div className="relative inline-block">
                  <img src={fotoPreview} alt="Vista previa"
                    className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={quitarFoto}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {subiendoFoto ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Procesando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Camera size={24} className="text-gray-300" />
                      <span className="text-sm font-medium text-gray-500">Tomar foto o subir imagen</span>
                      <span className="text-xs text-gray-400">Haz click para abrir cámara o seleccionar archivo</span>
                    </div>
                  )}
                </div>
              )}
              {/* Input file oculto — acepta cámara en móvil */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFotoChange}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button className="btn-secondary btn-sm"
                onClick={() => { setShowForm(false); setFotoPreview(''); setForm({ unidad_id:'', remitente:'', codigo_barras:'', descripcion:'', foto_url:'' }); }}>
                Cancelar
              </button>
              <button
                className="btn-primary btn-sm gap-1.5"
                disabled={regMut.isPending || !form.unidad_id}
                onClick={() => regMut.mutate(form)}
              >
                {regMut.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  <><Upload size={14} /> Registrar y notificar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de encomiendas */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-700">Pendientes de retiro</h2>
        </div>

        {enc.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sin paquetes pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {enc.map(e => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Foto miniatura */}
                  {e.foto_url ? (
                    <img src={e.foto_url} alt="Paquete"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100 shrink-0 cursor-pointer"
                      onClick={() => window.open(e.foto_url, '_blank')} />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package size={24} className="text-gray-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">Dpto. {e.unidad_numero}</p>
                      <span className="badge-yellow badge">Pendiente</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{e.remitente || 'Remitente no especificado'}</p>
                    {e.descripcion && <p className="text-xs text-gray-400 mt-0.5">{e.descripcion}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(e.recibido_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>

                {/* Entrega con PIN */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  {sel === e.id ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        className="input w-28 text-center font-mono text-lg tracking-widest"
                        placeholder="PIN"
                        maxLength={4}
                        value={pin}
                        onChange={v => setPin(v.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                      <button
                        className="btn-success btn-sm gap-1"
                        disabled={pin.length !== 4 || entMut.isPending}
                        onClick={() => entMut.mutate({ id: e.id, pin })}
                      >
                        <CheckCircle size={14} />
                        {entMut.isPending ? 'Verificando...' : 'Confirmar entrega'}
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => { setSel(null); setPin(''); }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button className="btn-success btn-sm gap-1.5 w-full justify-center"
                      onClick={() => setSel(e.id)}>
                      <Package size={13} /> Registrar retiro con PIN
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
