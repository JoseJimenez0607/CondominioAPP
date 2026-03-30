import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { visitasApi } from '@/services/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Modal escáner QR para conserjería.
 * Al leer un QR válido, registra la entrada de la visita automáticamente.
 *
 * @param {boolean}  open      — mostrar/ocultar
 * @param {Function} onClose   — callback para cerrar
 */
export default function QRScannerModal({ open, onClose }) {
  const qc           = useQueryClient();
  const scannerRef   = useRef(null);
  const [estado, setEstado]   = useState('idle'); // idle | scanning | success | error
  const [mensaje, setMensaje] = useState('');
  const [visita, setVisita]   = useState(null);

  useEffect(() => {
    if (!open) return;

    let html5Qrcode = null;

    async function startScanner() {
      setEstado('scanning');
      setMensaje('');
      setVisita(null);

      html5Qrcode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5Qrcode;

      try {
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // QR leído — detener cámara
            await html5Qrcode.stop();
            scannerRef.current = null;
            await procesarQR(decodedText);
          },
          () => {} // error de frame (ignorar)
        );
      } catch (err) {
        console.error('Error cámara:', err);
        setEstado('error');
        setMensaje('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open]);

  async function procesarQR(texto) {
    setEstado('scanning');
    setMensaje('Verificando QR...');

    // Extraer token del QR — puede ser URL o token directo
    let token = texto;
    if (texto.includes('/qr/')) {
      token = texto.split('/qr/').pop();
    }

    try {
      const { data } = await visitasApi.entrada({
        // El backend detecta que es QR pre-aprobado
        codigo_qr:         token,
        nombre_visita:     'Visita QR',
        rut_dni:           'QR-VALIDADO',
        unidad_destino_id: '00000000-0000-0000-0000-000000000000', // placeholder
      });

      if (data?.success) {
        setEstado('success');
        setVisita(data);
        setMensaje('Visita registrada correctamente');
        toast.success('✅ QR validado — Visita registrada');
        qc.invalidateQueries({ queryKey: ['visitas'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        // Cerrar automáticamente después de 3 seg
        setTimeout(() => {
          setEstado('idle');
          onClose();
        }, 3000);
      } else {
        setEstado('error');
        setMensaje('QR inválido o expirado. Pide al residente que genere uno nuevo.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al procesar el QR';
      setEstado('error');
      setMensaje(msg);
    }
  }

  function handleReintentar() {
    setEstado('idle');
    // Reiniciar abriendo de nuevo el modal
    onClose();
    setTimeout(() => {
      // El padre debe volver a abrir el modal
    }, 100);
  }

  if (!open) { return null; }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-800">Escanear QR de visita</h2>
          </div>
          <button onClick={onClose} className="btn-icon text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Escáner */}
          {estado === 'scanning' && (
            <>
              <div
                id="qr-reader"
                className="w-full rounded-xl overflow-hidden border border-gray-200"
                style={{ minHeight: '280px' }}
              />
              <p className="text-xs text-gray-500 text-center mt-3">
                Apunta la cámara al código QR del residente
              </p>
            </>
          )}

          {/* Éxito */}
          {estado === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">¡Visita registrada!</h3>
              <p className="text-sm text-gray-500">{mensaje}</p>
              <p className="text-xs text-gray-400 mt-2">Cerrando automáticamente...</p>
            </div>
          )}

          {/* Error */}
          {estado === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">QR no válido</h3>
              <p className="text-sm text-gray-500 mb-4">{mensaje}</p>
              <button className="btn-primary btn-sm" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}

          {/* Alternativa manual */}
          {estado === 'scanning' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-2">
                ¿Sin acceso a cámara? Ingresa el código manualmente
              </p>
              <ManualQRInput onSubmit={procesarQR} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualQRInput({ onSubmit }) {
  const [codigo, setCodigo] = useState('');
  return (
    <div className="flex gap-2">
      <input
        className="input text-xs font-mono flex-1"
        placeholder="Pegar código QR..."
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
      />
      <button
        className="btn-primary btn-sm"
        disabled={!codigo.trim()}
        onClick={() => onSubmit(codigo.trim())}
      >
        Verificar
      </button>
    </div>
  );
}