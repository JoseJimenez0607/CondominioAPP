/**
 * Constantes y configuración centralizada del backend
 */

module.exports = {
  // JWT
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN         || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Parking — minutos antes del límite para enviar alerta
  PARKING_ALERT_MINUTES_BEFORE: Number(process.env.PARKING_ALERT_MINUTES_BEFORE) || 30,

  // Encomiendas — días antes de recordar
  ENCOMIENDA_REMINDER_DAYS: 3,

  // Paginación default
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE:     200,

  // Roles válidos
  ROLES: Object.freeze({
    ADMIN:     'admin',
    CONSERJE:  'conserje',
    GUARDIA:   'guardia',
    RESIDENTE: 'residente',
  }),

  // Estados de visita
  ESTADOS_VISITA: Object.freeze({
    ESPERANDO: 'esperando',
    DENTRO:    'dentro',
    SALIO:     'salio',
    RECHAZADA: 'rechazada',
  }),

  // Estados de ticket
  ESTADOS_TICKET: Object.freeze({
    PENDIENTE:   'pendiente',
    EN_REVISION: 'en_revision',
    RESUELTO:    'resuelto',
    CERRADO:     'cerrado',
  }),

  // Estados de encomienda
  ESTADOS_ENCOMIENDA: Object.freeze({
    EN_CONSERJERIA: 'en_conserjeria',
    RETIRADO:       'retirado',
    DEVUELTO:       'devuelto',
  }),

  // Planes SaaS
  PLANES: Object.freeze({
    BASIC:      'basic',
    PRO:        'pro',
    ENTERPRISE: 'enterprise',
  }),
};
