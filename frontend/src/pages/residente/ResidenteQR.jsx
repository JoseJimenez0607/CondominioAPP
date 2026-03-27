import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { visitasApi } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { QrCode, Clock } from 'lucide-react';

export default function ResidenteQR() {
  const [form, setForm] = useState({ nombre_visita: '', rut_dni: '', horas_valido: 24 });
  const [qr, setQr]     = useState(null);

  const mut = useMutation({
    mutationFn: visitasApi.generarQR,
    onSuccess:  (res) => { setQr(res.data); toast.success('QR generado'); },
    onError:    () => toast.error('Error al generar QR')
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900">Generar QR para visita</h1>

      <div className="card p-5 space-y-3">
        <div>
          <label className="label">Nombre de la visita *</label>
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
          <label className="label">Válido por</label>
          <select className="input" value={form.horas_valido}
            onChange={e => setForm(f => ({ ...f, horas_valido: Number(e.target.value) }))}>
            {[4, 8, 12, 24, 48].map(h => (
              <option key={h} value={h}>{h} horas</option>
            ))}
          </select>
        </div>
        <button
          className="btn-primary w-full justify-center"
          disabled={mut.isPending || !form.nombre_visita || !form.rut_dni}
          onClick={() => mut.mutate(form)}
        >
          <QrCode size={16} />
          {mut.isPending ? 'Generando...' : 'Generar QR'}
        </button>
      </div>

      {qr && (
        <div className="card p-5 text-center animate-slide-up">
          <p className="text-sm font-semibold text-gray-800 mb-1">{form.nombre_visita}</p>
          <p className="text-xs text-gray-400 mb-4">{form.rut_dni}</p>
          <div className="flex justify-center p-4 bg-white rounded-xl border border-gray-100 mb-4">
            <QRCodeSVG
              value={qr.qr_url || `https://condominioapp.cl/qr/${qr.qr_token}`}
              size={200} level="H"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} />
            Válido hasta {new Date(qr.expira_at).toLocaleString('es-CL', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Comparte este QR con tu visita — el conserje lo escaneará al ingresar
          </p>
          <button className="btn-secondary btn-sm mt-4 w-full justify-center"
            onClick={() => { setQr(null); setForm({ nombre_visita:'', rut_dni:'', horas_valido:24 }); }}>
            Generar otro QR
          </button>
        </div>
      )}
    </div>
  );
}
