import clsx from 'clsx';

const PRESETS = {
  // Visitas
  dentro:     { label: 'Dentro',    cls: 'badge-green'  },
  salio:      { label: 'Salió',     cls: 'badge-gray'   },
  esperando:  { label: 'Esperando', cls: 'badge-yellow' },
  rechazada:  { label: 'Rechazada', cls: 'badge-red'    },

  // Tickets
  pendiente:   { label: 'Pendiente',   cls: 'badge-red'    },
  en_revision: { label: 'En revisión', cls: 'badge-yellow' },
  resuelto:    { label: 'Resuelto',    cls: 'badge-green'  },
  cerrado:     { label: 'Cerrado',     cls: 'badge-gray'   },

  // Reservas
  confirmada:  { label: 'Confirmada',  cls: 'badge-green'  },
  cancelada:   { label: 'Cancelada',   cls: 'badge-red'    },
  completada:  { label: 'Completada',  cls: 'badge-gray'   },
  no_asistio:  { label: 'No asistió',  cls: 'badge-yellow' },

  // Encomiendas
  en_conserjeria: { label: 'En conserjería', cls: 'badge-yellow' },
  retirado:       { label: 'Retirado',       cls: 'badge-green'  },
  devuelto:       { label: 'Devuelto',       cls: 'badge-gray'   },

  // Pagos
  pagado:   { label: 'Pagado',   cls: 'badge-green'  },
  moroso:   { label: 'Moroso',   cls: 'badge-red'    },
  exento:   { label: 'Exento',   cls: 'badge-gray'   },

  // Estacionamientos
  libre:    { label: 'Libre',    cls: 'badge-green'  },
  ocupado:  { label: 'Ocupado',  cls: 'badge-blue'   },
  bloqueado:{ label: 'Bloqueado',cls: 'badge-gray'   },
};

/**
 * @param {string} status  — clave del preset (ej: 'dentro', 'pagado')
 * @param {string} className — clases adicionales opcionales
 */
export default function StatusBadge({ status, className = '' }) {
  const preset = PRESETS[status] || { label: status, cls: 'badge-gray' };
  return (
    <span className={clsx('badge', preset.cls, className)}>
      {preset.label}
    </span>
  );
}
