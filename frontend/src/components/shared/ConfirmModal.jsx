import { AlertTriangle } from 'lucide-react';

/**
 * Modal de confirmación reutilizable
 * Uso:
 *   <ConfirmModal
 *     open={show}
 *     title="Registrar salida"
 *     description="¿Confirmas la salida de María González?"
 *     confirmLabel="Sí, registrar"
 *     onConfirm={handleSalida}
 *     onCancel={() => setShow(false)}
 *     danger
 *   />
 */
export default function ConfirmModal({
  open,
  title       = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  danger  = false,
}) {
  if (!open) { return null; }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            danger ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-blue-500'} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Procesando...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
